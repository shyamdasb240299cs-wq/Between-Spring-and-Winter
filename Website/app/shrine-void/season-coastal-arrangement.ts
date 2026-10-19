import {groundHeight,random,type SeasonLayout} from './season-layout';

export interface CoastalDetail{kind:'coastal-shrub'|'shell'|'rock'|'coral';x:number;z:number;size:number;yaw:number;bury:number;}
/** Landward root clusters leave the beach route, seating and wet sand open. */
export function coastalArrangement(layout:SeasonLayout){
  const details:CoastalDetail[]=[];
  function add(kind:CoastalDetail['kind'],x:number,z:number,size:number,yaw:number,bury:number){
    if(groundHeight('summer',x,z)<.16||Math.hypot(x-layout.prop.x,z-layout.prop.z)<2.1||Math.abs(x)<1.5)return;
    details.push({kind,x,z,size,yaw,bury});
  }
  layout.trees.forEach((tree,index)=>{
    const length=Math.hypot(tree.x,tree.z+3)||1,nx=-tree.x/length,nz=(-3-tree.z)/length,tx=-nz,tz=nx;
    const x=tree.x+nx*.68,z=tree.z+nz*.68;
    add('coastal-shrub',x,z,.52+random(tree.seed)*.16,random(tree.seed+4)*6.28,.025);
    add('rock',x+tx*.52+nx*.10,z+tz*.52+nz*.10,.18+random(tree.seed+1)*.11,tree.yaw,.025);
    add('rock',x+tx*.69-nx*.04,z+tz*.69-nz*.04,.10+random(tree.seed+2)*.07,tree.yaw+1.2,.018);
    for(let n=0;n<2;n++){
      const along=-.46-n*.22,inward=.15+random(tree.seed+n)*.12;
      add('shell',x+tx*along+nx*inward,z+tz*along+nz*inward,.085+random(tree.seed+n+31)*.065,random(tree.seed+n+8)*6.28,.006);
    }
    if(index%3===0)add('coral',x+tx*.30+nx*.52,z+tz*.30+nz*.52,.20+random(tree.seed+13)*.08,tree.yaw-.7,.015);
  });
  return details;
}
