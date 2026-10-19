import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {createCoastalPlants}=await import('../app/shrine-void/season-coastal-plants.ts');
const {createSeasonLayout,groundHeight}=await import('../app/shrine-void/season-layout.ts');
const {coastalArrangement}=await import('../app/shrine-void/season-coastal-arrangement.ts');
const source=new THREE.Group(),geometry=new THREE.PlaneGeometry(.2,1,1,2);geometry.translate(0,.5,0);
source.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));
const layout=createSeasonLayout('summer'),plants=createCoastalPlants(layout,source);
assert.equal(plants.children.length,1,'All small tufts share one draw');
let rooted=0;const positions=plants.children[0].geometry.attributes.position;
for(let i=0;i<positions.count;i++){
 const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),soil=groundHeight('summer',x,z),h=y-soil;
 assert.ok(h>=-.02501&&h<=.20501,'The tuft bases conform to the slope and the tips stay short');
 if(h<-.024)rooted++;
 assert.ok(layout.trees.some(t=>Math.hypot(t.x-x,t.z-z)<.65),'Every tuft stays in a compact palm-root cluster');
}
assert.ok(rooted>=16,'Several actual grass bases must be embedded in the sand');
const details=coastalArrangement(layout);
for(const kind of ['coastal-shrub','shell','rock','coral'])assert.ok(details.some(p=>p.kind===kind),'Coastal arrangement includes '+kind);
for(const p of details){assert.ok(groundHeight('summer',p.x,p.z)>=.16);assert.ok(Math.abs(p.x)>=1.5,'The central walking route remains open');assert.ok(Math.hypot(p.x-layout.prop.x,p.z-layout.prop.z)>=2.1,'Keep the seating arrangement clear');assert.ok(p.size<=.68&&p.bury>0,'Small, embedded shoreline details');}
assert.ok(details.length<=45,'Small clusters stay within the foreground object budget');
plants.children[0].geometry.dispose();plants.children[0].material.dispose();geometry.dispose();source.children[0].material.dispose();
console.log('Coastal plants passed: embedded roots on sloped sand, short blades, compact clusters and one batched draw.');
