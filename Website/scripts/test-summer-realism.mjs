import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';

const root=path.resolve(import.meta.dirname,'..');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const loader=await fs.readFile(path.join(root,'app/shrine-void/summer-asset-loader.ts'),'utf8');
const urls=[...loader.matchAll(/'([^']+\.glb)'/g)].map(m=>m[1]);
for(const url of urls){
  const doc=await io.read(path.join(root,'public',url));
  assert.ok(doc.getRoot().listMeshes().length,`${url} must contain renderable geometry`);
  for(const accessor of doc.getRoot().listAccessors()){
    const data=accessor.getArray();assert.ok(data?.every(Number.isFinite),`${url} has finite geometry`);
  }
  if(url.includes('/realism/')){
    assert.ok(doc.getRoot().listMaterials().some(m=>m.getBaseColorTexture()&&m.getNormalTexture()&&m.getMetallicRoughnessTexture()),`${url} retains full scanned surface maps`);
    const triangles=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0);
    assert.ok(triangles<4000,`${url} stays within the repeated scenery budget`);
    for(const texture of doc.getRoot().listTextures())assert.ok(texture.getImage()?.byteLength,`${url} embeds its maps`);
  }
}
const sourceDir=path.join(root,'public/seasons/kit/summer/realism');
const manifest=JSON.parse(await fs.readFile(path.join(sourceDir,'sources.json'),'utf8'));
assert.equal(manifest.length,4);
for(const entry of manifest)assert.equal(entry.license,'CC0-1.0');
for(const surface of ['coral_gravel','weathered_planks'])for(const map of ['color','normal','roughness']){
  const bytes=await fs.readFile(path.join(sourceDir,`${surface}-${map}.webp`));
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length>1000);
}
console.log(`Summer realism: ${urls.length} complete local models, embedded PBR maps, finite geometry, texture files, source licences and repeated-mesh budgets passed.`);
