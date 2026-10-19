import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {AUTUMN_LAKE_LEVEL,random} from './season-layout';

export const FISH_COUNT=8;
/** One brief leap every 23–31 seconds; swimming and jumping share the same trajectories. */
export function fishJumpAt(time:number){
  let start=11,cycle=0;
  // Bounded modulo timeline avoids accumulating timers, including after tab suspension.
  const period=216,t=((time%period)+period)%period;
  for(let i=0;i<8;i++){const duration=23+random(i+94)*8;if(t<start+duration||i===7){cycle=i;break;}start+=duration;}
  const age=t-start;return {index:cycle,age,active:age>=0&&age<1.2};
}
export function createLakeFish(mobile:boolean,reduced:boolean,ripple:(x:number,z:number,t:number)=>boolean){
  const states=Array.from({length:FISH_COUNT},()=>new THREE.Vector4()),headings=Array.from({length:FISH_COUNT},()=>new THREE.Vector2());
  const parts:THREE.BufferGeometry[]=[];
  function part(g:THREE.BufferGeometry,colour:number){const c=new THREE.Color(colour),colours=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colours.length;i+=3){colours[i]=c.r;colours[i+1]=c.g;colours[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(colours,3));parts.push(g);}
  const body=new THREE.SphereGeometry(1,12,8);body.scale(.044,.062,.15);part(body,0x92947a);
  const back=new THREE.SphereGeometry(1,10,6);back.scale(.034,.029,.125);back.translate(0,.038,0);part(back,0x4d6753);
  const tail=new THREE.BufferGeometry();tail.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.12,0,.074,-.23,0,-.064,-.23],3));tail.setAttribute('uv',new THREE.Float32BufferAttribute([.5,0,1,1,0,1],2));tail.setIndex([0,1,2]);tail.computeVertexNormals();part(tail,0x747959);
  for(const side of [-1,1]){const eye=new THREE.SphereGeometry(.009,6,4);eye.translate(side*.031,.018,.10);part(eye,0x101a17);}
  const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
  const clock={value:0};const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.36,metalness:.1,side:THREE.DoubleSide});
  material.onBeforeCompile=s=>{s.uniforms.fishTime=clock;s.vertexShader='uniform float fishTime;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(fishTime*18.+position.z*18.)*smoothstep(.04,.22,-position.z)*.025;');s.fragmentShader='varying vec3 fishWorld;\n'+s.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif(fishWorld.y<${AUTUMN_LAKE_LEVEL.toFixed(2)})discard;`);s.vertexShader='varying vec3 fishWorld;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nfishWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;');};
  const mesh=new THREE.InstancedMesh(geometry,material,FISH_COUNT);mesh.name='Small lake fish · occasional surface leaps';mesh.frustumCulled=false;mesh.userData.skipLakeReflection=true;
  const transform=new THREE.Object3D();let previousTime=0,jumps=0;
  function update(time:number){const t=reduced?0:time;clock.value=t;const jump=fishJumpAt(t),prev=fishJumpAt(previousTime);
    for(let i=0;i<FISH_COUNT;i++){
      const a=t*(.075+i*.003)+i*2.399,rx=2.4+random(i+71)*1.9,rz=1.2+random(i+55)*.9;
      const x=.8+Math.cos(a)*rx,z=-12.2+Math.sin(a)*rz,dx=-Math.sin(a)*rx,dz=Math.cos(a)*rz,len=Math.hypot(dx,dz);
      const leap=!reduced&&jump.active&&jump.index===i;
      const y=AUTUMN_LAKE_LEVEL-(.18+random(i+10)*.20)+(leap?Math.sin(jump.age/1.2*Math.PI)*.86:Math.sin(t*.7+i)*.025);
      states[i].set(x,z,y,.85+random(i+19)*.3);headings[i].set(dx/len,dz/len);
      if(i<mesh.instanceMatrix.count){transform.position.set(x,y,z);transform.rotation.set(leap?-.65*Math.cos(jump.age/1.2*Math.PI):0,Math.atan2(dx,dz),leap?.16:0);transform.scale.setScalar(states[i].w);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);}
    }
    if(!reduced&&t>=previousTime&&t-previousTime<2){
      if(jump.active&&!prev.active){const f=states[jump.index];ripple(f.x,f.y,t);jumps++;}
      if(prev.active&&!jump.active){const f=states[prev.index];ripple(f.x,f.y,t);}
    }
    previousTime=t;mesh.instanceMatrix.needsUpdate=true;
  }
  update(0);
  return {mesh,states,headings,update,get jumps(){return jumps;},dispose(){mesh.dispose();geometry.dispose();material.dispose();}};
}
