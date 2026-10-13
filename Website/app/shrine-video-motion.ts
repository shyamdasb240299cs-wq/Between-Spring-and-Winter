import {smooth} from './journey-data';

export const SHRINE_FILM={width:1920,height:1080,gateX:960,gateY:475,gateWidth:554,artMs:850,zoomDelayMs:800,zoomEndMs:2600,zoomMs:3400,fadeSeconds:1.2,blackHoldMs:400};
/** Registration measured from the supplied film: roof x=677..1231, y=191. */
export function filmLayout(width:number,height:number){
  // The landscape-only experience always fills the display, without letterboxing.
  const scale=Math.max(width/SHRINE_FILM.width,height/SHRINE_FILM.height);
  const paintedWidth=SHRINE_FILM.width*scale,paintedHeight=SHRINE_FILM.height*scale;
  const left=(width-paintedWidth)/2,top=(height-paintedHeight)/2;
  return{left,top,width:paintedWidth,height:paintedHeight,x:left+SHRINE_FILM.gateX*scale,y:top+SHRINE_FILM.gateY*scale,gateWidth:SHRINE_FILM.gateWidth*scale};
}
export function shrineVideoPose(ms:number,origin:{x:number;y:number;w:number},width:number,height:number){
  const target=filmLayout(width,height),p=Math.min(1,Math.max(0,ms/SHRINE_FILM.zoomMs));
  // First reveal at the actual painted gate; approach only after the paper burns.
  const travel=smooth(ms,SHRINE_FILM.zoomDelayMs,SHRINE_FILM.zoomEndMs),scale=Math.exp(Math.log(target.gateWidth/Math.max(1,origin.w))*travel);
  const x=origin.x+(target.x-origin.x)*travel,y=origin.y+(target.y-origin.y)*travel;
  const plateScale=scale*origin.w/target.gateWidth;
  return{p,travel,x,y,scale,tx:x-origin.x*scale,ty:y-origin.y*scale,
    plateScale,plateX:x-target.x*plateScale,plateY:y-target.y*plateScale,
    filmBounds:{left:target.left*plateScale+x-target.x*plateScale,top:target.top*plateScale+y-target.y*plateScale,width:target.width*plateScale,height:target.height*plateScale},
    burnProgress:.08*smooth(ms,0,SHRINE_FILM.zoomDelayMs)+.08*travel+.84*smooth(ms,SHRINE_FILM.zoomEndMs,SHRINE_FILM.zoomMs),target};
}
export function filmBlack(time:number,duration:number){
  if(!Number.isFinite(duration)||duration<=0)return 0;
  return smooth(time,Math.max(0,duration-SHRINE_FILM.fadeSeconds),duration-.04);
}
