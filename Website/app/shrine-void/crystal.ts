import * as THREE from 'three';
import type {VoidAssets} from './assets';
import {CRYSTAL_DISTANCE} from './awakening';

/** The supplied crystal geometry, seated in a real scanned-rock pedestal. */
export function createCrystal(assets:VoidAssets){
  const group=new THREE.Group(),reflection=new THREE.Group(),geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
  const model=new THREE.Group(),modelReflection=new THREE.Group();group.add(model);reflection.add(modelReflection);
  const parts=assets.crystal;
  const bounds=new THREE.Box3();parts.filter(p=>/^(Base|Crystal)/.test(p.name)).forEach(p=>{p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox!);});
  const centre=bounds.getCenter(new THREE.Vector3()),scale=1.15/(bounds.max.y-bounds.min.y);
  const crystalMaterials:THREE.MeshStandardMaterial[]=[],proxyMaterials:THREE.MeshBasicMaterial[]=[];
  for(const part of parts){
    const g=part.geometry.clone();g.translate(-centre.x,-bounds.min.y,-centre.z);g.scale(scale,scale,scale);g.translate(0,1.12,0);geometries.push(g);
    // Preserve every original mesh, material, culling rule, moon and sparkle.
    const m=part.material.clone();
    m.userData.baseEmission=m.emissiveIntensity;
    const r=new THREE.MeshBasicMaterial({color:m.color.clone().add(m.emissive.clone().multiplyScalar(m.emissiveIntensity)),side:m.side});r.userData.baseColour=r.color.clone();
    materials.push(m,r);crystalMaterials.push(m);proxyMaterials.push(r);model.add(new THREE.Mesh(g,m));modelReflection.add(new THREE.Mesh(g,r));
  }
  // One stable central support with a level top, and a low ring of rocks.
  // Bound heights explicitly so no scan protrudes through the crystal's base.
  for(let i=0;i<8;i++){
    const part=assets.rocks[i%assets.rocks.length],m=part.material.clone();m.color.set(0xc3b5b0);materials.push(m);
    part.geometry.computeBoundingBox();const height=part.geometry.boundingBox!.max.y-part.geometry.boundingBox!.min.y;
    let geometry=part.geometry,supportHeight=height;
    if(i===0){geometry=part.geometry.clone();geometries.push(geometry);const p=geometry.getAttribute('position');supportHeight=height*.68;for(let v=0;v<p.count;v++)p.setY(v,Math.min(p.getY(v),supportHeight));geometry.computeVertexNormals();geometry.computeBoundingSphere();}
    const rock=new THREE.Mesh(geometry,m),angle=(i-1)*Math.PI*2/7;
    rock.position.set(i?Math.cos(angle)*.72:0,.035,i?Math.sin(angle)*.58:0);
    rock.scale.set(i?.47:.9,(i?.35:1.085)/supportHeight,i?.47:.76);rock.rotation.y=i?angle:.35;group.add(rock);
    const reflectedMaterial=new THREE.MeshBasicMaterial({map:m.map,color:0x403345});materials.push(reflectedMaterial);const reflected=new THREE.Mesh(geometry,reflectedMaterial);reflected.position.copy(rock.position);reflected.scale.copy(rock.scale);reflected.rotation.copy(rock.rotation);reflection.add(reflected);
  }
  const light=new THREE.PointLight(0xffffff,10,8,2);light.position.set(.8,2.8,1.3);group.add(light);
  group.position.z=reflection.position.z=-CRYSTAL_DISTANCE;
  return {group,reflection,update(time:number,power:number,charging:boolean,origin:number,reduced:boolean){
    group.position.z=reflection.position.z=origin-CRYSTAL_DISTANCE;
    model.visible=modelReflection.visible=power>.001;
    const shake=charging&&!reduced?Math.min(.012,Math.max(0,power-1)*.003):0;
    model.position.x=modelReflection.position.x=(Math.sin(time*24)+Math.sin(time*31)*.25)*shake;
    model.rotation.z=modelReflection.rotation.z=Math.sin(time*19)*shake*.18;
    crystalMaterials.forEach(m=>{m.emissiveIntensity=power*m.userData.baseEmission;});
    proxyMaterials.forEach(m=>m.color.copy(m.userData.baseColour).multiplyScalar(power));
    light.intensity=power*10;
  },dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
