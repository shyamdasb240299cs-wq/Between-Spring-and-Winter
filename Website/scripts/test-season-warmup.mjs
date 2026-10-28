import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compileVisibleSeason,withSeasonPropsVisible} from '../app/shrine-void/season-warmup.ts';

const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
const outside=new THREE.Group(),bus=new THREE.Group(),forest=new THREE.Group();
scene.add(outside,bus,forest);bus.visible=forest.visible=false;
const ground=new THREE.Mesh(),carried=new THREE.Group(),hiddenProp=new THREE.Mesh();
outside.add(ground,carried,hiddenProp);hiddenProp.visible=false;
const busLamp=new THREE.PointLight();bus.add(busLamp);
const originalScene=[...scene.children],originalOutside=[...outside.children];
function restored(){
  assert.deepEqual(scene.children,originalScene);
  assert.deepEqual(outside.children,originalOutside);
  assert.equal(bus.parent,scene);assert.equal(forest.parent,scene);
  assert.equal(hiddenProp.parent,outside);assert.equal(busLamp.parent,bus);
  assert.equal(bus.visible,false);assert.equal(hiddenProp.visible,false);
}
let calls=0;
await compileVisibleSeason({async compileAsync(actual,view){
  calls++;assert.equal(actual,scene);assert.equal(view,camera);
  const visited=[];actual.traverse(object=>visited.push(object));
  assert.ok(visited.includes(ground));assert.ok(visited.includes(carried));
  assert.ok(!visited.includes(hiddenProp));assert.ok(!visited.includes(busLamp));
  await Promise.resolve();
}},scene,camera);
restored();assert.equal(calls,1);
await assert.rejects(compileVisibleSeason({async compileAsync(){throw new Error('Compilation cancelled');}},scene,camera),/cancelled/);
restored();
// Entering the bus must compile its own lamp configuration and keep the
// outdoor graph intact for the return journey.
outside.visible=false;bus.visible=true;
await compileVisibleSeason({async compileAsync(actual){
  const visited=[];actual.traverse(object=>visited.push(object));
  assert.ok(visited.includes(busLamp));assert.ok(!visited.includes(ground));
}},scene,camera);
assert.deepEqual(scene.children,originalScene);assert.deepEqual(outside.children,originalOutside);
assert.equal(bus.visible,true);assert.equal(outside.visible,false);
const hiddenLight=new THREE.PointLight();hiddenLight.visible=false;carried.add(hiddenLight);carried.visible=false;
await withSeasonPropsVisible([outside],async()=>{
  assert.ok(outside.visible&&carried.visible&&hiddenProp.visible,'Future held props and their parents participate in preparation');
  assert.equal(hiddenLight.visible,false,'Preparing pickups cannot enable extra global lights');
  await compileVisibleSeason({async compileAsync(actual){assert.equal(actual.getObjectById(hiddenProp.id),hiddenProp);assert.equal(actual.getObjectById(hiddenLight.id),undefined);}},scene,camera);
});
assert.equal(outside.visible,false);assert.equal(carried.visible,false);assert.equal(hiddenProp.visible,false);assert.equal(hiddenLight.visible,false);
await assert.rejects(withSeasonPropsVisible([outside],async()=>{throw new Error('Preparation cancelled');}),/cancelled/);
assert.equal(outside.visible,false);assert.equal(carried.visible,false);assert.equal(hiddenProp.visible,false);
console.log('Season warm-up passed: active light configuration only, exact hierarchy/order restored on success and failure, reversible bus entry.');
