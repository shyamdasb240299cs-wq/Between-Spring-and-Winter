import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';
const {createSeasonLayout,groundHeight,springBridgeHeight,seasonWalkRadius,islandDistance,autumnLakeDistance,autumnPathDistance,AUTUMN_LAKE_LEVEL,AUTUMN_WADING_DEPTH,SUMMER_WADING_DEPTH,WALK_RADIUS,ISLAND_SCALE}=await import(await typescriptUrl(new URL('../app/shrine-void/season-layout.ts',import.meta.url)));
assert.ok(Math.abs(WALK_RADIUS**2/22**2-1.5)<1e-9,'Woodland walking area grows by 50%');
assert.ok(Math.abs(ISLAND_SCALE**2/1.65**2-2)<1e-6,'The island land area doubles');
const {createSeasonTravel}=await import(await typescriptUrl(new URL('../app/shrine-void/season-navigation.ts',import.meta.url)));
const {summerWalkingSurface,SUMMER_LANDMARKS}=await import(await typescriptUrl(new URL('../app/shrine-void/summer-layout.ts',import.meta.url)));
for(const id of ['spring','summer','autumn','winter']){
 const layout=createSeasonLayout(id),nav=layout.navigation;
 const approach=id==='summer'?{...nav,spawn:{...nav.spawn,yaw:Math.atan2(nav.spawn.x-SUMMER_LANDMARKS.chairs.x,nav.spawn.z-SUMMER_LANDMARKS.chairs.z)}}:nav;
 const travel=createSeasonTravel(approach),radius=seasonWalkRadius(id);
 assert.equal(radius,id==='spring'?36:WALK_RADIUS,'Only Spring uses the treasure trail expansion');
 if(id==='spring')for(const hz of [30,60,120])for(const [x,yaw,direction]of [[19,-Math.PI/2,1],[25,Math.PI/2,-1]]){
  const crossing=createSeasonTravel({...nav,spawn:{x,z:-12,yaw}});
  crossing.key('w',true);for(let frame=0;frame<hz*2.1;frame++)crossing.update(1/hz);crossing.key('w',false);
  assert.ok((crossing.state.x-22)*direction>2.2,`The Spring bridge must cross both banks at ${hz} Hz, from x=${x}; stopped at ${crossing.state.x}`);
 }
 assert.ok(nav.heights.every(h=>h===null||Number.isFinite(h)));
 assert.ok(layout.trees.length>=(id==='summer'?24:470));
 if(id!=='summer'){
  assert.ok(layout.trees.length>=470&&layout.trees.length<=650,'The expanded forest must stay within its instancing budget');
  assert.ok(layout.trees.filter(t=>t.lod===0).length<=14,'Expensive near trees remain bounded');
  assert.ok(layout.trees.filter(t=>t.lod<2).length<=60,'Most forest trees must use the low scenic LOD');
  assert.ok(layout.trees.filter(t=>Math.hypot(t.x,t.z+3)<16).length>=(id==='autumn'?14:16),'Canopy and understory must fill the view while preserving the open autumn path');
  for(let sector=0;sector<12;sector++)assert.ok(layout.trees.some(t=>{
   const angle=(Math.atan2(t.z+3,t.x)+Math.PI*2)%(Math.PI*2);
   return Math.hypot(t.x,t.z+3)>25&&Math.floor(angle/(Math.PI*2)*12)===sector;
  }),'Every viewing direction needs a distant forest backdrop');
 }
 assert.notEqual(travel.height(nav.spawn.x,nav.spawn.z),null);
 for(let iz=0;iz<nav.depth;iz++)for(let ix=0;ix<nav.width;ix++){
  const h=nav.heights[iz*nav.width+ix];if(h===null)continue;
  const x=nav.origin[0]+ix*nav.cell,z=nav.origin[1]+iz*nav.cell;
  const surface=id==='summer'?summerWalkingSurface(x,z):id==='spring'?(springBridgeHeight(x,z)??groundHeight(id,x,z)):groundHeight(id,x,z);
  assert.ok(surface!==null&&Math.abs(h-surface)<1e-6,'Navigation follows terrain or an authored bridge/jetty deck');
  if(id==='summer'){assert.ok(h>=-SUMMER_WADING_DEPTH);assert.ok(islandDistance(x,z)<=15.7);}
  else{
   assert.ok(Math.hypot(x,z+3)<=radius+1e-5);
   if(id==='autumn')assert.ok(h>=AUTUMN_LAKE_LEVEL-AUTUMN_WADING_DEPTH,'Wading stays in the shallow basin');
  }
 }
 if(id==='autumn'){
  assert.ok(groundHeight(id,.8,-13)<AUTUMN_LAKE_LEVEL-1,'The lake must have a submerged basin');
  assert.ok(layout.trees.every(t=>autumnLakeDistance(t.x,t.z)>=1.18),'Trees must grow on the lake bank, never through the water');
  assert.ok(layout.trees.every(t=>autumnPathDistance(t.x,t.z)>=3.3),'The entire branching footpath must stay clear of trunks');
  assert.ok(nav.heights.some(h=>h!==null&&h<AUTUMN_LAKE_LEVEL-.25),'Visitors must have usable knee-deep water');
 }
 if(id==='summer')assert.ok(layout.trees.every(t=>groundHeight(id,t.x,t.z)>=.12),'Palm roots must stand on dry sand');
 travel.key('w',true);for(let i=0;i<2400;i++)travel.update(1/60);travel.key('w',false);
 assert.ok(id==='summer'?travel.state.x < -5:travel.state.z < -5,`${id}: central approach blocked`);
 if(id==='autumn')assert.ok(travel.state.z<-7&&travel.state.z>-10,'The central route must enter the water and stop in the shallows');
 assert.ok(Math.hypot(travel.state.x,travel.state.z+3)<(id==='summer'?80:radius),`${id}: escaped expanded walking area`);
 const start=createSeasonTravel(nav);assert.notEqual(start.height(layout.prop.x,layout.prop.z+2),null,`${id}: prop approach blocked`);
 for(let i=0;i<36;i++){
  const angle=i/36*Math.PI*2,r=id==='summer'?95:64,x=Math.cos(angle)*r,z=-3+Math.sin(angle)*r;
  assert.equal(start.height(x,z),null,'Scenery must not expand the walking area');
  if(id==='summer')assert.ok(groundHeight(id,x,z)<-1.34,'Deep sea must surround every side of the expanded island');
  else assert.ok(groundHeight(id,Math.cos(angle)*90,-3+Math.sin(angle)*90)>3,'Outer banks must close the horizon');
 }
 const navAt=(x,z)=>[[0,0],[.28,0],[-.28,0],[0,.28],[0,-.28]].every(([dx,dz])=>travel.height(x+dx,z+dz)!==null);
 const startX=Math.round((nav.spawn.x-nav.origin[0])/nav.cell),startZ=Math.round((nav.spawn.z-nav.origin[1])/nav.cell),queue=[[startX,startZ]],seen=new Set(),reachable=[];
 for(let head=0;head<queue.length;head++){const [ix,iz]=queue[head],key=ix+':'+iz;if(seen.has(key))continue;seen.add(key);const x=nav.origin[0]+ix*nav.cell,z=nav.origin[1]+iz*nav.cell;if(!navAt(x,z))continue;reachable.push({x,z});for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([ix+dx,iz+dz]);}
 assert.ok(reachable.length*nav.cell**2>(id==='summer'?3200:1500),'The larger area must actually connect to spawn with body clearance');
 assert.ok(reachable.some(p=>Math.hypot(p.x,p.z+3)>(id==='summer'?34:25)),'Visitors can reach the new outer trails');
 if(id==='summer')for(const name of ['arrival','chairs','lookout','shelter','jetty']){const p=SUMMER_LANDMARKS[name];assert.ok(reachable.some(r=>Math.hypot(r.x-p.x,r.z-p.z)<1.8),`Summer ${name} has a spawn-connected approach`);}
 for(const p of layout.landmarks){assert.equal(travel.height(p.x,p.z),null,'Every new landmark blocks walking');assert.ok(layout.trees.every(t=>Math.hypot(t.x-p.x,t.z-p.z)>=p.radius+1.2),'Landmarks stay clear of trunks');if(p.kind==='bench'||p.kind==='beach-chair')assert.ok(reachable.some(r=>Math.hypot(r.x-p.x,r.z-p.z)<p.radius+1.5),'Every seating area has a connected approach');}
 assert.ok(layout.landmarks.filter(p=>p.kind==='bench'||p.kind==='beach-chair').length>=(id==='spring'?3:4),'Incidental seating remains outside the authored memory corners');
 console.log(id,`${layout.trees.length} trees; bounded walking, grounded navigation, prop access and 360-degree scenery passed`);
}
