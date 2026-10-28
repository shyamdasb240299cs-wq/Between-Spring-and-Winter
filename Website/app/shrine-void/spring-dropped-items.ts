import * as THREE from 'three';
import {createSpringCompass} from './spring-compass';
import {createSpringGlasses} from './spring-glasses';
import {createSpringDiamondKey} from './spring-train-quest';
import {SPRING_CARRY_NAMES,type SpringCarryItem,type SpringDroppedItem,type SpringSave} from './spring-treasure-state';

/** One recoverable physical prop for each item released from the inventory. */
export function createSpringDroppedItems(models:Record<string,THREE.Object3D>){
  const group=new THREE.Group();group.name='Dropped belongings · recoverable world objects';
  const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>(),cleanup:(()=>void)[]=[];
  const props=new Map<SpringCarryItem,{root:THREE.Group;age:number;start:THREE.Vector3;placement:SpringDroppedItem}>();
  const point=new THREE.Vector3(),forward=new THREE.Vector3();let initialized=false;
  function mesh(parent:THREE.Group,g:THREE.BufferGeometry,m:THREE.Material){geometry.add(g);materials.add(m);const o=new THREE.Mesh(g,m);o.receiveShadow=true;parent.add(o);return o;}
  function make(item:SpringCarryItem){
    const root=new THREE.Group();root.name=`Dropped ${SPRING_CARRY_NAMES[item]}`;group.add(root);
    if(item==='treasure-key'){const key=createSpringDiamondKey();root.add(key.group);key.group.rotation.x=-Math.PI/2;root.userData.update=key.update;cleanup.push(key.dispose);}
    else if(item==='compass'){const compass=createSpringCompass();root.add(compass.group);root.userData.update=compass.update;cleanup.push(compass.dispose);}
    else if(item==='glasses'){const glasses=createSpringGlasses(models.glasses);root.add(glasses.group);cleanup.push(glasses.dispose);}
    else if(models[item]){const source=models[item].clone(true),bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),c=bounds.getCenter(new THREE.Vector3());source.position.sub(new THREE.Vector3(c.x,bounds.min.y,c.z));const holder=new THREE.Group();holder.add(source);holder.scale.setScalar((item==='candle'?.10:.18)/Math.max(size.x,size.z,.001));root.add(holder);}
    else if(item==='key'){
      const brass=new THREE.MeshStandardMaterial({color:0xb99a59,metalness:.77,roughness:.32});
      const bow=mesh(root,new THREE.TorusGeometry(.025,.005,8,24),brass);bow.rotation.x=-Math.PI/2;bow.position.y=.006;
      const shaft=mesh(root,new THREE.BoxGeometry(.009,.009,.075),brass);shaft.position.set(0,.006,.055);
      for(const z of [.075,.094])mesh(root,new THREE.BoxGeometry(.02,.009,.009),brass).position.set(.007,.006,z);
    }else if(item==='pill'){
      const capsule=mesh(root,new THREE.CapsuleGeometry(.009,.024,4,12),new THREE.MeshPhysicalMaterial({color:0xe3d0d6,roughness:.25,clearcoat:1}));capsule.rotation.z=Math.PI/2;capsule.position.y=.01;
    }else{
      const paper=new THREE.MeshStandardMaterial({color:0xe3d4b3,roughness:.92});
      if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const c=canvas.getContext('2d');if(c){c.fillStyle='#e3d4b3';c.fillRect(0,0,512,768);c.fillStyle='#574b3c';c.font='italic 30px Georgia';c.fillText(SPRING_CARRY_NAMES[item],35,105,440);c.globalAlpha=.55;for(let y=180;y<650;y+=45)c.fillRect(40,y,360+(y%3)*22,3);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);paper.map=t;}}
      mesh(root,new THREE.BoxGeometry(.15,.002,.21),paper).position.y=.003;
    }
    return root;
  }
  function visible(item:SpringCarryItem,camera:THREE.Camera,world:SpringDroppedItem['world']){const prop=props.get(item);return prop&&prop.root.visible&&prop.age>=.55&&prop.placement.world===world&&camera.position.distanceTo(prop.root.getWorldPosition(point))<2.25?prop:null;}
  return {group,
    canPick(item:unknown,camera:THREE.Camera,world:SpringDroppedItem['world']){return typeof item==='string'&&!!visible(item as SpringCarryItem,camera,world);},
    target(camera:THREE.Camera,ray:THREE.Raycaster,world:SpringDroppedItem['world']){
      group.updateWorldMatrix(true,true);
      for(const [item,prop] of props){if(!visible(item,camera,world))continue;prop.root.getWorldPosition(point);if(ray.intersectObject(prop.root,true).length||ray.ray.distanceToPoint(point)<.105)return {action:'pickup-dropped',payload:item,label:`Pick up ${SPRING_CARRY_NAMES[item].toLowerCase()}`};}return null;
    },
    update(dt:number,camera:THREE.Camera,state:SpringSave,world:SpringDroppedItem['world']){
      group.visible=true;
      for(const [item,prop] of props)if(!state.droppedItems.some(p=>p.item===item))prop.root.visible=false;
      for(const placement of state.droppedItems){let prop=props.get(placement.item);
        if(!prop||prop.placement!==placement){const root=prop?.root??make(placement.item);camera.getWorldDirection(forward);const start=camera.position.clone().addScaledVector(forward,.28);start.y-=.32;prop={root,start,age:initialized?0:1,placement};props.set(placement.item,prop);}
        prop.root.visible=placement.world===world;if(!prop.root.visible)continue;
        prop.age+=Math.max(0,dt);const u=Math.min(1,prop.age/.65);point.set(placement.x,placement.y,placement.z);prop.root.position.lerpVectors(prop.start,point,u);prop.root.position.y+=Math.sin(u*Math.PI)*.22;prop.root.rotation.set(Math.sin(u*Math.PI)*.5,placement.yaw+(1-u)*Math.PI,0);prop.root.userData.update?.(dt);
      }initialized=true;
    },
    dispose(){cleanup.forEach(fn=>fn());geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();group.clear();props.clear();},
  };
}
