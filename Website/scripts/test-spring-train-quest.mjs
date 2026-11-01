import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import * as THREE from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const {createSpringNorthTrain}=await import('../app/shrine-void/spring-north-train.ts');
const {createSpringTrainQuest,SPRING_TRAIN_BERTHS}=await import('../app/shrine-void/spring-train-quest.ts');
const {createSpringTreasureState}=await import('../app/shrine-void/spring-treasure-state.ts');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
async function readModel(path){
  const doc=await io.read(path),root=new THREE.Group(),nodes=new Map(),materials=new Map();
  for(const n of doc.getRoot().listNodes()){
    const o=new THREE.Group();o.name=THREE.PropertyBinding.sanitizeNodeName(n.getName());o.matrix.fromArray(n.getMatrix());o.matrix.decompose(o.position,o.quaternion,o.scale);nodes.set(n,o);
    for(const p of n.getMesh()?.listPrimitives()??[]){const g=new THREE.BufferGeometry();for(const [sem,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=p.getAttribute(sem);if(a)g.setAttribute(name,new THREE.BufferAttribute(a.getArray(),a.getElementSize()));}const i=p.getIndices();if(i)g.setIndex(new THREE.BufferAttribute(i.getArray(),1));const source=p.getMaterial();let m=materials.get(source);if(!m){m=new THREE.MeshStandardMaterial();m.name=source?.getName()??'';materials.set(source,m);}o.add(new THREE.Mesh(g,m));}
  }
  for(const n of doc.getRoot().listNodes())for(const c of n.listChildren())nodes.get(n).add(nodes.get(c));
  for(const n of doc.getRoot().listScenes()[0].listChildren())root.add(nodes.get(n));return root;
}
const [coachModel,caseModel]=await Promise.all([readModel('public/seasons/kit/spring-train/indian-coach.glb'),readModel('public/seasons/kit/summer/keepsake-case.glb')]);
const train=createSpringNorthTrain(coachModel,()=>0),fresh=createSpringTreasureState().snapshot(),state={...fresh,dreamReturned:true},actions=[];
const controller={snapshot:()=>state,act(action,value){actions.push([action,value]);if(action==='reveal-train-mirror')state.trainMirrorRevealed=true;return true;}};
const quest=createSpringTrainQuest(train,caseModel,controller),scene=new THREE.Scene();scene.add(train.group,quest.group);scene.updateMatrixWorld(true);
assert.equal(SPRING_TRAIN_BERTHS.length,72);assert.deepEqual(SPRING_TRAIN_BERTHS.map(b=>b.number),Array.from({length:72},(_,i)=>i+1));
assert.equal(SPRING_TRAIN_BERTHS[22].type,'side-lower');assert.equal(SPRING_TRAIN_BERTHS[23].type,'side-upper');assert.equal(SPRING_TRAIN_BERTHS[71].type,'side-upper');
assert.ok(quest.lid,'Browser-sanitized GLB hinge remains independently animated');assert.ok(quest.suitcase.getObjectByName('Carry_handle'));
assert.equal(quest.suitcase.getObjectByName('Blue_Summer_book'),undefined,'The imported Summer reward is removed');
assert.equal(quest.suitcase.getObjectByName('Dry_letter'),undefined,'Only the Spring letter remains');
const plates=quest.group.getObjectByName('Berth plates with upper repeats').geometry;
assert.equal(plates.getAttribute('position').count,99*24,'72 berth labels plus 27 repeated upper labels');
for(let bay=0;bay<9;bay++){
 const p=plates.getAttribute('position'),centre=i=>{const v=new THREE.Vector3();for(let n=0;n<24;n++)v.add(new THREE.Vector3().fromBufferAttribute(p,(bay*11+i)*24+n));return v.divideScalar(24);};
 for(const start of [0,4]){
  assert.ok(Math.abs(centre(start).y-centre(start+2).y)<.0001,'Three daytime labels share the row above the backrest');
  assert.ok(centre(start).x>centre(start+1).x&&centre(start+1).x>centre(start+2).x,'Numbering runs from the window toward the aisle');
  assert.ok(centre(start+3).y>centre(start+2).y+.6,'Upper berth repeats its own label beside the sleeping surface');
 }
 assert.ok(Math.abs(centre(8).y-centre(9).y)<.0001,'Facing side seats have matching label heights');
 assert.ok(centre(9).z-centre(8).z>2,'Side-seat labels occupy opposite partitions');
 assert.ok(centre(10).y>centre(9).y+.45,'The higher side number repeats at the upper berth');
}
for(const name of ['Berth plates with upper repeats','Four red coach number plates','Combination wheel 1','Letter beneath the suitcase lid']){
  const m=quest.group.getObjectByName(name).material,shader={uniforms:{},fragmentShader:'#include <lights_fragment_begin>'};
  m.onBeforeCompile(shader,{});assert.ok(shader.uniforms.coachLampPosition,`${name} shares the real coach lighting at night`);
}
assert.equal(quest.suitcase.getObjectByName('Blue Summer book'),undefined,'Summer contents are replaced');
assert.ok(Math.abs(quest.casePosition.z-(SPRING_TRAIN_BERTHS[22].z-1.16))<.001);
assert.equal(quest.casePosition.y,train.floorY+.49,'Suitcase bottom stands on the real .43m side-lower cushion plus .055m half thickness');
assert.ok(train.blockedAt(quest.casePosition.x,quest.casePosition.z),'Case rests on furniture outside the walking aisle');
assert.equal(train.blockedAt(11.44,quest.casePosition.z),false,'Suitcase leaves the actual aisle clear');
const camera=new THREE.PerspectiveCamera(60,1,.05,200),ray=new THREE.Raycaster();
function aim(from,to){camera.position.copy(from);camera.lookAt(to);camera.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(),camera);}
quest.update(0,1/60,camera,state);assert.equal(quest.numbers.visible,false);
for(const hands of [['mushroom-toy',null],[null,'mushroom-toy']]){state.hands=hands;quest.update(1,1/60,camera,state);assert.equal(quest.numbers.visible,true);}
state.hands=[null,null];quest.update(2,1/60,camera,state);assert.equal(quest.numbers.visible,false,'Stowing mushroom blanks every number again');
const notePoint=new THREE.Box3().setFromObject(quest.note).getCenter(new THREE.Vector3());
aim(notePoint.clone().add(new THREE.Vector3(.8,0,0)),notePoint);assert.equal(quest.target(camera,ray,state)?.action,'read-train-note');
aim(notePoint.clone().add(new THREE.Vector3(3,0,0)),notePoint);assert.equal(quest.target(camera,ray,state),null,'Cannot read from beyond physical reach');
aim(new THREE.Vector3(12.03,train.floorY+1.45,quest.basinPoint.z+.90),quest.basinPoint);assert.equal(quest.target(camera,ray,state)?.action,'wash-hands','Imported wash area is reachable from the vestibule');
state.handsWashed=true;quest.update(3,1/60,camera,state);assert.equal(actions.length,0,'Washing alone does not reveal the door clue');
assert.ok(quest.washDoor);quest.washDoor.open=.5;quest.update(4,1/60,camera,state);assert.equal(actions[0][0],'reveal-train-mirror');
for(let i=0;i<120;i++)quest.update(4+i/60,1/60,camera,state);assert.ok(quest.mist.material.opacity>.8,'Condensation fades in after the door opens');
const casePoint=quest.casePosition.clone().add(new THREE.Vector3(0,.18,0));
aim(new THREE.Vector3(11.44,train.floorY+1.35,quest.casePosition.z),casePoint);assert.equal(quest.target(camera,ray,state)?.action,'open-train-case');
const walkingPosition=camera.position.clone(),walkingZoom=camera.zoom;
state.trainCaseOpen=true;
for(const [width,height] of [[1366,768],[844,390],[390,844],[320,568]]){
  camera.aspect=width/height;camera.updateProjectionMatrix();quest.focusLock(camera,state);
  const screen=quest.wheelFaces.map(face=>face.getWorldPosition(new THREE.Vector3()).project(camera));
  assert.ok(screen.every(p=>Math.abs(p.x)<.95&&Math.abs(p.y)<.8&&p.z>0&&p.z<1),'Every physical wheel remains inside the viewport at '+width+'×'+height);
  for(let i=1;i<screen.length;i++)assert.ok((screen[i].x-screen[i-1].x)*width/2>35,'Separate wheel controls retain usable spacing');
  const clasp=quest.clasp.getWorldPosition(new THREE.Vector3()).project(camera);assert.ok(clasp.x<.95&&clasp.x>screen.at(-1).x,'The real clasp has its own reachable area');
  assert.ok(quest.canAct('turn-train-wheel',camera,state),'Close inspection retains the physical reach guard');
}
state.trainCaseOpen=false;quest.focusLock(camera,state);assert.equal(camera.zoom,walkingZoom,'Stepping back restores the walking projection');
camera.aspect=1;camera.updateProjectionMatrix();aim(walkingPosition,casePoint);
state.trainLockOpen=true;state.trainLockWheels=[0,1,1,9,6];for(let i=0;i<180;i++)quest.update(6+i/60,1/60,camera,state);
assert.ok(quest.lid.rotation.x<-1.7);assert.deepEqual(quest.wheels.map(w=>w.userData.symbol),['S','1','1','9','6']);
assert.equal(quest.key.visible,true);assert.equal(quest.letter.visible,true);
scene.updateMatrixWorld(true);const keyPoint=new THREE.Box3().setFromObject(quest.key).getCenter(new THREE.Vector3());
aim(new THREE.Vector3(11.44,train.floorY+1.35,quest.casePosition.z),keyPoint);assert.equal(quest.target(camera,ray,state)?.action,'take-treasure-key');
state.treasureKeyTaken=true;quest.update(10,1/60,camera,state);assert.equal(quest.key.visible,false);
const letterPoint=new THREE.Box3().setFromObject(quest.letter).getCenter(new THREE.Vector3());aim(camera.position,letterPoint);assert.equal(quest.target(camera,ray,state)?.action,'read-train-letter');
let bad=0,meshes=0;quest.group.traverse(o=>{if(!o.isMesh)return;meshes++;for(const value of o.geometry.getAttribute('position').array)if(!Number.isFinite(value))bad++;});assert.equal(bad,0);assert.ok(meshes<65,`Small puzzle uses bounded geometry: ${meshes}`);
quest.dispose();assert.equal(quest.group.children.length,0);assert.equal(quest.note.parent,null);assert.ok(caseModel.getObjectByName('Blue_Summer_book'),'Cached asset remains unchanged');train.dispose();
console.log(`Train quest passed: 72 correctly mapped berths, either-hand mushroom reveal, real hinged suitcase, reachable note/basin/key/letter, washed-door mirror gate, five rotating wheels, ${meshes} bounded meshes, isolated cached assets and cleanup.`);
