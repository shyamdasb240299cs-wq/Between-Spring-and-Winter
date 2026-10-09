const sharp=require('../../Website/node_modules/sharp');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const source=path.resolve(root,'../../Website/public/scene/layers/continuous-shrine-enhanced.webp');
const bounds={tree:{left:0,top:750,width:300,height:380},gate:{left:490,top:1110,width:160,height:180}};
(async()=>{
  const m=await sharp(source).metadata();
  await sharp(source).png().toFile(path.join(root,'background-edit-input.png'));
  for(const [name,b] of Object.entries(bounds)){
    const region=Object.fromEntries(Object.entries(b).map(([key,value])=>[key,Math.round(value*m.width/887)]));
    await sharp(source).extract(region).png().toFile(path.join(root,`${name}-extraction-input.png`));
  }
  fs.writeFileSync(path.join(root,'registration.json'),JSON.stringify({canvas:[887,1774],bounds,gateEntry:[568,1200],treePivot:[18,1100],unchangedBackgroundGate:true},null,2));
})();
