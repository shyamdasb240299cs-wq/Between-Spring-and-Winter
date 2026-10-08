const sharp=require('../../Website/node_modules/sharp');
const path=require('node:path');
const fs=require('node:fs');
const out=path.resolve(__dirname,'../../Website/public/scene/layers');
(async()=>{
  const source=path.join(__dirname,'foreground-burned-out-source.png');
  const metadata=await sharp(source).metadata();
  if(!metadata.hasAlpha||metadata.width!==metadata.height)throw Error('Foreground must remain a transparent square');
  await sharp(source).resize(1600,1600).webp({quality:94,alphaQuality:100}).toFile(path.join(out,'forest-foreground-burned-out.webp'));
  await sharp(path.join(__dirname,'roof-blossom-source.png')).resize({width:420}).webp({quality:92,alphaQuality:100}).toFile(path.join(out,'roof-blossom.webp'));
  const registration={foreground:metadata.width,fire:{center:[.849,.654],bounds:[.783,.622,.138,.055]},branch:{left:.883,top:-.005,width:.125,height:.1875,pivot:[1,.02]}};
  fs.writeFileSync(path.join(__dirname,'rebuilt-foreground-registration.json'),JSON.stringify(registration,null,2));
  for(const name of ['forest-foreground-burned-out.webp','roof-blossom.webp']){
    const file=path.join(out,name),m=await sharp(file).metadata();
    if(!m.hasAlpha)throw Error(name+' lost transparency');
    console.log(name,m.width,m.height,fs.statSync(file).size,'bytes');
  }
})();
