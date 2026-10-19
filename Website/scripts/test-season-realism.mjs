import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {createLakeFish,fishJumpAt}=await import('../app/shrine-void/season-fish.ts');
const {createBeachFurniture}=await import('../app/shrine-void/season-beach-furniture.ts');
const {createSeasonLayout,groundHeight,AUTUMN_LAKE_LEVEL,BEACH_SEATING}=await import('../app/shrine-void/season-layout.ts');
const {createSeasonTravel}=await import('../app/shrine-void/season-navigation.ts');
const {createGroundMotion}=await import('../app/shrine-void/season-ground-motion.ts');

let ripples=0,airFrames=0;const fish=createLakeFish(false,false,()=>{ripples++;return true;});
const start=fish.states.map(v=>v.clone());
for(let i=0;i<60*180;i++){
 const t=i/60;fish.update(t);let airborne=0;
 for(const state of fish.states){assert.ok(state.z>groundHeight('autumn',state.x,state.y)+.1,'Fish remain above the lake bed');if(state.z>AUTUMN_LAKE_LEVEL)airborne++;assert.ok(Number.isFinite(state.x+state.y+state.z));}
 assert.ok(airborne<=1,'A single fish jumps at a time');if(airborne)airFrames++;
}
assert.ok(fish.jumps>=5&&fish.jumps<=8,'Jumps stay occasional across three minutes');assert.equal(ripples,fish.jumps*2,'Every jump adds takeoff and landing ripples');assert.ok(airFrames<60*180*.06,'The lake is calm for most of the visit');
assert.ok(fish.states.some((s,i)=>Math.hypot(s.x-start[i].x,s.y-start[i].y)>1),'Fish actually swim');
const still=createLakeFish(true,true,()=>{throw Error('Reduced motion must not splash');});const frozen=still.states.map(s=>s.clone());still.update(45);assert.deepEqual(still.states,frozen);assert.equal(still.jumps,0);
assert.equal(fishJumpAt(5).active,false,'No immediate fish jump on entry');fish.dispose();still.dispose();

const layout=createSeasonLayout('summer'),chair=createBeachFurniture(layout.prop.x,layout.prop.z),travel=createSeasonTravel(layout.navigation);
assert.ok(chair.children.length<=7,'Detailed furniture stays within seven batched draws');
let triangles=0;
chair.traverse(o=>{if(o instanceof THREE.Mesh){assert.ok(o.castShadow&&o.receiveShadow);const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));triangles+=(o.geometry.index?.count??p.count)/3;}});
assert.ok(triangles<20000,'Furniture geometry stays bounded');
for(const d of [-.68,0,.68])assert.equal(travel.height(layout.prop.x+BEACH_SEATING.chairX+Math.sin(BEACH_SEATING.yaw)*d,layout.prop.z+BEACH_SEATING.chairZ+Math.cos(BEACH_SEATING.yaw)*d),null,'The entire long chair blocks walking');
const bounds=new THREE.Box3().setFromObject(chair);assert.ok(bounds.max.y>3.5&&bounds.max.x-bounds.min.x>=3.8,'The parasol has a full-sized canopy and headroom');
chair.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});
const motion=createGroundMotion(),camera=new THREE.PerspectiveCamera();camera.position.set(0,1.6,0);for(let i=0;i<10000;i++){camera.position.x=i*.01;motion.update(i/60,camera,true);}motion.disturb(0,0,170);
// The contact effect must compose with the scanned meadow's existing wind shader.
const grassMaterial=new THREE.MeshStandardMaterial();
grassMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat phase=instanceMatrix[3].x*.8+instanceMatrix[3].z*.6;transformed.x+=sin(phase)*.01;');};
motion.apply(grassMaterial,'grass');
const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};grassMaterial.onBeforeCompile(shader,{});
assert.equal((shader.vertexShader.match(/float phase\s*=/g)||[]).length,1,'The contact shader must not redeclare the pre-existing wind phase');
assert.ok(shader.vertexShader.includes('float contactPhase='));assert.ok(shader.vertexShader.includes('groundContacts[4]'),'Walking uses a bounded shared pool');grassMaterial.dispose();
console.log(`Season realism passed: swimming, rare single-fish jumps, landing ripples, reduced motion, full lounger collision and grounded finite furniture (${triangles} triangles).`);
