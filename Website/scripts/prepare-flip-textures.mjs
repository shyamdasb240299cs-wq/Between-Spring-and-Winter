import sharp from 'sharp';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const source=fileURLToPath(new URL('../public/manga/',import.meta.url));
const destination=source+'flip/';
await fs.mkdir(destination,{recursive:true});
const pages=(await fs.readdir(source)).filter(name=>/^(page-\d+|part-1|blank)\.webp$/.test(name)||name==='intro-letter.svg');
for(const name of pages){
  await sharp(source+name,{density:96}).resize({width:640,withoutEnlargement:true}).webp({quality:78,effort:5}).toFile(destination+name.replace('.svg','.webp'));
}
const bytes=await Promise.all(pages.map(async name=>(await fs.stat(destination+name.replace('.svg','.webp'))).size));
console.log(`${pages.length} flip textures: ${(bytes.reduce((a,b)=>a+b,0)/1024/1024).toFixed(2)} MB`);
