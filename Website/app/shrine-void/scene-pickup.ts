import * as THREE from 'three';
import {groundHeight,islandDistance,ISLAND_SCALE,seasonWalkRadius,type SeasonLayout} from './season-layout';
import type {SeasonId} from './seasons';

export interface PickupItem{object:THREE.Object3D;label:string;onLift?:()=>void;onDrop?:()=>void;}
type Item=PickupItem&{restQ:THREE.Quaternion;offset:THREE.Vector3;half:THREE.Vector3;};

/** Shared, metre-scale pickup and placement for every loose scene prop. */
export function createScenePickup(id:SeasonId,layout:SeasonLayout,items:PickupItem[],solids:THREE.Object3D[],reduced=false,supports:THREE.Object3D[]=[]){
  const box=new THREE.Box3(),centre=new THREE.Vector3(),forward=new THREE.Vector3(),bodyQ=new THREE.Quaternion(),target=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const entries:Item[]=items.map(item=>{item.object.updateWorldMatrix(true,true);box.setFromObject(item.object);return {...item,restQ:item.object.getWorldQuaternion(new THREE.Quaternion()),offset:box.getCenter(new THREE.Vector3()).sub(item.object.getWorldPosition(new THREE.Vector3())),half:box.getSize(new THREE.Vector3()).multiplyScalar(.5)};});
  let held:Item|null=null,settling:{item:Item;from:THREE.Vector3;to:THREE.Vector3;fromQ:THREE.Quaternion;age:number}|null=null;
  const supportRay=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  const targetSphere=new THREE.Sphere(),nearby:THREE.Object3D[]=[],targetHits:THREE.Intersection[]=[];
  function supportHeight(x:number,z:number){let height=groundHeight(id,x,z);if(supports.length){supportRay.set(new THREE.Vector3(x,height+3,z),down);for(const object of supports)object.updateWorldMatrix(true,true);const hit=supportRay.intersectObjects(supports,true)[0];if(hit)height=Math.max(height,hit.point.y);}return height;}
  const worldPosition=(object:THREE.Object3D,p:THREE.Vector3)=>{object.parent?.updateWorldMatrix(true,false);object.position.copy(object.parent?object.parent.worldToLocal(p.clone()):p);object.updateWorldMatrix(false,true);};
  const worldRotation=(object:THREE.Object3D,q:THREE.Quaternion)=>{const parentQ=object.parent?.getWorldQuaternion(new THREE.Quaternion());object.quaternion.copy(parentQ?parentQ.invert().multiply(q):q);};
  function bounds(object:THREE.Object3D){object.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(object);}
  function clear(item:Item,x:number,z:number,y:number){
    const radius=Math.hypot(item.half.x,item.half.z),padding=.045;
    if(layout.obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+radius+padding))return false;
    const candidate=new THREE.Box3(new THREE.Vector3(x-item.half.x-padding,y,z-item.half.z-padding),new THREE.Vector3(x+item.half.x+padding,y+item.half.y*2+.015,z+item.half.z+padding));
    return [...solids,...entries.filter(e=>e!==item&&e!==held&&!item.object.getObjectById(e.object.id)).map(e=>e.object)].every(object=>object===item.object||!object.visible||!candidate.intersectsBox(bounds(object)));
  }
  function dropPoint(item:Item,camera:THREE.Camera){
    forward.set(0,0,-1).applyQuaternion(camera.quaternion).setY(0).normalize();
    const yaw=Math.atan2(-forward.x,-forward.z),radius=Math.hypot(item.half.x,item.half.z);
    // Search a small fan in front of the visitor. Never put an item through furniture,
    // another prop, a tree, deep water, or beyond the reachable walking circle.
    for(const distance of [1.05+radius,1.4+radius,1.8+radius])for(const angle of [0,-.28,.28,-.6,.6,-.95,.95]){
      const x=camera.position.x-Math.sin(yaw+angle)*distance,z=camera.position.z-Math.cos(yaw+angle)*distance;
      if(id==='summer'?islandDistance(x,z)+radius/ISLAND_SCALE>10.2:Math.hypot(x,z+3)+radius>seasonWalkRadius(id)-.25)continue;
      const heights:number[]=[];for(const sx of [-1,-.5,0,.5,1])for(const sz of [-1,-.5,0,.5,1])heights.push(supportHeight(x+sx*item.half.x,z+sz*item.half.z));
      const y=Math.max(...heights)+.008;
      if(y<(id==='summer'?.075:id==='autumn'?-.04:-Infinity)||Math.max(...heights)-Math.min(...heights)>.16)continue;
      if(clear(item,x,z,y))return new THREE.Vector3(x-item.offset.x,y+item.half.y-item.offset.y,z-item.offset.z);
    }
    return null;
  }
  function targetItem(camera:THREE.Camera,ray:THREE.Raycaster,strict=false){
    if(held||settling)return null;
    // Broad phase avoids raycasting distant scanned props at every HUD refresh.
    nearby.length=0;targetHits.length=0;
    for(const item of entries){item.object.getWorldPosition(targetSphere.center).add(item.offset);targetSphere.radius=item.half.length()+.02;if(camera.position.distanceTo(targetSphere.center)-targetSphere.radius<=2.8&&ray.ray.intersectsSphere(targetSphere))nearby.push(item.object);}
    const hits=ray.intersectObjects(nearby,true,targetHits);
    for(const hit of hits){if(hit.distance>2.8)break;let object:THREE.Object3D|null=hit.object;while(object){const entry=entries.find(e=>e.object===object);if(entry)return entry;object=object.parent;}}
    if(strict)return null;
    forward.set(0,0,-1).applyQuaternion(camera.quaternion).setY(0).normalize();
    return entries.map(item=>{item.object.getWorldPosition(centre);const delta=centre.clone().sub(camera.position).setY(0),distance=delta.length();return {item,distance,dot:delta.normalize().dot(forward)};}).filter(e=>e.distance<1.85&&e.dot>.83).sort((a,b)=>a.distance-b.distance)[0]?.item??null;
  }
  return {
    items:entries,supportHeight,
    get held(){return held?.object??null;},get moving(){return !!held||!!settling;},get settling(){return !!settling;},
    placement(object:THREE.Object3D,camera:THREE.Camera){const b=bounds(object),item={object,label:object.name,restQ:object.getWorldQuaternion(new THREE.Quaternion()),offset:b.getCenter(new THREE.Vector3()).sub(object.getWorldPosition(new THREE.Vector3())),half:b.getSize(new THREE.Vector3()).multiplyScalar(.5)};return dropPoint(item,camera);},
    status(camera:THREE.Camera,ray:THREE.Raycaster){const item=targetItem(camera,ray);return {held:held?.label??'',action:held?`Put down ${held.label}`:item?`Pick up ${item.label}`:'',canDrop:held?!!dropPoint(held,camera):false,settling:!!settling};},
    pickup(camera:THREE.Camera,ray:THREE.Raycaster,strict=false){const item=targetItem(camera,ray,strict);if(!item)return null;let container=item.object.parent;while(container?.parent&&!(container.parent instanceof THREE.Scene))container=container.parent;container?.attach(item.object);held=item;item.onLift?.();return `Picked up ${item.label}`;},
    drop(camera:THREE.Camera){if(!held)return null;const to=dropPoint(held,camera);if(!to)return 'There is no clear space here · Face an open patch of ground';const item=held;held=null;settling={item,from:item.object.getWorldPosition(new THREE.Vector3()),to,fromQ:item.object.getWorldQuaternion(new THREE.Quaternion()),age:0};return `Putting down ${item.label}`;},
    update(dt:number,camera:THREE.Camera){
      if(held){forward.set(0,0,-1).applyQuaternion(camera.quaternion).setY(0).normalize();bodyQ.setFromAxisAngle(up,Math.atan2(-forward.x,-forward.z));target.set(-.28,-.43,-.67).applyQuaternion(bodyQ).add(camera.position);target.sub(held.offset);
        const current=held.object.getWorldPosition(centre);worldPosition(held.object,current.lerp(target,reduced?1:1-Math.exp(-Math.max(0,dt)*16)));worldRotation(held.object,held.restQ);
      }
      if(settling){const s=settling;s.age+=Math.max(0,Math.min(dt,.1));const t=Math.min(1,s.age/(reduced?.08:.32)),ease=t*t*(3-2*t);worldPosition(s.item.object,target.copy(s.from).lerp(s.to,ease));worldRotation(s.item.object,s.fromQ.clone().slerp(s.item.restQ,ease));if(t===1){s.item.onDrop?.();settling=null;}}
    },
    collisionBoxes(except:THREE.Object3D){return [...solids,...entries.map(item=>item.object)].filter(object=>object!==except&&object!==held?.object&&object.visible&&!except.getObjectById(object.id)).map(bounds);},
    blocked(x:number,z:number,radius=.28){return entries.some(item=>item!==held&&item!==settling?.item&&(()=>{item.object.getWorldPosition(centre);if(Math.hypot(centre.x+item.offset.x-x,centre.z+item.offset.z-z)>radius+item.half.length()+.1)return false;const b=bounds(item.object);return b.max.y-groundHeight(id,x,z)>.12&&x>b.min.x-radius&&x<b.max.x+radius&&z>b.min.z-radius&&z<b.max.z+radius;})());},
    snapshot(){return {heldObject:held?.label??null,pickupCount:entries.length};},
  };
}
