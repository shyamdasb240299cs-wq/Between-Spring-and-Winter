import type * as THREE from 'three';

/** Warm later pickups with their actual world's lights, without changing saves. */
export async function withSeasonPropsVisible(roots:THREE.Object3D[],prepare:()=>Promise<void>){
  const hidden:THREE.Object3D[]=[];
  for(const root of roots)root.traverse(object=>{
    if(!object.visible&&!(object as THREE.Light).isLight){hidden.push(object);object.visible=true;}
  });
  try{await prepare();}finally{hidden.forEach(object=>{object.visible=false;});}
}

/** Three's compiler visits hidden meshes too, unlike its light collection.
 * Keep inactive interiors out of the pass so they are not compiled against the
 * current world's lights. Restore the exact graph even if compilation fails.
 * The caller holds gameplay while this asynchronous preparation runs. */
export async function compileVisibleSeason(renderer:Pick<THREE.WebGLRenderer,'compileAsync'>,scene:THREE.Scene,camera:THREE.Camera){
  const detached:{parent:THREE.Object3D;object:THREE.Object3D;index:number}[]=[];
  function collect(parent:THREE.Object3D){
    for(let index=parent.children.length-1;index>=0;index--){
      const object=parent.children[index];
      if(object.visible)collect(object);
      else {detached.push({parent,object,index});parent.remove(object);}
    }
  }
  try{collect(scene);await renderer.compileAsync(scene,camera);}
  finally{
    for(const {parent,object,index} of detached.reverse()){
      parent.add(object);
      parent.children.splice(parent.children.indexOf(object),1);
      parent.children.splice(index,0,object);
    }
  }
}
