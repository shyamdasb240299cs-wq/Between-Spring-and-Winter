/** Reproducible original Summer model exports. No remote asset or licence guess.
 * Editable procedural sources remain in app/shrine-void/summer-{models,wildlife}.ts.
 * Runtime uses those same sources so animated parts retain their exact local pivots. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';
import {Document,NodeIO} from '@gltf-transform/core';

const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'public/seasons/kit/summer');
await fs.mkdir(out,{recursive:true});
const cache=new Map();
async function sourceModule(filename){
  if(cache.has(filename))return cache.get(filename);
  let source=ts.transpileModule(await fs.readFile(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const matches=[...source.matchAll(/from\s+(['"])([^'"]+)\1/g)];
  for(const match of matches){const spec=match[2],resolved=spec.startsWith('.')?await sourceModule(path.resolve(path.dirname(filename),spec+'.ts')):import.meta.resolve(spec);source=source.replace(match[0],`from ${JSON.stringify(resolved)}`);}
  const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(filename,url);return url;
}
const [{createSummerModelKit},{createSummerCorals,createSummerFishGeometry}]=await Promise.all([
  sourceModule(path.join(root,'app/shrine-void/summer-models.ts')).then(url=>import(url)),
  sourceModule(path.join(root,'app/shrine-void/summer-wildlife.ts')).then(url=>import(url)),
]);
const kit=createSummerModelKit(),corals=createSummerCorals({compact:true}),io=new NodeIO();
const models=[
  {name:'boat',root:kit.createBoat().root,moving:['Steering wheel pivot','Dry bag','Tank cap pivot','Engine supply hose','Outboard steer pivot','Propeller pivot','Stern ladder hinge','Fuel needle'],description:'Original 5.89m RIB with lofted V hull, inflatable collar, two seats, fitted tray, cap/tank/hose and outboard.'},
  {name:'scuba',root:kit.scuba().root,moving:['Left sleeve and glove','Right sleeve and glove','Wetsuit leg','Fitted fin','BCD cylinder regulator connected','Mask and adjustable strap'],description:'Original full wetsuit, BCD/cylinder/regulator, mask, fins, gloves, torch, compass and slate.'},
  {name:'keepsake-case',root:kit.keepsake().root,moving:['Case lid hinge'],description:'Original sealed case with carry handle, gasket, latches, shaped padding, dry letter and Summer book.'},
  {name:'fuel-can',root:kit.fuelCan(),moving:[],description:'Original red fuel can with cap, grip and stamped ribs.'},
];
for(let i=0;i<4;i++){const source=new THREE.Group();source.add(new THREE.Mesh(corals.sources[i],corals.materials[i]));models.push({name:['coral-branch','coral-fan','coral-mound','coral-table'][i],root:source,moving:[],description:'Original dimensional '+['branching','upright fan','lobed mound','tiered table'][i]+' coral source.'});}
for(let i=0;i<3;i++){
  const source=new THREE.Group(),geometry=createSummerFishGeometry(i),material=new THREE.MeshStandardMaterial({vertexColors:true,metalness:i===0?.08:.32,roughness:i===0?.58:.36});source.add(new THREE.Mesh(geometry,material));
  models.push({name:['fish-butterfly','fish-silver','fish-lagoon'][i],root:source,moving:['Posterior vertex deformation in summer-wildlife.ts'],description:'Original '+['butterflyfish-like browser','small silver school fish','larger lagoon browser'][i]+' with eyes, gill body sections and dimensional paired/caudal/dorsal fins.'});
}
const records=[];
for(const spec of models){
  const doc=new Document(),buffer=doc.createBuffer('Summer original geometry'),scene=doc.createScene('Summer original · '+spec.name),materials=new Map(),meshes=new Map();
  let triangles=0,vertices=0;const nodes=[];
  function material(source){if(materials.has(source))return materials.get(source);const m=doc.createMaterial(source.name||'Original Summer material').setBaseColorFactor([source.color?.r??1,source.color?.g??1,source.color?.b??1,source.opacity??1]).setMetallicFactor(source.metalness??0).setRoughnessFactor(source.roughness??.8).setDoubleSided(source.side===THREE.DoubleSide);if(source.transparent)m.setAlphaMode('BLEND');materials.set(source,m);return m;}
  function convert(o){
    const node=doc.createNode(o.name||'Original authored part').setTranslation(o.position.toArray()).setRotation(o.quaternion.toArray()).setScale(o.scale.toArray());nodes.push(o.name);
    if(o instanceof THREE.Mesh){
      const source=o.geometry;let byMaterial=meshes.get(source);if(!byMaterial){byMaterial=new Map();meshes.set(source,byMaterial);}const mat=Array.isArray(o.material)?o.material[0]:o.material;
      let mesh=byMaterial.get(mat);if(!mesh){const p=doc.createPrimitive().setMaterial(material(mat));for(const [key,semantic,type]of [['position','POSITION','VEC3'],['normal','NORMAL','VEC3'],['uv','TEXCOORD_0','VEC2'],['color','COLOR_0','VEC3']]){const a=source.getAttribute(key);if(!a)continue;const copied=new Float32Array(a.array);p.setAttribute(semantic,doc.createAccessor(spec.name+' '+semantic).setType(type).setArray(copied).setBuffer(buffer));}if(source.index)p.setIndices(doc.createAccessor(spec.name+' indices').setType('SCALAR').setArray(new Uint32Array(source.index.array)).setBuffer(buffer));mesh=doc.createMesh(o.name||spec.name).addPrimitive(p);byMaterial.set(mat,mesh);vertices+=source.getAttribute('position').count;triangles+=(source.index?.count??source.getAttribute('position').count)/3;}node.setMesh(mesh);
    }
    o.children.forEach(child=>node.addChild(convert(child)));return node;
  }
  scene.addChild(convert(spec.root));spec.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(spec.root),bytes=await io.writeBinary(doc),file=spec.name+'.glb';await fs.writeFile(path.join(out,file),bytes);
  records.push({id:spec.name,file,url:'/seasons/kit/summer/'+file,creator:'Original Between Spring and Winter project authoring',rights:'Project original; no third-party geometry',sourceFiles:['app/shrine-void/summer-models.ts','app/shrine-void/summer-wildlife.ts'],sourceSha256:await Promise.all(['summer-models.ts','summer-wildlife.ts'].map(async file=>crypto.createHash('sha256').update(await fs.readFile(path.join(root,'app/shrine-void',file))).digest('hex'))),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.byteLength,dimensionsMetres:bounds.getSize(new THREE.Vector3()).toArray(),bounds:[bounds.min.toArray(),bounds.max.toArray()],triangles,vertices,materials:materials.size,movingNodes:spec.moving,namedNodes:nodes.filter(Boolean),description:spec.description,acceptance:{source:'original authored',binary:'exported and parsed',visual:'runtime review required',animation:'runtime pivots/deformation, no baked GLB clips',lod:'single reusable source; runtime instancing and density reduction'}});
  // Parse the actual binary rather than counting source objects as export success.
  await io.read(path.join(out,file));process.stdout.write(`${file}: ${Math.round(triangles)} triangles, ${(bytes.byteLength/1024).toFixed(0)} KiB\n`);
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({version:1,coordinateSystem:'Y_UP_METRES',prepared:'2026-10-22',description:'Original exportable sources, instantiated from matching editable TypeScript authoring at runtime.',models:records},null,2)+'\n');
kit.dispose();corals.dispose();
