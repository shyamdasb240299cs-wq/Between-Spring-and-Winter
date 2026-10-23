import * as THREE from 'three';

/** Preserve every authored instance while allowing off-screen cells to be culled.
 * Geometry and materials remain shared. The caller still owns their disposal. */
export function partitionInstances(source:THREE.InstancedMesh,cellSize=6){
  const cells=new Map<string,number[]>(),matrix=new THREE.Matrix4(),colour=new THREE.Color();
  for(let i=0;i<source.count;i++){
    source.getMatrixAt(i,matrix);
    const e=matrix.elements,key=`${Math.floor(e[12]/cellSize)}:${Math.floor(e[14]/cellSize)}`;
    const indices=cells.get(key)||[];indices.push(i);cells.set(key,indices);
  }
  const result:THREE.InstancedMesh[]=[];
  for(const [key,indices]of cells){
    const tile=new THREE.InstancedMesh(source.geometry,source.material,indices.length);
    tile.name=`${source.name||'Meadow'} · ${key}`;
    tile.castShadow=source.castShadow;tile.receiveShadow=source.receiveShadow;
    tile.position.copy(source.position);tile.quaternion.copy(source.quaternion);tile.scale.copy(source.scale);
    for(let n=0;n<indices.length;n++){
      source.getMatrixAt(indices[n],matrix);tile.setMatrixAt(n,matrix);
      if(source.instanceColor){source.getColorAt(indices[n],colour);tile.setColorAt(n,colour);}
    }
    tile.computeBoundingBox();tile.computeBoundingSphere();
    // Vertex wind and footsteps can move blades beyond the static bounds.
    if(tile.boundingSphere)tile.boundingSphere.radius+=.3;
    result.push(tile);
  }
  source.removeFromParent();source.dispose();
  return result;
}
