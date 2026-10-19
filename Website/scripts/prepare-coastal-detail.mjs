/** Small licensed shoreline assets, retained with reproducible provenance. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO,getBounds,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {transformMesh,weld,prune,dedup,simplify,textureCompress,join} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const root=path.resolve(import.meta.dirname,'../..'),work=path.join(root,'Assets and working files/seasons/kit/coastal-detail'),out=path.join(root,'Website/public/seasons/kit');
await fs.mkdir(work,{recursive:true});await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8'));
async function download(name,url){const file=path.join(work,name);if(await fs.stat(file).catch(()=>null))return;const r=await fetch(url);if(!r.ok)throw Error('Coastal asset download: '+r.status);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));}
const meta=await(await fetch('https://api.polyhaven.com/files/othonna_cerarioides')).json(),entry=meta.gltf['1k'].gltf;
await Promise.all([download('plant.gltf',entry.url),...Object.entries(entry.include).map(([name,file])=>download(name,file.url)),download('plant-alpha.png',(meta.Alpha['1k'].png||meta.Alpha['1k'].jpg).url),download('coral.glb','https://static.poly.pizza/7fc1ccd0-aa82-4eff-8881-dd7a83ebf6ea.glb')]);
const triangles=doc=>doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
for(const [key,file,source,author,license]of [
 ['coastal-shrub','plant.gltf','https://polyhaven.com/a/othonna_cerarioides','James Ray Cock, Jenelle van Heerden','CC0-1.0'],
 ['coral','coral.glb','https://poly.pizza/m/4KUXdtDdgHR','Poly by Google','CC-BY-3.0'],
]){
 const doc=await io.read(path.join(work,file));doc.setLogger(new Logger(Verbosity.ERROR));const scene=doc.getRoot().listScenes()[0];
 if(key==='coastal-shrub'){
  const processed=new Set();
  for(const material of doc.getRoot().listMaterials()){
   const texture=material.getBaseColorTexture();if(!texture||processed.has(texture))continue;processed.add(texture);
   const image=sharp(texture.getImage()),{width,height}=await image.metadata(),rgb=await image.removeAlpha().png().toBuffer();
   const alpha=await sharp(path.join(work,'plant-alpha.png')).resize(width,height).removeAlpha().greyscale().raw().toBuffer();
   texture.setImage(await sharp(rgb).joinChannel(alpha,{raw:{width,height,channels:1}}).png().toBuffer()).setMimeType('image/png');
  }
 }
 if(key==='coastal-shrub'){const keep=scene.listChildren().find(n=>n.getName()==='othonna_cerarioides_g');if(!keep)throw Error('Missing original shrub');for(const n of scene.listChildren())if(n!==keep)scene.removeChild(n);}
 const nodes=[];scene.traverse(n=>{if(n.getMesh())nodes.push([n,n.getWorldMatrix()]);});
 for(const[n,matrix]of nodes){n.setMesh(n.getMesh().clone());transformMesh(n.getMesh(),matrix);n.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);scene.addChild(n);}
 const bounds=getBounds(scene),s=1/Math.max(bounds.max[0]-bounds.min[0],bounds.max[2]-bounds.min[2]);
 for(const[n]of nodes)transformMesh(n.getMesh(),[s,0,0,0,0,s,0,0,0,0,s,0,-(bounds.min[0]+bounds.max[0])*.5*s,-bounds.min[1]*s,-(bounds.min[2]+bounds.max[2])*.5*s,1]);
 for(const m of doc.getRoot().listMaterials()){m.setMetallicFactor(0).setRoughnessFactor(.95).setDoubleSided(true);if(key==='coral')m.setBaseColorTexture(null).setBaseColorFactor([.78,.70,.55,1]);}
 await doc.transform(weld(),prune(),dedup(),join(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[512,512],quality:89}));
 const variant={id:'0',height:getBounds(scene).max[1],bounds:getBounds(scene),lods:{}};
 for(const [level,budget]of [['near',key==='coral'?1900:4200],['mid',1800],['far',700]]){
  const copy=await io.readBinary(await io.writeBinary(doc));await copy.transform(simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/triangles(copy)),error:level==='near'?.006:level==='mid'?.025:.06,lockBorder:level==='near'}),prune());
  const name=`${key}-0-${level}.glb`;await io.write(path.join(out,'models',name),copy);variant.lods[level]={url:'/seasons/kit/models/'+name,triangles:Math.round(triangles(copy)),bytes:(await fs.stat(path.join(out,'models',name))).size};
 }
 catalog.models[key]={name:key==='coral'?'Weathered coral fragment':'Othonna Cerarioides',source,author,license,variants:[variant],notes:[key==='coral'?'Original Google Poly geometry adapted to a small pale, dry shoreline fragment.':'One original scanned shrub selected from the seven-plant lineup; original leaves and UVs retained.']};
 console.log('COASTAL_DETAIL',key,variant.lods);
}
await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
