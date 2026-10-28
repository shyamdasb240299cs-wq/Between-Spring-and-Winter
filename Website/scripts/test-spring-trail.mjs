import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return n(s+'.ts',c);throw e;}}});
const {createSpringTreasureState,SPRING_SAVE_KEY,SPRING_HOTBAR,SPRING_FOOD_COUNTS,SPRING_EAT_MS,springHeldItem,springRemaining,springShadowChanged}=await import('../app/shrine-void/spring-treasure-state.ts');
let clock=10000;const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
saved.set('between-spring-rambutan-v2',JSON.stringify({version:3,rambutanEaten:8,keyTaken:true,introStep:2}));
let game=createSpringTreasureState(storage,()=>clock);
assert.equal(game.state.foodEaten.basket,0,'This release resets the old eaten rambutan save');assert.equal(game.state.introStep,0);assert.equal(game.state.keyTaken,false);
let previous=game.state;game.act('intro-next');assert.equal(springShadowChanged(previous,game.state),false,'Dialogue must not rebuild landscape shadows');
previous=game.state;game.act('take-item','mangoes');assert.equal(springShadowChanged(previous,game.state),true,'Picking food updates the table shadow');
previous=game.state;game.act('eat-held');assert.equal(springShadowChanged(previous,game.state),false,'Eating floating food must not rebuild landscape shadows');clock+=SPRING_EAT_MS+1;
previous=game.state;assert.equal(game.act('select-slot',0),false,'A two-hand serving cannot enter inventory');assert.equal(springShadowChanged(previous,game.state),false);assert.equal(game.state.storageSlots.includes('mangoes'),false);assert.equal(springHeldItem(game.state),'mangoes');
previous=game.state;game.act('return-held');assert.equal(springShadowChanged(previous,game.state),true);game.act('reset');
for(const action of ['take-key','eat-held','unlock-door','visit-river'])assert.equal(game.act(action),false);
assert.ok(game.act('take-item','basket'));assert.equal(springHeldItem(game.state),'basket');
for(let n=0;n<8;n++){assert.equal(game.act('take-key'),false);assert.ok(game.act('eat-held'));assert.equal(game.act('eat-held'),false,'Held key repeats cannot consume multiple portions');assert.equal(game.act('select-slot',0),false,'Eating animation completes before switching hands');clock+=SPRING_EAT_MS+1;}
assert.equal(game.act('eat-held'),false);assert.ok(game.act('take-key'));assert.ok(game.state.inventory.includes('key'));assert.equal(springHeldItem(game.state),'basket','Taking a key does not silently equip it');assert.equal(game.act('unlock-door'),false);
assert.ok(game.act('read-door-note'));assert.equal(springHeldItem(game.state),null);game.act('put-paper');game.act('select-slot',8);assert.equal(springHeldItem(game.state),'key');assert.ok(game.act('unlock-door'));assert.ok(game.act('visit-river'));
for(const item of SPRING_HOTBAR){if(!item||item==='key'||item==='basket')continue;game.act('select-slot',0);assert.ok(game.act('take-item',item));assert.equal(springHeldItem(game.state),item);for(let n=0;n<SPRING_FOOD_COUNTS[item];n++){assert.ok(game.act('eat-held'),item+' has a physical portion');clock+=SPRING_EAT_MS+1;}assert.equal(springRemaining(game.state,item),0);assert.equal(game.act('eat-held'),false);assert.ok(game.act('return-held'));assert.equal(game.state.inventory.includes(item),false);}
game.act('select-slot',8);game=createSpringTreasureState(storage,()=>clock);assert.equal(springHeldItem(game.state),'key');assert.ok(game.state.doorUnlocked&&game.state.riverVisited);assert.equal(game.state.eatRevision,0,'Reload cannot replay an old eating animation');
const legacy=new Map([[SPRING_SAVE_KEY,JSON.stringify({version:2,rambutanEaten:4,introStep:5,noteRead:true})]]);const migrated=createSpringTreasureState({getItem:k=>legacy.get(k)??null,setItem(){}},()=>clock);assert.equal(migrated.state.foodEaten.basket,4);assert.equal(migrated.state.introStep,2);assert.equal(springHeldItem(migrated.state),null);
const bad=JSON.stringify({version:3,foodEaten:{basket:999,grapes:-3},inventory:['key','unknown','basket','basket'],selectedSlot:999});const safe=createSpringTreasureState({getItem:()=>bad,setItem(){}},()=>clock);assert.equal(safe.state.foodEaten.basket,8);assert.equal(safe.state.foodEaten.grapes,0);assert.deepEqual(safe.state.inventory,[]);assert.equal(springHeldItem(safe.state),null);
game.setGuard(action=>action!=='return-held');game.act('select-slot',1);assert.equal(game.act('return-held'),false,'Distance guard prevents remote returns');
console.log('Spring inventory passed: all foods, cooldown, finite portions, paper in hands, manual key equip, saved hotbar and legacy migration.');
