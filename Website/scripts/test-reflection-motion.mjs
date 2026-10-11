import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {createWater}=await import('../app/shrine-void/water.ts');
const steps={uniforms:{stepTime:{value:0},origin:{value:0},impacts:{value:Array.from({length:6},()=>new THREE.Vector4(0,0,-100,0))}}};
const water=createWater(new THREE.Scene(),steps),camera=new THREE.PerspectiveCamera(55,16/9,.15,135);
camera.position.set(0,1.63,0);camera.updateMatrixWorld();
let captures=0,lastCamera;
const renderer={xr:{enabled:false},shadowMap:{autoUpdate:false},autoClear:true,getRenderTarget:()=>null,setRenderTarget(){},state:{buffers:{depth:{setMask(){}}}},render(_scene,mirror){captures++;lastCamera=mirror.position.clone();}};
function draw(){water.update(0,camera,18,512);water.mesh.updateMatrixWorld();water.mesh.onBeforeRender(renderer,null,camera);}
draw();assert.equal(captures,1);
draw();assert.equal(captures,1,'A stationary view may reuse the captured reflection');
for(let i=0;i<60;i++){
  camera.position.x+=.025;camera.position.z-=.065;camera.rotation.y+=.002;camera.updateMatrixWorld();draw();
  assert.equal(captures,i+2,'Each moving frame captures the current viewpoint without a trailing reflection');
  assert.ok(Math.abs(lastCamera.x-camera.position.x)<1e-8&&Math.abs(lastCamera.z-camera.position.z)<1e-8);
  assert.ok(Math.abs(lastCamera.y-(.03-camera.position.y))<1e-8);
}
camera.aspect=2.16;camera.updateProjectionMatrix();draw();assert.equal(captures,62,'Aspect changes refresh the projection immediately');
water.dispose();console.log('Reflection passed: stationary reuse, every-frame walking/turning alignment and immediate resize capture.');
