import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';
const load=async name=>import(await typescriptUrl(new URL(`../app/shrine-void/${name}.ts`,import.meta.url)));
const [{createSeasonLayout,surfaceAt},{createSeasonTravel},summer]=await Promise.all(['season-layout','season-navigation','summer-layout'].map(load));
const {SUMMER_PONDS,SUMMER_FOREST_PATHS,SUMMER_WADING_DEPTH,summerGroundHeight,summerPondDistance,summerForestPathDistance,summerForestBlend,summerIslandDistance,summerWaterLevel}=summer;
const layout=createSeasonLayout('summer'),nav=layout.navigation;
const forest=layout.trees.filter(t=>t.variant!==0),palms=layout.trees.filter(t=>t.variant===0);
assert.ok(forest.length>=80,'The island interior must retain a dense broadleaf forest');
assert.ok(palms.length>=35,'Coconut palms must retain a substantial coastal perimeter');
assert.ok(forest.every(t=>summerIslandDistance(t.x,t.z)<.68),'Broadleaf trees stay in the moist interior');
assert.ok(palms.every(t=>summerIslandDistance(t.x,t.z)>=.68),'Palms stay outside the broadleaf interior');
assert.ok(layout.trees.every(t=>summerForestPathDistance(t.x,t.z)>=2.1&&summerPondDistance(t.x,t.z)>=1.28),'Trunks leave clear paths and freshwater banks');

// Follow each actual route with the production walking capsule, including its
// baked tree/prop/post obstacles and slope limits, at common display rates.
for(const hz of [30,60,120])for(const [from,to] of SUMMER_FOREST_PATHS){
  const visitor=createSeasonTravel({...nav,spawn:{...from,yaw:0}},undefined,summerWaterLevel);
  visitor.key('w',true);
  for(let frame=0;frame<hz*60&&Math.hypot(visitor.state.x-to.x,visitor.state.z-to.z)>.20;frame++){
    visitor.state.yaw=Math.atan2(visitor.state.x-to.x,visitor.state.z-to.z);visitor.update(1/hz);
  }
  assert.ok(Math.hypot(visitor.state.x-to.x,visitor.state.z-to.z)<=.20,`${hz} Hz forest route from (${from.x},${from.z}) to (${to.x},${to.z}) is walkable with body clearance`);
}

const advance=(controller,seconds,hz)=>{for(let frame=0;frame<seconds*hz;frame++)controller.update(1/hz);};
for(const pond of SUMMER_PONDS){
  const floor=summerGroundHeight(pond.x,pond.z);
  assert.ok(summerForestBlend(pond.x,pond.z)>.9,'Freshwater pool sits within the forest');
  assert.equal(summerWaterLevel(pond.x,pond.z),pond.level,'Wading queries use the visible freshwater level');
  assert.equal(surfaceAt('summer',pond.x,pond.z),'water');
  assert.ok(pond.level-floor>.4&&pond.level-floor<SUMMER_WADING_DEPTH,'The pool is shallow enough to wade, with a visible submerged basin');
  const at=createSeasonTravel({...nav,spawn:{x:pond.x,z:pond.z,yaw:0}},undefined,summerWaterLevel);
  assert.ok(Math.abs(at.state.y-floor-1.63)<.015,'Eye height follows the actual pool bed');
  // The same basin with its water query disabled exposes whether freshwater
  // is incorrectly treated as dry land because it is above sea level.
  const dry=createSeasonTravel({...nav,spawn:{x:pond.x,z:pond.z,yaw:0}}),wet=createSeasonTravel({...nav,spawn:{x:pond.x,z:pond.z,yaw:0}},undefined,summerWaterLevel);
  for(const visitor of [dry,wet]){visitor.key('w',true);advance(visitor,.5,60);}
  assert.ok(Math.abs(wet.state.z-pond.z)<Math.abs(dry.state.z-pond.z)*.88,'Freshwater wading slows movement instead of using dry-ground speed');
  const exits=[];
  for(const hz of [30,60,120]){
    const visitor=createSeasonTravel({...nav,spawn:{x:pond.x,z:pond.z,yaw:0}},undefined,summerWaterLevel);
    visitor.key('w',true);advance(visitor,2.5,hz);visitor.key('w',false);
    assert.ok(visitor.state.z<pond.z-pond.radiusZ,'The visitor can leave the pool across the gently sloped bank');
    assert.ok(visitor.state.y-1.63>pond.level,'The visitor reaches dry forest soil after wading out');exits.push(visitor.state.z);
    visitor.resetInput();visitor.state.yaw=Math.PI;visitor.key('w',true);
    for(let frame=0;frame<hz*5&&visitor.state.z<pond.z-.10;frame++)visitor.update(1/hz);
    assert.ok(Math.abs(visitor.state.z-pond.z)<.12,'The visitor can walk back down into the freshwater basin');
    assert.ok(visitor.state.y>pond.level+.9,'The camera stays above the shallow pool surface');
  }
  assert.ok(Math.max(...exits)-Math.min(...exits)<.025,'Freshwater entry and bank traversal are consistent at 30/60/120 Hz');
}
console.log(`Summer forest passed: ${forest.length} broadleaf trees, ${palms.length} perimeter palms, ${SUMMER_FOREST_PATHS.length} capsule-clear routes and ${SUMMER_PONDS.length} freshwater pools with slowed wading, bank exits and returns at 30/60/120 Hz.`);
