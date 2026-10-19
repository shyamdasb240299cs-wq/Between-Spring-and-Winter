/** Final portable geometry compression, after texture packing and before QA. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {NodeIO,Logger} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,meshopt,getBounds} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';

await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().setLogger(new Logger(Logger.Verbosity.ERROR)).registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const id of process.argv.slice(2)){
  const directory=new URL(`../public/seasons/${id}/`,import.meta.url);
  const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',directory),'utf8'));
  for(const variant of [manifest,manifest.mobile].filter(Boolean)){
    const model=new URL(`../public${variant.model}`,import.meta.url);
    const source=await fs.readFile(model),document=await io.readBinary(source);
    const scene=document.getRoot().listScenes()[0],before=getBounds(scene);
    // Architectural UVs repeat beyond [0,1], so the standard integer UV
    // quantizer skips them. Limit float precision to < 1/16 of a 1K texel
    // without changing tiling, material count or texture transforms.
    const seen=new Set();
    for(const mesh of document.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
      const uv=primitive.getAttribute('TEXCOORD_0');
      if(!uv||seen.has(uv)||uv.getComponentType()!==5126)continue;seen.add(uv);
      const values=uv.getArray().slice();for(let i=0;i<values.length;i++)values[i]=Math.round(values[i]*8192)/8192;uv.setArray(values);
    }
    await document.transform(dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}));
    const after=getBounds(scene);
    for(const edge of ['min','max'])for(let axis=0;axis<3;axis++)assert.ok(Math.abs(before[edge][axis]-after[edge][axis])<.025,`${id}: quantization changed scene bounds`);
    const bytes=Buffer.from(await io.writeBinary(document));
    const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    const triangles=gltf.nodes.reduce((sum,node)=>{const mesh=gltf.meshes[node.mesh];if(!mesh)return sum;const instances=node.extensions?.EXT_mesh_gpu_instancing?.attributes,count=instances?gltf.accessors[Object.values(instances)[0]].count:1;return sum+count*mesh.primitives.reduce((total,p)=>total+gltf.accessors[p.indices??p.attributes.POSITION].count/3,0);},0);
    assert.equal(triangles,variant.triangles,`${id}: compression changed triangle count`);
    await fs.writeFile(model,bytes);variant.bytes=bytes.length;
    console.log(variant.model,`${(source.length/1048576).toFixed(2)} → ${(bytes.length/1048576).toFixed(2)} MiB`);
  }
  await fs.writeFile(new URL('manifest.json',directory),JSON.stringify(manifest)+'\n');
}
