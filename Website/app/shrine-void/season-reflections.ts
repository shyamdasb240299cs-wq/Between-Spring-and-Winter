import * as THREE from 'three';
import type {ModelPart} from './assets';
import {random,type TreePlacement} from './season-layout';

/** Layer 1 keeps the lake capture small and independent of the main view's culling. */
export function createSeasonReflections(trees:ModelPart[][][],placements:TreePlacement[],heights:number[]){
  const group=new THREE.Group();group.name='Lake reflected canopy';group.layers.set(1);
  const transform=new THREE.Object3D(),tint=new THREE.Color();
  trees.forEach((lods,variant)=>{
    const visible=placements.filter(t=>t.variant%trees.length===variant&&Math.hypot(t.x-.8,t.z+13)<62);
    for(const part of lods[2]){
      const foliage=/foliage|leaf|leav|twig|needle/i.test(part.name);
      const material=new THREE.MeshBasicMaterial({map:part.material.map,alphaMap:part.material.alphaMap,color:foliage?0xffffff:0x7b6451,alphaTest:foliage?.38:0,side:foliage?THREE.DoubleSide:THREE.FrontSide});
      if(foliage)material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float leafValue=clamp(dot(diffuseColor.rgb,vec3(.4,.4,.2))*2.8,.13,.7);
        float gold=.65;
        #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
        gold=clamp(vColor.g/max(.05,vColor.r)*1.7-.25,0.,1.);
        #endif
        diffuseColor.rgb=leafValue*mix(vec3(1.25,.17,.018),vec3(1.35,.83,.055),gold)*.85;`);};
      const batch=new THREE.InstancedMesh(part.geometry,material,visible.length);batch.name='Reflected '+part.name;batch.layers.set(1);
      visible.forEach((t,i)=>{transform.position.set(t.x,t.y,t.z);transform.rotation.set(0,t.yaw,0);transform.scale.setScalar(t.height/heights[variant]);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);if(foliage)batch.setColorAt(i,tint.setHSL(.012+random(t.seed)*.13,.64,.64));});
      batch.computeBoundingSphere();group.add(batch);
    }
  });
  return group;
}
