import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {createSeasonCrystalJourney,SEASON_CRYSTALS,SEASON_CRYSTAL_MOUNT:mount}=await import('../app/shrine-void/season-crystal-journey.ts');
const {createSeasonCrystals}=await import('../app/shrine-void/season-crystals.ts');
const {createMemoryMonumentGeometry}=await import('../app/shrine-void/memory-monument.ts');
const {createTravelController}=await import('../app/shrine-void/travel.ts');
const {FIRST_MEMORY}=await import('../app/shrine-void/awakening.ts');
const manifest=JSON.parse(await fs.readFile(new URL('../public/void/manifest.json',import.meta.url),'utf8'));
for(const reduced of [false,true])for(const hz of [30,60,120]){
 const gate=createSeasonCrystalJourney(reduced);
 for(const index of [1,2,3,4,6,8,19]){
  const stop=FIRST_MEMORY+index*18,expected=manifest.photos[index%manifest.photos.length].season;
  gate.contact(stop-2.5,0,0,FIRST_MEMORY,manifest.photos,false);assert.equal(gate.take(),null,'The arrival ritual must finish first');
  gate.contact(stop-7,0,0,FIRST_MEMORY,manifest.photos,true);assert.equal(gate.take(),null,'A distant cover cannot teleport the visitor');
  gate.contact(stop+2,0,Math.PI,FIRST_MEMORY,manifest.photos,true);assert.equal(gate.take(),null,'The back of a pillar cannot activate its crystal');
  gate.contact(stop-2.5,0,Math.PI,FIRST_MEMORY,manifest.photos,true);assert.equal(gate.take(),null,'Face the crystal to pick it up');
  gate.contact(stop-2.5,0,0,FIRST_MEMORY,manifest.photos,true);assert.equal(gate.take(),expected);assert.equal(gate.take(),null,'Repeated key presses must not start multiple loads');
  let lastGlow=0,lastFlight=0,frames=0;const stages=new Set();
  while(!gate.pose().ready&&frames++<hz*5){gate.advance(1/hz);const p=gate.pose();assert.ok(p.glow>=lastGlow&&p.flight>=lastFlight,'Flight and light progress continuously');lastGlow=p.glow;lastFlight=p.flight;stages.add(p.stage);}
  assert.ok(gate.pose().ready);assert.ok(frames/hz<=(reduced?1.3:3.65));assert.equal(gate.pose().envelop,1);assert.equal(gate.pose().flight,1);assert.equal(stages.size,4);
  gate.reset();assert.equal(gate.pose().active,false);assert.equal(gate.pose().glow,0);assert.equal(gate.pose().season,null,'Return and failed loading restore the mounted crystal');
 }
 gate.contact(FIRST_MEMORY-2,0,0,FIRST_MEMORY,manifest.photos,true);assert.equal(gate.take(),null,'The main manga cover remains a photo');
}
assert.equal(new Set(Object.values(SEASON_CRYSTALS).map(v=>v.colour)).size,4);

// Exercise the actual supplied GLB: mounting, extraction and recycling use its real geometry.
const buffer=await fs.readFile(new URL('../public/void/models/crystal.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');gltf.scene.updateMatrixWorld(true);
const parts=[];gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh)parts.push({name:o.name,geometry:o.geometry.clone().applyMatrix4(o.matrixWorld),material:o.material});});
const crystals=createSeasonCrystals({crystal:parts,manifest});crystals.place(0,0,FIRST_MEMORY);
const camera=new THREE.PerspectiveCamera(55,16/9,.15,135);camera.position.set(0,1.63,-43.5);camera.updateMatrixWorld();
const gate=createSeasonCrystalJourney();gate.contact(43.5,0,0,FIRST_MEMORY,manifest.photos,true);
crystals.update(0,camera,gate.pose(),gate.candidate,1);
const originalGems=crystals.group.children.filter(o=>o.name==='Embedded season crystal');const pink=originalGems[1];
assert.equal(pink.visible,true);assert.ok(Math.abs(pink.position.z-(-46+mount.z))<.001);
const gemBounds=new THREE.Box3().setFromObject(pink);assert.ok(gemBounds.max.y<1.25&&gemBounds.min.y>.69,'The gem fits below the cover and above the base stones');
assert.ok(gemBounds.min.z<-46&&gemBounds.max.z<-45.65,'The back of the gem sits inside the pillar; only its front facets protrude');
const pillarGeometry=createMemoryMonumentGeometry(),pillarMaterial=new THREE.MeshBasicMaterial(),pillar=new THREE.Mesh(pillarGeometry,pillarMaterial);pillar.position.z=-46;pillar.updateMatrixWorld(true);
for(const [x,y]of [[0,.96],[.15,.96],[-.15,.96],[0,.73],[0,1.19]]){
 const wallRay=new THREE.Raycaster(new THREE.Vector3(x,y,-43.5),new THREE.Vector3(0,0,-1));
 assert.ok(wallRay.intersectObject(pillar)[0].point.z<-45.95,'The masonry has a real central aperture, without a stone band in front of the socket');
}
const shoulderRay=new THREE.Raycaster(new THREE.Vector3(.42,1.03,-43.5),new THREE.Vector3(0,0,-1));
assert.ok(shoulderRay.intersectObject(pillar)[0].point.z>-45.80,'The surrounding shoulder stones retain their depth');
const plainGeometry=createMemoryMonumentGeometry(false),plainPillar=new THREE.Mesh(plainGeometry,pillarMaterial);plainPillar.updateMatrixWorld(true);
const plainRay=new THREE.Raycaster(new THREE.Vector3(0,1.03,3),new THREE.Vector3(0,0,-1));
assert.ok(plainRay.intersectObject(plainPillar)[0].point.z>.20,'The original main-cover monument retains a solid band');
const ray=new THREE.Raycaster(camera.position,pink.position.clone().sub(camera.position).normalize());crystals.group.updateMatrixWorld(true);assert.ok(crystals.hit(ray,1),'Tapping the actual gem can activate it');
ray.set(camera.position,new THREE.Vector3(1,0,0));assert.equal(crystals.hit(ray,1),false,'Tapping the surrounding canvas cannot pick up the crystal');
gate.take();for(let i=0;i<120;i++){gate.advance(1/60);crystals.update(i/60,camera,gate.pose(),null,1);}
assert.ok(pink.position.distanceTo(camera.position)<1.3,'The crystal visibly floats within reach');assert.ok(pink.material.emissiveIntensity>2,'The extracted crystal illuminates the passage');
gate.reset();crystals.update(3,camera,gate.pose(),null,1);assert.ok(Math.abs(pink.position.z-(-46+mount.z))<.001,'Cancelled or completed passages re-seat the crystal');
crystals.place(6,144,FIRST_MEMORY);assert.equal(originalGems[0].visible,true);assert.equal(originalGems[4].visible,false,'Recycling preserves the five-cover sequence');
crystals.dispose();parts.forEach(p=>p.geometry.dispose());pillarGeometry.dispose();plainGeometry.dispose();pillarMaterial.dispose();

const walk=createTravelController(5,FIRST_MEMORY);walk.state.distance=43;walk.update(0);const saved={...walk.state};walk.block(true);walk.key('w',true);walk.update(.05);assert.equal(walk.state.distance,saved.distance);walk.block(false);walk.update(.05);assert.equal(walk.state.distance,saved.distance,'Returning from a season must not resume held movement');
console.log('Season crystals passed: four colours, proximity/facing, repeated monuments, original GLB mount and tap target, flight, glow, reduced motion, cancellation/reset and return position at 30/60/120 Hz.');
