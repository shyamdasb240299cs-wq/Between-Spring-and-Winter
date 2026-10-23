/** Preserve the disconnected lower bark components when creating tree LODs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO,getBounds,Logger,Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {copyToDocument,compactPrimitive,prune,dedup,unpartition} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const out=path.resolve(import.meta.dirname,'../public/seasons/kit'),io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
const catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8'));
for(const id of ['cherry','maple'])for(const variant of catalog.models[id].variants){
  const near=await io.read(path.join(out,'models',`${id}-${variant.id}-near.glb`));near.setLogger(new Logger(Verbosity.ERROR));
  const bark=near.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>!/foliage|leaf/i.test(p.getMaterial()?.getName()||''));
  for(const level of ['mid','far']){
    const file=path.join(out,'models',`${id}-${variant.id}-${level}.glb`),doc=await io.read(file);doc.setLogger(new Logger(Verbosity.ERROR));
    for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())if(!/foliage|leaf/i.test(p.getMaterial()?.getName()||''))mesh.removePrimitive(p);
    const map=copyToDocument(doc,near,bark),mesh=doc.createMesh('Complete anchored bark'),node=doc.createNode('Preserved root and branches').setMesh(mesh);doc.getRoot().listScenes()[0].addChild(node);
    for(const original of bark){
      const p=map.get(original),position=p.getAttribute('POSITION'),vertices=position.getArray(),indices=new Uint32Array(p.getIndices().getArray()),lock=new Uint8Array(position.getCount());
      const min=position.getMin([])[1],max=position.getMax([])[1];
      // These scans contain separate rings along the stem. Lock all lower bark,
      // including its seams, rather than allowing a short ring to vanish.
      for(let i=0;i<lock.length;i++)if(vertices[i*3+1]<min+(max-min)*.37)lock[i]=1;
      const [reduced]=MeshoptSimplifier.simplifyWithAttributes(indices,vertices,3,new Float32Array(position.getCount()),1,[0],lock,(level==='mid'?1800:600)*3,.018,['LockBorder']);
      p.setIndices(doc.createAccessor('Anchored bark indices').setType('SCALAR').setArray(reduced).setBuffer(position.getBuffer()));compactPrimitive(p);mesh.addPrimitive(p);
    }
    await doc.transform(prune({keepAttributes:true}),dedup(),unpartition());await io.write(file,doc);
    const triangles=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),0);
    variant.lods[level]={...variant.lods[level],triangles,bytes:(await fs.stat(file)).size};
    console.log(id,variant.id,level,triangles,getBounds(node).min[1]);
  }
}
await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
