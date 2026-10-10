import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface PhotoEntry { id: string; src: string; caption: string; aspectRatio?: number }
export interface PhotoManifest { photos: PhotoEntry[]; replay: 'once' | 'loop' }
export interface ModelPart { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; name: string }
export interface VoidAssets {
  trees: ModelPart[][][]; lantern: ModelPart[]; rocks: ModelPart[]; crystal: ModelPart[];
  stone: THREE.Texture; stoneNormal: THREE.Texture; petal: THREE.Texture;
  manifest: PhotoManifest; photos: Map<string, THREE.Texture>;
}
let preload: Promise<VoidAssets> | null = null;
const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
let sharedMaterials: Record<string, Partial<Record<'map'|'normalMap'|'roughnessMap'|'emissiveMap',THREE.Texture>>> = {};
async function model(url: string,merge = true): Promise<ModelPart[]> {
  const gltf = await loader.loadAsync(url); gltf.scene.updateMatrixWorld(true);
  const byMaterial = new Map<THREE.MeshStandardMaterial, THREE.BufferGeometry[]>();
  gltf.scene.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    const material = merge ? o.material as THREE.MeshStandardMaterial : (o.material as THREE.MeshStandardMaterial).clone();
    const geometries = byMaterial.get(material) || [];
    const baked=o.geometry.clone().applyMatrix4(o.matrixWorld);baked.name=o.name;geometries.push(baked); byMaterial.set(material, geometries);
    o.geometry.dispose();
  });
  return [...byMaterial].map(([material, geometries]) => {
    Object.assign(material,sharedMaterials[material.name]);
    const geometry = mergeGeometries(geometries, false)!;
    geometries.forEach(g => g.dispose()); geometry.computeBoundingSphere();
    for (const t of [material.map,material.normalMap,material.roughnessMap]) if (t) t.anisotropy = 2;
    return { geometry, material, name: merge?material.name:geometries[0].name };
  });
}
async function texture(url: string, color = true) {
  const t = await textureLoader.loadAsync(url);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2; return t;
}
export function preloadVoidAssets(): Promise<VoidAssets> {
  if (!preload) preload = (async () => {
    const manifestResponse = await fetch('/void/manifest.json');
    if (!manifestResponse.ok) throw new Error('The memory collection could not load.');
    const manifest = await manifestResponse.json() as PhotoManifest;
    if (!manifest.photos?.length) throw new Error('No photographs have been configured.');
    const bindings = await (await fetch('/void/textures/jagobo/bindings.json')).json() as Record<string,Record<string,string>>;
    sharedMaterials = Object.fromEntries(await Promise.all(Object.entries(bindings).map(async ([name,entries]) => [name,Object.fromEntries(await Promise.all(Object.entries(entries).map(async ([key,url]) => {const t=await texture(url,key==='map'||key==='emissiveMap');t.flipY=false;return [key,t];})))])));
    const [trees,lantern,rocks,crystal,stone,stoneNormal,petal,photos] = await Promise.all([
      Promise.all([0,1,2].map(variant => Promise.all(['near','mid','far'].map(level => model(`/void/models/jagobo/tree-${variant}-${level}.glb`))))),
      model('/void/models/jagobo/lantern.glb'), model('/void/models/polished/moss-rocks.glb',false),
      model('/void/models/crystal.glb',false),
      texture('/void/textures/stone_wall/mossy_stone_wall_diff_1k.jpg'), texture('/void/textures/stone_wall/mossy_stone_wall_nor_gl_1k.jpg',false),
      texture('/void/textures/petal_centered.webp'),
      Promise.all(manifest.photos.slice(0,6).filter(p => p.src).map(async p => [p.src,await texture(p.src)] as const))
    ]);
    stone.wrapS = stone.wrapT = stoneNormal.wrapS = stoneNormal.wrapT = THREE.RepeatWrapping;
    // Source scan meshes have different centres. Centre each rock before instancing.
    for(const part of rocks){part.geometry.computeBoundingBox();const box=part.geometry.boundingBox!,size=new THREE.Vector3();box.getSize(size);const centre=new THREE.Vector3();box.getCenter(centre);part.geometry.translate(-centre.x,-box.min.y,-centre.z);const scale=1.8/Math.max(size.x,size.z);part.geometry.scale(scale,scale,scale);part.geometry.computeBoundingSphere();}
    return { trees,lantern,rocks,crystal,stone,stoneNormal,petal,manifest,photos: new Map(photos) };
  })().catch(error => { preload = null; throw error; });
  return preload;
}
/** Shared model buffers/textures survive re-entry; only scene-owned materials are disposed. */
export function prewarmVoid() { void preloadVoidAssets().catch(() => {}); }
