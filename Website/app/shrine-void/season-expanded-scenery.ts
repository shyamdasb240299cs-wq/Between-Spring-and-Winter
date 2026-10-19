import * as THREE from 'three';
import {groundHeight,type SeasonLayout} from './season-layout';
import type {SeasonId} from './seasons';

/** Existing attributed glTF assets, grounded at metre scale in the new clearings. */
export function createExpandedScenery(id:SeasonId,layout:SeasonLayout,models:Record<string,THREE.Object3D>){
  const group=new THREE.Group();group.name='Expanded trails, resting places and rock outcrops';
  for(const placement of layout.landmarks){
    const source=models[placement.kind];if(!source)throw new Error(`Missing scenery asset: ${placement.kind}`);
    const model=source.clone(true),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(centre.x,bounds.min.y,centre.z));
    const root=new THREE.Group();root.name=`${placement.kind} · trail ${group.children.length+1}`;root.userData.landmark=placement;
    root.add(model);root.scale.setScalar(placement.size/Math.max(size.x,size.z));if(placement.kind==='boulder')root.scale.y*=.65;
    root.rotation.y=placement.yaw;root.position.set(placement.x,groundHeight(id,placement.x,placement.z),placement.z);group.add(root);root.updateWorldMatrix(true,true);
    const worldBounds=new THREE.Box3().setFromObject(root),bottom=worldBounds.min.y;
    // Leg endpoints follow the actual slope while the seat remains level.
    if(placement.kind==='bench'||placement.kind==='beach-chair')root.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const geometry=object.geometry.clone(),p=geometry.attributes.position,point=new THREE.Vector3(),inverse=object.matrixWorld.clone().invert();
      for(let i=0;i<p.count;i++){
        point.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);const height=point.y-bottom;
        if(height<.18){point.y+=(groundHeight(id,point.x,point.z)-bottom-.009)*(1-THREE.MathUtils.smoothstep(height,.025,.18));point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z);}
      }
      geometry.computeVertexNormals();geometry.computeBoundingSphere();object.geometry=geometry;
    });
    if(placement.kind==='boulder'||placement.kind==='log')root.position.y-=placement.kind==='boulder'?.16:.035;
    root.traverse(object=>{if(object instanceof THREE.Mesh)object.castShadow=object.receiveShadow=true;});
    root.updateWorldMatrix(true,true);
  }
  return group;
}
