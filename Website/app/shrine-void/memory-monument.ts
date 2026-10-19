import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Masonry leaves a real opening around the inset gem, below the cover frame. */
export function createMemoryMonumentGeometry(recessed=true){
  const pieces:THREE.BufferGeometry[]=[];
  function box(w:number,h:number,d:number,x:number,y:number,z:number){const g=new RoundedBoxGeometry(w,h,d,2,.055);g.translate(x,y,z);pieces.push(g);}
  box(1.64,3.62,.4,0,2.45,-.2);
  for(let course=0;course<7;course++)for(const side of [-1,1])box(.34,.5,.62,side*.77,.94+course*.49,-.1);
  box(2.1,.32,.8,0,4.36,-.1);box(1.58,.26,.62,0,3.81,-.08);
  // Two shoulder stones replace the former solid band across the crystal.
  if(recessed)for(const side of [-1,1])box(.54,.24,.62,side*.52,1.03,-.08);
  else box(1.58,.24,.62,0,1.03,-.08);
  for(let course=0;course<2;course++)for(let i=0;i<4;i++){
    const belowSocket=recessed&&course===1&&(i===1||i===2);
    box(.56,belowSocket?.21:.26,.91,(i-1.5)*.56,belowSocket?.53:.3+course*.255,-.08);
  }
  const geometry=mergeGeometries(pieces)!;pieces.forEach(p=>p.dispose());
  const p=geometry.attributes.position,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),chip=Math.sin(x*14+y*5)*Math.cos(z*17+y*3)*.035;
    p.setXYZ(i,x+chip,y+chip*.7,z+chip*.3);
    const shade=.72+.2*(Math.sin(x*4+y*5)*.5+.5);colors[i*3]=shade;colors[i*3+1]=shade;colors[i*3+2]=shade;
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
