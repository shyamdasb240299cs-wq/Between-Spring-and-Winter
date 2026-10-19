import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return n(s+'.ts',c);throw e;}}});
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:128,height:128,close(){}});globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const {createSeasonProps}=await import('../app/shrine-void/season-props.ts');
const {createSeasonLayout,groundHeight}=await import('../app/shrine-void/season-layout.ts');
const {createScenePickup}=await import('../app/shrine-void/scene-pickup.ts');
const kit=JSON.parse(await fs.readFile('public/seasons/kit/catalog.json','utf8')),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),models={};
for(const key of ['basket','picnic-basket','apple','plate','thermos','ball','shell','rock','coral','campfire','bench','camp-thermos','lantern','log','boulder','beach-chair','umbrella']){const b=await fs.readFile('public'+kit.models[key==='boulder'?'rock':key==='rock'?'pebble':key].variants[0].lods.near.url);models[key]=(await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
for(const id of ['spring','summer','autumn','winter']){
 const props=createSeasonProps(id,createSeasonLayout(id),models);props.group.updateMatrixWorld(true);
 const layout=createSeasonLayout(id),expanded=props.group.getObjectByName('Expanded trails, resting places and rock outcrops');
 assert.ok(expanded);assert.equal(expanded.children.length,layout.landmarks.length,'Every shared landmark placement has its actual glTF model');
 for(let i=0;i<expanded.children.length;i++)for(let j=i+1;j<expanded.children.length;j++){const a=expanded.children[i],b=expanded.children[j];if(a.userData.landmark.kind==='umbrella'||b.userData.landmark.kind==='umbrella')continue;assert.equal(new THREE.Box3().setFromObject(a).intersectsBox(new THREE.Box3().setFromObject(b)),false,`${id}: new ground scenery must not intersect: ${a.name}, ${b.name}`);}
 for(const root of expanded.children){
   const p=root.userData.landmark,b=new THREE.Box3().setFromObject(root);
   assert.ok(root.children.length&&b.max.y>b.min.y,'Every new feature has real 3D geometry');
   root.traverse(o=>{if(!(o instanceof THREE.Mesh)||p.kind==='umbrella')return;const a=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert.ok(Math.hypot(v.x-p.x,v.z-p.z)<=p.radius+.04,`${id}: the walking collider encloses ${p.kind}`);}});
   if(p.kind==='bench'||p.kind==='beach-chair'){
     const contacts=[Infinity,Infinity,Infinity,Infinity];root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const a=o.geometry.attributes.position,v=new THREE.Vector3(),local=new THREE.Vector3();for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);local.copy(v);root.worldToLocal(local);const slot=Number(local.x>0)*2+Number(local.z>0);contacts[slot]=Math.min(contacts[slot],v.y-groundHeight(id,v.x,v.z));}});
     assert.ok(contacts.every(h=>h>-.04&&h<.08),`${id}: all seat feet meet the sloped terrain: ${contacts}`);
   }
 }
 const objects=props.pickup.items.map(e=>e.object),collisions=[];
 for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){const a=objects[i],b=objects[j];if(a.getObjectById(b.id)||b.getObjectById(a.id))continue;const ba=new THREE.Box3().setFromObject(a).expandByScalar(-.008),bb=new THREE.Box3().setFromObject(b).expandByScalar(-.008);if(ba.intersectsBox(bb))collisions.push([a.name,b.name,ba.getCenter(new THREE.Vector3()).toArray(),bb.getCenter(new THREE.Vector3()).toArray()]);}
 assert.deepEqual(collisions,[],`${id}: loose props must begin without intersecting bounds`);
 assert.ok(objects.length>=({spring:10,summer:40,autumn:2,winter:4}[id]),`${id}: all small foreground props are registered`);
 const camera=new THREE.PerspectiveCamera(58,16/9,.1,200),ray=new THREE.Raycaster();
 for(const item of props.pickup.items){
   const b=new THREE.Box3().setFromObject(item.object),at=b.getCenter(new THREE.Vector3());
   camera.position.copy(at).add(new THREE.Vector3(0,1.1,1));camera.lookAt(at);camera.updateMatrixWorld();ray.set(camera.position,at.clone().sub(camera.position).normalize());
   const result=props.pickup.pickup(camera,ray);assert.ok(result,`${id}: ${item.label} can be picked up at arm's reach`);
   assert.equal(props.pickup.pickup(camera,ray),null,'A second pickup cannot replace the held item');
   const held=props.pickup.held;
   camera.position.set(0,groundHeight(id,0,3)+1.63,3);camera.lookAt(0,camera.position.y,-3);camera.updateMatrixWorld();
   for(let n=0;n<60;n++)props.pickup.update(1/60,camera);
   const carried=held.getWorldPosition(new THREE.Vector3());assert.ok(carried.distanceTo(camera.position)<1.5,'Carried objects stay at hand scale');
   camera.rotateX(.5);props.pickup.update(1/60,camera);assert.ok(held.getWorldPosition(new THREE.Vector3()).distanceTo(carried)<.002,'Looking up/down does not swing a held prop through the ground');
   const message=props.pickup.drop(camera);assert.match(message,/Putting down|no clear space/);
   if(props.pickup.held){camera.position.set(-1,groundHeight(id,-1,1)+1.63,1);camera.lookAt(-1,camera.position.y,-4);camera.updateMatrixWorld();assert.match(props.pickup.drop(camera),/Putting down/);}
   for(let n=0;n<30;n++)props.pickup.update(1/60,camera);
   assert.equal(props.pickup.held,null);assert.equal(props.pickup.settling,false);
   const landed=new THREE.Box3().setFromObject(held);
   for(const sx of [-1,-.5,0,.5,1])for(const sz of [-1,-.5,0,.5,1]){
     const x=THREE.MathUtils.lerp(landed.min.x,landed.max.x,(sx+1)/2),z=THREE.MathUtils.lerp(landed.min.z,landed.max.z,(sz+1)/2);
     assert.ok(landed.min.y>=props.pickup.supportHeight(x,z)-.002,'The full footprint remains above terrain and fabric');
   }
   // Reset each test item into a distant test parking area after checking placement.
   held.position.x+=35;held.updateMatrixWorld(true);
 }
 console.log(`${id}: ${objects.length} real loose props; pickup, pitch-independent carry, clear drop, collision and surface contact passed`);
}

// A raised, wavy cloth surface must catch the whole base, including its corners.
for(const reduced of [false,true])for(const hz of [30,60,120]){
 const layout=createSeasonLayout('spring'),scene=new THREE.Scene(),item=new THREE.Mesh(new THREE.BoxGeometry(.48,.25,.4),new THREE.MeshBasicMaterial()),cloth=new THREE.Mesh(new THREE.PlaneGeometry(4,4,30,30),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 cloth.geometry.rotateX(-Math.PI/2);const p=cloth.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,.32+Math.sin(p.getX(i)*8)*.018+Math.cos(p.getZ(i)*9)*.012);cloth.geometry.computeVertexNormals();scene.add(item,cloth);item.position.set(0,1,0);scene.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,1.6,1.8);camera.lookAt(item.position);camera.updateMatrixWorld();const ray=new THREE.Raycaster(camera.position,item.position.clone().sub(camera.position).normalize()),pickup=createScenePickup('spring',layout,[{object:item,label:'test basket'}],[],reduced,[cloth]);
 assert.ok(pickup.pickup(camera,ray));for(let i=0;i<hz;i++)pickup.update(1/hz,camera);camera.lookAt(0,1.6,-3);camera.updateMatrixWorld();assert.match(pickup.drop(camera),/Putting down/);for(let i=0;i<hz;i++)pickup.update(1/hz,camera);
 const box=new THREE.Box3().setFromObject(item);for(let x=box.min.x;x<=box.max.x;x+=.025)for(let z=box.min.z;z<=box.max.z;z+=.025)assert.ok(box.min.y>=pickup.supportHeight(x,z)-.003,'No part of the base sinks through the raised blanket');
 assert.ok(box.min.y>.3,'Placement uses the blanket rather than the lower terrain');
 const obstruction=new THREE.Mesh(new THREE.BoxGeometry(40,8,40),new THREE.MeshBasicMaterial());scene.add(obstruction);const blocked=createScenePickup('spring',layout,[{object:item,label:'basket'}],[obstruction],reduced,[cloth]);camera.lookAt(box.getCenter(new THREE.Vector3()));camera.updateMatrixWorld();ray.set(camera.position,box.getCenter(new THREE.Vector3()).sub(camera.position).normalize());assert.ok(blocked.pickup(camera,ray));assert.match(blocked.drop(camera),/no clear space/);assert.equal(blocked.held,item,'A blocked drop must keep the item in hand');
}
console.log('Blanket contact, obstructed drops, 30/60/120 Hz and reduced motion passed.');

