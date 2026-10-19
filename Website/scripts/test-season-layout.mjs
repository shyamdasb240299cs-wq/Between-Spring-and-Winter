import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';
const {createSeasonLayout,groundHeight,islandDistance,autumnLakeDistance,autumnPathDistance,AUTUMN_LAKE_LEVEL,AUTUMN_WADING_DEPTH,SUMMER_WADING_DEPTH,WALK_RADIUS}=await import(await typescriptUrl(new URL('../app/shrine-void/season-layout.ts',import.meta.url)));
const {createSeasonTravel}=await import(await typescriptUrl(new URL('../app/shrine-void/season-navigation.ts',import.meta.url)));
for(const id of ['spring','summer','autumn','winter']){
 const layout=createSeasonLayout(id),nav=layout.navigation,travel=createSeasonTravel(nav);
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
  assert.ok(Math.abs(h-groundHeight(id,x,z))<1e-6);
  if(id==='summer'){assert.ok(h>=-SUMMER_WADING_DEPTH);assert.ok(islandDistance(x,z)<=15.7);}
  else{
   assert.ok(Math.hypot(x,z+3)<=WALK_RADIUS+1e-5);
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
 assert.ok(travel.state.z < -5,`${id}: central approach blocked`);
 if(id==='autumn')assert.ok(travel.state.z<-7&&travel.state.z>-10,'The central route must enter the water and stop in the shallows');
 assert.ok(Math.hypot(travel.state.x,travel.state.z+3)<(id==='summer'?34:WALK_RADIUS),`${id}: escaped expanded walking area`);
 const start=createSeasonTravel(nav);assert.notEqual(start.height(layout.prop.x,layout.prop.z+2),null,`${id}: prop approach blocked`);
 for(let i=0;i<36;i++){
  const angle=i/36*Math.PI*2,x=Math.cos(angle)*45,z=-3+Math.sin(angle)*45;
  assert.equal(start.height(x,z),null,'Scenery must not expand the walking area');
  if(id==='summer')assert.ok(groundHeight(id,x,z)<-3,'Sea must surround every side of the island');
  else assert.ok(groundHeight(id,Math.cos(angle)*90,-3+Math.sin(angle)*90)>3,'Outer banks must close the horizon');
 }
 const navAt=(x,z)=>[[0,0],[.28,0],[-.28,0],[0,.28],[0,-.28]].every(([dx,dz])=>travel.height(x+dx,z+dz)!==null);
 const startX=Math.round((nav.spawn.x-nav.origin[0])/nav.cell),startZ=Math.round((nav.spawn.z-nav.origin[1])/nav.cell),queue=[[startX,startZ]],seen=new Set(),reachable=[];
 for(let head=0;head<queue.length;head++){const [ix,iz]=queue[head],key=ix+':'+iz;if(seen.has(key))continue;seen.add(key);const x=nav.origin[0]+ix*nav.cell,z=nav.origin[1]+iz*nav.cell;if(!navAt(x,z))continue;reachable.push({x,z});for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([ix+dx,iz+dz]);}
 assert.ok(reachable.length*nav.cell**2>(id==='summer'?1600:1000),'The larger area must actually connect to spawn with body clearance');
 assert.ok(reachable.some(p=>Math.hypot(p.x,p.z+3)>(id==='summer'?23:20)),'Visitors can reach the new outer trails');
 for(const p of layout.landmarks){assert.equal(travel.height(p.x,p.z),null,'Every new landmark blocks walking');assert.ok(layout.trees.every(t=>Math.hypot(t.x-p.x,t.z-p.z)>=p.radius+1.2),'Landmarks stay clear of trunks');if(p.kind==='bench'||p.kind==='beach-chair')assert.ok(reachable.some(r=>Math.hypot(r.x-p.x,r.z-p.z)<p.radius+1.5),'Every seating area has a connected approach');}
 assert.ok(layout.landmarks.filter(p=>p.kind==='bench'||p.kind==='beach-chair').length>=4,'More real seats exist in every season');
 console.log(id,`${layout.trees.length} trees; bounded walking, grounded navigation, prop access and 360-degree scenery passed`);
}
