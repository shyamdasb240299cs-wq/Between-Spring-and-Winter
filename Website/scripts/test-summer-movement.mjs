import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';
const load=async name=>import(await typescriptUrl(new URL(`../app/shrine-void/${name}.ts`,import.meta.url)));
const [{createSummerBoat,SUMMER_BOAT_SOCKETS},{createSummerSwim},{createSummerMovement,createSummerDeck},layout]=await Promise.all(['summer-boat','summer-swim','summer-movement','summer-layout'].map(load));
const {SUMMER_ANCHORS,SUMMER_ROUTE_POSTS,SUMMER_BOUNDS,summerGroundHeight}=layout;
const tick=(controller,seconds,hz=60)=>{for(let i=0;i<Math.round(seconds*hz);i++)controller.update(1/hz);};
const openBoat=()=>createSummerBoat({groundHeight:()=>-12,colliders:[]});
const openSwim=()=>createSummerSwim({groundHeight:()=>-30,colliders:[]});
const finite=controller=>assert.ok(['x','y','z','yaw','pitch','velocity'].every(key=>Number.isFinite(controller.state[key])), 'Controller pose must stay finite');
const position=controller=>[controller.state.x,controller.state.y,controller.state.z];

const boat=createSummerBoat(),swim=createSummerSwim();
assert.deepEqual(boat.pose,{...SUMMER_ANCHORS.berth,pitch:0},'Hull location stays independent of seated camera');
assert.equal(boat.state.x,SUMMER_ANCHORS.berth.x+SUMMER_BOAT_SOCKETS.helm.x);
assert.equal(boat.state.z,SUMMER_ANCHORS.berth.z+SUMMER_BOAT_SOCKETS.helm.z);
for(const [id,p]of Object.entries(SUMMER_ANCHORS))assert.ok(boat.canOccupy(p.x,p.z,p.yaw),`${id} boat anchor has hull and seabed clearance`);
for(const [id,p]of Object.entries(SUMMER_ROUTE_POSTS)){
  assert.ok(swim.canOccupy(p.x,p.y,p.z),`${id} route post has a whole swimmer capsule of clearance (bed ${summerGroundHeight(p.x,p.z)})`);
  swim.recover(id);assert.equal(swim.checkpoint,id);assert.deepEqual(position(swim),[p.x,p.y,p.z]);
}

// Exercise the authored route with the full hull/capsule at short intervals.
// Leave parallel to the jetty before turning toward the first channel buoy.
const boatRoute=[SUMMER_ANCHORS.berth,{x:49,z:-14},{x:72,z:-15},SUMMER_ANCHORS.dive];
for(let i=1;i<boatRoute.length;i++){
  const a=boatRoute[i-1],b=boatRoute[i],yaw=Math.atan2(a.x-b.x,a.z-b.z);
  for(let step=0;step<=100;step++){const t=step/100;assert.ok(boat.canOccupy(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,yaw),`Surface channel must admit the hull on leg ${i} at ${step}%`);}
}
const posts=Object.values(SUMMER_ROUTE_POSTS);
for(let i=1;i<posts.length;i++){
  const a=posts[i-1],b=posts[i];
  for(let step=0;step<=100;step++){const t=step/100,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=Math.max(a.y+(b.y-a.y)*t,summerGroundHeight(x,z)+1.55);assert.ok(swim.canOccupy(x,y,z),`Main sand corridor must admit the swimmer on leg ${i} at ${step}%`);}
}

// The same held input should move the same distance at common display rates.
const boatPos=[],swimPos=[];
for(const hz of [30,60,120]){
  const b=openBoat();b.release();b.key('w',true);tick(b,8,hz);boatPos.push(position(b));assert.ok(b.state.velocity<=4.001);
  const s=openSwim();s.key('w',true);tick(s,8,hz);swimPos.push(position(s));assert.ok(s.state.velocity<=1.301);
}
for(const positions of [boatPos,swimPos])for(const p of positions)assert.ok(Math.hypot(...p.map((v,i)=>v-positions[2][i]))<.015,'30/60/120 Hz movement remains frame-rate independent');
const reverse=openBoat();reverse.release();reverse.key('s',true);tick(reverse,8);assert.ok(reverse.state.velocity<=1.401);assert.ok(reverse.state.z>SUMMER_ANCHORS.berth.z);
const docking=openBoat();docking.setDocking(true);docking.release();docking.key('w',true);tick(docking,8);assert.ok(docking.state.velocity<=1.251);

// A very thin wall is never crossed, including a delayed frame. The player can
// slide along it or ascend above it without teleporting through its thickness.
for(const hz of [10,30,60,120]){
  const wall={id:'test-wall',kind:'box',x:106,z:-27,halfX:6,halfZ:.015,minY:-30,maxY:2};
  const s=createSummerSwim({groundHeight:()=>-30,colliders:[wall]});s.setPose({x:106,y:-5,z:-24,yaw:0});s.key('w',true);tick(s,8,hz);
  assert.ok(s.state.z>=-27+.015+.34-1e-6,`${hz} Hz swimmer cannot tunnel through wall`);assert.ok(s.state.boundary);s.key('d',true);const beforeX=s.state.x;tick(s,2,hz);assert.ok(s.state.x>beforeX+.5,'A stopped capsule can slide along a wall');
  const b=createSummerBoat({groundHeight:()=>-12,colliders:[{...wall,x:49,z:-14}]});b.release();b.key('w',true);tick(b,8,hz);
  assert.ok(b.pose.z>=-14+.015+2.95-1e-6,`${hz} Hz hull cannot tunnel through wall`);assert.ok(b.state.boundary);
}
const ceiling=openSwim();ceiling.vertical(true,false);tick(ceiling,25);assert.ok(ceiling.state.y<=.22);assert.ok(ceiling.state.y>-1);
const floor=createSummerSwim({groundHeight:()=>-8,colliders:[]});floor.vertical(false,true);tick(floor,15);assert.ok(floor.state.y>=-8+1.28-1e-5,'The full capsule stays above the seabed');
const dry=createSummerBoat({groundHeight:(x)=>x>52?0:-12,colliders:[]});dry.setPose({x:49,z:-8,yaw:-Math.PI/2});dry.release();dry.key('w',true);tick(dry,8);assert.ok(dry.pose.x<=52-2.95+.001,'The bow cannot ride onto dry land');
const unknownBed=createSummerBoat({groundHeight:x=>x>50?NaN:-12,colliders:[]});assert.equal(unknownBed.canOccupy(49,-8,-Math.PI/2),false,'Missing edge samples cannot be treated as clear water');

const hull={x:106,y:0,z:-24,yaw:Math.PI/4};const belowHull=createSummerSwim({groundHeight:()=>-30,colliders:[],hull:()=>hull});
assert.equal(belowHull.canOccupy(106,-.2,-24),false,'The swimmer cannot enter a rotated hull');assert.equal(belowHull.canOccupy(106,-2,-24),true,'The swimmer can pass below the hull');
assert.equal(swim.canOccupy(SUMMER_BOUNDS.maxX,-5,0),false);assert.equal(boat.canOccupy(SUMMER_BOUNDS.maxX,0,0),false);

// Camera look and wheel never become hidden thrust or vertical movement.
const look=openSwim();const originalY=look.state.y;look.look(80,-180);look.handleWheel(-1000);tick(look,1);assert.equal(look.state.y,originalY);assert.equal(look.state.velocity,0);
const lookBoat=openBoat();const heading=lookBoat.heading;lookBoat.look(100,0);tick(lookBoat,1);assert.equal(lookBoat.heading,heading);assert.notEqual(lookBoat.state.yaw,heading);
const stoppedBoat=openBoat();stoppedBoat.release(false);stoppedBoat.key('a',true);tick(stoppedBoat,2);assert.equal(stoppedBoat.heading,SUMMER_ANCHORS.berth.yaw,'An engine-off boat cannot turn under steering input');
const berthAssist=createSummerBoat();
assert.ok(berthAssist.setPose({x:54,z:-8,yaw:Math.PI/2}));assert.ok(berthAssist.canDockApproach(),'The open-water return approach admits a full hull alignment sweep');
assert.ok(berthAssist.setPose({x:47.7,z:-13.5,yaw:0}));assert.ok(berthAssist.canMoor('berth'),'An unsafe diagonal alignment can still be within the generous mooring radius');assert.equal(berthAssist.canDockApproach(),false,'Dock assist cannot cut diagonally through the timber jetty');
berthAssist.recover('dive');assert.equal(berthAssist.canDockApproach(),false,'Dock assist cannot pull the boat across the channel');

// The cockpit has its own solid floor and boundaries. Walking does not become throttle,
// and the authored stern entry clears the entire hull at either anchor heading.
for(const anchor of ['berth','dive']){
  const b=openBoat();b.recover(anchor);const deck=createSummerDeck(b),origin=b.pose;
  assert.ok(deck.canOccupy(deck.state.x,deck.state.z),'Boarding point is on the clear aft deck');
  const aisle=[{x:.38,y:0,z:1.56},{x:.23,y:0,z:1.28},{x:0,y:0,z:1.28},{x:0,y:0,z:.32}];
  for(let leg=1;leg<aisle.length;leg++)for(let step=0;step<=30;step++){const t=step/30,a=aisle[leg-1],p=aisle[leg],world=b.localPose({x:a.x+(p.x-a.x)*t,y:0,z:a.z+(p.z-a.z)*t});assert.ok(deck.canOccupy(world.x,world.z),`The clear aft deck connects to the aisle between the two seats (${anchor} leg ${leg}, step ${step})`);}
  const entry=b.waterEntryPose(),ladder=b.ladderPose();
  const s=createSummerSwim({groundHeight:()=>-30,colliders:[],hull:()=>b.pose});
  assert.ok(s.canOccupy(entry.x,entry.y,entry.z),'Water entry is outside the rotated hull');
  assert.ok(b.canReachLadder(ladder));assert.equal(b.canReachLadder({...ladder,y:-20}),false,'A deep swimmer must actually ascend to the ladder');
  assert.equal(b.canReachLadder({...ladder,x:ladder.x+3}),false,'Ladder return uses the stern socket instead of the whole mooring');
  deck.key('s',true);tick(deck,8);deck.key('s',false);assert.ok(deck.canOccupy(deck.state.x,deck.state.z),'Aft tube keeps the player on the deck');
  assert.deepEqual(b.pose,origin,'Walking the cockpit never drives the hull');
  deck.key('d',true);tick(deck,8);deck.key('d',false);assert.ok(deck.canOccupy(deck.state.x,deck.state.z),'Side tube keeps the player on the deck');
  assert.equal(deck.setPose({x:b.pose.x+20,z:b.pose.z}),false);assert.equal(deck.setPose({yaw:NaN}),false);
  deck.joystick(NaN,Infinity);deck.look(NaN,Infinity);deck.update(NaN);deck.update(Infinity);finite(deck);
  deck.setPose(b.deckPose());deck.key('w',true);tick(deck,.2);deck.block(true);const paused=position(deck);tick(deck,1);deck.block(false);tick(deck,1);assert.deepEqual(position(deck),paused,'Deck overlays clear held movement');
}
for(const controller of [openBoat(),openSwim()]){
  if('release'in controller)controller.release();controller.key('w',true);controller.joystick(1,-1);controller.look(30,20);if('vertical'in controller)controller.vertical(true,false);tick(controller,1);
  controller.block(true);const paused=position(controller);tick(controller,3);assert.deepEqual(position(controller),paused);controller.block(false);tick(controller,2);assert.deepEqual(position(controller),paused,'Opening an overlay clears every held control');
  controller.joystick(NaN,Infinity);controller.look(NaN,Infinity);controller.update(NaN);controller.update(Infinity);tick(controller,.2);finite(controller);assert.equal(controller.setPose({pitch:NaN}),false);
}
const checkpoint=openSwim();checkpoint.setPose({x:173,y:-3,z:-28});assert.equal(checkpoint.setCheckpoint('winch'),false,'Checkpoint proximity includes depth');checkpoint.recover('winch');assert.equal(checkpoint.setCheckpoint('winch'),true);

// Shared inputs route to exactly one mode, and changing mode cannot start an
// engine, keep old thrust alive, or continue a vertical touch hold.
let walkingResets=0,walkingBlocks=0,walkingKeys=0;
const walk={state:{x:32,y:2.63,z:-8,yaw:0,pitch:0,velocity:0,distance:8,activePhotoIndex:-1,approachFactor:0},height:(x,z)=>Number.isFinite(x)&&Number.isFinite(z)?1:null,key:()=>{walkingKeys++;return true;},joystick(){},look(){},handleWheel(){},block(){walkingBlocks++;},resetInput(){walkingResets++;},update(){},dispose(){},setSurface(){}};
const movement=createSummerMovement(walk,{boat:{groundHeight:()=>-12,colliders:[]},swim:{groundHeight:()=>-30,colliders:[]}});
movement.key('w',true);assert.equal(walkingKeys,1);movement.setMode('boating');assert.equal(movement.boat.moored,true);assert.equal(movement.boat.engineRunning,false);movement.key('w',true);tick(movement,1);assert.equal(movement.state.velocity,0,'Selecting boat controls never implicitly starts the engine');
movement.boat.release(true);movement.key('w',true);tick(movement,1);assert.ok(movement.state.velocity>0);movement.setMode('swimming',{x:110,y:-5,z:-24});assert.equal(movement.boat.engineRunning,false);movement.vertical(true,false);tick(movement,1);movement.setMode('walking',{x:32,z:-8});movement.setMode('swimming');const resetY=movement.state.y;tick(movement,1);assert.equal(movement.state.y,resetY);assert.ok(walkingResets>=4&&walkingBlocks>=1);
movement.setMode('deck');assert.equal(movement.mode,'deck');assert.equal(movement.onBoat,true);assert.equal(movement.boat.engineRunning,false);const deckHull=movement.boat.pose;movement.key('w',true);tick(movement,1);assert.deepEqual(movement.boat.pose,deckHull);movement.setMode('boating');assert.equal(movement.boat.engineRunning,false,'Taking the seat does not silently start the motor');
assert.equal(movement.setMode('walking',{x:NaN}),false);assert.equal(movement.setMode('walking',{pitch:NaN}),false);
movement.recover('boat','dive');assert.equal(movement.mode,'deck');assert.equal(movement.boat.engineRunning,false);assert.equal(movement.boat.anchor,'dive');
movement.key('s',true);tick(movement,.2);movement.block(true);const deckPaused=position(movement);movement.key('w',true);tick(movement,1);assert.deepEqual(position(movement),deckPaused,'The shared overlay blocks cockpit controls too');movement.block(false);tick(movement,1);assert.deepEqual(position(movement),deckPaused,'Unpausing never restores an old deck input');
movement.recover('rest');assert.equal(movement.mode,'swimming');assert.equal(movement.swim.checkpoint,'rest');movement.recover('island');assert.equal(movement.mode,'walking');assert.equal(movement.boat.anchor,'berth');assert.equal(movement.boat.engineRunning,false);
console.log('Summer movement passed: authored anchors/corridors, frame-rate consistency, swept thin-wall/shore/hull/seabed collision, seated helm, solid cockpit deck, surface-only stern ladder, independent look, pause/input reset and safe recovery.');
