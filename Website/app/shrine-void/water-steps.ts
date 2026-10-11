import * as THREE from 'three';
import {createFootstepMotion} from './footstep-motion';

/** Surface waves live in the water shader. Only small physical spray meshes are separate. */
export function createWaterSteps(reduced:boolean,onStep:(side:number)=>void){
  const group=new THREE.Group(),count=6,impacts=Array.from({length:count},()=>new THREE.Vector4(0,0,-1000,1));
  const uniforms={stepTime:{value:0},origin:{value:0},impacts:{value:impacts}};
  const source=new THREE.IcosahedronGeometry(1,0),geometry=new THREE.InstancedBufferGeometry();
  geometry.index=source.index;geometry.attributes=source.attributes;
  geometry.setAttribute('impactIndex',new THREE.InstancedBufferAttribute(Float32Array.from({length:count*12},(_,i)=>Math.floor(i/12)),1));
  geometry.setAttribute('seed',new THREE.InstancedBufferAttribute(Float32Array.from({length:count*12},(_,i)=>(i%12+.37)/12),1));
  geometry.instanceCount=reduced?0:count*12;
  const material=new THREE.MeshStandardMaterial({color:0xb8afb6,metalness:.16,roughness:.14,transparent:true,opacity:.58,depthWrite:false});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='attribute float impactIndex,seed;uniform vec4 impacts[6];uniform float stepTime,origin;varying float dropAlive;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 e=impacts[int(impactIndex)];float age=stepTime-e.z;
      float t=clamp(age,0.,.42),a=seed*6.283+e.w;
      float velocity=.85+fract(seed*7.1)*.45;
      float height=velocity*t-4.9*t*t;
      dropAlive=step(0.,age)*step(.015,height);
      transformed*=vec3(.007,.012,.007)*dropAlive;
      transformed+=vec3(e.x+cos(a)*t*.6,.025+max(0.,height),origin-e.y+sin(a)*t*.6);`);
    shader.fragmentShader='varying float dropAlive;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(dropAlive<.5)discard;');
  };
  const spray=new THREE.Mesh(geometry,material);spray.frustumCulled=false;group.add(spray);
  const gait=createFootstepMotion();let slot=0;
  return {group,uniforms,update(time:number,x:number,distance:number,yaw:number,origin:number,moving:boolean){
    uniforms.stepTime.value=time;uniforms.origin.value=origin;
    const step=gait.update(x,distance,moving);
    if(step.contact){
      const forward=.36,lateral=step.side*.19;
      impacts[slot].set(x-Math.sin(yaw)*forward+Math.cos(yaw)*lateral,distance+Math.cos(yaw)*forward+Math.sin(yaw)*lateral,time,1);
      slot=(slot+1)%count;onStep(step.side);
    }
    return reduced?0:step.bob;
  },dispose(){geometry.dispose();material.dispose();}};
}
