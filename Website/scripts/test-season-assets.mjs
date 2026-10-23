import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import sharp from 'sharp';
const root=new URL('../public/',import.meta.url),catalog=JSON.parse(await fs.readFile(new URL('seasons/kit/catalog.json',root),'utf8'));
assert.equal(catalog.coordinateSystem,'Y_UP_METRES');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),report=[];
const propKeys=['picnic-basket','apple','plate','thermos','camp-thermos','ball','beach-chair','lantern','umbrella'];
for(const id of ['cherry','palm','maple','fir','bench','campfire','basket','rock','shell','log','grass','coastal-shrub','coral','pebble','woodland-rock','coastal-rock','loose-rock',...propKeys]){
  const entry=catalog.models[id];assert.ok(entry?.variants.length,`Missing selected asset ${id}`);
  assert.ok(entry.source.startsWith('https://'));assert.ok(['CC-BY-4.0','CC-BY-3.0','CC0-1.0'].includes(entry.license));
  if(propKeys.includes(id))assert.ok(/^https:\/\/(polyhaven\.com\/a\/|github\.com\/KhronosGroup\/|poly\.pizza\/m\/)/.test(entry.source),`${id}: unverified source domain`);
  for(const variant of entry.variants)for(const [level,lod]of Object.entries(variant.lods)){
    assert.ok(lod.url.startsWith('/seasons/kit/models/'));const data=await fs.readFile(new URL(lod.url.slice(1),root));
    assert.equal(data.length,lod.bytes);assert.equal(data.readUInt32LE(8),data.length);assert.ok(data.length<6*1048576);
    const doc=await io.readBinary(data);let triangles=0;
    for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
      const pos=p.getAttribute('POSITION');assert.ok([...pos.getArray()].every(Number.isFinite),`${id} invalid vertices`);
      triangles+=(p.getIndices()?.getCount()||pos.getCount())/3;
      if(id==='cherry'||p.getMaterial()?.getBaseColorTexture())assert.ok(p.getAttribute('TEXCOORD_0'),`${id} textured geometry has no UVs`);
    }
    assert.equal(Math.round(triangles),lod.triangles);
    if(id==='cherry'||id==='maple'){
      const bark=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>/bark/i.test(p.getMaterial()?.getName()||''));
      const low=Math.min(...bark.map(p=>p.getAttribute('POSITION').getMin([])[1]));
      assert.ok(Math.abs(low)<.001,`${id} ${level}: the full lower trunk must reach the ground`);
      for(let y=.1;y<2.3;y+=.2)assert.ok(bark.some(p=>{
        const a=p.getAttribute('POSITION').getArray();for(let i=1;i<a.length;i+=3)if(Math.abs(a[i]-y)<.3)return true;return false;
      }),`${id} ${level}: lower stem must have continuous vertical coverage`);
    }
    if(id==='fir'){
      const stems=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>/trunk_/.test(p.getMaterial()?.getName()||''));
      assert.equal(stems.length,1,'Each fir needs one independently preserved scanned stem');
      const stem=stems[0],count=(stem.getIndices()?.getCount()||stem.getAttribute('POSITION').getCount())/3;
      assert.ok(count>=(level==='near'?3000:level==='mid'?1300:450),'Stem simplification must retain its smooth silhouette');
      assert.ok(stem.getAttribute('TEXCOORD_0')&&stem.getAttribute('NORMAL'),'Preserve the bark atlas UVs and authored normals');
    }
    const budget=id==='campfire'?16000:id==='cherry'&&level==='far'?7000:level==='near'?35000:level==='mid'?10000:5000;
    assert.ok(triangles<budget,`${id} ${level}: geometry budget`);
    if(propKeys.includes(id)){assert.ok(triangles<=5000,`${id}: oversized foreground prop`);assert.ok(data.length<650000,`${id}: oversized foreground GLB`);}
    for(const material of doc.getRoot().listMaterials())if(material.getAlphaMode()==='MASK'){
      const tex=material.getBaseColorTexture();assert.ok(tex);const meta=await sharp(tex.getImage()).metadata();assert.equal(meta.hasAlpha,true,`${id}: foliage lost its mask`);
    }
    report.push({id,variant:variant.id,level,triangles,bytes:data.length});
  }
}
for(const [id,maps]of Object.entries(catalog.textures))for(const key of ['color','normal','roughness']){assert.ok(maps[key]);const metadata=await sharp(await fs.readFile(new URL(maps[key].slice(1),root))).metadata();assert.ok(metadata.width<=2048,`${id}: oversized texture`);}
for(const season of ['spring','summer','autumn','winter'])assert.ok((await fs.stat(new URL(catalog.skies[season].url.slice(1),root))).size>0);
for(const season of ['summer','winter']){assert.match(catalog.skies[season].source,/polyhaven.com\/a\/qwantani_sunset_puresky/);assert.equal(catalog.skies[season].license,'CC0-1.0');}
await fs.writeFile(new URL('../season-asset-audit.json',import.meta.url),JSON.stringify({version:3,models:report},null,2)+'\n');
console.log(`${report.length} component LODs passed: provenance, byte sizes, finite meshes, UVs, alpha masks and budgets.`);
