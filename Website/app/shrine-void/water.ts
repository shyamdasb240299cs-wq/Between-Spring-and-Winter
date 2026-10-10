import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

/** One small, non-MSAA reflection of a dedicated low-detail scene, not the main world. */
export function createWater(proxyScene: THREE.Scene) {
  const geometry = new THREE.PlaneGeometry(320,320);
  const mesh = new Reflector(geometry,{
    textureWidth:384,textureHeight:384,multisample:0,clipBias:.003,
    shader: {
      name: 'CalmBlackWater',
      uniforms: { color:{value:new THREE.Color(0x010104)},tDiffuse: { value: null },textureMatrix: { value: new THREE.Matrix4() },time: { value: 0 } },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vReflection; varying vec3 vWorld; void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vReflection=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader: `uniform sampler2D tDiffuse;uniform float time;varying vec4 vReflection;varying vec3 vWorld;
        void main(){vec2 uv=vReflection.xy/vReflection.w;
          // Interference between travelling wavelets produces irregular wrinkles.
          float longWave=sin(vWorld.z*2.9+sin(vWorld.x*1.2+time*.22)*1.6+time*.45);
          float fineWave=sin(vWorld.z*11.2+sin(vWorld.x*2.8-vWorld.z*.7-time*.3)*2.4-time*.65);
          float crossWave=sin(dot(vWorld.xz,vec2(6.3,4.7))+sin(vWorld.z*1.7+time*.2)-time*.8);
          float wrinkle=fineWave*.65+crossWave*.35;
          vec2 wave=vec2(longWave*.0022+wrinkle*.0008,cos(vWorld.x*2.1+vWorld.z*1.8-time*.4)*.0007+crossWave*.00035);
          vec3 reflected=texture2D(tDiffuse,uv+wave).rgb;
          reflected*=.87+.1*longWave+.03*wrinkle;
          float fresnel=pow(1.-clamp(abs(normalize(cameraPosition-vWorld).y),0.,1.),2.);
          vec3 surface=vec3(.01+max(0.,wrinkle)*.0015);
          gl_FragColor=vec4(mix(surface,reflected,.52+.4*fresnel)+vec3(.0012),1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }
  });
  mesh.rotation.x = -Math.PI/2;mesh.position.y = .015;
  const mat = mesh.material as THREE.ShaderMaterial;
  const original = mesh.onBeforeRender.bind(mesh);let last = -Infinity,rate = 24;
  const worldProjection=new THREE.Matrix4(),inverseModel=new THREE.Matrix4();
  const previousPosition=new THREE.Vector3(Infinity,0,0),previousRotation=new THREE.Quaternion();
  mesh.onBeforeRender = (renderer,_scene,camera,geo,material,group) => {
    const now=performance.now()/1000;
    const moved=camera.position.distanceToSquared(previousPosition)>.16||1-Math.abs(camera.quaternion.dot(previousRotation))>.004;
    if (!moved&&now-last<1/rate){
      // Reproject the cached view into the current water transform, avoiding the
      // sliding texture caused by reusing a previous model-space matrix.
      mat.uniforms.textureMatrix.value.copy(worldProjection).multiply(mesh.matrixWorld);return;
    }
    previousPosition.copy(camera.position);previousRotation.copy(camera.quaternion);
    last = now;original(renderer,proxyScene,camera,geo,material,group);
    inverseModel.copy(mesh.matrixWorld).invert();worldProjection.copy(mat.uniforms.textureMatrix.value).multiply(inverseModel);
  };
  return { mesh,update(time: number,camera: THREE.Camera,reflectionRate: number,size: number) {
    mat.uniforms.time.value=time;rate=reflectionRate;mesh.position.x=camera.position.x;mesh.position.z=camera.position.z;
    const aspect=(camera as THREE.PerspectiveCamera).aspect;
    const width=Math.round(aspect>=1?size*1.5:size*aspect),height=Math.round(aspect>=1?width/aspect:size);
    const rt=mesh.getRenderTarget();if(rt.width!==width||rt.height!==height)rt.setSize(width,height);
  },dispose() { mesh.dispose();geometry.dispose(); } };
}
