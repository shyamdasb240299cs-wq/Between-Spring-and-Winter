import * as THREE from 'three';

/** The supplied model, with continuous crystal acetate arms and optical lenses. */
export function createSpringGlasses(source?:THREE.Object3D){
  const group=new THREE.Group();group.name='Smoky crystal spectacles';
  const materials=new Set<THREE.Material>();
  if(source){
    const model=source.clone(true),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(centre.x,bounds.min.y,centre.z));group.add(model);group.scale.setScalar(.148/Math.max(.001,size.x));
    model.traverse(object=>{if(!(object instanceof THREE.Mesh))return;
      const polish=(original:THREE.Material)=>{const m=original.clone() as THREE.MeshPhysicalMaterial;materials.add(m);
        if(m.isMeshPhysicalMaterial){m.envMapIntensity=1.1;m.clearcoat=1;m.clearcoatRoughness=.045;
          if(/lens/i.test(m.name)){m.transmission=.94;m.thickness=.012;m.ior=1.5;m.opacity=1;m.transparent=false;m.roughness=.025;m.side=THREE.FrontSide;}
          else if(/acetate/i.test(m.name)){m.color.setRGB(.29,.32,.37);m.opacity=.72;m.transparent=true;m.depthWrite=false;}
        }return m;};
      object.material=Array.isArray(object.material)?object.material.map(polish):polish(object.material);object.castShadow=false;object.receiveShadow=true;
    });
  }
  return {group,dispose(){group.removeFromParent();materials.forEach(m=>m.dispose());group.clear();}};
}
