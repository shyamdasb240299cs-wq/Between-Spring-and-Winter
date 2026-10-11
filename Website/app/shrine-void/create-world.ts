import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createWater } from './water';
import { createFoliageGroup } from './foliage';
import { createPetals } from './particles';
import { createTravelController } from './travel';
import { createQualityController } from './quality';
import type { VoidAssets,ModelPart } from './assets';
import {createAwakening,FIRST_MEMORY,CRYSTAL_DISTANCE} from './awakening';
import {createCrystal} from './crystal';
import {createWaterSteps} from './water-steps';
import {sanctuaryStep} from './sanctuary-audio';
import {createLanternLight} from './lantern-light';

export function createWorld(renderer: THREE.WebGLRenderer,assets: VoidAssets) {
  const scene=new THREE.Scene(),proxy=new THREE.Scene();
  scene.background=new THREE.Color(0x000000);scene.fog=new THREE.FogExp2(0x08040b,.014);
  proxy.background=new THREE.Color(0x010104);proxy.fog=new THREE.FogExp2(0x08040b,.018);
  const camera=new THREE.PerspectiveCamera(55,1,.15,135);camera.rotation.order='YXZ';
  const ambient=new THREE.HemisphereLight(0xddc1cb,0x4e454f,.85);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffdec3,2.4);key.position.set(4,12,7);scene.add(key);
  const rim=new THREE.DirectionalLight(0xffa1ba,1.5);rim.position.set(-6,9,-18);scene.add(rim);
  const quality=createQualityController(renderer),travel=createTravelController(assets.manifest.photos.length,FIRST_MEMORY);
  const foliage=createFoliageGroup(assets);scene.add(foliage.group);proxy.add(foliage.reflection);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lanternLight=createLanternLight();scene.add(lanternLight.mesh);proxy.add(lanternLight.reflection);
  const awakening=createAwakening(reduced),crystal=createCrystal(assets);scene.add(crystal.group);proxy.add(crystal.reflection);
  const steps=createWaterSteps(reduced,sanctuaryStep);scene.add(steps.group);let stepTime=0,bob=0;
  let overlayBlocked=false,inputBlocked=false;
  const petals=createPetals(assets.petal,reduced);scene.add(petals.mesh);
  const water=createWater(proxy,steps);scene.add(water.mesh);
  const materials:THREE.Material[]=[],geometries:THREE.BufferGeometry[]=[],batches:THREE.InstancedMesh[]=[];
  const stoneMat=new THREE.MeshStandardMaterial({map:assets.stone,normalMap:assets.stoneNormal,normalScale:new THREE.Vector2(.85,.85),color:0xc3b7b0,roughness:.92,vertexColors:true});materials.push(stoneMat);
  // Chipped, rounded photo columns are deliberately front-facing (+Z).
  const pieces:THREE.BufferGeometry[]=[];
  function box(w:number,h:number,d:number,x:number,y:number,z:number){const g=new RoundedBoxGeometry(w,h,d,2,.055);g.translate(x,y,z);pieces.push(g);}
  box(1.64,3.62,.4,0,2.45,-.2);
  // Individual stones give silhouette, joints and recessed framing real depth.
  for(let course=0;course<7;course++)for(const side of [-1,1])box(.34,.5,.62,side*.77,.94+course*.49,-.1);
  box(2.1,.32,.8,0,4.36,-.1);box(1.58,.26,.62,0,3.81,-.08);box(1.58,.24,.62,0,1.03,-.08);
  for(let course=0;course<2;course++)for(let i=0;i<4;i++)box(.56,.26,.91,(i-1.5)*.56,.3+course*.255,-.08);
  const pillarGeometry=mergeGeometries(pieces)!;pieces.forEach(p=>p.dispose());
  const p=pillarGeometry.attributes.position,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const chip=Math.sin(x*14+y*5)*Math.cos(z*17+y*3)*.035;p.setXYZ(i,x+chip,y+chip*.7,z+chip*.3);const shade=.72+.2*(Math.sin(x*4+y*5)*.5+.5);colors[i*3]=shade;colors[i*3+1]=shade;colors[i*3+2]=shade;}
  pillarGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  pillarGeometry.computeVertexNormals();geometries.push(pillarGeometry);
  const pillars=new THREE.InstancedMesh(pillarGeometry,stoneMat,9);pillars.frustumCulled=false;scene.add(pillars);batches.push(pillars);
  const reflectedStoneMat=new THREE.MeshBasicMaterial({map:assets.stone,color:0x61554f,vertexColors:true});materials.push(reflectedStoneMat);
  const reflectedPillars=new THREE.InstancedMesh(pillarGeometry,reflectedStoneMat,9);reflectedPillars.frustumCulled=false;proxy.add(reflectedPillars);batches.push(reflectedPillars);
  const frameParts:THREE.BufferGeometry[]=[];
  for(const [w,h,x,y] of [[.09,2.15,-.64,2.36],[.09,2.15,.64,2.36],[1.38,.09,0,1.3],[1.38,.09,0,3.42]]){const g=new THREE.BoxGeometry(w,h,.06);g.translate(x,y,.202);frameParts.push(g);}
  const frameGeometry=mergeGeometries(frameParts)!;frameParts.forEach(p=>p.dispose());geometries.push(frameGeometry);
  const frameMat=new THREE.MeshStandardMaterial({color:0x514337,metalness:.6,roughness:.42});materials.push(frameMat);
  const frames=new THREE.InstancedMesh(frameGeometry,frameMat,9);frames.frustumCulled=false;scene.add(frames);batches.push(frames);
  const photoGeometry=new THREE.PlaneGeometry(1,1);geometries.push(photoGeometry);
  const photos=Array.from({length:9},()=>{const m=new THREE.MeshBasicMaterial({toneMapped:false,color:0xffffff});materials.push(m);const mesh=new THREE.Mesh(photoGeometry,m);scene.add(mesh);return mesh;});
  const reflectionPhotos=photos.map(photo=>{const mesh=new THREE.Mesh(photoGeometry,photo.material);proxy.add(mesh);return mesh;});
  function lampMaterial(part:ModelPart){
    const m=part.material.clone();m.color.set(0xffffff);m.emissive.set(0xffc58b);m.emissiveIntensity=2.2;m.roughness=.83;
    m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif');};
    materials.push(m);return m;
  }
  const lanternBatches=createBatches(assets.lantern,64,lampMaterial),farLanterns=createBatches(assets.lanternFar,64,lampMaterial);
  const reflectedLanterns=createBatches(assets.lanternFar,64,part=>{const m=new THREE.MeshBasicMaterial({map:part.material.emissiveMap||part.material.map,color:new THREE.Color(3.2,1.9,.8)});materials.push(m);return m;},proxy);
  const rockBatches=createBatches(assets.rocks.slice(0,3),96,part=>{const m=part.material.clone();m.color.set(0xd0c7ce);m.normalScale.set(.6,.6);materials.push(m);return m;});
  const farRocks=createBatches(assets.rocksFar.slice(0,3),160,part=>{const m=part.material.clone();m.color.set(0xd0c7ce);materials.push(m);return m;});
  const reflectedRocks=createBatches(assets.rocksFar.slice(0,3),160,part=>{const m=new THREE.MeshBasicMaterial({map:part.material.map,color:0x615850});materials.push(m);return m;},proxy);
  // Near monument lights provide local colour, without dozens of dynamic lights.
  const warm=new THREE.PointLight(0xffbe72,6,9,2);scene.add(warm);
  const starGeometry=new THREE.BufferGeometry(),starPositions=new Float32Array(120*3);
  for(let i=0;i<120;i++){const a=i*2.399963;starPositions[i*3]=Math.cos(a)*65;starPositions[i*3+1]=12+(i*.618%1)*38;starPositions[i*3+2]=Math.sin(a)*65;}
  starGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));geometries.push(starGeometry);
  const starMaterial=new THREE.PointsMaterial({color:0xf2b8dc,size:.065,transparent:true,opacity:0,depthWrite:false});materials.push(starMaterial);
  const stars=new THREE.Points(starGeometry,starMaterial);scene.add(stars);
  const lanternOwners:{index:number;side:number;near:boolean;slot:number}[]=[],lampColour=new THREE.Color();
  const transform=new THREE.Object3D();let origin=0,time=0,lastPool=-999;
  function createBatches(parts:ModelPart[],count:number,material:(part:ModelPart)=>THREE.Material,target=scene){
    return parts.map(part=>{const mesh=new THREE.InstancedMesh(part.geometry,material(part),count);mesh.frustumCulled=false;target.add(mesh);batches.push(mesh);return mesh;});
  }
  function set(mesh:THREE.InstancedMesh,x:number,y:number,z:number,sx:number,sy:number,sz:number,angle=0){transform.position.set(x,y,z);transform.scale.set(sx,sy,sz);transform.rotation.set(0,angle,0);transform.updateMatrix();mesh.setMatrixAt(mesh.count++,transform.matrix);}
  function placeRocks(x:number,z:number,large:boolean,seed:number){
    for(let i=0;i<(large?7:3);i++){const index=(seed+i)%rockBatches.length,angle=i*2.399963+seed;
      const near=Math.abs(z-(origin-travel.state.distance))<20;
      for(const part of [(near?rockBatches:farRocks)[index],reflectedRocks[index]])set(part,x+Math.cos(angle)*(large?.96:.5),.04,z+Math.sin(angle)*(large?.65:.4),large?.65:.6,large?.55:.45,large?.65:.6,angle);}
  }
  function recycle(){
    const firstTree=Math.floor(travel.state.distance/9),firstMonument=Math.max(0,Math.floor((travel.state.distance-FIRST_MEMORY)/18)-1);
    const key=firstTree*1000+firstMonument;
    if(key===lastPool&&scene.userData.origin===origin)return;
    lastPool=key;scene.userData.origin=origin;batches.forEach(m=>m.count=0);lanternOwners.length=0;lanternLight.reset();
    for(let n=Math.max(0,firstTree-1);n<firstTree+15;n++)for(const side of [-1,1]){
      const z=origin-n*9-2,x=side*5.8;
      const near=Math.abs(z-(origin-travel.state.distance))<20,target=near?lanternBatches:farLanterns,slot=target[0].count;
      for(const m of target)set(m,x,.3,z+1.65,1,1,1,side*.12);
      for(const m of reflectedLanterns)set(m,x,.3,z+1.65,1,1,1,side*.12);
      lanternOwners.push({index:n,side,near,slot});
      lanternLight.place(x,z+1.65);
      placeRocks(side*6.1,z,false,n);
    }
    for(let slot=0;slot<9;slot++){
      const n=firstMonument+slot,z=origin-FIRST_MEMORY-n*18;
      set(pillars,0,0,z,1,1,1);set(reflectedPillars,0,0,z,1,1,1);set(frames,0,0,z,1,1,1);placeRocks(0,z,true,n);
      const entry=assets.manifest.photos[n%assets.manifest.photos.length],tex=assets.photos.get(entry.src);
      const photo=photos[slot];(photo.material as THREE.MeshBasicMaterial).map=tex||null;(photo.material as THREE.MeshBasicMaterial).needsUpdate=true;
      const image=tex?.image as {width:number;height:number}|undefined,aspect=image?image.width/image.height:2/3;
      photo.scale.set(Math.min(1.19,2.03*aspect),Math.min(2.03,1.19/aspect),1);photo.position.set(0,2.36,z+.219);
      reflectionPhotos[slot].position.copy(photo.position);reflectionPhotos[slot].scale.copy(photo.scale);
    }
    batches.forEach(m=>m.instanceMatrix.needsUpdate=true);
  }
  function update(dt:number,paused:boolean){
    if(!paused)time+=dt;
    stepTime+=dt;
    awakening.advance(dt);
    let pose=awakening.pose();
    const shouldBlock=overlayBlocked||!pose.movement;
    if(shouldBlock!==inputBlocked){travel.block(shouldBlock);inputBlocked=shouldBlock;}
    travel.setCollisions(pose.phase==='awake');
    // Preserve walking speed at irregular frame rates without a giant physics step.
    for(let remaining=dt;remaining>.00001;remaining-=Math.min(remaining,1/60))travel.update(Math.min(remaining,1/60));
    origin=Math.floor(travel.state.distance/72)*72;
    if(pose.phase==='seeking')travel.state.distance=Math.min(CRYSTAL_DISTANCE-1.9,travel.state.distance);
    awakening.contact(travel.state.distance,travel.state.x,travel.state.yaw);pose=awakening.pose();
    const targetBob=steps.update(stepTime,travel.state.x,travel.state.distance,travel.state.yaw,origin,pose.movement&&!overlayBlocked);
    bob+=(targetBob-bob)*(1-Math.exp(-dt*18));steps.group.visible=pose.movement;
    camera.position.set(travel.state.x,1.63+bob,origin-travel.state.distance);
    camera.rotation.set(travel.state.pitch,travel.state.yaw,0,'YXZ');
    foliage.place(travel.state.distance,origin,quality.constrained,camera);foliage.update(time,pose.reveal);recycle();
    const visible=pose.reveal>.001;
    for(const mesh of [pillars,frames,reflectedPillars,...photos,...reflectionPhotos,...rockBatches,...farRocks,...reflectedRocks])mesh.visible=visible;
    petals.mesh.visible=visible;petals.update(time,camera.position.z,origin,pose.reveal);
    [...lanternBatches,...farLanterns,...reflectedLanterns,lanternLight.mesh,lanternLight.reflection].forEach(m=>m.visible=pose.phase==='lanterns'||pose.phase==='awake');
    for(let slot=0;slot<lanternOwners.length;slot++){const lamp=lanternOwners[slot],level=awakening.lantern(lamp.index,lamp.side);lanternLight.light(slot,level);lampColour.setScalar(level);for(const m of lamp.near?lanternBatches:farLanterns)m.setColorAt(lamp.slot,lampColour);for(const m of reflectedLanterns)m.setColorAt(slot,lampColour);}
    [...lanternBatches,...farLanterns,...reflectedLanterns].forEach(m=>{if(m.instanceColor)m.instanceColor.needsUpdate=true;});
    ambient.intensity=.85*pose.reveal;key.intensity=2.4*pose.reveal;rim.intensity=1.5*pose.reveal;
    starMaterial.opacity=.38*pose.reveal;stars.position.z=camera.position.z;stars.visible=visible;
    crystal.update(time,pose.crystalPower,pose.phase==='charging',origin,reduced);
    water.update(time,camera,quality.reflectionRate,quality.reflectionSize);
    warm.intensity=6*pose.reveal;warm.position.set(.8,1.1,origin-FIRST_MEMORY-Math.max(0,Math.round((travel.state.distance-FIRST_MEMORY)/18))*18+1.4);
  }
  const pulseProjection=new THREE.Vector3();
  return {scene,camera,travel,quality,update,get cinematic(){return awakening.pose();},get pulseOrigin(){camera.updateMatrixWorld();pulseProjection.set(0,1.75,origin-CRYSTAL_DISTANCE).project(camera);return{x:(pulseProjection.x+1)/2,y:(1-pulseProjection.y)/2};},touchCrystal(){return awakening.touch(travel.state.distance);},blockOverlay(value:boolean){overlayBlocked=value;travel.resetInput();},
    async compile(){const saved=[...scene.children,...proxy.children].map(o=>[o,o.visible] as const);saved.forEach(([o])=>o.visible=true);try{await renderer.compileAsync(scene,camera);await renderer.compileAsync(proxy,camera);}finally{saved.forEach(([o,v])=>o.visible=v);}},
    warmRender(draw:()=>void){const saved=[...scene.children,...proxy.children].map(o=>[o,o.visible] as const);saved.forEach(([o])=>o.visible=true);try{draw();}finally{saved.forEach(([o,v])=>o.visible=v);}},
    resize(w:number,h:number){camera.aspect=w/h;camera.fov=w<h?62:55;camera.updateProjectionMatrix();},
    dispose(){quality.dispose();lanternLight.dispose();travel.dispose();steps.dispose();crystal.dispose();foliage.dispose();petals.dispose();water.dispose();batches.forEach(m=>m.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());scene.clear();proxy.clear();}
  };
}
export type VoidWorld=ReturnType<typeof createWorld>;
