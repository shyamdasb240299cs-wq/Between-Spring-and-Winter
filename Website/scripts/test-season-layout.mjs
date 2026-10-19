import assert from 'node:assert/strict';
import {typescriptUrl} from './load-typescript.mjs';
const {createSeasonLayout,groundHeight,islandDistance,autumnLakeDistance,autumnPathDistance,AUTUMN_LAKE_LEVEL,AUTUMN_WADING_DEPTH,SUMMER_WADING_DEPTH,WALK_RADIUS}=await import(await typescriptUrl(new URL('../app/shrine-void/season-layout.ts',import.meta.url)));
const {createSeasonTravel}=await import(await typescriptUrl(new URL('../app/shrine-void/season-navigation.ts',import.meta.url)));
for(const id of ['spring','summer','autumn','winter']){
 const layout=createSeasonLayout(id),nav=layout.navigation,travel=createSeasonTravel(nav);
 assert.ok(nav.heights.every(h=>h===null||Number.isFinite(h)));
 assert.ok(layout.trees.length>=(id==='summer'?6:50));
 if(id!=='summer'){
  assert.ok(layout.trees.length>=290&&layout.trees.length<=410,'A dense scenic forest must stay within its instancing budget');
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
 assert.ok(Math.hypot(travel.state.x,travel.state.z+3)<(id==='summer'?19:11),`${id}: escaped compact walking area`);
 const start=createSeasonTravel(nav);assert.notEqual(start.height(layout.prop.x,layout.prop.z+2),null,`${id}: prop approach blocked`);
 for(let i=0;i<36;i++){
  const angle=i/36*Math.PI*2,x=Math.cos(angle)*25,z=-3+Math.sin(angle)*25;
  assert.equal(start.height(x,z),null,'Scenery must not expand the walking area');
  if(id==='summer')assert.ok(groundHeight(id,x,z)<-3,'Sea must surround every side of the island');
  else assert.ok(groundHeight(id,Math.cos(angle)*90,-3+Math.sin(angle)*90)>3,'Outer banks must close the horizon');
 }
 console.log(id,`${layout.trees.length} trees; bounded walking, grounded navigation, prop access and 360-degree scenery passed`);
}
