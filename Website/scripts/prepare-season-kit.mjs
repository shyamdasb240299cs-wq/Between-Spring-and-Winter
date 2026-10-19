/** Reproducible public-source season kit acquisition. Never uses authenticated viewer internals. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const ROOT=path.resolve(import.meta.dirname,'../..');
const WORK=path.join(ROOT,'Assets and working files/seasons/kit');
const OUT=path.join(ROOT,'Website/public/seasons/kit');
await fs.mkdir(WORK,{recursive:true});await fs.mkdir(OUT,{recursive:true});
const catalog=await fs.readFile(path.join(OUT,'catalog.json'),'utf8').then(JSON.parse).catch(()=>({version:1,coordinateSystem:'Y_UP_METRES',models:{},textures:{},skies:{},blockedSources:[]}));
async function download(url,dest){
 await fs.mkdir(path.dirname(dest),{recursive:true});
 const cached=await fs.stat(dest).catch(()=>null);if(cached?.size>0)return fs.readFile(dest);
 let error;
 for(let attempt=0;attempt<3;attempt++)try{const r=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(`${r.status} ${url}`);const b=Buffer.from(await r.arrayBuffer());await fs.writeFile(dest,b);return b;}catch(e){error=e;}
 throw error;
}
async function api(id){const dest=path.join(WORK,id,'files.json');return JSON.parse(await download('https://api.polyhaven.com/files/'+id,dest));}
async function mapLimit(items,fn,n=4){let i=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length)await fn(items[i++]);}));}
async function texture(id){
 const j=await api(id),entry={source:'https://polyhaven.com/a/'+id,license:'CC0-1.0',sizeMetres:2};
 for(const [key,source]of Object.entries({color:'Diffuse',normal:'nor_gl',roughness:'Rough'})){
  const f=j[source]?.['1k']?.jpg||j[source]?.['1k']?.png;if(!f)continue;
  const b=await download(f.url,path.join(WORK,id,path.basename(new URL(f.url).pathname)));
  const name=`${id}-${key}.webp`;await fs.mkdir(path.join(OUT,'textures'),{recursive:true});
  await sharp(b).resize({width:1024,height:1024,fit:'inside'}).webp({quality:key==='normal'?91:86}).toFile(path.join(OUT,'textures',name));entry[key]='/seasons/kit/textures/'+name;
 }
 catalog.textures[id]=entry;console.log('TEXTURE',id);
}
async function sky([season,id]){
 const j=await api(id),b=await download(j.tonemapped.url,path.join(WORK,id,'tonemapped.jpg'));
 await fs.mkdir(path.join(OUT,'skies'),{recursive:true});const name=id+'.webp';
 await sharp(b).resize({width:2048}).webp({quality:88}).toFile(path.join(OUT,'skies',name));
 catalog.skies[season]={url:'/seasons/kit/skies/'+name,source:'https://polyhaven.com/a/'+id,license:'CC0-1.0'};console.log('SKY',id);
}
async function model(id){
 const j=await api(id),f=j.gltf['1k'].gltf,dir=path.join(WORK,id);
 await download(f.url,path.join(dir,id+'.gltf'));
 const deps=Object.entries(f.include||{});
 await mapLimit(deps,async([name,info])=>download(info.url,path.join(dir,name)));
 await fs.writeFile(path.join(dir,'provenance.json'),JSON.stringify({source:'https://polyhaven.com/a/'+id,license:'CC0-1.0',files:deps.map(([name,f])=>({name,url:f.url,md5:f.md5}))},null,2));console.log('MODEL',id);
}
async function firMaps(){
 const id='fir_tree_01',j=await api(id);for(const key of ['twig_diff','twig_alpha','twig_nor_gl','bark_diff','bark_nor_gl','trunk_a_diff','trunk_a_nor_gl','trunk_b_diff','trunk_b_nor_gl','trunk_c_diff','trunk_c_nor_gl']){
  const f=j[key]['1k'].png||j[key]['1k'].jpg;const b=await download(f.url,path.join(WORK,id,path.basename(new URL(f.url).pathname)));
  await sharp(b).resize(1024,1024).png().toFile(path.join(WORK,id,key+'.png'));
 }
 const rgb=await sharp(path.join(WORK,id,'twig_diff.png')).removeAlpha().raw().toBuffer();
 const alpha=await sharp(path.join(WORK,id,'twig_alpha.png')).removeAlpha().greyscale().raw().toBuffer();
 await sharp(rgb,{raw:{width:1024,height:1024,channels:3}}).joinChannel(alpha,{raw:{width:1024,height:1024,channels:1}}).png().toFile(path.join(WORK,id,'twig-rgba.png'));
 console.log('FIR_MAPS');
}
const mode=process.argv[2]||'all';
if(mode==='stone')await texture('granite_tile_03');
if(mode==='blendkit'){
 const ids={palm:'d569931c-c109-4721-aedd-1aa94300670f',maple:'6b36e011-4ce4-4f3d-98c9-4a2fd6b62f66',bench:'994e7ecd-9bfd-4664-b4f8-4b1ecb76983c'};
 await mapLimit(Object.entries(ids),async([id,uid])=>{
  const r=await fetch('https://www.blendkit.com/api/v1/search/?query='+encodeURIComponent('asset_base_id:'+uid+' asset_type:model')+'&page_size=1');
  const a=(await r.json()).results[0];if(!a?.isFree||!a.canDownload||a.license!=='cc_zero')throw Error('Not freely downloadable CC0: '+id);
  const dir=path.join(WORK,id);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'metadata.json'),JSON.stringify(a,null,2));
  if(a.thumbnailSmallUrl)await download(a.thumbnailSmallUrl,path.join(dir,'preview'+(a.thumbnailSmallUrl.includes('.png')?'.png':'.jpg')));
  const f=a.files.find(f=>f.fileType==='gltf')||a.files.find(f=>f.fileType==='resolution_1K')||a.files.find(f=>f.fileType==='blend');
  const endpoint=new URL(f.downloadUrl);endpoint.searchParams.set('scene_uuid','5a5c1726-6321-438a-847c-0b63ce527ce4');
  const access=await(await fetch(endpoint)).json();if(!access.filePath)throw Error('No public download '+id);
  const file=id+(f.fileType==='gltf'?'.glb':'.blend');await download(access.filePath,path.join(dir,file));
  await fs.writeFile(path.join(dir,'provenance.json'),JSON.stringify({name:a.displayName,author:a.author,source:'https://www.blendkit.com/asset-gallery-detail/'+uid+'/',license:'CC0-1.0',file},null,2));
  console.log('BLENDKIT_CC0',id,file,f.fileUploadSize);
 },3);
}
if(mode==='all'||mode==='textures')await mapLimit(['leafy_grass','rocky_trail','sand_03','brown_mud_leaves_01','snow_02'],texture,3);
if(mode==='all'||mode==='skies')await mapLimit(Object.entries({spring:'kloppenheim_06_puresky',summer:'kloppenheim_05_puresky',autumn:'industrial_sunset_puresky',winter:'qwantani_dusk_2_puresky'}),sky,2);
if(mode==='all'||mode==='models')await mapLimit(['wicker_basket_01','grass_medium_01','coast_rocks_03','lambis_shell','dead_tree_trunk'],model,2);
if(mode==='all'||mode==='fir')await firMaps();
await fs.writeFile(path.join(OUT,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
