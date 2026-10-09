// Technical guides only; these overlays are not website art.
const sharp=require('../../Website/node_modules/sharp'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
  const data=JSON.parse(await fs.readFile(path.join(__dirname,'../waterfall-redesign/water-alignment-paths.json'),'utf8'));
  const polygons=Object.values(data.background.paths).map(points=>`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="#28dcf055" stroke="#28dcf0" stroke-width="1"/>`).join('');
  const guide=Buffer.from(`<svg width="887" height="1774">${polygons}</svg>`);
  const image=await sharp(path.join(__dirname,'background-separated-source.png')).composite([{input:guide}]).png().toBuffer();
  await sharp(image).extract({left:650,top:440,width:237,height:290}).resize({width:474}).png().toFile(path.join(__dirname,'upper-water-registration-audit.png'));
  await sharp(image).extract({left:630,top:1320,width:257,height:380}).resize({width:514}).png().toFile(path.join(__dirname,'lower-water-registration-audit.png'));
})().catch(error=>{console.error(error);process.exitCode=1;});
