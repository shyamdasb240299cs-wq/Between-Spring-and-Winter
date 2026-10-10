import * as THREE from 'three';

/** Twelve reusable impacts: one instanced ring draw and one droplet draw. */
export function createWaterSteps(reduced:boolean,onStep:(side:number)=>void){
  const group=new THREE.Group(),count=12,emissions=Array.from({length:count},()=>new THREE.Vector4(0,0,-1000,0));
  const uniforms={time:{value:0},origin:{value:0},impacts:{value:emissions}};
  const rings=new THREE.InstancedBufferGeometry(),quad=new THREE.PlaneGeometry(1,1);rings.index=quad.index;rings.attributes=quad.attributes;
  rings.setAttribute('impactIndex',new THREE.InstancedBufferAttribute(Float32Array.from({length:count},(_,i)=>i),1));rings.instanceCount=count;
  const ringMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute float impactIndex;uniform vec4 impacts[12];uniform float time,origin;varying vec2 vUv;varying float vAge;
      void main(){vec4 e=impacts[int(impactIndex)];vAge=time-e.z;vUv=uv;float size=1.+clamp(vAge,0.,2.)*2.4;vec3 p=vec3(position.x*size+e.x,.032,position.y*size-e.y+origin);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 vUv;varying float vAge;void main(){if(vAge<0.||vAge>2.)discard;float r=length(vUv-.5);float ring=exp(-pow((r-.38)*80.,2.))+.4*exp(-pow((r-.31)*90.,2.));float fade=smoothstep(0.,.08,vAge)*(1.-smoothstep(.2,2.,vAge));gl_FragColor=vec4(.65,.6,.58,ring*fade*.2);}`});
  const ringMesh=new THREE.Mesh(rings,ringMaterial);ringMesh.frustumCulled=false;group.add(ringMesh);
  const droplets=new THREE.InstancedBufferGeometry(),dot=new THREE.PlaneGeometry(1,1);droplets.index=dot.index;droplets.attributes=dot.attributes;
  const ids=Float32Array.from({length:count*8},(_,i)=>Math.floor(i/8)),seeds=Float32Array.from({length:count*8},(_,i)=>(i%8)/8);
  droplets.setAttribute('impactIndex',new THREE.InstancedBufferAttribute(ids,1));droplets.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,1));droplets.instanceCount=reduced?0:count*8;
  const dropMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:`attribute float impactIndex,seed;uniform vec4 impacts[12];uniform float time,origin;varying vec2 vUv;varying float vAge;
      void main(){vec4 e=impacts[int(impactIndex)];vAge=time-e.z;vUv=uv;float t=clamp(vAge,0.,.6),a=seed*6.283;vec3 p=vec3(e.x+cos(a)*t*.9,.04+(1.7+seed*.6)*t-4.5*t*t,-e.y+origin+sin(a)*t*.9);vec4 view=viewMatrix*vec4(p,1.);view.xy+=position.xy*vec2(.02,.055);gl_Position=projectionMatrix*view;}`,
    fragmentShader:`varying vec2 vUv;varying float vAge;void main(){if(vAge<0.||vAge>.5)discard;float a=1.-smoothstep(.2,.5,length((vUv-.5)*vec2(1.,.5)));gl_FragColor=vec4(.8,.72,.7,a*(1.-vAge*2.)*.35);}`});
  const dropMesh=new THREE.Mesh(droplets,dropMaterial);dropMesh.frustumCulled=false;group.add(dropMesh);
  let x=0,distance=0,walked=0,slot=0,side=-1,initial=true,gait=0;
  return{group,update(time:number,currentX:number,currentDistance:number,yaw:number,origin:number,moving:boolean){
    uniforms.time.value=time;uniforms.origin.value=origin;
    const movement=Math.hypot(currentX-x,currentDistance-distance);x=currentX;distance=currentDistance;
    if(initial){initial=false;return 0;}
    if(!moving||movement<.0001){walked=0;return 0;}
    walked+=movement;gait+=movement*Math.PI/1.8;
    // The leading bow ripple is visible ahead of the eye-level camera; impact
    // rings persist in world space rather than being glued to the viewport.
    if(walked>=1.8){walked%=1.8;side=-side;const forward=2.5;
      emissions[slot].set(x-Math.sin(yaw)*forward+Math.cos(yaw)*side*.18,distance+Math.cos(yaw)*forward+Math.sin(yaw)*side*.18,time,side);slot=(slot+1)%count;onStep(side);}
    return reduced?0:Math.sin(gait*2)*.013;
  },dispose(){rings.dispose();droplets.dispose();ringMaterial.dispose();dropMaterial.dispose();}};
}
