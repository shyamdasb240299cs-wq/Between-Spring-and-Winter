import * as THREE from 'three';

/** Local light scattering at each actual lamp, without full-screen bloom/blur. */
export function createLanternLight(){
  const geometry=new THREE.InstancedBufferGeometry(),quad=new THREE.PlaneGeometry(1,1);
  geometry.index=quad.index;geometry.attributes=quad.attributes;
  const centres=new THREE.InstancedBufferAttribute(new Float32Array(64*3),3),levels=new THREE.InstancedBufferAttribute(new Float32Array(64),1);
  geometry.setAttribute('centre',centres);geometry.setAttribute('level',levels);geometry.instanceCount=0;
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec3 centre;attribute float level;varying vec2 vUv;varying float vLevel;void main(){vUv=uv;vLevel=level;vec4 p=viewMatrix*vec4(centre,1.);p.xy+=position.xy*vec2(1.1,1.25);gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec2 vUv;varying float vLevel;void main(){vec2 p=(vUv-.5)*2.;float r=dot(p,p);float halo=max(0.,exp(-r*5.)-.0067);gl_FragColor=vec4(1.,.49,.19,halo*.13*vLevel);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const mesh=new THREE.Mesh(geometry,material),reflection=new THREE.Mesh(geometry,material);mesh.frustumCulled=reflection.frustumCulled=false;
  return {mesh,reflection,reset(){geometry.instanceCount=0;},place(x:number,z:number){centres.setXYZ(geometry.instanceCount++,x,.73,z);centres.needsUpdate=true;},light(i:number,power:number){levels.setX(i,power);levels.needsUpdate=true;},dispose(){geometry.dispose();material.dispose();}};
}
