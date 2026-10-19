/** Repack embedded textures/geometry, deduplicate materials and record real budgets. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const compact=process.argv.includes('--mobile');
for(const id of process.argv.slice(2).filter(arg=>!arg.startsWith('--'))){
  const root=new URL(`../public/seasons/${id}/`,import.meta.url);
  const model=compact?'world-mobile.glb':'world.glb';
  const file=await fs.readFile(new URL(model,root));
  const jsonLength=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+jsonLength).toString());
  const binStart=20+jsonLength+8,bin=file.subarray(binStart);
  // Cycles fog cards become opaque in glTF; the runtime supplies depth fog.
  if(id==='summer')for(const node of json.nodes||[])if(/^fogg|^cloudes|^sea$/i.test(node.name||''))delete node.mesh;
  // Transparent particle emitters are authoring helpers, not visible architecture.
  const audit=JSON.parse(await fs.readFile(new URL(`../../Assets and working files/seasons/${id}-audit.json`,import.meta.url),'utf8'));
  const transparent=new Set(audit.materials.filter(m=>m.nodes.includes('ShaderNodeBsdfTransparent')&&!m.nodes.some(n=>/Principled|Diffuse|Emission|Group/.test(n))).map(m=>m.name));
  const emitters=new Set(audit.objects.filter(o=>o.materials?.length&&o.materials.every(m=>transparent.has(m))).map(o=>o.name));
  for(const node of json.nodes||[])if(emitters.has(node.name))delete node.mesh;
  const converted=new Map(),imageRemap=new Map(),images=[],imageKeys=new Map();
  const tints=new Map(),largeImages=new Set();
  for(const material of json.materials||[]){
    const name=material.name||'',index=material.pbrMetallicRoughness?.baseColorTexture?.index;
    const texture=json.textures?.[index],source=texture?.source??texture?.extensions?.EXT_texture_webp?.source;
    if(source===undefined)continue;
    if(/ground|cliff|sand|wall|roof|wood|bark/i.test(name))largeImages.add(source);
    if(id==='spring'&&/flower|blossom|petal/i.test(name))tints.set(source,'#ffbdd6');
    if(id==='autumn'&&/leaf|leav|foliage/i.test(name))tints.set(source,'#e68b3f');
  }
  let textureBytes=0;
  for(const [index,image] of (json.images||[]).entries()){
    const view=json.bufferViews[image.bufferView];
    const raw=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
    const metadata=await sharp(raw).metadata();
    // Smaller foliage/textile maps matter more to mobile memory than file compression.
    const edge=largeImages.has(index)&&!compact?1024:512;
    let imagePipeline=sharp(raw).resize({width:edge,height:edge,fit:'inside',withoutEnlargement:true});
    if(tints.has(index))imagePipeline=imagePipeline.tint(tints.get(index));
    const webp=await imagePipeline.webp({quality:84,alphaQuality:95}).toBuffer();
    converted.set(image.bufferView,webp);
    const key=createHash('sha256').update(webp).digest('hex');
    let target=imageKeys.get(key);
    if(target===undefined){target=images.length;imageKeys.set(key,target);images.push({...image,mimeType:'image/webp'});const m=await sharp(webp).metadata();textureBytes+=(m.width||1)*(m.height||1)*4*4/3;}
    imageRemap.set(index,target);
  }
  json.images=images;
  const textureRemap=new Map(),textures=[],textureKeys=new Map();
  for(const [index,texture] of (json.textures||[]).entries()){
    const source=texture.source??texture.extensions?.EXT_texture_webp?.source;
    delete texture.source;
    texture.extensions={...texture.extensions,EXT_texture_webp:{source:imageRemap.get(source)}};
    const key=JSON.stringify(texture);let target=textureKeys.get(key);
    if(target===undefined){target=textures.length;textureKeys.set(key,target);textures.push(texture);}
    textureRemap.set(index,target);
  }
  json.textures=textures;
  function replaceTextures(value){for(const [key,child] of Object.entries(value||{})){if(!child||typeof child!=='object')continue;if(/texture$/i.test(key)&&Number.isInteger(child.index))child.index=textureRemap.get(child.index);else replaceTextures(child);}}
  const materialRemap=new Map(),materials=[],materialKeys=new Map();
  for(const [index,material] of (json.materials||[]).entries()){
    replaceTextures(material);const {name,extras,...signature}=material;const key=JSON.stringify(signature);let target=materialKeys.get(key);
    if(target===undefined){target=materials.length;materialKeys.set(key,target);materials.push(material);}
    materialRemap.set(index,target);
  }
  json.materials=materials;
  for(const mesh of json.meshes||[])for(const primitive of mesh.primitives)if(primitive.material!==undefined)primitive.material=materialRemap.get(primitive.material);
  let offset=0;const chunks=[],payloads=new Map();
  function append(bytes){const key=createHash('sha256').update(bytes).digest('hex');if(payloads.has(key))return payloads.get(key);const at=offset;chunks.push(bytes);offset+=bytes.length;const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}payloads.set(key,at);return at;}
  for(const [index,view] of json.bufferViews.entries()){
    const compression=view.extensions?.EXT_meshopt_compression;
    if(compression){const bytes=bin.subarray(compression.byteOffset||0,(compression.byteOffset||0)+compression.byteLength);compression.byteOffset=append(bytes);}
    else if(view.buffer===0){const bytes=converted.get(index)||bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);view.byteOffset=append(bytes);view.byteLength=bytes.length;}
  }
  const packedBin=Buffer.concat(chunks);json.buffers[0].byteLength=packedBin.length;
  json.extensionsUsed=[...new Set([...(json.extensionsUsed||[]),'EXT_texture_webp'])];
  json.extensionsRequired=[...new Set([...(json.extensionsRequired||[]),'EXT_texture_webp'])];
  const rawJson=Buffer.from(JSON.stringify(json));const packedJson=Buffer.concat([rawJson,Buffer.alloc((4-rawJson.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+packedJson.length+packedBin.length,8);header.writeUInt32LE(packedJson.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(packedBin.length);binHeader.writeUInt32LE(0x004e4942,4);
  const packed=Buffer.concat([header,packedJson,binHeader,packedBin]);
  await fs.writeFile(new URL(model,root),packed);
  const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));
  const triangles=(json.nodes||[]).reduce((total,node)=>{const mesh=json.meshes[node.mesh];if(!mesh)return total;const instances=node.extensions?.EXT_mesh_gpu_instancing?.attributes;const count=instances?json.accessors[Object.values(instances)[0]].count:1;return total+count*mesh.primitives.reduce((sum,p)=>sum+json.accessors[p.indices??p.attributes.POSITION].count/3,0);},0);
  if(compact)manifest.mobile={model:`/seasons/${id}/${model}`,bytes:packed.length,triangles,textureMemoryBytes:Math.round(textureBytes)};
  else{manifest.bytes=packed.length;manifest.textureMemoryBytes=Math.round(textureBytes);manifest.triangles=triangles;}
  await fs.writeFile(new URL('manifest.json',root),JSON.stringify(manifest)+'\n');
  console.log(id,compact?'mobile':'desktop',JSON.stringify({bytes:packed.length,textures:images.length,textureMemoryMB:Math.round(textureBytes/1048576),materials:materials.length,triangles}));
}
