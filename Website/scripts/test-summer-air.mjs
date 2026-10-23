import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';

const {createSummerState,SUMMER_SAVE_KEY,validateSummerSave}=await import(await typescriptUrl(new URL('../app/shrine-void/summer-state.ts',import.meta.url)));
const {summerAirTime}=await import(await typescriptUrl(new URL('../app/shrine-void/summer-air.ts',import.meta.url)));
const saves=new Map(),storage={getItem:key=>saves.get(key)??null,setItem:(key,value)=>saves.set(key,value)};
const game=createSummerState(storage),act=(action,value)=>assert.equal(game.act(action,value),true,game.message);
assert.equal(game.act('refill-air'),false);
act('take-chart',0);act('take-chart',1);act('assemble-chart',{pieces:[{tray:0,turn:0,x:0,y:0},{tray:1,turn:0,x:0,y:0}],north:0});
for(const action of ['inspect-console','stow-bag','take-fuel-can','open-cap','fit-spout','pour-fuel','replace-cap','connect-hose','return-fuel-can','wear-wetsuit','equip-bcd','check-gear','stow-gear','board','start-engine','moor','stop-engine','lower-ladder','fit-mask','fit-fins','inspect-gear','enter-water'])act(action);
act('set-mode','swimming');act('read-bottle');act('solve-observation',['FAN','BRANCH','MOUND']);
const advance=(seconds,hz=60)=>{for(let frame=0;frame<seconds*hz;frame++)game.tickAir(1/hz,true);};
advance(30);assert.ok(Math.abs(game.state.airSeconds-270)<=1,'Air follows elapsed active time');
const before=game.state.airSeconds;
for(let frame=0;frame<600;frame++){game.tickAir(.1,true,true);game.tickAir(.1,false);}
assert.equal(game.state.airSeconds,before,'Reading, pauses and the surface do not use air');
assert.equal(game.act('refill-air'),false,'A submerged player cannot refill');
const restored=createSummerState(storage);assert.equal(restored.state.airSeconds,before,'Reloading keeps the remaining supply');
advance(182);assert.ok(game.state.airSeconds<=90&&game.message.includes('90 seconds'));
advance(46);assert.ok(game.state.airSeconds<=45&&game.message.includes('Air low'));
advance(30);assert.ok(game.state.airSeconds<=15&&game.message.includes('Reserve air'));
advance(15);assert.equal(game.state.airSeconds,0);assert.equal(game.state.mode,'mooring','Exhaustion recovers aboard');assert.deepEqual(game.state.plates,['P1']);assert.equal(game.state.bottleRead,true);
assert.equal(game.act('enter-water'),false,'An empty cylinder blocks another dive');
act('refill-air');assert.equal(game.state.airSeconds,300);assert.equal(game.state.finalGearChecked,false);act('inspect-gear');act('enter-water');act('set-mode','swimming');
advance(1,30);assert.ok(game.state.airSeconds>=298&&game.state.airSeconds<=299);
act('recover','island');act('remove-gear');assert.equal(game.state.gearRemoved,true,'An early return can remove the suit without retrieving the case');
const legacy=JSON.parse(saves.get(SUMMER_SAVE_KEY));delete legacy.airSeconds;assert.equal(validateSummerSave(legacy).airSeconds,300);
for(const value of [-10,Infinity,NaN,'300']){const save=validateSummerSave({...legacy,airSeconds:value});assert.ok(save.airSeconds>=0&&save.airSeconds<=300);}
assert.equal(summerAirTime(300),'5:00');assert.equal(summerAirTime(9),'0:09');
console.log('Summer air: active time, pauses, surfacing, warnings, persisted supply, rescue, deck-only refill, re-entry, legacy migration and early suit removal passed.');
