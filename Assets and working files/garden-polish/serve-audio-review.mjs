import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('../../.audio-review/',import.meta.url);
const html=new URL('./audio-review.html',import.meta.url);
http.createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  const allowed=/^(journey-preview|opening-music|reading-music|birds|coastal|waterfall|breeze|furin-glass|fire)(-v2)?\.mp3$/.test(name)||/^(music|reading-music|opening-bird|breeze|furin|furin-contact)-v3\.mp3$/.test(name)||/^(music|reading-music)-v4\.mp3$/.test(name);
  if(name && !allowed){res.writeHead(404);res.end();return;}
  try{
    const buffer=await readFile(name?new URL(name,root):html);
    const origin=['http://127.0.0.1:5173','http://localhost:5173'].includes(req.headers.origin)?req.headers.origin:'http://127.0.0.1:5173';
    const headers={'Content-Type':name?'audio/mpeg':'text/html; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','Accept-Ranges':'bytes'};
    const range=name&&req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){
      const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),buffer.length-1):buffer.length-1;
      if(start>end||start>=buffer.length){res.writeHead(416,{...headers,'Content-Range':`bytes */${buffer.length}`});res.end();return;}
      res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${buffer.length}`});res.end(buffer.subarray(start,end+1));
    }else{res.writeHead(200,{...headers,'Content-Length':buffer.length});res.end(buffer);}
  }catch{res.writeHead(404);res.end('Preview is being prepared.');}
}).listen(5174,'127.0.0.1',()=>console.log('Private audio review: http://127.0.0.1:5174/'));
