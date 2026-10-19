import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {preloadVoidAssets,type ModelPart} from './assets';
import {SEASONS,type SeasonId,type SeasonKit,type SeasonManifest} from './seasons';
import {createSeasonTravel} from './season-navigation';
import {createSeasonLayout,groundHeight,AUTUMN_LAKE_LEVEL,random,type TreePlacement} from './season-layout';
import {createTerrain,createGroundCover,type GroundMaps} from './season-terrain';
import {createSeasonParticles} from './season-effects';
import {createCoastalOcean} from './season-ocean';
import {createSeasonProps} from './season-props';
import {createMeadowDetail} from './season-meadow';
import {createAutumnLake} from './season-lake';
import {createQualityController} from './quality';
import {createSeasonReflections} from './season-reflections';
import {createGroundMotion} from './season-ground-motion';
import {createSeasonSun} from './season-sun';
import {createSeasonRelics} from './season-relics';
import {seasonBook} from './season-book-data';

const KIT='/seasons/kit/catalog.json';
let warm:{id:SeasonId;controller:AbortController;promise:Promise<SeasonKit|null>}|null=null;
async function readKit(signal:AbortSignal){
  const response=await fetch(KIT,{signal});if(!response.ok)throw new Error('The seasonal asset collection could not load. Please try again.');
  const kit=await response.json() as SeasonKit;
  if(kit.version!==1||kit.coordinateSystem!=='Y_UP_METRES'||!kit.models||!kit.textures)throw new Error('Season asset collection mismatch.');
  return kit;
}
export function prewarmSeason(id:SeasonId|null){
  if(id===warm?.id)return;warm?.controller.abort();warm=null;
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;
  if(!id||connection?.saveData)return;
  const controller=new AbortController();warm={id,controller,promise:readKit(controller.signal).catch(()=>null)};
}

function disposeGraphs(roots:THREE.Object3D[],shared:Set<unknown>){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  for(const root of roots)root.traverse(o=>{
    if(!(o instanceof THREE.Mesh||o instanceof THREE.Points))return;
    geometries.add(o.geometry);if(o instanceof THREE.InstancedMesh)o.dispose();
    for(const material of Array.isArray(o.material)?o.material:[o.material]){
      materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
      if(material instanceof THREE.ShaderMaterial)for(const uniform of Object.values(material.uniforms))if(uniform.value instanceof THREE.Texture)textures.add(uniform.value);
    }
  });
  geometries.forEach(g=>{if(!shared.has(g))g.dispose();});materials.forEach(m=>{if(!shared.has(m))m.dispose();});
  textures.forEach(t=>{if(!shared.has(t)){t.dispose();if(typeof ImageBitmap!=='undefined'&&t.image instanceof ImageBitmap)t.image.close();}});
  roots.forEach(r=>r.clear());
}

/** Only one scene is live; all immutable component assets are assembled behind the curtain. */
export async function loadSeasonWorld(renderer:THREE.WebGLRenderer,id:SeasonId,signal:AbortSignal,progress:(message:string)=>void){
  const definition=SEASONS[id],scene=new THREE.Scene(),shared=new Set<unknown>(),sources:THREE.Object3D[]=[],textures:THREE.Texture[]=[],targets:THREE.RenderTarget[]=[];
  let terrain:ReturnType<typeof createTerrain>|undefined,cover:ReturnType<typeof createGroundCover>|undefined,particles:ReturnType<typeof createSeasonParticles>|undefined,ocean:ReturnType<typeof createCoastalOcean>|undefined,props:ReturnType<typeof createSeasonProps>|undefined,meadow:ReturnType<typeof createMeadowDetail>|undefined,lake:ReturnType<typeof createAutumnLake>|undefined;
  let bytes=0,disposed=false;const qualityController=createQualityController(renderer);
  let relics:ReturnType<typeof createSeasonRelics>|undefined;
  const check=()=>{if(signal.aborted)throw new DOMException('Aborted','AbortError');};
  const mobile=matchMedia('(pointer: coarse)').matches||((navigator as Navigator&{deviceMemory?:number}).deviceMemory??8)<=4;
  const groundMotion=createGroundMotion();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),textureCache=new Map<string,Promise<THREE.Texture>>();
  const ownedMaterials:THREE.Material[]=[],ownedGeometries:THREE.BufferGeometry[]=[];
  async function texture(url:string,colour:boolean){
    if(!url.startsWith('/seasons/kit/')&&!url.startsWith('/manga/')&&!url.startsWith('/materials/'))throw new Error('Season texture path mismatch.');
    const key=url+colour;if(textureCache.has(key))return textureCache.get(key)!;
    const request=(async()=>{const r=await fetch(url,{signal});if(!r.ok)throw new Error(`A ${definition.title.toLowerCase()} texture could not load.`);const blob=await r.blob();bytes+=blob.size;check();
      const bitmap=await createImageBitmap(blob,{imageOrientation:'flipY'});const t=new THREE.Texture(bitmap);textures.push(t);t.needsUpdate=true;t.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(mobile?4:8,renderer.capabilities.getMaxAnisotropy());check();return t;
    })();textureCache.set(key,request);return request;
  }
  async function model(url:string){
    if(!url.startsWith('/seasons/kit/')&&url!=='/manga/book-v3.glb')throw new Error('Season model path mismatch.');
    const r=await fetch(url,{signal});if(!r.ok)throw new Error('A seasonal model could not load. Please try again.');
    const data=await r.arrayBuffer();bytes+=data.byteLength;check();
    const result=await loader.parseAsync(data,url.slice(0,url.lastIndexOf('/')+1));sources.push(result.scene);check();
    result.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){m.envMapIntensity=.55;m.roughness=Math.max(.5,m.roughness);for(const t of [m.map,m.normalMap,m.roughnessMap])if(t)t.anisotropy=8;}}});
    return result.scene;
  }
  async function maps(key:string):Promise<GroundMaps>{const entry=kit.textures[key];if(!entry)throw new Error(`Missing ground material: ${key}`);const [color,normal,roughness]=await Promise.all([texture(entry.color,true),texture(entry.normal,false),texture(entry.roughness,false)]);return {color,normal,roughness,sizeMetres:entry.sizeMetres};}
  let kit:SeasonKit;
  const dispose=()=>{
    if(disposed)return;disposed=true;qualityController.dispose();terrain?.dispose();cover?.dispose();particles?.dispose();ocean?.dispose();lake?.dispose();props?.dispose();relics?.dispose();
    sun?.shadow.dispose();disposeGraphs([scene,...sources],shared);ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());
    textures.forEach(t=>{t.dispose();if(typeof ImageBitmap!=='undefined'&&t.image instanceof ImageBitmap)t.image.close();});targets.forEach(t=>t.dispose());
  };
  let sun:THREE.DirectionalLight|undefined;
  try{
    progress(`Opening ${definition.title.toLowerCase()}…`);
    if(warm?.id===id){const entry=warm;warm=null;kit=await entry.promise||await readKit(signal);}else kit=await readKit(signal);check();
    const treeKey=definition.tree;
    if(id!=='spring'&&!kit.models[treeKey]?.variants.length)throw new Error(`The selected ${definition.title.toLowerCase()} trees are still being prepared.`);
    const layout=createSeasonLayout(id),travel=createSeasonTravel(layout.navigation,(x,z)=>props?.pickup.blocked(x,z)??false);
    const camera=new THREE.PerspectiveCamera(58,1,.10,240);camera.rotation.order='YXZ';
    scene.name=`${definition.title} · authored landscape`;scene.background=new THREE.Color(definition.sky);scene.fog=new THREE.FogExp2(definition.fog,id==='winter'?.004:id==='summer'?.0015:.0055);
    scene.add(new THREE.HemisphereLight(definition.ambient,definition.ground,id==='winter'?.85:1.25));
    sun=new THREE.DirectionalLight(definition.sun,definition.sunPower);sun.target.position.set(0,0,-3);sun.position.copy(new THREE.Vector3(...definition.sunDirection).normalize().multiplyScalar(90)).add(sun.target.position);scene.add(sun,sun.target);
    renderer.shadowMap.type=THREE.PCFShadowMap;
    sun.castShadow=true;sun.shadow.mapSize.setScalar(mobile||qualityController.constrained?2048:4096);Object.assign(sun.shadow.camera,{left:-28,right:28,top:30,bottom:-30,near:1,far:190});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
    progress('Sculpting the path and settling the light…');
    const baseKey=id==='winter'?'snow_02':id==='summer'?'sand_03':id==='autumn'?'brown_mud_leaves_01':'leafy_grass';
    const [base,path,sky]=await Promise.all([maps(baseKey),maps(id==='winter'?'snow_02':id==='summer'?'sand_03':'rocky_trail'),texture(kit.skies[id].url,true)]);check();
    sky.mapping=THREE.EquirectangularReflectionMapping;sky.wrapS=THREE.RepeatWrapping;sky.wrapT=THREE.ClampToEdgeWrapping;scene.background=sky;scene.backgroundRotation.y=id==='summer'||id==='winter'?2.6:2.4;scene.environmentRotation.y=scene.backgroundRotation.y;
    scene.backgroundIntensity=id==='winter'?.78:1;
    const pmrem=new THREE.PMREMGenerator(renderer);try{const env=pmrem.fromEquirectangular(sky);targets.push(env);scene.environment=env.texture;}finally{pmrem.dispose();}
    scene.environmentIntensity=id==='winter'?.48:id==='spring'?.8:.7;
    terrain=createTerrain(id,base,path,mobile);scene.add(terrain.group);
    const grassSource=id!=='winter'?await model(kit.models.grass.variants[2].lods.near.url):undefined;
    cover=createGroundCover(id,layout,mobile,grassSource,groundMotion);cover.group.userData.skipOceanReflection=true;scene.add(cover.group);
    if(id==='spring'){meadow=createMeadowDetail(layout,mobile,groundMotion);scene.add(meadow.group);}
    const propKeys=id==='spring'?['basket','picnic-basket','apple','plate','thermos','rock']:id==='summer'?['ball','thermos','shell','rock','coastal-shrub','coral']:id==='winter'?['campfire','log','lantern','camp-thermos','bench','rock']:['bench','rock','apple','thermos'];
    const propModels:Record<string,THREE.Object3D>={};
    const sharedAssets=await preloadVoidAssets();
    for(const key of propKeys){
      if(key==='rock'&&id!=='summer'){
        const part=sharedAssets.rocks[0],root=new THREE.Group(),material=part.material.clone();
        for(const t of [material.map,material.normalMap,material.roughnessMap])if(t)shared.add(t);
        root.add(new THREE.Mesh(part.geometry.clone(),material));sources.push(root);propModels[key]=root;continue;
      }
      const entry=kit.models[key==='rock'&&id==='summer'?'pebble':key];if(!entry)throw new Error(`The selected ${key} asset is not available.`);propModels[key]=await model(entry.variants[0].lods.near.url);
    }
    const trees:ModelPart[][][]=[];
    const blossomAssets=id==='spring'?await preloadVoidAssets():null;
    if(blossomAssets){for(const lods of blossomAssets.trees)for(const parts of lods)for(const part of parts)for(const t of [part.material.map,part.material.normalMap,part.material.roughnessMap])if(t)shared.add(t);}
    {
      for(const variant of kit.models[treeKey].variants){
        const lods:ModelPart[][]=[];
        for(const level of ['near','mid','far'] as const){
          const root=await model(variant.lods[level].url);root.updateMatrixWorld(true);const parts:ModelPart[]=[];
          root.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){
            if(blossomAssets){const original=blossomAssets.trees[0][0].find(p=>p.material.name===o.material.name)?.material;if(original){o.material.map=original.map;o.material.normalMap=original.normalMap;o.material.roughnessMap=original.roughnessMap;}}
            let geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
            if(id==='winter'&&/twig|needle|foliage/i.test(o.material.name)){
              const second=geometry.clone().rotateY(.83).scale(.94,.97,.94);
              const dense=mergeGeometries([geometry,second]);if(dense){geometry.dispose();geometry=dense;}second.dispose();
            }
            // Scanned bark uses an authored atlas. Preserve its UV seams, normals
            // and tangent frame rather than wrapping the whole branched tree.
            ownedGeometries.push(geometry);geometry.computeBoundingSphere();parts.push({geometry,material:o.material as THREE.MeshStandardMaterial,name:o.material.name||o.name});
          }});lods.push(parts);
        }
        if(id==='autumn'||id==='summer'){
          // Anchor crown-centred imports at the actual root, so trunks, body
          // collisions and the small plants at their feet share one location.
          const bark=lods[0].filter(p=>!/foliage|leaf|leav/i.test(p.name)),root=new THREE.Vector3();let samples=0,minY=Infinity;
          bark.forEach(p=>{p.geometry.computeBoundingBox();minY=Math.min(minY,p.geometry.boundingBox!.min.y);});
          bark.forEach(p=>{const a=p.geometry.attributes.position;for(let i=0;i<a.count;i++)if(a.getY(i)<minY+.16){root.x+=a.getX(i);root.z+=a.getZ(i);samples++;}});
          if(samples){root.divideScalar(samples);lods.flat().forEach(p=>{p.geometry.translate(-root.x,0,-root.z);p.geometry.computeBoundingSphere();});}
        }
        trees.push(lods);
      }
    }
    progress('Planting the trees and arranging the little details…');check();
    const wind={value:0};
    const batches:{meshes:THREE.InstancedMesh[];variant:number;level:number}[]=[];
    const heights=trees.map(lods=>{const box=new THREE.Box3();for(const part of lods[0]){part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox!);}return Math.max(.01,box.max.y-box.min.y);});
    const materialCache=new Map<THREE.Material,THREE.MeshStandardMaterial>();
    const daylight=(source:THREE.MeshStandardMaterial,name:string)=>{
      if(materialCache.has(source))return materialCache.get(source)!;
      const foliage=/foliage|leaf|leav|twig|needle|frond/i.test(name)||source.alphaTest>0||!!source.alphaMap;
      const m=new THREE.MeshStandardMaterial().copy(source);m.envMapIntensity=.65;m.metalness=0;m.roughness=foliage?.92:Math.max(.72,m.roughness);m.emissive.set(0);m.emissiveIntensity=0;
      if(foliage){m.normalMap=null;m.roughnessMap=null;m.metalnessMap=null;}
      if(foliage){m.side=THREE.DoubleSide;m.transparent=false;m.depthWrite=true;m.alphaTest=id==='winter'?.22:.38;if(id==='spring'){m.color.set(0xffffff);m.emissive.set(0xff639d);m.emissiveMap=m.map;m.emissiveIntensity=.12;}}
      if(!foliage&&id==='winter')m.normalScale.set(.55,.55);
      m.onBeforeCompile=s=>{s.uniforms.seasonWind=wind;s.vertexShader='uniform float seasonWind;\n'+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat h=clamp(position.y/${Math.max(heights[0],1).toFixed(4)},0.,1.);float phase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.23;transformed.x+=sin(seasonWind*.7+position.y*.55+phase)*h*h*${id==='summer'?'.075':'.035'};`);
        if(foliage&&id==='winter'){
          s.vertexShader='varying vec3 boughNormal;varying vec3 boughPosition;\n'+s.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nboughNormal=normalize(mat3(instanceMatrix)*objectNormal);boughPosition=position;');
          s.fragmentShader='varying vec3 boughNormal;varying vec3 boughPosition;\n'+s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat snowCover=smoothstep(.12,.68,boughNormal.y)*(.58+.17*sin(boughPosition.x*8.+boughPosition.z*6.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.67,.73,.81),snowCover);');
        }
        if(foliage&&id==='autumn')s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat leafValue=clamp(dot(diffuseColor.rgb,vec3(.4,.4,.2))*2.8,.13,.7);float gold=.65;\n#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)\ngold=clamp(vColor.g/max(.05,vColor.r)*1.7-.25,0.,1.);\n#endif\ndiffuseColor.rgb=leafValue*mix(vec3(1.25,.17,.018),vec3(1.35,.83,.055),gold);');
        if(foliage&&id==='spring')s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat petalLight=dot(diffuseColor.rgb,vec3(.25,.55,.2));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(petalLight*1.48,petalLight*.42,petalLight*.86),.42);');
      };
      ownedMaterials.push(m);materialCache.set(source,m);return m;
    };
    trees.forEach((lods,variant)=>lods.forEach((parts,level)=>{
      const meshes=parts.map(part=>{const mesh=new THREE.InstancedMesh(part.geometry,daylight(part.material,part.name),layout.trees.length);mesh.count=0;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.name=`${treeKey} ${variant} LOD ${level}`;scene.add(mesh);return mesh;});batches.push({variant,level,meshes});
    }));
    props=createSeasonProps(id,layout,propModels,mobile,id==='winter'?await maps('granite_tile_03'):undefined,grassSource,reduced);scene.add(props.group);
    progress('Placing the locked book and its brass key…');
    const [bookModel,chapterCover,cedar,cloth,paper]=await Promise.all([model('/manga/book-v3.glb'),texture(seasonBook(id).cover,true),texture('/materials/cedar.webp',true),texture('/materials/binding-cloth.webp',true),texture('/materials/paper-stock.webp',true)]);check();
    let relicStorage:Storage|undefined;try{relicStorage=window.localStorage;}catch{}
    const keyStone=sharedAssets.rocksFar[0];for(const t of [keyStone.material.map,keyStone.material.normalMap,keyStone.material.roughnessMap])if(t)shared.add(t);
    relics=createSeasonRelics(id,layout,bookModel,chapterCover,reduced,relicStorage,{wood:cedar,cloth,paper,stone:keyStone});scene.add(relics.group);
    props.solids.push(relics.chest,relics.keyStone,relics.book,relics.key);
    if(id==='autumn'&&!mobile){
      const reflected=createSeasonReflections(trees,layout.trees,heights);scene.add(reflected);
      reflected.traverse(o=>{if(o instanceof THREE.Mesh)ownedMaterials.push(...(Array.isArray(o.material)?o.material:[o.material]));});
      terrain.group.traverse(o=>{if(o instanceof THREE.Mesh&&(o.geometry.boundingSphere?.center.length()??Infinity)<65)o.layers.enable(1);});
      props.group.traverse(o=>o.layers.enable(1));scene.traverse(o=>{if(o instanceof THREE.Light)o.layers.enable(1);});
    }
    particles=createSeasonParticles(id,mobile,reduced);particles.mesh.userData.skipOceanReflection=true;scene.add(particles.mesh);
    if(id==='summer')ocean=createCoastalOcean(scene,sky,await texture('/seasons/kit/textures/waternormals.jpg',false),base.color,reduced,mobile);
    if(id==='autumn')lake=createAutumnLake(scene,sky,await texture('/seasons/kit/textures/waternormals.jpg',false),reduced,mobile,grassSource);
    const sunGlow=createSeasonSun(definition.sunDirection,definition.sun);scene.add(sunGlow.mesh);
    const matrix=new THREE.Object3D(),sphere=new THREE.Sphere(),frustum=new THREE.Frustum(),projection=new THREE.Matrix4();
    let time=0,lastPlacement='',quality=1,lastSnowX=0,lastSnowZ=3.5,foot=0,lastMovingShadow=-1,lastRelicShadow=-1,wasPropMoving=false,wasRelicMoving=false,relicBlocked=false;
    const placeTrees=(all=false)=>{
      const key=`${Math.round(camera.position.x*2)}:${Math.round(camera.position.z*2)}:${Math.round(camera.rotation.y*12)}:${Math.round(camera.rotation.x*12)}:${quality}:${all}`;if(key===lastPlacement)return;lastPlacement=key;
      camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
      batches.forEach(b=>b.meshes.forEach(m=>m.count=0));
      const nearest=layout.trees.map((tree,index)=>({tree,index,distance:Math.hypot(tree.x-camera.position.x,tree.z-camera.position.z)}));
      for(const {tree:t,distance:d} of nearest){
        if(d>145)continue;
        sphere.set(new THREE.Vector3(t.x,t.y+t.height*.5,t.z),t.height*.62);if(!all&&!frustum.intersectsSphere(sphere))continue;
        const variant=t.variant%trees.length;
        // Fixed scenic LODs avoid visible tree changes inside the small walking circle.
        const level=mobile&&id!=='summer'&&t.lod===0?1:((id==='autumn'&&d<45)||id==='winter'&&d<42)&&t.lod===2?1:t.lod;
        const scale=t.height/heights[variant];matrix.position.set(t.x,t.y,t.z);matrix.rotation.set(0,t.yaw,id==='summer'?(random(t.seed)-.5)*.14:0);matrix.scale.setScalar(scale);matrix.updateMatrix();
        const batch=batches.find(b=>b.variant===variant&&b.level===level)!;
        for(const mesh of batch.meshes){const slot=mesh.count++;mesh.setMatrixAt(slot,matrix.matrix);if(mesh.material instanceof THREE.MeshStandardMaterial&&/foliage|leaf|leav|twig|needle|frond/i.test(mesh.material.name))mesh.setColorAt(slot,new THREE.Color().setHSL(id==='autumn'?.012+random(t.seed)*.13:id==='spring'?.92+random(t.seed)*.065:.25,id==='autumn'?.64:id==='spring'?.34+random(t.seed+1)*.19:.06,id==='autumn'?.64:id==='spring'?.71+random(t.seed+3)*.13:.88));}

      }
      batches.flatMap(b=>b.meshes).forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;});
    };
    function update(dt:number,paused:boolean){const blocked=relics!.busy;if(blocked!==relicBlocked){travel.block(blocked);relicBlocked=blocked;}travel.update(dt);if(!paused&&!reduced)time+=dt;wind.value=reduced?0:time;
      if(id==='winter'&&Math.hypot(travel.state.x-lastSnowX,travel.state.z-lastSnowZ)>.52){const side=foot++%2?1:-1;terrain!.stepSnow(travel.state.x+Math.cos(travel.state.yaw)*.12*side,travel.state.z-Math.sin(travel.state.yaw)*.12*side,travel.state.yaw,time);lastSnowX=travel.state.x;lastSnowZ=travel.state.z;}
      camera.position.set(travel.state.x,dt===0?travel.state.y:THREE.MathUtils.lerp(camera.position.y,travel.state.y,1-Math.exp(-dt*16)),travel.state.z);camera.rotation.set(travel.state.pitch,travel.state.yaw,0,'YXZ');placeTrees();terrain!.update(camera,time);cover!.update(time,camera,quality);meadow?.update(time,quality);groundMotion.update(time,camera,!paused&&!reduced&&travel.state.velocity>.15);sunGlow.update(camera);particles!.update(time,camera,quality);props!.update(time,dt,camera);ocean?.update(time,camera,travel.state.velocity>.25&&!paused);lake?.update(time,camera,!paused&&travel.state.velocity>.15);
      relics!.setHandsBusy(!!props!.pickup.held);relics!.update(dt,time,camera);
      if((props!.moving||wasPropMoving)&&performance.now()/1000-lastMovingShadow>.12){sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;lastMovingShadow=performance.now()/1000;wasPropMoving=props!.moving;}
      const relicMoving=relics!.movingShadow;if((relicMoving||wasRelicMoving)&&performance.now()/1000-lastRelicShadow>.12){sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;lastRelicShadow=performance.now()/1000;wasRelicMoving=relicMoving;}
    }
    update(0,false);progress('Preparing shadows and warming the landscape…');
    const oldShadow=renderer.shadowMap.enabled,oldAuto=renderer.shadowMap.autoUpdate,oldTarget=renderer.getRenderTarget();
    const warmTarget=new THREE.WebGLRenderTarget(32,32);renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    try{
      // Warm every LOD variant and the complete static shadow field once.
      placeTrees(true);relics.warm(true);await renderer.compileAsync(scene,camera);check();renderer.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=true;renderer.setRenderTarget(warmTarget);renderer.render(scene,camera);check();
    }finally{relics.warm(false);renderer.setRenderTarget(oldTarget);warmTarget.dispose();renderer.shadowMap.enabled=oldShadow;renderer.shadowMap.autoUpdate=oldAuto;}
    lastPlacement='';update(0,false);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();raycaster.far=7;
    const aim=(x=0,y=0)=>{pointer.set(x,y);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);};
    const pickupObject=()=>{aim();if(relics!.busy||props!.pickup.held||props!.pickup.settling)return null;const prop=props!.pickup.pickup(camera,raycaster);if(prop)return prop;const hint=relics!.hint(camera,raycaster);return /^(Pick|Take)/.test(hint)?relics!.interact(camera,raycaster):null;};
    const dropObject=()=>{if(relics!.busy||props!.pickup.settling)return null;return props!.pickup.held?props!.pickup.drop(camera):relics!.drop(camera,(object,view)=>props!.pickup.placement(object,view));};
    const manifest:SeasonManifest={version:2,id,revision:'season-realism-2026-10-19',model:KIT,bytes,triangles:0,navigation:layout.navigation,bounds:{min:[-112,-5,-112],max:[112,35,112]},assets:propKeys.concat(treeKey)};
    return {id,scene,camera,travel,manifest,mobile,exposure:definition.exposure,update,dispose,qualityController,
      bookStatus(){aim();const book=relics!.status(camera),prop=props!.pickup.status(camera,raycaster),hint=relics!.hint(camera,raycaster);return {...book,heldObject:prop.held,canPick:!prop.held&&!prop.settling&&(/^(Pick|Take)/.test(hint)||prop.action.startsWith('Pick')),canDrop:!prop.settling&&!!(prop.held||book.hasKey||book.hasBook),canInteract:!!(book.action||props?.interactionHint(raycaster)),action:prop.held?`Carrying ${prop.held} · F to put down`:prop.action||hint||props?.interactionHint(raycaster)||''};},
      pickupObject,dropObject,pickOrDrop(){aim();const status=props!.pickup.status(camera,raycaster);return props!.pickup.held?dropObject():status.action.startsWith('Pick')||/^(Pick|Take)/.test(relics!.hint(camera,raycaster))?pickupObject():dropObject();},
      readBook(){if(props!.pickup.moving)return false;const started=relics!.read();if(started)travel.resetInput();return started;},closeBook(){relics!.close();travel.resetInput();},
      get bookBusy(){return relics!.busy;},get readerReady(){return relics!.readerReady;},
      interactionHint(){aim();return props!.pickup.status(camera,raycaster).action||relics!.hint(camera,raycaster)||props?.interactionHint(raycaster)||(id==='autumn'?'Wade into the shallows · Touch the lake for ripples':id==='summer'?'Wade into the sea · Touch the water for splashes':null);},
      interact(x?:number,y?:number){
        aim(x??0,y??0);if(relics!.busy)return null;const relic=relics!.interact(camera,raycaster,x!==undefined);if(relic)return relic;
        const hit=props?.interact(raycaster);if(hit)return hit.label;
        if(lake){const hit=raycaster.intersectObject(lake.mesh,false)[0];if(hit&&lake.ripple(hit.point.x,hit.point.z,time))return 'Ripples across the lake';}
        if(ocean){const hit=raycaster.intersectObject(ocean.mesh,false)[0];if(hit&&ocean.ripple(hit.point.x,hit.point.z,time))return 'A splash in the shallows';}
        if(id==='spring'||id==='autumn'){const hit=raycaster.intersectObjects(terrain!.group.children,false)[0];if(hit){groundMotion.disturb(hit.point.x,hit.point.z,time);return id==='spring'?'Petals stir in the grass':'Leaves rustle underfoot';}}
        if(id==='winter'){const ground=raycaster.intersectObjects(terrain!.group.children,false)[0];if(ground){terrain!.stepSnow(ground.point.x,ground.point.z,travel.state.yaw,time);return 'Fresh snow pressed';}}
        return null;
      },
      setQuality(value:number){quality=Math.max(.45,Math.min(1,value));ocean?.setQuality(quality);lake?.setQuality(quality);lastPlacement='';},
      resize(width:number,height:number){camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();lastPlacement='';},
      snapshot(){return {treeCount:layout.trees.length,quality,bytes,waterDepth:Math.max(0,(layout.navigation.waterLevel??-Infinity)-(travel.state.y-1.63)),lakeRipples:lake?.rippleCount??0,fishJumps:lake?.fishJumps??0,...props!.snapshot()};},
    };
  }catch(error){dispose();throw error;}
}
export type SeasonWorld=Awaited<ReturnType<typeof loadSeasonWorld>>;
