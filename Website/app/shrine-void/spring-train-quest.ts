import * as THREE from 'three';
import {paintMirrorWriting,MIRROR_WRITING_DURATION} from './spring-mirror-writing';
import {COACH_EXTENSION,COACH_NORTH,COACH_SOUTH} from './spring-coach-layout';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {SPRING_SL_BAYS,SPRING_NORTH_RAIL,type createSpringNorthTrain} from './spring-north-train';
import type {SpringSave} from './spring-treasure-state';

export const SPRING_TRAIN_CASE_MODEL='/seasons/kit/summer/keepsake-case.glb';
export const SPRING_TRAIN_NUMBERING_REFERENCE='https://sathee.iitk.ac.in/sathee-railway-exams/student-corner/railway-gk/indian-railway-features/operations-train-booking-classes-explained/';
export const SPRING_TRAIN_CASE_BERTH=23;
type Train=ReturnType<typeof createSpringNorthTrain>;
type Controller={snapshot:()=>SpringSave;act:(action:string,value?:unknown)=>boolean};
export interface SpringTrainQuestTarget {id:string;action:string;label:string;value?:unknown;}

/** One eight-berth SL bay repeats nine times: LB, MB, UB, LB, MB, UB, SL, SU. */
export const SPRING_TRAIN_BERTHS=SPRING_SL_BAYS.flatMap(bay=>Array.from({length:8},(_,i)=>({
  number:bay.first+i,bay:bay.bay,z:bay.z,type:(['lower','middle','upper','lower','middle','upper','side-lower','side-upper'] as const)[i],
})));

/** A reusable faceted jewel and real brass key; emissive surfaces need no extra scene light. */
export function createSpringDiamondKey(){
  const group=new THREE.Group();group.name='Diamond treasure key';
  const metal=new THREE.MeshStandardMaterial({color:0xd2af59,metalness:.88,roughness:.24});
  const jewel=new THREE.MeshPhysicalMaterial({color:0x9cefff,emissive:0x42bfe8,emissiveIntensity:.9,metalness:.08,roughness:.12,clearcoat:1});
  const geometries:THREE.BufferGeometry[]=[];
  function part(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z=0){geometries.push(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);group.add(o);return o;}
  part(new THREE.TorusGeometry(.043,.008,8,20),metal,0,.084);
  part(new THREE.CylinderGeometry(.007,.007,.17,10),metal,0,-.025);
  part(new THREE.BoxGeometry(.041,.013,.016),metal,.017,-.086);
  part(new THREE.BoxGeometry(.031,.013,.016),metal,.012,-.112);
  part(new THREE.OctahedronGeometry(.032,0),jewel,0,.084,.008).rotation.z=Math.PI/4;
  part(new THREE.TorusGeometry(.034,.0038,5,12),metal,0,.084,.008);
  return {group,update(time:number){jewel.emissiveIntensity=.85+Math.sin(time*2.2)*.15;},dispose(){geometries.forEach(g=>g.dispose());metal.dispose();jewel.dispose();group.removeFromParent();}};
}

/** Physical clues share the coach's true floor and door pivots. All targets require reach and a ray hit. */
export function createSpringTrainQuest(train:Train,suitcaseModel:THREE.Object3D,controller:Controller){
  const group=new THREE.Group();group.name='Sleeper coach · mushroom numbers and keepsake puzzle';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const floor=train.floorY,rail=SPRING_NORTH_RAIL;
  const material=(p:THREE.MeshStandardMaterialParameters)=>{const m=new THREE.MeshStandardMaterial(p);materials.add(m);return m;};
  const steel=material({color:0xbac3c9,metalness:.8,roughness:.29}),red=material({color:0x9f2828,roughness:.55,metalness:.25}),paper=material({color:0xf3e3ba,roughness:.94,side:THREE.DoubleSide}),ink=material({color:0x65452e,roughness:.9});
  const black=material({color:0x17201f,roughness:.96}),chrome=material({color:0xc2d5dc,metalness:.95,roughness:.15});
  function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D=group){geometries.add(g);const o=new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function box(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=group){const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o;}
  function canvasTexture(w:number,h:number,paint:(c:CanvasRenderingContext2D)=>void){if(typeof document==='undefined')return null;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');if(!c)return null;paint(c);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);return t;}
  const atlas=canvasTexture(1152,1152,c=>{c.clearRect(0,0,1152,1152);c.textAlign='center';c.textBaseline='middle';c.font='bold 76px Arial';for(let n=1;n<=73;n++){const i=n-1,x=i%9*128,y=Math.floor(i/9)*128;c.fillStyle=n===73?'#ffe599':'#b52622';c.fillText(n===73?'S2':String(n),x+64,y+68,118);}});
  const numberMaterial=material({map:atlas,color:0xffffff,transparent:true,depthWrite:false,roughness:.65,emissive:0xffffff,emissiveMap:atlas,emissiveIntensity:.12,side:THREE.DoubleSide});
  const plateParts:THREE.BufferGeometry[]=[],redParts:THREE.BufferGeometry[]=[],numberParts:THREE.BufferGeometry[]=[];
  const transform=new THREE.Object3D();
  function placard(n:number,x:number,y:number,z:number,yaw:number,coach=false){
    const w=coach?.24:.16,h=coach?.24:.085;transform.position.set(x,y,z);transform.rotation.set(0,yaw,0);transform.updateMatrix();
    const plate=new THREE.BoxGeometry(w,h,.009).applyMatrix4(transform.matrix);(coach?redParts:plateParts).push(plate);
    const g=new THREE.PlaneGeometry(w*.9,h*.9),uv=g.getAttribute('uv'),i=n-1;for(let p=0;p<uv.count;p++)uv.setXY(p,((i%9)+uv.getX(p))/9,1-(Math.floor(i/9)+1-uv.getY(p))/9);
    const forward=new THREE.Vector3(0,0,.0055).applyEuler(transform.rotation);transform.position.add(forward);transform.updateMatrix();g.applyMatrix4(transform.matrix);numberParts.push(g);
  }
  const partitionRay=new THREE.Raycaster();train.group.updateMatrixWorld(true);
  function partitionPlate(n:number,x:number,y:number,bayZ:number,north:boolean){
    const direction=north?-1:1;
    partitionRay.set(new THREE.Vector3(x,y,bayZ),new THREE.Vector3(0,0,direction));
    partitionRay.far=2;
    const wall=partitionRay.intersectObject(train.group,true).find(hit=>hit.distance>.8);
    const z=(wall?.point.z??bayZ+direction*1.60)-direction*.007;
    placard(n,x,y,z,north?0:Math.PI);
  }
  for(const berth of SPRING_TRAIN_BERTHS){const i=(berth.number-1)%8;
    // Daytime seating labels sit across the partition above the backrest.
    // The upper berth repeats its own number beside its sleeping surface.
    if(i<6){
      const north=i<3;
      partitionPlate(berth.number,13.28-(i%3)*.52,floor+1.48,berth.z,north);
      if(i%3===2)partitionPlate(berth.number,12.32,floor+2.16,berth.z,north);
    }else{
      // Both facing daytime seats carry their number on the same pale-blue
      // panel. The higher number also identifies the upper sleeping berth.
      partitionPlate(berth.number,10.77,floor+1.55,berth.z,i===6);
      if(i===7)partitionPlate(berth.number,10.77,floor+2.05,berth.z,true);
    }
  }
  for(const z of [-7.86-COACH_EXTENSION,7.86])for(const side of [-1,1])placard(73,12.03,floor+2.13,rail.trainZ+z+(side*.04),side===1?0:Math.PI,true);
  for(const [parts,m,name] of [[plateParts,steel,'Berth plates with upper repeats'],[redParts,red,'Four red coach number plates'],[numberParts,numberMaterial,'Mushroom-revealed berth and coach numbers']] as const){const g=mergeGeometries(parts as THREE.BufferGeometry[],false)!;parts.forEach(p=>p.dispose());mesh(g,m).name=name;}
  const numbers=group.getObjectByName('Mushroom-revealed berth and coach numbers')!;
  numbers.userData.berths=SPRING_TRAIN_BERTHS.map(b=>b.number);numbers.userData.coach='S2';numbers.visible=false;numbers.castShadow=numbers.receiveShadow=false;

  // The note is fixed to the nearest east entrance and follows its original working hinge.
  const entry=train.doors.filter(d=>d.kind==='entry'&&d.side===1).sort((a,b)=>b.closed.max.z-a.closed.max.z)[0];
  const note=new THREE.Group();note.name='Pinned letter on coach entrance';group.add(note);
  const noteGeometry=new THREE.PlaneGeometry(.20,.28,8,12),notePosition=noteGeometry.getAttribute('position');for(let i=0;i<notePosition.count;i++)notePosition.setZ(i,Math.sin(notePosition.getY(i)*18)*.004+Math.pow(notePosition.getX(i),2)*.1);noteGeometry.computeVertexNormals();mesh(noteGeometry,paper,note);
  const noteMap=canvasTexture(384,512,c=>{c.clearRect(0,0,384,512);c.fillStyle='#58432f';c.textAlign='center';c.font='italic 43px Georgia';c.fillText('For my Aamii',192,92,350);c.font='26px Georgia';['I still remember','every little detail.','','Wash your hands,','and come find me.'].forEach((line,i)=>c.fillText(line,192,165+i*47,340));});
  if(noteMap){const m=material({map:noteMap,transparent:true,depthWrite:false,side:THREE.DoubleSide});const words=mesh(new THREE.PlaneGeometry(.19,.25),m,note);words.position.z=.008;}
  box(.023,.009,.009,steel,0,.126,.008,note);
  const entryCenter=entry.closed.getCenter(new THREE.Vector3());note.position.set(entryCenter.x+.06,floor+1.19,entryCenter.z+.20);note.rotation.y=Math.PI/2;group.updateMatrixWorld(true);entry.pivot.attach(note);

  // This is the actual supplied outside washbasin, opposite the boarding side.
  const basinPoint=new THREE.Vector3(11.53,floor+.80,-84.77-COACH_EXTENSION),mirrorPoint=new THREE.Vector3(11.465,floor+1.40,-84.907-COACH_EXTENSION);
  const mirrorYaw=.9,mirrorNormal=new THREE.Vector3(Math.sin(mirrorYaw),0,Math.cos(mirrorYaw));
  const mirror=box(.36,.48,.009,chrome,mirrorPoint.x,mirrorPoint.y,mirrorPoint.z);mirror.rotation.y=mirrorYaw;mirror.name='Wash area mirror';
  const mistCanvas=typeof document!=='undefined'?document.createElement('canvas'):null;
  if(mistCanvas){mistCanvas.width=512;mistCanvas.height=768;}
  const mistMap=mistCanvas?new THREE.CanvasTexture(mistCanvas):null;if(mistMap){mistMap.colorSpace=THREE.SRGBColorSpace;textures.add(mistMap);}
  const mistMaterial=new THREE.MeshBasicMaterial({map:mistMap,color:0xe5eeee,transparent:true,opacity:0,depthWrite:false,side:THREE.FrontSide});materials.add(mistMaterial);
  const mist=mesh(new THREE.PlaneGeometry(.35,.47),mistMaterial);mist.name='Condensation handwriting · S1196';mist.position.copy(mirrorPoint).addScaledVector(mirrorNormal,.009);mist.rotation.y=mirrorYaw;mist.castShadow=false;
  // The original GLB already supplies the tap. Its measured outlet is the
  // start of the stream; adding another tube put a second nozzle in the bowl.
  const streamMaterial=new THREE.MeshBasicMaterial({color:0xc9efff,transparent:true,opacity:.43,depthWrite:false});materials.add(streamMaterial);const stream=mesh(new THREE.CylinderGeometry(.005,.009,.18,6),streamMaterial);stream.name='Tap water';stream.position.set(11.499,train.trainBase+2.303-.09,-84.858-COACH_EXTENSION);stream.visible=false;stream.castShadow=false;
  const washDoor=train.doors.filter(d=>d.kind==='toilet'&&d.side<0&&d.closed.getCenter(new THREE.Vector3()).z<rail.trainZ-COACH_EXTENSION).sort((a,b)=>a.closed.min.z-b.closed.min.z)[0];

  const suitcase=new THREE.Group();suitcase.name='Locked suitcase on side lower 23';group.add(suitcase);
  suitcase.position.set(10.82,floor+.49,SPRING_SL_BAYS[2].z-1.16);suitcase.rotation.y=Math.PI/2;suitcase.scale.setScalar(.84);
  const caseAsset=suitcaseModel.clone(true);suitcase.add(caseAsset);caseAsset.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.geometry=o.geometry.clone();geometries.add(o.geometry);const clone=(m:THREE.Material)=>{const c=m.clone();materials.add(c);return c;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);o.castShadow=o.receiveShadow=true;});
  // GLTFLoader sanitizes authored spaces for animation binding in the browser.
  const casePart=(name:string)=>caseAsset.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name))??caseAsset.getObjectByName(name);
  casePart('Blue Summer book')?.removeFromParent();casePart('Dry letter')?.removeFromParent();
  const lid=casePart('Case lid hinge');
  box(.63,.009,.37,black,0,.275,0,suitcase);
  const key=createSpringDiamondKey();suitcase.add(key.group);key.group.position.set(.15,.300,-.01);key.group.rotation.set(-Math.PI/2,0,.1);key.group.scale.setScalar(.79);
  const letter=box(.245,.004,.28,paper,-.14,.289,-.005,suitcase);letter.name='Letter beneath the suitcase lid';
  for(let i=0;i<6;i++)box(.17-(i%3)*.016,.001,.002,ink,0,.003,-.085+i*.025,letter);
  const wheels:THREE.Mesh[]=[],wheelFaces:THREE.Mesh[]=[];
  const wheelMaps=[['S','C','E','A','D'],Array.from({length:10},(_,i)=>String(i))];
  const housing=box(.302,.115,.022,black,0,.184,.252,suitcase);housing.name='Built-in combination lock housing';
  for(let i=0;i<5;i++){
    const symbols=wheelMaps[i===0?0:1],map=canvasTexture(symbols.length*96,128,c=>{c.fillStyle='#c7cbc1';c.fillRect(0,0,symbols.length*96,128);c.textAlign='center';c.textBaseline='middle';c.fillStyle='#15231f';c.font='bold 82px Arial';symbols.forEach((v,j)=>{c.fillText(v,j*96+48,67);c.strokeStyle='#939b91';c.lineWidth=3;c.strokeRect(j*96+1,1,94,126);});});
    const wheel=mesh(new THREE.CylinderGeometry(.038,.038,.043,24,1,false),steel,suitcase);wheel.name=`Combination wheel ${i+1}`;wheel.position.set(-.10+i*.05,.184,.277);wheel.rotation.z=-Math.PI/2;wheels.push(wheel);
    // The viewing window is flush with the barrel. Its atlas shows the selected
    // face upright, including on small screens, while the barrel visibly turns.
    const faceMaterial=material({map,color:0xffffff,metalness:.12,roughness:.6,emissive:0xb4c6ad,emissiveIntensity:.13});
    const face=mesh(new THREE.PlaneGeometry(.039,.058),faceMaterial,suitcase);face.name=`Lock wheel ${i+1} viewing window`;face.position.set(-.10+i*.05,.184,.316);face.castShadow=false;wheelFaces.push(face);
  }
  box(.277,.012,.016,steel,0,.229,.285,suitcase);box(.277,.012,.016,steel,0,.139,.285,suitcase);
  const markers=box(.009,.012,.008,red,0,.231,.296,suitcase);markers.name='Lock alignment notch';
  const clasp=box(.072,.073,.026,material({color:0xc5a45c,metalness:.72,roughness:.32}),.223,.184,.28,suitcase);clasp.name='Pressable brass suitcase clasp';
  // These keepsakes sit inside the same night-time coach as the upholstery.
  // Share its scoped lamps so the paper, silver plates and combination wheels
  // remain readable without adding global lights to every tree in the grove.
  const litMaterials=new Set<THREE.MeshStandardMaterial>();
  for(const root of [group,note])root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial&&!litMaterials.has(m)){litMaterials.add(m);train.bindLighting(m);}});
  const targetBounds=new THREE.Box3(),hit=new THREE.Vector3(),washBounds=new THREE.Box3().setFromCenterAndSize(basinPoint,new THREE.Vector3(.43,.43,.46));
  function hitReach(camera:THREE.Camera,ray:THREE.Raycaster,bounds:THREE.Box3,reach=2.05){const p=ray.ray.intersectBox(bounds,hit);return p&&camera.position.distanceTo(p)<=reach?camera.position.distanceTo(p):Infinity;}
  function target(camera:THREE.Camera,ray:THREE.Raycaster,state=controller.snapshot()):SpringTrainQuestTarget|null{
    if(!state.dreamReturned||state.adaviActive||state.dreamPhase!=='awake'||state.trainNoteOpen||state.trainCaseOpen||(camera.position.z<COACH_NORTH-2||camera.position.z>COACH_SOUTH+2)||Math.abs(camera.position.x-rail.x)>4)return null;
    group.updateMatrixWorld(true);note.updateWorldMatrix(true,true);let nearest=Infinity,result:SpringTrainQuestTarget|null=null;
    function offer(distance:number,id:string,action:string,label:string,value?:unknown){if(distance<nearest){nearest=distance;result={id,action,label,value};}}
    offer(hitReach(camera,ray,targetBounds.setFromObject(note).expandByScalar(.025)), 'train-note','read-train-note','Read the entrance letter');
    if(train.inside(camera.position.x,camera.position.z)){
      offer(hitReach(camera,ray,washBounds),'train-basin','wash-hands',state.handsWashed?'Wash hands again':'Wash your hands');
      const distance=hitReach(camera,ray,targetBounds.setFromObject(suitcase).expandByScalar(.018),1.95);
      if(!state.trainLockOpen)offer(distance,'train-case','open-train-case','Examine the suitcase lock');
      else if(lid&&Math.abs(lid.rotation.x)>1.1){
        if(!state.treasureKeyTaken)offer(hitReach(camera,ray,targetBounds.setFromObject(key.group).expandByScalar(.055)), 'train-treasure-key','take-treasure-key','Take the diamond key');
        offer(hitReach(camera,ray,targetBounds.setFromObject(letter).expandByScalar(.025)),'train-letter','read-train-letter','Read the suitcase letter');
      }
    }
    return result;
  }
  function canAct(action:string,camera:THREE.Camera,state=controller.snapshot()){
    if(!state.dreamReturned||state.adaviActive||state.dreamPhase!=='awake')return false;
    if(action==='read-train-note'){note.updateWorldMatrix(true,true);return targetBounds.setFromObject(note).distanceToPoint(camera.position)<=2.05;}
    if(!train.inside(camera.position.x,camera.position.z))return false;
    if(action==='wash-hands')return washBounds.distanceToPoint(camera.position)<=2.05;
    group.updateMatrixWorld(true);
    if(['open-train-case','turn-train-wheel','unlock-train-case'].includes(action))return targetBounds.setFromObject(suitcase).distanceToPoint(camera.position)<=1.95;
    if(!state.trainLockOpen||lid&&Math.abs(lid.rotation.x)<=1.1)return false;
    if(action==='take-treasure-key')return !state.treasureKeyTaken&&targetBounds.setFromObject(key.group).distanceToPoint(camera.position)<=2.05;
    if(action==='read-train-letter')return targetBounds.setFromObject(letter).distanceToPoint(camera.position)<=2.05;
    return false;
  }
  const lockLook=new THREE.Vector3(),lockEye=new THREE.Vector3(),screenPoint=new THREE.Vector3();let walkingZoom:number|null=null;
  /** Frame the actual lock without changing the player's saved walking pose. */
  function focusLock(camera:THREE.PerspectiveCamera,state=controller.snapshot()){
    if(!state.trainCaseOpen){if(walkingZoom!==null){camera.zoom=walkingZoom;camera.updateProjectionMatrix();walkingZoom=null;}return;}
    if(walkingZoom===null)walkingZoom=camera.zoom;
    const distance=.55;
    camera.zoom=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect/.44;camera.updateProjectionMatrix();
    suitcase.updateWorldMatrix(true,false);
    suitcase.localToWorld(lockLook.set(.055,.184,.306));
    suitcase.localToWorld(lockEye.set(.055,.219,.306+distance));
    camera.position.copy(lockEye);camera.lookAt(lockLook);camera.updateMatrixWorld(true);
  }
  let revealStarted=controller.snapshot().trainMirrorRevealed?-MIRROR_WRITING_DURATION:NaN,drawnFrame=-1;
  let washStarted=-100,wasWashed=false,lastState=controller.snapshot(),mistAlpha=0,lastTime=0;
  function update(time:number,dt:number,_camera:THREE.Camera,state=controller.snapshot()){
    lastTime=time;lastState=state;numbers.visible=state.hands.includes('mushroom-toy');
    if(state.handsWashed&&!wasWashed)washStarted=time;wasWashed=state.handsWashed;
    stream.visible=state.dreamReturned&&time-washStarted<2.6;stream.scale.x=stream.scale.z=.85+Math.sin(time*42)*.15;
    if(state.handsWashed&&!state.trainMirrorRevealed&&washDoor&&washDoor.open>.2)controller.act('reveal-train-mirror');
    mistAlpha=THREE.MathUtils.damp(mistAlpha,state.trainMirrorRevealed?.94:0,1.9,Math.min(dt,.08));mistMaterial.opacity=mistAlpha;mist.visible=mistAlpha>.002;
    if(state.trainMirrorRevealed&&Number.isNaN(revealStarted))revealStarted=time;
    const age=Number.isNaN(revealStarted)?0:typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?MIRROR_WRITING_DURATION:Math.max(0,time-revealStarted),frame=Math.floor(Math.min(MIRROR_WRITING_DURATION,age)*24);
    if(mistCanvas&&frame!==drawnFrame){drawnFrame=frame;paintMirrorWriting(mistCanvas,age);if(mistMap)mistMap.needsUpdate=true;}
    const priorLid=lid?.rotation.x??0;
    if(lid){lid.rotation.x=THREE.MathUtils.damp(lid.rotation.x,state.trainLockOpen?-1.78:0,4.7,Math.min(dt,.08));if(Math.abs(lid.rotation.x-(state.trainLockOpen?-1.78:0))<.0001)lid.rotation.x=state.trainLockOpen?-1.78:0;}
    const showing=state.trainLockOpen&&(!lid||Math.abs(lid.rotation.x)>1.1);key.group.visible=showing&&!state.treasureKeyTaken;letter.visible=showing;
    for(let i=0;i<wheels.length;i++){const count=i===0?5:10,target=-(state.trainLockWheels[i]+.5)*Math.PI*2/count;wheels[i].rotation.x=THREE.MathUtils.damp(wheels[i].rotation.x,target,12,Math.min(dt,.08));wheels[i].userData.symbol=wheelMaps[i===0?0:1][state.trainLockWheels[i]];
      if(wheelFaces[i].userData.value!==state.trainLockWheels[i]){const uv=wheelFaces[i].geometry.getAttribute('uv'),value=state.trainLockWheels[i];for(let n=0;n<uv.count;n++)uv.setX(n,(value+(n%2))/count);uv.needsUpdate=true;wheelFaces[i].userData.value=value;}
    }
    if(state.trainCaseOpen&&typeof window!=='undefined'){
      group.updateMatrixWorld(true);_camera.updateMatrixWorld(true);
      const points=[...wheelFaces,clasp].map(object=>{object.getWorldPosition(screenPoint).project(_camera);return {x:(screenPoint.x+1)*50,y:(1-screenPoint.y)*50,width:0};});
      const spacing=Math.abs(points[1].x-points[0].x);
      points.forEach(p=>p.width=spacing*.94);
      window.dispatchEvent(new CustomEvent('spring-suitcase-layout',{detail:points}));
    }
    key.update(time);return !!lid&&Math.abs(lid.rotation.x-priorLid)>.00001;
  }
  return {group,numbers,note,mirror,mist,suitcase,lid,wheels,wheelFaces,clasp,key:key.group,letter,basinPoint,mirrorPoint,washDoor,casePosition:suitcase.position.clone(),target,canAct,focusLock,update,
    interact(action:string,value?:unknown){if(action==='wash-hands'&&lastState.handsWashed)washStarted=lastTime;return controller.act(action,value);},
    dispose(){note.removeFromParent();key.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();},
  };
}
