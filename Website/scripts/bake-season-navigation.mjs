/** Bake a compact walking map from the actual exported glTF geometry. */
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
await MeshoptDecoder.ready;
const groundNames={spring:['Plane.025'],summer:['Landscape','sands','slope','side cliff'],autumn:['Desert Procedural.001'],winter:['Plane']};
for(const id of process.argv.slice(2)){
  const directory=new URL(`../public/seasons/${id}/`,import.meta.url);
  const source=JSON.parse(await fs.readFile(new URL(`../../Assets and working files/seasons/${id}-audit.json`,import.meta.url),'utf8'));
  const metadata=JSON.parse(await fs.readFile(new URL(`../../Assets and working files/seasons/${id}-source.json`,import.meta.url),'utf8'));
  const bytes=await fs.readFile(new URL('world.glb',directory));
  const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length).toString()),bin=bytes.subarray(28+length);
  const views=new Map();
  function view(index){
    if(views.has(index))return views.get(index);
    const definition=gltf.bufferViews[index],compression=definition.extensions?.EXT_meshopt_compression;
    let data;
    if(compression){data=new Uint8Array(compression.count*compression.byteStride);MeshoptDecoder.decodeGltfBuffer(data,compression.count,compression.byteStride,bin.subarray(compression.byteOffset||0,(compression.byteOffset||0)+compression.byteLength),compression.mode,compression.filter);}
    else data=bin.subarray(definition.byteOffset||0,(definition.byteOffset||0)+definition.byteLength);
    views.set(index,data);return data;
  }
  function accessor(index){
    const a=gltf.accessors[index],count={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
    const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},size=sizes[a.componentType];
    const array=a.type==='SCALAR'&&!a.normalized?new Uint32Array(a.count*count):new Float32Array(a.count*count);
    const data=view(a.bufferView),reader=new DataView(data.buffer,data.byteOffset,data.byteLength),stride=gltf.bufferViews[a.bufferView].byteStride||size*count;
    const method={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[a.componentType];
    const divisor={5120:127,5121:255,5122:32767,5123:65535}[a.componentType];
    for(let i=0;i<a.count;i++)for(let c=0;c<count;c++){const value=reader[method]((a.byteOffset||0)+i*stride+c*size,true);array[i*count+c]=a.normalized?Math.max(-1,value/divisor):value;}
    return array;
  }
  const objects=gltf.nodes.map(node=>{const o=new THREE.Object3D();o.name=node.name||'';if(node.matrix)o.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));else{if(node.translation)o.position.fromArray(node.translation);if(node.rotation)o.quaternion.fromArray(node.rotation);if(node.scale)o.scale.fromArray(node.scale);}return o;});
  gltf.nodes.forEach((node,i)=>node.children?.forEach(child=>objects[i].add(objects[child])));
  const root=new THREE.Group();for(const index of gltf.scenes[gltf.scene||0].nodes)root.add(objects[index]);root.updateMatrixWorld(true);
  const groundRoot=new THREE.Group(),solidRoot=new THREE.Group();
  const geometryCache=new Map(),material=new THREE.MeshBasicMaterial();
  for(const [i,node] of gltf.nodes.entries()){
    const mesh=gltf.meshes[node.mesh];if(!mesh||node.extensions?.EXT_mesh_gpu_instancing||/^fogg|^cloudes|^sea$/i.test(node.name||''))continue;
    let owner=objects[i];while(!owner.name&&owner.parent)owner=owner.parent;
    const walkable=groundNames[id].includes(owner.name);
    for(const [p,primitive] of mesh.primitives.entries()){
      const mat=gltf.materials[primitive.material];
      if(!walkable&&(mat?.alphaMode==='MASK'||/leaf|leav|flower|foliage|petal|grass|sea|water|sky/i.test(mat?.name||'')))continue;
      const key=`${node.mesh}/${p}`;let geometry=geometryCache.get(key);
      if(!geometry){geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(accessor(primitive.attributes.POSITION),3));if(primitive.indices!==undefined)geometry.setIndex(new THREE.BufferAttribute(accessor(primitive.indices),1));geometryCache.set(key,geometry);}
      const copy=new THREE.Mesh(geometry,material);copy.matrix.copy(objects[i].matrixWorld);copy.matrixWorld.copy(copy.matrix);copy.matrixAutoUpdate=false;copy.matrixWorldNeedsUpdate=true;(walkable?groundRoot:solidRoot).add(copy);
    }
  }
  if(!groundRoot.children.length)throw new Error(`${id}: verified ground mesh missing`);
  const bounds=new THREE.Box3().setFromObject(groundRoot),size=bounds.getSize(new THREE.Vector3());
  const cell=Math.max(.6,Math.ceil(Math.max(size.x,size.z)/220*100)/100);
  const width=Math.ceil(size.x/cell)+1,depth=Math.ceil(size.z/cell)+1,origin=[bounds.min.x,bounds.min.z];
  const heights=Array(width*depth).fill(null),blocked=new Uint8Array(width*depth);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),normal=new THREE.Vector3();
  const point=new THREE.Vector3(),closest=new THREE.Vector3(),triangle=new THREE.Triangle();
  function triangles(group,visit){
    group.updateMatrixWorld(true);
    for(const mesh of group.children){
      const position=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:position.count;
      for(let i=0;i<count;i+=3){
        a.fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(position,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(position,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
        visit(a,b,c);
      }
    }
  }
  function range(a,b,c,padding=0){
    return [Math.max(0,Math.ceil((Math.min(a.x,b.x,c.x)-padding-origin[0])/cell)),Math.min(width-1,Math.floor((Math.max(a.x,b.x,c.x)+padding-origin[0])/cell)),Math.max(0,Math.ceil((Math.min(a.z,b.z,c.z)-padding-origin[1])/cell)),Math.min(depth-1,Math.floor((Math.max(a.z,b.z,c.z)+padding-origin[1])/cell))];
  }
  console.log(id,'rasterizing walking surface',width,depth);
  triangles(groundRoot,(a,b,c)=>{
    normal.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a)).normalize();
    if(Math.abs(normal.y)<.72)return;
    const denominator=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(denominator)<1e-10)return;
    const [minX,maxX,minZ,maxZ]=range(a,b,c);
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
      const px=origin[0]+x*cell,pz=origin[1]+z*cell;
      const u=((b.z-c.z)*(px-c.x)+(c.x-b.x)*(pz-c.z))/denominator;
      const v=((c.z-a.z)*(px-c.x)+(a.x-c.x)*(pz-c.z))/denominator,w=1-u-v;
      if(u<-.00001||v<-.00001||w<-.00001)continue;
      const height=u*a.y+v*b.y+w*c.y,index=z*width+x;
      if(heights[index]===null||height>heights[index])heights[index]=height;
    }
  });
  console.log(id,'rasterizing body clearance');
  triangles(solidRoot,(a,b,c)=>{
    const [minX,maxX,minZ,maxZ]=range(a,b,c,.3);if(minX>maxX||minZ>maxZ)return;
    const low=Math.min(a.y,b.y,c.y),high=Math.max(a.y,b.y,c.y);
    triangle.set(a,b,c);
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
      const index=z*width+x,height=heights[index];if(height===null||blocked[index]||high<height+.3||low>height+1.7)continue;
      for(const y of [.38,.9,1.4]){
        point.set(origin[0]+x*cell,height+y,origin[1]+z*cell);
        triangle.closestPointToPoint(point,closest);
        if(point.distanceToSquared(closest)<.3*.3){blocked[index]=1;break;}
      }
    }
  });
  const waterHeight=id==='summer'?source.objects.find(o=>o.name==='sea')?.location[2]:undefined;
  for(let i=0;i<heights.length;i++)heights[i]=heights[i]===null||blocked[i]||(waterHeight!==undefined&&heights[i]<waterHeight+.04)?null:Math.round(heights[i]*1000)/1000;
  const pose=source.camera_pose,px=pose.position[0],pz=-pose.position[1];let best=null,bestDistance=Infinity;
  // Choose an entrance on a connected walking region, not the nearest isolated
  // pocket between a cliff and a prop. Include the controller's body clearance.
  const safe=new Uint8Array(heights.length),regions=new Int32Array(heights.length),regionSizes=[0];
  for(let z=1;z<depth-2;z++)for(let x=1;x<width-2;x++){
    const samples=[heights[z*width+x],heights[z*width+x+1],heights[(z+1)*width+x],heights[(z+1)*width+x+1]];
    if(samples.every(h=>h!==null)&&Math.max(...samples)-Math.min(...samples)<=cell*.65)safe[z*width+x]=1;
  }
  for(let start=0;start<safe.length;start++){
    if(!safe[start]||regions[start])continue;
    const region=regionSizes.length,queue=[start];regions[start]=region;
    for(let q=0;q<queue.length;q++)for(const next of [queue[q]-1,queue[q]+1,queue[q]-width,queue[q]+width]){
      if(!safe[next]||regions[next]||Math.abs(heights[next]-heights[queue[q]])>cell*.65)continue;
      regions[next]=region;queue.push(next);
    }
    regionSizes.push(queue.length);
  }
  for(let z=2;z<depth-3;z++)for(let x=2;x<width-3;x++){
    const samples=[];for(let dz=-1;dz<3;dz++)for(let dx=-1;dx<3;dx++)samples.push(heights[(z+dz)*width+x+dx]);
    if(samples.some(h=>h===null)||Math.max(...samples)-Math.min(...samples)>cell*.65)continue;
    if(regionSizes[regions[z*width+x]]<120)continue;
    const sx=origin[0]+(x+.5)*cell,sz=origin[1]+(z+.5)*cell,d=(sx-px)**2+(sz-pz)**2;
    if(d<bestDistance){bestDistance=d;best={x:sx,z:sz,yaw:id==='summer'?-Math.PI/2:pose.rotation[2]};}
  }
  if(!best)throw new Error(`${id}: no safe walking spawn`);
  const previous=JSON.parse(await fs.readFile(new URL('manifest.json',directory),'utf8').catch(()=>'{}'));
  const triangleCount=gltf.nodes.reduce((total,node)=>{const mesh=gltf.meshes[node.mesh];if(!mesh)return total;const instances=node.extensions?.EXT_mesh_gpu_instancing?.attributes,count=instances?gltf.accessors[Object.values(instances)[0]].count:1;return total+count*mesh.primitives.reduce((sum,p)=>sum+gltf.accessors[p.indices??p.attributes.POSITION].count/3,0);},0);
  const manifest={...(previous.bytes===bytes.length?previous:{}),version:1,id,assetBaseId:metadata.assetBaseId,model:`/seasons/${id}/world.glb`,navigation:{origin,cell,width,depth,heights,spawn:best},bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},triangles:triangleCount,bytes:bytes.length};
  if(waterHeight!==undefined)manifest.water={height:waterHeight,size:500};
  if(await fs.stat(new URL('sky.jpg',directory)).catch(()=>null))manifest.background=`/seasons/${id}/sky.jpg`;
  await fs.writeFile(new URL('manifest.json',directory),JSON.stringify(manifest)+'\n');
  console.log(id,'navigation baked',JSON.stringify({cells:width*depth,walkable:heights.filter(h=>h!==null).length,spawn:best,metresFromCamera:Math.sqrt(bestDistance).toFixed(1)}));
  geometryCache.forEach(g=>g.dispose());material.dispose();
}
