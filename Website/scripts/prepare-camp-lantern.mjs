import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,join,transformMesh,textureCompress} from '@gltf-transform/functions';

const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'Website/public/seasons/kit');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(path.join(root,'Assets and working files/void-polish/candidates/khronos-lantern.glb'));
const scene=doc.getRoot().listScenes()[0],lamp=doc.getRoot().listNodes().find(node=>node.getName()==='LanternPole_Lantern');
if(!lamp)throw new Error('Missing original textured lantern');
const mesh=lamp.getMesh().clone();lamp.setMesh(mesh);transformMesh(mesh,lamp.getWorldMatrix());
for(const node of scene.listChildren())scene.removeChild(node);
lamp.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);scene.addChild(lamp);
const bounds=getBounds(scene),scale=.22/Math.max(bounds.max[0]-bounds.min[0],bounds.max[2]-bounds.min[2]);
transformMesh(mesh,[scale,0,0,0,0,scale,0,0,0,0,scale,0,-(bounds.max[0]+bounds.min[0])*.5*scale,-bounds.min[1]*scale,-(bounds.max[2]+bounds.min[2])*.5*scale,1]);
await doc.transform(weld(),dedup(),prune(),join(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[512,512],quality:87}));
const triangles=doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
const lods={};for(const level of ['near','mid','far']){const name=`lantern-0-${level}.glb`;await io.write(path.join(out,'models',name),doc);lods[level]={url:`/seasons/kit/models/${name}`,triangles:Math.round(triangles),bytes:(await fs.stat(path.join(out,'models',name))).size};}
const catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8'));
catalog.models.lantern={name:'Textured Lantern',source:'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Lantern',author:'Microsoft / sbtron',license:'CC0-1.0',variants:[{id:'0',bounds:getBounds(scene),height:getBounds(scene).max[1],lods}],notes:['Original lantern mesh and PBR/emission maps; pole and chain removed, normalized and textures compressed.']};
await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
console.log('Restored textured lantern',triangles,'triangles');
