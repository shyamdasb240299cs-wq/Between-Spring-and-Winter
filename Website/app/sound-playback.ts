export type PlaybackLayer = {
  media: Pick<HTMLAudioElement, 'play' | 'pause'>;
  started: boolean; starting: boolean; failed: boolean; attempt: number;
};
type PlaybackOwner = {disposed: boolean; muted: boolean; error: (message: string) => void};

export function pausePlayback(layer: PlaybackLayer) {
  layer.attempt++;layer.started=false;layer.starting=false;layer.media.pause();
}

/** Old play promises cannot overwrite a newer click or visibility transition. */
export function startPlayback(owner: PlaybackOwner, layer: PlaybackLayer, hidden=()=>document.hidden) {
  if(layer.started||layer.starting||layer.failed||owner.disposed)return;
  const attempt=++layer.attempt;
  layer.started=true;layer.starting=true;
  void layer.media.play().then(()=>{
    if(layer.attempt!==attempt)return;
    layer.starting=false;
    if(owner.disposed||owner.muted||hidden())pausePlayback(layer);
  }).catch((error:unknown)=>{
    if(layer.attempt!==attempt)return;
    layer.starting=false;layer.started=false;
    if(error instanceof DOMException&&error.name==='AbortError')return;
    layer.failed=true;
    if(!owner.disposed)owner.error('Sound could not start. Toggle music to retry.');
  });
}
