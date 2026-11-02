import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {adaviGround} from './spring-adavi-environment';
import type {SpringBagItem,SpringBagPlacement,SpringSave} from './spring-treasure-state';

export const SPRING_BACKPACK_HOME:SpringBagPlacement={world:'adavi',x:192.5,z:8,yaw:.55};

/** One physical backpack, shared by Spring and Adavi; carrying never creates a second copy. */
export function createSpringBackpack(models:Record<string,THREE.Object3D>,cloth:THREE.Texture,paper:THREE.Texture,reduced:boolean,ground:(place:SpringBagPlacement)=>number){
  const group=new THREE.Group();group.name='Spring backpack and held keepsakes';
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const keep=<T extends THREE.BufferGeometry>(value:T)=>{geometries.add(value);return value;};
  const mat=<T extends THREE.Material>(value:T)=>{materials.add(value);return value;};
  const mesh=(parent:THREE.Object3D,geometry:THREE.BufferGeometry,material:THREE.Material,x=0,y=0,z=0)=>{const object=new THREE.Mesh(keep(geometry),material);object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;parent.add(object);return object;};
  const box=(parent:THREE.Object3D,w:number,h:number,d:number,material:THREE.Material,x=0,y=0,z=0,r=.035)=>mesh(parent,new RoundedBoxGeometry(w,h,d,4,Math.min(r,w*.4,h*.4,d*.4)),material,x,y,z);
  const tube=(parent:THREE.Object3D,points:number[][],radius:number,material:THREE.Material)=>mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number]))),32,radius,8,false),material);
  const fabric=mat(new THREE.MeshStandardMaterial({map:cloth,color:0x697359,roughness:.94}));
  const trim=mat(new THREE.MeshStandardMaterial({color:0x354136,roughness:.88}));
  const lining=mat(new THREE.MeshStandardMaterial({color:0x202b25,roughness:1,side:THREE.DoubleSide}));
  const stitch=mat(new THREE.MeshStandardMaterial({color:0xa5ad8c,roughness:1}));
  const metal=mat(new THREE.MeshStandardMaterial({color:0xb4aa88,metalness:.65,roughness:.46}));
  const bag=new THREE.Group();bag.name='Physical canvas backpack';group.add(bag);
  // Padded panels surround an actual open compartment instead of a solid bag-shaped box.
  box(bag,.66,.72,.095,fabric,0,.40,-.17,.045);
  box(bag,.075,.63,.35,fabric,-.30,.355,0,.03);box(bag,.075,.63,.35,fabric,.30,.355,0,.03);
  box(bag,.63,.10,.37,trim,0,.075,0,.035);
  box(bag,.60,.56,.065,fabric,0,.32,.16,.04);
  box(bag,.51,.035,.27,lining,0,.14,0,.015);
  box(bag,.49,.44,.014,lining,0,.39,-.111,.01);
  // Front zipped pocket, binding and zipper teeth.
  box(bag,.46,.27,.095,fabric,0,.285,.226,.045);
  box(bag,.42,.014,.018,trim,0,.405,.28,.005);
  for(let n=0;n<25;n++)box(bag,.006,.016,.012,metal,-.195+n*.016,.405,.291,.002);
  const zip=box(bag,.028,.055,.015,metal,.12,.383,.302,.007);zip.rotation.z=-.2;
  tube(bag,[[-.22,.16,.279],[-.23,.30,.279],[-.20,.40,.279],[.20,.40,.279],[.23,.30,.279],[.22,.16,.279]],.0035,stitch);
  for(const side of [-1,1]){
    tube(bag,[[side*.19,.70,-.23],[side*.28,.60,-.38],[side*.28,.24,-.42],[side*.19,.13,-.22]],.042,trim);
    tube(bag,[[side*.20,.69,-.263],[side*.265,.56,-.405],[side*.265,.28,-.44],[side*.19,.16,-.25]],.006,stitch);
    box(bag,.075,.052,.018,metal,side*.21,.18,-.29,.008);
    box(bag,.025,.28,.012,trim,side*.22,.22,-.30,.005);
    box(bag,.075,.26,.14,fabric,side*.34,.24,.005,.025);
  }
  tube(bag,[[-.10,.73,-.16],[-.10,.87,-.16],[.10,.87,-.16],[.10,.73,-.16]],.017,trim);
  const lid=new THREE.Group();lid.name='Backpack hinged top';lid.position.set(0,.65,-.17);bag.add(lid);
  box(lid,.61,.16,.36,fabric,0,.065,.17,.065);
  tube(lid,[[-.27,.075,.02],[-.29,.075,.29],[-.22,.075,.35],[.22,.075,.35],[.29,.075,.29],[.27,.075,.02]],.006,trim);
  const rim=new THREE.Group();rim.name='Open backpack rim';bag.add(rim);
  for(const x of [-.285,.285])box(rim,.027,.028,.32,trim,x,.65,0,.01);
  for(const z of [-.15,.15])box(rim,.55,.028,.027,trim,0,.65,z,.01);
  const contents=new THREE.Group();contents.name='Backpack contents';bag.add(contents);
  function imported(key:string,parent:THREE.Object3D,size:number){
    const source=models[key],root=new THREE.Group();root.name=key;parent.add(root);if(!source)return root;
    const clone=source.clone(true),bounds=new THREE.Box3().setFromObject(clone),dimensions=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    clone.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));root.add(clone);root.scale.setScalar(size/Math.max(dimensions.x,dimensions.z));
    clone.traverse(object=>{if(!(object instanceof THREE.Mesh))return;object.castShadow=object.receiveShadow=true;const copy=(material:THREE.Material)=>mat(material.clone());object.material=Array.isArray(object.material)?object.material.map(copy):copy(object.material);});return root;
  }
  const mushroom=imported('mushroom-toy',contents,.20);mushroom.position.set(-.15,.53,-.02);
  const candle=imported('candle',contents,.12);candle.position.set(.15,.53,-.015);
  let noteMap=paper;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1280;const ink=canvas.getContext('2d');
    if(ink){ink.fillStyle='#f0e7cf';ink.fillRect(0,0,1024,1280);ink.strokeStyle='#d2c7ac';ink.lineWidth=2;for(let y=300;y<1100;y+=112){ink.beginPath();ink.moveTo(74,y);ink.lineTo(950,y);ink.stroke();}ink.fillStyle='#344532';ink.font='72px "Spring Hand", cursive';ink.fillText('A little further, together.',78,204);ink.font='68px "Spring Hand", cursive';['Go back to the overworld','and enjoy the view','near the bridge.'].forEach((line,i)=>ink.fillText(line,78,448+i*142));ink.fillText('— Syamu',610,1020);noteMap=new THREE.CanvasTexture(canvas);noteMap.colorSpace=THREE.SRGBColorSpace;textures.add(noteMap);}
  }
  const noteMaterial=mat(new THREE.MeshBasicMaterial({map:noteMap,color:0xffffff,side:THREE.DoubleSide}));
  const foldedNote=mesh(contents,new THREE.BoxGeometry(.13,.18,.009),noteMaterial,.02,.65,-.055);foldedNote.name='Folded backpack note';foldedNote.rotation.set(-.15,0,.08);
  const heldItems=new THREE.Group();heldItems.name='Held backpack keepsake';group.add(heldItems);
  const heldMushroom=imported('mushroom-toy',heldItems,.22),heldCandle=imported('candle',heldItems,.12);
  const candleBounds=new THREE.Box3().setFromObject(heldCandle),candleTip=new THREE.Object3D();candleTip.name='Candle wick flame anchor';
  candleTip.position.set(0,(Number.isFinite(candleBounds.max.y)?candleBounds.max.y+.006:.23)/heldCandle.scale.y,0);heldCandle.add(candleTip);
  const heldNote=mesh(heldItems,new THREE.PlaneGeometry(.385,.48),noteMaterial);heldNote.name='Held backpack note';
  const otherItems=heldItems.clone(true);otherItems.name='Other hand backpack keepsake';group.add(otherItems);
  const heldFrames=[heldItems,otherItems];
  const glowMaterial=mat(new THREE.MeshBasicMaterial({color:0xe5c8ff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  const glow=mesh(group,new THREE.RingGeometry(.30,.75,48),glowMaterial);glow.rotation.x=-Math.PI/2;glow.castShadow=false;
  const raySphere=new THREE.Sphere(),rayHit=new THREE.Vector3(),point=new THREE.Vector3();
  let reveal=0,open=0,time=0,focus=0,lastRevealed=false,lastRevision='';
  const placement=(state:SpringSave)=>state.bagPlacement??SPRING_BACKPACK_HOME;
  function near(camera:THREE.Camera,state:SpringSave,currentWorld:'spring'|'adavi'){
    const place=placement(state);return !state.bagHeld&&!state.storageSlots?.includes('backpack')&&place.world===currentWorld&&Math.hypot(camera.position.x-place.x,camera.position.z-place.z)<2.4;
  }
  return {group,bag,
    placeCandleWick(position:THREE.Vector3,rotation:THREE.Quaternion){
      const frame=heldFrames.find(frame=>frame.visible&&frame.children[1].visible),anchor=frame?.getObjectByName('Candle wick flame anchor');if(!frame||!anchor)return;
      const parentRotation=frame.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();frame.quaternion.copy(parentRotation).multiply(rotation);
      frame.updateWorldMatrix(true,true);const current=anchor.getWorldPosition(new THREE.Vector3()),origin=frame.getWorldPosition(new THREE.Vector3());
      frame.position.copy(frame.parent!.worldToLocal(origin.add(position).sub(current)));frame.updateWorldMatrix(false,true);
    },
    candleFlamePosition(target=new THREE.Vector3()){const frame=heldFrames.find(frame=>frame.visible&&frame.children[1].visible);const anchor=frame?.getObjectByName('Candle wick flame anchor');if(!anchor)return null;anchor.updateWorldMatrix(true,false);return anchor.getWorldPosition(target);},
    get ready(){return reveal>1.15;},
    near,
    target(camera:THREE.Camera,ray:THREE.Raycaster,state:SpringSave,currentWorld:'spring'|'adavi'){
      if(!state.bagRevealed||state.bagHeld||state.bagNoteOpen||state.skipPhase!=='exploring'||!this.ready||!near(camera,state,currentWorld))return null;
      const place=placement(state);raySphere.set(new THREE.Vector3(place.x,ground(place)+.43,place.z),.58);
      return ray.ray.intersectSphere(raySphere,rayHit)?{id:'backpack',label:'Pick up backpack',action:'take-bag',payload:undefined}:null;
    },
    update(dt:number,state:SpringSave,camera:THREE.Camera,currentWorld:'spring'|'adavi'){
      if(!reduced)time+=dt;
      focus=THREE.MathUtils.damp(focus,state.candleFocusStarted?1:0,reduced?35:4,dt);
      if(state.bagRevealed&&!lastRevealed)reveal=state.bagTaken?2:0;
      if(state.bagRevealed)reveal+=dt;
      const place=placement(state),floor=ground(place),u=Math.min(1,reveal/(reduced?.15:1.25));
      bag.visible=state.bagRevealed&&(state.bagHeld||!state.storageSlots?.includes('backpack')&&place.world===currentWorld);
      if(state.bagHeld){
        bag.position.copy(camera.getWorldPosition(point));bag.quaternion.copy(camera.quaternion);
        const aside=state.bagOpen||!!state.bagItemHeld;bag.translateX(aside?-.32:.23);bag.translateY(aside?-.67:-.63);bag.translateZ(aside?-1.28:-1.18);bag.rotateX(.18);bag.scale.setScalar(.83);
      }else{bag.position.set(place.x,floor+(1-u)*.50,place.z);bag.rotation.set(0,place.yaw+(1-u)*Math.PI*2,0);bag.scale.setScalar(.001+u*u*(3-2*u)*.999);}
      open=THREE.MathUtils.damp(open,state.bagHeld&&state.bagOpen?1:0,reduced?35:10,dt);lid.rotation.x=-open*1.85;
      contents.visible=open>.20;mushroom.visible=!state.bagItemsTaken.includes('mushroom-toy');candle.visible=!state.bagItemsTaken.includes('candle');foldedNote.visible=!state.bagItemsTaken.includes('note');contents.position.y=open*.16;
      mushroom.rotation.y=.14;
      heldFrames.forEach((frame,index)=>{const item=state.hands?.[index];frame.visible=item==='mushroom-toy'||item==='candle'||item==='note';frame.children[0].visible=item==='mushroom-toy';frame.children[1].visible=item==='candle';frame.children[2].visible=item==='note';if(!frame.visible)return;frame.position.copy(camera.getWorldPosition(point));frame.quaternion.copy(camera.quaternion);const reading=item==='note'&&state.bagNoteOpen,focusing=item==='candle'?focus:0,side=index===0?-1:1;frame.translateX(reading?0:side*THREE.MathUtils.lerp(.31,.085,focusing));frame.translateY(reading?-.015:THREE.MathUtils.lerp(-.20+Math.sin(time*1.3)*.005,-.15,focusing));frame.translateZ(reading?-.67:THREE.MathUtils.lerp(-.72,-.68,focusing));if(!reading)frame.rotateY(side*THREE.MathUtils.lerp(-.24,0,focusing));});
      glow.visible=bag.visible&&!state.bagHeld&&reveal<2.7;glow.position.set(place.x,floor+.018,place.z);glow.scale.setScalar(.7+u*.6);glowMaterial.opacity=Math.max(0,Math.sin(Math.min(1,reveal/2.7)*Math.PI)*.65);
      const revision=[state.bagHeld,state.bagRevealed,state.bagOpen,place.world,place.x,place.z,state.bagItemsTaken.join(',')].join(':');
      if(revision!==lastRevision){bag.traverse(object=>{if(object instanceof THREE.Mesh)object.castShadow=!state.bagHeld;});group.parent?.traverse(object=>{if(object instanceof THREE.DirectionalLight)object.shadow.needsUpdate=true;});lastRevision=revision;}
      lastRevealed=state.bagRevealed;
    },
    dispose(){geometries.forEach(resource=>resource.dispose());materials.forEach(resource=>resource.dispose());textures.forEach(resource=>resource.dispose());group.removeFromParent();group.clear();}
  };
}
