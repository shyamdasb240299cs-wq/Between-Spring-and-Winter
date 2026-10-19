/** Offline reusable asset preparation; model geometry is baked in Y-up metres. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {Document,NodeIO,getBounds,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,simplifyPrimitive,transformMesh,textureCompress,join} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
const ROOT=path.resolve(import.meta.dirname,'../..'),WORK=path.join(ROOT,'Assets and working files/seasons/kit'),OUT=path.join(ROOT,'Website/public/seasons/kit');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
await MeshoptDecoder.ready;await MeshoptSimplifier.ready;
let catalog=JSON.parse(await fs.readFile(path.join(OUT,'catalog.json'),'utf8'));
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const triangles=doc=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
async function pack(doc){
 doc.setLogger(new Logger(Verbosity.ERROR));
 for(const m of doc.getRoot().listMaterials()){m.setMetallicFactor(Math.min(.05,m.getMetallicFactor()));if(/leaf|leav|foliage|twig|frond|grass/i.test(m.getName()))m.setDoubleSided(true).setAlphaMode('MASK').setAlphaCutoff(.38);}
 for(const m of doc.getRoot().listMaterials())if(m.getBaseColorTexture()&&!m.getBaseColorTexture().getName())m.getBaseColorTexture().setName(m.getName()+'_color');
 await doc.transform(weld(),dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[2048,2048],quality:89,pattern:/foliage_color/}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:86,pattern:/^(?!.*foliage_color)/}));
}
async function write(doc,id,variant,level){
 const name=`${id}-${variant}-${level}.glb`,dir=path.join(OUT,'models');await fs.mkdir(dir,{recursive:true});
 await io.write(path.join(dir,name),doc);const bytes=(await fs.stat(path.join(dir,name))).size;
 return {url:'/seasons/kit/models/'+name,triangles:Math.round(triangles(doc)),bytes};
}
function normalise(doc,height){
 const scene=doc.getRoot().listScenes()[0];
 // Bake authoring transforms before centering and scaling. Each instance gets its own mesh.
 const flat=[];scene.traverse(n=>{if(n.getMesh())flat.push([n,n.getWorldMatrix()]);});
 for(const [n,matrix]of flat){const mesh=n.getMesh().clone();n.setMesh(mesh);transformMesh(mesh,matrix);n.setMatrix(identity);scene.addChild(n);}
 const box=getBounds(scene),s=height?(height/(box.max[1]-box.min[1])):1;
 const tx=-(box.min[0]+box.max[0])/2,ty=-box.min[1],tz=-(box.min[2]+box.max[2])/2;
 const matrix=[s,0,0,0,0,s,0,0,0,0,s,0,tx*s,ty*s,tz*s,1];
 for(const [n]of flat)transformMesh(n.getMesh(),matrix);
 return getBounds(scene);
}
async function sourceModels(){
 const specs=[['basket','wicker_basket_01',null,6500],['rock','coast_rocks_03',.9,3000],['shell','lambis_shell',null,2000],['log','dead_tree_trunk',null,5000]];
 for(const[id,source,height,target]of specs){
  const prepared=path.join(WORK,'prepared','rock-source.glb');const f=id==='rock'&&await fs.stat(prepared).catch(()=>null)?prepared:path.join(WORK,source,source+'.gltf');const doc=await io.read(f);const bounds=normalise(doc,height);await pack(doc);
  const variant={id:'0',bounds,height:bounds.max[1],lods:{}};
  for(const[level,budget]of [['near',target],['mid',Math.round(target*.35)],['far',Math.round(target*.1)]]){
   const copy=await io.readBinary(await io.writeBinary(doc));
   await copy.transform(simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/triangles(copy)),error:.01,lockBorder:true}));
   variant.lods[level]=await write(copy,id,0,level);
  }
  catalog.models[id]={name:source.replaceAll('_',' '),source:'https://polyhaven.com/a/'+source,author:'Poly Haven contributors',license:'CC0-1.0',variants:[variant],notes:['Prepared from official glTF; embedded WebP textures.']};console.log('PACKED',id,variant.lods);
 }
 // The smallest authored grass tufts preserve the original scan silhouette without a whole scatter.
 catalog.models.grass={name:'Grass Medium 01',source:'https://polyhaven.com/a/grass_medium_01',author:'Poly Haven contributors',license:'CC0-1.0',variants:[],notes:['Individual authored tufts extracted from the source display lineup.']};
 for(const[index,nodeIndex]of [0,12,13].entries()){
  const doc=await io.read(path.join(WORK,'grass_medium_01','grass_medium_01.gltf')),scene=doc.getRoot().listScenes()[0],keep=doc.getRoot().listNodes()[nodeIndex];
  const files=JSON.parse(await fs.readFile(path.join(WORK,'grass_medium_01/files.json'),'utf8'));
  const alphaFile=path.join(WORK,'grass_medium_01/alpha.png');
  if(!await fs.stat(alphaFile).catch(()=>null)){
   const r=await fetch((files.Alpha['1k'].png||files.Alpha['1k'].jpg).url);if(!r.ok)throw Error('Grass opacity map download failed');await fs.writeFile(alphaFile,Buffer.from(await r.arrayBuffer()));
  }
  const alpha=await sharp(alphaFile).resize(1024,1024).removeAlpha().greyscale().raw().toBuffer();
  for(const m of doc.getRoot().listMaterials()){
   const t=m.getBaseColorTexture();if(!t)continue;
   const rgb=await sharp(t.getImage()).resize(1024,1024).removeAlpha().png().toBuffer();
   t.setImage(await sharp(rgb).joinChannel(alpha,{raw:{width:1024,height:1024,channels:1}}).png().toBuffer()).setMimeType('image/png');m.setAlphaMode('MASK').setAlphaCutoff(.38).setDoubleSided(true);
  }
  for(const n of scene.listChildren())if(n!==keep)scene.removeChild(n);
  const bounds=normalise(doc);await pack(doc);const variant={id:String(index),bounds,height:bounds.max[1],lods:{}};
  for(const[level,budget]of [['near',800],['mid',300],['far',100]]){
   const copy=await io.readBinary(await io.writeBinary(doc));await copy.transform(simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/triangles(copy)),error:.02}));variant.lods[level]=await write(copy,'grass',index,level);
  }
  catalog.models.grass.variants.push(variant);
 }
}
function geometry(){return {p:[],n:[],uv:[],i:[]};}
function addQuad(g,points,normal,uv=[[0,0],[1,0],[1,1],[0,1]]){const off=g.p.length/3;for(let i=0;i<4;i++){g.p.push(...points[i]);g.n.push(...normal);g.uv.push(...uv[i]);}g.i.push(off,off+1,off+2,off,off+2,off+3);}
const add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,s)=>a.map(v=>v*s),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const len=a=>Math.hypot(...a),unit=a=>mul(a,1/(len(a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function tube(g,a,b,r0,r1,sides=8){
 const d=unit(sub(b,a)),u=unit(cross(d,Math.abs(d[1])>.95?[1,0,0]:[0,1,0])),v=cross(d,u);
 for(let j=0;j<sides;j++){
  const t=j/sides*Math.PI*2,t1=(j+1)/sides*Math.PI*2,n0=add(mul(u,Math.cos(t)),mul(v,Math.sin(t))),n1=add(mul(u,Math.cos(t1)),mul(v,Math.sin(t1)));
  addQuad(g,[add(a,mul(n0,r0)),add(a,mul(n1,r0)),add(b,mul(n1,r1)),add(b,mul(n0,r1))],unit(add(n0,n1)),[[j/sides,0],[(j+1)/sides,0],[(j+1)/sides,len(sub(b,a))],[j/sides,len(sub(b,a))]]);
 }
}
function primitive(doc,buffer,g,material){
 const acc=(name,type,array)=>doc.createAccessor(name).setType(type).setArray(array).setBuffer(buffer);
 return doc.createPrimitive().setAttribute('POSITION',acc('POSITION','VEC3',new Float32Array(g.p))).setAttribute('NORMAL',acc('NORMAL','VEC3',new Float32Array(g.n))).setAttribute('TEXCOORD_0',acc('TEXCOORD_0','VEC2',new Float32Array(g.uv))).setIndices(acc('indices','SCALAR',new Uint32Array(g.i))).setMaterial(material);
}
async function fir(){
 if(await fs.stat(path.join(WORK,'prepared','fir-source-0-near.glb')).catch(()=>null)){
  catalog.models.fir={name:'Fir Tree 01',source:'https://polyhaven.com/a/fir_tree_01',author:'Rico Cilliers, Rob Tuytel',license:'CC0-1.0',variants:[],notes:['Three original selected-source tree variants. Source LOD2 twigs sampled as complete components and bark simplified offline. Embedded WebP textures.']};
  for(let i=0;i<3;i++){
   const variant={id:String(i),height:14+i,bounds:null,lods:{}};
   for(const[level,budget]of [['near',28000],['mid',6000],['far',1600]]){
    const doc=await io.read(path.join(WORK,'prepared',`fir-source-${i}-${level}.glb`));const bounds=normalise(doc,variant.height);if(level==='near')variant.bounds=bounds;
    await pack(doc);await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/triangles(doc)),error:.01}));variant.lods[level]=await write(doc,'fir',i,level);
   }
   catalog.models.fir.variants.push(variant);console.log('SOURCE_FIR',i,variant.lods);
  }
  return;
 }
 catalog.models.fir={name:'Fir realtime crown',source:'https://polyhaven.com/a/fir_tree_01',author:'Rico Cilliers, Rob Tuytel; realtime branch layout authored for this website',license:'CC0-1.0',variants:[],notes:['Authored branch geometry and compact needle cards using the selected source bark and twig atlas. Does not contain the multi-million-triangle source mesh.']};
 for(let variantIndex=0;variantIndex<3;variantIndex++){
  const variant={id:String(variantIndex),height:12+variantIndex,bounds:null,lods:{}};
  for(const[level,mult]of [['near',1],['mid',.55],['far',.22]]){
   const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('Fir');
   const twig=doc.createTexture('fir_twig').setImage(await fs.readFile(path.join(WORK,'fir_tree_01/twig-rgba.png'))).setMimeType('image/png');
   const barkTex=doc.createTexture('fir_bark').setImage(await fs.readFile(path.join(WORK,'fir_tree_01/bark_diff.png'))).setMimeType('image/png');
   const normal=doc.createTexture('fir_bark_normal').setImage(await fs.readFile(path.join(WORK,'fir_tree_01/bark_nor_gl.png'))).setMimeType('image/png');
   const needles=doc.createMaterial('fir_needles_twig').setBaseColorTexture(twig).setDoubleSided(true).setAlphaMode('MASK').setAlphaCutoff(.35).setRoughnessFactor(.86);
   const bark=doc.createMaterial('fir_bark').setBaseColorTexture(barkTex).setNormalTexture(normal).setRoughnessFactor(.94);
   const wood=geometry(),foliage=geometry(),height=variant.height;
   for(let k=0;k<10;k++)tube(wood,[Math.sin(k*.6+variantIndex)*.04,k*height/10,Math.cos(k*.8)*.03],[Math.sin((k+1)*.6+variantIndex)*.04,(k+1)*height/10,Math.cos((k+1)*.8)*.03],.23*(1-k/10)+.015,.23*(1-(k+1)/10)+.015,level==='near'?9:6);
   const whorls=Math.round(17*mult)+3,twigSteps=level==='near'?13:level==='mid'?8:5;
   for(let w=0;w<whorls;w++){
    const fraction=w/(whorls-1),y=1.15+fraction*(height-1.3),radius=(3.0+variantIndex*.12)*Math.pow(1-fraction,.85)+.18;
    const branches=level==='far'?5:7;
    for(let b=0;b<branches;b++){
     const angle=b/branches*Math.PI*2+w*2.399+variantIndex*.8,d=[Math.cos(angle),0,Math.sin(angle)],side=[-d[2],0,d[0]],root=[0,y,0],tip=add(root,add(mul(d,radius),[0,-radius*.15,0]));
     tube(wood,root,tip,.033*(1-fraction)+.006,.003,level==='near'?5:3);
     for(let t=1;t<=twigSteps;t++){
      const f=t/(twigSteps+1),position=add(root,add(mul(d,radius*f),[0,-radius*.15*f+Math.sin(f*Math.PI)*.14,0]));
      const breadth=(.44+.36*(1-f))*(1-fraction*.75)*(level==='far'?1.8:1.35),length=.7*(1-fraction*.65)*(level==='far'?1.7:1.2);
      for(const sign of [-1,1]){
       const axis=unit(add(mul(side,sign*.8),mul(d,.6))),half=mul(d,breadth*.5),a=sub(position,half),c=add(position,mul(axis,length));
       // This atlas rectangle contains the large lower-right photographed fir twig.
       const uv=[[.63,.17],[.99,.17],[.99,.54],[.63,.54]];
       addQuad(foliage,[a,add(position,half),add(c,half),sub(c,half)],[0,1,0],uv);
       if(level!=='far'){
        const vertical=[0,breadth*.24,0];addQuad(foliage,[sub(position,vertical),add(position,vertical),add(c,vertical),sub(c,vertical)],side,uv);
       }
      }
     }
    }
   }
   const mesh=doc.createMesh('Fir geometry').addPrimitive(primitive(doc,buffer,wood,bark)).addPrimitive(primitive(doc,buffer,foliage,needles));scene.addChild(doc.createNode('Fir tree').setMesh(mesh));
   const bounds=normalise(doc,height);if(level==='near')variant.bounds=bounds;await pack(doc);variant.lods[level]=await write(doc,'fir',variantIndex,level);
  }
  catalog.models.fir.variants.push(variant);console.log('FIR',variantIndex,variant.lods);
 }
}
function sampleFoliage(doc,target){
 const total=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>/foliage/i.test(p.getMaterial()?.getName()||'')).reduce((n,p)=>n+(p.getIndices()?.getCount()||0)/3,0);
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  if(!/foliage/i.test(p.getMaterial()?.getName()||''))continue;
  const pos=p.getAttribute('POSITION'),indices=p.getIndices()?.getArray(),budget=Math.round(target*(indices?.length||0)/3/total);if(!indices||indices.length<=budget*3)continue;
  const parents=Int32Array.from({length:pos.getCount()},(_,i)=>i);
  const find=x=>{while(parents[x]!==x){parents[x]=parents[parents[x]];x=parents[x];}return x;};
  for(let i=0;i<indices.length;i+=3){const a=find(indices[i]);parents[find(indices[i+1])]=a;parents[find(indices[i+2])]=a;}
  const groups=new Map();for(let i=0;i<indices.length;i+=3){const root=find(indices[i]);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(indices[i],indices[i+1],indices[i+2]);}
  const ordered=[...groups].sort((a,b)=>((a[0]*2654435761)>>>0)-((b[0]*2654435761)>>>0)),picked=[];let count=0;
  for(const[root,g]of ordered)if(count+g.length/3<=budget||!picked.length){picked.push(g);count+=g.length/3;}
  if(picked.length===groups.size)continue;
  const points=new Float32Array(pos.getArray()),inflate=Math.min(1.65,Math.sqrt(indices.length/(count*3)));
  for(const g of picked){const vertices=[...new Set(g)],center=[0,0,0];for(const i of vertices)for(let k=0;k<3;k++)center[k]+=points[i*3+k]/vertices.length;for(const i of vertices)for(let k=0;k<3;k++)points[i*3+k]=center[k]+(points[i*3+k]-center[k])*inflate;}
  pos.setArray(points);p.setIndices(doc.createAccessor('Foliage LOD indices').setType('SCALAR').setArray(new Uint32Array(picked.flat())).setBuffer(pos.getBuffer()));
 }
}
async function sketchfab(){
 for(const[id,height,target]of [['palm',10,8000],['maple',10,25000],['bench',.95,9000]]){
  const file=path.join(WORK,id,'source.glb');if(!await fs.stat(file).catch(()=>null)){console.log('PENDING_AUTHENTICATED_SOURCE',id);continue;}
  const info={palm:['Coconut Palm','evolveduk','26e787f2ff2e4c0fb004c3b0210805a3'],maple:['Maple Trees','Jagobo','9f51e08e56cd4e44b35fd02a3ad8d3a6'],bench:['Classic Park Bench','ananduhrt','4e20ea09d6444254b19ce6d16ec3df53']}[id];
  catalog.models[id]={name:info[0],author:info[1],source:'https://sketchfab.com/3d-models/'+info[2],license:'CC-BY-4.0',variants:[],notes:['Downloaded through authenticated official download; normalized and simplified.']};
  for(let vi=0;vi<(id==='maple'?3:1);vi++){
   const doc=await io.read(file);
   if(id==='maple')for(const node of doc.getRoot().listNodes()){
    if(!node.getMesh())continue;const parent=node.getParentNode()?.getName()||'';
    const suffix=vi===0?'':'.00'+vi;
    if(!parent.startsWith('structure'+suffix+'_')&&!parent.startsWith('foliage'+suffix+'_'))node.setMesh(null);
   }
   if(id==='palm')for(const m of doc.getRoot().listMaterials()){
    if(m.getAlphaMode()==='MASK')m.setName('coconut_foliage').setDoubleSided(true);else m.setName(m.getName()+'_bark_coconut');
   }
   const bounds=normalise(doc,height);
   if(id==='bench'){
    const metal=doc.createMaterial('bench_cast_iron').setBaseColorFactor([.032,.029,.025,1]).setMetallicFactor(.68).setRoughnessFactor(.48);
    for(const m of doc.getRoot().listMaterials())if(/Wood/i.test(m.getName()))m.setBaseColorFactor([.3,.115,.038,1]).setRoughnessFactor(.72);
    for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())if(!/wood/i.test(p.getMaterial()?.getName()||''))p.setMaterial(metal);
   }
   await pack(doc);await doc.transform(join());
   const variant={id:String(vi),bounds,height,lods:{}};
   for(const[level,budget]of [['near',target],['mid',Math.round(target*.25)],['far',Math.round(target*.06)]]){
    const copy=await io.readBinary(await io.writeBinary(doc));
    if(id==='maple'){
     sampleFoliage(copy,{near:16000,mid:4000,far:800}[level]);
     const bark=copy.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>!/foliage/i.test(p.getMaterial()?.getName()||''));
     const total=bark.reduce((n,p)=>n+(p.getIndices()?.getCount()||0)/3,0),targetBark={near:6500,mid:1500,far:350}[level];
     for(const p of bark)simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:Math.min(1,targetBark/total),error:.1,lockBorder:false});
     await copy.transform(weld(),prune());
    }else await copy.transform(simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,budget/triangles(copy)),error:.025,lockBorder:level==='near'}),prune());
    variant.lods[level]=await write(copy,id,vi,level);
   }
   catalog.models[id].variants.push(variant);console.log('SKETCHFAB_PACKED',id,vi,variant.lods);
  }
 }
}
const mode=process.argv[2]||'all';
if(mode==='all'||mode==='props')await sourceModels();
if(mode==='all'||mode==='fir')await fir();
if(mode==='all'||mode==='sketchfab')await sketchfab();
await fs.writeFile(path.join(OUT,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
