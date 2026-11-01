import {loadSummerSurfaces} from './summer-surfaces';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
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
import {createSpringTreasureState,springPutAwayCommand,springItemHands,springHeldItem,springRemaining,springShadowChanged,springAdaviDialogue,springQuestBusy,SPRING_FOOD_NAMES,type SpringTarget,type SpringCarryItem,type SpringDroppedItem,type SpringSave} from './spring-treasure-state';
import {SPRING_SPOTS} from './spring-treasure-layout';
import {createSpringTreasureWorld} from './spring-treasure-world';
import {createSpringKsrtcBus} from './spring-ksrtc-bus';
import {createSpringRain} from './spring-rain';
import {createSpringJourneyClues} from './spring-compass';
import {createSpringDroppedItems} from './spring-dropped-items';
import {adaviGround} from './spring-adavi-environment';
import {createSpringNorthTrain,SPRING_TRAIN_MODEL} from './spring-north-train';
import {createSpringJourneySky,springNorthWeather,springWeatherClear} from './spring-north-weather';
import {createSpringRainAudio} from './spring-rain-audio';
import {createSpringTrainQuest,SPRING_TRAIN_CASE_MODEL,createSpringDiamondKey} from './spring-train-quest';
import {createSpringFinaleWorld,SPRING_DUMPLINGS_MODEL} from './spring-finale-world';
import {createSpringEnding} from './spring-ending';
import {springWakingPose} from './spring-waking';
import {createSpringPreviewStorage,type SpringPreviewChapter} from './spring-preview';
import {compileVisibleSeason,withSeasonPropsVisible} from './season-warmup';
import {SPRING_ROADSIDE_MODELS} from './spring-kerala-roadside';
import {createSummerState,type SummerPanel,type SummerState} from './summer-state';
import {createSummerMovement} from './summer-movement';
import {createSummerWorld} from './summer-world';
import {createSummerUnderwater} from './summer-underwater';
import {createSummerAudio} from './summer-audio';
import {createSummerForest} from './summer-forest';
import {loadSummerImportedTemplates} from './summer-asset-loader';
import {SUMMER_BOUNDS,SUMMER_LANDMARKS,SUMMER_ROUTE_POSTS,summerWaterLevel,type SummerRoutePostId} from './summer-layout';

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
export async function loadSeasonWorld(renderer:THREE.WebGLRenderer,id:SeasonId,signal:AbortSignal,progress:(message:string)=>void,preview?:{springChapter?:SpringPreviewChapter}){
  const definition=SEASONS[id],scene=new THREE.Scene(),shared=new Set<unknown>(),sources:THREE.Object3D[]=[],textures:THREE.Texture[]=[],targets:THREE.RenderTarget[]=[];
  let terrain:ReturnType<typeof createTerrain>|undefined,cover:ReturnType<typeof createGroundCover>|undefined,particles:ReturnType<typeof createSeasonParticles>|undefined,ocean:ReturnType<typeof createCoastalOcean>|undefined,props:ReturnType<typeof createSeasonProps>|undefined,meadow:ReturnType<typeof createMeadowDetail>|undefined,lake:ReturnType<typeof createAutumnLake>|undefined;
  let bytes=0,disposed=false;const qualityController=createQualityController(renderer);
  let relics:ReturnType<typeof createSeasonRelics>|undefined;
  let springWorld:ReturnType<typeof createSpringTreasureWorld>|undefined;
  let springBus:ReturnType<typeof createSpringKsrtcBus>|undefined,springRain:ReturnType<typeof createSpringRain>|undefined;
  let springDrops:ReturnType<typeof createSpringDroppedItems>|undefined;
  let springTrain:ReturnType<typeof createSpringNorthTrain>|undefined,springClues:ReturnType<typeof createSpringJourneyClues>|undefined,springSky:ReturnType<typeof createSpringJourneySky>|undefined;
  let springRainAudio:ReturnType<typeof createSpringRainAudio>|undefined;
  let springTrainQuest:ReturnType<typeof createSpringTrainQuest>|undefined,springFinale:ReturnType<typeof createSpringFinaleWorld>|undefined,springEnding:ReturnType<typeof createSpringEnding>|undefined,springDiamond:ReturnType<typeof createSpringDiamondKey>|undefined;
  let busEnvironment:THREE.Texture|undefined;
  let spring:ReturnType<typeof createSpringTreasureState>|null=null,springTarget:SpringTarget|'satchel'|null=null,springBookRequested=false,lastSpringState:SpringSave|null=null;
  let summer:ReturnType<typeof createSummerState>|null=null,summerTarget:SummerPanel|null=null,summerReader=false;
  let summerWorld:ReturnType<typeof createSummerWorld>|undefined,underwater:ReturnType<typeof createSummerUnderwater>|undefined;
  let summerForest:ReturnType<typeof createSummerForest>|undefined;
  const routeNamesForPosts:Record<string,SummerRoutePostId>={U0:'training',U1:'observation',U2:'fork',REST:'rest',U3:'winch',U4:'case'};
  let summerUnsubscribe:(()=>void)|undefined;
  const summerAudio=id==='summer'?createSummerAudio():null;let lastSummerRevision=-1,lastSummerAir=-1;
  let summerTransition:{from:THREE.Vector3;elapsed:number;duration:number;next:'swimming'|'mooring'|null}|null=null;
  const check=()=>{if(signal.aborted||disposed)throw new DOMException('Aborted','AbortError');};
  const mobile=matchMedia('(pointer: coarse)').matches||((navigator as Navigator&{deviceMemory?:number}).deviceMemory??8)<=4;
  const groundMotion=createGroundMotion();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),textureCache=new Map<string,Promise<THREE.Texture>>();
  const ownedMaterials:THREE.Material[]=[],ownedGeometries:THREE.BufferGeometry[]=[];
  async function texture(url:string,colour:boolean){
    if(!url.startsWith('/seasons/kit/')&&!url.startsWith('/manga/')&&!url.startsWith('/materials/'))throw new Error('Season texture path mismatch.');
    const key=url+colour;if(textureCache.has(key))return textureCache.get(key)!;
    const request=(async()=>{const r=await fetch(url,{signal});if(!r.ok)throw new Error(`A ${definition.title.toLowerCase()} texture could not load.`);const blob=await r.blob();bytes+=blob.size;check();
      const bitmap=await createImageBitmap(blob,{imageOrientation:'flipY'});if(disposed||signal.aborted){bitmap.close();check();}const t=new THREE.Texture(bitmap);textures.push(t);t.needsUpdate=true;t.colorSpace=colour?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(mobile?4:8,renderer.capabilities.getMaxAnisotropy());check();return t;
    })();textureCache.set(key,request);return request;
  }
  const modelDataCache=new Map<string,Promise<ArrayBuffer>>();
  function modelData(url:string){
    if(!url.startsWith('/seasons/kit/')&&url!=='/manga/book-v3.glb')throw new Error('Season model path mismatch.');
    let data=modelDataCache.get(url);if(data)return data;
    data=(async()=>{const r=await fetch(url,{signal});if(!r.ok)throw new Error('A seasonal model could not load. Please try again.');const buffer=await r.arrayBuffer();bytes+=buffer.byteLength;check();return buffer;})();
    modelDataCache.set(url,data);return data;
  }
  async function model(url:string){
    const data=await modelData(url);
    const result=await loader.parseAsync(data,url.slice(0,url.lastIndexOf('/')+1));if(disposed||signal.aborted){disposeGraphs([result.scene],shared);check();}sources.push(result.scene);check();
    result.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){m.envMapIntensity=.55;m.roughness=Math.max(.5,m.roughness);for(const t of [m.map,m.normalMap,m.roughnessMap])if(t)t.anisotropy=8;}}});
    return result.scene;
  }
  async function maps(key:string):Promise<GroundMaps>{const entry=kit.textures[key];if(!entry)throw new Error(`Missing ground material: ${key}`);const [color,normal,roughness]=await Promise.all([texture(entry.color,true),texture(entry.normal,false),texture(entry.roughness,false)]);return {color,normal,roughness,sizeMetres:entry.sizeMetres};}
  let kit:SeasonKit;
  const dispose=()=>{
    if(disposed)return;disposed=true;modelDataCache.clear();textureCache.clear();summerUnsubscribe?.();summerAudio?.dispose();summerWorld?.dispose();summerForest?.dispose();underwater?.dispose();qualityController.dispose();terrain?.dispose();cover?.dispose();particles?.dispose();ocean?.dispose();lake?.dispose();props?.dispose();springWorld?.dispose();springBus?.dispose();springRain?.dispose();relics?.dispose();
    springDrops?.dispose();springTrainQuest?.dispose();springFinale?.dispose();springEnding?.dispose();springDiamond?.dispose();springTrain?.dispose();springClues?.dispose();springSky?.dispose();springRainAudio?.dispose();sun?.shadow.dispose();disposeGraphs([scene,...sources],shared);ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());
    textures.forEach(t=>{t.dispose();if(typeof ImageBitmap!=='undefined'&&t.image instanceof ImageBitmap)t.image.close();});targets.forEach(t=>t.dispose());
  };
  let sun:THREE.DirectionalLight|undefined;
  try{
    progress(`Opening ${definition.title.toLowerCase()}…`);
    if(warm?.id===id){const entry=warm;warm=null;kit=await entry.promise||await readKit(signal);}else kit=await readKit(signal);check();
    const treeKey=definition.tree;
    // Fetch independent assets together, ahead of their sequential scene assembly.
    // Repeated URLs share bytes; every consumer still gets its own parsed graph.
    const primeModels=(urls:string[])=>urls.forEach(url=>{void modelData(url).catch(()=>{});});
    primeModels(['/manga/book-v3.glb',...(id==='summer'?[...kit.models.palm.variants,...kit.models.maple.variants]:kit.models[treeKey]?.variants??[]).flatMap(v=>Object.values(v.lods).map(l=>l.url))]);
    if(id==='spring'){
      primeModels([SPRING_TRAIN_MODEL,...Object.values(SPRING_ROADSIDE_MODELS),...['maple','palm'].flatMap(key=>kit.models[key].variants.slice(0,key==='maple'?2:1).flatMap(v=>Object.values(v.lods).map(l=>l.url))),...['woodland-rock','loose-rock'].map(key=>kit.models[key].variants[0].lods.far.url),'/seasons/kit/spring-personal/mushroom-toy.glb','/seasons/kit/spring-personal/candle.glb']);
      for(const file of ['sunny-sky.webp','asphalt-color.jpg','asphalt-normal.jpg','asphalt-roughness.jpg',...['metal','plaster','roof'].flatMap(p=>['color','normal','roughness'].map(k=>p+'-'+k+'.jpg'))])void texture('/seasons/kit/spring-bus/'+file,file==='sunny-sky.webp'||file.includes('color')).catch(()=>{});
      for(const prefix of ['masonry','laterite'])for(const kind of ['color','normal','roughness'])void texture('/seasons/kit/spring-roadside/'+prefix+'-'+kind+'.webp',kind==='color').catch(()=>{});
    }
    if(id!=='spring'&&!kit.models[treeKey]?.variants.length)throw new Error(`The selected ${definition.title.toLowerCase()} trees are still being prepared.`);
    const layout=createSeasonLayout(id),walking=createSeasonTravel(layout.navigation,(x,z)=>springWorld?.inside||springBus?.group.visible?false:!!(springWorld?.doorwayBlocked(x,z)||props?.pickup.blocked(x,z)||springTrain?.blockedAt(x,z)||id==='spring'&&z< -32&&!spring?.state.dreamReturned),id==='summer'?summerWaterLevel:undefined);
    const summerMovement=id==='summer'?createSummerMovement(walking):null,travel=summerMovement??walking;
    if(id==='spring'){Object.assign(travel.state,{x:SPRING_SPOTS.picnic.x,z:SPRING_SPOTS.picnic.z+2.55,y:groundHeight('spring',SPRING_SPOTS.picnic.x,SPRING_SPOTS.picnic.z+2.55)+1.63,yaw:0,pitch:-.20});}
    const camera=new THREE.PerspectiveCamera(58,1,.10,id==='summer'?420:240);camera.rotation.order='YXZ';
    scene.name=`${definition.title} · authored landscape`;scene.background=new THREE.Color(definition.sky);scene.fog=new THREE.FogExp2(definition.fog,id==='winter'?.004:id==='summer'?.0015:.0055);
    const outdoorAmbient=new THREE.HemisphereLight(definition.ambient,definition.ground,id==='winter'?.85:1.25);scene.add(outdoorAmbient);
    sun=new THREE.DirectionalLight(definition.sun,definition.sunPower);sun.target.position.set(0,0,-3);sun.position.copy(new THREE.Vector3(...definition.sunDirection).normalize().multiplyScalar(90)).add(sun.target.position);scene.add(sun,sun.target);
    renderer.shadowMap.type=THREE.PCFShadowMap;
    sun.castShadow=true;sun.shadow.mapSize.setScalar(mobile||qualityController.constrained?2048:4096);Object.assign(sun.shadow.camera,{left:-42,right:42,top:44,bottom:-44,near:1,far:190});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
    progress('Sculpting the path and settling the light…');
    const baseKey=id==='winter'?'snow_02':id==='summer'?'sand_03':id==='autumn'?'brown_mud_leaves_01':'leafy_grass';
    const [base,path,sky,forestMaps]=await Promise.all([maps(baseKey),maps(id==='winter'?'snow_02':id==='summer'?'brown_mud_leaves_01':'rocky_trail'),texture(kit.skies[id].url,true),id==='summer'?maps('leafy_grass'):Promise.resolve(undefined)]);check();
    sky.mapping=THREE.EquirectangularReflectionMapping;sky.wrapS=THREE.RepeatWrapping;sky.wrapT=THREE.ClampToEdgeWrapping;scene.background=sky;scene.backgroundRotation.y=id==='summer'||id==='winter'?2.6:2.4;scene.environmentRotation.y=scene.backgroundRotation.y;
    scene.backgroundIntensity=id==='winter'?.78:1;
    const pmrem=new THREE.PMREMGenerator(renderer);try{const env=pmrem.fromEquirectangular(sky);targets.push(env);scene.environment=env.texture;}finally{pmrem.dispose();}
    scene.environmentIntensity=id==='winter'?.48:id==='spring'?.8:.7;
    const summerSurfaces=id==='summer'?await loadSummerSurfaces(texture):undefined;check();
    terrain=createTerrain(id,base,path,mobile,forestMaps,summerSurfaces?.gravel);scene.add(terrain.group);
    const grassSource=id!=='winter'?await model(kit.models.grass.variants[2].lods.near.url):undefined;
    cover=createGroundCover(id,layout,mobile,grassSource,groundMotion);cover.group.userData.skipOceanReflection=true;scene.add(cover.group);
    if(id==='spring'){meadow=createMeadowDetail(layout,mobile,groundMotion);scene.add(meadow.group);}
    const propKeys=[...new Set((id==='spring'?['basket','picnic-basket','apple','plate','thermos','rock']:id==='summer'?['ball','thermos','shell','rock','coastal-shrub','coral','beach-chair','umbrella']:id==='winter'?['campfire','log','lantern','camp-thermos','bench','rock']:['bench','rock','apple','thermos']).concat(['boulder','bench','log']))];
    const propModels:Record<string,THREE.Object3D>={};
    await Promise.all(propKeys.map(async key=>{
      const entry=kit.models[key==='boulder'?(id==='summer'?'coastal-rock':'woodland-rock'):key==='rock'?'loose-rock':key];if(!entry)throw new Error(`The selected ${key} asset is not available.`);propModels[key]=await model(entry.variants[0].lods[(id==='summer'||mobile)&&(key==='boulder'||key==='rock')?'mid':'near'].url);
    }));
    const trees:ModelPart[][][]=[];
    const blossomAssets=id==='spring'?await preloadVoidAssets():null;
    if(blossomAssets){for(const lods of blossomAssets.trees)for(const parts of lods)for(const part of parts)for(const t of [part.material.map,part.material.normalMap,part.material.roughnessMap])if(t)shared.add(t);}
    {
      for(const variant of (id==='summer'?[...kit.models.palm.variants,...kit.models.maple.variants]:kit.models[treeKey].variants)){
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
        {
          // Anchor crown-centred imports at the actual root, so trunks, body
          // collisions and the small plants at their feet share one location.
          const bark=lods[0].filter(p=>!/foliage|leaf|leav|twig|needle|frond/i.test(p.name)),root=new THREE.Vector3();let samples=0,minY=Infinity;
          bark.forEach(p=>{p.geometry.computeBoundingBox();minY=Math.min(minY,p.geometry.boundingBox!.min.y);});
          bark.forEach(p=>{const a=p.geometry.attributes.position;for(let i=0;i<a.count;i++)if(a.getY(i)<minY+.16){root.x+=a.getX(i);root.z+=a.getZ(i);samples++;}});
          if(samples){root.divideScalar(samples);lods.flat().forEach(p=>{p.geometry.translate(-root.x,-minY,-root.z);p.geometry.computeBoundingSphere();});}
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
      if(!foliage){m.transparent=false;m.alphaTest=0;m.depthWrite=true;m.side=THREE.DoubleSide;if(id==='winter')m.normalScale.set(.55,.55);}
      m.onBeforeCompile=s=>{s.uniforms.seasonWind=wind;s.vertexShader='uniform float seasonWind;\n'+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat h=clamp(position.y/${Math.max(heights[0],1).toFixed(4)},0.,1.);float phase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.23;transformed.x+=sin(seasonWind*.7+position.y*.55+phase)*h*h*${id==='summer'?'.075':'.035'};`);
        if(foliage&&id==='winter'){
          s.vertexShader='varying vec3 boughNormal;varying vec3 boughPosition;\n'+s.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nboughNormal=normalize(mat3(instanceMatrix)*objectNormal);boughPosition=position;');
          s.fragmentShader='varying vec3 boughNormal;varying vec3 boughPosition;\n'+s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat snowCover=smoothstep(.12,.68,boughNormal.y)*(.58+.17*sin(boughPosition.x*8.+boughPosition.z*6.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.67,.73,.81),snowCover);');
        }
        if(foliage&&id==='autumn')s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat leafValue=clamp(dot(diffuseColor.rgb,vec3(.4,.4,.2))*2.8,.13,.7);float gold=.65;\n#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)\ngold=clamp(vColor.g/max(.05,vColor.r)*1.7-.25,0.,1.);\n#endif\ndiffuseColor.rgb=leafValue*mix(vec3(1.25,.17,.018),vec3(1.35,.83,.055),gold);');
        if(foliage&&id==='spring')s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat petalLight=dot(diffuseColor.rgb,vec3(.25,.55,.2));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(petalLight*1.48,petalLight*.42,petalLight*.86),.42);');
        if(foliage&&id==='summer')s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat leafLight=dot(diffuseColor.rgb,vec3(.25,.55,.2));diffuseColor.rgb=mix(diffuseColor.rgb,leafLight*vec3(.58,1.04,.34),.68);');
      };
      ownedMaterials.push(m);materialCache.set(source,m);return m;
    };
    trees.forEach((lods,variant)=>lods.forEach((parts,level)=>{
      const meshes=parts.map(part=>{const mesh=new THREE.InstancedMesh(part.geometry,daylight(part.material,part.name),layout.trees.length);mesh.count=0;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.name=`${treeKey} ${variant} LOD ${level}`;scene.add(mesh);return mesh;});batches.push({variant,level,meshes});
    }));
    props=createSeasonProps(id,layout,propModels,mobile,id==='winter'?await maps('granite_tile_03'):undefined,grassSource,reduced);scene.add(props.group);
    if(id==='summer'&&grassSource){summerForest=createSummerForest(layout,grassSource,propModels['coastal-shrub'],await texture('/seasons/kit/textures/waternormals.jpg',false),mobile);summerForest.group.userData.skipOceanReflection=true;scene.add(summerForest.group);}
    progress('Placing the locked book and its brass key…');
    const [bookModel,chapterCover,cedar,cloth,paper]=await Promise.all([model('/manga/book-v3.glb'),texture(seasonBook(id).cover,true),texture('/materials/cedar.webp',true),texture('/materials/binding-cloth.webp',true),texture('/materials/paper-stock.webp',true)]);check();
    let relicStorage:Storage|undefined;try{relicStorage=window.localStorage;}catch{}
    const stoneMesh=propModels.rock.getObjectByProperty('isMesh',true) as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
    const keyStone:ModelPart={name:'Weathered scanned stone',geometry:stoneMesh.geometry,material:stoneMesh.material};
    if(id==='spring'){
      const chapter=process.env.NODE_ENV!=='production'?preview?.springChapter:undefined;
      spring=createSpringTreasureState(chapter?createSpringPreviewStorage(chapter):relicStorage);
      if(chapter==='river')Object.assign(travel.state,{x:16.2,z:-12.3,y:groundHeight('spring',16.2,-12.3)+1.63,yaw:-Math.PI/2,pitch:-.32});
      progress('Setting out the notes and keepsakes…');
      const assets:Record<string,string>={'forest-tree':kit.models.maple.variants[0].lods.mid.url,'forest-tree-far':kit.models.maple.variants[0].lods.far.url,'forest-tree-2':kit.models.maple.variants[1].lods.mid.url,'forest-tree-2-far':kit.models.maple.variants[1].lods.far.url,'palm':kit.models.palm.variants[0].lods.mid.url,'palm-far':kit.models.palm.variants[0].lods.far.url,'river-rock':kit.models['woodland-rock'].variants[0].lods.far.url,'river-pebble':kit.models['loose-rock'].variants[0].lods.far.url};
      Object.assign(assets,SPRING_ROADSIDE_MODELS,{'forest-tree-near':kit.models.maple.variants[0].lods.near.url,'forest-tree-2-near':kit.models.maple.variants[1].lods.near.url,'palm-near':kit.models.palm.variants[0].lods.near.url,'mushroom-toy':'/seasons/kit/spring-personal/mushroom-toy.glb',candle:'/seasons/kit/spring-personal/candle.glb',glasses:'/seasons/kit/spring-personal/glasses.glb',dumplings:SPRING_DUMPLINGS_MODEL,suitcase:SPRING_TRAIN_CASE_MODEL});
      const [imported,mud,rock,water,character]=await Promise.all([Promise.all(Object.entries(assets).map(async([key,url])=>[key,await model(url)] as const)),maps('brown_mud_leaves_01'),maps('rocky_trail'),texture('/seasons/kit/textures/waternormals.jpg',false),texture('/seasons/kit/spring-character/shyamu-poses.webp',true)]);check();
      try{await document.fonts.load('24px "Spring Hand"');}catch{/* Paper remains legible with the cursive fallback. */}
      const springModels:Record<string,THREE.Object3D>={...propModels,...Object.fromEntries(imported),...(grassSource?{grass:grassSource}:{})};
      springWorld=createSpringTreasureWorld({models:springModels,materials:{wood:cedar,cloth,paper},height:(x,z)=>groundHeight('spring',x,z),mobile,reduced,character,forestMaps:{mud,rock,water}});
      spring.setGuard((action,value)=>{
        if(['read-train-note','wash-hands','open-train-case','turn-train-wheel','unlock-train-case','take-treasure-key','read-train-letter'].includes(action))return !springWorld?.inside&&!springBus?.group.visible&&!!springTrainQuest?.canAct(action,camera);
        if(action==='put-shovel')return !springWorld?.inside&&!springBus?.group.visible;
        if(['read-dumpling-note','take-dumplings','return-dumplings','take-shovel','put-shovel','dig-treasure','open-treasure','take-spring-book','focus-candle'].includes(action))return !springWorld?.inside&&!springBus?.group.visible&&!!springFinale?.canAct(action,camera);
        if(action==='read-bridge-note'&&spring!.state.lakeNoteRead||action==='read-return-letter'&&spring!.state.returnLetterRead)return true;
        if(['read-bridge-note','read-return-letter','take-pill'].includes(action))return !springWorld?.inside&&!springBus?.group.visible&&!!springWorld?.lakeQuest.nearNote(camera);
        if(action==='collect-paper')return !springWorld?.inside&&!springBus?.group.visible&&!!springWorld?.lakeQuest.canPick(value,camera);
        if(action==='sit-bench')return !springWorld?.inside&&!springBus?.group.visible&&!!springWorld?.lakeQuest.nearBench(camera);
        if(action==='sit-bus')return !!springBus?.group.visible&&camera.position.distanceTo(springBus.aislePosition)<1.8;
        if(action==='pickup-dropped')return !!springDrops?.canPick(value,camera,currentSpringWorld());
        if(action==='drop-inventory'){const v=value as {item:SpringCarryItem;placement:SpringDroppedItem},p=springDropPlacement(v?.item);return !!p&&!!v?.placement&&p.world===v.placement.world&&Math.hypot(p.x-v.placement.x,p.y-v.placement.y,p.z-v.placement.z)<.05;}
        if(action==='read-journey-note'||action==='take-compass'||action==='take-glasses')return !!springBus?.group.visible&&!!springClues?.near(camera);
        if(['return-held','put-basket'].includes(action))return !!springWorld?.nearTable(camera);
        if(action==='pick-stone')return !!springWorld?.inside&&!!springWorld.adavi.canPick(value,camera);
        if(action==='aim-stone'||action==='reveal-bag')return !!springWorld?.inside;
        if(action==='take-bag')return !!springWorld&&springWorld.backpack.ready&&springWorld.backpack.near(camera,spring!.state,springWorld.inside?'adavi':'spring');
        if(action==='put-bag'){const p=springWorld?.bagDrop(camera),v=value as {world?:string;x?:number;z?:number};return !!p&&v?.world===p.world&&typeof v.x==='number'&&typeof v.z==='number'&&Math.hypot(v.x-p.x,v.z-p.z)<.05;}
        if(action==='finish-throw'){const result=springWorld?.adavi.result,v=value as {success?:boolean;skips?:number;distance?:number};return !!springWorld?.inside&&springWorld.adavi.readyToFinish&&!!result&&v?.success===result.success&&v?.skips===result.skips&&v?.distance===result.distance;}
        return true;
      });
      scene.add(springWorld.group);
      const [busSky,asphalt,asphaltNormal,asphaltRoughness]=await Promise.all([texture('/seasons/kit/spring-bus/sunny-sky.webp',true),texture('/seasons/kit/spring-bus/asphalt-color.jpg',true),texture('/seasons/kit/spring-bus/asphalt-normal.jpg',false),texture('/seasons/kit/spring-bus/asphalt-roughness.jpg',false)]);check();
      const detailKeys=['metal','plaster','roof'].flatMap(prefix=>['color','normal','roughness'].map(kind=>prefix+'-'+kind));
      const roadsideKeys=['masonry','laterite'].flatMap(prefix=>['color','normal','roughness'].map(kind=>prefix+'-'+kind));
      const details=Object.fromEntries(await Promise.all([...detailKeys.map(async key=>[key,await texture('/seasons/kit/spring-bus/'+key+'.jpg',key.endsWith('color'))]),...roadsideKeys.map(async key=>[key,await texture('/seasons/kit/spring-roadside/'+key+'.webp',key.endsWith('color'))]) ]));check();
      const hdrResponse=await fetch('/seasons/kit/spring-bus/sunny-sky-1k.hdr',{signal});if(!hdrResponse.ok)throw new Error('The sunny bus lighting could not load.');
      const hdrData=new HDRLoader().parse(await hdrResponse.arrayBuffer()),hdrTexture=new THREE.DataTexture(hdrData.data,hdrData.width,hdrData.height,hdrData.format,hdrData.type);hdrTexture.colorSpace=THREE.LinearSRGBColorSpace;hdrTexture.mapping=THREE.EquirectangularReflectionMapping;hdrTexture.needsUpdate=true;textures.push(hdrTexture);
      const busPmrem=new THREE.PMREMGenerator(renderer);try{const environment=busPmrem.fromEquirectangular(hdrTexture);targets.push(environment);busEnvironment=environment.texture;}finally{busPmrem.dispose();}
      springBus=createSpringKsrtcBus(mobile?{...springModels,palm:springModels['palm-far'],'forest-tree':springModels['forest-tree-far']}:springModels,{sky:busSky,asphalt,asphaltNormal,asphaltRoughness,ground:base,details});springBus.group.visible=false;scene.add(springBus.group);
      springClues=createSpringJourneyClues(springBus.cabin,springBus.seatPropPosition,springModels.glasses);scene.add(springClues.held);
      springDrops=createSpringDroppedItems(springModels);scene.add(springDrops.group);
      progress('Preparing the north railway and its sleeper coach…');
      springTrain=createSpringNorthTrain(await model(SPRING_TRAIN_MODEL),(x,z)=>groundHeight('spring',x,z),mobile);check();scene.add(springTrain.group);
      springTrainQuest=createSpringTrainQuest(springTrain,springModels.suitcase,spring);scene.add(springTrainQuest.group);
      springDiamond=createSpringDiamondKey();scene.add(springDiamond.group);
      walking.setSurface(springTrain.walkingHeight,true,springTrain.stepAllowance);
      if(chapter==='rail'){const p=springTrain.entrancePosition;Object.assign(travel.state,{x:p.x,y:p.y,z:p.z,yaw:Math.PI/2,pitch:-.12});}
      springSky=createSpringJourneySky();scene.add(springSky.mesh);
      springRain=createSpringRain(mobile,[terrain.group,props.group,springWorld.group],{trees:layout.trees,supports:[...props.group.children]});scene.add(springRain.group);
      springRainAudio=createSpringRainAudio();
    }
    if(summerMovement){
      summer=createSummerState(relicStorage);
      progress('Preparing the boat, reef and the day ahead…');
      Object.assign(propModels,await loadSummerImportedTemplates(model));check();
      summerWorld=createSummerWorld({getState:()=>summer!.state,boatPose:()=>summerMovement.boat.pose,camera,compact:mobile||qualityController.constrained,templates:propModels,woodMap:cedar,clothMap:cloth,surfaces:summerSurfaces});scene.add(summerWorld.group);
      const routeNames:Record<string,SummerRoutePostId>={U0:'training',U1:'observation',U2:'fork',REST:'rest',U3:'winch',U4:'case'};
      let previous:SummerState|null=null,lastSummerAction='';
      const syncSummer=()=>{
        const q=summer!.state,p=previous;previous=q;
        if(p&&(p.mode!==q.mode&&['boarding','enteringWater','climbing','docking'].includes(q.mode)||p.boatAnchor!==q.boatAnchor&&q.mode==='mooring'))summerTransition={from:camera.position.clone(),elapsed:0,duration:q.preferences.reducedMotion?.3:1.2,next:q.mode==='enteringWater'?'swimming':q.mode==='climbing'?'mooring':null};
        if(!p||p.boatAnchor!==q.boatAnchor)summerMovement.restoreBoat(q.boatAnchor==='mooring'?'dive':'berth');
        if(q.mode==='swimming'||q.mode==='enteringWater'){
          if(!p){summerMovement.swim.recover(routeNames[q.checkpoint]??'training');summerMovement.setMode('swimming');}
          else if(!['swimming','enteringWater'].includes(p.mode)){
            if(q.mode==='enteringWater')summerMovement.setMode('swimming',summerMovement.boat.waterEntryPose());
            else if(summerMovement.mode!=='swimming'){summerMovement.swim.recover(routeNames[q.checkpoint]??'training');summerMovement.setMode('swimming');}
          }
        }else if(['boarding','boating','mooring','climbing','docking','gearing'].includes(q.mode)){
          const helm=q.mode==='boating'||q.mode==='mooring'&&q.engineRunning;
          if(helm){if(summerMovement.mode!=='boating')summerMovement.setMode('boating');}
          else if(summerMovement.mode!=='deck'||p?.boatAnchor!==q.boatAnchor)summerMovement.setMode('deck',summerMovement.boat.deckPose());
          summerMovement.boat.setEngine(q.engineRunning);
          if(q.mode==='boating'&&q.engineRunning&&(p?.mode!=='boating'||!p.engineRunning))summerMovement.boat.release(true);
        }else if(q.mode==='walking'){
          if(!p||summerMovement.mode!=='walking'||p.checkpoint!==q.checkpoint){const pt=lastSummerAction==='disembark'?{x:46,z:-8}:q.checkpoint==='S1'?SUMMER_LANDMARKS.chairs:q.checkpoint==='S0'?SUMMER_LANDMARKS.arrival:SUMMER_LANDMARKS.shelter;summerMovement.setMode('walking',{...pt,yaw:q.checkpoint==='S0'||lastSummerAction==='disembark'?Math.PI/2:-Math.PI/2});}
        }
        if(p&&(p.mode!==q.mode||p.checkpoint!==q.checkpoint))summerTarget=null;
      };
      summer.setGuard((action,value)=>{
        lastSummerAction=action;
        if(action==='moor'&&!summerMovement.boat.canMoor('dive'))return 'Follow OUTER BUOY to DIVE MOORING. Slow down within 8 metres before attaching the line.';
        if(action==='dock'&&!summerMovement.boat.canDockApproach())return 'Follow the channel back to JETTY. Approach the berth from the open-water side, slow down and face along the jetty before docking.';
        if(action==='climb-ladder'&&!summerMovement.boat.canReachLadder(travel.state))return 'Ascend beside the actual stern ladder until you are near the surface, then climb aboard.';
        if(action==='board'&&(summerMovement.mode!=='walking'||Math.hypot(travel.state.x-46.5,travel.state.z+8)>3))return 'Walk to the end of the timber jetty to board the boat.';
        if(action==='remove-gear'&&Math.hypot(travel.state.x-32,travel.state.z+8)>6)return 'Return to the equipment shelter beside the jetty to hang up the wetsuit and scuba assembly.';
        if(action==='disembark'&&(!summerMovement.onBoat||summerMovement.boat.pose.x<46||summerMovement.boat.pose.x>52||Math.abs(summerMovement.boat.pose.z+8)>3))return 'Dock beside the timber jetty before stepping ashore.';
        if(action==='recover'){
          summerTransition=null;const q=summer!.state;if(value==='island')summerMovement.recover('island');else if(value==='post'&&q.boatAnchor==='mooring'&&q.finalGearChecked)summerMovement.recover(routeNames[q.lastUnderwaterPost]??'training');else summerMovement.recover(q.boatAnchor==='mooring'?'boat':'island',q.boatAnchor==='mooring'?'dive':'berth');summerTarget=null;
        }
        if(action==='reset'){summerMovement.restoreBoat('berth');summerMovement.setMode('walking',{...SUMMER_LANDMARKS.arrival,yaw:Math.PI/2});summerTarget=null;}
        return null;
      });
      syncSummer();summerUnsubscribe=summer.subscribe(syncSummer);
    }
    const relicSave=spring?{getItem:()=>JSON.stringify({version:1,keyFound:false,unlocked:false,bookTaken:false}),setItem:()=>{}}:relicStorage;
    relics=createSeasonRelics(id,layout,bookModel,chapterCover,reduced,relicSave,{wood:cedar,cloth,paper,stone:keyStone},!!spring||!!summer);scene.add(relics.group);
    if(spring&&springWorld){
      const chapter=process.env.NODE_ENV!=='production'?preview?.springChapter:undefined;
      // The prepared meal is retained by the world asset cache and shared here.
      const meal=await model(SPRING_DUMPLINGS_MODEL);check();
      springFinale=createSpringFinaleWorld({dumplings:meal},relics.chest,bookModel,chapterCover,cedar,(x,z)=>groundHeight('spring',x,z),reduced);scene.add(springFinale.group);
      springEnding=createSpringEnding(bookModel,chapterCover,(x,z)=>groundHeight('spring',x,z),reduced,mobile);scene.add(springEnding.group);
      if(chapter&&['meal','hunt','dig','light','ending'].includes(chapter)){const p=chapter==='meal'?{x:-2.85,z:-4.8,yaw:Math.PI,pitch:-.65}:chapter==='hunt'?{x:16.2,z:-12.3,yaw:-2.42,pitch:-.35}:{x:13.35,z:-20.4,yaw:1.18,pitch:-.65};Object.assign(travel.state,p,{y:groundHeight('spring',p.x,p.z)+1.63});}
    }
    if(summer||spring)relics.group.visible=false;
    props.solids.push(relics.chest,relics.keyStone,relics.book,relics.key);
    if(id==='autumn'&&!mobile){
      const reflected=createSeasonReflections(trees,layout.trees,heights);scene.add(reflected);
      reflected.traverse(o=>{if(o instanceof THREE.Mesh)ownedMaterials.push(...(Array.isArray(o.material)?o.material:[o.material]));});
      terrain.group.traverse(o=>{if(o instanceof THREE.Mesh&&(o.geometry.boundingSphere?.center.length()??Infinity)<65)o.layers.enable(1);});
      props.group.traverse(o=>o.layers.enable(1));scene.traverse(o=>{if(o instanceof THREE.Light)o.layers.enable(1);});
    }
    particles=createSeasonParticles(id,mobile,reduced);particles.mesh.userData.skipOceanReflection=true;scene.add(particles.mesh);
    if(id==='summer'){ocean=createCoastalOcean(scene,sky,await texture('/seasons/kit/textures/waternormals.jpg',false),base.color,reduced,mobile);underwater=createSummerUnderwater(scene,camera,reduced,mobile);}
    if(id==='autumn')lake=createAutumnLake(scene,sky,await texture('/seasons/kit/textures/waternormals.jpg',false),reduced,mobile,grassSource);
    const sunGlow=createSeasonSun(definition.sunDirection,definition.sun);sunGlow.mesh.visible=id!=='spring';scene.add(sunGlow.mesh);
    const treeMatrices=layout.trees.map(t=>{const transform=new THREE.Object3D();transform.position.set(t.x,t.y,t.z);transform.rotation.set(0,t.yaw,id==='summer'?(random(t.seed)-.5)*.14:0);transform.scale.setScalar(t.height/heights[t.variant%trees.length]);transform.updateMatrix();return transform.matrix;});
    const treeColours=layout.trees.map(t=>new THREE.Color().setHSL(id==='autumn'?.012+random(t.seed)*.13:id==='spring'?.92+random(t.seed)*.065:.25,id==='autumn'?.64:id==='spring'?.34+random(t.seed+1)*.19:.06,id==='autumn'?.64:id==='spring'?.71+random(t.seed+3)*.13:.88));
    const treeOrder=layout.trees.map((_,index)=>index),treeDistances=new Float32Array(layout.trees.length);
    const sphere=new THREE.Sphere(),frustum=new THREE.Frustum(),projection=new THREE.Matrix4();
    let time=0,lastPlacement='',quality=1,lastSnowX=0,lastSnowZ=3.5,foot=0,lastMovingShadow=-1,lastRelicShadow=-1,wasPropMoving=false,wasRelicMoving=false,relicBlocked=false;
    const placeTrees=(all=false)=>{
      const key=`${Math.round(camera.position.x*2)}:${Math.round(camera.position.z*2)}:${Math.round(camera.rotation.y*12)}:${Math.round(camera.rotation.x*12)}:${quality}:${camera.zoom}:${all}`;if(key===lastPlacement)return;lastPlacement=key;
      camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
      batches.forEach(b=>b.meshes.forEach(m=>m.count=0));
      for(let i=0;i<layout.trees.length;i++){const t=layout.trees[i];treeDistances[i]=Math.hypot(t.x-camera.position.x,t.z-camera.position.z);}
      treeOrder.sort((a,b)=>treeDistances[a]-treeDistances[b]);
      for(const index of treeOrder){
        const t=layout.trees[index],d=treeDistances[index];
        if(d>145)continue;
        sphere.center.set(t.x,t.y+t.height*.5,t.z);sphere.radius=t.height*.62;if(!all&&!frustum.intersectsSphere(sphere))continue;
        const variant=t.variant%trees.length;
        // Detailed models follow the visitor through the larger world; distant
        // forest rings stay instanced at their smallest authored mesh budget.
        const level=all?t.lod:Math.max(t.lod===0?0:1,d>(mobile?26:36)?2:d>(mobile?10:18)?1:mobile?1:0);
        const batch=batches[variant*3+level];
        for(const mesh of batch.meshes){const slot=mesh.count++;mesh.setMatrixAt(slot,treeMatrices[index]);if(mesh.material instanceof THREE.MeshStandardMaterial&&/foliage|leaf|leav|twig|needle|frond/i.test(mesh.material.name))mesh.setColorAt(slot,treeColours[index]);}


      }
      batches.flatMap(b=>b.meshes).forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;});
    };
    const outdoorVisibility=new Map<THREE.Object3D,boolean>();
    function enterForest(value:boolean){
      if(!springWorld)return;
      springTarget=null;springWorld.setInterior(value);walking.setSurface(value?springWorld.interiorHeight:springTrain?.walkingHeight??null,!value,value?undefined:springTrain?.stepAllowance);
      const exit=springWorld.exitPosition;
      const entry=springWorld.spawn;Object.assign(travel.state,value?{...entry,y:(springWorld.interiorHeight(entry.x,entry.z)??0)+1.63}:{x:exit.x,z:exit.z,y:groundHeight('spring',exit.x,exit.z)+1.63,yaw:exit.yaw,pitch:-.04});
      if(value){spring?.act('visit-river');spring?.act('enter-adavi');}else spring?.act('exit-adavi');
      window.dispatchEvent(new CustomEvent('spring-portal-passage',{detail:{inside:value}}));
      for(const child of scene.children){if(child===springWorld.group||child instanceof THREE.Light||child===sun!.target)continue;if(value){outdoorVisibility.set(child,child.visible);child.visible=false;}else child.visible=outdoorVisibility.get(child)??child.visible;}
      if(!value)outdoorVisibility.clear();
      scene.fog=value?new THREE.FogExp2(0x9aa99a,.012):spring?.state.dreamReturned?new THREE.FogExp2(0x7b8c8b,.012):new THREE.FogExp2(definition.fog,.0055);
      sun!.visible=!value;
      sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;lastPlacement='';travel.resetInput();
    }
    let previousPortalX=travel.state.x,previousPortalZ=travel.state.z;
    let wakePhase='',wakeElapsed=0,wasTrainLock=false;
    let busEntered=false,wasBenchSeated=false,wasBusSeated=false,weatherDarkened=false;
    function currentSpringWorld():SpringDroppedItem['world']{return busEntered?'bus':springWorld?.inside?'adavi':'spring';}
    function springDropPlacement(item:SpringCarryItem):SpringDroppedItem|null{
      if(!item||!springWorld)return null;const world=currentSpringWorld(),direction=new THREE.Vector3();camera.getWorldDirection(direction);const yaw=Math.atan2(-direction.x,-direction.z);
      if(world==='bus'&&springBus){
        const x=springBus.aislePosition.x,heading=Math.cos(yaw)>=0?1:-1;
        for(const distance of [.95,.6,1.3,1.65])for(const sign of [heading,-heading]){const z=camera.position.z-sign*distance;if(spring?.state.droppedItems.some(p=>p.world===world&&Math.hypot(x-p.x,z-p.z)<.34))continue;if(z< -3.1||z>4.2)continue;const point=new THREE.Vector3(x,.15,z);springBus.constrainPosition(point);if(Math.hypot(point.x-x,point.z-z)>.08)continue;return {item,world,x,y:(springBus.floorHeight(x,z)??.15)+.015,z,yaw};}
        return null;
      }
      for(const distance of [1,.65,.35])for(const turn of [0,.65,-.65,1.3,-1.3,Math.PI]){
        const x=camera.position.x-Math.sin(yaw+turn)*distance,z=camera.position.z-Math.cos(yaw+turn)*distance;
        if(spring?.state.droppedItems.some(p=>p.world===world&&Math.hypot(x-p.x,z-p.z)<.34))continue;
        if(world==='spring'&&(springWorld.doorwayBlocked(x,z)||props?.pickup.blocked(x,z)||springTrain?.blockedAt(x,z)))continue;
        const y=world==='adavi'?springWorld.interiorHeight(x,z):walking.height(x,z);
        if(y===null||world==='adavi'&&adaviGround(x-200,z)<.22)continue;
        return {item,world,x,y:y+.015,z,yaw};
      }return null;
    }
    const springCloudColor=new THREE.Color(0x657779),springNightFog=new THREE.Color(0x101927),springNightSun=new THREE.Color(0x899dc9),springNightAmbient=new THREE.Color(0x71839e),springNightGround=new THREE.Color(0x11191d);
    const busObserver=new THREE.Vector3();
    let benchApproach:{x:number;y:number;z:number}|null=null;
    const busVisibility=new Map<THREE.Object3D,boolean>();
    type SpringAtmosphere={background:THREE.Scene['background'];fog:THREE.Scene['fog'];environment:THREE.Scene['environment'];environmentIntensity:number;backgroundIntensity:number;backgroundRotation:number};
    let busAtmosphere:SpringAtmosphere|null=null;
    const savedOutdoorAtmosphere=():SpringAtmosphere|null=>busAtmosphere;
    function updateSpringLocation(){
      if(!spring||!springWorld||!springBus)return;
      const q=spring.state,inBus=q.dreamPhase==='waking'||q.dreamPhase==='bus'||q.dreamPhase==='return-closing';
      if(inBus&&!busEntered){
        busEntered=true;busAtmosphere={background:scene.background,fog:scene.fog,environment:scene.environment,environmentIntensity:scene.environmentIntensity,backgroundIntensity:scene.backgroundIntensity,backgroundRotation:scene.backgroundRotation.y};springWorld.setInterior(false);springBus.group.visible=true;scene.add(springWorld.carried);
        for(const child of scene.children){if(child===springBus.group||child===springWorld.carried)continue;busVisibility.set(child,child.visible);child.visible=false;}
        scene.background=springBus.skyTexture;scene.backgroundRotation.y=1.1;scene.backgroundIntensity=1;scene.fog=new THREE.FogExp2(0xd3e4d6,.002);scene.environment=busEnvironment??null;scene.environmentIntensity=.85;renderer.shadowMap.needsUpdate=true;
        const p=springBus.seatPosition;Object.assign(travel.state,{x:p.x,y:p.y,z:p.z,yaw:springBus.seatYaw,pitch:-.04});camera.position.copy(p);travel.setSurface((x,z)=>springBus!.floorHeight(x,z));travel.resetInput();wasBusSeated=true;previousPortalX=p.x;previousPortalZ=p.z;
      }
      if(inBus){
        if(wasBusSeated&&!q.busSeated){const p=springBus.aislePosition;Object.assign(travel.state,{x:p.x,y:p.y,z:p.z});camera.position.copy(p);travel.resetInput();}
        if(q.busSeated){const p=springBus.seatPosition;Object.assign(travel.state,{x:p.x,y:p.y,z:p.z});}
        wasBusSeated=q.busSeated;return;
      }
      if(busEntered){
        busEntered=false;springBus.group.visible=false;springWorld.group.add(springWorld.carried);
        for(const [child,visible] of busVisibility)child.visible=visible;busVisibility.clear();
        if(busAtmosphere){scene.background=busAtmosphere.background;scene.fog=busAtmosphere.fog;scene.environment=busAtmosphere.environment;scene.environmentIntensity=busAtmosphere.environmentIntensity;scene.backgroundIntensity=busAtmosphere.backgroundIntensity;scene.backgroundRotation.y=busAtmosphere.backgroundRotation;}
        busAtmosphere=null;walking.setSurface(springTrain?.walkingHeight??null,true,springTrain?.stepAllowance);wasBusSeated=false;wasBenchSeated=true;
        const seat=springWorld.lakeQuest.benchPosition;Object.assign(travel.state,seat);camera.position.set(seat.x,seat.y,seat.z);travel.resetInput();previousPortalX=seat.x;previousPortalZ=seat.z;
      }
      if(q.dreamReturned&&!springWorld.inside&&!weatherDarkened){weatherDarkened=true;scene.background=new THREE.Color(0x657779);scene.backgroundIntensity=.37;scene.environmentIntensity=.40;scene.fog=new THREE.FogExp2(0x7b8c8b,.012);sun!.intensity=definition.sunPower*.20;sun!.color.set(0xc3d8e0);outdoorAmbient.intensity=.95;outdoorAmbient.color.set(0xb9cbd0);outdoorAmbient.groundColor.set(0x56675e);particles!.mesh.visible=false;sunGlow.mesh.visible=false;sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;}
      if(q.benchSeated&&!wasBenchSeated){benchApproach={x:travel.state.x,y:travel.state.y,z:travel.state.z};const seat=springWorld.lakeQuest.benchPosition;Object.assign(travel.state,seat);travel.resetInput();}
      if(q.benchSeated){const seat=springWorld.lakeQuest.benchPosition;travel.state.x=seat.x;travel.state.z=seat.z;travel.state.y=seat.y;}
      if(!q.benchSeated&&wasBenchSeated){if(benchApproach)Object.assign(travel.state,benchApproach);else Object.assign(travel.state,{x:15,z:-17,y:groundHeight('spring',15,-17)+1.63});travel.resetInput();}
      wasBenchSeated=q.benchSeated;
    }
    function update(dt:number,paused:boolean){updateSpringLocation();const springBusy=!!spring&&(springAdaviDialogue(spring.state)||spring.state.bagNoteOpen||springQuestBusy(spring.state)||spring.state.skipPhase!=='exploring');const blocked=relics!.busy||springTarget!==null||summerTarget!==null||springBusy||!!summer&&(paused||!!summerTransition);if(blocked!==relicBlocked){travel.block(blocked);relicBlocked=blocked;}travel.update(paused&&summer?0:dt);if(spring&&(spring.state.benchSeated||spring.state.busSeated))updateSpringLocation();if(!springBusy&&!busEntered&&springWorld?.returnPortalCrossed(previousPortalX,previousPortalZ,travel.state.x,travel.state.z))enterForest(false);else if(!busEntered&&springWorld?.portalCrossed(previousPortalX,previousPortalZ,travel.state.x,travel.state.z))enterForest(true);previousPortalX=travel.state.x;previousPortalZ=travel.state.z;if(!paused&&!reduced)time+=dt;wind.value=reduced?0:time;
      if(id==='winter'&&Math.hypot(travel.state.x-lastSnowX,travel.state.z-lastSnowZ)>.52){const side=foot++%2?1:-1;terrain!.stepSnow(travel.state.x+Math.cos(travel.state.yaw)*.12*side,travel.state.z-Math.sin(travel.state.yaw)*.12*side,travel.state.yaw,time);lastSnowX=travel.state.x;lastSnowZ=travel.state.z;}
      if(busEntered&&springBus&&!spring?.state.busSeated){busObserver.set(travel.state.x,travel.state.y,travel.state.z);springBus.constrainPosition(busObserver);travel.state.x=busObserver.x;travel.state.y=busObserver.y;travel.state.z=busObserver.z;}
      camera.position.set(travel.state.x,dt===0?travel.state.y:THREE.MathUtils.lerp(camera.position.y,travel.state.y,1-Math.exp(-dt*16)),travel.state.z);camera.rotation.set(travel.state.pitch,travel.state.yaw,0,'YXZ');
      if(wasTrainLock&&!spring?.state.trainCaseOpen)camera.position.y=travel.state.y;
      if(spring)springTrainQuest?.focusLock(camera,spring.state);wasTrainLock=!!spring?.state.trainCaseOpen;
      const phase=spring?.state.dreamPhase??'';
      if(phase!==wakePhase){wakePhase=phase;wakeElapsed=0;}
      if(phase==='waking'||phase==='return-waking'){
        if(!paused)wakeElapsed+=dt;
        const pose=springWakingPose(wakeElapsed,reduced);
        camera.rotation.x+=pose.pitch;camera.rotation.y+=pose.yaw;camera.rotation.z=pose.roll;
      }
      if(!springWorld?.inside&&!busEntered){placeTrees();terrain!.update(camera,time);cover!.update(time,camera,quality);meadow?.update(time,quality);groundMotion.update(time,camera,!paused&&!reduced&&travel.state.velocity>.15);sunGlow.update(camera);particles!.update(time,camera,quality);props!.update(time,dt,camera);ocean?.update(time,camera,travel.state.velocity>.25&&!paused);lake?.update(time,camera,!paused&&travel.state.velocity>.15);}
      if(spring){
        const q=spring.state;if(!busEntered)springWorld?.update(time,paused?0:dt,q,camera,spring);else springWorld?.updateCarried(time,paused?0:dt,q,camera);if(springBus?.update(paused?0:dt,reduced?0:time,camera))renderer.shadowMap.needsUpdate=true;const outside=!busEntered&&!springWorld?.inside,weather=springNorthWeather(camera.position.x,camera.position.z),rainActive=outside&&q.dreamReturned,clearing=springWeatherClear(q),rainAmount=weather.rain*(1-clearing);
        springDrops?.update(paused?0:dt,camera,q,currentSpringWorld());springRain?.update(time,camera,rainActive,rainAmount);springClues?.update(paused?0:dt,camera,q,busEntered);if(springTrain?.update(time,paused?0:dt,camera,weather.night)){sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;}
        if(springTrainQuest?.update(time,paused?0:dt,camera,q)){sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;}if(springTrainQuest)springTrainQuest.group.visible=outside&&q.dreamReturned;
        springFinale?.update(time,paused?0:dt,camera,q,spring,outside,springWorld?.backpack.candleFlamePosition(),springClues?.glassesFocusPosition());
        springEnding?.update(paused?0:dt,q,camera,travel.state,spring);
        const endingActive=['walking','sitting','opening','reading'].includes(q.endingPhase);
        if(springWorld)springWorld.carried.visible=!endingActive&&!q.trainCaseOpen;
        if(springClues&&(endingActive||q.trainCaseOpen))springClues.held.visible=false;
        if(springFinale&&endingActive)springFinale.group.visible=false;
        if(springDiamond){springDiamond.group.visible=outside&&q.hands.includes('treasure-key')&&q.endingPhase==='none'&&!q.trainCaseOpen;if(springDiamond.group.visible){const key=springDiamond.group;key.position.copy(camera.position);key.quaternion.copy(camera.quaternion);key.translateX(q.hands[0]==='treasure-key'?-.28:.28);key.translateY(-.20);key.translateZ(-.68);key.scale.setScalar(.85);springDiamond.update(time);}}
        springRainAudio?.update(rainActive?rainAmount:0,springTrain?.inside(camera.position.x,camera.position.z)??false,paused||!outside);
          if(outside)springWorld?.river.update(time,q.dreamReturned?rainAmount:0,q.dreamReturned?weather.night:0);
        springSky?.update(camera,reduced?0:time,weather.night,rainActive,clearing);
        if(rainActive){scene.background=springCloudColor;scene.environmentIntensity=THREE.MathUtils.lerp(.40,.055,weather.night);scene.fog??=new THREE.FogExp2(0x7b8c8b,.012);scene.fog.color.set(0x7b8c8b).lerp(springNightFog,weather.night);if(scene.fog instanceof THREE.FogExp2)scene.fog.density=THREE.MathUtils.lerp(.012,.014,weather.night);sun!.intensity=definition.sunPower*THREE.MathUtils.lerp(.20,.025,weather.night);sun!.color.set(0xc3d8e0).lerp(springNightSun,weather.night);outdoorAmbient.intensity=THREE.MathUtils.lerp(.95,.20,weather.night);outdoorAmbient.color.set(0xb9cbd0).lerp(springNightAmbient,weather.night);outdoorAmbient.groundColor.set(0x56675e).lerp(springNightGround,weather.night);}
        if(rainActive&&clearing>0){const daylight=clearing*(1-weather.night);scene.environmentIntensity=THREE.MathUtils.lerp(scene.environmentIntensity,.8,daylight);scene.fog!.color.lerp(new THREE.Color(definition.fog),daylight);if(scene.fog instanceof THREE.FogExp2)scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,.0055,daylight);sun!.intensity=THREE.MathUtils.lerp(sun!.intensity,definition.sunPower,daylight);sun!.color.lerp(new THREE.Color(definition.sun),daylight);outdoorAmbient.intensity=THREE.MathUtils.lerp(outdoorAmbient.intensity,1.25,daylight);outdoorAmbient.color.lerp(new THREE.Color(definition.ambient),daylight);outdoorAmbient.groundColor.lerp(new THREE.Color(definition.ground),daylight);particles!.mesh.visible=daylight>.6;}
        relics!.group.visible=false;
        if(!busEntered&&!springWorld?.inside&&q.bagTaken&&!q.bridgeVisited&&springWorld?.lakeQuest.nearNote(camera))spring.act('visit-bridge');
        if(q!==lastSpringState){if(springShadowChanged(lastSpringState,q)||q.treasureDug!==lastSpringState?.treasureDug||q.treasureOpen!==lastSpringState?.treasureOpen||q.shovelTaken!==lastSpringState?.shovelTaken){if(!springWorld?.inside)sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;}lastSpringState=q;}
      }
      if(summer){
        summer.tickAir(dt,travel.state.y<-.22,paused||summerTarget!==null||summerTransition!==null||document.hidden);
        if(camera.position.y>-.22)summerForest?.update(summer.state.preferences.reducedMotion?0:time,camera);
        if(summerMovement?.mode==='swimming'&&summer.state.mode==='swimming'&&!paused&&!summerTarget&&!summerTransition){
          const nearby=Object.entries(SUMMER_ROUTE_POSTS).map(([post,p])=>({post:post as SummerRoutePostId,distance:Math.hypot(travel.state.x-p.x,travel.state.y-p.y,travel.state.z-p.z)})).sort((a,b)=>a.distance-b.distance)[0];
          const checkpoint=nearby&&Object.entries(routeNamesForPosts).find(([,post])=>post===nearby.post)?.[0];
          if(nearby?.distance<3.5&&checkpoint&&summer.state.checkpoint!==checkpoint&&summerMovement.swim.setCheckpoint(nearby.post))summer.act('checkpoint',checkpoint);
        }
        if(summerTransition){const transition=summerTransition;if(!paused)transition.elapsed+=dt;const u=Math.min(1,transition.elapsed/transition.duration),ease=u*u*(3-2*u);camera.position.lerpVectors(transition.from,new THREE.Vector3(travel.state.x,travel.state.y,travel.state.z),ease);if(u===1){summerTransition=null;if(transition.next)summer.act('set-mode',transition.next);}}if(lastSummerRevision!==summer.revision){if(lastSummerRevision>=0&&lastSummerAir===summer.state.airSeconds)summerAudio?.cue();if(lastSummerAir===summer.state.airSeconds){sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;}lastSummerRevision=summer.revision;lastSummerAir=summer.state.airSeconds;}summerAudio?.update(time,underwater?.underwater??false,summer.state.engineRunning,travel.state.velocity,paused,summer.state.preferences.sound);underwater?.update(summer.state.preferences.reducedMotion?0:time,summer.state.gearOnboard);summerWorld?.setUnderwater(underwater?.underwater??false);summerWorld?.update(time,paused||summerTarget?0:dt);ocean?.setQuality(underwater?.underwater?0:quality);if(ocean)ocean.mesh.visible=!(underwater?.underwater??false);if(summerForest)summerForest.group.visible=!(underwater?.underwater??false);if(cover)cover.group.visible=!(underwater?.underwater??false);batches.forEach(batch=>batch.meshes.forEach(mesh=>mesh.visible=!(underwater?.underwater??false)));}
      if(!spring){relics!.setHandsBusy(!!props!.pickup.held);relics!.update(dt,time,camera);}
      if(springBookRequested&&!props!.pickup.moving&&relics!.status(camera).hasBook&&!relics!.busy){springBookRequested=false;relics!.read();}
      if(!springWorld?.inside&&(props!.moving||wasPropMoving)&&performance.now()/1000-lastMovingShadow>.12){sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;lastMovingShadow=performance.now()/1000;wasPropMoving=props!.moving;}
      const relicMoving=relics!.movingShadow;if(!springWorld?.inside&&(relicMoving||wasRelicMoving)&&performance.now()/1000-lastRelicShadow>.12){sun!.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;lastRelicShadow=performance.now()/1000;wasRelicMoving=relicMoving;}
    }
    update(0,false);progress('Preparing shadows and warming the landscape…');
    const oldShadow=renderer.shadowMap.enabled,oldAuto=renderer.shadowMap.autoUpdate,oldTarget=renderer.getRenderTarget();
    const warmTarget=new THREE.WebGLRenderTarget(32,32);renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    try{
      // Warm every LOD variant and the complete static shadow field once.
      relics.warm(true);
      const laterProps=[springTrainQuest?.group,springFinale?.group,springClues?.held,springDiamond?.group,springWorld?.carried].filter((root):root is THREE.Group=>!!root);
      const warmOutdoor=async()=>{placeTrees(true);await withSeasonPropsVisible(laterProps,async()=>{await compileVisibleSeason(renderer,scene,camera);check();renderer.shadowMap.needsUpdate=true;sun!.shadow.needsUpdate=true;renderer.setRenderTarget(warmTarget);renderer.render(scene,camera);check();});};
      const outdoorAtmosphere=savedOutdoorAtmosphere();
      if(busEntered&&outdoorAtmosphere){
        // A save reopened inside the dream still prepares its rainy return world.
        const position=camera.position.clone(),rotation=camera.quaternion.clone(),fog=scene.fog,background=scene.background,environment=scene.environment,intensity=scene.environmentIntensity,backgroundIntensity=scene.backgroundIntensity,rotationY=scene.backgroundRotation.y,visibility=new Map(scene.children.map(child=>[child,child.visible]));
        try{
          busVisibility.forEach((visible,child)=>child.visible=visible);springBus!.group.visible=false;
          scene.background=outdoorAtmosphere.background;scene.fog=outdoorAtmosphere.fog;scene.environment=outdoorAtmosphere.environment;scene.environmentIntensity=outdoorAtmosphere.environmentIntensity;scene.backgroundIntensity=outdoorAtmosphere.backgroundIntensity;scene.backgroundRotation.y=outdoorAtmosphere.backgroundRotation;
          camera.position.set(15,groundHeight('spring',15,-17)+1.63,-17);camera.rotation.set(-.12,-Math.PI/2,0,'YXZ');camera.updateMatrixWorld(true);await warmOutdoor();
        }finally{
          visibility.forEach((visible,child)=>child.visible=visible);camera.position.copy(position);camera.quaternion.copy(rotation);camera.updateMatrixWorld(true);scene.fog=fog;scene.background=background;scene.environment=environment;scene.environmentIntensity=intensity;scene.backgroundIntensity=backgroundIntensity;scene.backgroundRotation.y=rotationY;
        }
      }else await warmOutdoor();
      if(springWorld){
        // Compile the forest, its static shadows and reflection before gameplay starts.
        const savedCamera=camera.position.clone(),savedRotation=camera.quaternion.clone(),savedFog=scene.fog,visibility=new Map(scene.children.map(child=>[child,child.visible]));
        try{
          springWorld.setInterior(true);for(const child of scene.children)child.visible=child===springWorld.group;
          const entry=springWorld.spawn;camera.position.set(entry.x,(springWorld.interiorHeight(entry.x,entry.z)??0)+1.63,entry.z);camera.rotation.set(entry.pitch,entry.yaw,0,'YXZ');camera.updateMatrixWorld(true);scene.fog=new THREE.FogExp2(0x9aa99a,.012);
          springWorld.update(time,0,spring!.state,camera);await compileVisibleSeason(renderer,scene,camera);check();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);check();
        }finally{springWorld.setInterior(false);visibility.forEach((visible,child)=>child.visible=visible);camera.position.copy(savedCamera);camera.quaternion.copy(savedRotation);camera.updateMatrixWorld(true);scene.fog=savedFog;}
      }
      if(springBus){
        // The bus has its own lights, sky and HDR environment. Prepare that exact
        // configuration behind the entry curtain, before the first wake-up.
        const savedCamera=camera.position.clone(),savedRotation=camera.quaternion.clone(),savedFog=scene.fog,savedBackground=scene.background,savedEnvironment=scene.environment,savedIntensity=scene.environmentIntensity,savedBackgroundIntensity=scene.backgroundIntensity,savedRotationY=scene.backgroundRotation.y;
        const visibility=new Map(scene.children.map(child=>[child,child.visible]));
        try{
          for(const child of scene.children)child.visible=child===springBus.group||child===springClues?.held;
          scene.background=springBus.skyTexture;scene.backgroundRotation.y=1.1;scene.backgroundIntensity=1;scene.fog=new THREE.FogExp2(0xd3e4d6,.002);scene.environment=busEnvironment??null;scene.environmentIntensity=.85;
          camera.position.copy(springBus.seatPosition);camera.rotation.set(-.04,springBus.seatYaw,0,'YXZ');camera.updateMatrixWorld(true);springBus.update(0,0,camera);
          await withSeasonPropsVisible([springBus.group,...(springClues?[springClues.held]:[])],async()=>{await compileVisibleSeason(renderer,scene,camera);check();renderer.shadowMap.needsUpdate=true;renderer.setRenderTarget(warmTarget);renderer.render(scene,camera);check();});
        }finally{
          visibility.forEach((visible,child)=>child.visible=visible);camera.position.copy(savedCamera);camera.quaternion.copy(savedRotation);camera.updateMatrixWorld(true);
          scene.fog=savedFog;scene.background=savedBackground;scene.environment=savedEnvironment;scene.environmentIntensity=savedIntensity;scene.backgroundIntensity=savedBackgroundIntensity;scene.backgroundRotation.y=savedRotationY;
        }
      }
    }finally{relics.warm(false);renderer.setRenderTarget(oldTarget);warmTarget.dispose();renderer.shadowMap.enabled=oldShadow;renderer.shadowMap.autoUpdate=oldAuto;}
    modelDataCache.clear();lastPlacement='';if(process.env.NODE_ENV!=='production'&&preview?.springChapter==='adavi')enterForest(true);update(0,false);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();raycaster.far=7;
    const aim=(x=0,y=0)=>{pointer.set(x,y);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);};
    const extraSpringTarget=()=>{
      if(!spring||busEntered||springWorld?.inside||springQuestBusy(spring.state))return null;
      const train=springTrainQuest?.target(camera,raycaster,spring.state);
      return train?{...train,payload:train.value}:springFinale?.target(camera,raycaster,spring.state)??null;
    };
    const pickupObject=()=>{aim();const extra=extraSpringTarget();if(extra&&spring){spring.act(extra.action,extra.payload);return null;}if(spring&&!springQuestBusy(spring.state)){const dropped=springDrops?.target(camera,raycaster,currentSpringWorld());if(dropped){spring.act(dropped.action,dropped.payload);return null;}}if(spring&&busEntered){const clue=springClues?.target(camera,raycaster,spring.state);if(clue)spring.act(clue.action);return null;}if(spring&&springWorld){if(spring.state.paperHeld){spring.act('put-paper');return null;}const target=springWorld.target(camera,raycaster);if(!target)return null;if('action' in target)spring.act(target.action,target.payload);else spring.act(target.id==='letter'?'read-letter':'take-item',target.id);return null;}if(springWorld?.inside||relics!.busy||springTarget||summerTarget||summerMovement&&summerMovement.mode!=='walking'||props!.pickup.held||props!.pickup.settling)return null;const prop=props!.pickup.pickup(camera,raycaster);if(prop)return prop;if(spring||summer)return null;const hint=relics!.hint(camera,raycaster);return /^(Pick|Take)/.test(hint)?relics!.interact(camera,raycaster):null;};
    const dropObject=()=>{if(spring){const command=springPutAwayCommand(spring.state,!!springWorld?.nearTable(camera));spring.act(command.action,command.action==='put-bag'?springWorld?.bagDrop(camera):command.value);travel.resetInput();return null;}if(relics!.busy||springTarget||summerTarget||props!.pickup.settling)return null;return props!.pickup.held?props!.pickup.drop(camera):spring||summer?null:relics!.drop(camera,(object,view)=>props!.pickup.placement(object,view));};
    const manifest:SeasonManifest={version:2,id,revision:'season-realism-2026-10-19',model:KIT,bytes,triangles:0,navigation:layout.navigation,bounds:id==='summer'?{min:[SUMMER_BOUNDS.minX,SUMMER_BOUNDS.minY,SUMMER_BOUNDS.minZ],max:[SUMMER_BOUNDS.maxX,SUMMER_BOUNDS.maxY,SUMMER_BOUNDS.maxZ]}:{min:[-112,-5,-112],max:[112,35,112]},assets:propKeys.concat(treeKey)};
    return {id,scene,camera,travel,manifest,mobile,exposure:definition.exposure,update,dispose,qualityController,spring,summer,summerMovement,
      get summerTarget(){return summerTarget;},
      closeSummer(){summerTarget=null;travel.resetInput();},
      openSummer(panel:SummerPanel){if(!summer)return;summerTarget=panel;travel.resetInput();},
      get springTarget(){return springTarget;},
      closeSpring(){springTarget=null;travel.resetInput();},
      openSatchel(){},
      springNearTable(){return !!springWorld?.nearTable(camera);},
      springCommand(action:string,value?:unknown):string|null{
        if(!spring)return null;if(action==='interact')return this.interact();travel.resetInput();
        if(action==='put-away'){const command=springPutAwayCommand(spring.state,!!springWorld?.nearTable(camera));action=command.action;value=command.value;}
        if(action==='drop-inventory'){
          const v=value as {slot:number;item:SpringCarryItem};if(!v)return null;
          if(springItemHands(v.item)===2||v.item==='river-stone'||v.item==='dumpling-tray'||v.item==='chopsticks'){
            if(v.slot<10||spring.state.hands[v.slot-10]!==v.item)return null;
            const command=springPutAwayCommand({...spring.state,activeHand:(v.slot-10) as 0|1},!!springWorld?.nearTable(camera));action=command.action;value=command.value;
          }else{const placement=springDropPlacement(v.item);if(!placement){spring.act('inventory-notice','Move to a clear spot to set this down.');return null;}value={...v,placement};}
        }
        spring.act(action,action==='put-bag'?springWorld?.bagDrop(camera):value);return null;
      },
      bookStatus(){aim();if(spring&&springWorld?.inside){const q=spring.state,target=springWorld.target(camera,raycaster),door=springWorld.portalHint(camera),stone=!!q.selectedStone,busy=springAdaviDialogue(q)||q.bagNoteOpen||q.skipPhase!=='exploring';return {...relics!.status(camera),hasKey:q.keyTaken,hasBook:false,stage:'resting' as const,busy,heldObject:stone?'River stone':undefined,canPick:!busy&&!!target,canDrop:!busy&&stone,canInteract:!busy&&!!(target||door||stone),action:target?.label||door||''};}if(spring){const quest=extraSpringTarget()??springWorld?.target(camera,raycaster),door=springWorld?.portalHint(camera),held=springHeldItem(spring.state);return {...relics!.status(camera),hasKey:spring.state.keyTaken,hasBook:spring.state.springBookTaken,stage:'resting' as const,busy:springQuestBusy(spring.state),heldObject:held?SPRING_FOOD_NAMES[held]:undefined,canPick:!!quest,canDrop:!!held||!!spring.state.paperHeld,canInteract:!!door||!!quest||!!held||!!spring.state.paperHeld,action:door||quest?.label||''};}if(summer){const target=summerWorld?.target(camera,raycaster),prop=props!.pickup.status(camera,raycaster);return {...relics!.status(camera),hasKey:false,hasBook:summer.state.bookUnlocked,stage:'resting' as const,busy:summerTarget!==null||summerReader,heldObject:prop.held,canPick:summerMovement?.mode==='walking'&&!prop.held&&prop.action.startsWith('Pick'),canDrop:!!prop.held,canInteract:!!target||summerMovement?.onBoat,action:target?.label||prop.action||''};}const book=relics!.status(camera),prop=props!.pickup.status(camera,raycaster),quest=springWorld?.target(camera,raycaster),hint=spring?springWorld?.portalHint(camera)||quest?.label||'':relics!.hint(camera,raycaster);return {...book,busy:book.busy||springTarget!==null,heldObject:prop.held,canPick:!prop.held&&!prop.settling&&((!spring&&/^(Pick|Take)/.test(hint))||prop.action.startsWith('Pick')),canDrop:!prop.settling&&!!(prop.held||!spring&&(book.hasKey||book.hasBook)),canInteract:!!(springWorld?.portalHint(camera)||quest||!spring&&book.action||props?.interactionHint(raycaster)),action:prop.held?`Carrying ${prop.held} · F to put down`:hint||prop.action||props?.interactionHint(raycaster)||''};},
      pickupObject,dropObject,pickOrDrop(){aim();if(spring)return spring.state.selectedStone||!springWorld?.inside&&(springHeldItem(spring.state)||spring.state.paperHeld)?dropObject():pickupObject();const status=props!.pickup.status(camera,raycaster);return props!.pickup.held?dropObject():status.action.startsWith('Pick')||/^(Pick|Take)/.test(relics!.hint(camera,raycaster))?pickupObject():dropObject();},
      readBook(){if(summer){if(!summer.act('take-book'))return false;if(!seasonBook('summer').available){summerTarget='letter';return false;}summerReader=true;summerTarget=null;travel.resetInput();return true;}if(spring){return spring.act('read-spring-book');}if(props!.pickup.moving)return false;const started=relics!.read();if(started)travel.resetInput();return started;},closeBook(){if(spring){if(spring.state.endingPhase==='reading')spring.act('close-spring-book');else if(spring.state.trainCaseOpen)spring.act('close-train-case');else if(spring.state.trainNoteOpen)spring.act('close-train-note');else if(spring.state.questNoteOpen)spring.act('close-quest-note');else if(spring.state.bagNoteOpen)spring.act('close-bag-note');else if(spring.state.skipPhase==='aiming')spring.act('cancel-aim');else if(spring.state.skipPhase==='result'&&!spring.state.stoneChallengeComplete)spring.act('retry-stone');travel.resetInput();return;}summerReader=false;springBookRequested=false;relics!.close();travel.resetInput();},
      get bookBusy(){return relics!.busy||springTarget!==null||summerTarget!==null||summerReader||!!spring&&(springAdaviDialogue(spring.state)||springQuestBusy(spring.state)||spring.state.bagNoteOpen&&!spring.state.bagHeld||spring.state.skipPhase!=='exploring');},get readerReady(){return spring?.state.endingPhase==='reading'||summerReader||relics!.readerReady;},
      interactionHint(){aim();if(spring&&springQuestBusy(spring.state))return '';const extra=extraSpringTarget();if(extra)return extra.label;if(spring){const dropped=springDrops?.target(camera,raycaster,currentSpringWorld());if(dropped)return dropped.label;}if(spring&&busEntered)return springClues?.target(camera,raycaster,spring.state)?.label|| (spring.state.busSeated?'Stand up and explore the bus':springBus&&camera.position.distanceTo(springBus.aislePosition)<1.8?'Sit in the front seat':'');if(spring?.state.dreamReturned&&!springWorld?.inside){const target=springTrain?.target(camera,raycaster);if(target)return target.label;}if(spring?.state.benchSeated)return 'Stand up';if(spring?.state.bagHeld)return 'Set down backpack';if(spring&&springWorld?.inside){if(springAdaviDialogue(spring.state)||spring.state.skipPhase!=='exploring'||spring.state.bagNoteOpen)return '';return springWorld.portalHint(camera)||springWorld.target(camera,raycaster)?.label||(spring.state.selectedStone?'Give it a throw':spring.state.bagRevealed&&!spring.state.bagTaken?'Backpack on the shore':spring.state.bagTaken?'Walk through the forest door':'Look for a flat stone along the shore');}if(spring){if(spring.state.paperHeld)return '';const held=springHeldItem(spring.state);if(held&&held!=='key')return '';return springWorld?.portalHint(camera)||springWorld?.target(camera,raycaster)?.label||'';}if(springTarget||summerTarget)return '';if(summer)return summerWorld?.target(camera,raycaster)?.label||(summerMovement?.onBoat?'Interact for the boat console, mooring and gear.':summerMovement?.mode==='swimming'?'Space to ascend · C to descend · Follow the bottle clue, reef garden and open shipwreck.':!summer.state.noteRead?'Follow the sign to the two chairs and the opening note.':'Explore the island · Your slate keeps the route and hints.');return springWorld?.portalHint(camera)||(springWorld?.target(camera,raycaster)?.label)||props!.pickup.status(camera,raycaster).action||(!spring?relics!.hint(camera,raycaster):'')||props?.interactionHint(raycaster)||(id==='autumn'?'Wade into the shallows · Touch the lake for ripples':id==='summer'?'Wade into the sea · Touch the water for splashes':null);},
      interact(x?:number,y?:number){
        aim(x??0,y??0);if(relics!.busy||springTarget||summerTarget)return null;
        if(summer){const target=summerWorld?.target(camera,raycaster);if(target){if(target.action)summer.act(target.action,target.payload);if(target.panel)summerTarget=target.panel;travel.resetInput();return target.label;}if(summerMovement?.onBoat){summerTarget=summer.state.boatAnchor==='mooring'&&summer.state.mode!=='boating'?'mooring':'boat';travel.resetInput();return 'Boat console';}}
        if(spring&&springWorld){
          if(springQuestBusy(spring.state))return null;
          const dropped=springDrops?.target(camera,raycaster,currentSpringWorld());if(dropped){spring.act(dropped.action,dropped.payload);travel.resetInput();return null;}
          if(busEntered){const clue=springClues?.target(camera,raycaster,spring.state);if(clue){spring.act(clue.action);travel.resetInput();return null;}if(spring.state.busSeated)spring.act('stand-bus');else if(springBus&&camera.position.distanceTo(springBus.aislePosition)<1.8)spring.act('sit-bus');travel.resetInput();return null;}
          const extra=extraSpringTarget();if(extra){spring.act(extra.action,extra.payload);travel.resetInput();return null;}
          if(spring.state.dreamReturned&&!springWorld.inside){const target=springTrain?.target(camera,raycaster);if(target){const changed=springTrain!.interact(target.id,camera.position);travel.resetInput();return changed?target.label:'Please step clear of the doorway.';}}
          if(spring.state.benchSeated){spring.act('stand-up');travel.resetInput();return null;}
          const lakeTarget=springWorld.lakeQuest.target(camera,raycaster,spring.state);if(lakeTarget){spring.act(lakeTarget.action,lakeTarget.payload);travel.resetInput();return null;}
          if(spring.state.bagHeld&&spring.state.skipPhase==='exploring'&&!springAdaviDialogue(spring.state)){travel.resetInput();spring.act('put-bag',springWorld.bagDrop(camera));return null;}
          if(springWorld.inside){
            if(spring.state.skipPhase!=='exploring'||springAdaviDialogue(spring.state)||spring.state.bagNoteOpen)return null;
            if(springWorld.portalHint(camera)){enterForest(false);return null;}
            if(spring.state.selectedStone){spring.act('aim-stone');travel.resetInput();return null;}
            const adaviTarget=springWorld.target(camera,raycaster);if(adaviTarget&&'action' in adaviTarget)spring.act(adaviTarget.action,adaviTarget.payload);return null;
          }
          if(spring.state.paperHeld){spring.act('put-paper');return null;}
          const held=springHeldItem(spring.state);
          if(held&&held!=='key'){if(springRemaining(spring.state,held)>0)spring.act('eat-held');else if(held==='basket'&&!spring.state.keyTaken)spring.act('take-key');return null;}
          if(springWorld.portalHint(camera)){if(springWorld.inside){enterForest(false);return null;}if(held==='key')spring.act('unlock-door');return null;}
          const target=springWorld.target(camera,raycaster);if(target){if('action' in target)spring.act(target.action,target.payload);else spring.act(target.id==='letter'?'read-letter':'take-item',target.id);}return null;
        }
        if(!spring&&!summer){const relic=relics!.interact(camera,raycaster,x!==undefined);if(relic)return relic;}
        const hit=props?.interact(raycaster);if(hit)return hit.label;
        if(lake){const hit=raycaster.intersectObject(lake.mesh,false)[0];if(hit&&lake.ripple(hit.point.x,hit.point.z,time))return 'Ripples across the lake';}
        if(ocean){const hit=raycaster.intersectObject(ocean.mesh,false)[0];if(hit&&ocean.ripple(hit.point.x,hit.point.z,time))return 'A splash in the shallows';}
        if(id==='spring'||id==='autumn'){const hit=raycaster.intersectObjects(terrain!.group.children,false)[0];if(hit){groundMotion.disturb(hit.point.x,hit.point.z,time);return id==='spring'?'Petals stir in the grass':'Leaves rustle underfoot';}}
        if(id==='winter'){const ground=raycaster.intersectObjects(terrain!.group.children,false)[0];if(ground){terrain!.stepSnow(ground.point.x,ground.point.z,travel.state.yaw,time);return 'Fresh snow pressed';}}
        return null;
      },
      setQuality(value:number){quality=Math.max(.45,Math.min(1,value));ocean?.setQuality(quality);lake?.setQuality(quality);lastPlacement='';},
      resize(width:number,height:number){camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();lastPlacement='';},
      snapshot(){return {northWeather:springNorthWeather(camera.position.x,camera.position.z),insideTrain:springTrain?.inside(camera.position.x,camera.position.z)??false,summer:summer?.snapshot(),summerMode:summerMovement?.mode,summerTarget,treeCount:layout.trees.length,quality,bytes,waterDepth:Math.max(0,(layout.navigation.waterLevel??-Infinity)-(travel.state.y-1.63)),lakeRipples:lake?.rippleCount??0,fishJumps:lake?.fishJumps??0,spring:spring?.snapshot(),springTarget,forestRiver:springWorld?.inside??false,springWorld:springWorld?.stats(),...props!.snapshot()};},
    };
  }catch(error){dispose();throw error;}
}
export type SeasonWorld=Awaited<ReturnType<typeof loadSeasonWorld>>;
