/**
 * Spring's compact, freely licensed source models.
 *
 * Originals + public metadata stay outside public/. Runtime GLBs are grounded,
 * Y-up metres, with embedded textures and Meshopt-compressed vertex streams.
 * This script owns only public/seasons/kit/spring, never the shared kit catalog.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {NodeIO, getBounds, Logger, Verbosity} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup, prune, weld, simplify, transformMesh, textureCompress, join, meshopt} from '@gltf-transform/functions';
import {MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier} from 'meshoptimizer';

const ROOT = path.resolve(import.meta.dirname, '../..');
const WORK = path.join(ROOT, 'Assets and working files/seasons/spring-treasure');
const OUT = path.join(ROOT, 'Website/public/seasons/kit/spring');
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
await Promise.all([fs.mkdir(WORK, {recursive: true}), fs.mkdir(OUT, {recursive: true})]);

const specs = [
  {key: 'desk', id: 'SchoolDesk_01', height: .76, budget: 4200, author: 'Ethan Place'},
  {key: 'spade', id: 'rusted_spade_01', height: 1.10, budget: 4200, author: 'Blemonade'},
  {key: 'plant', id: 'potted-trailing-pothos', height: .40, budget: 6200, author: 'Innerscene'},
];

function triangleCount(doc) {
  return doc.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((n, primitive) => n +
    (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3, 0), 0);
}

async function download(url, file, expectedMd5) {
  const existing = await fs.readFile(file).catch(() => null);
  if (existing && (!expectedMd5 || crypto.createHash('md5').update(existing).digest('hex') === expectedMd5)) return;
  const response = await fetch(url, {signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`Source download HTTP ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (expectedMd5 && crypto.createHash('md5').update(bytes).digest('hex') !== expectedMd5) throw new Error(`Source hash mismatch: ${url}`);
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, bytes);
}

// Independent, public sources are fetched together, with every source map saved.
await Promise.all(specs.map(async (spec) => {
  const dir = path.join(WORK, spec.id);
  await fs.mkdir(dir, {recursive: true});
  if (spec.key === 'plant') {
    spec.source = 'https://www.innerscene.com/tools/library/3d-parts/potted-trailing-pothos-bfe0ed29';
    spec.input = path.join(dir, 'source.glb');
    await fs.copyFile(path.join(ROOT, 'output/spring-plan-assets/pothos-candidate.glb'), spec.input);
    await fs.writeFile(path.join(dir, 'source.json'), JSON.stringify({
      page: spec.source, name: 'Potted trailing pothos', creator: spec.author,
      license: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      retrieved: '2026-10-20', originalFile: 'potted-trailing-pothos.glb',
      sourceDescription: 'Original Innerscene vining pothos geometry, ceramic pot, soil and stem materials. Not a photogrammetry scan.',
      sourcePageLicense: 'Public domain (CC0). Free to use, modify and redistribute for any purpose, including commercially, with no credit required.',
      localInput: 'output/spring-plan-assets/pothos-candidate.glb',
    }, null, 2) + '\n');
  } else {
    spec.source = `https://polyhaven.com/a/${spec.id}`;
    const [files, info] = await Promise.all([
      fetch(`https://api.polyhaven.com/files/${spec.id}`).then(r => {if (!r.ok) throw Error(`Files API ${r.status}`); return r.json();}),
      fetch(`https://api.polyhaven.com/info/${spec.id}`).then(r => {if (!r.ok) throw Error(`Info API ${r.status}`); return r.json();}),
    ]);
    const entry = files.gltf['1k'].gltf;
    spec.input = path.join(dir, 'source.gltf');
    await Promise.all([
      fs.writeFile(path.join(dir, 'files.json'), JSON.stringify(files, null, 2) + '\n'),
      fs.writeFile(path.join(dir, 'info.json'), JSON.stringify(info, null, 2) + '\n'),
      download(entry.url, spec.input, entry.md5),
      ...Object.entries(entry.include).map(([name, resource]) => download(resource.url, path.join(dir, name), resource.md5)),
    ]);
  }
  console.log(`SOURCE ${spec.key}: verified ${spec.input}`);
}));

const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const normalized = a => {const len = Math.hypot(...a) || 1; return a.map(v => v/len);};
const clamp = (n, low=0, high=1) => Math.max(low, Math.min(high, n));

/**
 * The source uses a projected material-coordinate UV set. Re-unwrap each connected
 * heart-shaped leaf along its own long/short axes so a midrib and veins really
 * follow each leaf rather than continuing across unrelated leaves in world space.
 */
function unwrapPothosLeaves(doc) {
  const primitive = doc.getRoot().listMeshes().find(m => m.getName() === 'Heart shaped pothos leaves')?.listPrimitives()[0];
  if (!primitive) throw Error('Expected original heart-shaped pothos mesh.');
  const positions = primitive.getAttribute('POSITION');
  const count = positions.getCount();
  const parents = Array.from({length: count}, (_, i) => i);
  const find = i => parents[i] === i ? i : (parents[i] = find(parents[i]));
  const union = (a, b) => {parents[find(a)] = find(b);};
  const indices = primitive.getIndices().getArray();
  for (let i=0; i<indices.length; i+=3) {union(indices[i], indices[i+1]); union(indices[i], indices[i+2]);}
  const same = new Map();
  for (let i=0; i<count; i++) {
    const p = positions.getElement(i, []), key = p.map(x => Math.round(x*1e6)).join(',');
    if (same.has(key)) union(i, same.get(key)); else same.set(key, i);
  }
  const groups = new Map();
  for (let i=0; i<count; i++) {const key=find(i); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i);}
  const uv = new Float32Array(count*2);
  const stemPoints = doc.getRoot().listMeshes().filter(m => m.getName().startsWith('Trailing pothos vine')).flatMap(m => {
    const p=m.listPrimitives()[0].getAttribute('POSITION'); return Array.from({length:p.getCount()}, (_,i) => p.getElement(i, []));
  });
  for (const group of groups.values()) {
    const points=group.map(i => positions.getElement(i, []));
    const center=points.reduce((sum, p) => sum.map((n,k) => n+p[k]/points.length), [0,0,0]);
    const centered=points.map(p=>sub(p,center));
    const covariance=Array.from({length:3},(_,j)=>Array.from({length:3},(_,k)=>centered.reduce((sum,p)=>sum+p[j]*p[k],0)));
    const project=v=>covariance.map(row=>dot(row,v));
    let axis=normalized([1,.1,.3]);
    for (let n=0;n<24;n++) axis=normalized(project(axis));
    const distanceToStem=p=>stemPoints.reduce((best,s)=>Math.min(best,dot(sub(p,s),sub(p,s))),Infinity);
    const nearest=points.reduce((best,p)=>distanceToStem(p)<distanceToStem(best)?p:best,points[0]);
    if (dot(sub(nearest,center),axis)>0) axis=axis.map(n=>-n);
    let side=normalized([axis[2],.34,-axis[0]]);
    for(let n=0;n<24;n++) {const value=project(side); side=normalized(value.map((v,k)=>v-dot(value,axis)*axis[k]));}
    const along=centered.map(p=>dot(p,axis)), across=centered.map(p=>dot(p,side));
    const min=Math.min(...along), max=Math.max(...along), width=Math.max(...across.map(Math.abs));
    group.forEach((index, n) => {uv[index*2]=clamp(.5 + across[n]/Math.max(width,.00001)*.47,.025,.975); uv[index*2+1]=clamp(1-(along[n]-min)/(max-min)*.94-.03,.025,.975);});
  }
  primitive.setAttribute('TEXCOORD_0', doc.createAccessor('Individual pothos leaf UV').setType('VEC2').setBuffer(positions.getBuffer()).setArray(uv));
  primitive.setAttribute('TANGENT', null);
  console.log(`PLANT: individually unwrapped ${groups.size} original heart-shaped leaves.`);
  return groups.size;
}

/** Deterministic, restrained botanical PBR detail; no generated image source. */
async function detailPothos(doc) {
  const leafCount = unwrapPothosLeaves(doc);
  const size=512, color=Buffer.alloc(size*size*3), normal=Buffer.alloc(size*size*3), arm=Buffer.alloc(size*size*3);
  const height=new Float32Array(size*size), grainAt=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453123;return n-Math.floor(n);};
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const u=x/(size-1), t=1-y/(size-1), side=Math.abs(u-.5), index=(y*size+x)*3;
    const organic=Math.sin(u*24+t*18+Math.sin(t*23)*.7)*.23 + Math.sin(u*63-t*31)*.1 + Math.sin(u*91+t*27)*.045;
    const noise=grainAt(x,y)-.5;
    const variegation=clamp((Math.sin(u*31+t*9+Math.sin(t*21)*1.8)+Math.sin(u*57-t*14)*.4-.85)*1.3) * (.4+.6*Math.sin(t*Math.PI));
    const midrib=Math.exp(-Math.pow((u-.5)/.009,2));
    let veins=0;
    for(let n=0;n<7;n++) {const start=.12+n*.115;const trace=start+side*.53+side*side*.25;veins=Math.max(veins,Math.exp(-Math.pow((t-trace)/.0075,2))*(1-clamp(side*1.8)));}
    const fine=Math.sin((t-side*.56)*155)*Math.exp(-side*3)*.012;
    const shade=.93 + organic*.12 - side*.13 + noise*.035;
    color[index]=Math.round(clamp((42*shade+variegation*57+(midrib*.8+veins*.45)*22)/255)*255);
    color[index+1]=Math.round(clamp((89*shade+variegation*55+(midrib*.8+veins*.45)*25)/255)*255);
    color[index+2]=Math.round(clamp((37*shade+variegation*10+(midrib*.8+veins*.45)*11)/255)*255);
    height[y*size+x]=midrib*.028+veins*.009+fine+noise*.0014;
    arm[index]=255; arm[index+1]=Math.round(139+noise*11+variegation*17-veins*8); arm[index+2]=0;
  }
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const index=(y*size+x)*3;
    const dx=height[y*size+Math.min(size-1,x+1)]-height[y*size+Math.max(0,x-1)];
    const dy=height[Math.min(size-1,y+1)*size+x]-height[Math.max(0,y-1)*size+x];
    const n=normalized([-dx*10,dy*10,1]);
    normal[index]=Math.round((n[0]*.5+.5)*255);normal[index+1]=Math.round((n[1]*.5+.5)*255);normal[index+2]=Math.round((n[2]*.5+.5)*255);
  }
  const generated=path.join(WORK,'authored-pothos-surfaces'); await fs.mkdir(generated,{recursive:true});
  const textures={};
  for(const [name,data] of [['leaf-color',color],['leaf-normal',normal],['leaf-arm',arm]]) {
    const image=await sharp(data,{raw:{width:size,height:size,channels:3}}).png().toBuffer();
    await fs.writeFile(path.join(generated,`${name}.png`),image);
    textures[name]=doc.createTexture(name).setMimeType('image/png').setImage(image);
  }
  const leaf=doc.getRoot().listMaterials().find(m=>m.getName()==='Living foliage');
  leaf.setBaseColorFactor([1,1,1,1]).setBaseColorTexture(textures['leaf-color']).setNormalTexture(textures['leaf-normal']).setNormalScale(.45).setMetallicRoughnessTexture(textures['leaf-arm']).setMetallicFactor(0).setRoughnessFactor(1).setDoubleSided(true);
  return {leaves:leafCount,description:'Original heart-shaped species geometry retained. Leaf UVs individually remapped; newly authored 512px green/gold variegation, midrib/vein normal and roughness textures. Source was not photogrammetry.'};
}

function bakeAndGround(doc, targetHeight) {
  const scene=doc.getRoot().listScenes()[0];
  if (!scene) throw Error('Missing scene.');
  const instances=[];
  scene.traverse(node=>{if(node.getMesh())instances.push({name:node.getName(),mesh:node.getMesh(),matrix:[...node.getWorldMatrix()]});});
  for(const node of scene.listChildren())scene.removeChild(node);
  const nodes=instances.map(({name,mesh,matrix})=>{
    const copy=mesh.clone(); transformMesh(copy,matrix);
    const node=doc.createNode(name).setMesh(copy).setMatrix(IDENTITY);scene.addChild(node);return node;
  });
  const before=getBounds(scene), height=before.max[1]-before.min[1];
  if (!(height>0 && Number.isFinite(height)))throw Error('Invalid source bounds.');
  const scale=targetHeight/height;
  // Column-major affine transform: translation must occupy 12/13/14.
  const matrix=[scale,0,0,0,0,scale,0,0,0,0,scale,0,-(before.max[0]+before.min[0])*.5*scale,-before.min[1]*scale,-(before.max[2]+before.min[2])*.5*scale,1];
  for(const node of nodes)transformMesh(node.getMesh(),matrix);
  return {sourceBounds:before,uniformScale:scale};
}

const manifest={version:1,prepared:'2026-10-20',units:'metres',upAxis:'Y',models:{}};
for(const spec of specs) {
  const doc=await io.read(spec.input);doc.setLogger(new Logger(Verbosity.ERROR));
  const surface=spec.key==='plant'?await detailPothos(doc):null;
  if(spec.key!=='plant')for(const material of doc.getRoot().listMaterials()) {
    // Poly Haven's packed ARM map already contains the baked AO in R. Its
    // original glTF binds G/B but omits the AO binding; use that original data.
    const packed=material.getMetallicRoughnessTexture();
    if(packed&&!material.getOcclusionTexture())material.setOcclusionTexture(packed).setOcclusionStrength(.8);
  }
  const normalization=bakeAndGround(doc,spec.height);
  // Remove detached source meshes before setting a geometry budget. Counting
  // those old resources would halve the intended triangle count accidentally.
  await doc.transform(weld(),dedup(),prune(),join());
  const inputTriangles=triangleCount(doc);
  await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,spec.budget/inputTriangles),error:.006,lockBorder:true}),prune());
  // Simplification can remove a lowest or highest extremity by a fraction of a
  // millimetre. Ground and size the actual retained geometry, then compress it.
  bakeAndGround(doc,spec.height);
  await doc.transform(dedup(),prune(),join(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:92}),meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}),prune());
  const file=path.join(OUT,`${spec.key}.glb`);await io.write(file,doc);
  const bytes=await fs.readFile(file), check=await io.readBinary(bytes), scene=check.getRoot().listScenes()[0];
  const bounds=getBounds(scene);
  const json=await io.binaryToJSON(bytes);
  if(json.json.buffers?.some(buffer=>buffer.uri))throw Error(`${spec.key}: external buffer present`);
  if(json.json.images?.some(image=>image.uri))throw Error(`${spec.key}: external image present`);
  if(![...bounds.min,...bounds.max].every(Number.isFinite)||Math.abs(bounds.min[1])>.0001||Math.abs(bounds.max[1]-spec.height)>.001)throw Error(`${spec.key}: output bounds invalid ${JSON.stringify(bounds)}`);
  manifest.models[spec.key]={
    name:spec.key==='plant'?'Potted trailing pothos':spec.id.replaceAll('_',' '),
    url:`/seasons/kit/spring/${spec.key}.glb`,source:spec.source,author:spec.author,license:'CC0-1.0',
    licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
    triangles:triangleCount(check),materials:check.getRoot().listMaterials().length,
    textures:check.getRoot().listTextures().map(texture=>({name:texture.getName(),mime:texture.getMimeType(),size:texture.getSize(),bytes:texture.getImage()?.length??0})),
    height:spec.height,bounds,normalization,
    notes:['Original source proportions preserved with uniform scaling; baked static hierarchy; X/Z centered and Y grounded; actual metres.','Embedded WebP PBR images and Meshopt compression; no external buffers or texture fetches.',...(surface?[surface.description]:['Original source diffuse, AO/roughness/metalness and normal imagery retained.'])],
  };
  console.log(`PACKED ${spec.key}: ${bytes.length} bytes, ${triangleCount(check)} triangles, ${JSON.stringify(bounds)}`);
}
await fs.writeFile(path.join(OUT,'assets.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Spring assets complete: ${Object.values(manifest.models).reduce((sum,model)=>sum+model.bytes,0)} bytes.`);
