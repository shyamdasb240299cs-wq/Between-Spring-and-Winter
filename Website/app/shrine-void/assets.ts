import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface PhotoEntry { id: string; src: string; caption: string; aspectRatio?: number }
export interface PhotoManifest { photos: PhotoEntry[]; replay: 'once' | 'loop' }
export interface ModelPart { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; name: string }
export interface VoidAssets {
  trees: ModelPart[][][]; lantern: ModelPart[]; lanternFar:ModelPart[]; rocks: ModelPart[]; rocksFar:ModelPart[]; crystal: ModelPart[];
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
    for (const t of [material.map,material.normalMap,material.roughnessMap]) if (t) t.anisotropy = /foliage/i.test(material.name)?2:t===material.map?8:2;
    return { geometry, material, name: merge?material.name:geometries[0].name };
  });
}
async function texture(url: string, color = true) {
  const t = await textureLoader.loadAsync(url);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}
export function preloadVoidAssets(): Promise<VoidAssets> {
  if (!preload) preload = (async () => {
    const manifestResponse = await fetch('/void/manifest.json');
    if (!manifestResponse.ok) throw new Error('The memory collection could not load.');
    const manifest = await manifestResponse.json() as PhotoManifest;
    if (!manifest.photos?.length) throw new Error('No photographs have been configured.');
    const bindings = await (await fetch('/void/textures/jagobo/bindings.json')).json() as Record<string,Record<string,string>>;
    sharedMaterials = Object.fromEntries(await Promise.all(Object.entries(bindings).map(async ([name,entries]) => [name,Object.fromEntries(await Promise.all(Object.entries(entries).map(async ([key,url]) => {const t=await texture(url,key==='map'||key==='emissiveMap');t.flipY=false;return [key,t];})))])));
    const blossom=sharedMaterials.foliage?.map;
    if(blossom){
      blossom.anisotropy=2;
      const base=blossom.image as HTMLImageElement,levels=Math.floor(Math.log2(base.width));
      const images=await Promise.all(Array.from({length:levels},(_,i)=>textureLoader.loadAsync(`/void/textures/jagobo/foliage-mip-${i+1}.webp`).then(t=>t.image)));
      // Coverage-corrected alpha mips retain small authored flowers, rather than
      // clipping the canopy into bare branches as its cards become smaller.
      blossom.mipmaps=[base,...images].map(image=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d')!.drawImage(image,0,0);return canvas;});blossom.generateMipmaps=false;blossom.needsUpdate=true;
    }
    const [trees,lantern,lanternFar,rocks,rocksFar,crystal,stone,stoneNormal,petal,photos] = await Promise.all([
      Promise.all([0,1,2].map(variant => Promise.all(['near','mid','far'].map(level => model(`/void/models/jagobo/tree-${variant}-${level}.glb`))))),
      model('/void/models/jagobo/lantern.glb'),model('/void/models/jagobo/lantern-far.glb'),
      model('/void/models/polished/moss-rocks.glb',false),model('/void/models/polished/moss-rocks-far.glb',false),
      model('/void/models/crystal.glb',false),
      texture('/void/textures/stone_wall/mossy_stone_wall_diff_1k.jpg'), texture('/void/textures/stone_wall/mossy_stone_wall_nor_gl_1k.jpg',false),
      texture('/scene/layers/sakura-petal-1.svg'),
      Promise.all(manifest.photos.slice(0,6).filter(p => p.src).map(async p => [p.src,await texture(p.src)] as const))
    ]);
    stone.wrapS = stone.wrapT = stoneNormal.wrapS = stoneNormal.wrapT = THREE.RepeatWrapping;
    // Source scan meshes have different centres. Centre each rock before instancing.
    for(const [index,part] of rocks.entries()){
      part.geometry.computeBoundingBox();const box=part.geometry.boundingBox!,size=new THREE.Vector3();box.getSize(size);const centre=new THREE.Vector3();box.getCenter(centre);
      const scale=1.8/Math.max(size.x,size.z),far=rocksFar.find(p=>p.name===part.name)||rocksFar[index];
      for(const geometry of [part.geometry,far.geometry]){geometry.translate(-centre.x,-box.min.y,-centre.z);geometry.scale(scale,scale,scale);geometry.computeBoundingSphere();}
      far.material=part.material;
    }
    lanternFar.forEach((part,i)=>{part.material=lantern.find(p=>p.name===part.name)?.material||lantern[i].material;});
    return { trees,lantern,lanternFar,rocks,rocksFar,crystal,stone,stoneNormal,petal,manifest,photos: new Map(photos) };
  })().catch(error => { preload = null; throw error; });
  return preload;
}
/** Shared model buffers/textures survive re-entry; only scene-owned materials are disposed. */
export function prewarmVoid() { void preloadVoidAssets().catch(() => {}); }
