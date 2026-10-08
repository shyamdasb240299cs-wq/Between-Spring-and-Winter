import {mkdir,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../../.audio-review/',import.meta.url);
await mkdir(out,{recursive:true});
const sources={birds:[2472,'Morning birds'],waterfall:[2517,'Waterfall in the woods'],breeze:[2427,'Breeze through the trees'],fire:[1329,'Campfire burning crackles'],coastal:[1185,'Sea waves with birds loop']};
await Promise.all(Object.entries(sources).map(async([name,[item,title]])=>{
  const response=await fetch(`https://mixkit.co/free-sound-effects/download/${item}/?context=item+grid`);
  if(!response.ok)throw new Error(`Catalog ${name}: ${response.status}`);
  const html=await response.text();
  const download=html.match(/data-download--modal-url-value="([^"]+)"/)[1];
  const file=new URL(`${name}-source.wav`,out);
  try{await access(file);}catch{
    const asset=await fetch(download);if(!asset.ok)throw new Error(`Audio ${name}: ${asset.status}`);
    await writeFile(file,new Uint8Array(await asset.arrayBuffer()));
  }
  sources[name]={title,download,catalog:'https://mixkit.co/free-sound-effects/',license:'https://mixkit.co/license/modal/sfxFree/'};
  console.log(name,fileURLToPath(file));
}));
await writeFile(new URL('field-sources.json',out),JSON.stringify(sources,null,2));
for(const [name,url] of [
  ['GeneralUser-GS.sf2','https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2'],
  ['GeneralUser-GS-LICENSE.txt','https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/documentation/LICENSE.txt'],
]){
  const file=new URL(name,out);
  try{await access(file);}catch{
    const response=await fetch(url);if(!response.ok)throw new Error(`Instrument library: ${response.status}`);
    await writeFile(file,new Uint8Array(await response.arrayBuffer()));
  }
}
