import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('./'))return n(s+'.ts',c);throw e;}}});
const {createAutumnLake}=await import('../app/shrine-void/season-lake.ts');
const {createCoastalOcean}=await import('../app/shrine-void/season-ocean.ts');
const sky=new THREE.Texture(),normal=new THREE.Texture(),scene=new THREE.Scene();
const lake=createAutumnLake(scene,sky,normal,false,false);
const camera=new THREE.PerspectiveCamera(58,16/9,.1,240);camera.position.set(0,1.63,-7);camera.updateMatrixWorld();
let captures=0,lastCamera;
const renderer={xr:{enabled:false},shadowMap:{autoUpdate:false},autoClear:true,getRenderTarget:()=>null,setRenderTarget(){},state:{buffers:{depth:{setMask(){}}}},render(_scene,mirror){captures++;lastCamera=mirror.clone();}};
const draw=()=>{lake.mesh.updateMatrixWorld();lake.mesh.onBeforeRender(renderer,scene,camera);};
draw();assert.equal(captures,1);draw();assert.equal(captures,1,'Stationary views can reuse a recent reflection');
for(let i=0;i<40;i++){
 camera.position.x+=.02;camera.position.z-=.01;camera.rotation.y+=.003;camera.updateMatrixWorld();draw();
 assert.equal(captures,i+2,'Every camera movement must immediately refresh the lake');
 assert.ok(Math.abs(lastCamera.position.x-camera.position.x)<1e-8&&Math.abs(lastCamera.position.z-camera.position.z)<1e-8);
 assert.equal(lastCamera.layers.mask,2,'Lake captures use the cheap, complete reflected canopy');
}
lake.setQuality(.45);draw();assert.equal(lake.mesh.getRenderTarget().width,256);assert.equal(captures,42,'Resizing invalidates the reflection');
camera.aspect=2.1;camera.updateProjectionMatrix();draw();assert.equal(captures,43,'Projection changes refresh immediately');
assert.equal(lake.ripple(0,3.5,1),false,'Dry land cannot create water ripples');assert.equal(lake.ripple(.8,-13,1),true);
assert.equal(lake.rippleCount,1);camera.position.set(0,1.1,-8);lake.update(2,camera,true);assert.equal(lake.rippleCount,2,'Wading creates a foot-contact ripple');
const compact=createAutumnLake(scene,sky,normal,false,true);compact.mesh.onBeforeRender(renderer,scene,camera);assert.equal(captures,43,'Mobile omits the second scene pass');
const ocean=createCoastalOcean(scene,sky,normal,sky,false,false);ocean.mesh.updateMatrixWorld();
assert.equal(ocean.ripple(0,-3,2),false,'Sand cannot generate an ocean splash');assert.equal(ocean.ripple(0,-17,2),true,'Touching the shallows generates a splash');
for(let i=0;i<10;i++){camera.position.x+=.1;camera.updateMatrixWorld();ocean.update(3+i/60,camera,false);ocean.mesh.onBeforeRender(renderer,scene,camera);assert.equal(captures,44+i,'Ocean reflections must also follow moving cameras');assert.equal(ocean.mesh.position.length(),0,'Shore tessellation stays anchored to the island');}
lake.dispose();compact.dispose();ocean.dispose();sky.dispose();normal.dispose();
console.log('Season water passed: aligned captures, stationary reuse, quality/resize, reflection layers, tap/wading ripples, dry land rejection, mobile fallback and stable shore geometry.');
