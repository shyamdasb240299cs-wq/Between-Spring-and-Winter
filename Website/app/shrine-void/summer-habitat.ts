import {summerClearance, summerColliderIntersects, summerGroundHeight, summerWorldColliders} from './summer-layout';

/** Shared homes: the animals and their visible habitat use exactly the same coordinates. */
export const SUMMER_REEF_PATCHES = [
  [102,-35,5], [108,-13,6], [114,-43,7], [120,-20,5], [126,-49,7],
  [132,-29,4], [136,-43,6], [139,-8,7], [145,-39,5], [149,-23,4],
  [153,-49,7], [159,-10,5], [163,-36,5], [168,-48,6], [174,-9,7],
  [179,-38,5], [186,-49,7], [191,-32,6], [198,-19,7], [204,-42,8],
  [117,-57,8], [142,-60,8], [173,-59,8], [199,-58,8],
] as const;
export const reefRandom=(n:number)=>{const r=Math.sin(n*127.1+311.7)*43758.5453;return r-Math.floor(r);};

export function reefPlantable(x:number,z:number,radius=.25){
  return summerGroundHeight(x,z)<-3 && !summerClearance(x,z)
    && !summerWorldColliders.some(c=>summerColliderIntersects(c,x,z,-30,0,radius));
}

// Deterministic, collision-free rocks with a small anemone bed and one resident pair.
export const SUMMER_ANEMONE_HOMES=SUMMER_REEF_PATCHES.filter((_,i)=>i%3===0).map(([px,pz],index)=>{
  for(let attempt=0;attempt<80;attempt++){
    const a=reefRandom(index*101+attempt)*Math.PI*2,r=.8+reefRandom(index*41+attempt+7)*3;
    const x=px+Math.cos(a)*r,z=pz+Math.sin(a)*r;
    if(reefPlantable(x,z,.9))return {x,z,y:summerGroundHeight(x,z)+.5};
  }
  return null;
}).filter((p):p is {x:number;y:number;z:number}=>p!==null);
