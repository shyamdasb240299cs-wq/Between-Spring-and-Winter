import * as THREE from 'three';

/** Depth-tested sunlight: trunks, canopies and the parasol really occlude the glare. */
export function createSeasonSun(direction:readonly number[],colour:number){
  const sunDirection=new THREE.Vector3(...direction).normalize();
  const geometry=new THREE.PlaneGeometry(22,22),material=new THREE.ShaderMaterial({
    uniforms:{sunColour:{value:new THREE.Color(colour)}},transparent:true,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 sunUv;void main(){sunUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 sunUv;uniform vec3 sunColour;void main(){float r=length(sunUv);if(r>1.)discard;float disc=1.-smoothstep(.044,.058,r);float halo=exp(-r*7.)*.16;float rays=pow(abs(cos(atan(sunUv.y,sunUv.x)*3.)),20.)*exp(-r*11.)*.07;float light=(disc*2.4+halo+rays)*(1.-smoothstep(.6,1.,r));gl_FragColor=vec4(sunColour*light,1.);}`,
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Occluded warm sun and optical halo';mesh.frustumCulled=false;mesh.renderOrder=3;mesh.userData.skipOceanReflection=true;
  return {mesh,update(camera:THREE.Camera){mesh.position.copy(camera.position).addScaledVector(sunDirection,170);mesh.quaternion.copy(camera.quaternion);}};
}
