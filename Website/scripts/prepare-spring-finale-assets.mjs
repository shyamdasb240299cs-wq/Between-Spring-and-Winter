import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read('C:/Users/Shyam/Downloads/Food+pack.glb');
const keep=new Set(['Steamer','Steamer lid','Dumpling','Chopstick']);
for(const n of [...doc.getRoot().listNodes()])if(!keep.has(n.getName()))n.dispose();
// Split the seven genuine steamed buns into independently edible mesh islands.
const source=doc.getRoot().listNodes().find(n=>n.getName()==='Dumpling'),p=source.getMesh().listPrimitives()[0],pos=p.getAttribute('POSITION').getArray(),ix=p.getIndices().getArray(),parent=Array.from({length:pos.length/3},(_,i)=>i),root=i=>parent[i]===i?i:parent[i]=root(parent[i]),positions=new Map();
for(let i=0;i<parent.length;i++){const k=[pos[i*3],pos[i*3+1],pos[i*3+2]].map(x=>x.toFixed(5)).join(',');if(positions.has(k))parent[root(i)]=root(positions.get(k));else positions.set(k,i);}
for(let i=0;i<ix.length;i+=3){parent[root(ix[i+1])]=root(ix[i]);parent[root(ix[i+2])]=root(ix[i]);}
const islands=new Map();for(let i=0;i<ix.length;i+=3){const k=root(ix[i]);if(!islands.has(k))islands.set(k,[]);islands.get(k).push(ix[i],ix[i+1],ix[i+2]);}
const scene=doc.getRoot().listScenes()[0],buffer=doc.getRoot().listBuffers()[0];let count=0;
for(const indices of islands.values()){const prim=p.clone().setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer));const node=doc.createNode('Dumpling '+(++count)).setMesh(doc.createMesh('Steamed bun '+count).addPrimitive(prim)).setTranslation(source.getTranslation()).setRotation(source.getRotation()).setScale(source.getScale());scene.addChild(node);}
source.dispose();
const lid=doc.getRoot().listNodes().find(n=>n.getName()==='Steamer lid');lid.setRotation([0,0.5896983742713928,0,0.807623565196991]).setTranslation([-.027359,.217,.884283]);
doc.getRoot().listNodes().find(n=>n.getName()==='Chopstick').setTranslation([-.027359,.30,.884283]);
const wrapper=doc.createNode('Container steamed dumplings').setTranslation([.027359,0,-.884283]);for(const n of [...scene.listChildren()]){scene.removeChild(n);wrapper.addChild(n);}scene.addChild(wrapper);
await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:88}));
const out='public/seasons/kit/spring-finale';await fs.mkdir(out,{recursive:true});await io.write(out+'/dumplings.glb',doc);
await fs.writeFile(out+'/assets.json',JSON.stringify({source:'User supplied Downloads/Food+pack.glb',license:'Source metadata retained; user-provided asset',selection:['Steamer','Steamer lid','Dumpling (seven connected components)','Chopstick'],excluded:'Plated Dumpling.001 and other food servings',modifications:['Original seven steamed buns split for individual eating','Original lid rotated closed and normalized with container','Unused assets pruned, 1K WebP maps'],bytes:(await fs.stat(out+'/dumplings.glb')).size},null,2));console.log('Exported '+count+' genuine steamed buns; '+(await fs.stat(out+'/dumplings.glb')).size+' bytes');
