import assert from 'node:assert/strict';
import { typescriptUrl } from './load-typescript.mjs';
const { createSeasonTravel } = await import(await typescriptUrl(new URL('../app/shrine-void/season-navigation.ts', import.meta.url)));
const {createSeasonLayout,groundHeight,autumnLakeDistance,AUTUMN_LAKE_LEVEL,AUTUMN_WADING_DEPTH,SUMMER_WADING_DEPTH}=await import(await typescriptUrl(new URL('../app/shrine-void/season-layout.ts',import.meta.url)));
const make = () => ({ origin: [-10, -10], cell: .5, width: 41, depth: 41, heights: Array(41 * 41).fill(0), spawn: { x: 0, z: 0, yaw: 0 } });
function advance(c, seconds, hz = 60) { for (let i = 0; i < seconds * hz; i++) c.update(1 / hz); }
const idle = createSeasonTravel(make()); advance(idle, 3); assert.equal(idle.state.z, 0);
const a = createSeasonTravel(make()), b = createSeasonTravel(make());
for (const [c, hz] of [[a, 30], [b, 120]]) { c.key('w', true); advance(c, 2, hz); c.key('w', false); advance(c, 1, hz); }
assert.ok(Math.abs(a.state.z - b.state.z) < .02, 'Walking speed must be independent of refresh rate');
const stopped = a.state.z; advance(a, 1); assert.ok(Math.abs(a.state.z - stopped) < .001);
const touch = createSeasonTravel(make()); touch.joystick(1, -1); advance(touch, 1); assert.ok(touch.state.x > 1 && touch.state.z < -1); touch.block(true); const pose = [touch.state.x, touch.state.z]; touch.key('w', true); advance(touch, 2); touch.block(false); advance(touch, 1); assert.deepEqual([touch.state.x, touch.state.z], pose, 'Blocked movement cannot resume from stale input');
const edge = createSeasonTravel(make()); edge.key('w', true); advance(edge, 20); assert.ok(edge.state.z > -9.73, 'Body must not cross world boundary');
const wallNav = make(); for (let z = 0; z < 41; z++) wallNav.heights[z * 41 + 23] = null;
const wall = createSeasonTravel(wallNav); wall.key('d', true); wall.key('w', true); advance(wall, 2); assert.ok(wall.state.x < 1.01 && wall.state.z < -3, 'Walls block and permit sliding along their surface');
const cliffNav = make(); for (let z = 0; z < 18; z++) for (let x = 0; x < 41; x++) cliffNav.heights[z * 41 + x] = -5;
const cliff = createSeasonTravel(cliffNav); cliff.key('w', true); advance(cliff, 5); assert.ok(cliff.state.z > -1.6, 'Cliff edge cannot be crossed');
const slopeNav = make(); slopeNav.heights = slopeNav.heights.map((_, i) => Math.floor(i / 41) * .1);
const slope = createSeasonTravel(slopeNav); slope.key('w', true); advance(slope, 1); assert.ok(slope.state.y < 3.63 && slope.state.y > 2.9, 'Eye height follows a gentle slope');
assert.throws(() => createSeasonTravel({ ...make(), heights: [] }), /Invalid/);
assert.throws(() => createSeasonTravel({ ...make(), spawn: { x: 100, z: 100, yaw: 0 } }), /spawn/);
const lakeStops=[];
for(const hz of [30,60,120]){
 const nav=createSeasonLayout('autumn').navigation,visitor=createSeasonTravel(nav);visitor.key('w',true);
 for(let i=0;i<20*hz;i++){
  visitor.update(1/hz);
  assert.ok(groundHeight('autumn',visitor.state.x,visitor.state.z)>=AUTUMN_LAKE_LEVEL-AUTUMN_WADING_DEPTH-.005,'Walking must stop before the deep lake basin');
  assert.ok(visitor.state.y>AUTUMN_LAKE_LEVEL+.9,'The visitor stays above the lake while wading');
 }
 assert.ok(autumnLakeDistance(visitor.state.x,visitor.state.z)<.9,'The central path must lead into the shallows at every refresh rate');lakeStops.push(visitor.state.z);
 assert.ok(visitor.state.y-1.63<AUTUMN_LAKE_LEVEL-.25,'Wading follows the submerged lake bed');
 visitor.key('w',false);visitor.key('s',true);advance(visitor,4,hz);visitor.key('s',false);assert.ok(visitor.state.y-1.63>AUTUMN_LAKE_LEVEL,'Visitors can walk back onto the bank');
 visitor.key('w',true);advance(visitor,8,hz);
 // Continue trying to move diagonally along the bank, including around its irregular corners.
 visitor.key('a',true);advance(visitor,6,hz);visitor.key('a',false);visitor.key('d',true);advance(visitor,12,hz);
 assert.ok(groundHeight('autumn',visitor.state.x,visitor.state.z)>=AUTUMN_LAKE_LEVEL-AUTUMN_WADING_DEPTH-.005,'Sliding around the bank must preserve the deep-water boundary');
}
assert.ok(Math.max(...lakeStops)-Math.min(...lakeStops)<.04,'Lake-bank stopping distance remains consistent across refresh rates');
const seaStops=[];
for(const hz of [30,60,120]){
 const visitor=createSeasonTravel(createSeasonLayout('summer').navigation),dryEye=visitor.state.y;visitor.key('w',true);
 for(let i=0;i<24*hz;i++){visitor.update(1/hz);assert.ok(groundHeight('summer',visitor.state.x,visitor.state.z)>=-SUMMER_WADING_DEPTH-.005,'Ocean wading stops before deep water');}
 assert.ok(visitor.state.y<dryEye-.75,'The camera must sink with the underwater sand');
 assert.ok(visitor.state.y-1.63<-1.15,'Visitors can reach chest/shoulder-deep water');
 assert.ok(visitor.state.y>.28&&visitor.state.y<.52,'The sea is close to eye level without submerging the camera');seaStops.push(visitor.state.z);
 visitor.key('w',false);visitor.key('s',true);advance(visitor,10,hz);assert.ok(visitor.state.y-1.63>.1,'Visitors can return across the wider shallows to dry sand');
}
assert.ok(Math.max(...seaStops)-Math.min(...seaStops)<.04,'Ocean wading is stable at every refresh rate');
console.log('Season navigation passed: refresh rates, stopping, joystick, stale input, boundaries, wall sliding, cliffs, slopes, invalid spawn, lake entry, wading depth and return to shore.');

const turns=[];
for(const hz of [30,60,120]){const visitor=createSeasonTravel(make());visitor.look(100,-40);advance(visitor,.5,hz);turns.push(visitor.state.yaw);assert.ok(Math.abs(visitor.state.yaw+.3)<.00001);assert.ok(Math.abs(visitor.state.pitch-.06)<.00001);visitor.look(100,100);visitor.resetInput();const yaw=visitor.state.yaw;advance(visitor,.5,hz);assert.equal(visitor.state.yaw,yaw,'Blur must clear pending look inertia');}
assert.ok(Math.max(...turns)-Math.min(...turns)<.00001,'Damped look is refresh-rate independent');
console.log('Damped pointer look and blur clearing passed.');
