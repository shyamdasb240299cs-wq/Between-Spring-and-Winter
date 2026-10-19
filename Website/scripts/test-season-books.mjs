import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return n(s+'.ts',c);throw e;}}});
const {createRelicState,relicSaveKey}=await import('../app/shrine-void/season-relic-state.ts');
const {seasonBook,clampBookPage}=await import('../app/shrine-void/season-book-data.ts');
const {createSeasonLayout,groundHeight}=await import('../app/shrine-void/season-layout.ts');
const {createSeasonTravel}=await import('../app/shrine-void/season-navigation.ts');
const {createSeasonRelics}=await import('../app/shrine-void/season-relics.ts');
const {relicPlacement,CHEST_SCALE,CHEST_COLLISION_RADIUS}=await import('../app/shrine-void/season-relic-placement.ts');
const {createScenePickup}=await import('../app/shrine-void/scene-pickup.ts');
const makeStorage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const advance=(state,seconds,hz)=>{for(let i=0;i<Math.ceil(seconds*hz);i++)state.update(1/hz);};
for(const id of ['spring','summer','autumn','winter'])for(const reduced of [false,true])for(const hz of [30,60,120]){
 const storage=makeStorage(),relic=createRelicState(id,reduced,storage);
 assert.equal(relic.read(),false);assert.equal(relic.act('book'),false);assert.equal(relic.act('unlock'),false,'A locked chest needs its key');
 assert.equal(relic.act('key'),true);assert.equal(relic.act('key'),false,'A key cannot be collected twice');
 assert.equal(createRelicState(id,reduced,storage).pose().hasKey,true,'Key pickup survives leaving/reloading');
 assert.equal(relic.act('unlock'),true);assert.equal(relic.act('unlock'),false);assert.equal(relic.act('book'),false);assert.ok(relic.pose().busy);
 advance(relic,reduced?.45:2.4,hz);assert.equal(relic.pose().lid,1);assert.equal(relic.pose().hasKey,false,'The used key is removed from inventory');
 assert.equal(relic.act('book'),true);advance(relic,1.1,hz);assert.equal(relic.pose().hasBook,true);
 const restored=createRelicState(id,reduced,storage);assert.ok(restored.pose().hasBook&&restored.state.unlocked);assert.equal(restored.act('book'),false);
 assert.equal(relic.read(),true);assert.equal(relic.read(),false);advance(relic,reduced?.9:3.1,hz);assert.equal(relic.pose().readerReady,true);assert.equal(relic.pose().opening,1);
 assert.equal(relic.close(),true);advance(relic,1,hz);assert.equal(relic.pose().busy,false);assert.equal(relic.pose().opening,0);assert.ok(relic.pose().hasBook,'Closing the reader keeps the carried book');
 relic.read();advance(relic,.15,hz);const partial=relic.pose();relic.close();assert.ok(Math.abs(relic.pose().present-partial.present)<1e-8,'Cancelling an opening cannot jump to a fully open pose');advance(relic,1,hz);
 const chapter=seasonBook(id);assert.equal(chapter.pages.length,id==='spring'?22:25);assert.ok(chapter.pages.every((p,i)=>p.number===i+1));
 if(id!=='spring')assert.ok(chapter.pages.every(p=>p.blank&&p.src==='/manga/blank.webp'),'Every unfinished season has exactly 25 blank pages');
 await fs.access(new URL('../public'+chapter.cover,import.meta.url));
}
assert.equal(clampBookPage(999,25),24);assert.equal(clampBookPage(-20,25),0);assert.equal(clampBookPage(NaN,25),0);
const bad=makeStorage();bad.setItem(relicSaveKey('autumn'),'broken');assert.equal(createRelicState('autumn',false,bad).pose().hasBook,false);
const brokenStorage={getItem(){throw Error('Storage unavailable');},setItem(){throw Error('Quota');}};const volatile=createRelicState('winter',false,brokenStorage);assert.equal(volatile.act('key'),true);
const isolated=makeStorage();createRelicState('spring',false,isolated).act('key');assert.equal(createRelicState('summer',false,isolated).pose().hasKey,false,'Keys belong to their own season');

// Decode the real book hierarchy/meshes; bitmap stubs are for geometry tests only, not rendering.
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1200,height:1800,close(){}});
const buffer=await fs.readFile(new URL('../public/manga/book-v3.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
const cover=new THREE.Texture(),camera=new THREE.PerspectiveCamera(58,16/9,.1,240);
const stoneDocument=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(fileURLToPath(new URL('../public/void/models/polished/moss-rocks-far.glb',import.meta.url)));
const stoneNode=stoneDocument.getRoot().listNodes().find(n=>n.getMesh()),primitive=stoneNode.getMesh().listPrimitives()[0],stoneGeometry=new THREE.BufferGeometry();
for(const [attribute,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const accessor=primitive.getAttribute(attribute);if(accessor)stoneGeometry.setAttribute(name,new THREE.BufferAttribute(accessor.getArray().slice(),accessor.getElementSize()));}
if(primitive.getIndices())stoneGeometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray().slice(),1));stoneGeometry.applyMatrix4(new THREE.Matrix4().fromArray(stoneNode.getWorldMatrix()));
const surfaces={wood:new THREE.Texture(),cloth:new THREE.Texture(),paper:new THREE.Texture(),stone:{geometry:stoneGeometry,material:new THREE.MeshStandardMaterial({map:new THREE.Texture()}),name:'real scanned rock'}};
for(const id of ['spring','summer','autumn','winter']){
 const layout=createSeasonLayout(id),nav=layout.navigation,travel=createSeasonTravel(nav),placement=relicPlacement(id,layout.prop),relic=createSeasonRelics(id,layout,gltf.scene,cover,false,makeStorage(),surfaces);
 assert.equal(relic.chest.scale.x,CHEST_SCALE);relic.chest.updateMatrixWorld(true);
 const unturned=relic.chest.clone(true);unturned.quaternion.identity();unturned.position.set(0,0,0);
 const chestSize=new THREE.Box3().setFromObject(unturned).getSize(new THREE.Vector3());
 assert.ok(chestSize.x<.70&&chestSize.y<.45&&chestSize.z<.60,`The compact chest retains its intended dimensions on sloped ground: ${id} ${chestSize.toArray()}`);
 assert.ok(Math.hypot(.5,.355)*CHEST_SCALE<=CHEST_COLLISION_RADIUS,'The smaller collision radius still encloses the real chest');
 assert.ok(layout.trees.every(t=>Math.hypot(t.x-placement.chest.x,t.z-placement.chest.z)>t.radius+CHEST_COLLISION_RADIUS+.15),'The box clears tree trunks');
 const footContacts=[Infinity,Infinity,Infinity,Infinity],bodyPositions=relic.chest.children[0].geometry.attributes.position,contactPoint=new THREE.Vector3();
 for(let i=0;i<bodyPositions.count;i++){
  const x=bodyPositions.getX(i),y=bodyPositions.getY(i),z=bodyPositions.getZ(i);if(y>.045||Math.abs(x)<.30||Math.abs(z)<.18)continue;
  contactPoint.fromBufferAttribute(bodyPositions,i).applyMatrix4(relic.chest.matrixWorld);
  const corner=Number(x>0)*2+Number(z>0);footContacts[corner]=Math.min(footContacts[corner],contactPoint.y-groundHeight(id,contactPoint.x,contactPoint.z));
 }
 assert.ok(footContacts.every(h=>h>-.025&&h<.025),`All four chest feet must contact the actual terrain: ${id} ${footContacts}`);
 assert.equal(relic.chest.children[0].material.map,surfaces.wood,'The chest uses the cedar colour texture');assert.equal(relic.chest.children[0].material.bumpMap,surfaces.wood,'The cedar has surface relief');assert.ok(relic.group.getObjectByName('Scanned stone key rest'),'The key rests on the real scanned rock');
 // Find the spawn-connected walkable grid, using the same 28 cm body clearance.
 const valid=(x,z)=>[[0,0],[.28,0],[-.28,0],[0,.28],[0,-.28]].every(([dx,dz])=>travel.height(x+dx,z+dz)!==null);
 const seen=new Set(),queue=[{x:Math.round((nav.spawn.x-nav.origin[0])/nav.cell),z:Math.round((nav.spawn.z-nav.origin[1])/nav.cell)}],reachable=[];
 for(let head=0;head<queue.length;head++){const p=queue[head],key=p.x+':'+p.z;if(seen.has(key))continue;seen.add(key);const x=nav.origin[0]+p.x*nav.cell,z=nav.origin[1]+p.z*nav.cell;if(!valid(x,z))continue;reachable.push({x,z});for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx,z:p.z+dz});}
 for(const target of [placement.key,placement.chest])assert.ok(reachable.some(p=>Math.hypot(p.x-target.x,p.z-target.z)<1.7&&(target!==placement.chest||(p.x-target.x)*Math.sin(placement.yaw)+(p.z-target.z)*Math.cos(placement.yaw)>.4)),'The key and chest front must be reachable from spawn with body clearance');
 assert.equal(travel.height(placement.chest.x,placement.chest.z),null,'The box blocks walking');if(id==='summer'||id==='autumn')assert.ok(groundHeight(id,placement.chest.x,placement.chest.z)>(id==='summer'?0:-.08),'Boxes remain on dry land');
 const viewAt=(point,away=1.2)=>{const candidate=reachable.filter(p=>Math.hypot(p.x-point.x,p.z-point.z)>away*.75&&Math.hypot(p.x-point.x,p.z-point.z)<away*1.2).sort((a,b)=>b.z-a.z)[0];assert.ok(candidate);camera.position.set(candidate.x,travel.height(candidate.x,candidate.z)+1.63,candidate.z);camera.lookAt(point.x,groundHeight(id,point.x,point.z)+.25,point.z);camera.updateMatrixWorld();relic.update(0,0,camera);relic.group.updateMatrixWorld(true);};
 viewAt(placement.chest);assert.equal(relic.read(),false);assert.match(relic.interact(camera),/locked/);assert.equal(relic.status(camera).hasBook,false);
 viewAt(placement.key);assert.equal(relic.interact(camera,new THREE.Raycaster(camera.position,new THREE.Vector3(0,1,0)),true),null,'A tap outside the key cannot pick it up');
 const keyRest=relic.key.position.clone();assert.match(relic.interact(camera),/found.*key/);assert.ok(relic.status(camera).hasKey);relic.update(1/60,0,camera);
 assert.ok(relic.key.position.distanceTo(keyRest)<.05,'The key lifts from the rock without snapping to the view');
 for(let i=0;i<40;i++)relic.update(1/60,i/60,camera);
 const keyHeld=relic.key.position.clone(),keyQ=relic.key.quaternion.clone();camera.rotateX(.55);relic.update(1/60,1,camera);
 assert.ok(relic.key.position.distanceTo(keyHeld)<.005&&relic.key.quaternion.angleTo(keyQ)<.005,'Looking up/down leaves the carried key at the visitor’s side');
 const placementHelper=createScenePickup(id,layout,[],[relic.chest,relic.keyStone]);
 assert.match(relic.drop(camera,(object,view)=>placementHelper.placement(object,view)),/put down.*key/);for(let i=0;i<30;i++)relic.update(1/60,1,camera);
 assert.equal(relic.status(camera).hasKey,false,'A dropped key is no longer shown in the hand inventory');
 const droppedKey=relic.key.position.clone();relic.update(1/60,1,camera);assert.ok(relic.key.position.distanceTo(droppedKey)<1e-6,'A dropped key stays at its landing point');
 viewAt(droppedKey);assert.match(relic.interact(camera),/Picked up.*key/);assert.ok(relic.status(camera).hasKey,'A dropped key can be picked up again');
 viewAt(placement.chest);assert.match(relic.interact(camera),/key turns/);for(let i=0;i<150;i++)relic.update(1/60,i/60,camera);assert.match(relic.interact(camera),/take the book/);for(let i=0;i<70;i++)relic.update(1/60,i/60,camera);
 assert.ok(relic.status(camera).hasBook);assert.ok(relic.book.position.distanceTo(camera.position)<1.1,'A carried book follows the visitor');
 assert.ok(new THREE.Box3().setFromObject(relic.book).getSize(new THREE.Vector3()).length()<.55,'The carried book has a real pocket-book scale');
 const carried=relic.book.position.clone(),carriedQ=relic.book.quaternion.clone();camera.rotateX(.6);relic.update(1/60,2,camera);
 assert.ok(relic.book.position.distanceTo(carried)<.005&&relic.book.quaternion.angleTo(carriedQ)<.005,'Looking up/down cannot pin the carried book to the screen');
 const previousOffset=relic.book.position.clone().sub(camera.position);camera.position.x+=.10;relic.update(1/60,2+1/60,camera);
 assert.ok(relic.book.position.clone().sub(camera.position).distanceTo(previousOffset)>.02,'Walking produces bounded carry lag');
 for(let i=0;i<120;i++)relic.update(1/60,3+i/60,camera);const settled=relic.book.position.clone();
 for(let i=0;i<120;i++)relic.update(1/60,5+i/60,camera);
 assert.ok(relic.book.position.distanceTo(settled)<.001,'A standing visitor does not have a floating idle book');
 assert.ok(relic.read());for(let i=0;i<190;i++)relic.update(1/60,i/60,camera);assert.ok(relic.readerReady);relic.close();for(let i=0;i<60;i++)relic.update(1/60,i/60,camera);assert.equal(relic.busy,false);
 assert.match(relic.drop(camera,(object,view)=>placementHelper.placement(object,view)),/put down.*book/);for(let i=0;i<30;i++)relic.update(1/60,1,camera);assert.equal(relic.status(camera).hasBook,false);assert.equal(relic.read(),false,'A book on the ground must be picked up before reading');
 const droppedBook=relic.book.position.clone();viewAt(droppedBook);assert.match(relic.interact(camera),/Picked up.*book/);assert.ok(relic.status(camera).hasBook);
 let meshes=0,triangles=0;relic.group.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});
 assert.ok(meshes<30,'Book decorations and chest details have a bounded draw count');assert.ok(triangles<30000,'The treasure arrangement has bounded geometry');
 relic.dispose();console.log(`${id}: chest/key routes, real 3D book, unlock/take/carry/read/close; ${meshes} meshes, ${triangles} source triangles`);
}
cover.dispose();stoneGeometry.dispose();surfaces.stone.material.map.dispose();surfaces.stone.material.dispose();surfaces.wood.dispose();surfaces.cloth.dispose();surfaces.paper.dispose();
console.log('Season books passed: 4 independent inventories; persistence and corrupt/blocked storage; 30/60/120 Hz and reduced motion; sequential Spring pages and 25 blank pages per unfinished season.');
