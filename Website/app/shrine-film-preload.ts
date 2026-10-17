export const SHRINE_FILM_SOURCE='/scene/entry/shrine-entry-playback.mp4';

/** Let the media loader buffer and retry byte ranges. Fetching the entire film
 * into a Blob made a failed download prevent the video from ever getting a src. */
export function preloadShrineFilm(video:HTMLVideoElement){
  video.preload='auto';
  video.defaultMuted=true;
  video.muted=true;
  video.playsInline=true;
  video.src=SHRINE_FILM_SOURCE;
  video.load();
}
