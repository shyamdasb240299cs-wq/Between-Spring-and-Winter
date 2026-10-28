import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,textureCompress} from '@gltf-transform/functions';

const source=process.argv[2]??'C:/Users/Shyam/Downloads/indian_train__interior__exterior.glb';
const output=path.resolve(import.meta.dirname,'../public/seasons/kit/spring-train');
await fs.mkdir(output,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(source);
const original=doc.getRoot().getAsset(),bounds=getBounds(doc.getRoot().listScenes()[0]);
// Preserve the hierarchy: every door and its attached handle must still move together.
await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1536,1536],quality:88}));
await io.write(path.join(output,'indian-coach.glb'),doc);
const triangles=doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
const metadata={title:'Indian Train – Interior & Exterior',sourceFile:path.basename(source),source:original.extras?.source,author:original.extras?.author,license:original.extras?.license,originalBytes:(await fs.stat(source)).size,runtimeBytes:(await fs.stat(path.join(output,'indian-coach.glb'))).size,triangles,bounds,modifications:['Embedded texture maps reduced to 1536px WebP; original model geometry and interactive node hierarchy retained.','In-game ICF blue/satin-blue repaint, underframe, wheelsets, working doors and lighting are authored additions.'],paintReference:{title:'RDSO/CAMTECH Procedure for Painting of ICF Coaches, October 2015, page16',url:'https://rdso.indianrailways.gov.in/works/uploads/File/Draft%20Handbook%20on%20Procedure%20for%20Painting%20of%20ICF%20coaches.pdf',notes:'Figure II: aircraft blue body and satin blue window area. Digital shades approximate the documented livery; they are not colorimetric paint standards.'}};
metadata.modifications.push('Runtime upholstery mask replaces the three painted red marks and their borders with clean fabric sampled from the same atlas; original grain, normal and roughness maps are retained.','Static coach meshes are grouped by material; all ten animated doors retain independent pivots. Local physical lamp shading is restricted to railway materials.');
await fs.writeFile(path.join(output,'assets.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata,null,2));
