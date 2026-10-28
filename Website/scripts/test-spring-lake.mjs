import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const {createSpringTreasureState,SPRING_SAVE_KEY,springOwnsItem}=await import('../app/shrine-void/spring-treasure-state.ts');
const {createSpringPreviewStorage}=await import('../app/shrine-void/spring-preview.ts');
const {createSpringRain,springRainSurface}=await import('../app/shrine-void/spring-rain.ts');
const {groundHeight,springBridgeHeight}=await import('../app/shrine-void/season-layout.ts');
let clock=10000,save=JSON.stringify({version:4,introStep:2,noteRead:true,doorNoteRead:true,keyTaken:true,doorUnlocked:true,
  stoneChallengeComplete:true,bagRevealed:true,bagTaken:true,bagHeld:true,bagItemsTaken:[],inventory:['basket','key'],
  storageSlots:['basket','key','letter','door-note',null,null,null,null,null,null],hands:['backpack','backpack']});
const storage={getItem:k=>(assert.equal(k,SPRING_SAVE_KEY),save),setItem:(k,v)=>{assert.equal(k,SPRING_SAVE_KEY);save=v;}};
const game=createSpringTreasureState(storage,()=>clock);
assert.deepEqual(game.state.hands,['backpack','backpack']);assert.ok(!game.state.storageSlots.includes('basket'),'Legacy baskets return to their stall');
assert.equal(game.act('collect-paper',0),false,'Scraps require reading the bridge note');assert.equal(game.act('take-pill-seated'),false);
assert.equal(game.act('stow-bag'),false,'A backpack cannot be put in storage');assert.deepEqual(game.state.hands,['backpack','backpack']);
assert.ok(game.act('open-bag'));for(const item of ['mushroom-toy','candle','note'])assert.ok(game.act('take-bag-item',item));
assert.ok(game.state.bagNoteRead);assert.ok(game.act('close-bag-note'));assert.ok(game.act('put-bag',{world:'spring',x:14.7,z:-12,yaw:.55}));
assert.ok(game.act('read-bridge-note'));assert.ok(game.act('close-quest-note'));
assert.ok(game.state.returnLetterRead,'The first bridge visit gives the pill letter directly');assert.equal(game.state.paperHuntStarted,false);
assert.equal(game.act('collect-paper',0),false,'The paper hunt waits until after the train and dumplings');
assert.ok(game.act('read-return-letter'));assert.ok(game.act('close-quest-note'));assert.ok(game.act('take-pill'));
assert.equal(game.state.storageSlots.filter(Boolean).length,8,'The first trip has no paper bundle or hunt letter');
assert.equal(game.act('take-pill-seated'),false,'The player must sit before using the capsule');assert.ok(game.act('sit-bench'));assert.ok(game.act('take-pill-seated'));assert.equal(game.state.dreamPhase,'closing');
assert.equal(game.state.dreamReturned,false);assert.equal(game.act('sleep-phase','sleeping'),false);clock+=1120;assert.ok(game.act('sleep-phase','sleeping'));
assert.equal(springOwnsItem(game.state,'pill'),false);assert.equal(game.act('sleep-phase','waking'),false);clock+=3500;assert.ok(game.act('sleep-phase','waking'));clock+=1800;assert.ok(game.act('wake-in-bus'));
assert.equal(game.state.dreamPhase,'bus');assert.ok(game.state.busSeated);assert.equal(createSpringTreasureState(storage,()=>clock).state.dreamPhase,'bus');
assert.equal(game.act('return-from-bus'),false,'The bus clue cannot be accidentally left behind');assert.ok(game.act('read-journey-note'));assert.ok(game.act('close-quest-note'));
assert.ok(game.act('take-compass'));assert.ok(springOwnsItem(game.state,'compass'));
assert.equal(game.state.storageSlots.filter(Boolean).length,9);
assert.equal(game.act('take-compass'),false,'There is only one compass');assert.equal(game.act('return-from-bus'),false,'The spectacles also belong in the return inventory');assert.ok(game.act('take-glasses'));assert.ok(game.act('stand-bus'));assert.ok(game.act('sit-bus'));assert.ok(game.act('return-from-bus'));
assert.equal(game.act('wake-at-bench'),false);clock+=1120;assert.ok(game.act('wake-at-bench'));assert.equal(game.state.dreamPhase,'return-waking');assert.ok(game.state.dreamReturned);assert.ok(game.state.benchSeated);
clock+=1800;assert.ok(game.act('finish-waking'));assert.equal(game.state.dreamPhase,'awake');assert.ok(game.act('stand-up'));
const restored=createSpringTreasureState(storage,()=>clock);assert.equal(restored.state.dreamPhase,'awake');assert.ok(restored.state.dreamReturned);
assert.deepEqual(restored.state.paperPieces,[],'The rainy return still precedes the hunt');for(const item of ['mushroom-toy','candle','pill-letter','journey-note','compass'])assert.ok(springOwnsItem(restored.state,item),item+' survives reload');
assert.ok(restored.act('read-stored-journey-note'));assert.ok(restored.act('close-quest-note'));assert.ok(restored.act('hold-compass'));assert.equal(restored.act('take-pill-seated'),false);
assert.ok(restored.act('enter-adavi'));for(const item of ['journey-note']){const slot=restored.state.storageSlots.indexOf(item);assert.ok(slot>=0);assert.ok(restored.act('equip-storage',slot));assert.equal(restored.state.questNoteOpen,item,'Stored quest papers remain inspectable after returning to Adavi');assert.ok(restored.act('close-quest-note'));assert.ok(restored.act('move-inventory',{from:10+restored.state.hands.indexOf(item),to:slot,item}),'An inspected paper can return to its source slot');}assert.ok(restored.act('exit-adavi'));
// Start the lake-specific sequel after the train and meal. The full train,
// steamer and finale action order is exercised in test-spring-finale-state.
const mealSave={...JSON.parse(save),trainNoteRead:true,handsWashed:true,trainMirrorRevealed:true,trainLockOpen:true,treasureKeyTaken:true,trainLetterRead:true,dumplingsEaten:7,rainCleared:true,dumplingNoteRead:false,paperHuntStarted:false,
  storageSlots:['key','mushroom-toy','candle','note','pill-letter','journey-note','compass','glasses','treasure-key',null],hands:[null,null],droppedItems:['letter','door-note'].map((item,n)=>({item,world:'spring',x:14.7+n*.25,y:1,z:-17,yaw:0}))};
save=JSON.stringify(mealSave);const hunt=createSpringTreasureState(storage,()=>clock);
assert.equal(hunt.act('collect-paper',0),false,'Cleared rain alone does not begin the hunt');
assert.ok(hunt.act('read-dumpling-note'));assert.ok(hunt.act('close-quest-note'));assert.ok(hunt.act('read-bridge-note'));assert.equal(hunt.state.questNoteOpen,'bridge-note');assert.ok(hunt.state.paperHuntStarted);assert.ok(hunt.act('close-quest-note'));
for(const index of [4,0,3,1,2])assert.ok(hunt.act('collect-paper',index),JSON.stringify({index,phase:hunt.state.dreamPhase,papers:hunt.state.paperPieces,hunt:hunt.state.paperHuntStarted,rain:hunt.state.rainCleared,hands:hunt.state.hands,slots:hunt.state.storageSlots,notice:hunt.state.inventoryNotice}));assert.deepEqual(hunt.state.paperPieces,[0,1,2,3,4]);
assert.equal([...hunt.state.storageSlots,...hunt.state.hands].filter(x=>x==='paper-fragments').length,1,'All five fragments occupy one carried bundle');assert.equal(hunt.act('collect-paper',1),false);
assert.equal(hunt.state.storageSlots.filter(Boolean).length,10);const kept=new Set([...hunt.state.storageSlots,...hunt.state.hands].filter(Boolean));
assert.equal(hunt.act('take-item','mangoes'),false,'A failed two-hand swap cannot discard keepsakes when storage is full');assert.deepEqual(new Set([...hunt.state.storageSlots,...hunt.state.hands].filter(Boolean)),kept);
assert.deepEqual(createSpringTreasureState(storage,()=>clock).state.paperPieces,[0,1,2,3,4],'The later hunt survives reload');
const old=JSON.parse(save);delete old.journeyNoteRead;delete old.compassTaken;old.storageSlots=old.storageSlots.map(item=>['journey-note','compass'].includes(item)?null:item);old.hands=[null,null];
const upgraded=createSpringTreasureState({getItem:()=>JSON.stringify(old),setItem(){}},()=>clock);assert.ok(upgraded.state.journeyNoteRead&&upgraded.state.compassTaken,'Completed older dreams recover the new route clue');assert.ok(springOwnsItem(upgraded.state,'compass'));
const legacyBag={...old,bagPlacement:null,storageSlots:['backpack','basket',...old.storageSlots.filter(Boolean).slice(0,8)],hands:[null,null]};
const grounded=createSpringTreasureState({getItem:()=>JSON.stringify(legacyBag),setItem(){}},()=>clock);assert.ok(!grounded.state.storageSlots.some(item=>item==='basket'||item==='backpack'));assert.equal(grounded.state.bagPlacement.world,'spring');
const oldHeldPack={...old,bagPlacement:null,hands:['backpack','backpack'],storageSlots:old.storageSlots};const recoveredPack=createSpringTreasureState({getItem:()=>JSON.stringify(oldHeldPack),setItem(){}},()=>clock);assert.ok(springOwnsItem(recoveredPack.state,'compass'),'Legacy held pack frees hands before restoring the new compass');assert.equal(recoveredPack.state.bagHeld,false);assert.equal(recoveredPack.state.bagPlacement.world,'spring');
const fixture=createSpringTreasureState(createSpringPreviewStorage('bus'));assert.equal(fixture.state.dreamPhase,'bus');assert.equal(createSpringTreasureState(createSpringPreviewStorage('river')).state.dreamPhase,'awake');
assert.equal(springRainSurface(-3.7,-2.2).kind,'shelter');assert.ok(springRainSurface(-3.7,-2.2).height>groundHeight('spring',-3.7,-2.2)+2.8);
assert.equal(springRainSurface(22,-12).height,springBridgeHeight(22,-12));assert.equal(springRainSurface(22,-17).kind,'water');
const rain=createSpringRain(false),camera=new THREE.PerspectiveCamera();camera.position.set(-3.7,1.7,-2.2);assert.equal(rain.group.visible,false);
rain.update(1,camera,true);assert.ok(rain.group.visible);
const drops=rain.group.getObjectByName('Rain streaks clipped above support surfaces'),p=drops.geometry.attributes.position.array;
let sheltered=0;for(let n=0;n<p.length;n+=6){if(p[n]===0&&p[n+1]===0&&p[n+2]===0)continue;const surface=springRainSurface(p[n],p[n+2]);assert.ok(p[n+1]>=surface.height-.001,'Rain never appears beneath its support surface');if(surface.kind==='shelter')sheltered++;}
assert.ok(sheltered>0,'The test includes rainfall above the stall awning');
const before=p.slice();rain.update(1.1,camera,true);assert.notDeepEqual(p,before);rain.update(2,camera,false);assert.equal(rain.group.visible,false);rain.dispose();
console.log('Spring lake passed: first-bridge pill, deferred post-meal hunt, five-scrap bundle, no-loss full-storage swaps, grounded legacy containers, required bus clues, timed dream, rainy return/reload and roof/deck/water rain clipping.');
