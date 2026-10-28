import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return next(s+'.ts',c);throw e;}}});
const {createSpringRain,springRainSurface}=await import('../app/shrine-void/spring-rain.ts');
const {groundHeight}=await import('../app/shrine-void/season-layout.ts');
const {springWaterImpact,springWaterImpactHash,SPRING_WATER_IMPACT_SPACING}=await import('../app/shrine-void/spring-water-ripples.ts');
// The integer polynomial stays exactly representable in a GLSL float, including
// negative world cells; JS and the water surface therefore share each contact.
for(let x=-120;x<120;x+=7)for(let z=-120;z<120;z+=11){const n=((Math.fround(Math.fround(x*73)+Math.fround(z*157))%1021)+1021)%1021,expected=Math.fround(((Math.fround(n*n)+Math.fround(n*31))%4093)/4093);assert.ok(Math.abs(springWaterImpactHash(x,z)-expected)<1e-7);}
const root=new THREE.Group(),wetMaterial=new THREE.MeshStandardMaterial({roughness:.9}),support=new THREE.Mesh(new THREE.BoxGeometry(2,.2,2),wetMaterial);
support.position.set(4,groundHeight('spring',4,-4)+3,-4);root.add(support);root.updateMatrixWorld(true);
const originalCompile=wetMaterial.onBeforeCompile,originalKey=wetMaterial.customProgramCacheKey;
const rain=createSpringRain(false,[root],{trees:[],supports:[support]}),camera=new THREE.PerspectiveCamera();camera.position.set(0,1.7,0);
assert.ok(rain.surface(4,-4).height>support.position.y,'Drops stop on the actual top of a supplied support');
const shader={uniforms:{},vertexShader:'#include <worldpos_vertex>',fragmentShader:'#include <roughnessmap_fragment>'};wetMaterial.onBeforeCompile(shader,{});
assert.ok(shader.uniforms.springWet);assert.match(shader.fragmentShader,/dFdx\(rainWorld\)/);assert.match(shader.fragmentShader,/shelter/);
rain.update(1,camera,true);const drops=rain.group.getObjectByName('Rain streaks clipped above support surfaces'),positions=drops.geometry.attributes.position;
assert.ok(rain.group.visible);assert.equal(rain.intensity,1);assert.ok(rain.wetness>0);
let full=0;for(let i=0;i<positions.count;i+=2){if(positions.getY(i)===0&&positions.getY(i+1)===0)continue;full++;assert.ok(positions.getY(i)>=rain.surface(positions.getX(i),positions.getZ(i)).height-.00001);}
assert.ok(full>1000);const fullWet=rain.wetness;
rain.update(1.1,camera,true,.25);let reduced=0;for(let i=0;i<positions.count;i+=2)if(positions.getY(i)!==0||positions.getY(i+1)!==0)reduced++;
assert.ok(reduced<full*.5,'A quarter intensity reduces actual drop density as well as alpha');assert.equal(rain.intensity,.25);
rain.update(1.2,camera,true,0);assert.equal(rain.group.visible,false);assert.equal(rain.intensity,0);assert.ok(rain.wetness>0,'Surfaces remain damp as a shower ends');
rain.update(1.3,camera,true,NaN);assert.equal(rain.intensity,0);rain.update(1.4,camera,true,2);assert.equal(rain.intensity,1);
const near=rain.group.getObjectByName('Soft close raindrops with wind and varied exposure');assert.ok(near.geometry.attributes.position.count>100);
camera.position.set(22,1.8,-17);rain.update(2.3,camera,true,1);
const splashes=rain.group.getObjectByName('Raindrop impacts on river, bridge, awning and ground'),rebounds=rain.group.getObjectByName('Small ballistic rebounds from rain impacts'),matrix=new THREE.Matrix4(),position=new THREE.Vector3();
const columns=Math.ceil(Math.sqrt(splashes.count)),cellX=Math.floor(camera.position.x/SPRING_WATER_IMPACT_SPACING),cellZ=Math.floor(camera.position.z/SPRING_WATER_IMPACT_SPACING);let waterContacts=0,ballisticContacts=0;
for(let n=0;n<splashes.count;n++){const impact=springWaterImpact(cellX+n%columns-Math.floor(columns/2),cellZ+Math.floor(n/columns)-Math.floor(columns/2),2.3);splashes.getMatrixAt(n,matrix);position.setFromMatrixPosition(matrix);assert.ok(Math.hypot(position.x-impact.x,position.z-impact.z)<1e-5,'Visible contacts share world positions with the water shader');if(rain.surface(impact.x,impact.z).kind==='water'){waterContacts++;assert.equal(Math.hypot(matrix.elements[0],matrix.elements[1],matrix.elements[2]),0,'River impacts deform its surface instead of drawing flat ring decals');for(let b=0;b<3;b++){const j=n*3+b,y=rebounds.geometry.attributes.position.getY(j);if(y>0){ballisticContacts++;assert.ok(y>=.30&&y<.36,'Brief water droplets rise above the water and fall back');}}}}
assert.ok(waterContacts>20);assert.ok(ballisticContacts>0);
const resources=new Set();rain.group.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});let disposals=0;resources.forEach(r=>r.addEventListener('dispose',()=>disposals++));rain.dispose();
assert.equal(disposals,resources.size);assert.equal(wetMaterial.onBeforeCompile,originalCompile);assert.equal(wetMaterial.customProgramCacheKey,originalKey);assert.equal(rain.group.parent,null);
support.geometry.dispose();wetMaterial.dispose();
console.log('Rain checks passed: support clipping, layered streaks, close-drop geometry, intensity/density fades, persistent damp surfaces, shader hooks and complete cleanup.');
