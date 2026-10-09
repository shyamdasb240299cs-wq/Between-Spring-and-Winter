const sharp=require('../../Website/node_modules/sharp');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname,out=path.resolve(root,'../../Website/public/scene/layers');
(async()=>{
  const background=path.join(root,'background-separated-source.png'),m=await sharp(background).metadata();
  if(m.width!==887||m.height!==1774)throw Error('Background registration changed');
  await sharp(background).webp({quality:96}).toFile(path.join(out,'continuous-shrine-separated.webp'));
  await sharp(background).resize({width:640,withoutEnlargement:true}).webp({quality:93}).toFile(path.join(out,'continuous-shrine-separated-small.webp'));
  const tree=path.join(root,'valley-tree-source.png'),gate=path.join(root,'shrine-gate-detailed-source.png');
  for(const file of [tree,gate])if(!(await sharp(file).metadata()).hasAlpha)throw Error('Extraction lost alpha');
  await sharp(tree).resize({width:900,withoutEnlargement:true}).webp({quality:94,alphaQuality:100}).toFile(path.join(out,'valley-cherry-tree.webp'));
  // Register the extracted gate to the original roof/post bounds, with padding
  // for the surrounding crop. No paint or new structure is synthesized here.
  const gateTrim=await sharp(gate).trim({background:'#00000000',threshold:20}).toBuffer();
  const gatePixels=await sharp(gateTrim).resize(488,376,{fit:'fill'}).png().toBuffer();
  await sharp({create:{width:640,height:720,channels:4,background:'#00000000'}}).composite([{input:gatePixels,left:80,top:116}]).png().toFile(path.join(root,'shrine-gate-registered.png'));
  await sharp(path.join(root,'shrine-gate-registered.png')).webp({quality:96,alphaQuality:100}).toFile(path.join(out,'shrine-gate-detailed.webp'));
  const placedGate=await sharp(path.join(root,'shrine-gate-registered.png')).resize(160,180).toBuffer();
  const combined=await sharp(background).composite([{input:placedGate,left:490,top:1110}]).png().toBuffer();
  await sharp(combined).extract({left:465,top:1100,width:200,height:180}).resize(600,540).png().toFile(path.join(root,'gate-registration-audit.png'));
  const files=[];
  for(const name of ['continuous-shrine-separated.webp','continuous-shrine-separated-small.webp','valley-cherry-tree.webp','shrine-gate-detailed.webp']){
    const file=path.join(out,name),meta=await sharp(file).metadata();files.push({name,width:meta.width,height:meta.height,alpha:meta.hasAlpha,bytes:fs.statSync(file).size});
  }
  fs.writeFileSync(path.join(root,'asset-metadata.json'),JSON.stringify({mode:'Built-in imagegen',backgroundUpscaled:false,source:[m.width,m.height],files,gateCrop:{left:490,top:1110,width:160,height:180},gateSolidBounds:{left:510,top:1139,width:122,height:94}},null,2));
  console.log(files);
})();
