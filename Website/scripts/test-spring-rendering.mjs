import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import * as THREE from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.'))return n(s+'.ts',c);throw e;}}});
const {createSpringAdaviEnvironment}=await import('../app/shrine-void/spring-adavi-environment.ts');
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const kit=JSON.parse(await readFile('public/seasons/kit/catalog.json','utf8'));
const urls={
  'forest-tree-near':kit.models.maple.variants[0].lods.near.url,'forest-tree':kit.models.maple.variants[0].lods.mid.url,'forest-tree-far':kit.models.maple.variants[0].lods.far.url,
  'forest-tree-2-near':kit.models.maple.variants[1].lods.near.url,'forest-tree-2':kit.models.maple.variants[1].lods.mid.url,'forest-tree-2-far':kit.models.maple.variants[1].lods.far.url,
  'palm-near':kit.models.palm.variants[0].lods.near.url,palm:kit.models.palm.variants[0].lods.mid.url,'palm-far':kit.models.palm.variants[0].lods.far.url,
  'river-rock':kit.models['woodland-rock'].variants[0].lods.far.url,'river-pebble':kit.models['loose-rock'].variants[0].lods.far.url,
  grass:kit.models.grass.variants[2].lods.near.url,
};
const sourceTextures=new Set();
const models=Object.fromEntries(await Promise.all(Object.entries(urls).map(async([key,url])=>{
  const doc=await io.read('public'+url),root=new THREE.Group();
  const textureRefs=new Map();const textureFor=source=>{if(!source)return null;let texture=textureRefs.get(source);if(!texture){texture=new THREE.Texture();texture.name=source.getName();textureRefs.set(source,texture);sourceTextures.add(texture);}return texture;};
  for(const node of doc.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
    const g=new THREE.BufferGeometry();for(const [semantic,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=primitive.getAttribute(semantic);if(a)g.setAttribute(name,new THREE.BufferAttribute(a.getArray(),a.getElementSize()));}
    const index=primitive.getIndices();if(index)g.setIndex(new THREE.BufferAttribute(index.getArray(),1));g.applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
    const source=primitive.getMaterial(),m=new THREE.MeshStandardMaterial({map:textureFor(source?.getBaseColorTexture()),normalMap:textureFor(source?.getNormalTexture()),roughnessMap:textureFor(source?.getMetallicRoughnessTexture()),alphaTest:source?.getAlphaMode()==='MASK'?.5:0});m.name=source?.getName()??'';root.add(new THREE.Mesh(g,m));
  }return [key,root];
})));
const texture=new THREE.Texture(),maps={color:texture,normal:texture,roughness:texture,sizeMetres:2};
const forest=createSpringAdaviEnvironment({models,maps:{mud:maps,rock:maps,water:texture},mobile:false,reduced:false});
const scene=new THREE.Scene();scene.add(forest.group);scene.updateMatrixWorld(true);
const treeCells=[];forest.group.traverse(object=>{if(object instanceof THREE.LOD)treeCells.push(object);});
assert.ok(treeCells.length>0);
const isLeaf=material=>material.customProgramCacheKey().includes('green-foliage');
let closeLeafInstances=0,closeTrunkInstances=0,greenMaterials=0,barkMaterials=0;
const checkedMaterials=new Set();
for(const cell of treeCells){
  assert.deepEqual(cell.levels.map(level=>level.distance),[0,14,34],'Trees retain distinct close, middle and far detail');
  const levels=cell.levels.map(level=>level.object.children.filter(object=>object instanceof THREE.InstancedMesh));
  const nearTrunk=levels[0].find(batch=>!isLeaf(batch.material));assert.ok(nearTrunk,'Real imported tree trunks remain in each close cell');const placements=nearTrunk.count;
  for(const [index,batches]of levels.entries())for(const batch of batches){
    const leaf=isLeaf(batch.material);assert.equal(batch.count,placements*(index===0&&leaf?2:1),'Only close foliage receives the extra canopy cluster; trunks and distant foliage retain one instance per tree');
    if(index===0){assert.ok(batch.name.endsWith('-near'),'The closest level uses the actual high-detail GLB');if(leaf)closeLeafInstances+=batch.count;else closeTrunkInstances+=batch.count;}
    for(const material of Array.isArray(batch.material)?batch.material:[batch.material]){
      if(checkedMaterials.has(material))continue;checkedMaterials.add(material);
      assert.ok(sourceTextures.has(material.map),'Tree colour textures from the imported assets remain attached');
      if(leaf){
        greenMaterials++;assert.equal(material.transparent,false);assert.equal(material.side,THREE.DoubleSide);assert.ok(material.alphaTest>=.30&&material.alphaTest<.5,'Denser leaves retain a real alpha cutout');
        const shader={fragmentShader:'#include <map_fragment>\nfloat preservedAlpha=diffuseColor.a;'};material.onBeforeCompile(shader);
        assert.match(shader.fragmentShader,/springLeafLight/,'Leaf texture luminance is remapped to a green spring palette');assert.match(shader.fragmentShader,/#include <map_fragment>/);assert.match(shader.fragmentShader,/float preservedAlpha=diffuseColor.a;/);assert.doesNotMatch(shader.fragmentShader,/diffuseColor\.a\s*=/,'Green remapping preserves source leaf alpha');
        assert.ok(sourceTextures.has(material.normalMap),'Close and distant leaves keep their imported surface normals');
      }else{
        barkMaterials++;assert.ok(material.color.r<.25&&material.color.r>material.color.g&&material.color.g>material.color.b,'Trunks use a dark brown tint');assert.ok(sourceTextures.has(material.normalMap),'Dark trunks retain their imported bark normal texture');
      }
    }
  }
}
assert.ok(closeLeafInstances>0&&closeTrunkInstances>0&&greenMaterials>0&&barkMaterials>0);
let reflectedGreen=0;forest.reflectionScene.traverse(object=>{if(!(object instanceof THREE.Mesh))return;for(const material of Array.isArray(object.material)?object.material:[object.material])if(isLeaf(material)){reflectedGreen++;const shader={fragmentShader:'#include <map_fragment>'};material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/springLeafLight/);assert.ok(sourceTextures.has(material.map));assert.ok(material.alphaTest>.3);}});assert.ok(reflectedGreen>0,'Tree reflections retain green textured alpha-cut foliage');
const camera=new THREE.PerspectiveCamera(58,16/9,.1,240);camera.position.set(193,2.1,10);camera.rotation.set(-.1,-.48,0,'YXZ');camera.updateMatrixWorld(true);
const triangles=o=>(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o instanceof THREE.InstancedMesh?o.count:1);
let authored=0;const fullDetail=o=>{if(o instanceof THREE.LOD){fullDetail(o.levels[0].object);return;}if(o instanceof THREE.Mesh)authored+=triangles(o);for(const child of o.children)fullDetail(child);};fullDetail(forest.group);
const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
forest.group.traverse(o=>{if(o instanceof THREE.LOD)o.update(camera);});let visible=0;
forest.group.traverseVisible(o=>{if(o instanceof THREE.Mesh&&frustum.intersectsObject(o))visible+=triangles(o);});
assert.ok(visible<authored*.8,'Spatial culling and far detail reduce submitted geometry without removing placements');
assert.ok(forest.stats().reflectionTriangles<authored*.75,'Reflection does not redraw the full-detail forest');
forest.reflectionScene.traverse(o=>{assert.ok(!(o instanceof THREE.Light));if(o instanceof THREE.Mesh){assert.equal(o.castShadow,false);for(const m of Array.isArray(o.material)?o.material:[o.material])assert.ok(m instanceof THREE.MeshBasicMaterial,'Reflection pass has no PBR lighting');}});
const cascade=forest.group.getObjectByName('Joining forest tributary and three low cascades');
assert.equal(cascade.material.uniforms.tDiffuse,forest.water.material.uniforms.tDiffuse,'Cascades reuse the existing river capture');
// Exercise the real Reflector camera/capture path with a renderer spy, without WebGL.
let captures=0,reflectedVisible=0;const renderer={xr:{enabled:false},shadowMap:{autoUpdate:false},autoClear:true,getRenderTarget:()=>null,setRenderTarget(){},state:{buffers:{depth:{setMask(){}}}},render(s,c){assert.equal(s,forest.reflectionScene);assert.notEqual(c,camera);captures++;const f=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse));reflectedVisible=0;s.traverseVisible(o=>{if(o instanceof THREE.Mesh&&f.intersectsObject(o))reflectedVisible+=triangles(o);});}};
const capture=()=>forest.water.onBeforeRender(renderer,scene,camera,forest.water.geometry,forest.water.material,null);
capture();capture();assert.equal(captures,1,'A static view reuses its capture');
camera.rotation.y+=.002;camera.updateMatrixWorld(true);capture();assert.equal(captures,2,'Camera motion updates immediately without a low-frequency timer');
camera.position.x+=.01;camera.updateMatrixWorld(true);capture();assert.equal(captures,3);
camera.aspect=1;camera.updateProjectionMatrix();capture();assert.equal(captures,4,'Resize invalidates reflection projection');
forest.update(10);assert.equal(cascade.material.uniforms.time.value,10,'Water motion continues while reflection is cached');
const started=performance.now();for(let i=0;i<20000;i++)forest.height(193+(i%20)*.025,-25+(i%1200)*.04);const navigationMs=performance.now()-started;
console.log(JSON.stringify({authoredTriangles:Math.round(authored),visibleTriangles:Math.round(visible),reflectionTriangles:forest.stats().reflectionTriangles,reflectedVisibleTriangles:Math.round(reflectedVisible),treeDetailCells:treeCells.length,closeLeafInstances,closeTrunkPrimitiveInstances:closeTrunkInstances,greenMaterials,barkMaterials,navigation20000QueriesMs:Math.round(navigationMs*100)/100,captures},null,2));
forest.dispose();for(const root of Object.values(models))root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();o.material.dispose();}});
sourceTextures.forEach(texture=>texture.dispose());
console.log('Spring rendering passed: actual near/mid/far GLBs, close-only thick leaf clusters, textured green alpha-cut foliage, dark textured bark, actual asset bounds, spatial culling, isolated reflection, stationary capture reuse and immediate motion/resize updates. CPU checks do not measure GPU FPS.');
