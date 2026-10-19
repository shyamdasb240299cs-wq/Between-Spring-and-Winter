import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {transformMesh,dedup,prune,weld,textureCompress,simplify} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';

const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'Website/public/seasons/kit');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
const doc=await io.read(path.join(root,'Assets and working files/seasons/kit/campfire/source.glb'));
const scene=doc.getRoot().listScenes()[0],nodes=[];
scene.traverse(n=>{if(n.getMesh())nodes.push([n,n.getWorldMatrix()]);});
for(const[n,matrix]of nodes){n.setMesh(n.getMesh().clone());transformMesh(n.getMesh(),matrix);scene.addChild(n);n.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);}
let b=getBounds(scene);const scale=1.7/Math.max(b.max[0]-b.min[0],b.max[2]-b.min[2]);
const matrix=[scale,0,0,0,0,scale,0,0,0,0,scale,0,-(b.min[0]+b.max[0])*.5*scale,-b.min[1]*scale,-(b.min[2]+b.max[2])*.5*scale,1];
for(const[n]of nodes)transformMesh(n.getMesh(),matrix);
for(const m of doc.getRoot().listMaterials())m.setName('campfire_logs_stones').setMetallicFactor(0).setRoughnessFactor(.95);
await doc.transform(weld(),dedup(),prune(),simplify({simplifier:MeshoptSimplifier,ratio:.10,error:.02}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:88}));
const catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8')),variant={id:'0',bounds:getBounds(scene),height:getBounds(scene).max[1],lods:{}};
for(const[level,ratio]of [['near',1],['mid',.6],['far',.2]]){
  const copy=await io.readBinary(await io.writeBinary(doc));if(ratio<1)await copy.transform(simplify({simplifier:MeshoptSimplifier,ratio,error:.01}));
  const filename=`campfire-0-${level}.glb`;await io.write(path.join(out,'models',filename),copy);
  const triangles=copy.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
  variant.lods[level]={url:'/seasons/kit/models/'+filename,triangles,bytes:(await fs.stat(path.join(out,'models',filename))).size};
}
catalog.models.campfire={name:'Glowing Campfire With Stones, Coal and Logs',author:'Dennis (dennis.hafemann)',source:'https://sketchfab.com/3d-models/glowing-campfire-with-stones-coal-and-logs-d3448f8b13314bb7a7d0f7e20350360a',license:'CC-BY-4.0',variants:[variant],notes:['Official authenticated download. Geometry simplified offline, PBR and emissive textures retained. Recentered and scaled to a 1.7 metre stone ring; animated flame and ember layer added at runtime.']};
await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');console.log(variant);
