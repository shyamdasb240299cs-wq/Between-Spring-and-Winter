const sharp=require('../../Website/node_modules/sharp');
const path=require('node:path');
const fs=require('node:fs/promises');
const root=__dirname,output=path.resolve(root,'../../Website/public/scene/layers');
(async()=>{
  const source=await sharp(path.join(root,'background-enhanced-source.png')).metadata();
  const master=await sharp(path.join(root,'background-enhanced-4x.png')).metadata();
  if(master.width!==source.width*4||master.height!==source.height*4)throw Error('Upscayl master must be exactly 4x');
  const files=[];
  for(const [name,width,quality] of [['continuous-shrine-enhanced-small.webp',960,89],['continuous-shrine-enhanced.webp',1920,90],['continuous-shrine-enhanced-large.webp',2880,90]]){
    const info=await sharp(path.join(root,'background-enhanced-4x.png')).resize({width}).webp({quality,effort:5}).toFile(path.join(output,name));
    files.push({name,width:info.width,height:info.height,bytes:info.size});
  }
  const branch=await sharp(path.join(root,'opening-blossom-source.png')).metadata();
  if(!branch.hasAlpha)throw Error('Branch must retain real transparency');
  const branchInfo=await sharp(path.join(root,'opening-blossom-source.png')).resize({width:1440,height:Math.round(1440*370/630),fit:'fill'}).webp({quality:94,alphaQuality:100,effort:5}).toFile(path.join(output,'opening-blossom.webp'));
  const stats=await sharp(path.join(output,'opening-blossom.webp')).stats();
  if(stats.channels[3].min!==0||stats.channels[3].max!==255)throw Error('Branch alpha should include empty and opaque pixels');
  const metadata={background:{source:[source.width,source.height],master:[master.width,master.height],upscaler:'Installed Upscayl / digital-art-4x',scale:4,files},branch:{source:[branch.width,branch.height],encoded:[branchInfo.width,branchInfo.height],bytes:branchInfo.size,sourceBounds:{left:0,top:0,width:630/887,height:370/1774}},sun:{x:.668,y:.114}};
  await fs.writeFile(path.join(root,'asset-metadata.json'),JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify(metadata,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
