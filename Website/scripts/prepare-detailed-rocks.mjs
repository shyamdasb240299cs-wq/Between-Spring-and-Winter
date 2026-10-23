/** New CC0 scans, with original proportions and embedded PBR maps. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO,getBounds,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {transformMesh,weld,prune,dedup,compactPrimitive,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'Website/public/seasons/kit');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
const triangles=d=>d.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
const specs=[['woodland-rock','boulder_01','Rico Cilliers',18000],['coastal-rock','coast_rocks_05','Rob Tuytel',24000],['loose-rock','rock_07','Jenelle van Heerden',6000]],entries={};
for(const[key,id,author,budget]of specs){
  const work=path.join(root,'Assets and working files/seasons/kit/detailed-rocks',id);await fs.mkdir(work,{recursive:true});
  const meta=await(await fetch('https://api.polyhaven.com/files/'+id)).json(),entry=meta.gltf['2k'].gltf;
  await Promise.all([['source.gltf',entry.url],...Object.entries(entry.include).map(([name,v])=>[name,v.url])].map(async([name,url])=>{
    const file=path.join(work,name);if(await fs.stat(file).catch(()=>null))return;
    const response=await fetch(url);if(!response.ok)throw Error(`${id}: download ${response.status}`);
    await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,Buffer.from(await response.arrayBuffer()));
  }));
  const doc=await io.read(path.join(work,'source.gltf'));doc.setLogger(new Logger(Verbosity.ERROR));
  const scene=doc.getRoot().listScenes()[0],nodes=[];scene.traverse(n=>{if(n.getMesh())nodes.push([n,n.getWorldMatrix()]);});
  for(const[n,matrix]of nodes){n.setMesh(n.getMesh().clone());transformMesh(n.getMesh(),matrix);n.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);scene.addChild(n);}
  const b=getBounds(scene),scale=1/Math.max(b.max[0]-b.min[0],b.max[2]-b.min[2]);
  for(const[n]of nodes)transformMesh(n.getMesh(),[scale,0,0,0,0,scale,0,0,0,0,scale,0,-(b.min[0]+b.max[0])*.5*scale,-b.min[1]*scale,-(b.min[2]+b.max[2])*.5*scale,1]);
  for(const m of doc.getRoot().listMaterials())m.setMetallicFactor(0).setRoughnessFactor(.93).setAlphaMode('OPAQUE').setDoubleSided(true);
  await doc.transform(weld(),dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[key==='loose-rock'?1024:2048,key==='loose-rock'?1024:2048],quality:90}));
  const variant={id:'0',bounds:getBounds(scene),height:getBounds(scene).max[1],lods:{}};
  for(const[level,target]of [['near',budget],['mid',Math.min(8500,budget*.4)],['far',Math.min(3000,budget*.15)]]){
    const copy=await io.readBinary(await io.writeBinary(doc));
    for(const p of copy.getRoot().listMeshes().flatMap(m=>m.listPrimitives())){
      const position=p.getAttribute('POSITION'),indices=new Uint32Array(p.getIndices().getArray()),uv=p.getAttribute('TEXCOORD_0');
      const [reduced]=MeshoptSimplifier.simplifyWithAttributes(indices,position.getArray(),3,uv.getArray(),2,[.05,.05],null,Math.floor(target)*3,level==='near'?.005:level==='mid'?.012:.025,['Permissive','LockBorder']);
      p.setIndices(copy.createAccessor().setType('SCALAR').setBuffer(position.getBuffer()).setArray(reduced));
      compactPrimitive(p);
    }
    await copy.transform(prune());
    const file=`${key}-0-${level}.glb`;await io.write(path.join(out,'models',file),copy);
    variant.lods[level]={url:'/seasons/kit/models/'+file,triangles:Math.round(triangles(copy)),bytes:(await fs.stat(path.join(out,'models',file))).size};
  }
  entries[key]={name:id.replaceAll('_',' '),source:'https://polyhaven.com/a/'+id,author,license:'CC0-1.0',variants:[variant],notes:['New photogrammetry source. Uniform scaling retains the natural silhouette; original colour, normal and AO/roughness maps embedded.']};
  console.log(key,variant.lods);
}
const catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8'));Object.assign(catalog.models,entries);await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
