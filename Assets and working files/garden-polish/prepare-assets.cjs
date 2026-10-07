const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../../Website/node_modules/sharp');
const output = path.resolve(__dirname, '../../Website/public/scene/layers');
const source = name => path.join(__dirname, `${name}-source.png`);

async function atlas(name, columns, rows, pivots, scale, anchor) {
  const {width, height} = await sharp(source(name)).metadata();
  const cells = [];
  const registration = [];
  for (let i = 0; i < columns * rows; i++) {
    const inset = name === 'butterfly' && i === 1 ? 24 : 0;
    const left = Math.round(i % columns * width / columns) + inset;
    const top = Math.round(Math.floor(i / columns) * height / rows);
    const cellWidth = Math.round((i % columns + 1) * width / columns) - left;
    const cellHeight = Math.round((Math.floor(i / columns) + 1) * height / rows) - top;
    const buffer = await sharp(source(name)).extract({left, top, width:cellWidth, height:cellHeight}).resize(Math.round(cellWidth * scale), Math.round(cellHeight * scale)).png().toBuffer();
    const x = Math.round(anchor[0] - (pivots[i][0] - inset) * scale);
    const y = Math.round(anchor[1] - pivots[i][1] * scale);
    if (x < 0 || y < 0) throw new Error(`${name} frame ${i} would be clipped`);
    const frame = await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([{input:buffer,left:x,top:y}]).png().toBuffer();
    cells.push({input:frame,left:i % columns * 256,top:Math.floor(i / columns) * 256});
    registration.push({frame:i,source:{left,top,width:cellWidth,height:cellHeight},pivot:pivots[i],scale,offset:[x,y],anchor});
  }
  await sharp({create:{width:columns*256,height:rows*256,channels:4,background:'#00000000'}}).composite(cells).webp({lossless:true}).toFile(path.join(output,`${name}-sprite.webp`));
  return registration;
}

(async()=>{
  await sharp(path.join(__dirname,'campfire-reference-source.png')).trim({threshold:20}).resize({width:800}).webp({lossless:true}).toFile(path.join(output,'campfire.webp'));
  await sharp(source('campfire-smoke')).resize({width:320}).webp({quality:95,alphaQuality:100}).toFile(path.join(output,'campfire-smoke.webp'));
  await sharp(source('garden-blossoms')).resize({width:480}).webp({quality:90,alphaQuality:100}).toFile(path.join(output,'garden-blossoms.webp'));
  const butterfly = await atlas('butterfly',3,2,[[267,268],[273,268],[281,268],[256,256],[259,256],[254,256]],.42,[128,128]);
  // All suspension cords are shifted to the same pivot. The paper keeps its
  // generated bend; a smooth CSS pendulum supplies movement between poses.
  const furin = await atlas('furin',4,2,[[239,0],[243,0],[245,0],[248,0],[241,0],[224,0],[214,0],[233,0]],.50,[128,16]);
  const bell = await sharp(path.join(output,'furin-sprite.webp')).extract({left:0,top:0,width:256,height:125}).png().toBuffer();
  await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([{input:bell,left:0,top:0}]).webp({lossless:true}).toFile(path.join(output,'furin-bell.webp'));
  const furinPaper = await atlas('furin-paper',4,4,[[232,51],[196.5,51],[171,52],[153.5,51],[201,41.5],[168.5,40.5],[161,41.5],[143.5,41.5],[184,39],[159.5,39],[154,38],[146.5,40],[184,28.5],[178.5,28.5],[170,28.5],[154.5,28.5]],.52,[128,48]);
  fs.writeFileSync(path.join(__dirname,'registration.json'),JSON.stringify({butterfly,furin,furinPaper},null,2));
  for (const file of ['campfire.webp','campfire-smoke.webp','garden-blossoms.webp','butterfly-sprite.webp','furin-bell.webp','furin-paper-sprite.webp']) {
    const m=await sharp(path.join(output,file)).metadata();
    if (!m.hasAlpha) throw new Error(`${file} lost transparency`);
    console.log(file,m.width,m.height,fs.statSync(path.join(output,file)).size,'bytes, alpha preserved');
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
