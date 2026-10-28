import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const gradient={addColorStop(){}};
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>(t[p]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const {createSpringLakeQuest,SPRING_PAPER_HIDING_PLACES,SPRING_BRIDGE_NOTE}=await import('../app/shrine-void/spring-lake-quest.ts');
const {createSpringPreviewStorage}=await import('../app/shrine-void/spring-preview.ts');
const {createSpringTreasureState}=await import('../app/shrine-void/spring-treasure-state.ts');
const {createSeasonLayout,groundHeight}=await import('../app/shrine-void/season-layout.ts');
const {createSeasonTravel}=await import('../app/shrine-void/season-navigation.ts');
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const kit=JSON.parse(await readFile('public/seasons/kit/catalog.json','utf8')),models={};
for(const [key,id] of [['rock','loose-rock'],['river-rock','woodland-rock']]){
  const doc=await io.read('public'+kit.models[id].variants[0].lods.far.url),root=new THREE.Group();
  for(const node of doc.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
    const g=new THREE.BufferGeometry();for(const [semantic,name] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=primitive.getAttribute(semantic);if(a)g.setAttribute(name,new THREE.BufferAttribute(a.getArray(),a.getElementSize()));}
    const index=primitive.getIndices();if(index)g.setIndex(new THREE.BufferAttribute(index.getArray(),1));g.applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()));root.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial()));
  }models[key]=root;
}
const texture=new THREE.Texture(),quest=createSpringLakeQuest(models,texture,(x,z)=>groundHeight('spring',x,z),false);let game=createSpringTreasureState(createSpringPreviewStorage('river'));
const camera=new THREE.PerspectiveCamera(58,16/9,.1,240),ray=new THREE.Raycaster(),travel=createSeasonTravel(createSeasonLayout('spring').navigation);
const update=()=>{quest.update(0,1/60,game.state,camera);quest.group.updateMatrixWorld(true);camera.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(),camera);};
camera.position.set(16.2,(travel.height(16.2,-12.3)??0)+1.63,-12.3);camera.lookAt(SPRING_BRIDGE_NOTE.x,SPRING_BRIDGE_NOTE.y-.13,SPRING_BRIDGE_NOTE.z);update();
assert.equal(quest.target(camera,ray,game.state)?.action,'read-return-letter','The first pinned note offers the pill letter from the actual bridge approach');
assert.ok(game.act('read-return-letter'));assert.ok(game.act('close-quest-note'));update();
for(let n=0;n<5;n++)assert.equal(quest.group.getObjectByName('Grounded torn paper '+(n+1)).parent.visible,false,'Scraps are hidden during the first bridge visit');
assert.equal(game.act('collect-paper',0),false);
// The scene check resumes after the separately tested train and steamer meal.
const postMeal={...game.state,pillTaken:true,pillUsed:true,dreamReturned:true,journeyNoteRead:true,compassTaken:true,glassesTaken:true,trainNoteRead:true,handsWashed:true,trainMirrorRevealed:true,trainLockOpen:true,treasureKeyTaken:true,trainLetterRead:true,dumplingsEaten:7,rainCleared:true,dumplingNoteRead:true,paperHuntStarted:false,
  storageSlots:['key','mushroom-toy','candle','note','journey-note','compass','glasses','treasure-key',null,null],hands:[null,null],droppedItems:['letter','door-note','pill-letter'].map((item,n)=>({item,world:'spring',x:14.7+n*.25,y:1,z:-17,yaw:0}))};
game=createSpringTreasureState({getItem:()=>JSON.stringify(postMeal),setItem(){}});update();
assert.equal(quest.target(camera,ray,game.state)?.action,'read-bridge-note','After the meal the same physical note starts the deferred hunt');
assert.ok(game.act('read-bridge-note'));assert.ok(game.act('close-quest-note'));
let sharedMap=null;
for(let n=0;n<5;n++){
  const p=SPRING_PAPER_HIDING_PLACES[n],paper=quest.group.getObjectByName('Grounded torn paper '+(n+1));
  assert.ok(paper);if(sharedMap)assert.equal(paper.material.map,sharedMap,'All five scraps share one stained paper texture');sharedMap=paper.material.map;
  let found=false;const pos=paper.geometry.attributes.position;
  for(let a=0;a<12&&!found;a++){
    const angle=a*Math.PI/6,x=p.x+Math.cos(angle)*1.03,z=p.z+Math.sin(angle)*1.03,floor=travel.height(x,z);if(floor===null)continue;
    camera.position.set(x,floor+1.63,z);
    for(let j=0;j<pos.count&&!found;j+=Math.max(1,Math.floor(pos.count/40))){const point=new THREE.Vector3().fromBufferAttribute(pos,j).applyMatrix4(paper.matrixWorld);camera.lookAt(point);update();const target=quest.target(camera,ray,game.state);if(target?.action==='collect-paper'&&target.payload===n){assert.ok(quest.canPick(n,camera));found=true;}}
  }
  assert.ok(found,`Paper ${n+1} has a walkable, reachable line of sight around its actual scanned stone/twig cover`);
  assert.ok(game.act('collect-paper',n));update();assert.equal(paper.parent.visible,false,'Collected paper disappears');
}
assert.equal(game.state.storageSlots.filter(x=>x==='paper-fragments').length,1);
quest.dispose();texture.dispose();for(const root of Object.values(models))root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
console.log('Spring lake scene passed: first-bridge pill letter, scraps hidden until the post-meal hunt, real scanned rock occlusion, walkable pickup approaches, shared paper texture, collection visibility and one-slot bundle.');
