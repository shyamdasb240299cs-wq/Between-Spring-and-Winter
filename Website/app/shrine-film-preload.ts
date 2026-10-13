export const SHRINE_FILM_SOURCE='/scene/entry/shrine-entry-clean.mp4';

let cachedFilm:Promise<Blob>|null=null;

/** Download once per visit before revealing the film. Local Blob playback has
 * no remaining network requests that could interrupt the burn or approach. */
export function preloadShrineFilm():Promise<Blob>{
  if(!cachedFilm){
    cachedFilm=fetch(SHRINE_FILM_SOURCE,{cache:'force-cache'})
      .then(async response=>{
        if(!response.ok)throw new Error(`Shrine film download failed (${response.status})`);
        const film=await response.blob();
        if(!film.size)throw new Error('Shrine film download was empty');
        return film;
      })
      .catch(error=>{cachedFilm=null;throw error;});
  }
  return cachedFilm;
}
