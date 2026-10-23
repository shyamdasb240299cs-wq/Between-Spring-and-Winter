/** Shared metre-space anchors for Spring's trail, its map, terrain and collisions. */
export const SPRING_RADIUS=36;
export const SPRING_SPOTS={picnic:{x:-3.7,z:-2.2},school:{x:-11,z:2},train:{x:-19,z:-11},bus:{x:-12,z:-24},lake:{x:15,z:-17},garden:{x:5,z:-28},dig:{x:22,z:-24}} as const;
export const SPRING_LANDMARKS={tree:{x:15,z:-24},stone:{x:28,z:-24},bridge:{x:22,z:-12},rocks:{x:22,z:-30}} as const;
export const SPRING_POND={x:19.3,z:-17.6,radiusX:4.3,radiusZ:3.8,level:.30} as const;
export const SPRING_LAKE_BENCH={x:13.5,z:-17,yaw:Math.PI*.5} as const;

const routes:readonly (readonly (readonly [number,number])[])[]=[
  [[0,3.5],[-3.7,-2.2],[-7.2,.2],[-11,4.2],[-14.5,.5],[-17,-5],[-19,-9.1],[-20,-15],[-17.5,-20],[-12,-22.1],[-5,-24.5],[5,-26.5],[12,-25.5],[18,-25.7],[22,-24]],
  [[-12,-22.1],[-8,-18],[0,-16],[8,-17],[13.5,-17]],
  [[-11,4.2],[-6,-4],[0,-10],[8,-17]],
  [[13.5,-17],[12.3,-20.4],[15,-23],[18,-25.7]],
  [[13.5,-17],[14,-12],[18.2,-12],[22,-12],[26.2,-14.2],[26,-20],[28,-24],[26,-28],[22,-30]],
];
export const SPRING_ROUTES=routes;
function lineDistance(x:number,z:number,a:readonly number[],b:readonly number[]){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
export function springPathDistance(x:number,z:number){let d=Infinity;for(const route of routes)for(let n=1;n<route.length;n++)d=Math.min(d,lineDistance(x,z,route[n-1],route[n]));return d;}
/** Unit distance includes the narrow inlet beneath the little footbridge. */
export function springPondDistance(x:number,z:number){const p=SPRING_POND,main=Math.hypot((x-p.x)/p.radiusX,(z-p.z)/p.radiusZ);const inlet=Math.hypot((x-22)/.85,Math.max(0,Math.abs(z+12.8)-4.4)/.9);return Math.min(main,inlet);}
/** Reserve furniture, readable approaches, and the whole trail before planting. */
export function springClearance(x:number,z:number){
  if(springPathDistance(x,z)<1.45||springPondDistance(x,z)<1.15)return true;
  if(Object.entries(SPRING_SPOTS).some(([id,p])=>Math.hypot(x-p.x,z-p.z)<(id==='school'?4.2:id==='picnic'?3.2:id==='lake'?3.5:3.1)))return true;
  return Object.entries(SPRING_LANDMARKS).some(([id,p])=>id!=='tree'&&Math.hypot(x-p.x,z-p.z)<2.1);
}
export function springObstacles(){return [
  ...[[-20.28,-11.755],[-17.72,-11.755],[-20.28,-10.245],[-17.72,-10.245],[-13.73,-24.93],[-10.27,-24.93],[-13.73,-23.07],[-10.27,-23.07]].map(([x,z])=>({x,z,radius:.11})),
  {x:-19,z:-11.5,radius:.8},{x:-20.3,z:-11.5,radius:.35},{x:-17.7,z:-11.5,radius:.35},
  {x:-12,z:-24.4,radius:.85},{x:-10.5,z:-24.1,radius:.42},
  {x:SPRING_LAKE_BENCH.x,z:SPRING_LAKE_BENCH.z,radius:.72},
  {x:5,z:-28.6,radius:.8},{x:28,z:-24,radius:.65},
  {x:21.5,z:-30,radius:.8},{x:22.6,z:-30.3,radius:.63},
];}
