import type {SeasonId,SeasonNavigation,SurfaceKind} from './seasons';
import {relicPlacement,CHEST_COLLISION_RADIUS} from './season-relic-placement';

export const WALK_CENTRE={x:0,z:-3},WALK_RADIUS=8.7,WATER_LEVEL=0;
export const AUTUMN_LAKE={x:.8,z:-13,radiusX:9.8,radiusZ:6.5} as const;
export const AUTUMN_LAKE_LEVEL=-.08;
export const AUTUMN_WADING_DEPTH=.65;
// At the deepest reachable point the eyes remain at least 29 cm above mean sea level.
export const SUMMER_WADING_DEPTH=1.34;
export const BEACH_SEATING={chairX:.35,chairZ:-.45,yaw:.16,poleX:-.85,poleZ:-.72};
export function beachSeatObstacles(x:number,z:number){
  const s=BEACH_SEATING;
  return [-.68,0,.68].map(d=>({x:x+s.chairX+Math.sin(s.yaw)*d,z:z+s.chairZ+Math.cos(s.yaw)*d,radius:.56}))
    .concat({x:x+s.poleX,z:z+s.poleZ,radius:.13});
}
export const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const random=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453123;return n-Math.floor(n);};
export function pathCentre(z:number){return Math.sin(z*.075)*.8+Math.sin(z*.17)*.22;}
export function pathDistance(x:number,z:number){return Math.abs(x-pathCentre(z));}
/** The footpath forks along the near bank, keeping the bench beside the route. */
export function autumnPathDistance(x:number,z:number){
  const branch=Math.abs(z-(-5.9+Math.sin(x*.14)*.3));
  return Math.min(pathDistance(x,z),Math.hypot(Math.max(0,Math.abs(x)-12),branch));
}
/** Unit distance follows the same scalloped shoreline on the CPU and in GLSL. */
export function autumnLakeDistance(x:number,z:number){
  const px=(x-AUTUMN_LAKE.x)/AUTUMN_LAKE.radiusX,pz=(z-AUTUMN_LAKE.z)/AUTUMN_LAKE.radiusZ,a=Math.atan2(pz,px);
  return Math.hypot(px,pz)/(1+Math.sin(a*3+.7)*.045+Math.sin(a*5-1.1)*.025);
}
/** Irregular elliptical island, surrounded by an actual seabed in every direction. */
export function islandDistance(x:number,z:number){const px=x,pz=(z+3)*.83,a=Math.atan2(pz,px);return Math.hypot(px,pz)/(1+Math.sin(a*3+.6)*.045+Math.sin(a*5-1.2)*.025);}
export function groundHeight(id:SeasonId,x:number,z:number){
  const fine=Math.sin(x*2.4+z*.37)*Math.sin(z*2.1-x*.7)*.018;
  if(id==='summer'){const d=islandDistance(x,z);return .82-smooth(2,10.8,d)*1.12-smooth(10.8,24,d)*3.8+Math.sin(z*.31+x*.27)*.028+fine*.5;}
  const d=id==='autumn'?autumnPathDistance(x,z):pathDistance(x,z),r=Math.hypot(x,z+3),a=Math.atan2(z+3,x);
  const broad=Math.sin(z*.18)*.08+Math.sin(x*.25+z*.11)*.09;
  const outer=smooth(14,65,r)*(2.2+Math.sin(a*3+.7)*.7+Math.sin(a*7)*.3)+smooth(55,105,r)*(6+Math.sin(a*5)*2.5);
  if(id==='spring')return broad+Math.sin(x*.47+z*.32)*.045+fine+outer;
  if(id==='winter')return .14+broad*.65+smooth(1.25,4,d)*(.32+Math.sin(z*.5+x*.35)*.09)+fine*.35+outer;
  const land=broad+smooth(1.3,4,d)*(.17+Math.sin(z*.25+x*.3)*.06)+fine+outer;
  const lake=autumnLakeDistance(x,z),bank=AUTUMN_LAKE_LEVEL+clamp((lake-1)*1.9,-1.4,.36),influence=1-smooth(1.13,1.43,lake);
  return land+(bank-land)*influence;
}
export const lakeShapeGLSL=`
  float autumnLakeAt(vec2 p){vec2 q=(p-vec2(.8,-13.))/vec2(9.8,6.5);float a=atan(q.y,q.x);return length(q)/(1.+sin(a*3.+.7)*.045+sin(a*5.-1.1)*.025);}
  float autumnPathAt(vec2 p){float route=abs(p.x-sin(p.y*.075)*.8-sin(p.y*.17)*.22);float branch=abs(p.y-(-5.9+sin(p.x*.14)*.3));return min(route,length(vec2(max(0.,abs(p.x)-12.),branch)));}
`;
// Shared expressions keep GPU particle landing, navigation, and water on the terrain.
export const groundGLSL=`
  ${lakeShapeGLSL}
  float islandDistance(vec2 p){vec2 q=vec2(p.x,(p.y+3.)*.83);float a=atan(q.y,q.x);return length(q)/(1.+sin(a*3.+.6)*.045+sin(a*5.-1.2)*.025);}
  float groundAt(vec2 p,int season){float fine=sin(p.x*2.4+p.y*.37)*sin(p.y*2.1-p.x*.7)*.018;
    if(season==1){float d=islandDistance(p);return .82-smoothstep(2.,10.8,d)*1.12-smoothstep(10.8,24.,d)*3.8+sin(p.y*.31+p.x*.27)*.028+fine*.5;}
    float d=season==2?autumnPathAt(p):abs(p.x-sin(p.y*.075)*.8-sin(p.y*.17)*.22),r=length(vec2(p.x,p.y+3.)),a=atan(p.y+3.,p.x);
    float broad=sin(p.y*.18)*.08+sin(p.x*.25+p.y*.11)*.09;
    float outer=smoothstep(14.,65.,r)*(2.2+sin(a*3.+.7)*.7+sin(a*7.)*.3)+smoothstep(55.,105.,r)*(6.+sin(a*5.)*2.5);
    if(season==0)return broad+sin(p.x*.47+p.y*.32)*.045+fine+outer;
    if(season==3)return .14+broad*.65+smoothstep(1.25,4.,d)*(.32+sin(p.y*.5+p.x*.35)*.09)+fine*.35+outer;
    float land=broad+smoothstep(1.3,4.,d)*(.17+sin(p.y*.25+p.x*.3)*.06)+fine+outer;
    float lake=autumnLakeAt(p),bank=-.08+clamp((lake-1.)*1.9,-1.4,.36);return mix(land,bank,1.-smoothstep(1.13,1.43,lake));
  }`;
export function surfaceAt(id:SeasonId,x:number,z:number):SurfaceKind{return id==='summer'?(groundHeight(id,x,z)<0?'water':'sand'):id==='winter'?'snow':id==='autumn'?(autumnLakeDistance(x,z)<1?'water':'leaves'):'grass';}
export interface TreePlacement{x:number;z:number;y:number;height:number;yaw:number;variant:number;seed:number;radius:number;lod:0|1|2;}
export interface Obstacle{x:number;z:number;radius:number;}
export interface SeasonLayout{trees:TreePlacement[];obstacles:Obstacle[];prop:{x:number;z:number};navigation:SeasonNavigation;}
export function createSeasonLayout(id:SeasonId):SeasonLayout{
  const trees:TreePlacement[]=[],obstacles:Obstacle[]=[];
  const prop={x:id==='spring'?-3.7:id==='winter'?-4.1:3.8,z:id==='summer'?-3.2:id==='autumn'?-3.8:-2.2};
  const add=(x:number,z:number,seed:number,height:number,lod:0|1|2)=>{
    const distance=Math.hypot(x,z+3);
    if(Math.hypot(x-prop.x,z-prop.z)<(id==='winter'?3:2.7)||Math.hypot(x,z-3.5)<2.3)return;
    if(id==='autumn'&&(autumnLakeDistance(x,z)<1.18||autumnPathDistance(x,z)<3.3))return;
    if(id!=='summer'&&id!=='autumn'&&pathDistance(x,z)<2.2&&distance<13)return;
    if(id==='summer'&&groundHeight(id,x,z)<.12)return;
    if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<(distance<18?2.6:3.6)))return;
    const radius=id==='summer'?.43:id==='winter'?.48:.60;
    trees.push({x,z,y:groundHeight(id,x,z)-.035,height,yaw:random(seed+2)*Math.PI*2,variant:Math.floor(random(seed)*3),seed,radius,lod});
    if(distance<12)obstacles.push({x,z,radius});
  };
  if(id==='summer'){
    // Open sand remains in front of the visitor; palms form loose coastal clusters.
    const palms=[[-6.3,-.5,8.8],[-5.6,-6.7,8.1],[-2.9,-10.1,7.6],[1.9,-10.8,8.4],[4.4,-8.1,9],[6.5,-1.1,9.7],[-4.6,3.1,8.4],[5,2.6,8.2],[-7,-3,8.1],[5.4,-6,7.8]];
    palms.forEach(([x,z,h],i)=>add(x,z,i+51,h,0));
  }else{
    // The canopy starts around the visitor, with deliberate clear approaches.
    const heroes=id==='autumn'
      ?[[-4.8,1.4],[5.8,1.7],[-5.7,-4.1],[7.9,-3.7],[-10.8,-11.5],[12.5,-12.6],[-6.2,-21],[2.5,-21.6],[9.1,-20],[-8.8,6.4],[9.8,6.4]]
      :[[-4.7,1.4],[5,1.8],[-5.8,-5.6],[5.4,-8.2],[-4.3,-11.2],[7.9,-12.8],[-9.2,5.8],[9,6.1],[-9.8,-1.8],[10.4,-3.9],[-.6,-17.4]];
    heroes.forEach(([x,z],i)=>add(x,z,80+i*19,(id==='winter'?12:id==='autumn'?10.4:9.7)*(.88+random(i)*.18),0));
    const bands=[{radius:12.6,count:21,lod:1 as const},{radius:19.5,count:29,lod:1 as const},{radius:30,count:53,lod:2 as const},{radius:45,count:68,lod:2 as const},{radius:64,count:82,lod:2 as const},{radius:88,count:96,lod:2 as const}];
    bands.forEach(({radius,count,lod},ring)=>{
      for(let n=0;n<count;n++){
        const seed=1100+ring*177+n*13,a=(n+random(seed)*.68)/count*Math.PI*2,r=radius+(random(seed+2)-.5)*(ring<2?4.8:9);
        const h=(id==='winter'?12.8:id==='autumn'?11.3:10.6)*(.77+random(seed+3)*.40);
        add(Math.cos(a)*r,-3+Math.sin(a)*r,seed,h,lod);
      }
    });
    // Young trees break up the tall trunks and conceal the distant terrain.
    for(let n=0;n<(id==='winter'?20:16);n++){
      const seed=n+450,a=n/(id==='winter'?20:16)*Math.PI*2+.3,r=11+random(n+14)*10;
      add(Math.cos(a)*r,-3+Math.sin(a)*r,seed,(id==='winter'?3.7:4.2)+random(n+33)*3,2);
    }
  }
  // Loose props use live colliders, so picking one up also clears its old footprint.
  if(id==='autumn')obstacles.push({x:prop.x+.35,z:prop.z,radius:1.05});
  if(id==='winter')obstacles.push({x:prop.x,z:prop.z,radius:1.12},{x:prop.x,z:prop.z-1.8,radius:1.1});
  if(id==='summer')obstacles.push(...beachSeatObstacles(prop.x,prop.z));
  const relic=relicPlacement(id,prop);obstacles.push({x:relic.chest.x,z:relic.chest.z,radius:CHEST_COLLISION_RADIUS});
  const cell=.25,width=id==='summer'?145:89,depth=id==='summer'?153:89,origin:[number,number]=id==='summer'?[-18,-22]:[-11,-14],heights:(number|null)[]=[];
  for(let iz=0;iz<depth;iz++)for(let ix=0;ix<width;ix++){
    const x=origin[0]+ix*cell,z=origin[1]+iz*cell,h=groundHeight(id,x,z);
    const edge=id==='summer'?h<-SUMMER_WADING_DEPTH||islandDistance(x,z)>15.7:Math.hypot(x,z+3)>WALK_RADIUS||id==='autumn'&&h<AUTUMN_LAKE_LEVEL-AUTUMN_WADING_DEPTH;
    const solid=obstacles.some(o=>(x-o.x)**2+(z-o.z)**2<(o.radius+.1)**2);
    heights.push(edge||solid?null:h);
  }
  return {trees,obstacles,prop,navigation:{origin,cell,width,depth,heights,spawn:{x:0,z:3.5,yaw:0},...(id==='autumn'?{waterLevel:AUTUMN_LAKE_LEVEL,wadingDepth:AUTUMN_WADING_DEPTH}:id==='summer'?{waterLevel:0,wadingDepth:SUMMER_WADING_DEPTH}:{})}};
}
