import fs from 'node:fs/promises';
// Rotate a crossfaded PCM loop so its file boundary is an untouched pair of
// adjacent source samples. WAV avoids encoder padding at a Web Audio loop edge.
const input=await fs.readFile('../Assets and working files/void-polish/audio/still-water.raw');
const source=new Float32Array(input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength));
const overlap=22050*3,length=source.length-overlap,mixed=new Float32Array(length);
for(let i=0;i<overlap;i++){const t=i/(overlap-1),blend=.5-.5*Math.cos(Math.PI*t);mixed[i]=source[length+i]*(1-blend)+source[i]*blend;}
mixed.set(source.subarray(overlap,length),overlap);
const data=Buffer.alloc(length*2),offset=overlap;
for(let i=0;i<length;i++)data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mixed[(i+offset)%length]))*32767),i*2);
const wav=Buffer.alloc(44);wav.write('RIFF');wav.writeUInt32LE(data.length+36,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(22050,24);wav.writeUInt32LE(44100,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(data.length,40);
await fs.writeFile('public/audio/sanctuary-water.wav',Buffer.concat([wav,data]));
console.log('Seamless 17-second still-water PCM loop:',data.length,'bytes; boundary is an adjacent source-sample pair.');
