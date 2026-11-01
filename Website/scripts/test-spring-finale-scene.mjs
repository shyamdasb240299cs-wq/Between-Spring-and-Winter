import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const context=new Proxy({},{get:()=>()=>{},set:()=>true});globalThis.document={createElement:()=>({getContext:()=>context})};
const {createSpringFinaleWorld,SPRING_TREASURE_SPOT}=await import('../app/shrine-void/spring-finale-world.ts');
const {createSpringEnding}=await import('../app/shrine-void/spring-ending.ts');
const {createSpringTreasureState}=await import('../app/shrine-void/spring-treasure-state.ts');
const {createSpringPreviewStorage}=await import('../app/shrine-void/spring-preview.ts');
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
async function model(path){const doc=await io.read(path),material=new THREE.MeshStandardMaterial();function node(n){const root=new THREE.Group();root.name=n.getName();root.position.fromArray(n.getTranslation());root.quaternion.fromArray(n.getRotation());root.scale.fromArray(n.getScale());for(const p of n.getMesh()?.listPrimitives()??[]){const g=new THREE.BufferGeometry();for(const [semantic,key]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=p.getAttribute(semantic);if(a)g.setAttribute(key,new THREE.BufferAttribute(a.getArray(),a.getElementSize()));}if(p.getIndices())g.setIndex(new THREE.BufferAttribute(p.getIndices().getArray(),1));root.add(new THREE.Mesh(g,material));}for(const child of n.listChildren())root.add(node(child));return root;}const root=new THREE.Group();for(const n of doc.getRoot().listScenes()[0].listChildren())root.add(node(n));return root;}
const meal=await model('public/seasons/kit/spring-finale/dumplings.glb'),book=await model('public/manga/book-v3.glb');
assert.ok(book.getObjectByName('CoverHinge'),'The actual book exposes its opening hinge');
const chest=new THREE.Group(),hinge=new THREE.Group();hinge.name='Hinged chest lid';chest.add(new THREE.Mesh(new THREE.BoxGeometry(.98,.4,.69),new THREE.MeshStandardMaterial()),hinge);
const texture=new THREE.Texture(),world=createSpringFinaleWorld({dumplings:meal},chest,book,texture,texture,()=>.4,false),camera=new THREE.PerspectiveCamera();camera.position.set(11.9,2.03,-21);camera.updateMatrixWorld(true);
let scopedBookMaterial;world.book.getObjectByName('CoverArt').traverse(o=>{if(o instanceof THREE.Mesh)scopedBookMaterial=o.material;});
const scopedChestMaterial=world.chest.children[0].material,sourceChestMaterial=chest.children[0].material;
assert.notEqual(scopedChestMaterial,sourceChestMaterial,'Candle shading never mutates a shared cached chest material');
assert.ok(scopedBookMaterial instanceof THREE.MeshStandardMaterial,'The revealed book cover receives physical candle illumination');
const candleShaders=[scopedChestMaterial,scopedBookMaterial].map(material=>{const shader={uniforms:{},fragmentShader:'#include <lights_fragment_begin>'};material.onBeforeCompile(shader,{});assert.match(shader.fragmentShader,/RE_Direct\(candleLight/);assert.match(shader.fragmentShader,/getDistanceAttenuation\(candleDistance,springCandleRange,2\.\)/);assert.equal(shader.uniforms.springCandleRange.value,2.2);return shader;});
assert.equal(candleShaders[0].uniforms.springCandleIntensity,candleShaders[1].uniforms.springCandleIntensity,'Chest and book share one moving wick source');
assert.doesNotMatch(sourceChestMaterial.customProgramCacheKey(),/spring-scoped-candle/);
const candleProgramKey=scopedChestMaterial.customProgramCacheKey(),candleMaterialVersion=scopedChestMaterial.version;
let sourceDisposed=false,scopedDisposed=false;sourceChestMaterial.addEventListener('dispose',()=>{sourceDisposed=true;});scopedChestMaterial.addEventListener('dispose',()=>{scopedDisposed=true;});
const globalLightCount=()=>{let count=0;world.group.traverse(o=>{if(o instanceof THREE.Light)count++;});return count;};assert.equal(globalLightCount(),0,'The unlit finale adds no global lights');
const controller=createSpringTreasureState(),state=structuredClone(controller.state),update=(dt=1/60)=>{world.update(1,dt,camera,state,controller,true);world.group.updateMatrixWorld(true);};
update();assert.equal(world.trayRoot.visible,false);assert.equal(world.group.getObjectByName('Chopsticks in the other hand').visible,false,'Chopsticks cannot float over the stall before the train puzzle');
state.trainLetterRead=state.treasureKeyTaken=true;update();assert.equal(world.trayRoot.visible,true);assert.equal(world.group.getObjectByName('Chopsticks in the other hand').visible,true);
state.dumplingTrayTaken=true;state.storageSlots[0]='dumpling-tray';state.storageSlots[1]='chopsticks';update();assert.equal(world.trayRoot.visible,false,'Stored steamer has no duplicate world placement');assert.equal(world.group.getObjectByName('Chopsticks in the other hand').visible,false);
state.storageSlots.fill(null);state.hands=['dumpling-tray','chopsticks'];state.dumplingTrayOpen=true;update(1);assert.ok(world.trayRoot.getObjectByName('Steamer_lid')??world.trayRoot.getObjectByName('Steamer lid'));
const steam=world.group.getObjectByName('Warm steamer vapour');assert.ok(steam.geometry.attributes.seed.array.every(v=>v>=0&&v<1),'GPU steam seeds remain in the unit interval');
const realNow=Date.now;let now=20000;Date.now=()=>now;
try{state.dumplingsEaten=1;state.dumplingEatStarted=now;update();const bite=world.group.getObjectByName('Dumpling lifted to the mouth');assert.equal(bite.visible,true);assert.equal(bite.children.filter(o=>o.visible).length,1);const initial=bite.children[0].position.clone();now+=900;update();assert.ok(bite.children[0].position.distanceTo(initial)>.1,'An actual bun travels from the steamer to the mouth');now+=600;update();assert.equal(bite.visible,false,'The bite disappears after the mouth animation');}finally{Date.now=realNow;}
// Use the real state controller to exercise automatic focus, lowering the hands,
// and a physical retry without changing the visitor's position or equipment.
now=40000;Date.now=()=>now;
try{
  const focusGame=createSpringTreasureState(createSpringPreviewStorage('light'),()=>now);
  for(let hand=0;hand<2;hand++){const item=focusGame.state.hands[hand];if(item)assert.ok(focusGame.act('drop-inventory',{slot:10+hand,item,placement:{item,world:'spring',x:14.7+hand*.4,y:.3,z:-17,yaw:0}}));}
  for(const item of ['candle','glasses'])assert.ok(focusGame.act('equip-storage',focusGame.state.storageSlots.indexOf(item)));
  const step=(dt=.1)=>{now+=dt*1000;world.update(now/1000,dt,camera,focusGame.state,focusGame,true);world.group.updateMatrixWorld(true);};
  const sunlightRay=new THREE.Raycaster(new THREE.Vector3(SPRING_TREASURE_SPOT.x+.9,2.03,SPRING_TREASURE_SPOT.z),new THREE.Vector3(0,-1,0));
  step();assert.ok(focusGame.state.candleFocusStarted,'Entering the sunlight still starts focus automatically');
  for(let i=0;i<20;i++)step();assert.equal(focusGame.state.candleLit,false);
  assert.ok(focusGame.act('cancel-candle-focus'));step();
  const retry=world.target(camera,sunlightRay,focusGame.state);assert.equal(retry?.action,'focus-candle');assert.equal(retry.label,'Focus sunlight through the spectacles');
  for(let i=0;i<50;i++)step();assert.equal(focusGame.state.candleFocusStarted,0,'Lowering the hands remains respected while standing in the sunlight');assert.equal(focusGame.state.candleLit,false);
  assert.ok(world.canAct(retry.action,camera));assert.ok(focusGame.act(retry.action));
  step();assert.equal(world.target(camera,sunlightRay,focusGame.state),null,'The retry prompt disappears during the new hold');
  for(let i=0;i<28;i++)step();assert.equal(focusGame.state.candleLit,false,'Canceled focus time never shortens the retry');
  for(let i=0;i<15;i++)step();assert.equal(focusGame.state.candleLit,true,'A fresh four-second hold lights the candle without moving or re-equipping');
  assert.equal(focusGame.state.candleFocusStarted,0);assert.equal(world.target(camera,sunlightRay,focusGame.state),null,'A lit candle has no focus retry');
}finally{Date.now=realNow;}
state.hands=['candle','glasses'];state.rainCleared=state.treasureDug=state.treasureOpen=state.finalDialogueSeen=true;state.candleLit=true;const wick=new THREE.Vector3(11.8,1.87,-21.6),lens=new THREE.Vector3(12,2.12,-21.7);state.candleFocusStarted=1;world.update(1,0,camera,state,controller,true,wick,lens);world.group.updateMatrixWorld(true);const flame=world.group.getObjectByName('Candle flame'),light=world.group.getObjectByName('Warm candlelight inside the keepsake chest');assert.ok(flame.position.distanceTo(wick.clone().add(new THREE.Vector3(0,.04,0)))<1e-6);assert.equal(light.visible,true);assert.ok(light.userData.intensity>.094&&light.userData.intensity<.106);assert.ok(world.book.visible,'A lit candle reveals the actual book in the chest');
assert.equal(globalLightCount(),0,'Lighting the wick cannot change the outdoor global-light shader counts');
for(const shader of candleShaders){assert.ok(shader.uniforms.springCandlePosition.value.distanceTo(flame.getWorldPosition(new THREE.Vector3()))<1e-6);assert.match(shader.fragmentShader,/viewMatrix\*vec4\(springCandlePosition,1\.\)/,'Each main/reflection camera transforms the physical wick independently');assert.equal(shader.uniforms.springCandleIntensity.value,light.userData.intensity);}
state.hands=['glasses',null];update();assert.equal(candleShaders[0].uniforms.springCandleIntensity.value,0,'Stowing the candle turns off the local illumination using its uniform');
assert.equal(scopedChestMaterial.customProgramCacheKey(),candleProgramKey);assert.equal(scopedChestMaterial.version,candleMaterialVersion,'Lighting and stowing never invalidate the material program');state.hands=['candle','glasses'];
// The player lights the candle, then looks inside: pickup and the bench walk
// follow automatically, with no interaction button and no trigger when paused.
const revealGame=createSpringTreasureState(createSpringPreviewStorage('ending'));
for(let hand=0;hand<2;hand++){const item=revealGame.state.hands[hand];if(item)assert.ok(revealGame.act('drop-inventory',{slot:10+hand,item,placement:{item,world:'spring',x:14.7+hand*.4,y:.3,z:-17,yaw:0}}));}
for(const item of ['candle','glasses'])assert.ok(revealGame.act('equip-storage',revealGame.state.storageSlots.indexOf(item)));
camera.position.set(SPRING_TREASURE_SPOT.x,2.03,SPRING_TREASURE_SPOT.z+1.25);
world.update(2,0,camera,revealGame.state,revealGame,true);world.group.updateMatrixWorld(true);
camera.lookAt(world.book.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);
for(let i=0;i<30;i++)world.update(2,0,camera,revealGame.state,revealGame,true);
assert.equal(revealGame.state.springBookTaken,false,'Paused frames cannot start the automatic ending');
for(let i=0;i<10;i++)world.update(2,.1,camera,revealGame.state,revealGame,true);
assert.equal(revealGame.state.springBookTaken,false,'The illuminated book is revealed before the automatic pickup');
camera.lookAt(camera.position.clone().add(new THREE.Vector3(0,1,1)));camera.updateMatrixWorld(true);
world.update(2,.1,camera,revealGame.state,revealGame,true);
camera.lookAt(world.book.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);
for(let i=0;i<10;i++)world.update(2,.1,camera,revealGame.state,revealGame,true);
assert.equal(revealGame.state.springBookTaken,false,'Looking away resets the reveal');
for(let i=0;i<6;i++)world.update(2,.1,camera,revealGame.state,revealGame,true);
assert.equal(revealGame.state.endingPhase,'walking','Looking inside the lit chest automatically collects the book');
assert.ok(revealGame.state.springBookTaken);
state.endingPhase='walking';update();assert.equal(world.trayRoot.visible,false);assert.equal(world.shovelRoot.visible,false);
const ending=createSpringEnding(book,texture,()=>.4,false,false),pose={x:SPRING_TREASURE_SPOT.x,y:2.03,z:SPRING_TREASURE_SPOT.z,yaw:0,pitch:0},steps=[];const advance={act:(action,next)=>{assert.equal(action,'ending-phase');steps.push(next);state.endingPhase=next;return true;}};
for(let i=0;i<1000&&state.endingPhase!=='reading';i++)ending.update(.02,state,camera,pose,advance);
assert.deepEqual(steps,['sitting','opening','reading']);assert.ok(Math.abs(pose.x-ending.seat.x)<1e-6&&Math.abs(pose.z-ending.seat.z)<1e-6,'The book sequence reaches the physical riverside bench');const opened=ending.group.getObjectByName('CoverHinge');assert.ok(Math.abs(opened.rotation.y)>2,'The real front cover hinges open');const petals=ending.group.children.find(o=>o instanceof THREE.Mesh&&o.geometry.isInstancedBufferGeometry);assert.ok(petals.material.uniforms.elapsed.value>6,'The gust continues across the sit-to-open transition');assert.ok(ending.group.getObjectByName('Ivory inside of the opened Spring cover'));
state.endingPhase='reading';ending.update(.02,state,camera,pose,advance);assert.equal(ending.group.visible,false,'The 3D cinematic yields to the reader');
state.endingPhase='complete';ending.update(.02,state,camera,pose,advance);
assert.equal(pose.y,.4+1.63,'Closing the book restores standing height for walking');assert.equal(pose.x,12.5,'The player stands on the path beside the bench');
pose.x=10;ending.update(.02,state,camera,pose,advance);assert.equal(pose.x,10,'Free roaming is not pulled back to the bench');
const resumedEnding=createSpringEnding(book,texture,()=>.4,false,false),resumedPose={x:0,y:2.03,z:0,yaw:0,pitch:0};
state.endingPhase='reading';resumedEnding.update(0,state,camera,resumedPose,advance);
assert.deepEqual(resumedPose,resumedEnding.seat,'Reloading the reader restores the physical bench pose');
state.endingPhase='complete';resumedEnding.update(.02,state,camera,resumedPose,advance);
assert.equal(resumedPose.x,12.5);assert.equal(resumedPose.z,-17);assert.equal(resumedPose.y,2.03,'Closing a resumed reader also restores standing height');
resumedPose.x=10;state.endingPhase='reading';resumedEnding.update(.02,state,camera,resumedPose,advance);
state.endingPhase='complete';resumedEnding.update(.02,state,camera,resumedPose,advance);
assert.equal(resumedPose.x,10,'Reopening the book during free roaming preserves the current location');resumedEnding.dispose();
world.dispose();ending.dispose();assert.equal(world.group.children.length,0);assert.equal(ending.group.children.length,0);assert.equal(scopedDisposed,true);assert.equal(sourceDisposed,false,'Disposal preserves cached source materials');assert.doesNotMatch(scopedChestMaterial.customProgramCacheKey(),/spring-scoped-candle/,'Cleanup restores scoped hooks');assert.equal(candleShaders[0].uniforms.springCandleIntensity.value,0);
console.log('Spring finale scene passed: actual seven-bun GLB, no floating/duplicate props, visible eating, automatic candle focus with physical cancellation/retry, anchored flame and scoped PBR candlelight without global light changes, physical bench walk, hinged book, continuous blossom gust and cleanup.');
