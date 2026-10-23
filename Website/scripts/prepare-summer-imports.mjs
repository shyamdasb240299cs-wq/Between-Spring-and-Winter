/** Source audit/manifest after prepare-summer-imports.py exports via Blender. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';

const root=path.resolve(import.meta.dirname,'..'),work=path.resolve(root,'../Assets and working files/seasons/summer-imported'),out=path.join(root,'public/seasons/kit/summer/imported');
const specs=[
  {id:'summer-diver',file:'summer-wetsuit.glb',sourceFile:'cesium-man-source.glb',source:'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CesiumMan',download:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',author:'Cesium',copyright:'Copyright 2017 Cesium',license:'CC-BY-4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',authoringFile:'summer-wetsuit.blend',modifications:'Artist-authored skinned body adapted into a headless graphite/blue neoprene wetsuit; original logo-bearing texture and head removed; smooth vertex-color panels; original weights and bones retained. This is an adaptation of a human base mesh, not a scanned scuba suit.'},
  {id:'summer-scuba-gear',file:'summer-scuba-equipment.glb',sourceFile:'steren-scuba-equipment-source.glb',source:'https://poly.pizza/m/7igrHLjaQlW',download:'https://static.poly.pizza/efda7497-db5e-47e9-b317-8e8baeb1c616.glb',author:'Steren Giannini',copyright:'Scuba equipment by Steren Giannini',license:'CC-BY-3.0',licenseUrl:'https://creativecommons.org/licenses/by/3.0/',authoringFile:'summer-scuba-equipment.blend',modifications:'Preserved source BCD, cylinder, primary/safety regulator, hoses and gauges; adapted navy/metal palette and smooth normals; runtime mount normalized to the wetsuit.'},
];
const loader=new GLTFLoader(),io=new NodeIO(),models=[];
for(const spec of specs){
  const sourceBytes=await fs.readFile(path.join(work,spec.sourceFile)),bytes=await fs.readFile(path.join(out,spec.file));
  const doc=await io.read(path.join(out,spec.file)),gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(gltf.scene),primitives=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives());
  models.push({...spec,url:'/seasons/kit/summer/imported/'+spec.file,retrieved:'2026-10-22',sourceSha256:crypto.createHash('sha256').update(sourceBytes).digest('hex'),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,sourceBytes:sourceBytes.length,triangles:primitives.reduce((total,p)=>total+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),vertices:primitives.reduce((total,p)=>total+p.getAttribute('POSITION').getCount(),0),materials:doc.getRoot().listMaterials().length,textures:doc.getRoot().listTextures().length,dimensionsMetres:bounds.getSize(new THREE.Vector3()).toArray(),bounds:[bounds.min.toArray(),bounds.max.toArray()],skinBones:doc.getRoot().listSkins().flatMap(s=>s.listJoints().map(j=>j.getName())),clips:doc.getRoot().listAnimations().map(a=>a.getName()),decodedGeometryBytes:doc.getRoot().listAccessors().reduce((total,a)=>total+a.getByteLength(),0),acceptance:{rights:'Exact source metadata and licence verified; notices preserved',binary:'Source and adapted GLBs parsed; weighted body and original BCD geometry present',visual:'Source and neutral adapted models rendered and inspected locally; assembled runtime rack preview retained',animation:'Independent SkeletonUtils clones and actual bone deformation covered by test-summer-imports.mjs',runtime:'Parent scene gameplay and visual QA required'}});
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({version:1,prepared:'2026-10-22',coordinateSystem:'Y_UP_METRES',models},null,2)+'\n');
await fs.writeFile(path.join(out,'LICENSES.txt'),models.map(s=>`${s.copyright}\n${s.source}\n${s.license}: ${s.licenseUrl}\nChanges: ${s.modifications}\n`).join('\n'));
console.log(models.map(m=>`${m.file}: ${m.triangles} triangles, ${(m.bytes/1024).toFixed(1)} KiB, ${m.skinBones.length} bones`).join('\n'));
