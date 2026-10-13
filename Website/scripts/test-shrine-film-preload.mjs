import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source=await fs.readFile(new URL('../app/shrine-film-preload.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const nativeFetch=globalThis.fetch;
let calls=0,finishDownload;
globalThis.fetch=async(url,options)=>{
  calls++;
  assert.equal(url,'/scene/entry/shrine-entry-clean.mp4');
  assert.equal(options.cache,'force-cache');
  if(calls===1)return new Response('Unavailable',{status:503});
  return {ok:true,blob:()=>new Promise(resolve=>{finishDownload=resolve;})};
};
try{
  const {preloadShrineFilm}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  await assert.rejects(preloadShrineFilm(),/503/);
  const first=preloadShrineFilm(),second=preloadShrineFilm();
  assert.equal(first,second,'Concurrent entries share one download');
  let ready=false;first.then(()=>{ready=true;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(ready,false,'Playback source stays unavailable until the full download finishes');
  const film=new Blob(['complete film bytes'],{type:'video/mp4'});finishDownload(film);
  assert.equal(await first,film);
  assert.equal(await preloadShrineFilm(),film,'Returning to the shrine reuses the downloaded film');
  assert.equal(calls,2,'One failed attempt plus one complete download');
  console.log('Shrine preload passed: full-file readiness, shared download, cached return and failed-download retry.');
}finally{globalThis.fetch=nativeFetch;}
