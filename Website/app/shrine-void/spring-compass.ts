import * as THREE from 'three';
import type {SpringSave} from './spring-treasure-state';
import {createSpringGlasses} from './spring-glasses';

/** North in every Spring scene is world -Z, the same direction as the rail. */
export const SPRING_NORTH=new THREE.Vector3(0,0,-1);
export function compassNeedleAngle(rotation:THREE.Quaternion){
  const north=SPRING_NORTH.clone().applyQuaternion(rotation.clone().invert());
  return Math.atan2(-north.x,-north.z);
}

export function createSpringCompass(){
  const group=new THREE.Group();group.name='Working brass magnetic compass';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const brass=new THREE.MeshStandardMaterial({color:0xb79a56,metalness:.86,roughness:.28});
  const dark=new THREE.MeshStandardMaterial({color:0x29291e,metalness:.65,roughness:.36});
  const ivory=new THREE.MeshStandardMaterial({color:0xe9dfb8,roughness:.7,emissive:0x354338,emissiveIntensity:.12});
  const red=new THREE.MeshStandardMaterial({color:0xb52c27,metalness:.42,roughness:.3,emissive:0x4b0806,emissiveIntensity:.12});
  const steel=new THREE.MeshStandardMaterial({color:0xbfcbd0,metalness:.85,roughness:.24});
  const glass=new THREE.MeshPhysicalMaterial({color:0xeaf7ff,transparent:true,opacity:.14,metalness:.05,roughness:.06,clearcoat:1,depthWrite:false});
  [brass,dark,ivory,red,steel,glass].forEach(m=>materials.add(m));
  function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D=group){geometries.add(g);const o=new THREE.Mesh(g,m);o.castShadow=false;parent.add(o);return o;}
  mesh(new THREE.CylinderGeometry(.061,.058,.018,64),brass).position.y=.009;
  mesh(new THREE.CylinderGeometry(.054,.054,.003,64),dark).position.y=.019;
  const dial=mesh(new THREE.CircleGeometry(.0505,64),ivory);dial.rotation.x=-Math.PI/2;dial.position.y=.021;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
    if(c){c.fillStyle='#e9dfb8';c.fillRect(0,0,512,512);c.translate(256,256);
      for(let n=0;n<120;n++){const a=n*Math.PI/60,r=n%10===0?175:n%5===0?184:193;c.strokeStyle='#343b32';c.lineWidth=n%10===0?3:1.5;c.beginPath();c.moveTo(Math.sin(a)*r,-Math.cos(a)*r);c.lineTo(Math.sin(a)*211,-Math.cos(a)*211);c.stroke();}
      c.textAlign='center';c.textBaseline='middle';c.font='600 46px Georgia';for(const [label,x,y] of [['N',0,-134],['E',134,0],['S',0,134],['W',-134,0]] as const){c.fillStyle=label==='N'?'#9b2c21':'#343b32';c.fillText(label,x,y);}
      c.font='17px Georgia';c.fillStyle='#625d43';c.fillText('MAGNETIC',0,71);c.fillText('NORTH',0,93);
      const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);ivory.map=map;ivory.needsUpdate=true;}
  }
  for(const radius of [.055,.060]){const ring=mesh(new THREE.TorusGeometry(radius,.0022,8,64),brass);ring.rotation.x=Math.PI/2;ring.position.y=.023;}
  const needle=new THREE.Group();needle.name='Magnetic north needle';needle.position.y=.025;group.add(needle);
  for(const [sign,m] of [[-1,red],[1,steel]] as const){
    const shape=new THREE.Shape();shape.moveTo(0,sign*.043);shape.lineTo(.007,0);shape.lineTo(0,-sign*.009);shape.lineTo(-.007,0);shape.closePath();
    const half=mesh(new THREE.ExtrudeGeometry(shape,{depth:.0015,bevelEnabled:false}),m,needle);half.rotation.x=Math.PI/2;
  }
  mesh(new THREE.SphereGeometry(.0042,16,10),brass,needle).position.y=.003;
  mesh(new THREE.CylinderGeometry(.052,.052,.0015,64),glass).position.y=.031;
  const loop=mesh(new THREE.TorusGeometry(.013,.0025,8,24),brass);loop.rotation.x=Math.PI/2;loop.position.set(0,.007,.073);
  const lid=mesh(new THREE.CylinderGeometry(.060,.060,.004,64),brass);lid.position.set(0,.065,.060);lid.rotation.x=-1.22;
  const inset=mesh(new THREE.CylinderGeometry(.052,.052,.001,64),dark);inset.position.copy(lid.position).add(new THREE.Vector3(0,.001,-.002));inset.rotation.copy(lid.rotation);
  const orientation=new THREE.Quaternion();let initialized=false;
  return {group,needle,
    update(dt:number){group.updateWorldMatrix(true,false);group.getWorldQuaternion(orientation);const target=compassNeedleAngle(orientation),delta=Math.atan2(Math.sin(target-needle.rotation.y),Math.cos(target-needle.rotation.y));needle.rotation.y+=delta*(initialized?1-Math.exp(-Math.max(0,dt)*9):1);initialized=true;},
    dispose(){group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.clear();},
  };
}

/** Physical keepsakes share one seat; inventory collection hides only that prop. */
export function createSpringJourneyClues(cabin:THREE.Group,seat:THREE.Vector3,glassesModel?:THREE.Object3D){
  const group=new THREE.Group();group.name='The next journey — seat keepsakes';cabin.add(group);
  const compass=createSpringCompass();compass.group.position.copy(seat).add(new THREE.Vector3(.04,.006,.09));compass.group.rotation.y=.28;group.add(compass.group);
  const spectacles=createSpringGlasses(glassesModel);spectacles.group.position.copy(seat).add(new THREE.Vector3(.33,.006,-.025));spectacles.group.rotation.y=-.20;group.add(spectacles.group);
  const paperMaterial=new THREE.MeshStandardMaterial({color:0xe0c99b,roughness:.94,side:THREE.DoubleSide});
  let paperMap:THREE.CanvasTexture|undefined;
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=768;c.height=1024;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#e0c99b';ctx.fillRect(0,0,768,1024);ctx.fillStyle='#514636';ctx.font='italic 46px Georgia';ctx.textAlign='center';['This journey was so short.','','Next, you have to go through','the longest journey we ever had.','','Follow the north rail,','and you may find it.'].forEach((text,i)=>ctx.fillText(text,384,220+i*87,670));paperMap=new THREE.CanvasTexture(c);paperMap.colorSpace=THREE.SRGBColorSpace;paperMaterial.map=paperMap;}}
  const paper=new THREE.Mesh(new THREE.BoxGeometry(.20,.0012,.28),paperMaterial);paper.name='A letter on the bus seat';paper.position.copy(seat).add(new THREE.Vector3(-.20,.004,-.04));paper.rotation.y=-.16;group.add(paper);
  const heldRoot=new THREE.Group();heldRoot.name='Held journey keepsakes';heldRoot.visible=false;
  const held=createSpringCompass();heldRoot.add(held.group);held.group.visible=false;
  const heldSpectacles=createSpringGlasses(glassesModel);heldRoot.add(heldSpectacles.group);heldSpectacles.group.visible=false;
  const p=new THREE.Vector3(),offset=new THREE.Vector3();let focus=0;
  function target(camera:THREE.Camera,ray:THREE.Raycaster,state:SpringSave){
    group.updateWorldMatrix(true,true);
    // Seat backs conceal the cushion from the row behind. Approach this bench
    // from its aisle or front so keepsakes cannot be taken through a backrest.
    const cabinView=cabin.worldToLocal(camera.position.clone());
    if(cabinView.z>seat.z+.22)return null;
    let nearest:{action:string;label:string;distance:number}|null=null;
    for(const [object,action,label,available] of [[paper,'read-journey-note','Read the letter on the seat',!state.journeyNoteRead],[compass.group,'take-compass','Take the brass compass',!state.compassTaken],[spectacles.group,'take-glasses','Take the crystal spectacles',!state.glassesTaken]] as const){
      if(!available)continue;object.getWorldPosition(p);if(camera.position.distanceTo(p)>2.15)continue;
      const hit=ray.intersectObject(object,true)[0];
      const distance=hit?.distance??(ray.ray.distanceToPoint(p)<.085?camera.position.distanceTo(p):Infinity);
      if(Number.isFinite(distance)&&(!nearest||distance<nearest.distance))nearest={action,label,distance};
    }return nearest?{action:nearest.action,label:nearest.label}:null;
  }
  return {group,held:heldRoot,target,
    glassesFocusPosition(target=new THREE.Vector3()){if(!heldSpectacles.group.visible||!heldRoot.visible)return null;heldSpectacles.group.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(heldSpectacles.group).getCenter(target);},
    near(camera:THREE.Camera){cabin.updateWorldMatrix(true,false);cabin.localToWorld(p.copy(seat));return camera.position.distanceTo(p)<2.2;},
    update(dt:number,camera:THREE.PerspectiveCamera,state:SpringSave,inBus:boolean){
      focus=THREE.MathUtils.damp(focus,state.candleFocusStarted?1:0,4,dt);
      paper.visible=inBus&&!state.journeyNoteRead;compass.group.visible=inBus&&!state.compassTaken;spectacles.group.visible=inBus&&!state.glassesTaken;if(compass.group.visible)compass.update(dt);
      const compassHand=state.hands.indexOf('compass'),glassesHand=state.hands.indexOf('glasses');
      heldRoot.visible=(compassHand>=0||glassesHand>=0)&&!['closing','sleeping','return-closing'].includes(state.dreamPhase);
      held.group.visible=compassHand>=0;heldSpectacles.group.visible=glassesHand>=0;
      if(heldRoot.visible){
        if(compassHand>=0){offset.set(compassHand===0?-.22:.22,-.23,-.43).applyQuaternion(camera.quaternion);held.group.position.copy(camera.position).add(offset);held.group.quaternion.copy(camera.quaternion);held.group.rotateX(.82);held.group.scale.setScalar(1.35);held.update(dt);}
        if(glassesHand>=0){offset.set((glassesHand===0?-1:1)*THREE.MathUtils.lerp(.22,.085,focus),THREE.MathUtils.lerp(-.23,.12,focus),THREE.MathUtils.lerp(-.43,-.68,focus)).applyQuaternion(camera.quaternion);heldSpectacles.group.position.copy(camera.position).add(offset);heldSpectacles.group.quaternion.copy(camera.quaternion);heldSpectacles.group.rotateY((glassesHand===0?1:-1)*.16*(1-focus));heldSpectacles.group.rotateX(.4*focus);}
      }
    },
    dispose(){spectacles.dispose();heldSpectacles.dispose();compass.dispose();held.dispose();heldRoot.removeFromParent();heldRoot.clear();paper.geometry.dispose();paperMaterial.dispose();paperMap?.dispose();group.removeFromParent();group.clear();},
  };
}
