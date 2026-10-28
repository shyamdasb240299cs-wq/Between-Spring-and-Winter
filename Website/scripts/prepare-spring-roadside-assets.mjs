import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,textureCompress,weld,simplify} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';

const workspace=path.resolve(import.meta.dirname,'../..');
const sourceRoot=path.join(workspace,'Assets and working files/seasons/spring-roadside');
const output=path.join(workspace,'Website/public/seasons/kit/spring-roadside');
await fs.mkdir(sourceRoot,{recursive:true});await fs.mkdir(output,{recursive:true});
const picks=[
  ['modular_chainlink_fence','fence'],
  ['rollershutter_window_01','shutter'],
  ['plastic_crate_01','crate'],
  ['Barrel_02','barrel'],
  ['potted_plant_01','plant'],
  ['plastic_monobloc_chair_01','chair'],
];
async function cachedJson(url,file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);const json=await r.json();await fs.writeFile(file,JSON.stringify(json,null,2));return json;}}
async function download(url,file){try{const st=await fs.stat(file);if(st.size>100)return;}catch{}await fs.mkdir(path.dirname(file),{recursive:true});const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);await fs.writeFile(file,new Uint8Array(await r.arrayBuffer()));}
const index=await cachedJson('https://api.polyhaven.com/assets?t=models',path.join(sourceRoot,'polyhaven-models.json'));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
const assets=[];
for(const [id,file] of picks){
  const source=path.join(sourceRoot,id);await fs.mkdir(source,{recursive:true});
  const files=await cachedJson('https://api.polyhaven.com/files/'+id,path.join(source,'download-manifest.json'));
  const entry=files.gltf['2k'].gltf,original=path.join(source,id+'.gltf');
  await download(entry.url,original);
  await Promise.all(Object.entries(entry.include).map(([name,item])=>download(item.url,path.join(source,name))));
  const doc=await io.read(original);
  console.log(id+' nodes: '+doc.getRoot().listNodes().map(n=>n.getName()).join(', '));
  // Retain both main and optional source materials, except the graffiti variant
  // of the shop shutter, which is inappropriate for the maintained village.
  if(id==='rollershutter_window_01')for(const node of [...doc.getRoot().listNodes()])if(/graffiti/i.test(node.getName()))node.dispose();
  if(id==='modular_chainlink_fence')for(const node of [...doc.getRoot().listNodes()])if(node.getName()!=='modular_chainlink_fence_double')node.dispose();
  if(id==='modular_chainlink_fence'||id==='potted_plant_01'){
    // The upstream glTF references a JPEG base colour but omits its separate
    // opacity image. Embed that image as alpha so the chain-link holes survive.
    const mask=id==='modular_chainlink_fence'?'wire':'leaves',alpha=path.join(source,mask+'-alpha.png');await download(files[mask+'_alpha']['1k'].png.url,alpha);
    for(const material of doc.getRoot().listMaterials())if(material.getName()===(id==='modular_chainlink_fence'?'modular_chainlink_fence_wire':'potted_plant_01_leaves')){
      const map=material.getBaseColorTexture();
      const opacity=await sharp(alpha).resize(1024,1024).greyscale().raw().toBuffer();
      const base=await sharp(map.getImage()).resize(1024,1024).removeAlpha().png().toBuffer();
      const image=await sharp(base).joinChannel(opacity,{raw:{width:1024,height:1024,channels:1}}).webp({quality:90,alphaQuality:100}).toBuffer();
      map.setImage(image).setMimeType('image/webp');material.setAlphaMode('MASK').setAlphaCutoff(.42);
    }
  }
  const targetTriangles={potted_plant_01:4800,plastic_crate_01:2800,plastic_monobloc_chair_01:3000}[id];
  const geometryError=id==='potted_plant_01'||id==='plastic_crate_01'?.02:.003;
  if(targetTriangles){
    const sourceTriangles=doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
    await doc.transform(weld());
    const simplifier={...MeshoptSimplifier,simplify(indices,positions,stride,target,error){
      const prim=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).find(p=>p.getAttribute('POSITION').getArray()===positions);
      const normal=prim?.getAttribute('NORMAL')?.getArray(),uv=prim?.getAttribute('TEXCOORD_0')?.getArray();
      if(!normal||!uv)return MeshoptSimplifier.simplify(indices,positions,stride,target,error,['Permissive','Prune']);
      const attrs=new Float32Array(positions.length/3*5);
      for(let i=0;i<positions.length/3;i++){attrs.set(normal.subarray(i*3,i*3+3),i*5);attrs.set(uv.subarray(i*2,i*2+2),i*5+3);}
      return MeshoptSimplifier.simplifyWithAttributes(indices,positions,stride,attrs,5,[.1,.1,.1,.1,.1],null,target,error,['Permissive','Prune']);
    }};
    await doc.transform(simplify({simplifier,ratio:Math.min(1,targetTriangles/sourceTriangles),error:geometryError}));
  }
  await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:90}));
  if(id==='modular_chainlink_fence'||id==='potted_plant_01')for(const material of doc.getRoot().listMaterials())if(material.getAlphaMode()==='MASK'&&!((await sharp(material.getBaseColorTexture().getImage()).metadata()).hasAlpha))throw Error('Missing alpha after packing '+material.getName());
  const scene=doc.getRoot().listScenes()[0],bounds=getBounds(scene),offset=[-(bounds.min[0]+bounds.max[0])/2,-bounds.min[1],-(bounds.min[2]+bounds.max[2])/2];
  const wrapper=doc.createNode('Grounded roadside '+file).setTranslation(offset);
  for(const child of [...scene.listChildren()]){scene.removeChild(child);wrapper.addChild(child);}scene.addChild(wrapper);
  const outfile=path.join(output,file+'.glb');await io.write(outfile,doc);
  const triangles=doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
  const metadata={id,file:file+'.glb',name:index[id].name,source:'https://polyhaven.com/a/'+id,authors:index[id].authors,license:'CC0-1.0',bytes:(await fs.stat(outfile)).size,triangles,materials:doc.getRoot().listMaterials().length,bounds:getBounds(scene),modifications:['Ground centred at y=0, original scale and PBR UVs retained.','PBR maps packed into GLB as 1K WebP at quality 90.',...(targetTriangles?[`Geometry simplified with maximum normalized error ${geometryError} for roadside viewing; full source retained.`]:[])]};
  assets.push(metadata);console.log(JSON.stringify(metadata));
  if(id==='modular_chainlink_fence')metadata.modifications.push('Only the straight double panel is exported; the original modular kit is retained in source.','The separate source wire opacity image is packed into base-colour alpha, using alpha-test MASK at 0.42.');
  if(id==='potted_plant_01')metadata.modifications.push('The separate source leaf opacity image is packed into base-colour alpha, using alpha-test MASK at 0.42.');
}
const textures=await cachedJson('https://api.polyhaven.com/assets?t=textures',path.join(sourceRoot,'polyhaven-textures.json'));
for(const [id,prefix] of [['red_brick_plaster_patch_02','masonry'],['red_laterite_soil_stones','laterite']]){
  const source=path.join(sourceRoot,id);await fs.mkdir(source,{recursive:true});
  const files=await cachedJson('https://api.polyhaven.com/files/'+id,path.join(source,'download-manifest.json'));
  const maps=[['Diffuse','color'],['nor_gl','normal'],['Rough','roughness']];
  for(const [key,name] of maps){
    const entry=files[key]['1k'].jpg,original=path.join(source,key+'.jpg');await download(entry.url,original);
    await sharp(original).webp({quality:92}).toFile(path.join(output,prefix+'-'+name+'.webp'));
  }
  assets.push({id,name:textures[id].name,source:'https://polyhaven.com/a/'+id,authors:textures[id].authors,license:'CC0-1.0',files:maps.map(([,name])=>prefix+'-'+name+'.webp'),resolution:1024,modifications:['Original 1K PBR maps encoded as WebP at quality 92.']});
}
await fs.writeFile(path.join(output,'assets.json'),JSON.stringify({updated:'2026-10-27',assets},null,2)+'\n');
