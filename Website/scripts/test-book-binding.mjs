import assert from 'node:assert/strict';
import * as THREE from 'three';
import {typescriptUrl} from './load-typescript.mjs';
const {createBookBinding,updateBookBinding}=await import(await typescriptUrl(new URL('../app/book-binding.ts',import.meta.url)));
const geometry=createBookBinding(),edges=new Map();
const indices=geometry.index.array;
for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){
  const a=indices[i+j],b=indices[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
  edges.set(key,(edges.get(key)||0)+1);
}
assert.ok([...edges.values()].every(count=>count===2),'The spine is a watertight solid, including top, bottom and hinge ends');
for(const [opening,close] of [...Array.from({length:31},(_,i)=>[i/30,0]),...Array.from({length:31},(_,i)=>[1,i/30])]){
  updateBookBinding(geometry,opening,close);
  const points=geometry.attributes.position;
  for(const [start,angle,z] of [[0,-Math.PI*opening,.0045-.0535*opening],[points.count-4,-Math.PI*close,-.049+.0553*close]]){
    const inverse=new THREE.Matrix4().compose(new THREE.Vector3(-1.43,0,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,angle,0)),new THREE.Vector3(1,1,1)).invert();
    for(let i=start;i<start+4;i++){
      const local=new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(inverse);
      assert.ok(local.x>0&&local.x<2.90&&Math.abs(local.y)<2.25&&Math.abs(local.z)<.0175,'Each spine end remains embedded in its solid cover throughout opening and closing');
    }
  }
  assert.ok([...points.array].every(Number.isFinite),'Spine geometry stays finite in every pose');
}
geometry.dispose();
console.log('Book binding passed: watertight shell and both hinge ends inside their cover boards at 62 opening/closing poses.');
