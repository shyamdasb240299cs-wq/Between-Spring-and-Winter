import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const gradient={addColorStop(){}};
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:()=>{},set:(t,p,v)=>(t[p]=v,true)});
globalThis.document={createElement:()=>({width:512,height:640,getContext:()=>context})};
const {createSpringAdaviEnvironment,ADAVI_BRANCH,branchLevel,adaviGround}=await import('../app/shrine-void/spring-adavi-environment.ts');
const {ADAVI_CASCADE_FALLS}=await import('../app/shrine-void/spring-adavi-cascades.ts');
const {createSpringTreasureWorld}=await import('../app/shrine-void/spring-treasure-world.ts');
const {groundHeight}=await import('../app/shrine-void/season-layout.ts');
const texture=new THREE.Texture(),maps={color:texture,normal:texture,roughness:texture,sizeMetres:2};
for(const mobile of [true,false]){
  const environment=createSpringAdaviEnvironment({models:{},maps:{mud:maps,rock:maps,water:texture},mobile,reduced:false});
  const body=environment.group.getObjectByName('Rounded water thickness over three rock shelves'),creek=environment.group.getObjectByName('Joining forest tributary and three low cascades');
  assert.ok(body?.isMesh&&creek?.isMesh);assert.equal(body.material,creek.material,'Cascades and creek use one material and reflection capture');
  const positions=body.geometry.attributes.position,index=body.geometry.index;
  assert.ok(index&&positions.count>2000);assert.ok([...positions.array].every(Number.isFinite));
  const crossSegments=mobile?20:32,lengthSegments=mobile?32:52,verticesPerFall=(lengthSegments+1)*(crossSegments+1)+2;
  for(let fall=0;fall<3;fall++)for(let row=0;row<=lengthSegments;row++){
    const first=fall*verticesPerFall+row*(crossSegments+1),last=first+crossSegments;
    const a=new THREE.Vector3().fromBufferAttribute(body.geometry.attributes.normal,first),b=new THREE.Vector3().fromBufferAttribute(body.geometry.attributes.normal,last);
    assert.ok(a.distanceTo(b)<1e-7&&Math.abs(a.length()-1)<1e-6,'The duplicated UV seam has one continuous unit normal');
  }
  for(const surface of [body,creek]){
    const directions=surface.geometry.attributes.flowDirection;assert.equal(directions.count,surface.geometry.attributes.position.count);
    for(let n=0;n<directions.count;n++){
      const flow=new THREE.Vector3().fromBufferAttribute(directions,n);
      assert.ok(Math.abs(flow.length()-1)<1e-5,'Every surface has a finite normalized flow basis');
      assert.ok(flow.y<=.00001&&flow.z>0,'Flow travels downhill toward the river, including end caps');
    }
  }
  const effects=environment.group.getObjectByName('Thick cascade water, plunge foam and contact spray');
  const spray=effects.getObjectByName('Ballistic cascade droplets and drifting impact mist');
  const pools=effects.getObjectByName('Aerated plunge pools and expanding contact ripples');
  assert.equal(effects.children.length,3,'Volume, all foam pools and all spray stay in three batched draws');
  const poolPositions=pools.geometry.attributes.position,poolIndices=pools.geometry.index;
  for(let n=0;n<poolIndices.count;n+=3){
    const a=new THREE.Vector3().fromBufferAttribute(poolPositions,poolIndices.getX(n)),b=new THREE.Vector3().fromBufferAttribute(poolPositions,poolIndices.getX(n+1)),c=new THREE.Vector3().fromBufferAttribute(poolPositions,poolIndices.getX(n+2));
    assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>1e-13,'Every plunge-foam triangle has visible area, with no folded or degenerate centre rings');
  }
  const cascadeStats=environment.stats();assert.equal(cascadeStats.cascadeDraws,3);assert.ok(cascadeStats.cascadeTriangles<=(mobile?5300:12200),'Cascade geometry stays inside the existing device budget');
  assert.equal(spray.geometry.attributes.position.count,mobile?102:228,'Particle count stays bounded on each device profile');
  for(let n=0;n<spray.geometry.attributes.position.count;n++){
    const mist=spray.geometry.attributes.kind.getX(n)>.5,origin=new THREE.Vector3().fromBufferAttribute(spray.geometry.attributes.position,n),velocity=new THREE.Vector3().fromBufferAttribute(spray.geometry.attributes.velocity,n),seed=spray.geometry.attributes.seed.getX(n);
    for(let sample=0;sample<=12;sample++){
      const age=spray.geometry.attributes.lifetime.getX(n)*sample/12,p=origin.clone().addScaledVector(velocity,age);p.y-=(mist?.55:2.65)*age*age;
      if(mist){p.x+=Math.sin(age*3+seed*31)*age*.10;p.z+=Math.cos(age*2+seed*21)*age*.10;}
      assert.ok(spray.geometry.boundingBox.containsPoint(p)&&spray.geometry.boundingSphere.containsPoint(p),'Shader-driven spray stays inside its culling bounds throughout its flight');
    }
    if(mist)continue;
    const life=spray.geometry.attributes.lifetime.getX(n),vy=spray.geometry.attributes.velocity.getY(n);
    assert.ok(Math.abs(vy*life-2.65*life*life)<1e-6,'A rebound droplet ends on its actual next water contact');
  }
  const buffers=effects.children.flatMap(object=>Object.values(object.geometry.attributes));
  const versions=buffers.map(attribute=>attribute.version);
  for(let frame=0;frame<600;frame++)environment.update(frame/60);
  assert.deepEqual(buffers.map(attribute=>attribute.version),versions,'Ten seconds of animation never reuploads geometry');
  assert.equal(spray.material.uniforms.time,body.material.uniforms.time,'Droplets, mist and flow share the same animation clock');
  // Request through a visible tributary/body first: a main-river-only callback
  // would leave the capture stale when the observer looks upstream.
  const scene=new THREE.Scene();scene.add(environment.group);scene.updateMatrixWorld(true);
  const camera=new THREE.PerspectiveCamera(58,16/9,.1,240);camera.position.set(214,4,-25);camera.lookAt(216,2,-29);camera.updateMatrixWorld(true);
  let captures=0;
  const renderer={xr:{enabled:false},shadowMap:{autoUpdate:false},autoClear:true,getRenderTarget:()=>null,setRenderTarget(){},state:{buffers:{depth:{setMask(){}}}},render(s){assert.equal(s,environment.reflectionScene);captures++;}};
  const request=surface=>surface.onBeforeRender(renderer,scene,camera,surface.geometry,surface.material,null);
  request(creek);assert.equal(captures,1,'The tributary can refresh the shared capture without drawing the main river');
  request(body);request(environment.water);assert.equal(captures,1,'All waterfall/river requests share one capture per viewpoint');
  camera.rotation.y+=.03;camera.updateMatrixWorld(true);request(body);assert.equal(captures,2,'The closed water body can refresh an upstream view itself');
  console.log(JSON.stringify({mobile,...environment.stats()}));
  // Welding only for topology measurement: seam vertices need distinct UVs at runtime.
  const ids=new Map(),welded=Array.from({length:positions.count},(_,n)=>{const key=[positions.getX(n),positions.getY(n),positions.getZ(n)].map(v=>Math.round(v*1e4)).join(',');if(!ids.has(key))ids.set(key,ids.size);return ids.get(key);});
  const edges=new Map();for(let n=0;n<index.count;n+=3){const triangle=[0,1,2].map(k=>welded[index.getX(n+k)]);assert.equal(new Set(triangle).size,3,'Water body has no collapsed triangles');for(let k=0;k<3;k++){const a=triangle[k],b=triangle[(k+1)%3],key=a<b?a+':'+b:b+':'+a;edges.set(key,(edges.get(key)??0)+1);}}
  assert.ok([...edges.values()].every(count=>count===2),'All water volumes are closed at the shoulders and both ends');
  for(const fall of ADAVI_CASCADE_FALLS){
    const lip=ADAVI_BRANCH.getPoint(fall.start),toe=ADAVI_BRANCH.getPoint(fall.end),run=lip.distanceTo(toe),drop=branchLevel(fall.start)-branchLevel(fall.end);
    assert.ok(drop>.74&&run<1.1,'Each shelf has a visible short descent instead of a four-metre ramp');
    const middle=(fall.start+fall.end)*.5,plane=ADAVI_BRANCH.getPoint(middle),tangent=ADAVI_BRANCH.getTangent(middle),a=ADAVI_BRANCH.getPoint(middle-.0005),b=ADAVI_BRANCH.getPoint(middle+.0005),flow=new THREE.Vector3(b.x-a.x,branchLevel(middle+.0005)-branchLevel(middle-.0005),b.z-a.z).normalize(),across=new THREE.Vector3(tangent.z,0,-tangent.x).normalize(),normal=flow.clone().cross(across).normalize();
    plane.y=branchLevel(middle);const thickness=[];
    for(let n=0;n<positions.count;n++){const p=new THREE.Vector3().fromBufferAttribute(positions,n),offset=p.sub(plane);if(Math.abs(offset.dot(flow))<.12&&Math.abs(offset.dot(across))<.30)thickness.push(offset.dot(normal));}
    assert.ok(thickness.length>=2&&Math.max(...thickness)-Math.min(...thickness)>.26,'The bank view sees at least 26 cm of actual perpendicular water thickness');
    const p=ADAVI_BRANCH.getPoint(fall.end+.012);assert.ok(branchLevel(fall.end+.012)-adaviGround(p.x,p.z)>.30,'The plunge pool has a submerged bed beneath the flowing volume');
  }
  assert.equal(branchLevel(1),.16,'The creek joins the main river at the same surface level');
  environment.update(7.25);assert.equal(body.material.uniforms.time.value,7.25);
  environment.dispose();
}
const world=createSpringTreasureWorld({models:{},materials:{wood:texture,cloth:texture,paper:texture},height:(x,z)=>groundHeight('spring',x,z),mobile:true,reduced:false,forestMaps:{mud:maps,rock:maps,water:texture}});
const sign=world.group.getObjectByName('Adavi · yellow and white roadside milestone');world.group.updateMatrixWorld(true);
const size=new THREE.Box3().setFromObject(sign).getSize(new THREE.Vector3());assert.ok(size.y<.95&&size.x<.70,'The riverside milestone is below knee-to-waist height, not person-sized');
assert.equal(sign.children.filter(o=>o.geometry?.type==='ExtrudeGeometry').length,1,'Yellow paint shares one concrete body, eliminating the overlapping cap');
const paint=sign.getObjectByName('Milestone inscription · depth-separated paint');assert.ok(paint.material.polygonOffset&&paint.material.depthTest&&!paint.material.depthWrite,'Letters remain depth-tested against the sign with stable separation');
world.dispose();texture.dispose();console.log('Spring cascades passed: closed three-dimensional flow on desktop/mobile, steep shelves, perpendicular volume, submerged plunge beds, shared river material/time, same-level confluence, smaller single-body milestone and stable lettering.');
