import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import ts from 'typescript';
import * as THREE from 'three';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.'))return next(specifier+'.ts',context);throw error;}}});
const {createSpringTreasureState,SPRING_SAVE_KEY,springOwnsItem,springPutAwayCommand}=await import('../app/shrine-void/spring-treasure-state.ts');
const {createSpringPreviewStorage}=await import('../app/shrine-void/spring-preview.ts');
const {springInventoryDropTarget}=await import('../app/shrine-void/spring-inventory-drag.ts');
const {createSeasonLayout,groundHeight,springBridgeHeight}=await import('../app/shrine-void/season-layout.ts');
const {createSeasonTravel}=await import('../app/shrine-void/season-navigation.ts');
const {springRiverCentre}=await import('../app/shrine-void/spring-treasure-layout.ts');
const {adaviGround}=await import('../app/shrine-void/spring-adavi-environment.ts');

function memory(initial){let saved=JSON.stringify(initial);return {getItem:key=>(assert.equal(key,SPRING_SAVE_KEY),saved),setItem:(key,value)=>{assert.equal(key,SPRING_SAVE_KEY);saved=value;},read:()=>JSON.parse(saved)};}
const early=()=>({version:4,introStep:2,noteRead:true,keyTaken:true,inventory:['key'],storageSlots:['key','letter',null,null,null,null,null,null,null,null],hands:[null,null]});
const carried=state=>[...state.storageSlots,...state.hands].filter(Boolean);
const ownership=state=>({storageSlots:state.storageSlots,hands:state.hands,droppedItems:state.droppedItems,inventory:state.inventory});
const placement=item=>({item,world:'spring',x:13,y:.3,z:-17,yaw:.4});
const move=(game,from,to,item)=>game.act('move-inventory',{from,to,item});

const storage=memory(early()),game=createSpringTreasureState(storage);
assert.ok(move(game,0,9,'key'));assert.equal(game.state.storageSlots[0],null);assert.equal(game.state.storageSlots[9],'key','An item moves between the separated storage banks');
assert.ok(move(game,9,1,'key'));assert.equal(game.state.storageSlots[1],'key');assert.equal(game.state.storageSlots[9],'letter','Occupied storage slots swap');
assert.ok(move(game,1,10,'key'));assert.equal(game.state.hands[0],'key');assert.equal(game.state.storageSlots[1],null);
assert.ok(move(game,10,9,'key'));assert.equal(game.state.hands[0],'letter');assert.equal(game.state.storageSlots[9],'key','Dragging onto an occupied hand swaps rather than loses either item');
assert.ok(move(game,10,11,'letter'));assert.deepEqual(game.state.hands,[null,'letter']);assert.equal(game.state.activeHand,1);
assert.ok(move(game,11,4,'letter'));assert.deepEqual(game.state.hands,[null,null]);assert.equal(game.state.storageSlots[4],'letter');
assert.equal(new Set(carried(game.state)).size,2);assert.equal(carried(game.state).length,2,'Every one-hand item has one owner');
const beforeInvalid=JSON.stringify(ownership(game.state));
for(const payload of [{from:9,to:4,item:'letter'},{from:9,to:12,item:'key'},{from:-1,to:0,item:'key'},{from:9,to:9,item:'key'},{from:9.5,to:2,item:'key'},{from:NaN,to:2,item:'key'}])assert.equal(game.act('move-inventory',payload),false);
assert.equal(JSON.stringify(ownership(game.state)),beforeInvalid,'Invalid or stale drags are atomic');
const reloaded=createSpringTreasureState(storage);assert.deepEqual(reloaded.state.storageSlots,game.state.storageSlots,'Explicit empty slots survive reload');assert.deepEqual(reloaded.state.hands,game.state.hands);

const dropStore=memory(early()),drop=createSpringTreasureState(dropStore);
const initialOwnership=JSON.stringify(ownership(drop.state));
for(const payload of [{slot:1,item:'key',placement:placement('key')},{slot:0,item:'key',placement:placement('letter')},{slot:0,item:'key',placement:{...placement('key'),x:NaN}},{slot:0,item:'key',placement:{...placement('key'),world:'unknown'}},{slot:0,item:'key',placement:{...placement('key'),world:'bus',x:13}},{slot:0,item:'key',placement:{...placement('key'),world:'adavi',x:13}}])assert.equal(drop.act('drop-inventory',payload),false);
assert.equal(JSON.stringify(ownership(drop.state)),initialOwnership,'Invalid drops do not remove the source item');
assert.ok(drop.act('drop-inventory',{slot:0,item:'key',placement:placement('key')}));assert.equal(springOwnsItem(drop.state,'key'),false);assert.equal(drop.state.droppedItems.length,1);
assert.equal(drop.act('drop-inventory',{slot:0,item:'key',placement:placement('key')}),false,'Replaying a completed drag cannot duplicate the world object');
const droppedReload=createSpringTreasureState(dropStore);assert.equal(springOwnsItem(droppedReload.state,'key'),false,'Milestone recovery must not put dropped objects back in storage');assert.deepEqual(droppedReload.state.droppedItems,[placement('key')]);
assert.ok(droppedReload.act('pickup-dropped','key'));assert.equal(droppedReload.state.droppedItems.length,0);assert.equal(carried(droppedReload.state).filter(item=>item==='key').length,1);assert.equal(droppedReload.act('pickup-dropped','key'),false);
assert.ok(move(droppedReload,droppedReload.state.storageSlots.indexOf('letter'),11,'letter'));
assert.ok(droppedReload.act('drop-inventory',{slot:11,item:'letter',placement:placement('letter')}));assert.equal(droppedReload.state.hands[1],null);assert.equal(springOwnsItem(droppedReload.state,'letter'),false);
const handDropReload=createSpringTreasureState(dropStore);assert.equal(springOwnsItem(handDropReload.state,'letter'),false);assert.equal(handDropReload.state.droppedItems[0].item,'letter');
handDropReload.setGuard(action=>action!=='pickup-dropped');assert.equal(handDropReload.act('pickup-dropped','letter'),false,'Physical pickup guard can reject distant objects');assert.equal(handDropReload.state.droppedItems.length,1);
const duplicateData=dropStore.read();duplicateData.droppedItems.push({...duplicateData.droppedItems[0],x:15});duplicateData.storageSlots[8]='letter';
const duplicateRestore=createSpringTreasureState(memory(duplicateData));assert.equal(duplicateRestore.state.droppedItems.filter(p=>p.item==='letter').length,1);assert.equal(springOwnsItem(duplicateRestore.state,'letter'),false,'A duplicate saved drop and stale slot cannot create two physical copies');
const invalidData=dropStore.read();invalidData.droppedItems[0].x=100000;const invalidRestore=createSpringTreasureState(memory(invalidData));assert.equal(invalidRestore.state.droppedItems.length,0);assert.ok(springOwnsItem(invalidRestore.state,'letter'),'Invalid world positions recover the item rather than losing it');

// The deferred paper hunt no longer fills twelve slots before the train.
// Build a genuinely full, earned post-train inventory for capacity coverage.
const fullData=JSON.parse(createSpringPreviewStorage('hunt').getItem(SPRING_SAVE_KEY));
fullData.paperPieces=[0];fullData.noteRead=true;fullData.doorNoteRead=true;
fullData.storageSlots=['key','letter','door-note','mushroom-toy','candle','note','pill-letter','journey-note','compass','glasses'];
fullData.hands=['treasure-key','paper-fragments'];
const fullStore=memory(fullData),full=createSpringTreasureState(fullStore);
assert.equal(carried(full.state).length,12,'A completed chapter uses both hands when ten storage slots fill');
const fullBefore=JSON.stringify(ownership(full.state));assert.equal(full.act('take-item','mangoes'),false);assert.equal(JSON.stringify(ownership(full.state)),fullBefore,'A failed two-hand equip cannot discard an earlier successfully stowed object');
assert.equal(full.act('stow-hand',0),false);assert.equal(JSON.stringify(ownership(full.state)),fullBefore,'Stowing into full storage preserves the hand');
const initialItems=full.state.storageSlots.slice(),left=full.state.hands[0];assert.ok(move(full,10,3,left));assert.equal(full.state.storageSlots[3],left);assert.equal(full.state.hands[0],initialItems[3],'A full inventory can still swap hands and storage');

// Exercise the actual scene closure: state-only drop payloads cannot catch an
// otherwise valid dry-ground placement being rejected before the state acts.
const worldSource=await readFile(new URL('../app/shrine-void/season-world.ts',import.meta.url),'utf8');
const worldAST=ts.createSourceFile('season-world.ts',worldSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),dropFunctions=[];
function findDrop(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='springDropPlacement')dropFunctions.push(node);ts.forEachChild(node,findDrop);}findDrop(worldAST);
assert.equal(dropFunctions.length,1,'The harness executes the one actual Spring drop-placement function');
const dropJS=ts.transpileModule(dropFunctions[0].getText(worldAST),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const physicalDropGame=createSpringTreasureState(memory(fullData)),dropCamera=new THREE.PerspectiveCamera(58,16/9,.1,240),dropWalking=createSeasonTravel(createSeasonLayout('spring').navigation);
const dropScope={THREE,camera:dropCamera,currentSpringWorld:()=> 'spring',springWorld:{doorwayBlocked:()=>false,interiorHeight:()=>null},springBus:null,spring:physicalDropGame,springTrain:null,props:{pickup:{blocked:()=>false}},walking:dropWalking,adaviGround,groundHeight};
const actualDropPlacement=new Function(...Object.keys(dropScope),`${dropJS}\nreturn springDropPlacement;`)(...Object.values(dropScope));
dropCamera.position.set(-2.85,groundHeight('spring',-2.85,-4.8)+1.63,-4.8);dropCamera.rotation.set(0,0,0);dropCamera.updateMatrixWorld(true);
const lowDryDrop=actualDropPlacement('letter');assert.ok(lowDryDrop,'The low dry ground behind the food stall accepts a physical drop');
assert.ok(lowDryDrop.y<.17,'The regression covers ground below the former blanket outdoor cutoff');
assert.ok(Math.abs(lowDryDrop.y-(dropWalking.height(lowDryDrop.x,lowDryDrop.z)+.015))<1e-10,'Dropped items rest on the actual navigable support');
assert.ok(physicalDropGame.act('drop-inventory',{slot:physicalDropGame.state.storageSlots.indexOf('letter'),item:'letter',placement:lowDryDrop}));
const nextDryDrop=actualDropPlacement('door-note');assert.ok(nextDryDrop);assert.ok(Math.hypot(nextDryDrop.x-lowDryDrop.x,nextDryDrop.z-lowDryDrop.z)>=.34,'A second real drop selects a separate clear location');
assert.ok(physicalDropGame.act('drop-inventory',{slot:physicalDropGame.state.storageSlots.indexOf('door-note'),item:'door-note',placement:nextDryDrop}));
assert.ok(physicalDropGame.act('take-dumplings'),'A full inventory can make room through real nearby drops and collect both meal props');
assert.deepEqual(physicalDropGame.state.hands,['dumpling-tray','chopsticks']);
dropCamera.position.set(22,2.73,-12);dropCamera.rotation.set(0,0,0);dropCamera.updateMatrixWorld(true);
const deckDrop=actualDropPlacement('key');assert.ok(deckDrop,'The bridge supports a physical drop');
assert.ok(Math.abs(deckDrop.y-(springBridgeHeight(deckDrop.x,deckDrop.z)+.015))<.02,'Bridge drops stay on the rendered deck rather than the submerged terrain');
assert.ok(deckDrop.y-groundHeight('spring',deckDrop.x,deckDrop.z)>1,'The bridge case distinguishes deck and river-bed heights');
dropCamera.position.set(springRiverCentre(-20),1.93,-20);dropCamera.updateMatrixWorld(true);
assert.equal(actualDropPlacement('key'),null,'All candidate drops in open river water remain rejected by the real navigation support');

const basket=createSpringTreasureState();assert.ok(basket.act('take-basket'));assert.deepEqual(basket.state.hands,['basket','basket']);
const nearCommand=springPutAwayCommand(basket.state,true);assert.deepEqual(nearCommand,{action:'return-held'});assert.ok(basket.act(nearCommand.action,nearCommand.value));assert.deepEqual(basket.state.hands,[null,null]);assert.equal(basket.state.inventoryNotice,'','Q returns the basket instead of trying to store it');
assert.ok(basket.act('take-basket'));const farCommand=springPutAwayCommand(basket.state,false);assert.equal(farCommand.action,'inventory-notice');assert.match(farCommand.value,/stall/);assert.ok(basket.act(farCommand.action,farCommand.value));assert.deepEqual(basket.state.hands,['basket','basket']);
const bulkyBefore=JSON.stringify(ownership(basket.state));assert.equal(move(basket,10,0,'basket'),false);assert.equal(JSON.stringify(ownership(basket.state)),bulkyBefore,'Two-hand containers cannot be dragged into storage');

const bus=createSpringTreasureState(createSpringPreviewStorage('bus'));assert.equal(bus.state.glassesTaken,false);assert.ok(bus.act('take-glasses'));assert.equal(bus.state.glassesTaken,true);assert.ok(springOwnsItem(bus.state,'glasses'));assert.equal(bus.act('take-glasses'),false,'The bus has one pair of spectacles');
const glassesSlot=bus.state.storageSlots.indexOf('glasses'),glassesHand=bus.state.hands.indexOf('glasses');
assert.ok(bus.act('drop-inventory',{slot:glassesSlot>=0?glassesSlot:glassesHand+10,item:'glasses',placement:{item:'glasses',world:'bus',x:399.74,y:.17,z:2,yaw:0}}));assert.equal(springOwnsItem(bus.state,'glasses'),false);assert.ok(bus.act('pickup-dropped','glasses'));assert.ok(springOwnsItem(bus.state,'glasses'));
const legacy=createSpringPreviewStorage('rail'),legacyData=JSON.parse(legacy.getItem(SPRING_SAVE_KEY));delete legacyData.glassesTaken;
const migrated=createSpringTreasureState(memory(legacyData));assert.ok(migrated.state.glassesTaken);assert.ok(springOwnsItem(migrated.state,'glasses'),'Already completed dreams recover spectacles without resetting the chapter');
const unearned=createSpringTreasureState(memory({...early(),glassesTaken:true,storageSlots:['key','letter','glasses']}));assert.equal(unearned.state.glassesTaken,false);assert.equal(springOwnsItem(unearned.state,'glasses'),false,'An inconsistent early save cannot manufacture the bus reward');

const departure=createSpringTreasureState(createSpringPreviewStorage('bus'));
assert.ok(departure.act('read-journey-note'));assert.ok(departure.act('close-quest-note'));assert.ok(departure.act('take-compass'));assert.equal(departure.act('return-from-bus'),false,'Wake-up waits for spectacles as well as letter and compass');
assert.ok(departure.act('take-glasses'));
for(const item of ['journey-note','compass','glasses']){
  const slot=departure.state.storageSlots.indexOf(item),hand=departure.state.hands.indexOf(item);
  assert.ok(departure.act('drop-inventory',{slot:slot>=0?slot:hand+10,item,placement:{item,world:'bus',x:399.74,y:.17,z:2,yaw:0}}));
  assert.equal(departure.act('return-from-bus'),false,`Wake-up cannot strand the dropped ${item} in the bus`);
  assert.ok(departure.act('pickup-dropped',item));
}
assert.ok(departure.act('return-from-bus'),'All three currently carried keepsakes permit waking up');
const sleepingBefore=JSON.stringify(ownership(departure.state));assert.equal(move(departure,0,9,departure.state.storageSlots[0]),false);assert.equal(departure.act('drop-inventory',{slot:0,item:departure.state.storageSlots[0],placement:placement(departure.state.storageSlots[0])}),false);assert.equal(JSON.stringify(ownership(departure.state)),sleepingBefore,'Transition overlays lock inventory changes');

const bounds={left:0,right:400,top:500,bottom:560},slots=[{index:0,left:0,right:40,top:500,bottom:550},{index:10,left:180,right:220,top:500,bottom:550},{index:9,left:360,right:400,top:500,bottom:550}];
assert.deepEqual(springInventoryDropTarget(20,520,slots,bounds),{kind:'slot',index:0});assert.deepEqual(springInventoryDropTarget(200,520,slots,bounds),{kind:'slot',index:10});assert.deepEqual(springInventoryDropTarget(380,520,slots,bounds),{kind:'slot',index:9});
assert.deepEqual(springInventoryDropTarget(100,525,slots,bounds),{kind:'cancel'});assert.deepEqual(springInventoryDropTarget(100,400,slots,bounds),{kind:'world'});assert.deepEqual(springInventoryDropTarget(100,490,slots,bounds),{kind:'cancel'},'A small dead zone prevents accidental world drops');
console.log('Spring inventory passed: cross-bank move/swap, both hands, stale and invalid drags, atomic capacity failure, actual scene drops on low dry stall ground and bridge decks, open-water rejection, separated placements and full-inventory meal recovery, persistent recoverable drops, basket Q, spectacle collection/migration and drop-target boundaries.');
