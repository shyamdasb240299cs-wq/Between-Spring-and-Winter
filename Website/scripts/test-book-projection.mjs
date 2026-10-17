import assert from 'node:assert/strict';
import * as THREE from 'three';
import {typescriptUrl} from './load-typescript.mjs';
const {bookViewport,bookPose}=await import(await typescriptUrl(new URL('../app/book-motion.ts',import.meta.url)));
const {CLOSE_START,JOURNEY_LENGTH,bookSheets,flipPrint}=await import(await typescriptUrl(new URL('../app/journey-data.ts',import.meta.url)));
for(const [width,height] of [[1265,712],[1365,634],[1920,1080],[2560,1440],[1025,1700],[854,393],[667,375],[900,500],[390,844],[360,640],[768,1024]]){
  const bounds=bookViewport(width,height,128);
  const camera=new THREE.PerspectiveCamera(9,width/height,2,80);
  const tangent=Math.tan(9*Math.PI/360),distance=Math.max(4.5/(2*tangent*((height-128)/height)),6.06/(2*tangent*((width-22)/height)));
  camera.position.set(-1.43,0,distance);camera.updateMatrixWorld();
  const cropped=camera.clone();cropped.setViewOffset(width,height,bounds.left,bounds.top,bounds.width,bounds.height);cropped.updateMatrixWorld();
  for(let angle=0;angle<=Math.PI;angle+=Math.PI/20)for(const y of [-2.18,2.18])for(let col=0;col<=64;col++){
    const point=new THREE.Vector3(-1.43+col/64*2.86*Math.cos(angle),y,col/64*2.86*Math.sin(angle));
    const full=point.clone().project(camera),part=point.clone().project(cropped);
    const x=(full.x+1)*width/2,py=(1-full.y)*height/2;
    const localX=bounds.left+(part.x+1)*bounds.width/2,localY=bounds.top+(1-part.y)*bounds.height/2;
    assert.ok(Math.abs(localX-x)<1e-7&&Math.abs(localY-py)<1e-7,'Projection retains the original screen position');
    if(x>=0&&x<=width&&py>=0&&py<=height)assert.ok(x>=bounds.left&&x<=bounds.left+bounds.width&&py>=bounds.top&&py<=bounds.top+bounds.height,'A turning leaf stays inside the cropped buffer');
  }
  for(const final of [false,true]){
    const lens=new THREE.PerspectiveCamera(31,width/height,2,80);lens.position.z=12.8;lens.updateMatrixWorld();
    const model=new THREE.Matrix4().compose(new THREE.Vector3(final?2*Math.tan(31*Math.PI/360)*12.8*width/height*.24:2.25,0,0),new THREE.Quaternion().setFromEuler(new THREE.Euler(final?.035:.065,final?Math.PI-.1:-.48,final?-.025:.018)),new THREE.Vector3().setScalar(final?.88:1));
    for(const x of [-1.5,1.5])for(const y of [-2.25,2.25])for(const z of [-.08,.08]){
      const p=new THREE.Vector3(x,y,z).applyMatrix4(model).project(lens),px=(p.x+1)*width/2,py=(1-p.y)*height/2;
      if(px>=0&&px<=width&&py>=0&&py<=height)assert.ok(px>=bounds.left&&px<=bounds.left+bounds.width&&py>=bounds.top&&py<=bounds.top+bounds.height,'Closed cover remains inside the buffer');
    }
  }
  // Follow the actual left-to-right presentation, including the mid-turn arc.
  for(let p=CLOSE_START+1.45;p<=JOURNEY_LENGTH;p+=.025){
    const pose=bookPose(p,width,height),lens=new THREE.PerspectiveCamera(31,width/height,2,80);
    lens.position.set(pose.cameraX,0,pose.cameraZ);lens.updateMatrixWorld();
    const model=new THREE.Matrix4().compose(new THREE.Vector3(pose.closedX,pose.closedY+pose.lift,0),new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch,pose.yaw,pose.roll)),new THREE.Vector3().setScalar(pose.scale));
    for(const x of [-1.5,1.5])for(const y of [-2.25,2.25])for(const z of [-.08,.08]){
      const point=new THREE.Vector3(x,y,z).applyMatrix4(model).project(lens),px=(point.x+1)*width/2,py=(1-point.y)*height/2;
      assert.ok(px>=0&&px<=width&&py>=0&&py<=height,`Closed book fits ${width}x${height} at ${p}`);
      assert.ok(px>=bounds.left&&px<=bounds.left+bounds.width&&py>=bounds.top&&py<=bounds.top+bounds.height,'Both sides of the outro fit the GPU buffer');
    }
  }
  assert.ok(bookPose(CLOSE_START+1.5,width,height).closedX<0,'Close on the left');
  assert.ok(bookPose(JOURNEY_LENGTH,width,height).closedX>0,'Finish on the right');
  assert.ok(Math.abs(bookPose(JOURNEY_LENGTH,width,height).yaw-(Math.PI-.1))<1e-6,'Finish with the front cover facing the camera');
}
const fs=await import('node:fs/promises');
for(const sheet of bookSheets)for(const page of [sheet.front,sheet.back])await fs.access(new URL('../public'+flipPrint(page.src),import.meta.url));
console.log('Book projection passed: preload assets, camera projection and both outro sides at 11 desktop/mobile viewport shapes.');
