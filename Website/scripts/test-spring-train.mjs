import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import * as THREE from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const {createSpringNorthTrain,SPRING_NORTH_RAIL}=await import('../app/shrine-void/spring-north-train.ts');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read('public/seasons/kit/spring-train/indian-coach.glb');
const root=new THREE.Group(),nodes=new Map(),materials=new Map();
for(const n of doc.getRoot().listNodes()){const o=new THREE.Group();o.name=n.getName();o.matrix.fromArray(n.getMatrix());o.matrix.decompose(o.position,o.quaternion,o.scale);nodes.set(n,o);for(const p of n.getMesh()?.listPrimitives()??[]){const g=new THREE.BufferGeometry();for(const [sem,name]of [['POSITION','position'],['NORMAL','normal'],['TANGENT','tangent'],['TEXCOORD_0','uv'],['TEXCOORD_1','uv1'],['COLOR_0','color']]){const a=p.getAttribute(sem);if(a)g.setAttribute(name,new THREE.BufferAttribute(a.getArray(),a.getElementSize()));}const i=p.getIndices();if(i)g.setIndex(new THREE.BufferAttribute(i.getArray(),1));const source=p.getMaterial();let m=materials.get(source);if(!m){m=new THREE.MeshStandardMaterial();m.name=source?.getName()??'';materials.set(source,m);}o.add(new THREE.Mesh(g,m));}}
for(const n of doc.getRoot().listNodes())for(const c of n.listChildren())nodes.get(n).add(nodes.get(c));
for(const n of doc.getRoot().listScenes()[0].listChildren())root.add(nodes.get(n));
const terrain=(x,z)=>5+Math.sin(x*.03)*.2+(-z-60)*.035,train=createSpringNorthTrain(root,terrain,false),r=SPRING_NORTH_RAIL;
assert.equal(train.doors.filter(d=>d.kind==='entry').length,4,'All four original side doors work');
assert.equal(train.doors.filter(d=>d.kind==='vestibule').length,2,'Both vestibule doors slide');
assert.ok(train.doors.filter(d=>d.kind==='toilet').length>=4,'Every supplied washroom door works');
assert.equal(train.group.getObjectByName('Imported ICF sleeper coach').children[0].name,root.name);
const entries=train.doors.filter(d=>d.kind==='entry'),entrance=entries.find(d=>d.side===1&&d.closed.getCenter(new THREE.Vector3()).z>r.trainZ);
assert.ok(entrance,'Steps align with the southern east door');
const center=entrance.closed.getCenter(new THREE.Vector3());
assert.ok(Math.abs(center.z-train.entrancePosition.z)<.05,'Entrance steps align with imported opening');
assert.ok(train.blockedAt(center.x,center.z),'Closed door physically blocks passage');
const camera=new THREE.PerspectiveCamera(60,1,.1,200);camera.position.set(center.x+1.5,train.floorY+.8,center.z);camera.lookAt(center);camera.updateMatrixWorld(true);
const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(),camera);
assert.equal(train.target(camera,ray)?.id,entrance.id,'Actual model side door can be reached and selected');
assert.ok(train.interact(entrance.id));for(let i=0;i<100;i++)train.update(i/60,1/60,camera,1);
assert.ok(entrance.open>.99);assert.ok(Math.abs(entrance.pivot.rotation.y)>1.5);
assert.equal(train.blockedAt(center.x,center.z),false,'An open side door clears its actual doorway');
assert.equal(train.interact(entrance.id,center),false,'An occupied doorway cannot close on the visitor');
assert.equal(train.update(2,0,camera,1),false,'Paused doors do not request another shadow render');
// The real steps, rather than a bridge/ramp, reach each of the four entrances.
assert.ok(train.group.getObjectByName('Normal coach entrance steps'));
for(const door of entries){
  const c=door.closed.getCenter(new THREE.Vector3());if(!door.wanted)train.interact(door.id);
  for(let i=0;i<120;i++)train.update(i/60,1/60,camera,1);
  for(let out=3.3;out>=1.45;out-=.035){const x=r.x+door.side*out,y=train.walkingHeight(x,c.z);assert.ok(y!==null);assert.equal(train.blockedAt(x,c.z),false,`Steps/doorway blocked at ${x},${c.z}`);}
}
for(let z=r.trainZ+6.25;z>=r.trainZ-6.25;z-=.05){assert.equal(train.blockedAt(r.x-.56,z),false,`Actual furnished aisle blocked at ${z}`);assert.equal(train.walkingHeight(r.x-.56,z),train.floorY);}
// The railway bed's navigation height follows exactly its rendered grade and remains traversable.
for(let z=r.startZ;z>=r.endZ;z-=.1){assert.ok(Number.isFinite(train.railHeight(z)));assert.ok(Math.abs(train.railHeight(z)-train.railHeight(z-.1))<.10);}
assert.equal(train.walkingHeight(100,0),null);
let meshCount=0,triangles=0,invalid=0;train.group.traverse(o=>{if(o.isMesh){meshCount++;triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;for(const n of o.geometry.getAttribute('position').array)if(!Number.isFinite(n))invalid++;}});
assert.equal(invalid,0);assert.ok(meshCount<80,`Static model materials should share draw calls: ${meshCount}`);assert.ok(triangles<100000);
const upholsteryBatches=[];train.group.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&/Seats/.test(o.material.name))upholsteryBatches.push(o);});
assert.ok(upholsteryBatches.some(o=>!!o.geometry.getAttribute('tangent')),'Imported upholstered berths retain their normal-map tangents after batching');
assert.ok(upholsteryBatches.some(o=>!o.geometry.getAttribute('tangent')),'Procedural side-lower berths survive separately when their attributes differ');
// Inspect the actual batched tread vertices, not a duplicate of placement code.
// Each downward wheel normal at its axle centre must meet the rail running top.
for(const bogieZ of [-7.7,7.7])for(const axleZ of [-.92,.92])for(const side of [-1,1]){
  const x=r.x+side*.88,z=r.trainZ+bogieZ+axleZ,tread=[];
  train.group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.getAttribute('position'),n=o.geometry.getAttribute('normal');if(!n)return;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-x)<.08&&Math.abs(p.getZ(i)-z)<.001&&n.getY(i)<-.999)tread.push(p.getY(i));});
  assert.ok(tread.length>=2,'Rendered wheel has a bottom tread on each side of its axle');
  assert.ok(Math.abs(Math.min(...tread)-(train.railHeight(z)+.3275))<.001,'Wheel tread meets its actual rail running surface');
}
let globalLights=0;train.group.traverse(o=>{if(o.isPointLight)globalLights++;});assert.equal(globalLights,0,'Cabin lamps do not add lighting cost to every forest material');
const seat=[...new Set([...materials.values()])].find(m=>/Seats/.test(m.name)),seatBefore=seat.color.clone();
const cleanMaterial=[];train.group.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&/Seats/.test(o.material.name))cleanMaterial.push(o.material);});
const shader={uniforms:{},fragmentShader:'#include <map_fragment>\n#include <lights_fragment_begin>'};cleanMaterial[0].onBeforeCompile(shader,{});
assert.match(shader.fragmentShader,/patchA/);assert.match(shader.fragmentShader,/patchB/);assert.match(shader.fragmentShader,/patchC/);assert.match(shader.fragmentShader,/diffuse\*cleanSeat/);assert.ok(shader.uniforms.coachLampPosition);assert.ok(seat.color.equals(seatBefore),'Source upholstery remains untouched');
const sourceGeometry=root.children[0].getObjectByName('Train_Prefab__1__Variant_Outside_0').children[0].geometry;
assert.equal(sourceGeometry.getAttribute('color'),undefined,'Repaint does not alter cached source geometry');
const {createSeasonLayout,groundHeight}=await import('../app/shrine-void/season-layout.ts');
const {createSeasonTravel}=await import('../app/shrine-void/season-navigation.ts');
const actual=createSpringNorthTrain(root,(x,z)=>groundHeight('spring',x,z),false),walking=createSeasonTravel(createSeasonLayout('spring').navigation,(x,z)=>actual.blockedAt(x,z));walking.setSurface(actual.walkingHeight,true);
Object.assign(walking.state,{x:13.5,z:-28,y:walking.height(13.5,-28)+1.63});
function walkTo(x,z){const p=walking.state;let frames=0;while(Math.hypot(x-p.x,z-p.z)>.055&&frames++<2000){const prior=[p.x,p.z];p.yaw=Math.atan2(-(x-p.x),-(z-p.z));walking.key('w',true);walking.update(1/60);camera.position.set(p.x,p.y,p.z);actual.update(frames/60,1/60,camera,1);if(frames%100===0)assert.ok(Math.hypot(p.x-prior[0],p.z-prior[1])>.001,`Player stuck approaching ${x},${z} at ${p.x},${p.z},floor=${p.y-1.63}`);}walking.key('w',false);walking.resetInput();assert.ok(frames<2000,`Walking route failed towards ${x},${z}`);}
for(const [x,z]of [[12,-38],[12,-58.5],[17.5,-58.5],[17.5,-68.14],[15.7,-68.14]])walkTo(x,z);
const actualEntry=actual.doors.find(d=>d.kind==='entry'&&d.side===1&&d.closed.getCenter(new THREE.Vector3()).z>r.trainZ);assert.ok(actual.interact(actualEntry.id));for(let i=0;i<100;i++)actual.update(i/60,1/60,camera,1);
for(const [x,z]of [[12,-68.14],[11.44,-68.14],[11.44,-82.2]])walkTo(x,z);
assert.ok(actual.inside(walking.state.x,walking.state.z));
// Walk back down the same normal steps with the real body-radius controller.
for(const [x,z]of [[11.44,-68.14],[12,-68.14],[15.7,-68.14],[17.5,-68.14]])walkTo(x,z);
assert.equal(actual.inside(walking.state.x,walking.state.z),false);
for(const door of actual.doors.filter(d=>d.kind==='entry')){
  if(!door.wanted)actual.interact(door.id);for(let i=0;i<120;i++)actual.update(i/60,1/60,camera,1);
  const c=door.closed.getCenter(new THREE.Vector3()),x=r.x+door.side*3.6;
  Object.assign(walking.state,{x,z:c.z,y:walking.height(x,c.z)+1.63});walking.resetInput();
  walkTo(r.x+door.side*1.2,c.z);walkTo(x,c.z);
}
actual.dispose();walking.dispose();
train.dispose();assert.equal(train.group.children.length,0);
console.log(`Train passed: ${train.doors.length} animated doors, all four normal entrances, complete step boarding/descent, eight grounded wheels, clean upholstery, scoped lighting, ${meshCount} meshes, ${Math.round(triangles)} triangles, source isolation.`);
