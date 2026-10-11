import * as THREE from 'three';
import type { VoidAssets } from './assets';

export function createFoliageGroup(assets: VoidAssets) {
  const group = new THREE.Group(), reflection = new THREE.Group();
  const batches: THREE.InstancedMesh[][][] = [], proxies: THREE.InstancedMesh[][][] = [];
  const materials: THREE.Material[] = [];
  const wind = { value: 0 };
  assets.trees.forEach((lods,variant) => {
    batches[variant] = lods.map(parts => parts.map(part => {
      const blossom = /foliage/i.test(part.name);
      const mat = blossom ? new THREE.MeshLambertMaterial({
        map: part.material.map, color: blossom ? 0xffe4d9 : 0xcbbbad,
        emissive: blossom ? 0xff91af : 0x000000, emissiveMap: blossom ? part.material.map : null,
        emissiveIntensity: blossom ? .58 : 0,
        side: blossom ? THREE.DoubleSide : THREE.FrontSide, alphaTest: blossom ? .38 : 0,
      }) : new THREE.MeshStandardMaterial({map:part.material.map,normalMap:part.material.normalMap,roughnessMap:part.material.roughnessMap,normalScale:new THREE.Vector2(.8,.8),color:0xd8c8c2,roughness:.95});
      mat.onBeforeCompile = shader => {
        shader.uniforms.windTime = wind;
        shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat sway=pow(clamp(position.y/8.5,0.,1.),2.); transformed.x += sin(windTime*.55+position.y*.7+position.z*.4)*.055*sway;');
      };
      mat.userData.revealColour=mat.color.clone();materials.push(mat);
      const mesh = new THREE.InstancedMesh(part.geometry,mat,32);mesh.count = 0;mesh.frustumCulled = false;
      if(blossom)mesh.setColorAt(0,new THREE.Color(0xffffff));
      group.add(mesh);return mesh;
    }));
    proxies[variant] = lods.slice(1).map(parts=>parts.map(part => {
      const mat = new THREE.MeshBasicMaterial({ map: part.material.map, color: /foliage/i.test(part.name) ? new THREE.Color(1.55,.8,1.05) : new THREE.Color(0x655049), alphaTest: .38, side: THREE.DoubleSide });
      mat.userData.revealColour=mat.color.clone();materials.push(mat);const mesh = new THREE.InstancedMesh(part.geometry,mat,32);mesh.setColorAt(0,new THREE.Color(0xffffff));mesh.count = 0;mesh.frustumCulled = false;reflection.add(mesh);return mesh;
    }));
  });
  const transform = new THREE.Object3D();
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere();
  const bounds=assets.trees.map(lods=>{const box=new THREE.Box3();for(const part of lods[0]){part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox!);}return box.getBoundingSphere(new THREE.Sphere());});
  const blossomTints=[0xffe4ed,0xffdfcb,0xffc9df].map(hex=>new THREE.Color(hex));
  let last = '';
  function place(distance: number, origin: number, low: boolean,camera:THREE.PerspectiveCamera) {
    const first = Math.floor(distance / 9) - 3;
    const key = `${first}:${Number(low)}:${Math.floor(distance/1.5)}:${Math.round(camera.rotation.y*10)}:${Math.round(camera.rotation.x*10)}`;
    if (key === last && group.userData.origin === origin) return;
    last = key;group.userData.origin = origin;
    camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
    batches.flat(2).forEach(m => m.count = 0);proxies.flat(2).forEach(m => m.count = 0);
    for (let n = Math.max(0,first); n < first + 17; n++) for (const sign of [-1,1]) {
      const variant = (n + (sign > 0 ? 1 : 0)) % 3, delta = n * 9 + 2 - distance;
      // Keep the nearest authored canopy in full detail on every quality tier.
      const lod = delta < 13 ? 0 : delta < (low ? 28 : 40) ? 1 : 2;
      const scale = .94 + Math.sin(n * 7 + sign) * .08;
      transform.position.set(sign * 6.1,.15,origin - n * 9 - 2);
      transform.rotation.set(0,sign < 0 ? .12 : Math.PI-.12,sign * -.035);
      transform.scale.setScalar(scale);transform.updateMatrix();
      sphere.copy(bounds[variant]).applyMatrix4(transform.matrix);
      if(frustum.intersectsSphere(sphere))for (const mesh of batches[variant][lod]) {const slot=mesh.count++;mesh.setMatrixAt(slot,transform.matrix);if(mesh.material instanceof THREE.MeshLambertMaterial)mesh.setColorAt(slot,blossomTints[(n+variant)%3]);}
      // Water distortion hides small branches: reflected trees use the authored
      // far mesh while the nearest visible trees retain full geometry above it.
      for (const mesh of proxies[variant][1]) {const slot=mesh.count++;mesh.setMatrixAt(slot,transform.matrix);mesh.setColorAt(slot,blossomTints[(n+variant)%3]);}
    }
    [...batches.flat(2),...proxies.flat(2)].forEach(m => {m.instanceMatrix.needsUpdate = true;if(m.instanceColor)m.instanceColor.needsUpdate=true;});
  }
  return { group,reflection,place,update(time: number,reveal=1) { wind.value = time;group.visible=reflection.visible=reveal>.001;materials.forEach(material=>{const m=material as THREE.MeshLambertMaterial;m.color.copy(m.userData.revealColour).multiplyScalar(reveal);if(m instanceof THREE.MeshLambertMaterial)m.emissiveIntensity=.58*reveal;}); },dispose() { materials.forEach(m => m.dispose());batches.flat(2).forEach(m=>m.dispose());proxies.flat(2).forEach(m=>m.dispose()); } };
}
