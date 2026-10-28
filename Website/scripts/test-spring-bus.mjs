/** Geometry and interaction regression checks. Run: node scripts/test-spring-bus.mjs */
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
// A deterministic canvas stub keeps this test independent from a browser/GPU.
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient(){return gradient},createRadialGradient(){return gradient}}, {get(t,p){return p in t?t[p]:()=>{}},set(t,p,v){t[p]=v;return true;}});
globalThis.document={createElement(name){assert.equal(name,'canvas');return {width:0,height:0,getContext(){return context;}};}};
const {createSpringKsrtcBus,SPRING_BUS_WIDTH_SCALE}=await import('../app/shrine-void/spring-ksrtc-bus.ts');
const bus=createSpringKsrtcBus(),scene=new THREE.Scene();scene.add(bus.group);
assert.equal(bus.skyTexture.mapping,THREE.EquirectangularReflectionMapping,'The bus sky is an infinite panorama, independent of camera clipping');
assert.equal(bus.group.getObjectByName('Photographic sunny sky and real clouds'),undefined,'No finite sky dome can leave a circular clipping boundary');
const {springWakingPose,SPRING_WAKE_MS}=await import('../app/shrine-void/spring-waking.ts');
for(let t=0;t<=SPRING_WAKE_MS/1000;t+=.01){const pose=springWakingPose(t);assert.ok(Math.abs(pose.pitch)<.06&&Math.abs(pose.yaw)<.04&&Math.abs(pose.roll)<.01);assert.deepEqual(springWakingPose(t,true),{pitch:0,yaw:0,roll:0});}
for(const value of Object.values(springWakingPose(SPRING_WAKE_MS/1000)))assert.equal(Math.abs(value),0,'Wake-up hands control back without a camera jump');
assert.equal(bus.seatCount,53,'Classic 2+3 arrangement, rear door omissions and rear bench total 53');
assert.ok(bus.roadsideStats.buildings>=28&&bus.roadsideStats.shops>=12,'A complete street has varied homes and furnished shop fronts');
assert.ok(bus.roadsideStats.gates>=12&&bus.roadsideStats.signs>=5,'Private yards have entrances and distinct village businesses');
assert.deepEqual(bus.group.position.toArray(),[400,0,0]);
assert.equal(bus.group.visible,false,'Bus stays hidden until the dream transition');
assert.equal(bus.floorHeight(400,0),.15);assert.equal(bus.floorHeight(300,0),null);assert.equal(bus.floorHeight(400,6),null);
// Raycast the batched geometry, so a covered stairwell or full-width rear
// glazing cannot pass merely because the interaction coordinates look right.
scene.updateMatrixWorld(true);
const geometryRay=new THREE.Raycaster();
const cabinRay=(x,y,z,direction,distance)=>{
  const origin=bus.cabin.localToWorld(new THREE.Vector3(x,y,z));
  geometryRay.set(origin,new THREE.Vector3(...direction).transformDirection(bus.cabin.matrixWorld));
  geometryRay.far=distance;
  return geometryRay.intersectObject(bus.cabin,true);
};
const opaque=hit=>!hit.object.material.transparent;
assert.equal(cabinRay(0,1.72,6,[0,0,-1],.65).filter(opaque).length,0,'The small rear aperture remains open through the body');
assert.ok(cabinRay(0,1.72,6,[0,0,-1],.65).some(hit=>hit.object.material.transparent),'Rear aperture contains its actual glass pane');
for(const [x,y] of [[-.95,1.72],[.95,1.72],[0,1.25],[0,2.025]])assert.ok(cabinRay(x,y,6,[0,0,-1],.65).some(opaque),'Solid rear body surrounds all four sides of the small window');
for(const z of [-4.04,2.40])for(const x of [-1.18,-1.02,-.89]){
  const rendered=cabinRay(x,.30,z,[0,-1,0],.7).find(opaque);assert.ok(rendered,'Every entrance tread has physical geometry');
  const y=bus.cabin.worldToLocal(rendered.point.clone()).y;
  assert.ok(Math.abs(y-bus.floorHeight(400+x*SPRING_BUS_WIDTH_SCALE,z))<.002,`Entrance tread and walking surface differ at ${x},${z}: ${y}`);
}
assert.ok(bus.seatPosition.x>398.7&&bus.seatPosition.x<399.5);assert.ok(bus.seatPosition.z< -2.5&&bus.seatPosition.y<1.5);
// The whole aisle is continuous, including the rear entrance vestibule.
for(let z=-3.30;z<=4.4;z+=.025){const p=new THREE.Vector3((400-.235*SPRING_BUS_WIDTH_SCALE),1.78,z);bus.constrainPosition(p);assert.ok(Math.abs(p.x-(400-.235*SPRING_BUS_WIDTH_SCALE))<1e-8&&Math.abs(p.z-z)<1e-8,`Blocked aisle at z=${z}`);}
// Cushion collision, rather than just cabin boundary collision.
for(const x of [-1,-.575,.16,.585,1.01].map(x=>400+x*SPRING_BUS_WIDTH_SCALE)){const p=new THREE.Vector3(x,1.78,-1.38);bus.constrainPosition(p);assert.ok(Math.hypot(p.x-x,p.z+1.38)>.1,'Seat must push the walking position outside its cushion');}
for(const sample of [[300,100],[500,-100],[400,-90]]){const p=new THREE.Vector3(sample[0],1.78,sample[1]);bus.constrainPosition(p);assert.ok(p.x>=400-1.055*SPRING_BUS_WIDTH_SCALE&&p.x<=400+1.055*SPRING_BUS_WIDTH_SCALE&&p.z>=-3.37&&p.z<=4.43);assert.equal(p.y,1.78);}
const resources=new Set(),textureResources=new Set();let meshCount=0,triangleCount=0;
bus.group.traverse(o=>{if(!o.isMesh&&!o.isLineSegments)return;meshCount++;resources.add(o.geometry);const p=o.geometry.attributes.position;assert.ok(p&&p.count>0);for(const n of p.array)assert.ok(Number.isFinite(n),'All geometry coordinates must be finite');triangleCount+=(o.geometry.index?o.geometry.index.count:p.count)/3;for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)textureResources.add(v);}});
assert.ok(meshCount<450,`Material batching must keep the detailed bus below 450 mesh draws (${meshCount})`);
assert.ok(triangleCount<800000,'Detailed geometry should stay within the intended budget');
assert.equal(bus.closedShutterCount,4);assert.ok(bus.shutterCount>12);
assert.equal(bus.group.getObjectByName('Fine moving rainfall beyond the windows'),undefined,'The bus contains no rain');
const roadStrip=bus.group.getObjectByName('Kerala roadside strip 0'),beforeZ=roadStrip.position.z;
bus.group.visible=true;bus.update(.05,1);assert.notEqual(roadStrip.position.z,beforeZ);
scene.updateMatrixWorld(true);const roadsideWorld=roadStrip.getWorldPosition(new THREE.Vector3());
assert.equal(roadsideWorld.z,roadStrip.position.z,'Moving strips retain their animated world transforms');
const fitting=bus.cabin.children.find(o=>o.isMesh&&!o.matrixAutoUpdate);
assert.ok(fitting,'Fixed cabin fittings reuse their local matrices');
const beforeSway=fitting.matrixWorld.clone();bus.update(.05,2);scene.updateMatrixWorld(true);
assert.notDeepEqual(fitting.matrixWorld.elements,beforeSway.elements,'Fixed fittings still inherit the moving cabin');
const road=bus.group.getObjectByName('Dry sunlit two-lane Kerala road');
assert.ok(road.material.map.offset.y>0,'Asphalt top-face UVs decrease along +Z, so positive texture offset follows the moving roadside');
assert.equal(bus.cabin.parent,bus.group);assert.deepEqual(bus.seatPropPosition.toArray(),[.585,.639,-2.90+7*.76],'Keepsakes use the third three-person bench from the rear');
let globalCabinLamps=0;bus.group.traverse(o=>{if(o.isPointLight)globalCabinLamps++;});assert.equal(globalCabinLamps,0,'Cabin bulbs do not add shader work to roadside trees');
assert.equal(bus.group.getObjectByName('Hazy distant tree belt'),undefined,'No static scenery belt remains behind the moving strips');
for(const root of bus.group.children.find(o=>o.name==='Moving Kerala road · left-hand traffic').children){if(root.isInstancedMesh)assert.fail('Distant GLB trees must be attached to moving strips');}
const upright=new THREE.Vector3(400-.365*SPRING_BUS_WIDTH_SCALE,1.78,-1.43);bus.constrainPosition(upright);assert.ok(Math.hypot((upright.x-400)/SPRING_BUS_WIDTH_SCALE+.365,upright.z+1.43)>=.1229,'Walking resolves against actual handrail uprights');
const sun=bus.group.children.find(o=>o.isDirectionalLight);sun.shadow.needsUpdate=false;assert.equal(bus.update(1/60,1+1/60),true,'Moving scenery must refresh shadows every rendered frame');assert.equal(sun.shadow.needsUpdate,true);
const rearPair=new THREE.Vector3(400-.575*SPRING_BUS_WIDTH_SCALE,1.78,3.18);bus.constrainPosition(rearPair);assert.ok(Math.hypot(rearPair.x-(400-.575*SPRING_BUS_WIDTH_SCALE),rearPair.z-3.18)>.1,'First paired bench behind the rear door has physical collision');
// Both paired benches behind the narrow door collide, while its cross-aisle stays clear.
for(const z of [3.18,3.94])for(const x of [-1,-.575]){const p=new THREE.Vector3(400+x*SPRING_BUS_WIDTH_SCALE,1.78,z);bus.constrainPosition(p);assert.ok(Math.hypot(p.x-(400+x*SPRING_BUS_WIDTH_SCALE),p.z-z)>.1,'Both rear pairs have cushion collision');}
for(let x=-1.04;x<-.23;x+=.025){const p=new THREE.Vector3(400+x*SPRING_BUS_WIDTH_SCALE,1.78,2.40);bus.constrainPosition(p);assert.ok(Math.abs(p.x-(400+x*SPRING_BUS_WIDTH_SCALE))<1e-8&&Math.abs(p.z-2.40)<1e-8,'Rear door cross-aisle stays clear');}
assert.equal(bus.floorHeight(400-1.1*SPRING_BUS_WIDTH_SCALE,2.40),-.09,'Stairwell follows relocated door');
assert.equal(bus.floorHeight(400-1.1*SPRING_BUS_WIDTH_SCALE,4.04),.15,'Restored paired row has solid floor');
const afterZ=roadStrip.position.z;bus.group.visible=false;bus.update(1,2);assert.equal(roadStrip.position.z,afterZ);
let disposals=0;for(const resource of [...resources,...textureResources])resource.addEventListener('dispose',()=>disposals++);
bus.dispose();assert.equal(bus.group.children.length,0);assert.equal(bus.group.parent,null);assert.equal(disposals,resources.size+textureResources.size,'All visible GPU geometries, materials and textures are disposed');
console.log(`KSRTC bus checks passed: 53 seats, continuous aisle, cushion/boundary collisions, moving sunny road, four closed shutters, ${meshCount} meshes, ${Math.round(triangleCount)} triangles, ${disposals} resource disposals.`);
