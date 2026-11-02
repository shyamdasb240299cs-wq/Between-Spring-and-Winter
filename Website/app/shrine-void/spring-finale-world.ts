import * as THREE from 'three';
import {SPRING_SPOTS} from './spring-treasure-layout';
import {type SpringSave,type SpringTreasureController} from './spring-treasure-state';
import {createSpringCandleLighting} from './spring-candle-lighting';
import {createSpringKeepsakeLocker} from './spring-keepsake-locker';

export const SPRING_DUMPLINGS_MODEL='/seasons/kit/spring-finale/dumplings.glb';
export const SPRING_TREASURE_SPOT={x:11.9,z:-21};
export const SPRING_SHOVEL_SPOT={x:15.8,z:-12.9};
export const SPRING_DUMPLING_SPOT={x:SPRING_SPOTS.picnic.x+.85,z:SPRING_SPOTS.picnic.z-.82};
type Target={id:string;action:string;label:string;payload?:unknown};
type Pose={x:number;y:number;z:number;yaw:number;pitch:number};

/** Physical meal and excavation. All continuous effects share the main renderer. */
export function createSpringFinaleWorld(models:Record<string,THREE.Object3D>,_chestSource:THREE.Object3D,bookSource:THREE.Object3D,cover:THREE.Texture,wood:THREE.Texture,height:(x:number,z:number)=>number,reduced:boolean){
  const group=new THREE.Group();group.name='Spring finale · sunlight and buried keepsake';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const mat=(p:THREE.MeshStandardMaterialParameters)=>{const m=new THREE.MeshStandardMaterial(p);materials.add(m);return m;};
  function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  const timber=mat({map:wood,color:0x786047,roughness:.9}),steel=mat({color:0x6e787b,metalness:.75,roughness:.36});
  function normalize(source:THREE.Object3D,width:number,parent:THREE.Object3D){const holder=new THREE.Group(),copy=source.clone(true);copy.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(copy),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());copy.position.sub(new THREE.Vector3(c.x,b.min.y,c.z));holder.add(copy);holder.scale.setScalar(width/Math.max(s.x,s.z));parent.add(holder);return holder;}
  const trayRoot=new THREE.Group();trayRoot.name='Hidden bamboo steamer behind the food stall';group.add(trayRoot);
  const tray=normalize(models.dumplings,.46,trayRoot),lid=tray.getObjectByName('Steamer_lid')??tray.getObjectByName('Steamer lid');
  const lidRest=lid?.position.clone(),buns=Array.from({length:7},(_,n)=>tray.getObjectByName('Dumpling_'+(n+1))??tray.getObjectByName('Dumpling '+(n+1)));
  const biteRoot=new THREE.Group();biteRoot.name='Dumpling lifted to the mouth';group.add(biteRoot);
  const biteCopies=buns.map(bun=>{const copy=bun?.clone(true);if(copy)biteRoot.add(copy);return copy;});
  // Each source island retains the shared accessor for all seven buns. Bound its
  // referenced vertices so the lifted bun, rather than the entire tray, centres
  // on the chopsticks and mouth.
  const biteCentres=buns.map(bun=>{if(!bun)return new THREE.Vector3();bun.updateWorldMatrix(true,true);const bounds=new THREE.Box3(),point=new THREE.Vector3();bun.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.attributes.position,ix=o.geometry.index;for(let i=0;i<(ix?.count??p.count);i++){const j=ix?ix.getX(i):i;point.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);bounds.expandByPoint(point);}});return bun.worldToLocal(bounds.getCenter(new THREE.Vector3()));});
  const biteCentre=new THREE.Vector3(),mouth=new THREE.Vector3(),biteMove=new THREE.Vector3(),focusDirection=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const sticks=tray.getObjectByName('Chopstick');
  const sticksRoot=new THREE.Group();sticksRoot.name='Chopsticks in the other hand';group.add(sticksRoot);
  if(sticks){tray.updateMatrixWorld(true);sticksRoot.attach(sticks);sticks.position.set(0,0,0);sticks.quaternion.identity();sticks.scale.setScalar(.46/.671);}
  const chopstickRest=sticks?.quaternion.clone();
  const noteMaterial=mat({color:0xeee0bd,roughness:.95,side:THREE.DoubleSide});
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=768;c.height=1024;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#eee0bd';ctx.fillRect(0,0,768,1024);ctx.fillStyle='#4d4636';ctx.font='46px "Spring Hand", Georgia';['My dear Aamii,','Your happiness means','the world to me.','May that laughter','stay forever.','','Go to the riverside.','Your next task awaits.','— Syamu'].forEach((line,i)=>ctx.fillText(line,55,110+i*95));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);noteMaterial.map=t;}}
  const mealNote=mesh(group,new THREE.PlaneGeometry(.22,.29),noteMaterial);mealNote.name='Dumpling letter';mealNote.rotation.set(-Math.PI/2,0,.18);
  // One instanced steam draw, animated entirely on the GPU.
  const steamGeometry=new THREE.InstancedBufferGeometry(),quad=new THREE.PlaneGeometry(1,1);steamGeometry.index=quad.index;steamGeometry.attributes=quad.attributes;geometries.add(steamGeometry);
  const seeds=new Float32Array(32*3);for(let i=0;i<seeds.length;i++){const n=Math.sin(i*127.1+3)*43758.5453;seeds[i]=n-Math.floor(n);}steamGeometry.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,3));steamGeometry.instanceCount=32;
  const steamUniforms={clock:{value:0},power:{value:0}};
  const steamMaterial=new THREE.ShaderMaterial({uniforms:steamUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:`attribute vec3 seed;uniform float clock,power;varying vec2 pUv;varying float alpha;void main(){pUv=uv;float t=fract(seed.x+clock*.28);vec3 c=vec3((seed.y-.5)*.30+sin(t*5.+seed.x*20.)*.04,.15+t*.55,(seed.z-.5)*.28);vec4 p=modelViewMatrix*vec4(c,1.);p.xy+=position.xy*(.06+t*.17);alpha=sin(t*3.14159)*power;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec2 pUv;varying float alpha;void main(){float a=exp(-dot(pUv-.5,pUv-.5)*20.)*alpha*.13;gl_FragColor=vec4(.92,.94,.91,a);}`});materials.add(steamMaterial);
  const steam=new THREE.Mesh(steamGeometry,steamMaterial);steam.frustumCulled=false;trayRoot.add(steam);steam.name='Warm steamer vapour';
  // A grounded shovel with a curved metal blade, timber shaft and D grip.
  const shovelRoot=new THREE.Group();shovelRoot.name='Riverside digging shovel';group.add(shovelRoot);
  mesh(shovelRoot,new THREE.CylinderGeometry(.017,.021,1.05,12),timber,0,.72);
  const bladeShape=new THREE.Shape();bladeShape.moveTo(-.12,.23);bladeShape.lineTo(.12,.23);bladeShape.lineTo(.115,.015);bladeShape.quadraticCurveTo(.07,-.12,0,-.15);bladeShape.quadraticCurveTo(-.07,-.12,-.115,.015);bladeShape.closePath();
  const blade=mesh(shovelRoot,new THREE.ExtrudeGeometry(bladeShape,{depth:.012,bevelEnabled:true,bevelSize:.008,bevelThickness:.004,bevelSegments:2,steps:1}),steel,0,.15);blade.rotation.x=-.12;
  const grip=mesh(shovelRoot,new THREE.TorusGeometry(.07,.015,8,20,Math.PI),steel,0,1.26);grip.rotation.z=Math.PI;mesh(shovelRoot,new THREE.CylinderGeometry(.015,.015,.14,10),timber,0,1.26).rotation.z=Math.PI/2;
  const spot=new THREE.Group();spot.name='Sunlit treasure soil';spot.position.set(SPRING_TREASURE_SPOT.x,height(SPRING_TREASURE_SPOT.x,SPRING_TREASURE_SPOT.z),SPRING_TREASURE_SPOT.z);group.add(spot);
  const earth=mat({color:0x634c35,roughness:1,map:wood});
  const dirt=mesh(spot,new THREE.SphereGeometry(.78,32,12,0,Math.PI*2,0,Math.PI*.5),earth,0,-.045);dirt.scale.set(1,.1,.8);
  const warm=new THREE.MeshBasicMaterial({color:0xffe2a0,transparent:true,opacity:.18,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});materials.add(warm);
  const glow=mesh(spot,new THREE.CircleGeometry(1.6,64),warm,0,.012);glow.rotation.x=-Math.PI/2;glow.castShadow=false;
  warm.onBeforeCompile=s=>{s.vertexShader='varying vec2 sunUv;\n'+s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nsunUv=position.xy;');s.fragmentShader='varying vec2 sunUv;\n'+s.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=pow(max(0.,1.-length(sunUv)/1.6),2.);\n#include <opaque_fragment>');};
  const raysMaterial=new THREE.MeshBasicMaterial({color:0xffedc4,transparent:true,opacity:.035,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});materials.add(raysMaterial);
  const rays=mesh(spot,new THREE.ConeGeometry(1.6,12,32,1,true),raysMaterial,-1.2,5.8,-1.8);rays.rotation.set(.18,0,-.16);rays.castShadow=false;
  const locker=createSpringKeepsakeLocker(),chest=locker.group;chest.position.set(0,-.3,0);chest.rotation.y=1.18;spot.add(chest);
  const book=new THREE.Group(),bookCopy=bookSource.clone(true);book.name='Hidden Part One Spring book';bookCopy.updateMatrixWorld(true);const bookBounds=new THREE.Box3().setFromObject(bookCopy),bookSize=bookBounds.getSize(new THREE.Vector3());bookCopy.position.sub(bookBounds.getCenter(new THREE.Vector3()));book.add(bookCopy);book.scale.setScalar(.47/Math.max(bookSize.x,bookSize.y));locker.interior.add(book);book.position.set(-.045,.125,-.01);book.rotation.x=-Math.PI/2;
  book.traverse(o=>{if(!(o instanceof THREE.Mesh))return;if(/^(PageEdge|TopPageEdge|WovenEndband)/.test(o.name))o.visible=false;if(o.name==='CoverArt')o.material=mat({map:cover,roughness:.86});});
  // Dirt clods rise on successive strokes rather than replacing the scene with a UI timer.
  const clods=Array.from({length:9},(_,i)=>{const o=mesh(spot,new THREE.DodecahedronGeometry(.08+(i%3)*.025,0),earth);o.name='Displaced soil '+i;return o;});
  const flameMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{clock:{value:0}},vertexShader:`varying vec2 pUv;void main(){pUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 pUv;uniform float clock;void main(){float y=pUv.y,x=(pUv.x-.5)+sin(y*8.-clock*9.)*.035*y;float a=(1.-smoothstep(.1,.5,length(vec2(x*(1.+y*2.),(y-.45)*.7))*1.7))*sin(y*3.14159);if(a<.02)discard;gl_FragColor=vec4(mix(vec3(1.,.28,.025),vec3(1.,.96,.65),1.-y),a);}`});materials.add(flameMaterial);
  const flame=mesh(group,new THREE.PlaneGeometry(.045,.09),flameMaterial);flame.name='Candle flame';flame.castShadow=false;
  const candleLighting=createSpringCandleLighting(),candleLight=candleLighting.source;group.add(candleLight);
  // Only the cavity and private book copies receive the wick light. The shell,
  // door, ground, trees and held props keep their ordinary daylight shading.
  const candleMaterials=new Map<THREE.MeshStandardMaterial,THREE.MeshStandardMaterial>();
  const candleMaterial=(source:THREE.Material)=>{
    if(!(source instanceof THREE.MeshStandardMaterial))return source;
    let scoped=candleMaterials.get(source);if(scoped)return scoped;
    scoped=materials.has(source)?source:source.clone();
    if(scoped!==source){scoped.onBeforeCompile=source.onBeforeCompile;scoped.customProgramCacheKey=source.customProgramCacheKey;materials.add(scoped);}
    candleMaterials.set(source,scoped);candleLighting.bind(scoped);return scoped;
  };
  locker.interior.traverse(o=>{if(o instanceof THREE.Mesh)o.material=Array.isArray(o.material)?o.material.map(candleMaterial):candleMaterial(o.material);});
  candleLighting.setVolume(chest,new THREE.Vector3(-.435,.06,-.285),new THREE.Vector3(.435,.615,.315));
  const focusRay=mesh(group,new THREE.CylinderGeometry(.001,.008,.45,8),new THREE.MeshBasicMaterial({color:0xffecb5,transparent:true,opacity:.45,depthWrite:false}));materials.add(focusRay.material);focusRay.name='Sunlight focused through spectacles';focusRay.castShadow=false;
  let open=0,digTime=0,focusTime=0,focusStarted=0,mealOpen=0,lastEat=0,elapsed=0,wasFocusing=false,focusPaused=false,bookLookTime=0;
  const bookLookRay=new THREE.Raycaster(),apertureRay=new THREE.Ray(),inverseLocker=new THREE.Matrix4(),aperture=new THREE.Box3(new THREE.Vector3(-.40,.09,.30),new THREE.Vector3(.40,.58,.345)),apertureHit=new THREE.Vector3();
  const eye=new THREE.Vector3(),lookAt=new THREE.Vector3(),lookMatrix=new THREE.Matrix4(),lookRotation=new THREE.Quaternion(),wick=new THREE.Vector3(),localWick=new THREE.Vector3(),wickRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),1.18);
  let inspectionFrom:{position:THREE.Vector3;rotation:THREE.Quaternion;wick:THREE.Vector3}|null=null,inspectionAge=0,inspectionSuppressed=false;
  const candlePose={position:wick,rotation:wickRotation};
  function setPose(camera:THREE.Camera,pose?:Pose){if(!pose)return;const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');Object.assign(pose,{x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw:e.y,pitch:e.x});}
  function cancelInspection(camera:THREE.Camera,pose?:Pose){if(inspectionFrom){camera.position.copy(inspectionFrom.position);camera.quaternion.copy(inspectionFrom.rotation);setPose(camera,pose);}inspectionFrom=null;inspectionAge=bookLookTime=0;inspectionSuppressed=true;}
  const near=(camera:THREE.Camera,p:{x:number;z:number},range=2.3)=>Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<range;
  const nearMeal=(camera:THREE.Camera)=>near(camera,SPRING_DUMPLING_SPOT,2.1);
  const nearDig=(camera:THREE.Camera)=>near(camera,SPRING_TREASURE_SPOT,2.4);
  const nearShovel=(camera:THREE.Camera)=>near(camera,SPRING_SHOVEL_SPOT,2.4);
  const frame=(o:THREE.Object3D,camera:THREE.Camera,x:number,y:number,z:number)=>{o.position.copy(camera.position);o.quaternion.copy(camera.quaternion);o.translateX(x);o.translateY(y);o.translateZ(z);};
  const hit=(ray:THREE.Raycaster,o:THREE.Object3D)=>ray.intersectObject(o,true).some(h=>h.distance<3.3&&h.object.visible);
  return {group,nearMeal,nearDig,nearShovel,spot,trayRoot,shovelRoot,chest,book,locker,
    get inspecting(){return inspectionFrom!==null;},get candlePose(){return inspectionFrom?candlePose:null;},cancelInspection,
    canAct(action:string,camera:THREE.Camera){if(['read-dumpling-note','take-dumplings','return-dumplings'].includes(action))return nearMeal(camera);if(action==='take-shovel'||action==='put-shovel')return nearShovel(camera)||action==='put-shovel'&&nearDig(camera);if(['dig-treasure','open-treasure','take-spring-book','focus-candle'].includes(action))return nearDig(camera);return true;},
    target(camera:THREE.Camera,ray:THREE.Raycaster,s:SpringSave):Target|null{
      if(s.adaviActive||s.dreamPhase!=='awake'||s.questNoteOpen||s.bagNoteOpen||s.endingPhase!=='none')return null;
      if(s.trainLetterRead&&s.treasureKeyTaken&&nearMeal(camera)){
        if(!s.dumplingNoteRead&&hit(ray,mealNote))return {id:'dumpling-note',action:'read-dumpling-note',label:'Read the letter beside the steamer'};
        if(!s.hands.includes('dumpling-tray')&&hit(ray,trayRoot))return {id:'dumpling-tray',action:'take-dumplings',label:'Take the bamboo steamer and chopsticks'};
      }
      if(s.paperHuntStarted&&s.paperPieces.length===5&&!s.shovelTaken&&nearShovel(camera)&&hit(ray,shovelRoot))return {id:'shovel',action:'take-shovel',label:'Take the shovel'};
      if(nearDig(camera)&&s.rainCleared){
        if(!s.treasureDug&&s.hands.includes('shovel')&&hit(ray,spot))return {id:'dig',action:'dig-treasure',label:'Dig in the patch of sunlight'};
        if(s.treasureDug&&!s.treasureOpen&&hit(ray,chest))return {id:'treasure',action:'open-treasure',label:s.hands.includes('treasure-key')?'Unlock the locker door':'Equip the diamond key for the locker keyhole'};
        if(focusPaused&&!s.candleFocusStarted&&s.treasureOpen&&s.finalDialogueSeen&&!s.candleLit&&s.hands.includes('candle')&&s.hands.includes('glasses')&&hit(ray,glow))return {id:'candle-focus',action:'focus-candle',label:'Focus sunlight through the spectacles'};
      }return null;
    },
    update(time:number,dt:number,camera:THREE.Camera,s:SpringSave,controller:SpringTreasureController,active:boolean,candleAnchor?:THREE.Vector3|null,glassesAnchor?:THREE.Vector3|null,pose?:Pose){
      group.visible=active;if(!active)return;elapsed+=dt;
      const cinematic=['walking','sitting','opening','reading'].includes(s.endingPhase),held=s.hands.includes('dumpling-tray');
      const mealAvailable=s.trainLetterRead&&s.treasureKeyTaken&&!cinematic,storedTray=s.storageSlots.includes('dumpling-tray')||s.droppedItems.some(item=>item.item==='dumpling-tray');
      trayRoot.visible=mealAvailable&&(held||!s.dumplingTrayTaken&&!storedTray);mealNote.visible=mealAvailable;mealNote.position.set(SPRING_DUMPLING_SPOT.x-.44,height(SPRING_DUMPLING_SPOT.x,SPRING_DUMPLING_SPOT.z)+.15,SPRING_DUMPLING_SPOT.z);
      if(held){frame(trayRoot,camera,s.hands[0]==='dumpling-tray'?-.20:.20,-.32,-.79);trayRoot.rotation.x+=.23;}else{trayRoot.position.set(SPRING_DUMPLING_SPOT.x,height(SPRING_DUMPLING_SPOT.x,SPRING_DUMPLING_SPOT.z)+.11,SPRING_DUMPLING_SPOT.z);trayRoot.rotation.set(0,.2,0);}
      mealOpen=THREE.MathUtils.damp(mealOpen,s.dumplingTrayOpen?1:0,reduced?35:4,dt);if(lid&&lidRest){lid.position.copy(lidRest);lid.position.y+=mealOpen*.29;lid.position.x-=mealOpen*.37;lid.rotation.z=mealOpen*.8;}
      const eatAge=s.dumplingEatStarted?(Date.now()-s.dumplingEatStarted)/1500:2;
      buns.forEach((b,i)=>{if(b)b.visible=i>=s.dumplingsEaten;});
      biteRoot.visible=held&&!cinematic&&eatAge>=0&&eatAge<.88&&s.dumplingsEaten>0;
      biteCopies.forEach((copy,i)=>{if(!copy)return;copy.visible=biteRoot.visible&&i===s.dumplingsEaten-1;if(!copy.visible||!buns[i])return;
        const source=buns[i]!;source.updateWorldMatrix(true,true);biteCentre.copy(biteCentres[i]).applyMatrix4(source.matrixWorld);copy.matrix.copy(source.matrixWorld).decompose(copy.position,copy.quaternion,copy.scale);
        mouth.set(0,-.055,-.16).applyQuaternion(camera.quaternion).add(camera.position);const u=THREE.MathUtils.smoothstep(eatAge,.08,.78);biteMove.subVectors(mouth,biteCentre).multiplyScalar(u);copy.position.add(biteMove);copy.position.y+=Math.sin(Math.PI*u)*.035;copy.scale.multiplyScalar(1-THREE.MathUtils.smoothstep(eatAge,.76,.88));
      });
      sticksRoot.visible=mealAvailable&&s.hands.includes('chopsticks');if(sticksRoot.visible){const side=s.hands[0]==='chopsticks'?-1:1,u=Math.max(0,Math.sin(Math.PI*Math.min(1,eatAge)));frame(sticksRoot,camera,side*(.28-u*.12),-.26+u*.25,-.69+u*.28);sticksRoot.rotateY(side*.3);sticksRoot.rotateZ(-side*.25-u*.25);if(sticks&&chopstickRest)sticks.quaternion.copy(chopstickRest);}
      if(sticks&&!s.hands.includes('chopsticks')&&trayRoot.visible&&!s.dumplingTrayTaken){sticksRoot.visible=true;sticksRoot.position.copy(trayRoot.position);sticksRoot.position.y+=s.dumplingTrayOpen?.42:.24;sticksRoot.rotation.set(0,.2,0);}
      steam.visible=s.dumplingTrayOpen&&s.dumplingsEaten<7;steamUniforms.clock.value=reduced?0:time;steamUniforms.power.value=mealOpen;
      shovelRoot.visible=s.paperHuntStarted&&s.paperPieces.length===5&&!cinematic;const shovelHeld=s.hands.includes('shovel');
      if(shovelHeld){frame(shovelRoot,camera,.28,-.88,-.82);shovelRoot.rotateZ(-.26);if(s.diggingStarted){digTime+=dt;shovelRoot.rotateX(-.4+Math.sin(digTime*4.3)*.6);if(digTime>=6.1)controller.act('finish-dig');}else digTime=0;}else{shovelRoot.position.set(SPRING_SHOVEL_SPOT.x,height(SPRING_SHOVEL_SPOT.x,SPRING_SHOVEL_SPOT.z),SPRING_SHOVEL_SPOT.z);shovelRoot.rotation.set(0,.5,-.15);}
      spot.visible=s.rainCleared;const digging=s.treasureDug?1:Math.min(1,digTime/6);dirt.scale.y=.1*(1-digging);clods.forEach((o,i)=>{const a=i*2.4,r=.55+digging*.28;o.position.set(Math.sin(a)*r,.02+Math.sin(a*3)*.025,Math.cos(a)*r*.8);o.scale.setScalar(digging);});
      glow.visible=!s.springBookTaken;rays.visible=!reduced&&!s.springBookTaken;chest.visible=s.treasureDug||digTime>2;chest.position.y=-.34+(s.treasureDug?.34:Math.min(.34,digTime*.056));
      open=THREE.MathUtils.damp(open,s.treasureOpen?1:0,reduced?35:3.5,dt);locker.door.rotation.y=-open*1.8;book.visible=s.treasureOpen&&!s.springBookTaken;
      // Looking through the front aperture starts a short, physical lean. The
      // real candle travels through the opening before any warm light appears.
      camera.updateMatrixWorld(true);chest.updateWorldMatrix(true,true);
      bookLookRay.setFromCamera(new THREE.Vector2(),camera);
      inverseLocker.copy(chest.matrixWorld).invert();apertureRay.copy(bookLookRay.ray).applyMatrix4(inverseLocker);
      const facingAperture=apertureRay.origin.z>.34&&!!apertureRay.intersectBox(aperture,apertureHit),canInspect=s.treasureOpen&&s.finalDialogueSeen&&s.candleLit&&s.hands.includes('candle')&&!s.springBookTaken&&!s.questNoteOpen&&!s.bagNoteOpen&&s.endingPhase==='none'&&nearDig(camera);
      if(!facingAperture&&!inspectionFrom)inspectionSuppressed=false;
      if(canInspect&&open>.94&&facingAperture&&!inspectionSuppressed&&!inspectionFrom&&dt>0){inspectionFrom={position:camera.position.clone(),rotation:camera.quaternion.clone(),wick:candleAnchor?.clone()??camera.localToWorld(new THREE.Vector3(s.hands[0]==='candle'?-.31:.31,.025,-.72))};inspectionAge=0;}
      if(inspectionFrom&&!canInspect){if(cinematic){inspectionFrom=null;inspectionAge=0;}else cancelInspection(camera,pose);}
      if(inspectionFrom){
        inspectionAge+=dt;const lean=THREE.MathUtils.smoothstep(inspectionAge,0,reduced?.2:1.15),reach=THREE.MathUtils.smoothstep(inspectionAge,reduced?.1:.65,reduced?.4:2.25);
        chest.localToWorld(eye.set(.015,.49,1.03));book.getWorldPosition(lookAt);lookMatrix.lookAt(eye,lookAt,up);lookRotation.setFromRotationMatrix(lookMatrix);
        camera.position.lerpVectors(inspectionFrom.position,eye,lean);camera.quaternion.slerpQuaternions(inspectionFrom.rotation,lookRotation,lean);camera.updateMatrixWorld(true);setPose(camera,pose);
        chest.localToWorld(wick.set(.285,.385,.13));wick.lerpVectors(inspectionFrom.wick,wick,reach);
        bookLookRay.setFromCamera(new THREE.Vector2(),camera);
      }else if(candleAnchor)wick.copy(candleAnchor);else{wick.copy(camera.position);wick.add(new THREE.Vector3(s.hands[0]==='candle'?-.31:.31,.025,-.72).applyQuaternion(camera.quaternion));}
      localWick.copy(wick).applyMatrix4(inverseLocker);
      const inside=!!inspectionFrom&&localWick.x>-.41&&localWick.x<.41&&localWick.y>.09&&localWick.y<.59&&localWick.z<.30&&localWick.z>-.26;
      const illuminating=s.candleLit&&s.hands.includes('candle')&&inside;
      const lookingAtBook=illuminating&&inspectionAge>(reduced?.45:2.35)&&book.visible&&hit(bookLookRay,book);
      bookLookTime=lookingAtBook?bookLookTime+dt:0;
      if(bookLookTime>=1.65&&dt>0){controller.act('take-spring-book');bookLookTime=0;}
      const canFocus=s.treasureOpen&&s.finalDialogueSeen&&s.rainCleared&&!s.candleLit&&s.hands.includes('candle')&&s.hands.includes('glasses')&&nearDig(camera);
      if(wasFocusing&&!s.candleFocusStarted&&!s.candleLit)focusPaused=true;
      // An explicit retry at the sunlight starts a fresh hold, even if a cancel
      // and retry both occur between two rendered frames.
      if(s.candleFocusStarted&&s.candleFocusStarted!==focusStarted){focusPaused=false;focusTime=0;}
      focusStarted=s.candleFocusStarted;
      if(!canFocus)focusPaused=false;
      if(canFocus&&!focusPaused){if(!s.candleFocusStarted&&dt>0)controller.act('focus-candle');focusTime+=dt;if(focusTime>=4.1&&dt>0)controller.act('light-candle');}else{focusTime=0;if(s.candleFocusStarted)controller.act('cancel-candle-focus');}
      wasFocusing=!!s.candleFocusStarted;
      focusRay.visible=!!s.candleFocusStarted;frame(focusRay,camera,0,-.07,-.65);focusRay.rotation.z+=.85;
      if(focusRay.visible&&candleAnchor&&glassesAnchor){focusDirection.subVectors(glassesAnchor,candleAnchor);focusRay.position.copy(candleAnchor).add(glassesAnchor).multiplyScalar(.5);focusRay.scale.y=focusDirection.length()/.45;focusRay.quaternion.setFromUnitVectors(up,focusDirection.normalize());}
      flame.visible=s.candleLit&&s.hands.includes('candle')&&!s.springBookTaken;
      if(flame.visible){flame.position.copy(wick);flame.position.y+=.035;flame.quaternion.copy(camera.quaternion);candleLight.position.copy(flame.position);flameMaterial.uniforms.clock.value=reduced?0:time;flame.scale.set(1+(reduced?0:Math.sin(time*11.3)*.055),1+(reduced?0:Math.sin(time*8.7)*.08),1);}
      const entry=THREE.MathUtils.smoothstep(.315-localWick.z,0,.17);
      candleLighting.update(illuminating?entry*(.16+(reduced?0:Math.sin(time*13.7)*.006+Math.sin(time*7.1)*.004)):0);
      if(s.dumplingEatStarted!==lastEat){lastEat=s.dumplingEatStarted;}void elapsed;
    },
    dispose(){candleLighting.dispose();candleMaterials.clear();locker.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();}
  };
}
