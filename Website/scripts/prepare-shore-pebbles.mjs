import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO,getBounds,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {transformMesh,weld,prune,dedup,simplify,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const root=path.resolve(import.meta.dirname,'../..'),work=path.join(root,'Assets and working files/seasons/kit/shore-pebbles'),out=path.join(root,'Website/public/seasons/kit');
await fs.mkdir(work,{recursive:true});await MeshoptSimplifier.ready;
const meta=await(await fetch('https://api.polyhaven.com/files/rock_boulder_dry')).json(),entry=meta.gltf['1k'].gltf;
await Promise.all([['source.gltf',entry.url],...Object.entries(entry.include).map(([n,f])=>[n,f.url])].map(async([name,url])=>{const file=path.join(work,name);if(await fs.stat(file).catch(()=>null))return;const r=await fetch(url);if(!r.ok)throw Error('Pebble download: '+r.status);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));}));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(path.join(work,'source.gltf'));doc.setLogger(new Logger(Verbosity.ERROR));
const scene=doc.getRoot().listScenes()[0],nodes=[];scene.traverse(n=>{if(n.getMesh())nodes.push([n,n.getWorldMatrix()]);});
for(const[n,m]of nodes){n.setMesh(n.getMesh().clone());transformMesh(n.getMesh(),m);n.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);scene.addChild(n);}
const b=getBounds(scene),s=1/Math.max(b.max[0]-b.min[0],b.max[2]-b.min[2]);
for(const[n]of nodes)transformMesh(n.getMesh(),[s,0,0,0,0,s*.65,0,0,0,0,s,0,-(b.min[0]+b.max[0])*.5*s,-b.min[1]*s*.65,-(b.min[2]+b.max[2])*.5*s,1]);
for(const m of doc.getRoot().listMaterials())m.setMetallicFactor(0).setRoughnessFactor(.98);
await doc.transform(weld(),prune(),dedup(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[768,768],quality:89}));
const tris=d=>d.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0),variant={id:'0',height:getBounds(scene).max[1],bounds:getBounds(scene),lods:{}};
for(const[level,budget]of [['near',2400],['mid',1000],['far',360]]){const copy=await io.readBinary(await io.writeBinary(doc));await copy.transform(simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/tris(copy)),error:.02,lockBorder:false}),prune());const name=`pebble-0-${level}.glb`;await io.write(path.join(out,'models',name),copy);variant.lods[level]={url:'/seasons/kit/models/'+name,triangles:Math.round(tris(copy)),bytes:(await fs.stat(path.join(out,'models',name))).size};}
const catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8'));catalog.models.pebble={name:'Weathered sandy pebbles',source:'https://polyhaven.com/a/rock_boulder_dry',author:'Dimitrios Savva, Rico Cilliers',license:'CC0-1.0',variants:[variant],notes:['Original scanned geometry and PBR textures, scaled into small low-profile shoreline stones.']};await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');console.log('SHORE_PEBBLES',variant.lods);
