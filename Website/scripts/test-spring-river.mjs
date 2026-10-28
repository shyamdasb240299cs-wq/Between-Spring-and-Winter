import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return n(s+'.ts',c);throw e;}}});
const {createSpringRiver}=await import('../app/shrine-void/spring-river.ts');
const {createSeasonLayout,groundHeight,springBridgeHeight}=await import('../app/shrine-void/season-layout.ts');
const {createSeasonTravel}=await import('../app/shrine-void/season-navigation.ts');
const {SPRING_BRIDGE,SPRING_LAKE_BENCH,SPRING_RIVER_REACH,springRiverCentre,springRiverWidth,springPondDistance}=await import('../app/shrine-void/spring-treasure-layout.ts');
const layout=createSeasonLayout('spring'),nav=layout.navigation,travel=createSeasonTravel(nav);
const bodyAt=(x,z)=>[[0,0],[.28,0],[-.28,0],[0,.28],[0,-.28]].every(([dx,dz])=>travel.height(x+dx,z+dz)!==null);
// Flood the real baked navigation surface, including body clearance on both banks.
const queue=[[Math.round((nav.spawn.x-nav.origin[0])/nav.cell),Math.round((nav.spawn.z-nav.origin[1])/nav.cell)]],seen=new Set(),reachable=[];
for(let head=0;head<queue.length;head++){const [ix,iz]=queue[head],key=ix+':'+iz;if(seen.has(key))continue;seen.add(key);const x=nav.origin[0]+ix*nav.cell,z=nav.origin[1]+iz*nav.cell;if(!bodyAt(x,z))continue;reachable.push({x,z});for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([ix+dx,iz+dz]);}
for(const [label,x,z]of [['west reeds',15.6,-8],['west roots',15,-23.6],['downstream bank',15.5,-1.8],['east driftwood',28,-19.5],['east stones',28.3,-7],['bridge note',17.3,-12],['resting bench',SPRING_LAKE_BENCH.x,SPRING_LAKE_BENCH.z]])assert.ok(reachable.some(p=>Math.hypot(p.x-x,p.z-z)<1.45),label+' has a connected interaction approach');
for(let z=-35;z<12;z+=.5){assert.ok(springRiverWidth(z)*2>8.9);assert.ok(groundHeight('spring',springRiverCentre(z),z)<-.35,'The long river has one submerged continuous bed');const y=travel.height(springRiverCentre(z),z);if(Math.abs(z-SPRING_BRIDGE.z)<.7)assert.ok(Math.abs(y-springBridgeHeight(springRiverCentre(z),z))<.002);else assert.equal(y,null);}
for(let z=SPRING_RIVER_REACH.minZ;z<=SPRING_RIVER_REACH.maxZ;z+=.5){
  const x=springRiverCentre(z),width=springRiverWidth(z);
  assert.ok(springPondDistance(x,z)<1e-10,'The channel never caps or dries at either end');
  assert.ok(groundHeight('spring',x,z)<-.35,'The extended route carves its real terrain');
  assert.ok(Math.abs(springPondDistance(x+width,z)-1)<1e-10,'Bank clipping follows the same curve');
  for(let across=-1.02;across<=1.02;across+=.04){
    const px=x+across*width,depth=Math.max(-.42,Math.min(.7,(1-springPondDistance(px,z))*1.8));
    assert.ok(Math.abs(depth-(.30-groundHeight('spring',px,z)))<1e-10,'Fast water depth matches the actual carved terrain across both banks and the full channel');
  }
}
for(const z of [-90,65])assert.ok(springRiverCentre(z)>60,'Both river reaches turn east out of the grove');
for(const z of [SPRING_RIVER_REACH.minZ,SPRING_RIVER_REACH.maxZ])for(const [x,viewZ] of [[0,0],[28,-20],[12,-104],[16,-67]])assert.ok(Math.hypot(springRiverCentre(z)-x,z-viewZ)>240,'No river endpoint lies within a playable camera far plane');
for(const hz of [30,60,120])for(const direction of [-1,1]){const start=SPRING_BRIDGE.x-direction*(SPRING_BRIDGE.halfLength+1),cross=createSeasonTravel({...nav,spawn:{x:start,z:SPRING_BRIDGE.z,yaw:direction>0?-Math.PI/2:Math.PI/2}});cross.key('w',true);for(let n=0;n<hz*5.4;n++)cross.update(1/hz);assert.ok(direction*(cross.state.x-SPRING_BRIDGE.x)>SPRING_BRIDGE.halfLength+.3,'The entire fourteen metre bridge connects dry banks at '+hz+' Hz');}
const texture=new THREE.Texture(),maps={color:texture,normal:texture,roughness:texture,sizeMetres:2},river=createSpringRiver({models:{},wood:texture,maps:{rock:maps,water:texture},height:(x,z)=>groundHeight('spring',x,z),mobile:false,reduced:false});
const scene=new THREE.Scene();scene.add(river.group);scene.updateMatrixWorld(true);
assert.ok(river.bridge.children.length<=9,'Hundreds of fixed timbers submit at most nine material/shadow batches');
const ray=new THREE.Raycaster();
for(let n=0;n<68;n+=3){const x=SPRING_BRIDGE.x-SPRING_BRIDGE.halfLength+(n+.5)*SPRING_BRIDGE.halfLength*2/68;ray.set(new THREE.Vector3(x,4,SPRING_BRIDGE.z),new THREE.Vector3(0,-1,0));const top=ray.intersectObject(river.bridge,true)[0];assert.ok(top);assert.ok(Math.abs(top.point.y-springBridgeHeight(x,SPRING_BRIDGE.z))<.012,'Rendered timber and navigation share the arch surface');}
const water=river.water,uniforms=water.material.uniforms;assert.equal(water.frustumCulled,true,'An off-screen river cannot render another full world reflection');river.update(12,.7);assert.equal(uniforms.time.value,12);assert.equal(uniforms.rain.value,.7);assert.match(water.material.fragmentShader,/depth=clamp\(\(1.-shore\)\*1.8,-.42,.7\)/,'The verified carved-basin formula controls shallows without evaluating unrelated terrain');assert.match(water.material.fragmentShader,/fresnel/);assert.match(water.material.fragmentShader,/caustic/);
let captures=0;const renderer={xr:{enabled:false},shadowMap:{autoUpdate:false},autoClear:true,getRenderTarget:()=>null,setRenderTarget(){},state:{buffers:{depth:{setMask(){}}}},render(){captures++;}};
const camera=new THREE.PerspectiveCamera(58,16/9,.1,240);camera.position.set(14,2,-17);camera.lookAt(22,.3,-17);camera.updateMatrixWorld(true);
const capture=()=>water.onBeforeRender(renderer,scene,camera,water.geometry,water.material,null);capture();capture();assert.equal(captures,1,'Stationary camera reuses the reflection');camera.position.x+=.01;camera.updateMatrixWorld(true);capture();assert.equal(captures,2,'Walking updates reflection immediately');camera.aspect=1;camera.updateProjectionMatrix();capture();assert.equal(captures,3,'Resize updates reflection immediately');
river.update(13,.2,.8);capture();assert.equal(captures,4,'Changing weather invalidates a stationary reflection');assert.equal(uniforms.night.value,.8);
camera.position.set(-30,2,0);camera.lookAt(-70,2,0);camera.updateMatrixWorld(true);capture();assert.equal(captures,4,'A long offscreen reach cannot force a hidden reflection capture');
water.geometry.computeBoundingBox();assert.ok(water.geometry.boundingBox.max.y-water.geometry.boundingBox.min.y>=400);assert.equal(river.stats().riverLength,400);
const reducedRiver=createSpringRiver({models:{},wood:texture,maps:{rock:maps,water:texture},height:(x,z)=>groundHeight('spring',x,z),mobile:true,reduced:true});reducedRiver.update(14,.8,.2);assert.equal(reducedRiver.water.material.uniforms.time.value,0);assert.equal(reducedRiver.water.material.uniforms.impactTime.value,14,'Reduced flow and real rain contacts keep a shared impact clock');reducedRiver.dispose();
assert.ok(springPondDistance(22,-12)<1);assert.equal(river.stats().bridgeLength,14.2);river.dispose();texture.dispose();
console.log('Spring river passed: continuous wide channel, connected five-piece search banks, resting bench, fourteen-metre bridge crossed at all refresh rates, matched render/navigation deck, flowing shallow-water shader and immediate camera/resize reflections.');
