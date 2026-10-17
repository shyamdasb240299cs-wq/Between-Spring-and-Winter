import { CLOSE_START, FLIP_START, READ_START, smooth } from './journey-data';

export const CLOSED_BOOK_CENTER = { x: -2.86, z: -.02135 };

/** Scroll owns the entire turn, so reversing direction retraces the same arc. */
export function bookPose(p:number,width:number,height:number,reservedHeight=128){
  const portrait=height>width&&width<=1024;
  const opening=smooth(p,5.05,6.12),zoom=smooth(p,5.35,READ_START);
  const close=smooth(p,CLOSE_START+.12,CLOSE_START+1.18);
  const retreat=smooth(p,CLOSE_START+.22,CLOSE_START+1.45);
  const crossing=smooth(p,CLOSE_START+1.9,CLOSE_START+3.45);
  const viewHeight=2*Math.tan(31*Math.PI/360)*12.8,viewWidth=viewHeight*width/height;
  const fitZ=Math.max(4.5/(2*Math.tan(31*Math.PI/360)*Math.max(.2,(height-reservedHeight)/height)),6.06/(2*Math.tan(31*Math.PI/360)*(width-24)/height));
  const finalScale=portrait?Math.min(.72,viewHeight*.29/4.5,viewWidth*.38/3):Math.min(.88,viewWidth*.40/3);
  const startScale=portrait?Math.min(.7,viewWidth*.60/3):Math.min(1,viewWidth*.42/3);
  const startX=portrait?viewWidth*.19:Math.min(2.25,viewWidth*.27);
  const closedX=viewWidth*(portrait?.20:.245)*(-1+2*crossing);
  return {opening,zoom,close,retreat,crossing,portrait,
    cameraZ:(12.8*(1-zoom)+fitZ*zoom)*(1-retreat)+12.8*retreat,
    cameraX:-1.43*zoom*(1-retreat),
    scale:(startScale*(1-zoom)+zoom)*(1-retreat)+finalScale*retreat,
    startY:portrait?-viewHeight*.13*(1-zoom):0,
    startX:startX*(1-zoom),closedX,
    closedY:portrait?viewHeight*.20:0,
    yaw:-.48*(1-opening)+.025*opening+(Math.PI-.125)*crossing,
    pitch:.065*(1-zoom)+.10*Math.sin(Math.PI*crossing),
    roll:.018*(1-opening)-.14*Math.sin(Math.PI*crossing),
    lift:Math.sin(Math.PI*crossing)*(portrait?.16:.30),
    // A small pullback during the rapid turns gives rising leaves breathing room.
    flipPullback:Math.sin(Math.PI*smooth(p,FLIP_START,CLOSE_START))*.22,
  };
}

/** Bound the complete presentation, including a leaf rising toward the camera. */
export function bookViewport(width:number,height:number,reservedHeight:number){
  const readWidth=Math.min(width-22,Math.max(80,height-reservedHeight)*6.06/4.5);
  const readHeight=readWidth*4.5/6.06;
  const turnHeight=readHeight/(1-.101*readHeight/height);
  const left=Math.max(0,Math.floor(Math.min((width-readWidth)/2-40,width*.255-height*.22-40)));
  const right=Math.min(width,Math.ceil(Math.max((width+readWidth)/2+40,width*.74+height*.22+40)));
  const top=Math.max(0,Math.floor(Math.min(44,(height-Math.max(turnHeight,height*.8))/2-12)));
  return{left,top,width:right-left,height:height-top*2};
}
