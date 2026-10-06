import sharp from 'sharp';
import {readdir} from 'node:fs/promises';
const dir='../Assets and working files/generated-art/house-materials';
for(const file of await readdir(dir)) if(file.endsWith('.png')) await sharp(`${dir}/${file}`).resize(512,512,{fit:'cover'}).webp({quality:78}).toFile(`public/materials/${file.includes('cedar')?'cedar':'roof'}.webp`);
