import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import sharp from 'sharp';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS, KHRMaterialsClearcoat, KHRMaterialsIOR} from '@gltf-transform/extensions';
import {dedup,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';

const source=path.resolve(import.meta.dirname,'../../Assets and working files/spring-glasses/glass-original.glb');
const output=path.resolve(import.meta.dirname,'../public/seasons/kit/spring-personal');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const doc=await io.read(source),root=doc.getRoot(),mesh=root.listMeshes()[0],primitive=mesh.listPrimitives()[0];
const position=primitive.getAttribute('POSITION'),points=position.getArray(),indices=primitive.getIndices().getArray();
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeVertexNormals();
const normals=doc.createAccessor('Smooth original geometry normals').setType('VEC3').setArray(new Float32Array(geometry.attributes.normal.array));
const uv=doc.createAccessor('Acetate micrograin UVs').setType('VEC2').setArray(Float32Array.from({length:points.length/3*2},(_,i)=>points[Math.floor(i/2)*3+(i%2?2:0)]*5));
const parent=Int32Array.from({length:points.length/3},(_,i)=>i),candidates=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
for(let t=0;t<indices.length;t+=3){a.fromArray(points,indices[t]*3);b.fromArray(points,indices[t+1]*3);c.fromArray(points,indices[t+2]*3);normal.crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();if(Math.abs(normal.z)>.75&&(a.z+b.z+c.z)/3>.65){candidates.push(t);const p=find(indices[t]);parent[find(indices[t+1])]=p;parent[find(indices[t+2])]=p;}}
const regions=new Map();for(const t of candidates){const id=find(indices[t]),r=regions.get(id)??{faces:[],min:[9,9,9],max:[-9,-9,-9]};r.faces.push(t);for(let j=0;j<3;j++)for(let k=0;k<3;k++){r.min[k]=Math.min(r.min[k],points[indices[t+j]*3+k]);r.max[k]=Math.max(r.max[k],points[indices[t+j]*3+k]);}regions.set(id,r);}
const lensRegions=[...regions.values()].filter(r=>r.faces.length>1000&&r.min[1]<-.24&&r.max[1]>.23&&(r.min[0]>.11&&r.max[0]<.82||r.max[0]<-.11&&r.min[0]>-.83));
if(lensRegions.length!==4)throw new Error('Expected the front and rear surfaces of both optical lenses.');
function hull(vertices){const p=[...new Map(vertices.map(v=>[v.join(','),v])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const lower=[],upper=[];for(const v of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),v)<=0)lower.pop();lower.push(v);}for(const v of p.toReversed()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),v)<=0)upper.pop();upper.push(v);}return lower.slice(0,-1).concat(upper.slice(0,-1));}
const lenses=[-1,1].map(sign=>hull(lensRegions.filter(r=>Math.sign(r.min[0])===sign).flatMap(r=>r.faces.flatMap(t=>[0,1,2].map(j=>[points[indices[t+j]*3],points[indices[t+j]*3+1]])))));
function inside(x,y,polygon){return polygon.every((p,i)=>{const q=polygon[(i+1)%polygon.length];return (q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0])>=-.00006;});}
const groups={frame:[],lenses:[],tips:[],hinges:[]};
for(let t=0;t<indices.length;t+=3){const vertices=[indices[t],indices[t+1],indices[t+2]],centre=[0,1,2].map(k=>vertices.reduce((s,i)=>s+points[i*3+k]/3,0)),[x,y,z]=centre;
  const name=z>.78&&lenses.some(h=>inside(x,y,h))?'lenses':z<-.48?'tips':Math.abs(x)>.835&&y>.12&&y<.245&&(z>.52&&z<.71||z>.82&&z<.88)?'hinges':'frame';groups[name].push(...vertices);
}
const clearcoat=doc.createExtension(KHRMaterialsClearcoat),ior=doc.createExtension(KHRMaterialsIOR);
const micro=new Uint8Array(64*64*3);for(let i=0;i<64*64;i++){micro[i*3]=255;micro[i*3+1]=228+(i*73%23);micro[i*3+2]=0;}
const grain=doc.createTexture('Fine moulded acetate roughness').setMimeType('image/png').setImage(await sharp(micro,{raw:{width:64,height:64,channels:3}}).png().toBuffer());
function coat(name,colour,roughness,metalness=0){return doc.createMaterial(name).setBaseColorFactor(colour).setRoughnessFactor(roughness).setMetallicFactor(metalness).setDoubleSided(true).setExtension('KHR_materials_clearcoat',clearcoat.createClearcoat().setClearcoatFactor(1).setClearcoatRoughnessFactor(.06)).setExtension('KHR_materials_ior',ior.createIOR().setIOR(1.49));}
const acetate=coat('Uniform smoky transparent crystal acetate',[.29,.32,.37,.72],.14).setAlphaMode('BLEND').setMetallicRoughnessTexture(grain);
const materials={frame:acetate,lenses:coat('Clear optical lenses',[.92,.97,1,.12],.025).setAlphaMode('BLEND'),tips:acetate,hinges:coat('Brushed silver hinge inlays',[.64,.68,.73,1],.25,1)};
mesh.removePrimitive(primitive);for(const [name,list]of Object.entries(groups)){if(!list.length)throw new Error('Missing material region '+name);mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION',position).setAttribute('NORMAL',normals).setAttribute('TEXCOORD_0',uv).setIndices(doc.createAccessor(name+' triangles').setType('SCALAR').setArray(new Uint32Array(list))).setMaterial(materials[name]));}
primitive.dispose();root.listNodes()[0].setName('Smoky crystal glasses · original Meshy geometry');
await MeshoptEncoder.ready;await doc.transform(dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));await io.write(path.join(output,'glasses.glb'),doc);
const manifest={source:'User-supplied Downloads/glass.glb',generator:'meshy-scene',reference:'User-supplied smoky clear-frame spectacles photograph',originalBytes:(await fs.stat(source)).size,runtimeBytes:(await fs.stat(path.join(output,'glasses.glb'))).size,triangles:indices.length/3,regions:Object.fromEntries(Object.entries(groups).map(([n,v])=>[n,v.length/3])),changes:['Original mesh shape retained; smooth normals and procedural micrograin UVs added.','Both front and back lens surfaces isolated using their actual geometric boundaries.','Continuous smoky translucent acetate frames and arms, clear optical lenses and silver hinge inlays; no rubber tips.','Lossless mesh topology compression with high-precision meshopt quantization.'],license:'User supplied; no third-party license claim inferred.'};await fs.writeFile(path.join(output,'glasses-assets.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
