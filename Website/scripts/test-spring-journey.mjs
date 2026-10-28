import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const gradient={addColorStop(){}};
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>(t[p]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
const {SPRING_NORTH,compassNeedleAngle,createSpringCompass,createSpringJourneyClues}=await import('../app/shrine-void/spring-compass.ts');
const {springNorthWeather,createSpringJourneySky}=await import('../app/shrine-void/spring-north-weather.ts');
const {createSpringKsrtcBus}=await import('../app/shrine-void/spring-ksrtc-bus.ts');
const {createSpringNorthTrain,SPRING_NORTH_RAIL}=await import('../app/shrine-void/spring-north-train.ts');
const {createSpringTreasureState}=await import('../app/shrine-void/spring-treasure-state.ts');
const {createSpringPreviewStorage}=await import('../app/shrine-void/spring-preview.ts');
const {createSpringRain}=await import('../app/shrine-void/spring-rain.ts');
const {createSeasonLayout,groundHeight}=await import('../app/shrine-void/season-layout.ts');
const {createSeasonTravel}=await import('../app/shrine-void/season-navigation.ts');
const {createSpringGlasses}=await import('../app/shrine-void/spring-glasses.ts');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const glassesAsset=await io.read(fileURLToPath(new URL('../public/seasons/kit/spring-personal/glasses.glb',import.meta.url)));
const glassPrimitives=glassesAsset.getRoot().listMeshes().flatMap(m=>m.listPrimitives());
assert.equal(glassPrimitives.reduce((n,p)=>n+p.getIndices().getCount()/3,0),75338,'Preparing materials retains every supplied triangle');
const acetate=glassPrimitives.find(p=>p.getIndices().getName()==='frame triangles').getMaterial();
assert.equal(glassPrimitives.find(p=>p.getIndices().getName()==='tips triangles').getMaterial(),acetate,'Arm ends use the exact frame material: no black rubber sections');
assert.equal(acetate.getAlphaMode(),'BLEND');assert.equal(acetate.getExtension('KHR_materials_clearcoat').getClearcoatFactor(),1);
assert.ok(glassesAsset.getRoot().listMaterials().every(m=>!/rubber|graphite/i.test(m.getName())));
for(const primitive of glassPrimitives){assert.ok(primitive.getAttribute('NORMAL'),'Original mesh has smooth normals');if(primitive.getMaterial()===acetate)assert.ok(primitive.getAttribute('TEXCOORD_0'),'Fine moulded-acetate roughness has UVs');}
const glassesModel=new THREE.Group();
for(const name of ['Uniform smoky transparent crystal acetate','Clear optical lenses']){const material=new THREE.MeshPhysicalMaterial({name}),mesh=new THREE.Mesh(new THREE.BoxGeometry(1.8,.6,1.5),material);glassesModel.add(mesh);}
const glasses=createSpringGlasses(glassesModel),optics=[];glasses.group.traverse(o=>{if(o instanceof THREE.Mesh)optics.push(o.material);});
assert.ok(optics.every(m=>m.clearcoat===1&&m.clearcoatRoughness<.06));
assert.ok(optics.find(m=>/lens/i.test(m.name)).transmission>.9,'Lens material uses optical transmission rather than opaque paint');
assert.ok(optics.find(m=>/acetate/i.test(m.name)).opacity<1);
assert.ok(Math.abs(new THREE.Box3().setFromObject(glasses.group).getSize(new THREE.Vector3()).x-.148)<1e-6,'Spectacles retain a realistic 148 mm frame width');
const compass=createSpringCompass(),parent=new THREE.Group();parent.add(compass.group);
for(let degrees=-360;degrees<=360;degrees+=5)for(const pitch of [-.65,0,.65]){
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,degrees*Math.PI/180,.12,'YXZ'));
  const angle=compassNeedleAngle(q),localNorth=SPRING_NORTH.clone().applyQuaternion(q.clone().invert());localNorth.y=0;localNorth.normalize();
  const tip=new THREE.Vector3(0,0,-1).applyAxisAngle(THREE.Object3D.DEFAULT_UP,angle);
  assert.ok(tip.dot(localNorth)>1-1e-10,`Red needle preserves magnetic north at ${degrees} degrees, pitch ${pitch}`);
  parent.quaternion.copy(q);for(let i=0;i<90;i++)compass.update(1/60);
  assert.ok(new THREE.Vector3(0,0,-1).applyAxisAngle(THREE.Object3D.DEFAULT_UP,compass.needle.rotation.y).dot(localNorth)>.999999);
}
parent.rotation.set(0,Math.PI-.01,0);for(let i=0;i<90;i++)compass.update(1/60);const before=compass.needle.rotation.y;
parent.rotation.y=-Math.PI+.01;compass.update(1/60);assert.ok(Math.abs(compass.needle.rotation.y-before)<.02,'The needle takes the short path across the angle seam');
const stopped=compass.needle.rotation.y;compass.update(0);assert.equal(compass.needle.rotation.y,stopped);
const railFixture=createSpringTreasureState(createSpringPreviewStorage('rail'));assert.ok(railFixture.state.dreamReturned&&railFixture.state.journeyNoteRead&&railFixture.state.compassTaken,'The disposable rail preview has the completed dream and recovered clue');assert.equal(railFixture.state.dreamPhase,'awake');assert.equal(railFixture.state.storageSlots.includes('backpack'),false);
const bus=createSpringKsrtcBus(),clues=createSpringJourneyClues(bus.cabin,bus.seatPropPosition,glassesModel),game=createSpringTreasureState(createSpringPreviewStorage('bus'));
const camera=new THREE.PerspectiveCamera(58,16/9,.1,240),ray=new THREE.Raycaster();camera.position.copy(bus.seatPosition);bus.group.visible=true;bus.group.updateMatrixWorld(true);
assert.equal(clues.near(camera),false,'Starting front seat cannot collect clues from the rear three-person bench');assert.ok(game.act('stand-bus'));camera.position.copy(bus.aislePosition);
const seatZ=bus.seatPropPosition.z;
for(let z=bus.aislePosition.z;z<=seatZ;z+=.06){const position=new THREE.Vector3(bus.aislePosition.x,1.78,z);bus.constrainPosition(position);assert.ok(Math.abs(position.z-z)<1e-6,'The bus aisle reaches the third rear three-person bench');}camera.position.set(bus.aislePosition.x,1.78,seatZ-.08);assert.ok(clues.near(camera),'All three props are within physical reach from the aisle beside the bench');
const paper=clues.group.getObjectByName('A letter on the bus seat'),seatCompass=clues.group.getObjectByName('Working brass magnetic compass'),seatGlasses=clues.group.getObjectByName('Smoky crystal spectacles');
for(const [prop,action] of [[paper,'read-journey-note'],[seatCompass,'take-compass'],[seatGlasses,'take-glasses']]){
  const position=prop.getWorldPosition(new THREE.Vector3());camera.lookAt(position);camera.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(),camera);
  assert.equal(clues.target(camera,ray,game.state)?.action,action,'Hidden rear bench prop can be selected from the walkable aisle');
  assert.ok(game.act(action));if(action==='read-journey-note')assert.ok(game.act('close-quest-note'));
  clues.update(1/60,camera,game.state,true);assert.equal(prop.visible,false);
}
assert.ok(game.act('hold-compass'));clues.update(1/60,camera,game.state,true);assert.ok(clues.held.visible);
const glassesSlot=game.state.storageSlots.indexOf('glasses');if(glassesSlot>=0)assert.ok(game.act('equip-storage',glassesSlot));else assert.ok(game.state.hands.includes('glasses'),'Full storage collects spectacles directly into a free hand');clues.update(1/60,camera,game.state,true);
assert.ok(game.state.hands.includes('compass')&&game.state.hands.includes('glasses'),'Both hand objects coexist');
const heldCompass=clues.held.getObjectByName('Working brass magnetic compass'),heldGlasses=clues.held.getObjectByName('Smoky crystal spectacles');
assert.equal(heldCompass.parent,clues.held);assert.equal(heldGlasses.parent,clues.held,'Each hand is independently positioned');
const cameraRight=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),leftHand=game.state.hands.indexOf('compass')===0?heldCompass:heldGlasses,rightHand=leftHand===heldCompass?heldGlasses:heldCompass;
assert.ok(rightHand.position.clone().sub(leftHand.position).dot(cameraRight)>.43,'Left and right held props remain separated at every camera angle');
camera.position.set(bus.aislePosition.x,1.78,seatZ+.5);camera.lookAt(paper.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(),camera);assert.equal(clues.target(camera,ray,{...game.state,journeyNoteRead:false}),null,'Cannot collect through a backrest from the row behind');
camera.position.copy(bus.seatPosition);assert.equal(clues.near(camera),false);assert.equal(clues.target(camera,ray,game.state),null);
assert.deepEqual(springNorthWeather(13,-17),{night:0,rain:1,cloud:1});assert.deepEqual(springNorthWeather(12,SPRING_NORTH_RAIL.trainZ),{night:1,rain:0,cloud:0});
let last={night:0,rain:1,cloud:1};for(let z=-17;z>=-80;z-=.05){const w=springNorthWeather(12,z);for(const n of Object.values(w))assert.ok(Number.isFinite(n)&&n>=0&&n<=1);assert.ok(w.night>=last.night&&w.rain<=last.rain&&w.cloud<=last.cloud);assert.ok(Math.abs(w.night-last.night)<.004&&Math.abs(w.rain-last.rain)<.004);assert.deepEqual(springNorthWeather(100,z),w,'East-west motion cannot flicker weather');last=w;}
const northSamples=Array.from({length:505},(_,i)=>({z:-17-i*.125,...springNorthWeather(12,-17-i*.125)}));for(const w of northSamples.reverse())assert.deepEqual(springNorthWeather(12,w.z),{night:w.night,rain:w.rain,cloud:w.cloud},'The return walk restores the same weather at every position');
const rain=createSpringRain(true);camera.position.set(13,1.8,-17);rain.update(0,camera,true,1);assert.ok(rain.group.visible&&rain.intensity===1);
rain.update(.1,camera,true,.35);assert.equal(rain.intensity,.35);assert.ok(rain.group.visible);rain.update(.2,camera,true,0);assert.equal(rain.group.visible,false);const wet=rain.wetness;assert.ok(wet>0);
for(let i=3;i<160;i++)rain.update(i*.1,camera,true,0);assert.ok(rain.wetness<wet,'Surface water dries gradually');rain.update(16,camera,true,1);assert.ok(rain.group.visible&&rain.intensity===1);
const sky=createSpringJourneySky();assert.equal(sky.mesh.material.depthTest,true,'Cloud noise is depth-rejected behind the coach');assert.ok(sky.mesh.renderOrder>0,'Sky draws after opaque furnishings');for(const p of [[13,2,-17],[12,5,-76],[-30,10,-100]]){camera.position.set(...p);sky.update(camera,12,.5,true);assert.deepEqual(sky.mesh.position.toArray(),p);assert.ok(sky.mesh.scale.x<camera.far&&sky.mesh.scale.x>camera.near);}
// Door and furnished-aisle collisions are covered separately by test-spring-train.
const train=createSpringNorthTrain(new THREE.Group(),(x,z)=>groundHeight('spring',x,z),true),travel=createSeasonTravel(createSeasonLayout('spring').navigation,(x,z)=>train.blockedAt(x,z));travel.setSurface(train.walkingHeight,true);
Object.assign(travel.state,{x:13.5,z:-19,y:travel.height(13.5,-19)+1.63,yaw:0});travel.key('w',true);for(let i=0;i<60*12;i++)travel.update(1/60);travel.resetInput();
assert.ok(travel.state.z< -55,'Following north from the lake reaches the railway');const atNorth=springNorthWeather(travel.state.x,travel.state.z);assert.ok(atNorth.rain<.12&&atNorth.night>.6);
travel.state.yaw=Math.PI;travel.key('w',true);for(let i=0;i<60*12;i++)travel.update(1/60);travel.resetInput();assert.ok(travel.state.z> -21&&travel.state.z< -16,'The route is walkable back to the lake');assert.deepEqual(springNorthWeather(travel.state.x,travel.state.z),{night:0,rain:1,cloud:1});
train.dispose();travel.dispose();sky.dispose();rain.dispose();clues.dispose();bus.dispose();compass.dispose();glasses.dispose();glassesModel.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});
console.log('Spring journey passed: compass at every yaw and tilted views, seamless needle, guarded seat props, reversible rain/night, gradual drying, camera-centred sky, lake-to-rail walking and return.');
