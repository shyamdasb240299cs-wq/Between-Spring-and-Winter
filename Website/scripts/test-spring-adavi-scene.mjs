import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';

registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.'))return next(specifier+'.ts',context);throw error;}}});
const {createSpringAdaviGame,ADAVI_THROW_WINDUP}=await import('../app/shrine-void/spring-adavi-game.ts');
const {createSpringBackpack}=await import('../app/shrine-void/spring-backpack.ts');
const {createSpringTreasureState}=await import('../app/shrine-void/spring-treasure-state.ts');
const {ADAVI_STONES,simulateSkip,sampleSkip}=await import('../app/shrine-void/spring-adavi-physics.ts');
const {ADAVI_ORIGIN,ADAVI_WATER_LEVEL,adaviGround}=await import('../app/shrine-void/spring-adavi-environment.ts');

await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const kit=JSON.parse(await readFile('public/seasons/kit/catalog.json','utf8'));
const urls={
  'river-rock':kit.models['woodland-rock'].variants[0].lods.far.url,
  'river-pebble':kit.models['loose-rock'].variants[0].lods.far.url,
  rock:kit.models.rock.variants[0].lods.far.url,
  'mushroom-toy':'/seasons/kit/spring-personal/mushroom-toy.glb',
  candle:'/seasons/kit/spring-personal/candle.glb',
};
const models=Object.fromEntries(await Promise.all(Object.entries(urls).map(async([key,url])=>{
  const document=await io.read('public'+url),root=new THREE.Group();root.name='Actual imported GLB · '+key;
  for(const node of document.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
    const geometry=new THREE.BufferGeometry();
    for(const [semantic,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const accessor=primitive.getAttribute(semantic);if(accessor)geometry.setAttribute(name,new THREE.BufferAttribute(accessor.getArray(),accessor.getElementSize()));}
    const index=primitive.getIndices();if(index)geometry.setIndex(new THREE.BufferAttribute(index.getArray(),1));
    geometry.applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
    root.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));
  }
  assert.ok(root.children.length,key+' contains imported mesh primitives');return [key,root];
})));

const sourceGeometries=new Set(),sourceMaterials=new Set();let sourceDisposals=0;
for(const model of Object.values(models))model.traverse(object=>{if(!(object instanceof THREE.Mesh))return;sourceGeometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])sourceMaterials.add(material);});
for(const resource of [...sourceGeometries,...sourceMaterials])resource.addEventListener('dispose',()=>sourceDisposals++);
const texture=new THREE.Texture();texture.addEventListener('dispose',()=>sourceDisposals++);
const scene=new THREE.Scene(),forest=new THREE.Group();forest.position.x=ADAVI_ORIGIN;scene.add(forest);
const view=createSpringAdaviGame(models,texture,texture,false);forest.add(view.group);
const backpack=createSpringBackpack(models,texture,texture,false,p=>adaviGround(p.x-ADAVI_ORIGIN,p.z));scene.add(backpack.group);
const controller=createSpringTreasureState({getItem:()=>JSON.stringify({version:3,doorUnlocked:true,introStep:2}),setItem(){}},undefined,()=>.000001);
const camera=new THREE.PerspectiveCamera(58,16/9,.1,240),ray=new THREE.Raycaster();
let elapsed=0;
const update=(dt=1/60)=>{elapsed+=dt;view.update(dt,controller.state,camera,controller);backpack.update(dt,controller.state,camera,'adavi');scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);};
const pose=(x,z,lookX=x,lookZ=z-1,lookY=ADAVI_WATER_LEVEL)=>{
  camera.position.set(ADAVI_ORIGIN+x,adaviGround(x,z)+1.63,z);camera.lookAt(ADAVI_ORIGIN+lookX,lookY,lookZ);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(),camera);
};
const target=()=>{camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(),camera);return backpack.target(camera,ray,controller.state,'adavi')??view.target(camera,ray,controller.state);};
const actions=[];
// These are the same scene-backed guards used by season-world. In particular,
// an early/fabricated result cannot skip the animated throw or reveal the bag.
controller.setGuard((action,value)=>{
  actions.push({action,value});
  if(action==='pick-stone')return view.canPick(value,camera);
  if(action==='take-bag')return backpack.ready&&backpack.near(camera,controller.state,'adavi');
  if(action==='finish-throw'){const result=view.result;return view.readyToFinish&&!!result&&value?.success===result.success&&value?.skips===result.skips&&value?.distance===result.distance;}
  return true;
});

assert.ok(controller.act('enter-adavi'));
const flat=ADAVI_STONES.find(stone=>stone.id==='slate-skipper'),round=ADAVI_STONES.find(stone=>stone.id==='river-egg');
pose(flat.position.x,flat.position.z+1,flat.position.x,flat.position.z,adaviGround(flat.position.x,flat.position.z)+.03);update();
assert.equal(target(),null,'Dialogue gates physical stone selection');
for(let n=0;n<4;n++)assert.ok(controller.act('adavi-intro-next'));
assert.equal(view.stats().pickupStones,ADAVI_STONES.length);

for(const stone of ADAVI_STONES){
  const object=view.group.getObjectByName('Pickup stone · '+stone.name);assert.ok(object);
  const size=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  assert.ok(size.x>.10&&size.x<.6&&size.y>.02&&size.y<.4,stone.name+' has a plausible physical pickup size');
  const ratio=size.y/Math.max(size.x,size.z);
  if(stone.shape==='flat')assert.ok(ratio<.32,stone.name+' has a visibly broad, thin face');
  if(stone.shape==='round')assert.ok(ratio>.50,stone.name+' has a visibly rounded silhouette');
  let actual=false;object.traverse(child=>{if(child instanceof THREE.Mesh&&sourceGeometries.has(child.geometry))actual=true;});assert.ok(actual,stone.name+' uses imported 3D rock geometry');
}
pose(flat.position.x-12,flat.position.z,flat.position.x,flat.position.z);update();
assert.equal(view.canPick(flat.id,camera),false);assert.equal(controller.act('pick-stone',flat.id),false,'Distant stones cannot be picked through an action call');assert.equal(target(),null);

function pick(stone){
  pose(stone.position.x,stone.position.z+1.0,stone.position.x,stone.position.z,adaviGround(stone.position.x,stone.position.z)+.03);update();
  assert.equal(target()?.payload,stone.id,'The looked-at shore stone is selected by the physical ray');
  assert.ok(controller.act('pick-stone',stone.id));update();assert.equal(target(),null);
  assert.equal(view.group.getObjectByName('Pickup stone · '+stone.name).visible,false);
  assert.ok(view.group.getObjectByName('Held Adavi skipping stone').visible);
}
function throwStone(stone){
  assert.ok(controller.act('aim-stone'));for(let n=0;n<45;n++)update();
  const expected=simulateSkip(stone,{power:controller.state.skipPower,angle:controller.state.skipAngle,aim:controller.state.skipAim,seed:controller.state.skipSeed});
  const returnDoorBounds=new THREE.Box3(new THREE.Vector3(ADAVI_ORIGIN-7.95,adaviGround(-7,12),11.9),new THREE.Vector3(ADAVI_ORIGIN-6.05,adaviGround(-7,12)+2.75,12.1));
  for(const point of expected.samples){const destination=new THREE.Vector3(point.x+ADAVI_ORIGIN,point.y,point.z),direction=destination.clone().sub(camera.position).normalize(),hit=new THREE.Ray(camera.position,direction).intersectBox(returnDoorBounds,new THREE.Vector3());assert.ok(!hit||camera.position.distanceTo(hit)>camera.position.distanceTo(destination),'The return door cannot obscure the release, any skip or the landing');}
  const defaultAspect=camera.aspect,defaultAim=controller.state.skipAim;
  for(const aspect of [390/844,4/3,16/9,2.1])for(const aim of [-25,0,25]){
    camera.aspect=aspect;camera.updateProjectionMatrix();assert.ok(controller.act('set-skip-aim',aim));
    for(let n=0;n<90;n++)update();
    const assertInFrame=(point,label,limitX=.98,limitY=.9)=>{const screen=point.clone().project(camera);assert.ok(Math.abs(screen.x)<limitX&&Math.abs(screen.y)<limitY&&screen.z>-1&&screen.z<1,`${label} remains in frame at aspect ${aspect.toFixed(3)} and aim ${aim}°: ${screen.toArray()}`);};
    const suspended=view.group.getObjectByName('Held Adavi skipping stone');assert.ok(suspended.visible);
    suspended.traverse(object=>{if(!(object instanceof THREE.Mesh))return;const positions=object.geometry.attributes.position;for(let i=0;i<positions.count;i++)assertInFrame(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld),'The whole suspended stone',1,1);});
    const prediction=simulateSkip(stone,{power:controller.state.skipPower,angle:controller.state.skipAngle,aim,seed:controller.state.skipSeed});
    for(const point of prediction.samples)assertInFrame(new THREE.Vector3(point.x+ADAVI_ORIGIN,point.y,point.z),'The full predicted stone trajectory');
  }
  camera.aspect=defaultAspect;camera.updateProjectionMatrix();assert.ok(controller.act('set-skip-aim',defaultAim));for(let n=0;n<90;n++)update();
  const guide=view.group.getObjectByName('Parabolic stone trajectory guide');assert.ok(guide.visible);assert.ok(guide.geometry.attributes.position.count>20);
  const positions=guide.geometry.attributes.position,last=positions.count-1;
  assert.ok(Math.abs(positions.getX(last)-expected.end.x)<1e-5&&Math.abs(positions.getZ(last)-expected.end.z)<1e-5,'Guide endpoint matches the analytic throw');
  assert.equal(controller.act('finish-throw',{success:true,skips:4,distance:20,feedback:'forged'}),false);
  const observer=camera.position.clone(),heldStone=view.group.getObjectByName('Held Adavi skipping stone');assert.ok(heldStone.visible,'The stone stays suspended in first-person view while aiming');assert.equal(view.group.getObjectByName('First-person stone throwing hand'),undefined,'Holding and throwing use an invisible hand');
  assert.ok(controller.act('throw-stone'));const actionStart=actions.length;let frames=0,sawContact=false;
  while(controller.state.skipPhase==='flying'&&frames<1200){
    update();frames++;const trajectory=view.result,clock=-ADAVI_THROW_WINDUP+frames/60;
    assert.ok(camera.position.distanceTo(observer)<1e-6,'Flight tracks the stone by turning the head, without moving to a spectator viewpoint');
    if(clock>=0&&clock<=trajectory.duration){const exact=sampleSkip(trajectory,clock),held=view.group.getObjectByName('Held Adavi skipping stone');assert.ok(held.position.distanceTo(new THREE.Vector3(exact.x,exact.y,exact.z))<1e-6,'Rendered stone follows the predicted parabola');}
    for(const object of view.group.children){if(!object.visible||!object.children.some(child=>child instanceof THREE.Points&&child.geometry.attributes.position.count===24))continue;sawContact=true;assert.ok(trajectory.impacts.some(impact=>Math.abs(object.position.x-impact.x)<1e-7&&Math.abs(object.position.z-impact.z)<1e-7),'Splash starts at an actual trajectory/water contact');assert.equal(object.position.y,ADAVI_WATER_LEVEL+.018);}
  }
  assert.ok(frames<1200,'Animated throw reaches its controller result');assert.ok(sawContact);assert.equal(controller.state.skipPhase,'result');
  assert.equal(controller.state.skipResult.success,expected.success);assert.equal(controller.state.skipResult.skips,expected.skips);
  assert.deepEqual(actions.slice(actionStart).filter(entry=>entry.action==='skip-contact').map(entry=>entry.value),expected.impacts.map(impact=>impact.skip),'Each water contact reaches the controller once and in order');
  return expected;
}

pick(round);const failure=throwStone(round);assert.equal(failure.success,false);assert.equal(controller.state.stoneChallengeComplete,false);assert.ok(controller.act('retry-stone'));update();
pick(flat);const success=throwStone(flat);assert.equal(success.success,true);assert.ok(success.skips>=4);assert.equal(controller.state.stoneChallengeComplete,true);
assert.equal(controller.act('reveal-bag'),false,'Protagonist dialogue must complete before the reward appears');
for(let n=0;n<2;n++)assert.ok(controller.act('adavi-win-next'));
assert.ok(controller.act('reveal-bag'));update(0);
const bag=backpack.bag;assert.ok(bag.visible);assert.ok(bag.scale.x<.01);assert.equal(backpack.ready,false);assert.equal(controller.act('take-bag'),false,'Bag cannot be taken during its reveal');
for(let n=0;n<90;n++)update();assert.ok(backpack.ready);assert.equal(bag.scale.x,1);
const bagBounds=new THREE.Box3().setFromObject(bag),floor=adaviGround(-7.5,8);assert.ok(bagBounds.min.y>=floor-.01&&bagBounds.min.y<floor+.10,'Revealed 3D bag rests at the ground');
const contents=bag.getObjectByName('Backpack contents');assert.ok(contents);
for(const key of ['mushroom-toy','candle']){const originals=new Set();models[key].traverse(object=>{if(object instanceof THREE.Mesh)originals.add(object.geometry);});let actual=false;contents.traverse(object=>{if(object instanceof THREE.Mesh&&originals.has(object.geometry))actual=true;});assert.ok(actual,'Bag visibly contains actual imported '+key+' geometry');}
pose(-15,8,-7.5,8);update();assert.equal(controller.act('take-bag'),false,'Reward bag requires physical proximity');
pose(-7.5,9.4,-7.5,8,floor+.45);update();assert.equal(target()?.id,'backpack');assert.ok(controller.act('take-bag'));update();assert.ok(bag.visible);assert.deepEqual(controller.state.hands,['backpack','backpack']);
assert.ok(controller.act('open-bag'));for(const item of ['mushroom-toy','candle','note'])assert.ok(controller.act('take-bag-item',item));
assert.ok(controller.act('close-bag-note'));assert.equal(controller.act('stow-bag'),false,'The backpack never enters a storage slot');
const droppedPack={world:'adavi',x:ADAVI_ORIGIN-7.5,z:8,yaw:.55};assert.ok(controller.act('put-bag',droppedPack));update();
assert.deepEqual(controller.state.bagPlacement,droppedPack);assert.equal(controller.state.bagHeld,false);assert.ok(bag.visible,'The physical backpack remains on the shore after being put down');assert.equal(controller.state.storageSlots.includes('backpack'),false);
const recovered=createSpringTreasureState({getItem:()=>JSON.stringify(controller.state),setItem(){}});assert.deepEqual(recovered.state.bagPlacement,droppedPack,'A reload keeps the grounded backpack in its world');
assert.ok(controller.act('exit-adavi'));backpack.update(1/60,controller.state,camera,'spring');assert.equal(bag.visible,false,'A grounded Adavi backpack does not duplicate itself in Spring');assert.ok(controller.act('visit-bridge'));

const owned=new Set();for(const root of [view.group,backpack.group])root.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line){if(!sourceGeometries.has(object.geometry))owned.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(!sourceMaterials.has(material))owned.add(material);}});
const disposalCounts=new Map();for(const resource of owned)resource.addEventListener('dispose',()=>disposalCounts.set(resource,(disposalCounts.get(resource)??0)+1));
view.dispose();backpack.dispose();assert.equal(view.group.parent,null);assert.equal(view.group.children.length,0);assert.equal(sourceDisposals,0,'Scene cleanup never disposes shared imported geometry, materials or textures');for(const resource of owned)assert.equal(disposalCounts.get(resource),1,'Each live owned GPU resource is disposed once');
console.log(JSON.stringify({pickupStones:ADAVI_STONES.length,roundedStoneSkips:failure.skips,flatStoneSkips:success.skips,flatStoneDistance:Math.round(success.distance*100)/100,simulatedSeconds:Math.round(elapsed*100)/100,importedModels:Object.keys(models)},null,2));
console.log('Adavi scene passed: actual GLB stone shapes, physical reach and targeting, portrait/landscape framing across the full aim range, guide/throw agreement, exact animated arcs, ordered water contacts, guarded results, ground-level magical bag, imported contents, pickup gates, return milestones and owned-resource cleanup. CPU checks do not measure rendered image quality or GPU FPS.');
