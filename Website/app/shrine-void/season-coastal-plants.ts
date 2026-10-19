import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {groundHeight,random,type SeasonLayout} from './season-layout';

/** A few short scanned tufts replace the disconnected broad leaf planes. */
export function createCoastalPlants(layout:SeasonLayout,source:THREE.Object3D){
  const group=new THREE.Group();group.name='Grounded coastal grass';source.updateMatrixWorld(true);
  const placements:{x:number;z:number;size:number;yaw:number}[]=[];
  for(const tree of layout.trees)for(let n=0;n<4;n++){
    const seed=tree.seed+n*37,angle=n*Math.PI*.5+random(seed)*.65,r=.24+random(seed+8)*.28;
    const x=tree.x+Math.cos(angle)*r,z=tree.z+Math.sin(angle)*r;
    if(groundHeight('summer',x,z)<.18||Math.hypot(x-layout.prop.x,z-layout.prop.z)<2.1)continue;
    placements.push({x,z,size:.14+random(seed+12)*.09,yaw:random(seed+4)*Math.PI*2});
  }
  // Bake each small tuft against the sand height field. Every blade base follows
  // the slope, instead of lifting a whole flat fan above the bank.
  const transform=new THREE.Matrix4(),rotation=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),point=new THREE.Vector3();
  source.traverse(o=>{
    if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;
    const original=o.geometry.clone().applyMatrix4(o.matrixWorld);original.computeBoundingBox();
    const box=original.boundingBox!,height=Math.max(.001,box.max.y-box.min.y),centre=box.getCenter(new THREE.Vector3());
    original.translate(-centre.x,-box.min.y,-centre.z);original.scale(1/height,1/height,1/height);
    const material=o.material.clone() as THREE.MeshStandardMaterial;material.color.set(0xc6d0ad);material.roughness=1;material.side=THREE.DoubleSide;material.transparent=false;material.alphaTest=.42;material.envMapIntensity=.5;
    const tufts:THREE.BufferGeometry[]=[];
    for(const p of placements){
      const geometry=original.clone();rotation.setFromAxisAngle(up,p.yaw);transform.compose(new THREE.Vector3(p.x,0,p.z),rotation,new THREE.Vector3(p.size,p.size,p.size));geometry.applyMatrix4(transform);
      const vertices=geometry.attributes.position;
      for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i);vertices.setY(i,point.y+groundHeight('summer',point.x,point.z)-.025);}
      geometry.computeVertexNormals();tufts.push(geometry);
    }
    if(tufts.length){const geometry=mergeGeometries(tufts)!;geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.name='Rooted short grass';group.add(mesh);}else material.dispose();
    tufts.forEach(g=>g.dispose());
    original.dispose();
  });
  return group;
}
