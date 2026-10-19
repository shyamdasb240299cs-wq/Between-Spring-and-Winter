/** Run the companion Blender extractor first. Keep original atlas UVs and normals. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO,getBounds,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {copyToDocument,transformMesh,textureCompress,prune,dedup,unpartition} from '@gltf-transform/functions';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'Website/public/seasons/kit'),prepared=path.join(root,'Assets and working files/seasons/kit/prepared');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8'));
for(let vi=0;vi<3;vi++)for(const level of ['near','mid','far']){
 const target=path.join(out,'models',`fir-${vi}-${level}.glb`),doc=await io.read(target),stem=await io.read(path.join(prepared,`fir-stem-${vi}-${level}.glb`));
 const old=await io.read(path.join(prepared,`fir-source-${vi}-${level}.glb`)),bounds=getBounds(old.getRoot().listScenes()[0]),s=(14+vi)/(bounds.max[1]-bounds.min[1]);
 const tx=-(bounds.min[0]+bounds.max[0])/2*s,ty=-bounds.min[1]*s,tz=-(bounds.min[2]+bounds.max[2])/2*s;
 for(const mesh of stem.getRoot().listMeshes())transformMesh(mesh,[s,0,0,0,0,s,0,0,0,0,s,0,tx,ty,tz,1]);
 const mesh=doc.getRoot().listMeshes()[0];
 for(const p of mesh.listPrimitives())if(/trunk_/.test(p.getMaterial()?.getName()||'')){mesh.removePrimitive(p);p.dispose();}
 for(const m of stem.getRoot().listMeshes())for(const p of m.listPrimitives())mesh.addPrimitive(copyToDocument(doc,stem,[p]).get(p));
 doc.setLogger(new Logger(Verbosity.ERROR));await doc.transform(prune(),dedup(),unpartition(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:90}));
 await io.write(target,doc);
 const triangles=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
 catalog.models.fir.variants[vi].lods[level]={url:`/seasons/kit/models/fir-${vi}-${level}.glb`,bytes:(await fs.stat(target)).size,triangles:Math.round(triangles)};
 console.log('RESTORED_FIR',vi,level,Math.round(triangles));
}
const note='Restored scanned stems with independent 3200/1400/480-triangle budgets. Original bark atlas UVs and surface normals retained.';
if(!catalog.models.fir.notes.includes(note))catalog.models.fir.notes.push(note);
await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
