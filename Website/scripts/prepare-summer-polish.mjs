import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld, simplify, prune, dedup, textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const out=path.resolve('public/seasons/kit/summer/realism');
const work=path.resolve('../Assets and working files/seasons/summer-realism');
await fs.mkdir(out,{recursive:true});await fs.mkdir(work,{recursive:true});
async function download(url,file){if(await fs.stat(file).catch(()=>null))return;const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));}
const manifest=[];
for(const id of ['coral_gravel','weathered_planks']){
 const meta=await(await fetch('https://api.polyhaven.com/files/'+id)).json();
 for(const [key,name] of [['Diffuse','color'],['nor_gl','normal'],['Rough','roughness']]){
  const entry=meta[key]['1k'].jpg,source=path.join(work,id+'-'+name+'.jpg');await download(entry.url,source);
  await sharp(source).webp({quality:name==='normal'?94:88}).toFile(path.join(out,id+'-'+name+'.webp'));
 }
 manifest.push({id,source:'https://polyhaven.com/a/'+id,license:'CC0-1.0',resolution:1024});
}
await MeshoptSimplifier.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const id of ['modular_wooden_pier','coast_land_rocks_04']){
 const meta=await(await fetch('https://api.polyhaven.com/files/'+id)).json(),entry=meta.gltf['1k'].gltf,dir=path.join(work,id);
 await Promise.all([['source.gltf',entry],...Object.entries(entry.include)].map(([name,file])=>download(file.url,path.join(dir,name))));
 const doc=await io.read(path.join(dir,'source.gltf'));
 if(id==='modular_wooden_pier')for(const node of [...doc.getRoot().listNodes()])if(node.getMesh()&&node.getName()!=='modular_wooden_pier_planks')node.dispose();
 await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:id==='modular_wooden_pier'?.65:.001,error:.008}),dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:88}));
 const file=path.join(out,id+'.glb');await io.write(file,doc);
 const nodes=doc.getRoot().listNodes().filter(n=>n.getMesh()).map(n=>({name:n.getName(),translation:n.getTranslation()}));
 const triangles=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0);
 manifest.push({id,source:'https://polyhaven.com/a/'+id,license:'CC0-1.0',triangles,bytes:(await fs.stat(file)).size,nodes});
 console.log(id,triangles,JSON.stringify(nodes));
}
await fs.writeFile(path.join(out,'sources.json'),JSON.stringify(manifest,null,2)+'\n');
