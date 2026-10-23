import type {SeasonId} from './seasons';
import {SPRING_SPOTS} from './spring-treasure-layout';

export const CHEST_SCALE=.68;
export const CHEST_COLLISION_RADIUS=.43;

/** Metres relative to the existing picnic, chaise, bench or campfire arrangement. */
export function relicPlacement(id:SeasonId,prop:{x:number;z:number}){
  if(id==='spring')return {chest:{...SPRING_SPOTS.dig},key:{x:SPRING_SPOTS.school.x+.65,z:SPRING_SPOTS.school.z},yaw:.25};
  // Beside a corner/end of the arrangement, with the lid opening away from its approach.
  const offset=id==='summer'?{chest:[-1.60,-1.50],key:[-.55,2.20],yaw:-.15}:
    id==='autumn'?{chest:[2.05,.40],key:[-1.35,.95],yaw:-.35}:
    {chest:[-1.65,-1.45],key:[1.8,.65],yaw:.25};
  return {chest:{x:prop.x+offset.chest[0],z:prop.z+offset.chest[1]},key:{x:prop.x+offset.key[0],z:prop.z+offset.key[1]},yaw:offset.yaw};
}
