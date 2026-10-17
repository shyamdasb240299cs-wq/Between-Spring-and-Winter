import * as THREE from 'three';

const SEGMENTS=24;
const HALF_HEIGHT=2.245;
const HALF_THICKNESS=.008;

/** A solid cloth shell, embedded into both boards, including its end caps. */
export function createBookBinding(){
  const geometry=new THREE.BufferGeometry(),indices:number[]=[];
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((SEGMENTS+1)*4*3),3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array((SEGMENTS+1)*4*2),2));
  const quad=(a:number,b:number,c:number,d:number)=>indices.push(a,c,b,a,d,c);
  for(let i=0;i<SEGMENTS;i++){
    const a=i*4,b=a+4;
    quad(a,b,b+1,a+1);quad(a+2,a+3,b+3,b+2);
    quad(a,a+2,b+2,b);quad(a+1,b+1,b+3,a+3);
  }
  quad(0,1,3,2);const end=SEGMENTS*4;quad(end,end+2,end+3,end+1);
  geometry.setIndex(indices);
  updateBookBinding(geometry,0,0);
  return geometry;
}

export function updateBookBinding(geometry:THREE.BufferGeometry,opening:number,close:number){
  const front=-Math.PI*opening,back=-Math.PI*close;
  // Each end sits 0.035 units inside the corresponding solid cover board.
  const ax=-1.43+.035*Math.cos(front),az=.0045-.0535*opening-.035*Math.sin(front);
  const bx=-1.43+.035*Math.cos(back),bz=-.049+.0553*close-.035*Math.sin(back);
  const bisector=(front+back)/2;
  const cx=(ax+bx)/2-.19*Math.cos(bisector),cz=(az+bz)/2+.19*Math.sin(bisector);
  const position=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<=SEGMENTS;i++){
    const t=i/SEGMENTS,v=1-t,x=v*v*ax+2*v*t*cx+t*t*bx,z=v*v*az+2*v*t*cz+t*t*bz;
    const dx=2*(v*(cx-ax)+t*(bx-cx)),dz=2*(v*(cz-az)+t*(bz-cz)),length=Math.max(.00001,Math.hypot(dx,dz));
    const nx=-dz/length,nz=dx/length;
    for(let j=0;j<4;j++){
      const side=j<2?1:-1,y=j%2===0?HALF_HEIGHT:-HALF_HEIGHT,index=i*4+j;
      position.setXYZ(index,x+nx*HALF_THICKNESS*side,y,z+nz*HALF_THICKNESS*side);
      uv.setXY(index,t,j%2);
    }
  }
  position.needsUpdate=true;uv.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
}
