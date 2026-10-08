const sharp=require('../../Website/node_modules/sharp');
const path=require('node:path');
const scene=path.resolve(__dirname,'../../Website/public/scene/layers/forest-foreground.webp');
(async()=>{
  await sharp(scene).extract({left:1170,top:880,width:370,height:260}).png().toFile(path.join(__dirname,'burned-fire-edit-input.png'));
  await sharp(scene).extract({left:1350,top:0,width:250,height:360}).png().toFile(path.join(__dirname,'roof-blossom-edit-input.png'));
})();
