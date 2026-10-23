import type {SeasonId,SeasonNavigation,SurfaceKind} from './seasons';
import {relicPlacement,CHEST_COLLISION_RADIUS} from './season-relic-placement';
import {SPRING_RADIUS,SPRING_POND,SPRING_LANDMARKS,springClearance,springObstacles,springPathDistance,springPondDistance} from './spring-treasure-layout';
import {summerGroundHeight,summerIslandDistance,summerWalkingSurface,summerClearance,summerPondDistance,summerForestBlend,summerWorldColliders,summerLandBlocked,SUMMER_GROUND_GLSL} from './summer-layout';

// Area grows with radius squared: +50% woodland, +100% island land area.
export const WALK_CENTRE={x:0,z:-3},WALK_RADIUS=22*Math.sqrt(1.5),WATER_LEVEL=0;
export const seasonWalkRadius=(id:SeasonId)=>id==='spring'?SPRING_RADIUS:WALK_RADIUS;
/** The wooden deck crosses the narrow inlet; ground remains below it. */
export function springBridgeHeight(x:number,z:number):number|null{
  if(Math.abs(z+12)>.72||Math.abs(x-22)>2.2)return null;
  // Match the authored straight 0.8 m ramps. A smoothstep profile becomes too steep
  // at its centre for the navigation grid, leaving an invisible wall on the west bank.
  const bank=groundHeight('spring',22+Math.sign(x-22)*2.2,-12),end=clamp((Math.abs(x-22)-1.4)/.8);
  return .52+(bank-.52)*end;
}
export const ISLAND_SCALE=Number((1.65*Math.sqrt(2)).toFixed(6));
export const SUMMER_WALK_LIMIT=15.7;
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
export function islandDistance(x:number,z:number){return summerIslandDistance(x,z)*10;}
export function groundHeight(id:SeasonId,x:number,z:number){
  const fine=Math.sin(x*2.4+z*.37)*Math.sin(z*2.1-x*.7)*.018;
  if(id==='summer')return summerGroundHeight(x,z);
  const d=id==='autumn'?autumnPathDistance(x,z):pathDistance(x,z),r=Math.hypot(x,z+3),a=Math.atan2(z+3,x);
  const broad=Math.sin(z*.18)*.08+Math.sin(x*.25+z*.11)*.09;
  const outer=smooth(14,65,r)*(2.2+Math.sin(a*3+.7)*.7+Math.sin(a*7)*.3)+smooth(55,105,r)*(6+Math.sin(a*5)*2.5);
  if(id==='spring'){
    const natural=broad+Math.sin(x*.47+z*.32)*.045+fine+outer;
    const school=1-smooth(0,.6,Math.max(Math.abs(x+11)-2.25,Math.abs(z-2)-1.95));
    const land=natural+(.045-natural)*school,pond=springPondDistance(x,z);
    const basin=SPRING_POND.level+clamp((pond-1)*1.8,-.7,.42),influence=1-smooth(1.05,1.3,pond);
    return land+(basin-land)*influence;
  }
  if(id==='winter')return .14+broad*.65+smooth(1.25,4,d)*(.32+Math.sin(z*.5+x*.35)*.09)+fine*.35+outer;
  const land=broad+smooth(1.3,4,d)*(.17+Math.sin(z*.25+x*.3)*.06)+fine+outer;
  const lake=autumnLakeDistance(x,z),bank=AUTUMN_LAKE_LEVEL+clamp((lake-1)*1.9,-1.4,.36),influence=1-smooth(1.13,1.43,lake);
  return land+(bank-land)*influence;
}
export const lakeShapeGLSL=`
  float springPondAt(vec2 p){float main=length((p-vec2(19.3,-17.6))/vec2(4.3,3.8));float inlet=length(vec2((p.x-22.)/.85,max(0.,abs(p.y+12.8)-4.4)/.9));return min(main,inlet);}
  float autumnLakeAt(vec2 p){vec2 q=(p-vec2(.8,-13.))/vec2(9.8,6.5);float a=atan(q.y,q.x);return length(q)/(1.+sin(a*3.+.7)*.045+sin(a*5.-1.1)*.025);}
  float autumnPathAt(vec2 p){float route=abs(p.x-sin(p.y*.075)*.8-sin(p.y*.17)*.22);float branch=abs(p.y-(-5.9+sin(p.x*.14)*.3));return min(route,length(vec2(max(0.,abs(p.x)-12.),branch)));}
`;
// Shared expressions keep GPU particle landing, navigation, and water on the terrain.
export const groundGLSL=`
  ${lakeShapeGLSL}
  ${SUMMER_GROUND_GLSL}
  float islandDistance(vec2 p){return summerIslandAt(p)*10.;}
  float groundAt(vec2 p,int season){float fine=sin(p.x*2.4+p.y*.37)*sin(p.y*2.1-p.x*.7)*.018;
    if(season==1)return summerGroundAt(p);
    float d=season==2?autumnPathAt(p):abs(p.x-sin(p.y*.075)*.8-sin(p.y*.17)*.22),r=length(vec2(p.x,p.y+3.)),a=atan(p.y+3.,p.x);
    float broad=sin(p.y*.18)*.08+sin(p.x*.25+p.y*.11)*.09;
    float outer=smoothstep(14.,65.,r)*(2.2+sin(a*3.+.7)*.7+sin(a*7.)*.3)+smoothstep(55.,105.,r)*(6.+sin(a*5.)*2.5);
    if(season==0){float natural=broad+sin(p.x*.47+p.y*.32)*.045+fine+outer;float school=1.-smoothstep(0.,.6,max(abs(p.x+11.)-2.25,abs(p.y-2.)-1.95));float land=mix(natural,.045,school);float pond=springPondAt(p);float basin=.30+clamp((pond-1.)*1.8,-.7,.42);return mix(land,basin,1.-smoothstep(1.05,1.3,pond));}
    if(season==3)return .14+broad*.65+smoothstep(1.25,4.,d)*(.32+sin(p.y*.5+p.x*.35)*.09)+fine*.35+outer;
    float land=broad+smoothstep(1.3,4.,d)*(.17+sin(p.y*.25+p.x*.3)*.06)+fine+outer;
    float lake=autumnLakeAt(p),bank=-.08+clamp((lake-1.)*1.9,-1.4,.36);return mix(land,bank,1.-smoothstep(1.13,1.43,lake));
  }`;
export function surfaceAt(id:SeasonId,x:number,z:number):SurfaceKind{return id==='summer'?(groundHeight(id,x,z)<0||summerPondDistance(x,z)<1.04?'water':summerForestBlend(x,z)>.5?'grass':'sand'):id==='winter'?'snow':id==='autumn'?(autumnLakeDistance(x,z)<1?'water':'leaves'):'grass';}
export interface TreePlacement{x:number;z:number;y:number;height:number;yaw:number;variant:number;seed:number;radius:number;lod:0|1|2;}
export interface Obstacle{x:number;z:number;radius:number;}
export interface SeasonLandmark{kind:'bench'|'boulder'|'beach-chair'|'umbrella'|'log';x:number;z:number;size:number;yaw:number;radius:number;}
export interface SeasonLayout{trees:TreePlacement[];obstacles:Obstacle[];landmarks:SeasonLandmark[];prop:{x:number;z:number};navigation:SeasonNavigation;}
/** Named resting spots and rock groups share their positions with the navigation bake. */
export function seasonLandmarks(id:SeasonId):SeasonLandmark[]{
  const landmarks:SeasonLandmark[]=[];
  const add=(kind:SeasonLandmark['kind'],x:number,z:number,size:number,yaw:number)=>landmarks.push({kind,x,z,size,yaw,radius:kind==='umbrella'?.14:kind==='boulder'?size*.74:kind==='beach-chair'?size*.73:kind==='log'?size*.52:size*.59});
  if(id==='summer'){
    // Each pair faces the water; its parasol pole stands behind the chairs.
    for(const [x,z,yaw]of [[-34,-18,-.65],[12,35,.65]]){
      add('beach-chair',x,z,.85,yaw);add('beach-chair',x+Math.cos(yaw)*1.9,z-Math.sin(yaw)*1.9,.85,yaw);
      add('umbrella',x+Math.cos(yaw)*.95-Math.sin(yaw)*1.1,z-Math.sin(yaw)*.95-Math.cos(yaw)*1.1,2.7,yaw);
    }
    // Low limestone outcrops collect at headlands rather than an even ring.
    for(const [x,z,size,yaw]of [[-41,-18,3.5,.45],[-39,-22,2.2,.65],[-36,-26,1.25,.4],[30,-37,3.2,-.6],[34,-33,2.1,-.4],[38,-29,1.2,-.7],[-8,-51,3.1,.18],[-12,-49,1.8,.3],[32,29,2.4,.8]])add('boulder',x,z,size,yaw);
    add('log',-14,6.8,2.7,-.55);add('log',10.5,13,2.2,.8);
  }else{
    const benches=id==='autumn'?[[12,-7,Math.PI],[-12,-8,Math.PI],[-7,7,.3],[7,-21.3,2.7]]:id==='winter'?[[8,4,-.6],[-12,4,.6],[8,-16,2.6],[-11,-16,-2.6]]:[[-11,4,.6],[9,5,-.5],[-10,-15,2.7],[10,-17,-2.7]];
    for(const [x,z,yaw]of benches)add('bench',x,z,2.05,yaw);
    for(const [x,z,yaw]of [[-19,-1,.8],[18,-12,-1.2]])add('bench',x,z,2.05,yaw);
    // A large parent stone and smaller fragments share each exposed bank.
    for(const [x,z,size,yaw]of [[-19,7,2.7,.4],[-16.6,8.7,1.35,.65],[-15.2,10,1,.25],[17,-20,2.8,-.6],[19.6,-18,1.5,-.4],[20.8,-16,1,-.7],[12,14,2.2,.3],[-18,-18,2,.7]])if(id!=='autumn'||autumnLakeDistance(x,z)>1.3)add('boulder',x,z,size,yaw);
    add('log',id==='autumn'?-15:-14,id==='autumn'?-20:-8,2.5,.5);
  }
  return id==='spring'?landmarks.filter(p=>!springClearance(p.x,p.z)):id==='summer'?landmarks.filter(p=>!summerClearance(p.x,p.z)):landmarks;
}
export function createSeasonLayout(id:SeasonId):SeasonLayout{
  const trees:TreePlacement[]=[],obstacles:Obstacle[]=[];
  const landmarks=seasonLandmarks(id);
  const prop={x:id==='spring'?-3.7:id==='winter'?-4.1:id==='summer'?-39:3.8,z:id==='summer'?12:id==='autumn'?-3.8:-2.2};
  const add=(x:number,z:number,seed:number,height:number,lod:0|1|2)=>{
    const distance=Math.hypot(x,z+3);
    if(id==='spring'&&springClearance(x,z))return;
    if(id==='summer'&&(summerClearance(x,z)||summerPondDistance(x,z)<1.28))return;
    if(Math.hypot(x-prop.x,z-prop.z)<(id==='winter'?3:2.7)||Math.hypot(x,z-3.5)<2.3)return;
    if(landmarks.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+1.2))return;
    if(id==='autumn'&&(autumnLakeDistance(x,z)<1.18||autumnPathDistance(x,z)<3.3))return;
    if(id!=='summer'&&id!=='autumn'&&pathDistance(x,z)<2.2&&distance<WALK_RADIUS+2)return;
    if(id==='summer'&&groundHeight(id,x,z)<.12)return;
    if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<(distance<18?(id==='summer'?2.35:2.6):3.6)))return;
    const radius=id==='summer'?.43:id==='winter'?.48:.60;
    trees.push({x,z,y:groundHeight(id,x,z)-.035,height,yaw:random(seed+2)*Math.PI*2,variant:id==='summer'?(summerIslandDistance(x,z)<.68?1+Math.floor(random(seed)*3):0):Math.floor(random(seed)*3),seed,radius,lod});
    if(distance<(id==='summer'?80:seasonWalkRadius(id)+2))obstacles.push({x,z,radius});
  };
  if(id==='summer'){
    // Green broadleaf crowns overlap above navigable forest paths; coconut palms
    // remain on the sandy perimeter. Variant 0 is palm, 1–3 are broadleaf GLBs.
    for(let n=0;n<660;n++){
      const a=n*2.399963+.12,r=Math.sqrt(random(n+132))*36,x=-2+Math.cos(a)*r,z=-3+Math.sin(a)*r*1.17;
      if(summerIslandDistance(x,z)<.68)add(x,z,500+n,8.8+random(n+812)*5.1,1);
    }
    for(let n=0;n<240;n++){
      const a=n*2.399963+.26,r=.70+random(n+232)*.23,x=-2+Math.cos(a)*50*r,z=-3+Math.sin(a)*60*r;
      add(x,z,2100+n,7.2+random(n+912)*3.8,1);
    }
  }else{
    // The canopy starts around the visitor, with deliberate clear approaches.
    const heroes=id==='autumn'
      ?[[-4.8,1.4],[5.8,1.7],[-5.7,-4.1],[7.9,-3.7],[-10.8,-11.5],[12.5,-12.6],[-6.2,-21],[2.5,-21.6],[9.1,-20],[-8.8,6.4],[9.8,6.4]]
      :[[-4.7,1.4],[5,1.8],[-5.8,-5.6],[5.4,-8.2],[-4.3,-11.2],[7.9,-12.8],[-9.2,5.8],[9,6.1],[-9.8,-1.8],[10.4,-3.9],[-.6,-17.4]];
    heroes.forEach(([x,z],i)=>add(x,z,80+i*19,(id==='winter'?12:id==='autumn'?10.4:9.7)*(.88+random(i)*.18),0));
    if(id==='autumn')for(let n=0;n<60;n++){const a=n*2.399963,r=8+random(n+193)*8;add(Math.cos(a)*r,-3+Math.sin(a)*r,800+n,8.8+random(n+711)*2.2,1);}
    const bands=[{radius:12.6,count:34,lod:1 as const},{radius:19.5,count:46,lod:1 as const},{radius:26,count:64,lod:2 as const},{radius:34,count:84,lod:2 as const},{radius:47,count:108,lod:2 as const},{radius:65,count:132,lod:2 as const},{radius:88,count:156,lod:2 as const},{radius:104,count:168,lod:2 as const}];
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
  if(id==='spring'){
    const p=SPRING_LANDMARKS.tree;
    trees.push({x:p.x,z:p.z,y:groundHeight(id,p.x,p.z)-.035,height:8.4,yaw:.5,variant:1,seed:77881,radius:.60,lod:0});
    obstacles.push({x:p.x,z:p.z,radius:.60},...springObstacles());
  }
  // Loose props use live colliders, so picking one up also clears its old footprint.
  if(id==='autumn')obstacles.push({x:prop.x+.35,z:prop.z,radius:1.05});
  if(id==='winter')obstacles.push({x:prop.x,z:prop.z,radius:1.12},{x:prop.x,z:prop.z-1.8,radius:1.1});
  obstacles.push(...landmarks.map(({x,z,radius})=>({x,z,radius})));
  if(id!=='summer'){const relic=relicPlacement(id,prop);obstacles.push({x:relic.chest.x,z:relic.chest.z,radius:CHEST_COLLISION_RADIUS});}
  if(id==='summer')for(const c of summerWorldColliders.filter(c=>c.minY<1.8&&c.maxY>.9&&c.kind==='cylinder'))obstacles.push({x:c.x,z:c.z,radius:c.radius??.15});
  const cell=.25,width=id==='summer'?481:id==='spring'?305:233,depth=id==='summer'?561:id==='spring'?305:233,origin:[number,number]=id==='summer'?[-60,-70]:id==='spring'?[-38,-41]:[-29,-32],heights:(number|null)[]=[];
  for(let iz=0;iz<depth;iz++)for(let ix=0;ix<width;ix++){
    const x=origin[0]+ix*cell,z=origin[1]+iz*cell,h=id==='summer'?(summerWalkingSurface(x,z)??-100):id==='spring'?(springBridgeHeight(x,z)??groundHeight(id,x,z)):groundHeight(id,x,z);
    const bridge=id==='spring'&&springBridgeHeight(x,z)!==null;
    const edge=id==='summer'?h<-SUMMER_WADING_DEPTH||islandDistance(x,z)>SUMMER_WALK_LIMIT:Math.hypot(x,z+3)>seasonWalkRadius(id)||id==='autumn'&&h<AUTUMN_LAKE_LEVEL-AUTUMN_WADING_DEPTH||id==='spring'&&!bridge&&springPondDistance(x,z)<1.10;
    const solid=obstacles.some(o=>(x-o.x)**2+(z-o.z)**2<(o.radius+.1)**2)||id==='summer'&&summerLandBlocked(x,z);
    heights.push(edge||solid?null:h);
  }
  return {trees,obstacles,landmarks,prop,navigation:{origin,cell,width,depth,heights,spawn:{x:0,z:id==='summer'?8:3.5,yaw:id==='summer'?Math.PI/2:0},...(id==='autumn'?{waterLevel:AUTUMN_LAKE_LEVEL,wadingDepth:AUTUMN_WADING_DEPTH}:id==='summer'?{waterLevel:0,wadingDepth:SUMMER_WADING_DEPTH}:{})}};
}
