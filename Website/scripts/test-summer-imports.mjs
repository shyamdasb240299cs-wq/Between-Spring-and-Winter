/** Verify actual licensed GLB binaries and independent skinned runtime bodies. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';

const root=path.resolve(import.meta.dirname,'..'),cache=new Map(),loader=new GLTFLoader();
async function sourceModule(file){
  if(cache.has(file))return cache.get(file);
  let code=ts.transpileModule(await fs.readFile(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  for(const match of [...code.matchAll(/from\s+(['"])([^'"]+)\1/g)]){
    const spec=match[2],url=spec.startsWith('.')?await sourceModule(path.resolve(path.dirname(file),spec+'.ts')):import.meta.resolve(spec);
    code=code.replace(match[0],`from ${JSON.stringify(url)}`);
  }
  const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(file,url);return url;
}
async function load(file){const bytes=await fs.readFile(path.join(root,'public',file));return (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;}
const {createSummerModelKit}=await import(await sourceModule(path.join(root,'app/shrine-void/summer-models.ts')));
const templates={
  'summer-diver':await load('seasons/kit/summer/imported/summer-wetsuit.glb'),
  'summer-scuba-gear':await load('seasons/kit/summer/imported/summer-scuba-equipment.glb'),
};
const kit=createSummerModelKit(undefined,undefined,templates),rack=kit.scuba(),player=kit.scuba();
assert.equal(rack.imported,true);assert.equal(player.imported,true);
const skins=[];player.root.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});assert.equal(skins.length,1);
const rackBone=rack.root.getObjectByName('leg_joint_R_1'),playerBone=player.root.getObjectByName('leg_joint_R_1');
assert.notEqual(rackBone,playerBone,'Rack and player must have independent skeletons');
const neutral=rackBone.quaternion.clone();
player.legs[0].rotation.x=.24;player.legs[1].rotation.x=-.24;player.updatePose(1,true,false,true);
assert(rackBone.quaternion.angleTo(neutral)<1e-6,'Player kick must not deform the rack');
assert(playerBone.quaternion.angleTo(rackBone.quaternion)>.15,'Kick must deform the actual weighted model');
assert.equal(player.mask.visible,false,'First person lens must not obscure the camera');
for(const body of [rack,player]){
  body.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(body.root);
  assert([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite));
  assert(bounds.max.y<1.9&&bounds.min.y>-.15,'Diver must retain human metre-scale bounds');
  assert(bounds.max.x-bounds.min.x<1.25,'Relaxed suit must fit its actual shelter rack');
  assert(body.root.getObjectByName('ImportedBCD,cylinder,regulatorsandgauges·SterenGiannini')||body.bcd.children.length>0);
}
for(const fin of rack.fins)fin.visible=false;
// A neutral GLB preview uses exactly the assembled runtime parts and bone pose.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}};
const preview=await new GLTFExporter().parseAsync(rack.root,{binary:true,onlyVisible:true});
const previewFile=path.resolve(root,'../Assets and working files/seasons/summer-imported/summer-runtime-rack-preview.glb');
await fs.writeFile(previewFile,new Uint8Array(preview));await new NodeIO().read(previewFile);
kit.dispose();console.log('PASS: local licensed binaries, independent skins, actual bone deformation, metre scale, first-person mask, and assembled GLB preview');
