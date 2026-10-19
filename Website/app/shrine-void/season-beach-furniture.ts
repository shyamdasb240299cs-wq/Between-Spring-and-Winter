import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {groundHeight,BEACH_SEATING} from './season-layout';

/** Slatted teak chaise, stitched canvas cushions and a full ribbed 3.8 m parasol. */
export function createBeachFurniture(x:number,z:number){
  const group=new THREE.Group();group.name='Full-length teak beach lounger and large parasol';
  const wood=new THREE.MeshStandardMaterial({color:0x94643c,roughness:.67});
  wood.onBeforeCompile=s=>{s.vertexShader='varying vec3 furnitureLocal;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfurnitureLocal=position;');s.fragmentShader='varying vec3 furnitureLocal;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=sin(furnitureLocal.z*183.+sin(furnitureLocal.x*37.)*2.);diffuseColor.rgb*=.94+grain*.055;');};
  const canvas=new THREE.MeshStandardMaterial({color:0xd7c5a4,roughness:.98});
  canvas.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat weave=sin(vMapUv.x*840.)*sin(vMapUv.y*840.);diffuseColor.rgb*=.985+weave*.015;');};
  // UVs are enabled with a tiny neutral texture; the weave stays on the fabric surface.
  const neutral=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);neutral.needsUpdate=true;canvas.map=neutral;
  const teal=new THREE.MeshStandardMaterial({color:0x376e72,roughness:.94,side:THREE.DoubleSide});
  const cream=new THREE.MeshStandardMaterial({color:0xdfcfaf,roughness:.94,side:THREE.DoubleSide});
  const metal=new THREE.MeshStandardMaterial({color:0x9d9990,metalness:.65,roughness:.3});
  const seam=new THREE.MeshStandardMaterial({color:0xb49f7c,roughness:1});
  const bins=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const push=(g:THREE.BufferGeometry,m:THREE.Material)=>{if(!bins.has(m))bins.set(m,[]);bins.get(m)!.push(g);};
  const s=BEACH_SEATING,seat=new THREE.Matrix4().compose(new THREE.Vector3(x+s.chairX,groundHeight('summer',x+s.chairX,z+s.chairZ),z+s.chairZ),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),s.yaw),new THREE.Vector3(1,1,1));
  const box=(w:number,h:number,d:number,px:number,py:number,pz:number,m:THREE.Material,angle=0,rounded=false)=>{
    const g=rounded?new RoundedBoxGeometry(w,h,d,2,.035):new THREE.BoxGeometry(w,h,d);g.rotateX(angle);g.translate(px,py,pz);g.applyMatrix4(seat);push(g,m);
  };
  function rod(a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material){const delta=b.clone().sub(a),g=new THREE.CylinderGeometry(r,r,delta.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);push(g,m);}
  // Continuous rails, individual slats and legs embedded in the actual sloped sand.
  for(const side of [-1,1]){
    box(.065,.12,2.24,side*.46,.34,0,wood);
    for(const end of [-.8,.8]){
      const top=new THREE.Vector3(side*.43,.35,end).applyMatrix4(seat),bottom=new THREE.Vector3(side*.49,0,end+.06).applyMatrix4(seat);bottom.y=groundHeight('summer',bottom.x,bottom.z)-.025;rod(bottom,top,.038,wood);
    }
  }
  for(let i=0;i<14;i++)box(.92,.045,.075,0,.405,-.38+i*.105,wood);
  const incline=.49;
  for(let i=0;i<8;i++){const d=i*.095;box(.92,.045,.075,0,.43+d*Math.sin(incline),-.42-d*Math.cos(incline),wood,incline);}
  box(.87,.11,1.35,0,.49,.29,canvas,0,true);
  box(.87,.105,.79,0,.64,-.78,canvas,incline,true);
  box(.61,.14,.24,0,.86,-1.01,canvas,incline,true);
  // Narrow piping and fasteners remain visible at close range.
  for(const side of [-1,1]){box(.008,.008,1.28,side*.424,.54,.29,seam);box(.008,.008,.73,side*.424,.69,-.78,seam,incline);}
  for(const end of [-.83,.82])for(const side of [-1,1]){const g=new THREE.SphereGeometry(.018,8,5);g.translate(side*.495,.35,end);g.applyMatrix4(seat);push(g,metal);}
  const px=x+s.poleX,pz=z+s.poleZ,base=groundHeight('summer',px,pz);
  rod(new THREE.Vector3(px,base-.07,pz),new THREE.Vector3(px,base+2.94,pz),.034,wood);
  // Alternating curved gores, a scalloped valance, underside ribs and hub braces.
  const panels=12,rings=10,steps=6,radius=1.9;
  for(let panel=0;panel<panels;panel++){
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let ring=0;ring<=rings;ring++)for(let j=0;j<=steps;j++){
      const r=ring/rings,a=(panel+j/steps)*Math.PI*2/panels,billow=Math.sin(j/steps*Math.PI)*.065*r;
      vertices.push(px+Math.cos(a)*radius*r,base+2.94-.59*r*r-billow,pz+Math.sin(a)*radius*r);uv.push(j/steps,r);
    }
    for(let ring=0;ring<rings;ring++)for(let j=0;j<steps;j++){const a=ring*(steps+1)+j,b=a+steps+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();push(g,panel%2?cream:teal);
    const a=panel*Math.PI*2/panels;
    for(let k=0;k<5;k++){const r=k/5,r2=(k+1)/5;rod(new THREE.Vector3(px+Math.cos(a)*radius*r,base+2.91-.59*r*r,pz+Math.sin(a)*radius*r),new THREE.Vector3(px+Math.cos(a)*radius*r2,base+2.91-.59*r2*r2,pz+Math.sin(a)*radius*r2),.009,wood);}
    rod(new THREE.Vector3(px,base+2.27,pz),new THREE.Vector3(px+Math.cos(a)*.85,base+2.79,pz+Math.sin(a)*.85),.009,metal);
    for(let j=0;j<steps;j++){const a0=(panel+j/steps)*Math.PI*2/panels,a1=(panel+(j+1)/steps)*Math.PI*2/panels;rod(new THREE.Vector3(px+Math.cos(a0)*radius,base+2.35-Math.sin(j/steps*Math.PI)*.065,pz+Math.sin(a0)*radius),new THREE.Vector3(px+Math.cos(a1)*radius,base+2.35-Math.sin((j+1)/steps*Math.PI)*.065,pz+Math.sin(a1)*radius),.014,panel%2?cream:teal);}
  }
  for(const [material,parts]of bins){const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}
  return group;
}
