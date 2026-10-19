import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,weld,simplifyPrimitive} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const out=path.resolve(import.meta.dirname,'../public/seasons/kit'),io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
const catalog=JSON.parse(await fs.readFile(path.join(out,'catalog.json'),'utf8'));
const entry={name:'Cherry Blossom Trees',author:'Jagobo',license:'CC-BY-4.0',source:'https://sketchfab.com/3d-models/cherry-blossom-trees-f69be55d2e4f4f73b568ebb185bd8496',notes:['Season-specific whole-card LODs. Shared sanctuary bark/blossom textures bound by material name.'],variants:[]};
for(let variant=0;variant<3;variant++){
  const item={id:String(variant),height:0,bounds:null,lods:{}};
  for(const[level,leafBudget,barkBudget,inflation]of [['near',16000,7500,1.08],['mid',4800,1800,1.48],['far',1600,450,1.85]]){
    const doc=await io.read(path.resolve(import.meta.dirname,`../public/void/models/jagobo/tree-${variant}-near.glb`));
    const foliageCount=doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>/foliage/i.test(p.getMaterial()?.getName()||'')).length;
    for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
      if(!/foliage/i.test(p.getMaterial()?.getName()||'')){
        simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:Math.min(1,barkBudget/((p.getIndices()?.getCount()||1)/3)),error:level==='near'?.06:.16});
        continue;
      }
      const pos=p.getAttribute('POSITION'),indices=p.getIndices().getArray(),parent=Int32Array.from({length:pos.getCount()},(_,i)=>i);
      const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
      for(let i=0;i<indices.length;i+=3){const a=find(indices[i]);parent[find(indices[i+1])]=a;parent[find(indices[i+2])]=a;}
      const components=new Map();for(let i=0;i<indices.length;i+=3){const k=find(indices[i]);if(!components.has(k))components.set(k,[]);components.get(k).push(indices[i],indices[i+1],indices[i+2]);}
      const groups=[...components].sort((a,b)=>((a[0]*2654435761)>>>0)-((b[0]*2654435761)>>>0));let triangles=0;const picked=[];
      for(const[,g]of groups){if(triangles+g.length/3>leafBudget/foliageCount)continue;picked.push(...g);triangles+=g.length/3;const unique=[...new Set(g)],c=[0,0,0];for(const i of unique)for(let k=0;k<3;k++)c[k]+=pos.getArray()[i*3+k]/unique.length;
        for(const i of unique)for(let k=0;k<3;k++)pos.getArray()[i*3+k]=c[k]+(pos.getArray()[i*3+k]-c[k])*inflation;}
      p.setIndices(doc.createAccessor().setType('SCALAR').setBuffer(pos.getBuffer()).setArray(new Uint32Array(picked)));
    }
    // Textures are bound at runtime; their UVs must survive offline pruning.
    await doc.transform(weld(),prune({keepAttributes:true}));const filename=`cherry-${variant}-${level}.glb`;await io.write(path.join(out,'models',filename),doc);
    const box=getBounds(doc.getRoot().listScenes()[0]);item.height=box.max[1]-box.min[1];item.bounds=box;
    const triangles=doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),0);
    item.lods[level]={url:'/seasons/kit/models/'+filename,triangles,bytes:(await fs.stat(path.join(out,'models',filename))).size};
  }entry.variants.push(item);
}
catalog.models.cherry=entry;await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');console.log('Whole-card cherry LODs ready');

