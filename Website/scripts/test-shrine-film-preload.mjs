import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source=await fs.readFile(new URL('../app/shrine-film-preload.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const nativeFetch=globalThis.fetch;
globalThis.fetch=()=>{throw new Error('Full-file fetch is unavailable');};
try{
  const {preloadShrineFilm,SHRINE_FILM_SOURCE}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  let loads=0;
  const video={load(){assert.equal(this.src,SHRINE_FILM_SOURCE);assert.equal(this.muted,true);assert.equal(this.playsInline,true);loads++;}};
  preloadShrineFilm(video);
  assert.equal(loads,1,'The native media loader starts even when fetch fails');
  assert.equal(video.preload,'auto');
  assert.equal(video.defaultMuted,true);
  assert.equal(video.src,'/scene/entry/shrine-entry-playback.mp4');
  preloadShrineFilm(video);
  assert.equal(loads,2,'A failed native load can be retried without a cached rejection');
  const film=await fs.readFile(new URL('../public'+SHRINE_FILM_SOURCE,import.meta.url));
  assert.ok(film.length>1000000,'The published source contains the actual film');
  assert.ok(film.indexOf(Buffer.from('moov'))<film.indexOf(Buffer.from('mdat')),'Fast-start metadata precedes the film data');
  console.log('Shrine preload passed: native loading without fetch/Blob, muted inline playback, retry and fast-start film asset.');
}finally{globalThis.fetch=nativeFetch;}
