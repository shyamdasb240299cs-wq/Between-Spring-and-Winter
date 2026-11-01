import * as THREE from 'three';

// Measured from the original GLB after its existing metre-scale registration.
export const COACH_BAY_PITCH=3.407932;
export const COACH_EXTENSION=5*COACH_BAY_PITCH;
export const COACH_NORTH=-87.65-COACH_EXTENSION;
export const COACH_SOUTH=-64.35;
export const COACH_CENTRE=(COACH_NORTH+COACH_SOUTH)/2;
export const COACH_BAYS=Array.from({length:9},(_,bay)=>({bay,first:bay*8+1,z:bay===8?-70.86906:bay===7?-74.27699:-81.11147-COACH_EXTENSION+bay*COACH_BAY_PITCH}));

/** Insert five complete furnished slices. Discrete fittings stay intact; only
 * continuous shell triangles are cut, interpolating every original attribute. */
export function extendOriginalCoach(imported:THREE.Object3D,own:Set<THREE.BufferGeometry>){
  imported.updateWorldMatrix(true,true);
  const meshes:THREE.Mesh[]=[];imported.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});
  const lo=-79.50,hi=lo+COACH_BAY_PITCH;
  for(const o of meshes){
    const source=o.geometry,world=source.clone().applyMatrix4(o.matrixWorld),inverse=o.matrixWorld.clone().invert();world.computeBoundingBox();
    const bounds=world.boundingBox!;
    if(!/Train_Prefab.*(?:Inside|Outside)|Siderailing/.test(o.name+' '+o.parent?.name)){
      const z=(bounds.min.z+bounds.max.z)/2;
      if(z<lo){world.translate(0,0,-COACH_EXTENSION);const g=world.applyMatrix4(inverse);own.add(g);o.geometry=g;}
      else{world.dispose();if(z<hi)for(let i=1;i<=5;i++){const copy=o.clone(false),g=source.clone().applyMatrix4(o.matrixWorld).translate(0,0,-i*COACH_BAY_PITCH).applyMatrix4(inverse);copy.geometry=g;copy.name=o.name+' · complete section copy '+i;own.add(g);o.parent!.add(copy);}}
      continue;
    }
    const g=world.index?world.toNonIndexed():world,entries=Object.entries(g.attributes).sort(([a],[b])=>a==='position'?-1:b==='position'?1:0),offsets:number[]=[];let size=0;
    for(const [,a]of entries){offsets.push(size);size+=a.itemSize;}
    const output:number[][]=entries.map(()=>[]),pos=g.getAttribute('position');
    const clip=(poly:number[][],plane:number,above:boolean)=>{const result:number[][]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=above?a[2]>=plane:a[2]<plane,bi=above?b[2]>=plane:b[2]<plane;if(ai)result.push(a);if(ai!==bi){const u=(plane-a[2])/(b[2]-a[2]);result.push(a.map((v,j)=>v+(b[j]-v)*u));}}return result;};
    function emit(poly:number[][],shift:number){for(let i=1;i<poly.length-1;i++)for(const p of [poly[0],poly[i],poly[i+1]])for(let j=0;j<entries.length;j++){const a=entries[j][1],off=offsets[j];for(let k=0;k<a.itemSize;k++)output[j].push(p[off+k]+(entries[j][0]==='position'&&k===2?shift:0));}}
    for(let n=0;n<pos.count;n+=3){const tri:number[][]=[];for(let i=0;i<3;i++){const v:number[]=[];for(const [,a]of entries)for(let k=0;k<a.itemSize;k++)v.push(a.getComponent(n+i,k));tri.push(v);}
      emit(clip(tri,lo,false),-COACH_EXTENSION);emit(clip(tri,lo,true),0);
      const section=clip(clip(tri,lo,true),hi,false);for(let i=1;i<=5;i++)emit(section,-i*COACH_BAY_PITCH);
    }
    const rebuilt=new THREE.BufferGeometry();entries.forEach(([name,a],i)=>rebuilt.setAttribute(name,new THREE.Float32BufferAttribute(output[i],a.itemSize)));rebuilt.applyMatrix4(inverse);rebuilt.computeBoundingBox();rebuilt.computeBoundingSphere();o.geometry=rebuilt;own.add(rebuilt);if(g!==world)g.dispose();world.dispose();
  }
  imported.updateWorldMatrix(true,true);
}
