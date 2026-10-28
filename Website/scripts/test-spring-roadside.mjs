import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import fs from 'node:fs/promises';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import * as THREE from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient(){return gradient},createRadialGradient(){return gradient}},{get(t,p){return p in t?t[p]:()=>{}},set(t,p,v){t[p]=v;return true;}});
globalThis.document={createElement(){return {width:0,height:0,getContext(){return context;}};}};
const {createSpringKsrtcBus}=await import('../app/shrine-void/spring-ksrtc-bus.ts');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),models={},sourceMaterials=new Set();
let bytes=0,propTriangles=0;
for(const key of ['fence','shutter','crate','barrel','plant','chair']){
  const path='public/seasons/kit/spring-roadside/'+key+'.glb',doc=await io.read(path),nodes=new Map(),materials=new Map();
  bytes+=(await fs.stat(path)).size;
  const bounds=getBounds(doc.getRoot().listScenes()[0]);assert.ok(Math.abs(bounds.min[1])<.001,key+' is grounded');
  for(const n of doc.getRoot().listNodes()){
    const object=new THREE.Group();object.name=n.getName();object.matrix.fromArray(n.getMatrix());object.matrix.decompose(object.position,object.quaternion,object.scale);nodes.set(n,object);
    for(const p of n.getMesh()?.listPrimitives()??[]){
      const g=new THREE.BufferGeometry();
      for(const [sem,name] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv'],['TANGENT','tangent']]){const a=p.getAttribute(sem);if(a)g.setAttribute(name,new THREE.BufferAttribute(a.getArray(),a.getElementSize()));}
      if(p.getIndices())g.setIndex(new THREE.BufferAttribute(p.getIndices().getArray(),1));
      propTriangles+=(g.index?.count??g.attributes.position.count)/3;
      const source=p.getMaterial();let m=materials.get(source);if(!m){m=new THREE.MeshStandardMaterial();m.name=source.getName();m.roughness=source.getRoughnessFactor();m.metalness=source.getMetallicFactor();materials.set(source,m);sourceMaterials.add(m);}
      object.add(new THREE.Mesh(g,m));
    }
  }
  for(const n of doc.getRoot().listNodes())for(const child of n.listChildren())nodes.get(n).add(nodes.get(child));
  const root=new THREE.Group();for(const n of doc.getRoot().listScenes()[0].listChildren())root.add(nodes.get(n));models['roadside-'+key]=root;
}
assert.ok(bytes<7_000_000);assert.ok(propTriangles<25_000,'Detailed imported props fit their roadside budgets');
const bus=createSpringKsrtcBus(models),scene=new THREE.Scene();scene.add(bus.group);bus.group.visible=true;
const stats=bus.roadsideStats;assert.ok(stats.buildings>=28&&stats.shops>=12&&stats.gates>=12&&stats.signs>=5);
let meshes=0,triangles=0;const ownedMaterials=new Set();
bus.group.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
  for(const number of o.geometry.attributes.position.array)assert.ok(Number.isFinite(number));
  for(const m of Array.isArray(o.material)?o.material:[o.material]){assert.ok(!sourceMaterials.has(m),'Imported materials are isolated from the source cache');ownedMaterials.add(m);}
});
assert.ok(meshes<600,`Full street material batching: ${meshes} meshes`);
assert.ok(triangles<1_300_000,`Full street geometry: ${triangles} triangles`);
const strips=scene.getObjectByName('Moving Kerala road · left-hand traffic').children.filter(o=>o.name.startsWith('Kerala roadside strip'));
assert.equal(strips.length,10);
bus.update(.05,1);scene.updateMatrixWorld(true);const prior=strips.map(strip=>strip.getWorldPosition(new THREE.Vector3()).z);
bus.update(.05,1.05);scene.updateMatrixWorld(true);
strips.forEach((strip,i)=>assert.ok(Math.abs(strip.getWorldPosition(new THREE.Vector3()).z-prior[i]-.435)<1e-6,'Architecture, fences and props share the roadside travel speed'));
let disposedSources=0;sourceMaterials.forEach(m=>m.addEventListener('dispose',()=>disposedSources++));
let disposedOwned=0;ownedMaterials.forEach(m=>m.addEventListener('dispose',()=>disposedOwned++));
bus.dispose();assert.equal(disposedSources,0);assert.equal(disposedOwned,ownedMaterials.size);
console.log(`Roadside passed: ${JSON.stringify(stats)}, six grounded PBR props (${(bytes/1e6).toFixed(2)} MB), ${meshes} meshes, ${Math.round(triangles)} triangles, aligned movement and isolated resource ownership.`);
