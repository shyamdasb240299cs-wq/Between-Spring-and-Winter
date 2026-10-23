/** Shared Summer authoring coordinates. Metres, Y up, mean sea level zero. */
export const SUMMER_BOUNDS = { minX: -70, maxX: 230, minZ: -90, maxZ: 90, minY: -30, maxY: 40 } as const;
export const SUMMER_WATER_LEVEL = 0;
export const SUMMER_WADING_DEPTH = 1.34;
/** Fuel stays on its own supported side landing, outside the through route. */
export const SUMMER_FUEL_BAY = {x:44,z:-10.3,width:2.4,depth:2.5,level:.8,tableZ:-10.65} as const;
export const SUMMER_BEACH = {x:-40,z:2} as const;
export const SUMMER_LOOKOUT_TABLE = {x:6,z:-31.6} as const;
export const SUMMER_SHELTER_FLOOR = {x:32,z:-8,width:8.4,depth:6.4,level:1.025} as const;
export const SUMMER_DIVE_BUOY = {x:102,z:-20.5} as const;
/** The dive anchor faces east; this is just beyond its starboard stern ladder. */
export const SUMMER_DESCENT_LINE = {x:102.35,z:-23.27} as const;
export const SUMMER_WRECK_SECTIONS=[
  {x:156,width:.45},{x:159,width:2.8},{x:162,width:4.4},{x:166,width:5.0},
  {x:170,width:5.2},{x:174,width:5.2},{x:178,width:4.9},{x:182,width:4.1},
  {x:186,width:2.7},{x:190,width:.25},
] as const;
export const SUMMER_LANDMARKS = {
  arrival: { x: 0, z: 8 }, chairs: { x: -37.4, z: 2 }, lookout: { x: 6, z: -30 },
  shelter: { x: 32, z: -8 }, jetty: { x: 45, z: -8 }, berth: { x: 49, z: -8 },
  channel: { x: 72, z: -15 }, mooring: { x: 106, z: -24 }, training: { x: 106, z: -24 },
  observation: { x: 126, z: -37 }, fork: { x: 151, z: -17 },
  rest: { x: 157, z: -17 }, winch: { x: 173, z: -28 }, case: { x: 181, z: -28 },
} as const;
export const SUMMER_ANCHORS = {
  berth: { x: 49, y: 0, z: -8, yaw: 0 },
  dive: { x: 106, y: 0, z: -24, yaw: -Math.PI / 2 },
} as const;
export type SummerAnchorId = keyof typeof SUMMER_ANCHORS;
export const SUMMER_ROUTE = [SUMMER_LANDMARKS.training, SUMMER_LANDMARKS.observation, SUMMER_LANDMARKS.fork, SUMMER_LANDMARKS.rest, SUMMER_LANDMARKS.winch, SUMMER_LANDMARKS.case] as const;
export const SUMMER_ROUTE_POSTS = {
  training: { x: 106, y: -4.8, z: -24, yaw: -Math.PI / 2 },
  observation: { x: 126, y: -8, z: -37, yaw: -Math.PI / 2 },
  fork: { x: 151, y: -12.8, z: -17, yaw: -Math.PI / 2 },
  rest: { x: 157, y: -13.6, z: -17, yaw: -Math.PI / 2 },
  winch: { x: 173, y: -18.2, z: -28, yaw: -Math.PI / 2 },
  case: { x: 181, y: -20, z: -28, yaw: Math.PI / 2 },
} as const;
export type SummerRoutePostId = keyof typeof SUMMER_ROUTE_POSTS;
/** Shallow freshwater pools sit above the sea, inside the forest. */
export const SUMMER_PONDS = [
  {x:-13,z:-15,radiusX:6.2,radiusZ:4.2,level:.95},
  {x:15,z:16,radiusX:5.2,radiusZ:3.8,level:.95},
  {x:-16,z:26,radiusX:3.8,radiusZ:2.8,level:.95},
] as const;
export const SUMMER_FOREST_PATHS = [
  [SUMMER_LANDMARKS.chairs,SUMMER_LANDMARKS.arrival],
  [SUMMER_LANDMARKS.arrival,SUMMER_LANDMARKS.lookout],
  [SUMMER_LANDMARKS.lookout,{x:26,z:-6}],
  [{x:26,z:-6},SUMMER_LANDMARKS.shelter],
  [SUMMER_LANDMARKS.arrival,SUMMER_LANDMARKS.shelter],
  [SUMMER_LANDMARKS.shelter,SUMMER_LANDMARKS.jetty],
] as const;
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };

/** One at the shoreline: the irregular dry footprint is approximately 100 × 120 m. */
export function summerIslandDistance(x: number, z: number) {
  const px = (x + 2) / 50, pz = (z + 3) / 60, angle = Math.atan2(pz, px);
  return Math.hypot(px, pz) / (1 + Math.sin(angle * 3 + .6) * .035 + Math.sin(angle * 5 - 1.2) * .022);
}
export function summerPondDistance(x:number,z:number) {
  return Math.min(...SUMMER_PONDS.map(p=>{
    const qx=(x-p.x)/p.radiusX,qz=(z-p.z)/p.radiusZ,a=Math.atan2(qz,qx);
    return Math.hypot(qx,qz)/(1+Math.sin(a*3+.4)*.045);
  }));
}
export function summerForestPathDistance(x:number,z:number) {
  return Math.min(...SUMMER_FOREST_PATHS.map(([a,b])=>segmentDistance(x,z,a,b)));
}
export function summerForestBlend(x:number,z:number) {return 1-smooth(.65,.84,summerIslandDistance(x,z));}
export function summerWaterLevel(x:number,z:number) {return summerPondDistance(x,z)<1.04?.95:SUMMER_WATER_LEVEL;}
export function summerGroundHeight(x: number, z: number) {
  const d = summerIslandDistance(x, z);
  const seabed = -6 - smooth(72, 110, x) - smooth(110, 132, x) * 3 - smooth(132, 156, x) * 5 - smooth(156, 185, x) * 8
    - smooth(16, 65, Math.abs(z + 25)) * 2;
  const island = d < 1 ? 1.25 * (1 - smooth(.78, 1, d)) : -3.2 * smooth(1, 1.16, d);
  let h = island + (seabed - island) * smooth(1.05, 1.4, d);
  const lookout = (1 - smooth(0, 14, Math.hypot(x - 6, z + 30))) * 2.75;
  h += lookout * (1 - smooth(.76, .96, d));
  // The bay is cut into the shore. The deck provides a separate, continuous walking surface.
  const bay = smooth(39, 46, x) * (1 - smooth(5, 10, Math.abs(z + 8)));
  h += (Math.min(h, -3.4) - h) * bay;
  const shelter = (1 - smooth(4.8, 7.2, Math.max(Math.abs(x - 32), Math.abs(z + 8))));
  h += (1 - h) * shelter;
  const pond=summerPondDistance(x,z),basin=.33+.92*smooth(.35,1.25,pond);
  h+=(basin-h)*(1-smooth(1.20,1.40,pond));
  const ripple = (Math.sin(x * .48 + z * .21) * Math.sin(z * .37) * .055) * smooth(1.1, 1.35, d);
  return h + ripple;
}
/** Exact CPU counterpart for ocean, contact particles and terrain material shaders. */
export const SUMMER_GROUND_GLSL = `
float summerIslandAt(vec2 p){vec2 q=(p+vec2(2.,3.))/vec2(50.,60.);float a=atan(q.y,q.x);return length(q)/(1.+sin(a*3.+.6)*.035+sin(a*5.-1.2)*.022);}
float summerPondAt(vec2 p){float d=100.;${SUMMER_PONDS.map(p=>`{vec2 q=(p-vec2(${p.x.toFixed(2)},${p.z.toFixed(2)}))/vec2(${p.radiusX.toFixed(2)},${p.radiusZ.toFixed(2)});d=min(d,length(q)/(1.+sin(atan(q.y,q.x)*3.+.4)*.045));}`).join('')}return d;}
float summerSegmentAt(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(.001,dot(v,v)),0.,1.));}
float summerPathAt(vec2 p){float d=100.;${SUMMER_FOREST_PATHS.map(([a,b])=>`d=min(d,summerSegmentAt(p,vec2(${a.x.toFixed(2)},${a.z.toFixed(2)}),vec2(${b.x.toFixed(2)},${b.z.toFixed(2)})));`).join('')}return d;}
float summerGroundAt(vec2 p){float d=summerIslandAt(p);float bed=-6.-smoothstep(72.,110.,p.x)-smoothstep(110.,132.,p.x)*3.-smoothstep(132.,156.,p.x)*5.-smoothstep(156.,185.,p.x)*8.-smoothstep(16.,65.,abs(p.y+25.))*2.;float island=d<1.?1.25*(1.-smoothstep(.78,1.,d)):-3.2*smoothstep(1.,1.16,d);float h=mix(island,bed,smoothstep(1.05,1.4,d));h+=(1.-smoothstep(0.,14.,length(p-vec2(6.,-30.))))*2.75*(1.-smoothstep(.76,.96,d));float bay=smoothstep(39.,46.,p.x)*(1.-smoothstep(5.,10.,abs(p.y+8.)));h=mix(h,min(h,-3.4),bay);float shelter=1.-smoothstep(4.8,7.2,max(abs(p.x-32.),abs(p.y+8.)));h=mix(h,1.,shelter);float pond=summerPondAt(p);h=mix(h,.33+.92*smoothstep(.35,1.25,pond),1.-smoothstep(1.20,1.40,pond));return h+sin(p.x*.48+p.y*.21)*sin(p.y*.37)*.055*smoothstep(1.1,1.35,d);}
`;
export function summerDockHeight(x: number, z: number): number | null {
  const shelter=SUMMER_SHELTER_FLOOR;
  if(Math.abs(x-shelter.x)<=shelter.width/2&&Math.abs(z-shelter.z)<=shelter.depth/2)return shelter.level;
  const bay=SUMMER_FUEL_BAY;
  if(Math.abs(x-bay.x)<=bay.width/2&&Math.abs(z-bay.z)<=bay.depth/2)return bay.level;
  if (x < 36 || x > 47.1 || Math.abs(z + 8) > 1.05) return null;
  // A gentle landward ramp avoids a discontinuous deck edge in the baked navigation grid.
  return x < 38 ? 1.025 - smooth(36, 38, x) * .225 : .8;
}
export function summerWalkingSurface(x: number, z: number): number | null {
  const deck = summerDockHeight(x, z);
  if (deck !== null) return deck;
  const h = summerGroundHeight(x, z);
  return h >= -SUMMER_WADING_DEPTH && summerInsideBounds(x, z, .3) ? h : null;
}
export function summerInsideBounds(x: number, z: number, margin = 0) {
  return Number.isFinite(x) && Number.isFinite(z) && x >= SUMMER_BOUNDS.minX + margin && x <= SUMMER_BOUNDS.maxX - margin && z >= SUMMER_BOUNDS.minZ + margin && z <= SUMMER_BOUNDS.maxZ - margin;
}
function segmentDistance(x: number, z: number, a: {x: number; z: number}, b: {x: number; z: number}) {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
export function summerRouteDistance(x: number, z: number) {
  let distance = Infinity;
  for (let i = 1; i < SUMMER_ROUTE.length; i++) distance = Math.min(distance, segmentDistance(x, z, SUMMER_ROUTE[i - 1], SUMMER_ROUTE[i]));
  return distance;
}
/** Author scenery outside these routes. At least 1.8 m of walking and 2.5 m of swimming remain clear. */
export function summerClearance(x: number, z: number) {
  return summerRouteDistance(x, z) < 2.2 || Object.values(SUMMER_LANDMARKS).some(p => Math.hypot(x - p.x, z - p.z) < (p.x>95?3:4))
    || summerForestPathDistance(x,z)<2.1
    || segmentDistance(x, z, SUMMER_LANDMARKS.berth, SUMMER_LANDMARKS.channel) < 7
    || segmentDistance(x, z, SUMMER_LANDMARKS.channel, SUMMER_LANDMARKS.mooring) < 7;
}
export interface SummerCollider {
  id: string; kind: 'cylinder' | 'box'; x: number; z: number; minY: number; maxY: number;
  radius?: number; halfX?: number; halfZ?: number;
}
/** Physical furniture footprints; shared by the walking bake and world collision. */
export const summerFurniture:SummerCollider[]=[
  {id:'beach-table',kind:'box',x:SUMMER_BEACH.x+.95,z:SUMMER_BEACH.z,halfX:.65,halfZ:.70,minY:summerGroundHeight(-40,2),maxY:summerGroundHeight(-40,2)+.72},
  ...[-1.7,1.7].map(z=>({id:`ending-chair-${z}`,kind:'box' as const,x:SUMMER_BEACH.x-.9,z:SUMMER_BEACH.z+z,halfX:.54,halfZ:.54,minY:summerGroundHeight(-40.9,2+z),maxY:summerGroundHeight(-40.9,2+z)+1.2})),
  {id:'ending-parasol',kind:'cylinder',x:-39.1,z:-.8,radius:.06,minY:summerGroundHeight(-39.1,-.8),maxY:4},
  {id:'lookout-table',kind:'box',x:SUMMER_LOOKOUT_TABLE.x,z:SUMMER_LOOKOUT_TABLE.z,halfX:.575,halfZ:.34,minY:summerGroundHeight(6,-31.6),maxY:summerGroundHeight(6,-31.6)+.8},
  {id:'chart-table',kind:'box',x:32,z:-9.7,halfX:1.225,halfZ:.525,minY:1,maxY:1.84},
  {id:'equipment-table',kind:'box',x:34.2,z:-9.65,halfX:.775,halfZ:.45,minY:1,maxY:1.74},
  {id:'scuba-stand',kind:'cylinder',x:29.8,z:-9.5,radius:.4,minY:1,maxY:2.9},
  {id:'fuel-table',kind:'box',x:SUMMER_FUEL_BAY.x,z:SUMMER_FUEL_BAY.tableZ,halfX:.575,halfZ:.325,minY:.8,maxY:1.55},
];
export function summerLandBlocked(x:number,z:number,radius=.1){
  return summerFurniture.some(c=>summerColliderIntersects(c,x,z,-2,6,radius));
}
export const summerWorldColliders: SummerCollider[] = [];
summerWorldColliders.push(...summerFurniture);
SUMMER_WRECK_SECTIONS.forEach((section,index)=>{
  for(const side of [-1,1]){
    if(side===1&&index>=2&&index<=5)continue;
    const bottom=summerGroundHeight(section.x,-28);
    summerWorldColliders.push({id:`wreck-rib-${index}-${side}`,kind:'box',x:section.x,z:-28+side*section.width,halfX:.22,halfZ:.24,minY:bottom-.1,maxY:bottom+2.8});
    const next=SUMMER_WRECK_SECTIONS[index+1];
    if(next&&!(side===1&&index>=2&&index<=5))summerWorldColliders.push({id:`wreck-hull-${index}-${side}`,kind:'box',x:(section.x+next.x)/2,z:-28+side*(section.width+next.width)*.46,halfX:(next.x-section.x)/2,halfZ:Math.abs(next.width-section.width)*.5+.18,minY:bottom-.4,maxY:bottom+2.45});
  }
});
for (const x of [38, 42, 46]) for (const z of [-9.25, -6.75]) summerWorldColliders.push({ id: `dock-post-${x}-${z}`, kind: 'cylinder', x, z, radius: .14, minY: summerGroundHeight(x, z) - .2, maxY: 1.1 });
summerWorldColliders.push({id:'dock-deck',kind:'box',x:41.55,z:-8,halfX:5.55,halfZ:1.05,minY:.58,maxY:.8});
summerWorldColliders.push({id:'shelter-floor',kind:'box',x:32,z:-8,halfX:4.2,halfZ:3.2,minY:.90,maxY:1.025});
summerWorldColliders.push({id:'fuel-bay-deck',kind:'box',x:SUMMER_FUEL_BAY.x,z:SUMMER_FUEL_BAY.z,halfX:SUMMER_FUEL_BAY.width/2,halfZ:SUMMER_FUEL_BAY.depth/2,minY:.58,maxY:.8});
for(const x of [43,45])for(const z of [-11.35,-9.25])summerWorldColliders.push({id:`fuel-bay-post-${x}-${z}`,kind:'cylinder',x,z,radius:.14,minY:summerGroundHeight(x,z)-.2,maxY:.68});
for (const x of [28, 36]) for (const z of [-11, -5]) summerWorldColliders.push({ id: `shelter-post-${x}-${z}`, kind: 'cylinder', x, z, radius: .13, minY: .8, maxY: 3.8 });
// Separate wall meshes/colliders leave an open top and wide, visible passages at the fork.
for (const [x, z, halfX, halfZ, height] of [[151,-31,7,2,7],[159,-3,9,2.4,8],[181,-43,15,2.8,9],[192,-12,2.8,12,8]]) {
  const bottom = summerGroundHeight(x, z) - .35;
  summerWorldColliders.push({id:`canyon-${x}-${z}`,kind:'box',x,z,halfX,halfZ,minY:bottom,maxY:bottom+height});
}
for (const [x,z,radius,height] of [[110,-35,1.7,1.8],[117,-25,1.3,2],[124,-45,1.8,2.2],[133,-38,1.7,2],[140,-28,1.6,2],[145,-9,1.8,2.3],[161,-27,1.7,2],[169,-18,1.5,1.8],[177,-35,1.4,1.8],[187,-24,1.6,2.1]]) {
  if(summerRouteDistance(x,z)<radius+2)continue;
  const bottom = summerGroundHeight(x,z) - .1;
  summerWorldColliders.push({id:`reef-${x}-${z}`,kind:'cylinder',x,z,radius,minY:bottom,maxY:bottom+height});
}
for(let index=0;index<42;index++){
  const phase=index*2.399,x=102+(index*17.37)%96,z=-58+(index*23.81)%54,radius=.65+(Math.sin(phase)+1)*.48;
  if(summerClearance(x,z)||summerRouteDistance(x,z)<radius+3||summerWorldColliders.some(c=>summerColliderIntersects(c,x,z,-30,0,radius+1)))continue;
  const bottom=summerGroundHeight(x,z)-.12;
  summerWorldColliders.push({id:`reef-scatter-${index}`,kind:'cylinder',x,z,radius,minY:bottom,maxY:bottom+radius*1.05});
}
export const summerReefObstacles = summerWorldColliders.filter(c => c.id.startsWith('reef-') || c.id.startsWith('canyon-'));
export function summerColliderIntersects(c: SummerCollider, x: number, z: number, minY: number, maxY: number, radius: number) {
  if (maxY <= c.minY || minY >= c.maxY) return false;
  if (c.kind === 'cylinder') return (x-c.x)**2+(z-c.z)**2 < (radius+(c.radius??0))**2;
  const dx = Math.max(0, Math.abs(x-c.x)-(c.halfX??0)), dz = Math.max(0, Math.abs(z-c.z)-(c.halfZ??0));
  return dx*dx+dz*dz < radius*radius;
}
