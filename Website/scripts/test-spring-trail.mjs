import assert from 'node:assert/strict';
import * as THREE from 'three';
import {typescriptUrl} from './load-typescript.mjs';
const load=async name=>import(await typescriptUrl(new URL(`../app/shrine-void/${name}.ts`,import.meta.url)));
const {createSpringTreasureState,SPRING_SAVE_KEY}=await load('spring-treasure-state');
const {createSeasonLayout,groundHeight}=await load('season-layout');
const {SPRING_SPOTS,springPondDistance}=await load('spring-treasure-layout');
const {partitionInstances}=await load('spatial-instances');
let saved=null;
const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
let game=createSpringTreasureState(storage);
assert.equal(game.act('open-box'),false);
assert.equal(game.act('dig'),false);
assert.equal(game.act('rub-paper'),false);
for(const action of ['read-note','lift-saucer','take-pouch','read-phone','take-ticket'])assert.ok(game.act(action));
game=createSpringTreasureState(storage);
assert.ok(game.state.ticketFound&&!game.state.ticketSolved,'Collected sleeves survive closing/reloading before solving');
assert.equal(game.act('align-tickets',{x:1,y:0,turn:0}),false);
assert.ok(game.act('align-tickets',{x:0,y:0,turn:0}));
for(const action of ['place-paper','clip-paper','rub-paper','sit-bench','take-drawing'])assert.ok(game.act(action));
assert.equal(game.act('open-cabinet',['leaf','sun','ripple']),false);
assert.ok(game.act('open-cabinet',['sun','leaf','ripple']));
assert.ok(game.act('map-line',['tree','marker']));
assert.ok(game.act('map-line',['bridge','boulders']));
for(const action of ['take-spade','dig','dig','dig','open-box','take-book'])assert.ok(game.act(action));
assert.ok(createSpringTreasureState(storage).state.bookFound);
game.act('reset');assert.equal(game.state.bookFound,false);

// Returning readers keep the book unlocked, while an explicit fresh trail wins.
const legacyKey='between-seasons-relic-spring-v1',legacySaves=new Map([[legacyKey,JSON.stringify({version:1,keyFound:true,unlocked:true,bookTaken:true})]]);
const legacyStorage={getItem:key=>legacySaves.get(key)??null,setItem:(key,value)=>legacySaves.set(key,value)};
let returning=createSpringTreasureState(legacyStorage);
assert.ok(returning.state.bookFound&&returning.state.boxOpen&&returning.state.cabinetOpen&&returning.state.digStage===3,'Previous Spring readers can reopen their book');
returning.act('reset');returning=createSpringTreasureState(legacyStorage);
assert.equal(returning.state.bookFound,false,'An explicit new trail is not silently completed by the old save');
assert.ok(legacySaves.has(legacyKey),'Migration preserves the old relic save');
legacySaves.delete(SPRING_SAVE_KEY);legacySaves.set(legacyKey,JSON.stringify({version:1,keyFound:true,unlocked:true,bookTaken:false}));
assert.equal(createSpringTreasureState(legacyStorage).state.bookFound,false,'An unfinished old hunt cannot skip to the book');

// Exploring out of order never adds hidden note, map or bench prerequisites.
let early=createSpringTreasureState();
for(const action of ['take-spade','dig','dig','dig'])assert.ok(early.act(action));
assert.equal(early.act('open-box'),false,'An early excavation still needs the key');
assert.ok(early.act('take-drawing'),'The tree pocket can be found before the lake clue');
assert.ok(early.act('open-cabinet',['sun','leaf','ripple']),'A correct physical setting works before reading its clues');
assert.ok(early.act('open-box'));assert.ok(early.act('take-book'));
assert.equal(early.state.noteRead,false);

// Each completed physical step is safe to close or refresh, even before the book.
const checkpointSaves=new Map(),checkpointStorage={getItem:key=>checkpointSaves.get(key)??null,setItem:(key,value)=>checkpointSaves.set(key,value)};
let checkpoint=createSpringTreasureState(checkpointStorage);
for(const [action,field] of [['take-pouch','pouchTaken'],['place-paper','paperPlaced'],['clip-paper','paperClipped'],['rub-paper','rubbingDone'],['take-spade','spadeTaken']]){
 assert.ok(checkpoint.act(action));checkpoint=createSpringTreasureState(checkpointStorage);assert.equal(checkpoint.state[field],true,`${action} survives refresh`);
}
for(let stage=1;stage<=3;stage++){assert.ok(checkpoint.act('dig'));checkpoint=createSpringTreasureState(checkpointStorage);assert.equal(checkpoint.state.digStage,stage);}
for(const raw of ['broken JSON','null','[]',JSON.stringify({version:7,bookFound:true})]){
 const fresh=createSpringTreasureState({getItem:()=>raw,setItem:()=>{}});assert.equal(fresh.state.bookFound,false);assert.ok(fresh.act('read-note'));
}
assert.ok(createSpringTreasureState({getItem:()=>{throw new Error('Storage blocked');},setItem:()=>{throw new Error('Storage blocked');}}).act('read-note'),'Storage restrictions do not block play');

// Flood-fill with the player's body footprint, not just a centre-point path.
const nav=createSeasonLayout('spring').navigation;
const at=(x,z)=>Math.round((z-nav.origin[1])/nav.cell)*nav.width+Math.round((x-nav.origin[0])/nav.cell);
const safe=i=>{
 const x=i%nav.width,z=Math.floor(i/nav.width);
 if(x<2||z<2||x>=nav.width-2||z>=nav.depth-2)return false;
 return [0,1,-1,nav.width,-nav.width].every(d=>nav.heights[i+d]!==null);
};
const seen=new Set(),queue=[at(nav.spawn.x,nav.spawn.z)];seen.add(queue[0]);
for(let k=0;k<queue.length;k++)for(const d of [1,-1,nav.width,-nav.width]){
 const i=queue[k]+d;if(seen.has(i)||!safe(i))continue;
 if(Math.abs(nav.heights[i]-nav.heights[queue[k]])>.2)continue;
 seen.add(i);queue.push(i);
}
for(const [name,p]of Object.entries(SPRING_SPOTS)){
 assert.ok([...seen].some(i=>Math.hypot(nav.origin[0]+i%nav.width*nav.cell-p.x,nav.origin[1]+Math.floor(i/nav.width)*nav.cell-p.z)<1.7),`${name} needs a reachable approach`);
}
for(let x=20;x<=24;x+=.25)assert.ok(seen.has(at(x,-12)),`Bridge crossing blocked at ${x}`);
for(let z=-17;z<=-9;z+=.2)assert.ok(springPondDistance(22,z)<1,'Stream must remain connected beneath bridge');
assert.ok(groundHeight('spring',22,-12)<.30,'Water must be above the stream bed');
assert.ok(Math.abs(groundHeight('spring',-11,2)-groundHeight('spring',-12.5,3))<.001,'Classroom needs level ground');

// Spatial batching is lossless: every matrix, colour and instance survives.
const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),100),m=new THREE.Matrix4(),c=new THREE.Color();
for(let i=0;i<100;i++){mesh.setMatrixAt(i,m.makeTranslation(i%10,0,Math.floor(i/10)));mesh.setColorAt(i,c.setHex(i+1));}
const tiles=partitionInstances(mesh,3),positions=new Set();
assert.equal(tiles.reduce((n,t)=>n+t.count,0),100);
for(const tile of tiles)for(let i=0;i<tile.count;i++){tile.getMatrixAt(i,m);tile.getColorAt(i,c);const id=m.elements[12]+m.elements[14]*10;positions.add(id);assert.equal(c.getHex(),id+1);assert.ok(tile.boundingSphere.containsPoint(new THREE.Vector3(m.elements[12],0,m.elements[14])));}
assert.equal(positions.size,100);
console.log('Spring trail passed: puzzle progression/recovery, all destinations reachable, bridge and connected water, level classroom, lossless spatial batching.');
