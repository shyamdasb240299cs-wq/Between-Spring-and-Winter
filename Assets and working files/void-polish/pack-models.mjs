import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve('Website/package.json'));
const sharp=require('sharp');
const root=path.resolve('Website/public/void/models/jagobo');
const textures=path.resolve('Website/public/void/textures/jagobo');await fs.mkdir(textures,{recursive:true});
function read(b){return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());}
const textureBindings=JSON.parse(await fs.readFile(path.join(textures,'bindings.json'),'utf8').catch(()=>'{}'));
for(const file of (await fs.readdir(root)).filter(f=>f.endsWith('.glb'))){
 const b=await fs.readFile(path.join(root,file));const json=read(b),start=28+b.readUInt32LE(12);
 if(!json.images)continue;
 if(file==='tree-0-near.glb'||file==='lantern.glb'){
  for(const m of json.materials){
   const bindings={};
   for(const [name,ref] of Object.entries({map:m.pbrMetallicRoughness?.baseColorTexture,normalMap:m.normalTexture,roughnessMap:m.pbrMetallicRoughness?.metallicRoughnessTexture,emissiveMap:m.emissiveTexture})){
    if(!ref)continue;const im=json.images[json.textures[ref.index].source],v=json.bufferViews[im.bufferView];
    const bytes=b.subarray(start+(v.byteOffset||0),start+(v.byteOffset||0)+v.byteLength);
    const nameFile=`${m.name.replace(/[^a-zA-Z0-9]/g,'-')}-${name}.webp`;
    const size=m.name==='foliage'?2048:1024;
    await sharp(bytes).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100}).toFile(path.join(textures,nameFile));
    bindings[name]=`/void/textures/jagobo/${nameFile}`;
   }
   textureBindings[m.name]=bindings;
   await fs.writeFile(path.join(textures,'bindings.json'),JSON.stringify(textureBindings,null,2));
  }
 }
 // Geometry-only GLBs share one set of decoded textures at runtime.
 const imageViews=new Set(json.images.map(i=>i.bufferView)),mapping=new Map(),views=[],chunks=[];let offset=0;
 for(let i=0;i<json.bufferViews.length;i++){const v=json.bufferViews[i];if(imageViews.has(i))continue;
  mapping.set(i,views.length);views.push({...v,byteOffset:offset});const chunk=b.subarray(start+(v.byteOffset||0),start+(v.byteOffset||0)+v.byteLength);chunks.push(chunk);offset+=chunk.length;const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}}
 for(const a of json.accessors){if(a.bufferView!==undefined)a.bufferView=mapping.get(a.bufferView);if(a.sparse){a.sparse.indices.bufferView=mapping.get(a.sparse.indices.bufferView);a.sparse.values.bufferView=mapping.get(a.sparse.values.bufferView);}}
 for(const m of json.materials){delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;delete m.normalTexture;delete m.emissiveTexture;delete m.occlusionTexture;}
 delete json.images;delete json.textures;delete json.samplers;json.bufferViews=views;json.buffers=[{byteLength:offset}];
 const jsonBytes=Buffer.from(JSON.stringify(json));const jsonPad=Buffer.alloc((4-jsonBytes.length%4)%4,32),j=Buffer.concat([jsonBytes,jsonPad]),bin=Buffer.concat(chunks);
 const h=Buffer.alloc(20);h.writeUInt32LE(0x46546c67,0);h.writeUInt32LE(2,4);h.writeUInt32LE(28+j.length+bin.length,8);h.writeUInt32LE(j.length,12);h.writeUInt32LE(0x4e4f534a,16);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
 await fs.writeFile(path.join(root,file+'.packed'),Buffer.concat([h,j,bh,bin]));
}
await fs.writeFile(path.join(textures,'bindings.json'),JSON.stringify(textureBindings,null,2));
