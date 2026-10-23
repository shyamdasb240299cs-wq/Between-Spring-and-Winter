import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import * as THREE from 'three';
const root=path.resolve(import.meta.dirname,'..'),cache=new Map();
async function sourceModule(filename){
  if(cache.has(filename))return cache.get(filename);
  let source=ts.transpileModule(await fs.readFile(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  for(const match of [...source.matchAll(/from\s+(['"])([^'"]+)\1/g)]){const resolved=match[2].startsWith('.')?await sourceModule(path.resolve(path.dirname(filename),match[2]+'.ts')):import.meta.resolve(match[2]);source=source.replace(match[0],`from ${JSON.stringify(resolved)}`);}
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(filename,url);return url;
}
// Canvas rendering is exercised in browser QA. This neutral context isolates scene geometry,
// state-driven pivots, target world transforms and disposal without a WebGL implementation.
const paint=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>paint})};globalThis.Path2D=class{};
const [{createSummerWorld},{createSummerState},{createSummerSwim},{createSeasonTravel},{createSeasonLayout},layout]=await Promise.all([
  sourceModule(path.join(root,'app/shrine-void/summer-world.ts')).then(url=>import(url)),
  sourceModule(path.join(root,'app/shrine-void/summer-state.ts')).then(url=>import(url)),
  sourceModule(path.join(root,'app/shrine-void/summer-swim.ts')).then(url=>import(url)),
  sourceModule(path.join(root,'app/shrine-void/season-navigation.ts')).then(url=>import(url)),
  sourceModule(path.join(root,'app/shrine-void/season-layout.ts')).then(url=>import(url)),
  sourceModule(path.join(root,'app/shrine-void/summer-layout.ts')).then(url=>import(url)),
]);
const controller=createSummerState(),camera=new THREE.PerspectiveCamera(58,1,.1,250),pose={x:49,y:0,z:-8,yaw:0},world=createSummerWorld({getState:()=>controller.state,camera,compact:true,boatPose:()=>pose});
world.group.updateMatrixWorld(true);
const find=name=>world.group.getObjectByName(name);
const proxy=name=>find('Interact · '+name);
for(const contact of world.contacts){
  const surface=layout.summerDockHeight(contact.x,contact.z)??layout.summerGroundHeight(contact.x,contact.z);
  assert.ok(Math.abs(contact.bottom-surface)<.012,`Table foot at ${contact.x},${contact.z} contacts the visible ground/deck`);
}
assert.equal(world.contacts.length,20,'Every leg of the beach, lookout, chart, equipment and fuel tables is audited');
const fuelBounds={minX:43.425,maxX:44.575,minZ:layout.SUMMER_FUEL_BAY.tableZ-.325,maxZ:layout.SUMMER_FUEL_BAY.tableZ+.325};
for(const x of [fuelBounds.minX,fuelBounds.maxX])for(const z of [fuelBounds.minZ,fuelBounds.maxZ])assert.equal(layout.summerDockHeight(x,z),.8,'The complete fuel table stands on its landing');
for(const fixture of layout.summerFurniture)assert.equal(layout.summerLandBlocked(fixture.x,fixture.z),true,`${fixture.id} is a physical walking obstacle`);
for(const id of ['opening-note','chart-shore','chart-lookout','chart-table','gear-rack','fuel-shelf','boat-console','boat-ladder','frame-1','frame-2','frame-3','observation','current','rest','cable','cassette','recover-case'])assert.ok(proxy(id)?.parent,`${id} retains an attached physical interaction proxy after batching`);
const point=new THREE.Vector3();proxy('chart-lookout').getWorldPosition(point);assert.ok(Math.hypot(point.x-layout.SUMMER_LOOKOUT_TABLE.x,point.z-layout.SUMMER_LOOKOUT_TABLE.z)<.1,'Lookout target uses its full world transform');
assert.ok(world.stats().fish>=130);assert.equal(world.stats().species,12);assert.equal(world.stats().drawCalls,12);assert.ok(world.stats().colonies>=35,'Compact detail keeps a substantial dimensional reef');
assert.equal(world.stats().wreck,true);assert.equal(world.stats().turtles,1);assert.equal(world.stats().rays,1);assert.ok(world.stats().seagrass>500);
assert.ok(find('The Marigold · open coastal shipwreck'));assert.ok(find('Secured deck air refill tank'));
assert.equal(find('Sunken current route board'),undefined);
const chairs=layout.SUMMER_LANDMARKS.chairs;camera.position.set(chairs.x+.6,layout.summerGroundHeight(chairs.x,chairs.z)+1.45,chairs.z+1.5);proxy('opening-note').getWorldPosition(point);camera.lookAt(point);assert.equal(world.target(camera)?.id,'opening-note','Beach note can be reached and selected in three dimensions');
// A target's range is useful only if the complete player capsule can stand or
// swim there and the actual picker selects it, including overlapping stations.
const walk=createSeasonTravel(createSeasonLayout('summer').navigation),swim=createSummerSwim();
for(const fixture of layout.summerFurniture)assert.equal(walk.height(fixture.x,fixture.z),null,`${fixture.id} cannot be walked through`);
assert.equal(walk.height(-38.65,11.55)!==null,true,'Removing the old seating arrangement also removes its invisible chair obstruction');
function reachableInteraction(id,submerged=false){
  proxy(id).getWorldPosition(point);const centre=point.clone();
  for(const radius of [.8,1.4,2,2.6,3])for(let direction=0;direction<24;direction++)for(const lift of submerged?[.25,.7,1.3]:[0]){
    const angle=direction/24*Math.PI*2,x=centre.x+Math.cos(angle)*radius,z=centre.z+Math.sin(angle)*radius;
    const surface=walk.height(x,z),y=submerged?Math.max(centre.y+lift,layout.summerGroundHeight(x,z)+1.30):(surface??-999)+1.63;
    if(submerged?!swim.canOccupy(x,y,z):surface===null||![[.28,0],[-.28,0],[0,.28],[0,-.28]].every(([dx,dz])=>walk.height(x+dx,z+dz)!==null))continue;
    camera.position.set(x,y,z);camera.lookAt(centre);if(world.target(camera)?.id===id)return true;
  }
  return false;
}
for(const id of ['opening-note','chart-shore','chart-lookout','chart-table','gear-rack','prep-shelter','fuel-shelf','boat-console'])assert.ok(reachableInteraction(id),`${id} has a capsule-clear walking approach and can be selected`);
for(const id of ['training-1','training-2','training-3','frame-1','frame-2','frame-3','observation','current','rest','cable','cassette'])assert.ok(reachableInteraction(id,true),`${id} has a capsule-clear underwater approach and can be selected`);
controller.state.cassetteReleased=true;assert.ok(reachableInteraction('recover-case',true),'The released keepsake can be selected beside the cassette');controller.state.cassetteReleased=false;
const boat=find('Summer original 5.89m RIB'),bag=find('Dry bag'),cap=find('Tank cap pivot'),ladder=find('Stern ladder hinge');assert.ok(boat&&bag&&cap&&ladder);
assert.ok(controller.act('read-note'));assert.ok(controller.act('take-chart',0));assert.ok(controller.act('take-chart',1));
// Direct state adjustment here tests the renderer contract independently of puzzle validation.
controller.state.bagStowed=true;controller.state.capOpen=true;controller.state.ladderDown=true;controller.state.wetsuitWorn=true;controller.state.bcdEquipped=true;controller.state.finsFitted=true;
for(let i=0;i<90;i++)world.update(i/60,1/60);
assert.ok(Math.abs(bag.position.x)<.005&&bag.position.y<.36,'Bag moves off the second seat into console stowage');assert.ok(cap.position.y>.48,'Opened cap physically lifts');assert.ok(Math.abs(ladder.rotation.x)<.01,'Lowered ladder has its real down pose');
pose.x=106;pose.z=-24;pose.yaw=-Math.PI/2;world.update(2,1/60);assert.equal(boat.position.x,106);assert.equal(boat.rotation.y,-Math.PI/2,'Boat geometry follows the controller heading, not the camera');
world.setUnderwater(true);world.update(2.5,1/60);const player=find('Aami · equipped first-person body');assert.equal(player.visible,true);assert.ok(player.children.some(o=>o.name==='Wetsuit torso'),'The equipped body is actual geometry');
controller.state.gearRemoved=true;world.update(2.6,1/60);assert.equal(player.visible,false,'The suit leaves the body after removing equipment');controller.state.gearRemoved=false;
const fish=world.group.getObjectByName('Silversides · school'),matrixA=new THREE.Matrix4(),matrixB=new THREE.Matrix4();fish.getMatrixAt(0,matrixA);for(let i=0;i<60;i++)world.update(3+i/60,1/60);fish.getMatrixAt(0,matrixB);assert.notDeepEqual(matrixA.elements,matrixB.elements,'School fish change position and heading');
let disposed=0;world.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.addEventListener('dispose',()=>disposed++);});world.dispose();assert.equal(world.group.children.length,0);assert.ok(disposed>25,'Owned scene geometry is released');
console.log('Summer world: attached interactions, reachable note, physical gear/fuel/boat poses, moving schools, dimensional body and disposal passed.');
