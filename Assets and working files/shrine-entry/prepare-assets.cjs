const sharp=require('../../Website/node_modules/sharp');
const path=require('node:path'),fs=require('node:fs/promises');
(async()=>{
 const input=path.join(__dirname,'background-separated-4x.png'),meta=await sharp(input).metadata();
 if(meta.width!==3548||meta.height!==7096)throw Error('Expected exact 4x master');
 const files=[];
 for(const[name,width]of[['continuous-shrine-entry-small.webp',960],['continuous-shrine-entry.webp',1920],['continuous-shrine-entry-large.webp',2880]]){
  const info=await sharp(input).resize({width}).webp({quality:92,effort:5}).toFile(path.resolve(__dirname,'../../Website/public/scene/layers',name));files.push({name,width:info.width,height:info.height,bytes:info.size});
 }
 await fs.writeFile(path.join(__dirname,'asset-metadata.json'),JSON.stringify({source:'../shrine-petals/background-separated-source.png',sourceSize:[887,1774],masterSize:[meta.width,meta.height],upscaler:'Installed Upscayl digital-art-4x',scale:4,files},null,2));
 console.log(JSON.stringify(files));
})().catch(e=>{console.error(e);process.exitCode=1;});
