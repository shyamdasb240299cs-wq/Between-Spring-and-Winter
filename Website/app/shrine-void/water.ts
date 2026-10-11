import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import type {createWaterSteps} from './water-steps';

/** Height and its analytic derivatives: centimetre wavelets + damped contact waves. */
const surface=`
uniform float time,stepTime,origin;uniform vec4 impacts[6];
vec3 wave(vec2 p,vec2 k,float speed,float amplitude){
  float phase=dot(p,k)-time*speed;
  return vec3(sin(phase)*amplitude,cos(phase)*amplitude*k);
}
vec3 surfaceAt(vec2 world){
  vec2 p=world-vec2(0.,origin);
  vec3 value=wave(p,vec2(.72,.49),.65,.009)+wave(p,vec2(1.8,-1.6),.84,.0035)
    +wave(p,vec2(5.4,7.1),1.12,.0011)+wave(p,vec2(11.3,-9.1),1.6,.0004);
  for(int i=0;i<6;i++){
    vec4 hit=impacts[i];float age=stepTime-hit.z;
    if(age<0.||age>3.2)continue;
    vec2 delta=p-vec2(hit.x,-hit.y);float r=length(delta);
    float front=r-age*1.35;
    if(abs(front)>1.05||r<.008)continue;
    float envelope=exp(-front*front*9.-age*1.35)*smoothstep(0.,.045,age);
    float phase=front*22.;float amplitude=.012*hit.w;
    float h=sin(phase)*envelope*amplitude;
    float gradient=(22.*cos(phase)-18.*front*sin(phase))*envelope*amplitude;
    value+=vec3(h,gradient*delta/r);
  }
  return value;
}`;

export function createWater(proxyScene:THREE.Scene,steps:ReturnType<typeof createWaterSteps>) {
  // Dense near the viewer, sparse at the horizon. The moving grid samples a
  // persistent world-space surface; waves and old contacts never follow the camera.
  const geometry=new THREE.PlaneGeometry(320,320,128,128),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)/160,y=positions.getY(i)/160;
    positions.setXY(i,Math.sign(x)*Math.abs(x)**2.2*160,Math.sign(y)*Math.abs(y)**2.2*160);
  }
  geometry.computeBoundingSphere();
  const mesh=new Reflector(geometry,{textureWidth:640,textureHeight:384,multisample:0,clipBias:.003,
    shader:{name:'ShallowReflectiveWater',
      uniforms:{color:{value:new THREE.Color(0x010101)},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},time:{value:0},...steps.uniforms},
      vertexShader:`uniform mat4 textureMatrix;varying vec4 vReflection;varying vec3 vWorld;${surface}
        void main(){vec4 w=modelMatrix*vec4(position,1.);w.y+=surfaceAt(w.xz).x;vWorld=w.xyz;vReflection=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform sampler2D tDiffuse;varying vec4 vReflection;varying vec3 vWorld;${surface}
        void main(){
          vec3 field=surfaceAt(vWorld.xz),normal=normalize(vec3(-field.y,1.,-field.z));
          vec3 view=normalize(cameraPosition-vWorld);
          float distanceToEye=length(cameraPosition-vWorld);
          vec2 uv=vReflection.xy/vReflection.w;
          // Surface orientation changes the reflected ray, rather than sliding
          // a flat animated texture. Contact waves also change real mesh height.
          vec2 bend=normal.xz*.075/max(1.,sqrt(distanceToEye));
          vec3 reflected=texture2D(tDiffuse,uv+bend).rgb;
          float fresnel=.02+.98*pow(1.-max(0.,dot(normal,view)),5.);
          float microShading=clamp(.97+field.y*.32+field.z*.18,.85,1.05);
          vec3 colour=reflected*(.74+.23*fresnel)*microShading+vec3(.0025);
          gl_FragColor=vec4(colour,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }
  });
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.015;mesh.frustumCulled=false;
  const mat=mesh.material as THREE.ShaderMaterial;
  // Reflector clones uniforms: reconnect the shared contact clock and records.
  Object.assign(mat.uniforms,steps.uniforms);
  const original=mesh.onBeforeRender.bind(mesh);let last=-Infinity,rate=24;
  const capturedCamera=new THREE.Matrix4(),capturedProjection=new THREE.Matrix4();
  const worldProjection=new THREE.Matrix4(),inverseModel=new THREE.Matrix4();
  mesh.onBeforeRender=(renderer,_scene,camera,geo,material,group)=>{
    const now=performance.now()/1000;
    // A cached reflection belongs to its captured camera. Refresh on every
    // walking/look frame; only a stationary view may reuse the previous image.
    const moving=!capturedCamera.equals(camera.matrixWorld)||!capturedProjection.equals(camera.projectionMatrix);
    if(!moving&&now-last<1/rate){mat.uniforms.textureMatrix.value.copy(worldProjection).multiply(mesh.matrixWorld);return;}
    last=now;original(renderer,proxyScene,camera,geo,material,group);
    capturedCamera.copy(camera.matrixWorld);capturedProjection.copy(camera.projectionMatrix);
    inverseModel.copy(mesh.matrixWorld).invert();worldProjection.copy(mat.uniforms.textureMatrix.value).multiply(inverseModel);
  };
  return {mesh,update(time:number,camera:THREE.Camera,reflectionRate:number,size:number){
    mat.uniforms.time.value=time;rate=reflectionRate;
    mesh.position.x=camera.position.x;mesh.position.z=camera.position.z;
    const aspect=(camera as THREE.PerspectiveCamera).aspect;
    const width=Math.round(aspect>=1?size*1.5:size*aspect),height=Math.round(aspect>=1?width/aspect:size);
    const rt=mesh.getRenderTarget();if(rt.width!==width||rt.height!==height)rt.setSize(width,height);
  },dispose(){mesh.dispose();geometry.dispose();}};
}
