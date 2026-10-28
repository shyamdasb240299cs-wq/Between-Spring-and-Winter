import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {SPRING_SPOTS,SPRING_POND,springPondDistance,ADAVI_SIGN} from './spring-treasure-layout';
import {springHeldItem,type SpringSave} from './spring-treasure-state';
import type {GroundMaps} from './season-terrain';
import {createSpringFoodStall} from './spring-food-stall';
import {createSpringAdaviEnvironment,adaviGround} from './spring-adavi-environment';
import {createSpringAdaviGame} from './spring-adavi-game';
import type {SpringTreasureController} from './spring-treasure-state';
import type {SpringBagPlacement} from './spring-treasure-state';
import {createSpringBackpack} from './spring-backpack';
import {createSpringLakeQuest} from './spring-lake-quest';
import {createSpringRiver} from './spring-river';
import {springNorthWeather} from './spring-north-weather';
interface Options{models:Record<string,THREE.Object3D>;materials:{wood:THREE.Texture;cloth:THREE.Texture;paper:THREE.Texture};height:(x:number,z:number)=>number;mobile:boolean;reduced:boolean;character?:THREE.Texture;forestMaps:{mud:GroundMaps;rock:GroundMaps;water:THREE.Texture};}
export function createSpringTreasureWorld({models,materials,height,mobile,reduced,forestMaps,character}:Options){
  const group=new THREE.Group();group.name='Spring · favourite little things';
  const ownGeometry=new Set<THREE.BufferGeometry>(),ownMaterials=new Set<THREE.Material>(),ownTextures=new Set<THREE.Texture>();
  const standard=(options:THREE.MeshStandardMaterialParameters)=>{const m=new THREE.MeshStandardMaterial(options);ownMaterials.add(m);return m;};
  const keep=(g:THREE.BufferGeometry)=>{ownGeometry.add(g);return g;};
  const wood=standard({map:materials.wood,color:0x97836a,roughness:.82}),paleWood=standard({map:materials.wood,color:0xc0aa84,roughness:.82}),darkWood=standard({map:materials.wood,color:0x554938,roughness:.83}),brass=standard({color:0xb99a59,roughness:.38,metalness:.77});
  function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0,_batch=true){const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function box(parent:THREE.Object3D,w:number,h:number,d:number,mat:THREE.Material,x=0,y=0,z=0,r=.01,_batch=true){return mesh(parent,keep(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.4,h*.4,d*.4))),mat,x,y,z);}
  function cylinder(parent:THREE.Object3D,rt:number,rb:number,h:number,mat:THREE.Material,x:number,y:number,z:number,_batch=true){return mesh(parent,keep(new THREE.CylinderGeometry(rt,rb,h,16)),mat,x,y,z);}
  function site(x:number,z:number){const root=new THREE.Group();root.position.set(x,height(x,z),z);group.add(root);return root;}
  function imported(key:string,parent:THREE.Object3D,x:number,y:number,z:number,size:number,_axis='width',yaw=0){if(!models[key])return null;const source=models[key].clone(true),b=new THREE.Box3().setFromObject(source),d=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());source.position.sub(new THREE.Vector3(c.x,b.min.y,c.z));const root=new THREE.Group();root.add(source);root.scale.setScalar(size/Math.max(d.x,d.z));root.position.set(x,y,z);root.rotation.y=yaw;parent.add(root);return root;}
  const carried=new THREE.Group();carried.name='Carried Spring belongings';group.add(carried);
  const stall=createSpringFoodStall({models,woodMap:materials.wood,clothMap:materials.cloth,height,character});group.add(stall.group);carried.add(stall.handGroup);
  const forest=createSpringAdaviEnvironment({models,maps:forestMaps,mobile,reduced});group.add(forest.group);forest.group.visible=false;
  const adavi=createSpringAdaviGame(models,materials.cloth,materials.paper,reduced);forest.group.add(adavi.group);
  const backpack=createSpringBackpack(models,materials.cloth,materials.paper,reduced,place=>place.world==='adavi'?adaviGround(place.x-200,place.z):height(place.x,place.z));carried.add(backpack.group);
  const lakeQuest=createSpringLakeQuest(models,materials.wood,height,reduced);group.add(lakeQuest.group);carried.add(lakeQuest.held,lakeQuest.journeyPaper);
  const reflect=forest.water.onBeforeRender;forest.water.onBeforeRender=(...args)=>{const visible=stall.handGroup.visible;stall.handGroup.visible=false;try{reflect.apply(forest.water,args);}finally{stall.handGroup.visible=visible;}};
  const river=createSpringRiver({models,wood:materials.wood,maps:forestMaps,height,mobile,reduced});group.add(river.group);
  // A quiet, unadorned doorway off the longer forest path.
  const portal=site(SPRING_SPOTS.school.x,SPRING_SPOTS.school.z);portal.name='Secret door among the blossoms';
  const portalYaw=Math.atan2(SPRING_SPOTS.picnic.x-SPRING_SPOTS.school.x,SPRING_SPOTS.picnic.z-SPRING_SPOTS.school.z),normalX=Math.sin(portalYaw),normalZ=Math.cos(portalYaw);portal.rotation.y=portalYaw;
  for(const x of [-.83,.83])box(portal,.18,2.76,.24,darkWood,x,1.37);
  box(portal,1.98,.21,.30,darkWood,0,2.70);box(portal,2.10,.07,.38,paleWood,0,2.83);box(portal,1.6,.035,.42,paleWood,0,.035);
  const leaf=new THREE.Group();leaf.position.x=-.72;portal.add(leaf);const doorWood=standard({map:materials.wood,color:0x697557,roughness:.86});
  for(let n=0;n<7;n++){const m=standard({map:materials.wood,color:new THREE.Color(0x879278).multiplyScalar(.90+n*.018),roughness:.84});box(leaf,.202,2.48,.085,m,.105+n*.205,1.29);}for(const y of [.35,1.14,2.12])box(leaf,1.42,.09,.025,darkWood,.72,y,.06);
  box(leaf,.085,.22,.025,brass,1.23,1.15,.08);cylinder(leaf,.024,.024,.045,brass,1.23,1.17,.11).rotation.x=Math.PI/2;
  const lockHole=standard({color:0x181c14,roughness:1});mesh(leaf,keep(new THREE.CircleGeometry(.012,12)),lockHole,1.23,1.1,.097);
  for(const y of [.42,1.29,2.17]){box(leaf,.055,.12,.018,darkWood,.05,y,.067);for(const x of [.035,.065])cylinder(leaf,.007,.007,.025,brass,x,y,.08).rotation.x=Math.PI/2;}
  const threshold=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 vPortal;void main(){vPortal=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform float time;varying vec2 vPortal;void main(){vec2 p=(vPortal-.5)*vec2(1.,1.5);float r=length(p),a=atan(p.y,p.x);float wave=sin(r*23.-a*2.-time*2.4)+sin(p.y*17.+time*.8)*.25;vec3 c=.5+.5*cos(vec3(0.,2.1,4.2)+a*1.5-r*12.+time*.7+wave*.8);float rim=pow(max(0.,1.-abs(p.x)*2.),.3);c=mix(c,vec3(.88,.94,1.),pow(max(0.,1.-r*1.8),4.)*.6);gl_FragColor=vec4(c*.78+.12,.90*rim);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});ownMaterials.add(threshold);
  const doorway=mesh(portal,keep(new THREE.PlaneGeometry(1.44,2.48,1,1)),threshold,0,1.29,-.065);doorway.castShadow=false;doorway.visible=false;
  const returnDoor=new THREE.Group();returnDoor.name='Door back to Spring';returnDoor.position.set(-7,forest.height(193,12)??.5,12);forest.group.add(returnDoor);for(const x of [-.85,.85])box(returnDoor,.14,2.7,.20,darkWood,x,1.35);box(returnDoor,1.85,.14,.20,darkWood,0,2.65);
  const returnLeaf=new THREE.Group();returnLeaf.name='Open return door leaf';returnLeaf.position.x=-.72;returnLeaf.rotation.y=-Math.PI*.54;returnDoor.add(returnLeaf);box(returnLeaf,1.44,2.48,.085,doorWood,.72,1.25);cylinder(returnLeaf,.03,.03,.08,brass,1.24,1.13,-.09).rotation.x=Math.PI/2;
  forest.addReflectionObject(returnDoor);
  const returnVeil=mesh(returnDoor,keep(new THREE.PlaneGeometry(1.42,2.35)),threshold,0,1.25,-.07);returnVeil.castShadow=false;
  const slab=new THREE.Group();slab.name='Adavi · yellow and white roadside milestone';slab.position.set(ADAVI_SIGN.x,adaviGround(ADAVI_SIGN.x,ADAVI_SIGN.z),ADAVI_SIGN.z);slab.rotation.y=ADAVI_SIGN.yaw;slab.scale.setScalar(.54);forest.group.add(slab);
  const markerShape=new THREE.Shape();markerShape.moveTo(-.56,0);markerShape.lineTo(.56,0);markerShape.lineTo(.56,1.02);markerShape.quadraticCurveTo(.56,1.52,0,1.58);markerShape.quadraticCurveTo(-.56,1.52,-.56,1.02);markerShape.closePath();
  const concrete=standard({color:0xf2eddc,normalMap:forestMaps.rock.normal,normalScale:new THREE.Vector2(.10,.10),roughness:.94});
  // Paint the yellow cap into the one concrete body. Two almost coincident
  // extrusions previously fought for the same depth samples while walking.
  const capTint=new THREE.Color(0xe4bd38);capTint.setRGB(capTint.r/concrete.color.r,capTint.g/concrete.color.g,capTint.b/concrete.color.b);
  concrete.onBeforeCompile=shader=>{shader.uniforms.markerCapTint={value:capTint};shader.vertexShader='varying float vMarkerHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMarkerHeight=position.y;');shader.fragmentShader='uniform vec3 markerCapTint;varying float vMarkerHeight;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(1.),markerCapTint,smoothstep(.945,.955,vMarkerHeight));');};
  concrete.customProgramCacheKey=()=> 'adavi-single-body-painted-milestone-v1';
  const milestone=mesh(slab,keep(new THREE.ExtrudeGeometry(markerShape,{depth:.31,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:3,steps:1,curveSegments:24})),concrete,0,.025,-.155);milestone.name='Thick arched concrete milestone';
  const inscription=document.createElement('canvas');inscription.width=1024;inscription.height=1408;const ink=inscription.getContext('2d');
  if(ink){ink.clearRect(0,0,1024,1408);ink.textAlign='center';ink.fillStyle='#171c17';ink.font='bold 146px Arial';ink.fillText('ADAVI',512,360);ink.font='bold 87px Arial';ink.fillText('ECO',512,800);ink.fillText('TOURISM',512,910);ink.font='42px Arial';ink.fillText('KALLAR RIVER',512,1110);}
  const inscriptionMap=new THREE.CanvasTexture(inscription);inscriptionMap.colorSpace=THREE.SRGBColorSpace;inscriptionMap.anisotropy=8;ownTextures.add(inscriptionMap);const letters=new THREE.MeshBasicMaterial({map:inscriptionMap,transparent:true,depthWrite:false,alphaTest:.05,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});ownMaterials.add(letters);const inscriptionFace=mesh(slab,keep(new THREE.PlaneGeometry(1.02,1.40)),letters,0,.79,.195);inscriptionFace.name='Milestone inscription · depth-separated paint';inscriptionFace.castShadow=false;inscriptionFace.renderOrder=3;
  forest.addReflectionObject(slab);
  let inside=false,state:SpringSave|undefined;
  const exitPosition={x:portal.position.x+normalX*1.5,z:portal.position.z+normalZ*1.5,yaw:portalYaw+Math.PI};
  const portalLocal=(x:number,z:number)=>{const dx=x-portal.position.x,dz=z-portal.position.z;return {x:dx*normalZ-dz*normalX,z:dx*normalX+dz*normalZ};};
  function bagDrop(camera:THREE.Camera):SpringBagPlacement|null {
    const forward=new THREE.Vector3();camera.getWorldDirection(forward);const yaw=Math.atan2(-forward.x,-forward.z),world=inside?'adavi':'spring';
    for(const distance of [.95,1.25,.65])for(const turn of [0,.65,-.65,1.3,-1.3,Math.PI]){
      const x=camera.position.x-Math.sin(yaw+turn)*distance,z=camera.position.z-Math.cos(yaw+turn)*distance;
      if(inside){const floor=forest.height(x,z);if(floor===null||adaviGround(x-200,z)<.22||Math.hypot(x-193,z-12)<1.1)continue;}
      else if((Math.hypot(x,z)>35.3&&!(x>=5&&x<=20&&z>=-104&&z<=-25))||springPondDistance(x,z)<1.1||stall.blocked(x,z)||Math.hypot(x-portal.position.x,z-portal.position.z)<1.2)continue;
      return {world,x,z,yaw};
    }
    return null;
  }
  function portalHint(camera:THREE.Camera){const facing=new THREE.Vector3();camera.getWorldDirection(facing);if(inside)return Math.hypot(camera.position.x-193,camera.position.z-12)<2.4&&facing.z>.35?'Return through the forest door':null;
    const local=portalLocal(camera.position.x,camera.position.z);if(local.z<=.12||Math.abs(local.x)>1.6||Math.hypot(camera.position.x-portal.position.x,camera.position.z-portal.position.z)>2.6||facing.x*normalX+facing.z*normalZ>-.25)return null;
    return state?.doorUnlocked?'Walk through the open door':state&&springHeldItem(state)==='key'?'Unlock door':state?.keyTaken?'Equip the brass key':'Locked door';}
  const hidden=new Map<THREE.Object3D,boolean>();
  function setInterior(value:boolean){if(value===inside)return;inside=value;forest.group.visible=value;for(const child of group.children){if(child===forest.group||child===carried)continue;if(value){hidden.set(child,child.visible);child.visible=false;}else child.visible=hidden.get(child)??true;}if(!value)hidden.clear();}
  return {group,carried,exitPosition,spawn:forest.spawn,portalLocal,portalHint,setInterior,interiorHeight:forest.height,adavi,backpack,lakeQuest,river,bagDrop,
    updateCarried(time:number,dt:number,save:SpringSave,camera:THREE.Camera){stall.update(time,dt,save,camera);backpack.update(dt,save,camera,'spring');backpack.bag.visible=save.bagHeld;lakeQuest.update(time,dt,save,camera);stall.handGroup.visible=!save.bagHeld;},
    get inside(){return inside;},get canEnter(){return !!state?.doorUnlocked&&leaf.rotation.y<-.9;},
    usePortal(){return inside?'exit':state?.doorUnlocked?'open':'locked';},
    doorwayBlocked(x:number,z:number){if(inside)return false;if(stall.blocked(x,z))return true;const local=portalLocal(x,z);return Math.abs(local.z)<.29&&Math.abs(local.x)<1.8&&(Math.abs(local.x)>.65||!state?.doorUnlocked||leaf.rotation.y>-.9);},
    portalCrossed(px:number,pz:number,x:number,z:number){const before=portalLocal(px,pz),now=portalLocal(x,z);if(inside||!state?.doorUnlocked||leaf.rotation.y>=-.9||before.z<=0||now.z>0)return false;const t=before.z/(before.z-now.z);return Math.abs(THREE.MathUtils.lerp(before.x,now.x,t))<.64;},
    returnPortalCrossed(px:number,pz:number,x:number,z:number){if(!inside||(pz-12)*(z-12)>0||pz===z)return false;const t=(12-pz)/(z-pz);return t>=0&&t<=1&&Math.abs(THREE.MathUtils.lerp(px,x,t)-193)<.64;},
    target(camera:THREE.PerspectiveCamera,ray:THREE.Raycaster){if(!state)return null;if(!inside){const clue=lakeQuest.target(camera,ray,state);if(clue)return clue;}const pack=backpack.target(camera,ray,state,inside?'adavi':'spring');return pack??(state.bagHeld||state.bagItemHeld?null:inside?adavi.target(camera,ray,state):stall.target(camera,ray,state));},
    update(time:number,dt:number,save:SpringSave,camera?:THREE.Camera,controller?:SpringTreasureController){state=save;lakeQuest.update(time,dt,save,camera);leaf.rotation.y=THREE.MathUtils.damp(leaf.rotation.y,save.doorUnlocked?-Math.PI*.54:0,8,dt);doorway.visible=save.doorUnlocked;threshold.uniforms.time.value=reduced?0:time;if(camera)stall.update(time,dt,save,camera);if(inside){forest.update(time);if(camera)adavi.update(dt,save,camera,controller);}else {const weather=save.dreamReturned&&camera?springNorthWeather(camera.position.x,camera.position.z):{rain:0,night:0};river.update(time,weather.rain,weather.night);}if(camera){backpack.update(dt,save,camera,inside?'adavi':'spring');stall.handGroup.visible=!(save.bagHeld||inside&&(save.selectedStone||save.bagNoteOpen||save.skipPhase!=='exploring'));}},
    nearTable:(camera:THREE.Camera)=>!inside&&stall.nearTable(camera),
    stats:()=>({targets:stall.targets.length,...stall.stats(),...forest.stats(),...adavi.stats(),inside}),
    dispose(){stall.dispose();adavi.dispose();backpack.dispose();lakeQuest.dispose();river.dispose();forest.dispose();ownGeometry.forEach(g=>g.dispose());ownMaterials.forEach(m=>m.dispose());ownTextures.forEach(t=>t.dispose());group.removeFromParent();group.clear();}};
}
