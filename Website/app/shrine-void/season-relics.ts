import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {groundHeight,type SeasonLayout} from './season-layout';
import {relicPlacement,CHEST_SCALE} from './season-relic-placement';
import {createRelicState,relicSmooth,type RelicAction,type RelicStorage} from './season-relic-state';
import type {SeasonId} from './seasons';
import type {ModelPart} from './assets';

export interface RelicHUD{hasKey:boolean;hasBook:boolean;busy:boolean;action:string;stage:string;readerReady:boolean;heldObject?:string;canPick?:boolean;canDrop?:boolean;canInteract?:boolean;}
export interface RelicMaterials{wood:THREE.Texture;cloth:THREE.Texture;paper:THREE.Texture;stone:ModelPart;}

/** One grounded chest and key, plus the existing hardcover book; no second WebGL renderer. */
export function createSeasonRelics(id:SeasonId,layout:SeasonLayout,bookSource:THREE.Object3D,chapterCover:THREE.Texture,reduced:boolean,storage?:RelicStorage,surfaces?:RelicMaterials,quest=false){
  const group=new THREE.Group();group.name=`${id} · locked book chest and key`;
  const state=createRelicState(id,reduced,storage),placement=relicPlacement(id,layout.prop),ownedMaterials:THREE.Material[]=[],ownedGeometries:THREE.BufferGeometry[]=[];
  const makeMaterial=(colour:number,roughness=.7,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color:colour,roughness,metalness});ownedMaterials.push(m);return m;};
  const wood=makeMaterial(id==='summer'?0x765038:0x543825,.76),brass=makeMaterial(0xb99550,.34,.72),lining=makeMaterial(id==='winter'?0x24394b:id==='autumn'?0x572b2a:0x243b33,1),paper=makeMaterial(0xe7dece,.96);
  if(surfaces){
    wood.map=wood.bumpMap=surfaces.wood;wood.bumpScale=.003;wood.color.set(quest?0x171c1b:id==='summer'?0xd9c7aa:0xbdb5a8);
    lining.map=lining.bumpMap=surfaces.cloth;lining.bumpScale=.0012;
    paper.map=paper.bumpMap=surfaces.paper;paper.bumpScale=.0006;
  }
  brass.onBeforeCompile=s=>{s.vertexShader='varying vec3 hardwareLocal;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nhardwareLocal=position;');s.fragmentShader='varying vec3 hardwareLocal;\n'+s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+sin(hardwareLocal.x*830.+hardwareLocal.y*143.)*.045,.2,.65);');};
  wood.onBeforeCompile=s=>{s.vertexShader='varying vec3 chestGrain;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nchestGrain=position;');s.fragmentShader='varying vec3 chestGrain;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=sin(chestGrain.x*113.+sin(chestGrain.y*29.+chestGrain.z*13.)*2.);diffuseColor.rgb*=.94+grain*.06;');};
  const chest=new THREE.Group();chest.name='Locked wooden book chest';chest.position.set(placement.chest.x,groundHeight(id,placement.chest.x,placement.chest.z),placement.chest.z);chest.scale.setScalar(CHEST_SCALE);group.add(chest);
  const cx=placement.chest.x,cz=placement.chest.z,chestNormal=new THREE.Vector3(groundHeight(id,cx-.18,cz)-groundHeight(id,cx+.18,cz),.36,groundHeight(id,cx,cz-.18)-groundHeight(id,cx,cz+.18)).normalize();
  chest.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),chestNormal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),placement.yaw));
  const landAt=(x:number,z:number)=>{const offset=new THREE.Vector3(x*CHEST_SCALE,0,z*CHEST_SCALE).applyQuaternion(chest.quaternion);return groundHeight(id,cx+offset.x,cz+offset.z)-offset.y;};
  chest.position.y=Math.max(...[-.49,.49].flatMap(x=>[-.345,.345].map(z=>landAt(x,z))))+.008;
  const bodyParts:THREE.BufferGeometry[]=[],trimParts:THREE.BufferGeometry[]=[];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,target:THREE.BufferGeometry[])=>{const g=new RoundedBoxGeometry(w,h,d,1,.008);g.translate(x,y,z);target.push(g);};
  box(.98,.09,.69,0,.075,0,bodyParts);box(.055,.40,.69,-.462,.30,0,bodyParts);box(.055,.40,.69,.462,.30,0,bodyParts);box(.87,.40,.055,0,.30,-.317,bodyParts);box(.87,.40,.055,0,.30,.317,bodyParts);
  for(const x of [-.40,.40])for(const z of [-.25,.25]){const bottom=(landAt(x,z)-chest.position.y-.006)/(CHEST_SCALE*chestNormal.y),height=.045-bottom;box(.095,height,.105,x,(.045+bottom)/2,z,bodyParts);}
  for(const x of [-.32,.32]){box(.055,.42,.02,x,.30,.35,trimParts);box(.055,.42,.02,x,.30,-.35,trimParts);}
  for(const z of [-.30,.30])box(.98,.035,.035,0,.095,z,trimParts);
  function merged(parts:THREE.BufferGeometry[],material:THREE.Material,parent:THREE.Object3D){const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());ownedGeometries.push(g);const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const body=merged(bodyParts,wood,chest);merged(trimParts,brass,chest);
  const bedGeometry=new THREE.BoxGeometry(.84,.035,.54);ownedGeometries.push(bedGeometry);const bed=new THREE.Mesh(bedGeometry,lining);bed.position.y=.14;bed.receiveShadow=true;chest.add(bed);
  const lid=new THREE.Group();lid.name='Hinged chest lid';lid.position.set(0,.51,-.34);chest.add(lid);
  const lidParts:THREE.BufferGeometry[]=[],lidTrim:THREE.BufferGeometry[]=[];
  box(1,.095,.71,0,.035,.34,lidParts);for(const x of [-.32,.32]){box(.055,.018,.72,x,.092,.34,lidTrim);box(.055,.11,.018,x,.035,.70,lidTrim);}
  merged(lidParts,wood,lid);merged(lidTrim,brass,lid);
  const rivetGeometry=new THREE.SphereGeometry(.013,6,4);ownedGeometries.push(rivetGeometry);const rivets=new THREE.InstancedMesh(rivetGeometry,brass,28),transform=new THREE.Object3D();
  let rivet=0;for(const x of [-.32,.32])for(let i=0;i<7;i++)for(const side of [-1,1]){transform.position.set(x,.14+i*.05,side*.365);transform.updateMatrix();rivets.setMatrixAt(rivet++,transform.matrix);}rivets.computeBoundingSphere();chest.add(rivets);
  const lock=new THREE.Group();lock.name='Brass padlock';lock.position.set(0,.38,.382);chest.add(lock);
  const lockBodyGeometry=new RoundedBoxGeometry(.14,.16,.07,2,.015),shackleGeometry=new THREE.TorusGeometry(.045,.009,6,12,Math.PI);ownedGeometries.push(lockBodyGeometry,shackleGeometry);
  lock.add(new THREE.Mesh(lockBodyGeometry,brass));const shackle=new THREE.Mesh(shackleGeometry,brass);shackle.position.set(0,.095,0);lock.add(shackle);
  const keyholeMaterial=makeMaterial(0x100f0e,.85),keyholeGeometry=new THREE.CircleGeometry(.016,10);ownedGeometries.push(keyholeGeometry);const keyhole=new THREE.Mesh(keyholeGeometry,keyholeMaterial);keyhole.position.set(0,0,.036);lock.add(keyhole);

  const keyParts:THREE.BufferGeometry[]=[];const bow=new THREE.TorusGeometry(.046,.012,6,16);bow.translate(0,.11,0);keyParts.push(bow);
  box(.022,.145,.018,0,.025,0,keyParts);box(.055,.018,.022,.023,-.042,0,keyParts);box(.04,.018,.022,.015,-.012,0,keyParts);
  const keyFaces=keyParts.map(g=>g.index?g.toNonIndexed():g),keyGeometry=mergeGeometries(keyFaces)!;new Set([...keyParts,...keyFaces]).forEach(g=>g.dispose());ownedGeometries.push(keyGeometry);
  const key=new THREE.Mesh(keyGeometry,brass);key.name='Small brass chest key';key.scale.setScalar(.82);group.add(key);
  const keyStoneGeometry=surfaces?.stone.geometry.clone()??new THREE.DodecahedronGeometry(.16,0);
  let stoneMaterial:THREE.MeshStandardMaterial,stoneTop=.13;
  if(surfaces){keyStoneGeometry.computeBoundingBox();const bounds=keyStoneGeometry.boundingBox!,size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());keyStoneGeometry.translate(-centre.x,-bounds.min.y,-centre.z);keyStoneGeometry.scale(.32/Math.max(size.x,size.z),.11/size.y,.32/Math.max(size.x,size.z));stoneMaterial=surfaces.stone.material.clone();ownedMaterials.push(stoneMaterial);stoneTop=.11;}
  else{keyStoneGeometry.scale(1,.45,.8);stoneMaterial=makeMaterial(0x756e60,.94);}
  ownedGeometries.push(keyStoneGeometry);const keyStone=new THREE.Mesh(keyStoneGeometry,stoneMaterial);keyStone.name='Scanned stone key rest';keyStone.position.set(placement.key.x,groundHeight(id,placement.key.x,placement.key.z)+(surfaces?-.014:.045),placement.key.z);keyStone.receiveShadow=true;group.add(keyStone);
  const keyGlintGeometry=new THREE.PlaneGeometry(.24,.24);ownedGeometries.push(keyGlintGeometry);
  const keyGlintMaterial=new THREE.ShaderMaterial({uniforms:{power:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 glintUv;void main(){glintUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 glintUv;uniform float power;void main(){float r=length(glintUv),star=exp(-abs(glintUv.x)*38.)*exp(-abs(glintUv.y)*4.)+exp(-abs(glintUv.y)*38.)*exp(-abs(glintUv.x)*4.);float a=(star*.45+exp(-r*r*12.)*.15)*power;gl_FragColor=vec4(vec3(1.,.77,.32)*a,a);}',
  });ownedMaterials.push(keyGlintMaterial);const glint=new THREE.Mesh(keyGlintGeometry,keyGlintMaterial);glint.userData.skipOceanReflection=true;group.add(glint);

  // Retain the authored boards/art while batching the many tiny decorative meshes.
  const book=new THREE.Group();book.name='Carryable hardcover manga';group.add(book);book.userData.skipOceanReflection=true;
  bookSource.updateMatrixWorld(true);const sourceHinge=bookSource.getObjectByName('CoverHinge');if(!sourceHinge)throw new Error('Book cover hinge is missing.');
  const hinge=new THREE.Group();hinge.position.copy(sourceHinge.position);book.add(hinge);const hingeOrigin=hinge.position.clone();
  const staticParts=new Map<THREE.Material,THREE.BufferGeometry[]>();
  bookSource.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;
    if(/^(PageEdge|TopPageEdge|WovenEndband|SpineFoil|BindingJoint)/.test(o.name)||o.name==='InsideCover')return;
    const g=o.geometry.clone().applyMatrix4(o.matrixWorld);let m:THREE.Material;
    if(o.name==='PageBlock')m=paper;
    else if(o.name==='CoverArt'||o.name==='BackArt'){m=new THREE.MeshBasicMaterial({map:o.material.map,toneMapped:false,side:o.material.side});ownedMaterials.push(m);}
    else {const binding=o.material.clone() as THREE.MeshStandardMaterial;binding.color.set(0x725340);if(surfaces){binding.map=binding.bumpMap=surfaces.cloth;binding.bumpScale=.001;binding.roughness=.84;}m=binding;ownedMaterials.push(m);}
    if(o.name==='FrontBoard'||o.name==='CoverArt'){g.translate(-hingeOrigin.x,-hingeOrigin.y,-hingeOrigin.z);ownedGeometries.push(g);hinge.add(new THREE.Mesh(g,m));}
    else{const list=staticParts.get(m)??[];list.push(g);staticParts.set(m,list);}
  });
  for(const [m,parts]of staticParts)merged(parts,m,book);
  const dividerGeometry=new THREE.PlaneGeometry(2.84,4.34);ownedGeometries.push(dividerGeometry);
  const dividerMaterial=new THREE.MeshBasicMaterial({map:chapterCover,toneMapped:false});ownedMaterials.push(dividerMaterial);const divider=new THREE.Mesh(dividerGeometry,dividerMaterial);divider.position.z=.034;book.add(divider);
  const endpaperGeometry=new THREE.PlaneGeometry(2.98,4.48);ownedGeometries.push(endpaperGeometry);const endpaperMaterial=new THREE.MeshBasicMaterial({color:0xf4ead8,map:surfaces?.paper,side:THREE.BackSide,toneMapped:false});ownedMaterials.push(endpaperMaterial);const endpaper=new THREE.Mesh(endpaperGeometry,endpaperMaterial);endpaper.name='Ivory inside cover';endpaper.position.set(1.5,0,-.021);hinge.add(endpaper);
  book.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=false;});

  const worldBook=new THREE.Vector3(),keyRest=new THREE.Vector3(placement.key.x,keyStone.position.y+(surfaces?stoneTop+.012:.085),placement.key.z),keySlot=new THREE.Vector3(),carry=new THREE.Vector3(),present=new THREE.Vector3(),handKey=new THREE.Vector3();
  if(surfaces){const points=keyStoneGeometry.attributes.position;let highest=-Infinity;for(let i=0;i<points.count;i++)if(points.getY(i)>highest){highest=points.getY(i);keyRest.set(keyStone.position.x+points.getX(i),keyStone.position.y+highest+.012,keyStone.position.z+points.getZ(i));}}
  const worldQ=chest.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0))),carryQ=new THREE.Quaternion(),presentQ=new THREE.Quaternion(),cameraOffset=new THREE.Vector3();
  const bodyPosition=new THREE.Vector3(),previousCamera=new THREE.Vector3(),bodyQ=new THREE.Quaternion(),targetBodyQ=new THREE.Quaternion(),forward=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const heldBookQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.52,-.32,-.22)),heldKeyQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.65,.22,-.55));
  const handKeyQ=new THREE.Quaternion(),bookScale=.072;
  const keyRestQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,.65)),keySlotQ=new THREE.Quaternion();
  let lastTarget:RelicAction|null=null,alive=true,bodyReady=false,stride=0,motion=0,keyPickup=state.state.keyFound?1:0;
  let placedKey:THREE.Vector3|null=null,placedBook:THREE.Vector3|null=null,handsBusy=false;
  let landing:{object:THREE.Object3D;from:THREE.Vector3;to:THREE.Vector3;fromQ:THREE.Quaternion;toQ:THREE.Quaternion;age:number}|null=null;
  chest.updateMatrixWorld(true);worldBook.set(0,.18,0).applyMatrix4(chest.matrixWorld);keySlot.set(0,.38,.44).applyMatrix4(chest.matrixWorld);keySlotQ.copy(chest.quaternion);
  const centre=(action:RelicAction)=>action==='key'?(placedKey??keyRest):action==='book'?(placedBook??worldBook):chest.position;
  const objects=(action:RelicAction)=>action==='key'?[key]:action==='book'?[book]:[body,lock,lid];
  function target(camera:THREE.Camera,ray?:THREE.Raycaster,strict=false):RelicAction|null{
    if(state.pose().busy||landing)return null;
    const actions:RelicAction[]=placedKey?['key']:placedBook?['book']:!state.state.keyFound?['key','unlock']:!state.state.unlocked?['unlock']:!state.state.bookTaken?['book']:[];
    let chosen:RelicAction|null=null,best=Infinity;
    for(const action of actions){
      const point=centre(action),distance=Math.hypot(camera.position.x-point.x,camera.position.z-point.z);if(distance>(action==='key'?2.0:2.3))continue;
      const front=(camera.position.x-chest.position.x)*Math.sin(placement.yaw)+(camera.position.z-chest.position.z)*Math.cos(placement.yaw);
      if(action!=='key'&&!placedBook&&front<.05)continue;
      if(ray){const hits=ray.intersectObjects(objects(action),true);if(hits.length&&hits[0].distance<3.2){if(hits[0].distance<best){chosen=action;best=hits[0].distance;}continue;}}
      if(strict)continue;
      const direction=new THREE.Vector3().subVectors(point,camera.position).setY(0).normalize(),forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).setY(0).normalize();
      if(direction.dot(forward)>.30&&distance<best){chosen=action;best=distance;}
    }
    return chosen;
  }
  const label=(action:RelicAction|null)=>action==='key'?'Pick up the brass key':action==='unlock'?(state.pose().hasKey&&!placedKey?'Use the key to unlock the box':'The box is locked · Find the nearby key'):action==='book'?'Pick up the book':'';
  let questExposed=!quest;
  return {group,book,chest,key,keyStone,placement,
    syncQuest(keyFound:boolean,unlocked:boolean,bookTaken:boolean,exposed:boolean){
      if(!quest)return;questExposed=exposed;
      // An explicit trail restart also clears the physical key, lid and carried book.
      if(!keyFound&&state.state.keyFound){state.reset();placedKey=placedBook=null;landing=null;keyPickup=0;bodyReady=false;}
      if(keyFound&&!state.state.keyFound)state.act('key');
      if(unlocked&&!state.state.unlocked&&state.state.stage==='resting')state.act('unlock');
      if(bookTaken&&state.state.unlocked&&!state.state.bookTaken&&state.state.stage==='resting')state.act('book');
    },
    status(camera:THREE.Camera):RelicHUD{const pose=state.pose();lastTarget=target(camera);return {hasKey:pose.hasKey&&!placedKey,hasBook:pose.hasBook&&!placedBook,busy:pose.busy||!!landing,stage:landing?'dropping':pose.stage,readerReady:pose.readerReady,action:label(lastTarget)};},
    hint(camera:THREE.Camera,ray?:THREE.Raycaster){return label(target(camera,ray));},
    interact(camera:THREE.Camera,ray?:THREE.Raycaster,strict=false){const action=target(camera,ray,strict);if(!action)return null;if(action==='key'&&placedKey){placedKey=null;keyPickup=1;return 'Picked up the brass key';}if(action==='book'&&placedBook){placedBook=null;return 'Picked up the book';}if(action==='unlock'&&(!state.pose().hasKey||placedKey))return 'The box is locked · Find the nearby key';return state.act(action)?action==='key'?'You found the brass key':action==='unlock'?'The key turns in the lock':'You take the book':null;},
    drop(camera:THREE.Camera,place:(object:THREE.Object3D,camera:THREE.Camera)=>THREE.Vector3|null){if(state.pose().busy||landing)return null;const object=state.pose().hasBook&&!placedBook?book:state.pose().hasKey&&!placedKey?key:null;if(!object)return null;const old=object.quaternion.clone(),toQ=object===book?worldQ:keyRestQ;object.quaternion.copy(toQ);object.updateMatrixWorld(true);const point=place(object,camera);object.quaternion.copy(old);if(!point)return 'There is no clear space here · Face an open patch of ground';if(object===book)placedBook=point;else placedKey=point;landing={object,from:object.position.clone(),to:point,fromQ:old,toQ:toQ.clone(),age:0};return object===book?'You put down the book':'You put down the brass key';},
    setHandsBusy(value:boolean){handsBusy=value;},
    read:()=>!placedBook&&!landing&&state.read(),close:()=>state.close(),get busy(){return state.pose().busy||!!landing;},get readerReady(){return state.pose().readerReady;},get movingShadow(){return state.state.stage==='unlocking'||!!landing;},
    update(dt:number,time:number,camera:THREE.PerspectiveCamera){if(!alive)return;state.update(dt);const p=state.pose();
      lid.rotation.x=-p.lid*1.48;shackle.position.y=.095+p.lid*.055;shackle.rotation.y=p.lid*.65;lock.rotation.z=p.lid*.22;lock.visible=true;
      key.visible=!state.state.unlocked;glint.visible=!state.state.keyFound;
      // Carry at the visitor's side. Looking up/down moves the view independently;
      // small positional/yaw lag and distance-driven sway keep items in the world.
      forward.set(0,0,-1).applyQuaternion(camera.quaternion);targetBodyQ.setFromAxisAngle(up,Math.atan2(-forward.x,-forward.z));
      const distance=bodyReady?Math.hypot(camera.position.x-previousCamera.x,camera.position.z-previousCamera.z):0;
      if(!bodyReady||dt===0||distance>.75||reduced){bodyPosition.copy(camera.position);bodyQ.copy(targetBodyQ);motion=0;bodyReady=true;}
      else{bodyPosition.lerp(camera.position,1-Math.exp(-dt*20));bodyQ.slerp(targetBodyQ,1-Math.exp(-dt*12));motion+=(Math.min(1,distance/Math.max(dt,.001)/3.2)-motion)*(1-Math.exp(-dt*12));stride+=distance*7;}
      previousCamera.copy(camera.position);
      const sway=Math.sin(stride)*.012*motion,lift=Math.cos(stride*2)*.009*motion;
      handKey.copy(bodyPosition).add(cameraOffset.set(-.24+sway,-.36+lift,-.70).applyQuaternion(bodyQ));handKeyQ.copy(bodyQ).multiply(heldKeyQ);
      if(state.state.keyFound)keyPickup=Math.min(1,keyPickup+dt/(reduced?.12:.55));
      const pickup=relicSmooth(0,1,keyPickup);key.position.copy(keyRest).lerp(handKey,pickup);key.quaternion.copy(keyRestQ).slerp(handKeyQ,pickup);
      if(p.stage==='unlocking'){key.position.lerp(keySlot,p.keyInsert);keySlotQ.copy(chest.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI*.5*p.keyTurn)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));key.quaternion.slerp(keySlotQ,p.keyInsert);key.visible=p.lid<.8;}
      glint.position.copy(keyRest);glint.position.y+=.025;glint.quaternion.copy(camera.quaternion);keyGlintMaterial.uniforms.power.value=reduced?.7:.65+Math.sin(time*1.7)*.25;
      carry.copy(bodyPosition).add(cameraOffset.set(.30+sway,-.40+lift,-.78).applyQuaternion(bodyQ));
      carryQ.copy(bodyQ).multiply(heldBookQ);
      present.copy(camera.position).add(cameraOffset.set(0,0,-.92).applyQuaternion(camera.quaternion));presentQ.copy(camera.quaternion);
      book.visible=state.state.unlocked||p.lid>.3||p.stage==='taking';book.position.copy(worldBook).lerp(carry,p.taking);book.quaternion.copy(worldQ).slerp(carryQ,p.taking);book.scale.setScalar(bookScale);
      if(p.hasBook){book.position.lerp(present,p.present);book.quaternion.slerp(presentQ,p.present);const fitted=.92*2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*.82/4.5;book.scale.setScalar(THREE.MathUtils.lerp(bookScale,THREE.MathUtils.lerp(.15,fitted,p.zoom),p.present));}
      // Keep the centre of the two open boards in front of the visitor.
      if(p.present>0)book.position.add(cameraOffset.set(1.5*book.scale.x*p.opening*p.present,0,0).applyQuaternion(camera.quaternion));
      hinge.rotation.y=-Math.PI*p.opening;hinge.position.z=hingeOrigin.z-p.opening*.098;
      // Returning to the world closes the cover before restoring its carrying pose.
      book.visible=book.visible&&!p.readerReady;
      if(placedKey){key.position.copy(placedKey);key.quaternion.copy(keyRestQ);}
      if(placedBook){book.position.copy(placedBook);book.quaternion.copy(worldQ);}
      if(handsBusy){if(!placedKey&&state.state.keyFound)key.visible=false;if(!placedBook&&p.hasBook&&!p.busy)book.visible=false;}
      if(landing){landing.age+=Math.max(0,Math.min(dt,.1));const t=relicSmooth(0,reduced?.08:.34,landing.age);landing.object.position.copy(landing.from).lerp(landing.to,t);landing.object.quaternion.copy(landing.fromQ).slerp(landing.toQ,t);if(t===1)landing=null;}
      if(quest){chest.visible=questExposed;keyStone.visible=false;glint.visible=false;if(!state.state.keyFound)key.visible=false;if(!questExposed&&!p.hasBook)book.visible=false;}
    },
    warm(on:boolean){book.visible=on||state.state.unlocked;},
    dispose(){alive=false;rivets.dispose();ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());group.clear();},
  };
}
