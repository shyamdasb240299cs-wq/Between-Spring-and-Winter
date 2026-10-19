/** Official source scans, retained outside public, with bounded runtime GLB budgets. */
import fs from 'node:fs/promises';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {NodeIO,getBounds,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,transformMesh,textureCompress,join} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';

const ROOT=path.resolve(import.meta.dirname,'../..'),WORK=path.join(ROOT,'Assets and working files/seasons/kit'),OUT=path.join(ROOT,'Website/public/seasons/kit');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
await MeshoptDecoder.ready;await MeshoptSimplifier.ready;
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const specs=[
 ['apple','food_apple_01',.115,1800,'Oliver Harries'],
 ['plate','carved_wooden_plate',.29,1300,'Poly Haven contributors'],
 ['thermos','plastic_thermos',.34,1900,'Poly Haven contributors'],
 ['camp-thermos','modified_thermos',.31,2400,'Alex Weber'],
 ['ball','football',.54,1900,'Poly Haven contributors'],
 ['beach-chair','plastic_monobloc_chair_01',.72,2600,'Kuutti Siitonen'],
 ['picnic-basket','wicker_basket_02',.62,4500,'Kuutti Siitonen'],
];
function tris(doc){return doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);}
async function get(url,dest){
 if(await fs.stat(dest).catch(()=>null))return;
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`${url}: HTTP ${response.status}`);
 await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,Buffer.from(await response.arrayBuffer()));
}
await Promise.all(specs.map(async([,source])=>{
 const dir=path.join(WORK,source);await fs.mkdir(dir,{recursive:true});
 const meta=await(await fetch('https://api.polyhaven.com/files/'+source)).json();await fs.writeFile(path.join(dir,'files.json'),JSON.stringify(meta,null,2));
 const gltf=meta.gltf['1k'].gltf;
 await Promise.all([get(gltf.url,path.join(dir,source+'.gltf')),...Object.entries(gltf.include).map(([name,file])=>get(file.url,path.join(dir,name)))]);
 console.log('SOURCE',source);
}));
const additions={};
for(const[key,source,width,target,author]of specs){
 const doc=await io.read(path.join(WORK,source,source+'.gltf'));doc.setLogger(new Logger(Verbosity.ERROR));
 const scene=doc.getRoot().listScenes()[0],meshes=[];
 scene.traverse(n=>{if(n.getMesh())meshes.push([n,n.getWorldMatrix()]);});
 for(const[n,matrix]of meshes){const mesh=n.getMesh().clone();n.setMesh(mesh);transformMesh(mesh,matrix);n.setMatrix(identity);scene.addChild(n);}
 const box=getBounds(scene),scale=width/Math.max(box.max[0]-box.min[0],box.max[2]-box.min[2]);
 const matrix=[scale,0,0,0,0,scale,0,0,0,0,scale,0,-(box.max[0]+box.min[0])*.5*scale,-box.min[1]*scale,-(box.max[2]+box.min[2])*.5*scale,1];
 for(const[n]of meshes)transformMesh(n.getMesh(),matrix);
 await doc.transform(weld(),dedup(),prune(),join(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[768,768],quality:86}));
 const bounds=getBounds(scene),variant={id:'0',bounds,height:bounds.max[1],lods:{}};
 for(const[level,budget]of [['near',target],['mid',Math.ceil(target*.45)],['far',Math.ceil(target*.2)]]){
  const copy=await io.readBinary(await io.writeBinary(doc));
  await copy.transform(simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/tris(copy)),error:.008,lockBorder:true}),prune());
  const name=`${key}-0-${level}.glb`;await io.write(path.join(OUT,'models',name),copy);
  variant.lods[level]={url:'/seasons/kit/models/'+name,triangles:Math.round(tris(copy)),bytes:(await fs.stat(path.join(OUT,'models',name))).size};
 }
 additions[key]={name:source.replaceAll('_',' '),source:'https://polyhaven.com/a/'+source,author,license:'CC0-1.0',variants:[variant],notes:['Actual official source scan geometry, centered and grounded in Y-up metres; simplified offline with embedded WebP PBR textures.']};
 console.log('PACKED',key,variant.lods);
}
// Already licensed and retained locally; repurpose the actual lantern mesh without its street pole.
const lanternSource=path.join(ROOT,'Website/public/void/models/jagobo/lantern.glb');
const lantern=await io.read(lanternSource),bounds=getBounds(lantern.getRoot().listScenes()[0]);
const lanternLods={};
for(const level of ['near','mid','far']){const name=`lantern-0-${level}.glb`;await fs.copyFile(lanternSource,path.join(OUT,'models',name));lanternLods[level]={url:'/seasons/kit/models/'+name,triangles:Math.round(tris(lantern)),bytes:(await fs.stat(lanternSource)).size};}
additions.lantern={name:'Lantern',source:'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Lantern',author:'Microsoft / sbtron',license:'CC0-1.0',variants:[{id:'0',bounds,height:bounds.max[1]-bounds.min[1],lods:lanternLods}],notes:['Existing licensed lantern geometry reused for campsite interaction; pole removed in prior preparation.']};
// Explicitly redistributable CC BY source: the official page links the 3.0 license.
const umbrellaSource=path.join(WORK,'beach-umbrella/source.glb');
await get('https://static.poly.pizza/6c5af3c4-aa1a-4cd2-b181-be06f6567ccb.glb',umbrellaSource);
const umbrella=await io.read(umbrellaSource),umbrellaScene=umbrella.getRoot().listScenes()[0],umbrellaMeshes=[];
umbrellaScene.traverse(n=>{if(n.getMesh())umbrellaMeshes.push([n,n.getWorldMatrix()]);});
for(const[n,matrix]of umbrellaMeshes){const mesh=n.getMesh().clone();n.setMesh(mesh);transformMesh(mesh,matrix);n.setMatrix(identity);umbrellaScene.addChild(n);}
const ub=getBounds(umbrellaScene),us=2.25/Math.max(ub.max[0]-ub.min[0],ub.max[2]-ub.min[2]),um=[us,0,0,0,0,us,0,0,0,0,us,0,-(ub.max[0]+ub.min[0])*.5*us,-ub.min[1]*us,-(ub.max[2]+ub.min[2])*.5*us,1];
for(const[n]of umbrellaMeshes)transformMesh(n.getMesh(),um);
for(const m of umbrella.getRoot().listMaterials())m.setMetallicFactor(0).setRoughnessFactor(.86).setDoubleSided(true);
await umbrella.transform(weld(),dedup(),prune(),join());const umbrellaLods={};
for(const level of ['near','mid','far']){const name=`umbrella-0-${level}.glb`;await io.write(path.join(OUT,'models',name),umbrella);umbrellaLods[level]={url:'/seasons/kit/models/'+name,triangles:Math.round(tris(umbrella)),bytes:(await fs.stat(path.join(OUT,'models',name))).size};}
const umbrellaBounds=getBounds(umbrellaScene);
additions.umbrella={name:'Red/White Beach Umbrella',source:'https://poly.pizza/m/2li3sdSkmCI',author:'S. Paul Michael',license:'CC-BY-3.0',variants:[{id:'0',bounds:umbrellaBounds,height:umbrellaBounds.max[1],lods:umbrellaLods}],notes:['Actual downloaded source geometry; normalized scale, PBR fabric roughness and two-sided canopy.']};
const catalog=JSON.parse(await fs.readFile(path.join(OUT,'catalog.json'),'utf8'));Object.assign(catalog.models,additions);
for(const season of ['summer','winter'])catalog.skies[season]={url:'/seasons/kit/textures/sunset-sky.webp',source:'https://polyhaven.com/a/qwantani_sunset_puresky',license:'CC0-1.0',notes:'Official HDRI tonemapped to 2048 by 1024 WebP.'};
await fs.writeFile(path.join(OUT,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
// The football scan is deflated; the touch interaction uses a round authored beach ball.
await import('./prepare-beach-ball.mjs');
await import('./prepare-camp-lantern.mjs');
