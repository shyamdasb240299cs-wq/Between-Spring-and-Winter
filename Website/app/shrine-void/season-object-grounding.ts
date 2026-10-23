import * as THREE from 'three';
import {groundHeight} from './season-layout';
import type {SeasonId} from './seasons';

/** Settle a rigid scan into the soil using its actual lower surface, including slopes. */
export function settleGroundObject(id:SeasonId,root:THREE.Object3D,bury=.012){
  root.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(root),height=box.max.y-box.min.y,point=new THREE.Vector3();
  let contact=Infinity;
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const positions=object.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
      // The lower collar is buried as one rigid piece; the original silhouette,
      // overhangs, normals and texture coordinates remain untouched.
      if(point.y<=box.min.y+height*.10+.001)contact=Math.min(contact,groundHeight(id,point.x,point.z)-point.y);
    }
  });
  if(Number.isFinite(contact))root.position.y+=contact-bury;
  root.updateWorldMatrix(true,true);
}
