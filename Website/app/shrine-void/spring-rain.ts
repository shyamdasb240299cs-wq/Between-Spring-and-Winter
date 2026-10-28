import * as THREE from 'three';
import {groundHeight,springBridgeHeight} from './season-layout';
import {SPRING_SPOTS,SPRING_POND,SPRING_LAKE_BENCH,springPondDistance} from './spring-treasure-layout';
import type {TreePlacement} from './season-layout';
import {springWaterImpact,SPRING_WATER_IMPACT_SPACING} from './spring-water-ripples';

/** Shared by drop clipping, surface splashes and shelter checks. */
export function springRainSurface(x:number,z:number){
  const ground=groundHeight('spring',x,z),bridge=springBridgeHeight(x,z),stall=SPRING_SPOTS.picnic;
  if(Math.abs(x-stall.x)<2.715&&Math.abs(z-stall.z)<1.15){const dx=x-stall.x,dz=z-stall.z;return {height:groundHeight('spring',stall.x,stall.z)+3.12-Math.abs(dz)*.34-Math.sin((dx+2.715)/5.43*Math.PI)*.055+Math.sin(dx*8)*.008,kind:'shelter'};}
  if(bridge!==null)return {height:bridge,kind:'bridge'};
  const b=SPRING_LAKE_BENCH;if(Math.abs(x-b.x)<.26&&Math.abs(z-b.z)<1.13)return {height:groundHeight('spring',b.x,b.z)+.52,kind:'bench'};
  return springPondDistance(x,z)<1?{height:Math.max(ground,SPRING_POND.level),kind:'water'}:{height:ground,kind:'ground'};
}

/** Outdoor rainfall stops at the awning, bridge deck, bench and water surface. */
export function createSpringRain(mobile:boolean,wetRoots:THREE.Object3D[]=[],cover?:{trees:TreePlacement[];supports:THREE.Object3D[]}){
  const group=new THREE.Group();group.name='Spring rain · after waking at the bench';group.visible=false;
  const count=mobile?1000:2400,positions=new Float32Array(count*6),seeds=new Float32Array(count*3),alphas=new Float32Array(count*2);
  for(let n=0;n<count;n++){seeds[n*3]=((n*173.71)%44)-22;seeds[n*3+1]=(n*7.379)%20;seeds[n*3+2]=((n*91.131)%44)-22;alphas[n*2]=.15+(n%7)/12;alphas[n*2+1]=0;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('rainAlpha',new THREE.BufferAttribute(alphas,1));
  const rainStrength={value:0};
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{rainStrength},vertexShader:`attribute float rainAlpha;varying float rainFade;void main(){vec4 p=modelViewMatrix*vec4(position,1.);rainFade=rainAlpha*(1.-smoothstep(8.,30.,length(p.xyz)));gl_Position=projectionMatrix*p;}`,fragmentShader:'uniform float rainStrength;varying float rainFade;void main(){gl_FragColor=vec4(.73,.81,.84,rainFade*rainStrength*.46);}'});
  const drops=new THREE.LineSegments(geometry,material);drops.name='Rain streaks clipped above support surfaces';drops.frustumCulled=false;group.add(drops);
  // Close drops have soft, sub-centimetre widths; fine distant streaks remain
  // inexpensive line segments. Both layers use exactly the same support clip.
  const nearCount=mobile?100:220,nearPositions=new Float32Array(nearCount*18),nearUV=new Float32Array(nearCount*12),nearGeometry=new THREE.BufferGeometry();
  for(let n=0;n<nearCount;n++)nearUV.set([0,0,1,0,0,1,1,0,1,1,0,1],n*12);
  nearGeometry.setAttribute('position',new THREE.BufferAttribute(nearPositions,3));nearGeometry.setAttribute('uv',new THREE.BufferAttribute(nearUV,2));
  const nearMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{rainStrength},vertexShader:'varying vec2 rainUV;void main(){rainUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float rainStrength;varying vec2 rainUV;void main(){float edge=pow(max(0.,1.-abs(rainUV.x-.5)*2.),1.8);float tail=sin(rainUV.y*3.14159);gl_FragColor=vec4(.76,.84,.87,edge*tail*.22*rainStrength);}'});
  const nearDrops=new THREE.Mesh(nearGeometry,nearMaterial);nearDrops.name='Soft close raindrops with wind and varied exposure';nearDrops.frustumCulled=false;group.add(nearDrops);
  const splashCount=mobile?140:340,ages=new Float32Array(splashCount),splashGeometry=new THREE.RingGeometry(.78,1,16);splashGeometry.setAttribute('rainAge',new THREE.InstancedBufferAttribute(ages,1));
  const splashMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{rainStrength},vertexShader:'attribute float rainAge;varying float opacity;void main(){opacity=pow(1.-rainAge,1.6)*.27;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'uniform float rainStrength;varying float opacity;void main(){gl_FragColor=vec4(.67,.77,.79,opacity*rainStrength);}'});
  const splashes=new THREE.InstancedMesh(splashGeometry,splashMaterial,splashCount);splashes.name='Raindrop impacts on river, bridge, awning and ground';splashes.frustumCulled=false;group.add(splashes);
  const bouncePositions=new Float32Array(splashCount*9),bounceGeometry=new THREE.BufferGeometry();bounceGeometry.setAttribute('position',new THREE.BufferAttribute(bouncePositions,3));
  const bounceMaterial=new THREE.PointsMaterial({color:0xb6cbd0,size:.019,transparent:true,opacity:.28,depthWrite:false});
  bounceMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=1.-smoothstep(.04,.25,dot(gl_PointCoord-vec2(.5),gl_PointCoord-vec2(.5)));\n#include <opaque_fragment>');};
  const rebound=new THREE.Points(bounceGeometry,bounceMaterial);rebound.name='Small ballistic rebounds from rain impacts';rebound.frustumCulled=false;group.add(rebound);
  const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,0,1),normal=new THREE.Vector3(),right=new THREE.Vector3(),wet={value:0};
  const wrap=(value:number,anchor:number)=>((value-anchor+22)%44+44)%44+anchor-22;
  let lastTime:number|undefined;
  const coverGrid=new Map<string,TreePlacement[]>(),surfaceCache=new Map<string,{height:number;kind:string}>(),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  for(const tree of cover?.trees??[]){const r=tree.radius*.85;for(let ix=Math.floor((tree.x-r)/5);ix<=Math.floor((tree.x+r)/5);ix++)for(let iz=Math.floor((tree.z-r)/5);iz<=Math.floor((tree.z+r)/5);iz++){const key=ix+','+iz,list=coverGrid.get(key)??[];list.push(tree);coverGrid.set(key,list);}}
  const supports=(cover?.supports??[]).map(object=>{object.updateWorldMatrix(true,true);return {object,bounds:new THREE.Box3().setFromObject(object)};});
  function surface(x:number,z:number){
    const key=x.toFixed(3)+','+z.toFixed(3),cached=surfaceCache.get(key);if(cached)return cached;
    let result=springRainSurface(x,z);
    for(const {object,bounds} of supports){if(x<bounds.min.x||x>bounds.max.x||z<bounds.min.z||z>bounds.max.z||bounds.max.y<result.height)continue;ray.set(new THREE.Vector3(x,bounds.max.y+1,z),down);const hit=ray.intersectObject(object,true)[0];if(hit&&hit.point.y>result.height)result={height:hit.point.y,kind:'prop'};}
    // Leaf gaps admit rain; broad crowns intercept the remaining drops. Heights
    // come from the same metre-scale tree placements used to draw the canopy.
    if(Math.sin(x*17.1+z*23.3)>-.35)for(const tree of coverGrid.get(Math.floor(x/5)+','+Math.floor(z/5))??[]){const d=Math.hypot(x-tree.x,z-tree.z),r=tree.radius*.85;if(d<r){const y=tree.y+tree.height*(.68+.15*Math.sqrt(1-d*d/(r*r)));if(y>result.height)result={height:y,kind:'canopy'};}}
    if(surfaceCache.size>12000)surfaceCache.clear();surfaceCache.set(key,result);return result;
  }
  const restores=new Map<THREE.MeshStandardMaterial,{compile:THREE.MeshStandardMaterial['onBeforeCompile'];key:THREE.MeshStandardMaterial['customProgramCacheKey']}>();
  function prepare(root:THREE.Object3D){
    if(root.name==='Carried Spring belongings'||root.name==='Adavi · forest river')return;
    if(root instanceof THREE.Mesh)for(const m of Array.isArray(root.material)?root.material:[root.material]){
      if(!(m instanceof THREE.MeshStandardMaterial)||restores.has(m)||m.transparent)continue;
      const compile=m.onBeforeCompile,key=m.customProgramCacheKey,originalKey=key.call(m);restores.set(m,{compile,key});
      m.onBeforeCompile=(shader,renderer)=>{compile.call(m,shader,renderer);shader.uniforms.springWet=wet;
        shader.vertexShader='varying vec3 rainWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 rainPoint=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nrainPoint=instanceMatrix*rainPoint;\n#endif\nrainWorld=(modelMatrix*rainPoint).xyz;');
        shader.fragmentShader='uniform float springWet;varying vec3 rainWorld;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          vec2 rainLocal=rainWorld.xz-vec2(-3.7,-2.2);
          float awning=${groundHeight('spring',SPRING_SPOTS.picnic.x,SPRING_SPOTS.picnic.z).toFixed(4)}+3.12-abs(rainLocal.y)*.34-sin((rainLocal.x+2.715)/5.43*3.14159)*.055;
          float shelter=step(abs(rainLocal.x),2.715)*step(abs(rainLocal.y),1.15)*step(rainWorld.y,awning-.025);
          vec3 rainSurfaceNormal=normalize(cross(dFdx(rainWorld),dFdy(rainWorld)));
          float upward=abs(rainSurfaceNormal.y);
          float film=.5+.25*sin(rainWorld.x*2.7+sin(rainWorld.z*3.1))+.25*sin(rainWorld.z*5.3+rainWorld.x*1.7);
          float wetAmount=springWet*(1.-shelter)*(.35+.65*upward);
          roughnessFactor=mix(roughnessFactor,min(roughnessFactor,.21+film*.14),wetAmount*.85);
          diffuseColor.rgb*=1.-wetAmount*.15;`);
      };m.customProgramCacheKey=()=>originalKey+'-spring-sheltered-wetness-v2';m.needsUpdate=true;
    }root.children.forEach(prepare);
  }
  wetRoots.forEach(prepare);
  return {group,surface,get intensity(){return rainStrength.value;},get wetness(){return wet.value;},
    update(time:number,camera:THREE.Camera,active:boolean,intensity=1){
      const amount=active?THREE.MathUtils.clamp(Number.isFinite(intensity)?intensity:0,0,1):0,dt=lastTime===undefined?1/60:THREE.MathUtils.clamp(time-lastTime,0,.1);lastTime=time;
      rainStrength.value=amount;wet.value=THREE.MathUtils.damp(wet.value,amount,amount>wet.value?1.8:.12,dt);group.visible=active&&amount>.001;if(!group.visible)return;
      const anchorX=camera.position.x,anchorZ=camera.position.z,anchorY=Math.floor(camera.position.y/5)*5,windX=.12+Math.sin(time*.19)*.055,windZ=-.055+Math.sin(time*.13)*.025;
      camera.updateWorldMatrix(true,false);right.setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(.0032);
      let nearIndex=0;nearPositions.fill(0);
      for(let n=0;n<count;n++){
        const x=wrap(seeds[n*3],anchorX),z=wrap(seeds[n*3+2],anchorZ),hit=surface(x,z),speed=7.2+(n%13)*.38,y=anchorY+((seeds[n*3+1]-time*speed)%20+20)%20-3,length=.11+(n%11)*.025,top=y+length,base=Math.max(y,hit.height+.012),j=n*6;
        if(top<=hit.height||n/count>amount){positions.fill(0,j,j+6);continue;}
        const tx=x+windX*length,tz=z+windZ*length;positions.set([x,base,z,tx,top,tz],j);
        if(nearIndex<nearCount&&Math.hypot(x-anchorX,z-anchorZ)<9){
          const rx=right.x,ry=right.y,rz=right.z;
          nearPositions.set([x-rx,base-ry,z-rz,x+rx,base+ry,z+rz,tx-rx,top-ry,tz-rz,x+rx,base+ry,z+rz,tx+rx,top+ry,tz+rz,tx-rx,top-ry,tz-rz],nearIndex++*18);
        }
      }
      geometry.attributes.position.needsUpdate=true;nearGeometry.attributes.position.needsUpdate=true;
      const splashColumns=Math.ceil(Math.sqrt(splashCount)),cellX=Math.floor(anchorX/SPRING_WATER_IMPACT_SPACING),cellZ=Math.floor(anchorZ/SPRING_WATER_IMPACT_SPACING);
      for(let n=0;n<splashCount;n++){
        const impact=springWaterImpact(cellX+n%splashColumns-Math.floor(splashColumns/2),cellZ+Math.floor(n/splashColumns)-Math.floor(splashColumns/2),time);
        const {x,z,age}=impact,hit=surface(x,z),visible=hit.kind!=='canopy'&&impact.seed<amount;ages[n]=age;
        dummy.position.set(x,hit.height+.014,z);if(hit.kind==='water'||hit.kind==='prop'||hit.kind==='shelter'||hit.kind==='bench')normal.set(0,1,0);else normal.set((springRainSurface(x-.04,z).height-springRainSurface(x+.04,z).height)/.08,1,(springRainSurface(x,z-.04).height-springRainSurface(x,z+.04).height)/.08).normalize();
        // Water rings bend the reflected surface in the river shader. Only solid
        // surfaces receive ring decals; the water splash is a brief ballistic crown.
        dummy.quaternion.setFromUnitVectors(up,normal);dummy.scale.setScalar(visible&&hit.kind!=='water'?.047*age+.002:0);dummy.updateMatrix();splashes.setMatrixAt(n,dummy.matrix);
        for(let b=0;b<3;b++){const a=n*2.399+b*2.094,flight=age/(hit.kind==='water'?.19+b*.025:.30+b*.035),r=flight*.065,bounceY=Math.max(0,4*flight*(1-flight))*(hit.kind==='water'?.035:.075);bouncePositions.set(visible&&flight<1?[x+Math.cos(a)*r,hit.height+.012+bounceY,z+Math.sin(a)*r]:[0,-1000,0],n*9+b*3);}
      }
      bounceMaterial.opacity=amount*.28;bounceGeometry.attributes.position.needsUpdate=true;splashGeometry.attributes.rainAge.needsUpdate=true;splashes.instanceMatrix.needsUpdate=true;
    },
    dispose(){for(const [m,original] of restores){m.onBeforeCompile=original.compile;m.customProgramCacheKey=original.key;m.needsUpdate=true;}restores.clear();surfaceCache.clear();coverGrid.clear();splashes.dispose();geometry.dispose();material.dispose();nearGeometry.dispose();nearMaterial.dispose();bounceGeometry.dispose();bounceMaterial.dispose();splashGeometry.dispose();splashMaterial.dispose();group.removeFromParent();group.clear();}
  };
}
