import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';

const {createSummerState,validateSummerSave,SUMMER_SAVE_KEY,summerDepartureMissing,summerDiveMissing,summerJournal,summerObjective}=await import(await typescriptUrl(new URL('../app/shrine-void/summer-state.ts',import.meta.url)));
const memory=()=>{const saves=new Map();return {saves,getItem:key=>saves.get(key)??null,setItem:(key,value)=>saves.set(key,value)};};
const act=(game,action,value)=>assert.equal(game.act(action,value),true,`${action}: ${game.message}`);
const chart={pieces:[{tray:0,turn:0,x:0,y:0},{tray:1,turn:0,x:0,y:0}],north:0};
const prep=['inspect-console','stow-bag','take-fuel-can','open-cap','fit-spout','pour-fuel','replace-cap','connect-hose','return-fuel-can','wear-wetsuit','equip-bcd','check-gear','stow-gear'];
function prepare(game){act(game,'take-chart',0);act(game,'take-chart',1);act(game,'assemble-chart',chart);for(const action of prep)act(game,action);}
function dive(game){act(game,'board');act(game,'start-engine');act(game,'moor');act(game,'stop-engine');for(const action of ['lower-ladder','fit-mask','fit-fins','inspect-gear','enter-water'])act(game,action);act(game,'set-mode','swimming');}
function garden(game){for(let i=1;i<=3;i++)act(game,'inspect-frame',i);act(game,'solve-observation',['FAN','BRANCH','MOUND']);}
function rest(game){act(game,'open-route-board');act(game,'record-route',['B','A','C']);act(game,'reach-rest');act(game,'take-rest-plate');}
function lift(game){act(game,'route-cable',['ANCHOR','LOAD','TOP','DRUM']);act(game,'crank',.75);act(game,'crank',.75);act(game,'release-catch');for(let i=0;i<8;i++)act(game,'crank',.75);act(game,'pin-carriage');act(game,'take-winch-plate');}
const solvedTiles=[{id:'P1',turn:0},{id:'P2',turn:0},{id:'P3',turn:0}];

const store=memory();let game=createSummerState(store);
for(const action of ['start-engine','enter-water','solve-observation','take-rest-plate','release-catch','pin-carriage','release-cassette','recover-case','place-case','open-case','read-letter','take-book'])assert.equal(game.act(action),false,`${action} cannot award early progress`);
assert.ok(summerDepartureMissing(game.state).length);assert.ok(summerDiveMissing(game.state).length);
act(game,'read-note');act(game,'take-chart',0);
game=createSummerState(store);assert.deepEqual(game.state.chartPieces,[true,false]);
act(game,'take-chart',1);for(const attempt of [{...chart,north:1},{pieces:null,north:0},{pieces:[null,null],north:0},{pieces:[],north:0},{}])assert.equal(game.act('assemble-chart',attempt),false);act(game,'assemble-chart',chart);
for(const action of prep){act(game,action);const snapshot=JSON.parse(store.saves.get(SUMMER_SAVE_KEY));game=createSummerState(store);for(const field of Object.keys(snapshot))if(snapshot[field]===true)assert.equal(game.state[field],true,`${field} survives a preparation refresh`);}
for(const action of ['pour-fuel','replace-cap','connect-hose','return-fuel-can'])act(game,action);
assert.equal(summerDepartureMissing(game.state).length,0,'Repeated fuel actions are idempotent');
act(game,'board');act(game,'start-engine');
game=createSummerState(store);assert.equal(game.state.engineRunning,false);assert.equal(game.state.boatAnchor,'berth');assert.notEqual(game.state.mode,'boating','Reload never leaves a moving boat');
act(game,'board');act(game,'start-engine');act(game,'moor');
assert.equal(game.act('enter-water'),false,'A running engine and unfitted gear block entry');act(game,'stop-engine');
for(const action of ['lower-ladder','fit-mask','fit-fins','inspect-gear'])act(game,action);
const beforeEntry=game.state;act(game,'enter-water');assert.equal(beforeEntry.lastUnderwaterPost,'U0','Actions leave previous snapshots unchanged');
act(game,'set-mode','swimming');assert.equal(summerDiveMissing(game.state).length,0);
for(let i=1;i<=3;i++)act(game,'training-post',i);
assert.equal(game.act('solve-observation',['MOUND','TABLE','FAN']),false);garden(game);
assert.ok(summerJournal(game.state).some(entry=>entry.title==='Reef stop 2'&&entry.body.includes('BRANCH')));
game=createSummerState(store);assert.equal(game.state.mode,'swimming');assert.equal(game.state.checkpoint,'U1');assert.deepEqual(game.state.plates,['P1']);
assert.equal(game.act('record-route',['B','A','C']),false,'The fitting handle must unfold the board');act(game,'open-route-board');assert.equal(game.act('record-route',['B','B','C']),false);rest(game);
assert.equal(game.act('release-catch'),false);assert.equal(game.act('route-cable',['ANCHOR','SPARE','TOP','DRUM']),false);
act(game,'route-cable',['ANCHOR','LOAD','TOP','DRUM']);act(game,'crank',.75);
game=createSummerState(store);assert.equal(game.state.tension,0,'A partial tension animation is transient');assert.equal(game.state.cableRouted,true);
act(game,'crank',.75);act(game,'crank',.75);assert.equal(game.state.cableSupported,true);
game=createSummerState(store);assert.equal(game.state.tension,1);assert.equal(game.state.cableSupported,true,'Completed support is a stable endpoint');
act(game,'release-catch');act(game,'crank',.75);game=createSummerState(store);assert.equal(game.state.crankSeconds,0,'Interrupted raising resumes at the supported endpoint');assert.equal(game.state.catchReleased,true);
for(let i=0;i<8;i++)act(game,'crank',.75);act(game,'pin-carriage');act(game,'take-winch-plate');
act(game,'reset-cable');game=createSummerState(store);assert.ok(game.state.plates.includes('P3'),'A collected plate survives resetting and reloading its mechanism');
lift(game);assert.deepEqual([...game.state.plates].sort(),['P1','P2','P3']);act(game,'take-winch-plate');assert.equal(game.state.plates.length,3);
assert.equal(game.act('preview-cassette',[{id:'P1',turn:0},{id:'P1',turn:0},{id:'P3',turn:0}]),false,'A plate cannot occupy two slots');
assert.equal(game.act('release-cassette',[...solvedTiles].reverse()),false);act(game,'preview-cassette',solvedTiles);game=createSummerState(store);assert.deepEqual(game.state.cassetteTiles,[null,null,null],'Uncommitted tile previews are transient');
act(game,'release-cassette',solvedTiles);act(game,'recover-case');act(game,'recover-case');assert.equal(game.state.caseLocation,'harness');
assert.equal(game.act('open-case'),false,'The underwater case remains latched');
for(const checkpoint of ['U0','U1','U2','REST','U3','U4']){act(game,'checkpoint',checkpoint);game=createSummerState(store);assert.equal(game.state.checkpoint,checkpoint);assert.equal(game.state.lastUnderwaterPost,checkpoint);assert.equal(game.state.mode,'swimming');assert.equal(game.state.caseLocation,'harness');assert.deepEqual([...game.state.plates].sort(),['P1','P2','P3']);}
act(game,'recover','post');assert.equal(game.state.checkpoint,'U4');act(game,'recover','boat');assert.equal(game.state.checkpoint,'B2');assert.equal(game.state.caseLocation,'boat');
game=createSummerState(store);assert.equal(game.state.mode,'mooring');const beforeReentry=game.state;act(game,'enter-water');assert.equal(beforeReentry.lastUnderwaterPost,'U4','Re-entry cannot mutate a previous saved snapshot');act(game,'set-mode','swimming');act(game,'checkpoint','U4');act(game,'recover','boat');act(game,'recover','post');assert.equal(game.state.mode,'swimming');assert.equal(game.state.caseLocation,'harness');
act(game,'climb-ladder');act(game,'remove-fins');act(game,'start-engine');act(game,'release-mooring');act(game,'dock');act(game,'disembark');act(game,'remove-gear');act(game,'place-case');
game=createSummerState(store);assert.equal(game.state.checkpoint,'S1');assert.equal(game.state.caseLocation,'table');
act(game,'open-latch',0);assert.equal(game.act('open-case'),false);game=createSummerState(store);assert.deepEqual(game.state.caseLatches,[true,false]);act(game,'open-latch',1);act(game,'open-case');act(game,'read-letter');act(game,'take-book');
game=createSummerState(store);assert.ok(game.state.caseOpened&&game.state.letterOpened&&game.state.bookUnlocked);

// An early return is safe and keeps discoveries, without manufacturing a case.
const early=createSummerState();prepare(early);dive(early);garden(early);act(early,'recover','island');assert.equal(early.state.boatAnchor,'berth');assert.equal(early.state.checkpoint,'S3');assert.equal(early.state.caseRecovered,false);assert.deepEqual(early.state.plates,['P1']);assert.equal(early.act('place-case'),false);
for(const checkpoint of ['S0','S3','B0','S1']){act(game,'checkpoint',checkpoint);assert.equal(createSummerState(store).state.checkpoint,checkpoint);}

// The console follows the physical journey: engine and equipment controls are
// aboard, a moving boat cannot disembark, and the return channel has a dock step.
const underway=createSummerState();prepare(underway);
assert.equal(underway.act('start-engine'),false,'Completing preparation does not start the boat from shore');
act(underway,'board');act(underway,'start-engine');assert.equal(underway.act('disembark'),false,'Step ashore cannot teleport from an underway boat');
act(underway,'moor');act(underway,'stop-engine');for(const action of ['lower-ladder','fit-mask','fit-fins','inspect-gear','enter-water'])act(underway,action);act(underway,'set-mode','swimming');
for(const action of ['start-engine','stop-engine','remove-fins','fit-mask','fit-fins','inspect-gear','enter-water','release-mooring'])assert.equal(underway.act(action),false,`${action} cannot operate the boat from underwater`);
assert.equal(underway.state.mode,'swimming');assert.equal(underway.state.finsFitted,true);
act(underway,'climb-ladder');act(underway,'remove-fins');act(underway,'start-engine');act(underway,'release-mooring');act(underway,'stop-engine');act(underway,'start-engine');
assert.equal(underway.state.mode,'boating','Restarting in the return channel keeps the underway controls');
act(underway,'dock');act(underway,'disembark');assert.equal(underway.state.mode,'walking');assert.equal(underway.state.boatAnchor,'berth');

// A second trip must put the removed equipment back on, including after reload.
const replayStore=memory();let replay=createSummerState(replayStore);prepare(replay);dive(replay);act(replay,'recover','island');act(replay,'remove-gear');
replay=createSummerState(replayStore);assert.equal(replay.state.gearRemoved,true,'Removing equipment on an early safe return survives refresh');
assert.ok(summerDepartureMissing(replay.state).some(message=>message.includes('wetsuit')));
act(replay,'board');assert.equal(replay.act('start-engine'),false,'A stored equipment milestone cannot hide the missing worn suit');act(replay,'disembark');act(replay,'wear-wetsuit');
assert.equal(replay.state.gearRemoved,false);act(replay,'board');act(replay,'start-engine');

// Corruption sanitizes conservatively, and unrelated season saves remain intact.
assert.equal(validateSummerSave(null),null);assert.equal(validateSummerSave({version:2,bookUnlocked:true}),null);
const impossible=validateSummerSave({version:1,bookUnlocked:true,caseOpened:true,letterOpened:true,caseRecovered:true,plates:['P1','P1','P2','P3','bad'],checkpoint:'U4',boatAnchor:'mooring',engineRunning:true,hints:{chart:100,current:-3,cable:NaN}});
assert.equal(impossible.caseRecovered,false);assert.equal(impossible.bookUnlocked,false);assert.equal(impossible.caseOpened,false);assert.equal(impossible.boatAnchor,'berth');assert.equal(impossible.checkpoint,'S3');assert.deepEqual(impossible.plates,[]);assert.equal(impossible.hints.chart,3);assert.equal(impossible.hints.current,0);
for(const raw of ['broken JSON','null','[]',JSON.stringify({version:8,bookUnlocked:true})]){const broken=memory();broken.saves.set(SUMMER_SAVE_KEY,raw);const fresh=createSummerState(broken);assert.equal(fresh.state.bookUnlocked,false);assert.ok(fresh.state.saveNotice);assert.equal(fresh.storageAvailable,true,'Corrupt content cannot make working storage unavailable');act(fresh,'read-note');}
const blocked=createSummerState({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});assert.equal(blocked.storageAvailable,false);act(blocked,'read-note');assert.match(blocked.state.saveNotice,/cannot be saved/);
const writeBlocked=createSummerState({getItem:()=>null,setItem(){throw Error('quota');}});act(writeBlocked,'read-note');assert.equal(writeBlocked.storageAvailable,false);assert.equal(writeBlocked.state.noteRead,true);
const legacy=memory();const legacyKey='between-seasons-relic-summer-v1';legacy.saves.set(legacyKey,JSON.stringify({bookTaken:true}));legacy.saves.set('between-seasons-spring-v1','untouched');
let reader=createSummerState(legacy);assert.equal(reader.state.bookUnlocked,true);assert.equal(reader.state.legacyBookUnlocked,true);assert.equal(reader.state.caseRecovered,false);assert.deepEqual(reader.state.plates,[]);act(reader,'preferences',{reducedMotion:true,sound:false});act(reader,'reset');reader=createSummerState(legacy);assert.equal(reader.state.bookUnlocked,true);assert.equal(reader.state.chartAssembled,false);assert.deepEqual(reader.state.preferences,{reducedMotion:true,sound:false});assert.equal(legacy.saves.get('between-seasons-spring-v1'),'untouched');assert.equal(JSON.parse(legacy.saves.get(legacyKey)).bookTaken,true);
act(game,'reset');assert.equal(game.state.bookUnlocked,true,'Restarting the trail preserves already earned reader access');assert.equal(game.state.caseRecovered,false);assert.equal(game.state.chartAssembled,false);assert.deepEqual(game.state.plates,[]);
for(const id of ['chart','preparation','observation','current','cable','cassette']){for(let i=0;i<4;i++)act(game,'hint',id);assert.equal(game.state.hints[id],3);assert.ok(game.message);}

// Follow the surfaced next clue through a complete visit with interrupted dives.
// Saved puzzle milestones must not send a player on shore straight to the wreck.
const guided=createSummerState();
assert.match(summerObjective(guided.state).detail,/beach table/);
act(guided,'take-chart',0);assert.match(summerObjective(guided.state).detail,/lookout/);
act(guided,'take-chart',1);assert.match(summerObjective(guided.state).detail,/shelter table/);
act(guided,'assemble-chart',chart);assert.match(summerObjective(guided.state).detail,/dry bag/);
for(const action of prep)act(guided,action);
assert.match(summerObjective(guided.state).detail,/Board/);dive(guided);
assert.match(summerObjective(guided.state).detail,/bottle/);act(guided,'read-bottle');
assert.match(summerObjective(guided.state).detail,/reef garden/);garden(guided);
assert.equal(summerObjective(guided.state).title,'The captain’s passage');
act(guided,'recover','boat');assert.match(summerObjective(guided.state).detail,/Enter beside the descent rope/);
act(guided,'enter-water');act(guided,'set-mode','swimming');rest(guided);
assert.equal(summerObjective(guided.state).title,'The cargo windlass');lift(guided);
assert.equal(summerObjective(guided.state).title,'Put the day together');
act(guided,'reset-cable');assert.equal(summerObjective(guided.state).title,'The cargo windlass','Unpinned keeper access directs back to the winch even with all three plates');
lift(guided);act(guided,'recover','island');act(guided,'remove-gear');
assert.match(summerObjective(guided.state).detail,/wetsuit/,'After an early return the next clue first restores worn gear');
act(guided,'wear-wetsuit');assert.match(summerObjective(guided.state).detail,/Board/);
dive(guided);act(guided,'release-cassette',solvedTiles);
assert.match(summerObjective(guided.state).detail,/Clip/);act(guided,'recover-case');
assert.match(summerObjective(guided.state).detail,/ascend beside the boat/);
act(guided,'recover','island');assert.match(summerObjective(guided.state).detail,/equipment to the shelter/);
act(guided,'remove-gear');assert.match(summerObjective(guided.state).detail,/beach table/);
act(guided,'place-case');assert.match(summerObjective(guided.state).detail,/latches/);
for(const index of [0,1])act(guided,'open-latch',index);act(guided,'open-case');act(guided,'read-letter');
assert.equal(summerObjective(guided.state).stage,8);assert.match(summerObjective(guided.state).detail,/blue Summer book/);
console.log('Summer state passed: full guided eight-act progression, interrupted dives, keeper reset guidance, invalid/duplicate actions, stable checkpoints, inventory/recovery, saves/migration/reset and hints.');
