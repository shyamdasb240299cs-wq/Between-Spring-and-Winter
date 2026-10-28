/** Shared metre-space anchors for Spring's trail, its map, terrain and collisions. */
export const SPRING_RADIUS=36;
export const SPRING_SPOTS={picnic:{x:-3.7,z:-2.2},school:{x:-27,z:18},train:{x:-19,z:-11},bus:{x:-12,z:-24},lake:{x:15,z:-17},garden:{x:5,z:-28},dig:{x:22,z:-24}} as const;
export const ADAVI_SIGN={x:-8.8,z:-3,yaw:-.35} as const;
export const SPRING_LANDMARKS={tree:{x:15,z:-24},stone:{x:28.2,z:-20.3},bridge:{x:22,z:-12},rocks:{x:27.4,z:-24.2}} as const;
/** The old pond is now a continuous, gently meandering river. Keep the name for saved map anchors. */
export const SPRING_POND={x:22,z:-14,radiusX:4.75,radiusZ:36,level:.30} as const;
export const SPRING_BRIDGE={x:22,z:-12,halfLength:7.1,halfWidth:.95,crown:1.10} as const;
/** Both reaches bend east, past the terrain and camera range; neither closes into a pond. */
export const SPRING_RIVER_REACH={minZ:-210,maxZ:190} as const;
export const springRiverCentre=(z:number)=>22+Math.sin((z+12)*.11)*.7+Math.sin((z+12)*.27)*.16+.014*Math.max(0,-z-34)**2+.016*Math.max(0,z-8)**2;
export const springRiverWidth=(z:number)=>4.75+Math.sin((z+12)*.15)*.28;
export const SPRING_LAKE_BENCH={x:13.5,z:-17,yaw:Math.PI*.5} as const;

const routes:readonly (readonly (readonly [number,number])[])[]=[
  [[0,3.5],[-3.7,-2.2],[-7.2,.2],[-11,4.2],[-16,8],[-22,12],[-27,18],[-22,12],[-18,2],[-17,-5],[-19,-9.1],[-20,-15],[-17.5,-20],[-12,-22.1],[-5,-24.5],[5,-26.5],[12,-25.5],[18,-25.7],[22,-24]],
  [[-12,-22.1],[-8,-18],[0,-16],[8,-17],[13.5,-17]],
  [[-11,4.2],[-6,-4],[0,-10],[8,-17]],
  [[13.5,-17],[12.3,-20.4],[15,-23],[18,-25.7]],
  [[13.5,-17],[14.2,-12],[22,-12],[29.1,-12],[29.3,-17],[28.2,-20.3],[27.4,-24.2]],
  [[14.2,-12],[14.1,-7],[15,-2],[16,3]],
  [[29.1,-12],[28.6,-7],[28.5,-2],[27.5,3]],
  [[13.5,-17],[13.5,-28],[12,-38],[12,-100]],
];
export const SPRING_ROUTES=routes;
function lineDistance(x:number,z:number,a:readonly number[],b:readonly number[]){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
export function springPathDistance(x:number,z:number){let d=Infinity;for(const route of routes)for(let n=1;n<route.length;n++)d=Math.min(d,lineDistance(x,z,route[n-1],route[n]));return d;}
/** Same continuous rounded channel in terrain, navigation and the water shader. */
export function springPondDistance(x:number,z:number){return Math.abs(x-springRiverCentre(z))/springRiverWidth(z);}
/** Reserve furniture, readable approaches, and the whole trail before planting. */
export function springClearance(x:number,z:number){
  if(z< -28&&z> -105&&Math.abs(x-12)<(z< -60?7:4))return true;
  if(springPathDistance(x,z)<1.45||springPondDistance(x,z)<1.15)return true;
  if(Object.entries(SPRING_SPOTS).some(([id,p])=>Math.hypot(x-p.x,z-p.z)<(id==='school'?4.2:id==='picnic'?3.2:id==='lake'?3.5:3.1)))return true;
  return Object.entries(SPRING_LANDMARKS).some(([id,p])=>id!=='tree'&&Math.hypot(x-p.x,z-p.z)<2.1);
}
export function springObstacles(){const b=SPRING_LAKE_BENCH;return [-.72,0,.72].map(d=>({x:b.x+Math.cos(b.yaw)*d,z:b.z-Math.sin(b.yaw)*d,radius:.48}));}
