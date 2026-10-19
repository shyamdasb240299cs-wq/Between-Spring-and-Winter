import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,join,transformMesh} from '@gltf-transform/functions';

const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'Website/public/seasons/kit');
const source=path.join(root,'Assets and working files/seasons/kit/beach-ball/source.glb');
await fs.mkdir(path.dirname(source),{recursive:true});
if(!await fs.stat(source).catch(()=>null)){
  const response=await fetch('https://static.poly.pizza/504cc9cd-cbdc-4724-ab60-5899846aff1d.glb');
  if(!response.ok)throw new Error(`Beach ball download: ${response.status}`);
  await fs.writeFile(source,Buffer.from(await response.arrayBuffer()));
}
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(source),scene=doc.getRoot().listScenes()[0];
const meshes=[];scene.traverse(node=>{if(node.getMesh())meshes.push([node,node.getWorldMatrix()]);});
for(const[node,matrix]of meshes){const mesh=node.getMesh().clone();node.setMesh(mesh);transformMesh(mesh,matrix);node.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);scene.addChild(node);}
const bounds=getBounds(scene),scale=.54/Math.max(bounds.max[0]-bounds.min[0],bounds.max[1]-bounds.min[1],bounds.max[2]-bounds.min[2]);
const matrix=[scale,0,0,0,0,scale,0,0,0,0,scale,0,-(bounds.max[0]+bounds.min[0])*.5*scale,-bounds.min[1]*scale,-(bounds.max[2]+bounds.min[2])*.5*scale,1];
for(const[node]of meshes){transformMesh(node.getMesh(),matrix);for(const primitive of node.getMesh().listPrimitives()){
  const normal=primitive.getAttribute('NORMAL'),position=primitive.getAttribute('POSITION');
  if(normal)for(let i=0;i<position.getCount();i++){
    const x=position.getArray()[i*3],y=position.getArray()[i*3+1]-.27,z=position.getArray()[i*3+2],length=Math.hypot(x,y,z)||1;
    normal.setElement(i,[x/length,y/length,z/length]);
  }
}}
for(const material of doc.getRoot().listMaterials())material.setMetallicFactor(0).setRoughnessFactor(.43);
await doc.transform(weld(),dedup(),prune(),join());
const triangles=doc.getRoot().listMeshes().reduce((sum,mesh)=>sum+mesh.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
const lods={};for(const level of ['near','mid','far']){const name=`ball-0-${level}.glb`;await io.write(path.join(out,'models',name),doc);lods[level]={url:`/seasons/kit/models/${name}`,triangles:Math.round(triangles),bytes:(await fs.stat(path.join(out,'models',name))).size};}
const catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8'));
catalog.models.ball={name:'Beach ball',source:'https://poly.pizza/m/4IwPTeOmq6c',author:'the_ normalgamer',license:'CC-BY-3.0',variants:[{id:'0',bounds:getBounds(scene),height:.54,lods}],notes:['Downloaded source mesh, normalized to 54 cm diameter, smooth normals and vinyl roughness adapted.']};
await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
console.log('Prepared round beach ball',triangles,'triangles');
