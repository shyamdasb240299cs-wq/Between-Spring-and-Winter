import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return n(s+'.ts',c);throw e;}}});
const gradient={addColorStop(){}};
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>(t[p]=v,true)});globalThis.document={createElement:()=>({width:512,height:640,getContext:()=>context})};
const {createSpringTreasureWorld}=await import('../app/shrine-void/spring-treasure-world.ts');
const {createSpringTreasureState,SPRING_EAT_MS,SPRING_HOTBAR,springHeldItem}=await import('../app/shrine-void/spring-treasure-state.ts');
const {createSeasonLayout,groundHeight}=await import('../app/shrine-void/season-layout.ts');
const {createSeasonTravel}=await import('../app/shrine-void/season-navigation.ts');
const {SPRING_SPOTS}=await import('../app/shrine-void/spring-treasure-layout.ts');
const {adaviGround,riverWidth,branchLevel,ADAVI_BRANCH}=await import('../app/shrine-void/spring-adavi-environment.ts');
const texture=new THREE.Texture(),maps={color:texture,normal:texture,roughness:texture,sizeMetres:2};
// Use the real basket mesh's bounds rather than relying on an empty placeholder.
const {NodeIO}=await import('@gltf-transform/core');const {ALL_EXTENSIONS}=await import('@gltf-transform/extensions');const {MeshoptDecoder}=await import('meshoptimizer');await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read('public/seasons/kit/models/basket-0-near.glb');const basketModel=new THREE.Group();for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){const g=new THREE.BufferGeometry();for(const [semantic,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=primitive.getAttribute(semantic);if(a)g.setAttribute(name,new THREE.BufferAttribute(a.getArray(),a.getElementSize()));}const index=primitive.getIndices();if(index)g.setIndex(new THREE.BufferAttribute(index.getArray(),1));basketModel.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial()));}
const world=createSpringTreasureWorld({models:{basket:basketModel},materials:{wood:texture,cloth:texture,paper:texture},height:(x,z)=>groundHeight('spring',x,z),mobile:true,reduced:false,forestMaps:{mud:maps,rock:maps,water:texture},character:texture});
let clock=Date.now();const realNow=Date.now;Date.now=()=>clock;
const game=createSpringTreasureState(undefined,()=>clock),camera=new THREE.PerspectiveCamera(58,16/9,.1,240),ray=new THREE.Raycaster();
const pose=(x,y,z,tx,ty,tz)=>{camera.position.set(x,y,z);camera.lookAt(tx,ty,tz);camera.updateMatrixWorld(true);world.group.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(),camera);};
const update=(t=0)=>{camera.updateMatrixWorld(true);world.update(t,1/60,game.state,camera);world.group.updateMatrixWorld(true);};
update();assert.equal(world.group.getObjectByName('Classroom interior'),undefined);assert.equal(world.group.getObjectByName('Adavi · forest river').visible,false);assert.equal(world.backpack.bag.visible,false,'Backpack contents stay hidden before the reward is revealed');
assert.ok(world.group.getObjectByName('Syamu eating shawarma · sign portrait'));
const p=SPRING_SPOTS.picnic,base=groundHeight('spring',p.x,p.z);pose(p.x+.56,base+1.63,p.z+1.45,p.x+.56,base+1.023,p.z+.43);update();assert.equal(world.target(camera,ray)?.id,'letter','Physical letter is reachable without a modal');game.act('read-letter');update();assert.ok(world.group.getObjectByName('Held handwritten paper').visible);game.act('put-paper');
pose(p.x+1.94,base+1.63,p.z+1.45,p.x+1.94,base+1.15,p.z+.18);update();assert.equal(world.target(camera,ray)?.id,'basket');game.act('take-item','basket');update();assert.equal(world.target(camera,ray),null,'Held objects use direct game actions, not inspection targets');
const basket=world.group.getObjectByName('Rambutan basket · held physical object');assert.ok(basket);assert.equal(world.group.getObjectByName('Left hand'),undefined);assert.equal(world.group.getObjectByName('Right hand'),undefined);const bounds=new THREE.Box3().setFromObject(basket),corners=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z).project(camera));assert.ok(corners.every(p=>p.x>-.9&&p.x<.9&&p.y>-.95&&p.y<.9),'Entire basket fits the first-person view '+JSON.stringify(corners.map(p=>[p.x,p.y])));
// Looking down and turning beside the counter must not push carried baskets through it.
const counter=new THREE.Box3(new THREE.Vector3(p.x-2.42,base,p.z-.75),new THREE.Vector3(p.x+2.42,base+1.04,p.z+.75));
for(const item of ['basket','mangoes','grapes','shawarma','parotta','pazham-pori','samosa']){
  if(springHeldItem(game.state)&&springHeldItem(game.state)!==item)assert.ok(game.act('return-held'));
  assert.ok(game.act('take-item',item));const carried=item==='basket'?basket:world.group.getObjectByName('Spring item · '+item);
  for(const side of [-1,1])for(const pitch of [-1.1,-.7,-.3,0,.5])for(const yaw of [-.6,0,.6]){
    camera.position.set(p.x+1.6,base+1.63,p.z+side*1.02);camera.rotation.set(pitch,side===1?yaw:Math.PI+yaw,0,'YXZ');update();
    assert.equal(new THREE.Box3().setFromObject(carried).intersectsBox(counter),false,`${item} clips the cart at pitch ${pitch}, yaw ${yaw}, side ${side}`);
  }
}
game.act('return-held');game.act('take-item','basket');pose(p.x+1.94,base+1.63,p.z+1.45,p.x+1.94,base+1.15,p.z+.18);update();
for(let n=0;n<8;n++){assert.ok(game.act('eat-held'));update(n+1);assert.ok(world.group.getObjectByName('Food-to-mouth eating animation').visible);clock+=SPRING_EAT_MS+1;update(n+2);assert.equal(basket.children.filter(o=>/^Rambutan \d+$/.test(o.name)&&o.visible).length,7-n);}
const key=world.group.getObjectByName('Brass secret-door key');assert.ok(key.visible);assert.ok(game.act('take-key'));update(10);assert.equal(key.visible,false);assert.equal(world.group.getObjectByName('Equipped brass key').visible,false);assert.equal(game.act('unlock-door'),false);assert.ok(game.act('return-held'));game.act('select-slot',8);update(11);assert.ok(world.group.getObjectByName('Equipped brass key').visible);
// Every bulky serving stays physical and is returned to the stall, never stored.
for(const item of ['mangoes','grapes','shawarma','parotta','pazham-pori','samosa']){game.act('take-item',item);update(12);assert.equal(springHeldItem(game.state),item);assert.equal(world.group.getObjectByName('Spring item · '+item).parent.name,'Spring floating equipped item');assert.ok(game.act('eat-held'));update(12.2);assert.ok(world.group.getObjectByName('Food-to-mouth eating animation').children.some(o=>o.visible),'Consumed '+item+' is visible in the eating animation');clock+=SPRING_EAT_MS+1;assert.equal(game.act('stow-hand',game.state.activeHand),false);assert.ok(game.act('return-held'));update(13);assert.equal(world.group.getObjectByName('Spring item · '+item).parent.name,'Food Stall · a table for Aami');}
game.act('select-slot',8);update(14);
const origin=SPRING_SPOTS.school,n=new THREE.Vector2(world.exitPosition.x-origin.x,world.exitPosition.z-origin.z).normalize(),front=(d,side=0)=>({x:origin.x+n.x*d+n.y*side,z:origin.z+n.y*d-n.x*side});const a=front(1.6);pose(a.x,groundHeight('spring',a.x,a.z)+1.63,a.z,origin.x,1.3,origin.z);assert.match(world.portalHint(camera),/Unlock/);assert.ok(world.doorwayBlocked(origin.x,origin.z));assert.equal(world.portalCrossed(...Object.values(front(.6)),...Object.values(front(.1))),false);
assert.ok(game.act('unlock-door'));for(let i=0;i<90;i++)update(15+i/60);assert.ok(world.canEnter);assert.equal(world.doorwayBlocked(origin.x,origin.z),false);assert.ok(world.portalCrossed(...Object.values(front(.6)),...Object.values(front(-.1))));assert.equal(world.portalCrossed(...Object.values(front(-.1)),...Object.values(front(.6))),false);
const outdoor=createSeasonTravel(createSeasonLayout('spring').navigation,world.doorwayBlocked);for(const [dx,dz] of [[0,0],[.28,0],[-.28,0],[0,.28],[0,-.28]])assert.notEqual(outdoor.height(world.exitPosition.x+dx,world.exitPosition.z+dz),null);
world.setInterior(true);assert.ok(world.group.getObjectByName('Adavi · forest river').visible);assert.equal(world.group.getObjectByName('Food Stall · a table for Aami').visible,false);update(18);assert.ok(world.group.getObjectByName('Spring floating equipped item').visible);assert.ok(world.group.getObjectByName('Equipped brass key').visible,'Equipped key persists through forest travel');
assert.ok(riverWidth(0)*2>=11);assert.ok(branchLevel(.2)>branchLevel(.8));const join=ADAVI_BRANCH.getPoint(1);assert.ok(join.x<6,'Tributary reaches the main river');
for(let t=0;t<=1;t+=.01){assert.ok(ADAVI_BRANCH.getTangent(t).z>0,'All waterfalls face downstream');if(t>.01)assert.ok(branchLevel(t)<=branchLevel(t-.01)+1e-8,'Water never flows uphill');}
for(let z=-57;z<=35;z+=.25)assert.ok(adaviGround(0,z)<.16,'Unbroken submerged main channel');
assert.equal(branchLevel(1),.16,'Creek and river meet at the same water level');
const travel=createSeasonTravel(createSeasonLayout('spring').navigation);travel.setSurface(world.interiorHeight);Object.assign(travel.state,{x:193,z:10,y:adaviGround(-7,10)+1.63,yaw:0});travel.key('w',true);for(let i=0;i<420;i++)travel.update(1/60);assert.ok(travel.state.z< -5,'The clear west-bank path remains walkable');
assert.equal(world.interiorHeight(240,0),null);pose(193,adaviGround(-7,10.5)+1.63,10.5,193,1.5,12);assert.match(world.portalHint(camera),/Return/);world.setInterior(false);assert.ok(world.group.getObjectByName('Food Stall · a table for Aami').visible);world.dispose();Date.now=realNow;
console.log('Spring scene passed: no hands, carried-object collisions, downstream waterfalls, continuous river, held-object framing, real basket bounds, all foods, eating animation, physical papers, equipped key, portal, wider river, tributary and clear bank navigation.');
