import {clamp,smooth} from './journey-data';

export const SCENE_CANVAS={width:887,height:1774};
export const VALLEY_TREE={left:0,top:750,width:300,height:380,pivot:{x:18,y:1100}};
export const SHRINE_GATE={left:490,top:1110,width:160,height:180};
export const SHRINE_ENTRY={x:568,y:1200};
export const PETAL_CAPACITY=160;
export type PetalSource='opening'|'valley'|'roof'|'ambient';
type Point={x:number;y:number};
export type FlowPetal={active:boolean;source:PetalSource;age:number;life:number;start:Point;first:Point;second:Point;phase:number;size:number};
export function createPetalFlow():FlowPetal[]{return Array.from({length:PETAL_CAPACITY},(_,i)=>({active:false,source:'opening',age:0,life:0,start:{x:0,y:0},first:{x:0,y:0},second:{x:0,y:0},phase:i*2.39996,size:4+i%4}));}
const sourceLimits={opening:60,valley:44,roof:40,ambient:36};
const origins={
  opening:[[65,135],[170,115],[285,75],[395,115],[490,60],[130,245],[245,200]],
  valley:[[25,795],[90,890],[160,930],[215,985],[125,1005],[40,915]],
  roof:[[830,1135],[856,1162],[880,1085],[810,1170],[875,1190]],
};
const random=(serial:number,salt:number)=>{const n=Math.sin(serial*127.1+salt*311.7)*43758.5453;return n-Math.floor(n);};

/** Individual petals follow varied wind paths into the original painted aperture. */
export function releaseFlowPetal(pool:FlowPetal[],source:PetalSource,serial:number,angle:number,offsetY:number,shiftX=0,outside?:Point){
  let count=0;for(const p of pool)if(p.active&&p.source===source)count++;
  if(count>=sourceLimits[source])return false;
  const petal=pool.find(p=>!p.active);if(!petal)return false;
  const r=random(serial,1),s=random(serial,2),v=random(serial,3);
  if(source==='ambient'&&outside){petal.start={...outside};}
  else {
    const points=origins[source==='ambient'?'valley':source];
    const a=points[serial%points.length],b=points[(serial+1)%points.length],mix=random(serial,4)*.45;
    const pivot=source==='opening'?{x:0,y:370*.19}:source==='valley'?VALLEY_TREE.pivot:{x:894,y:1045};
    const x=a[0]+(b[0]-a[0])*mix-pivot.x+(r-.5)*14,y=a[1]+(b[1]-a[1])*mix-pivot.y+(s-.5)*12;
    petal.start={x:pivot.x+x*Math.cos(angle)-y*Math.sin(angle)+shiftX,y:pivot.y+x*Math.sin(angle)+y*Math.cos(angle)+offsetY};
  }
  const right=petal.start.x>SHRINE_ENTRY.x,direction=right?-1:1;
  const remaining=Math.abs(SHRINE_ENTRY.x-petal.start.x),drift=Math.min(170,remaining*.55+35);
  petal.first={x:petal.start.x+direction*drift,y:petal.start.y+22+s*65};
  petal.second=source==='opening'?{x:570+(r-.5)*190,y:900+(s-.5)*90}
    :{x:SHRINE_ENTRY.x+direction*(35+r*75),y:SHRINE_ENTRY.y-55+(s-.5)*90};
  petal.active=true;petal.source=source;petal.age=0;petal.phase=r*Math.PI*2;
  petal.size=3.6+v*3.2;
  petal.life=(source==='opening'?17:source==='valley'?8:source==='roof'?7.5:6.5)+v*3;
  return true;
}
export function advancePetalFlow(pool:FlowPetal[],seconds:number){for(const petal of pool){if(!petal.active)continue;petal.age=Math.min(petal.life,petal.age+seconds);if(petal.age>=petal.life)petal.active=false;}}
export function flowPetalPose(petal:FlowPetal){
  const t=clamp(petal.age/petal.life),u=1-t;
  const flutter=Math.sin(t*Math.PI)*(1-smooth(t,.76,1));
  const x=u**3*petal.start.x+3*u*u*t*petal.first.x+3*u*t*t*petal.second.x+t**3*SHRINE_ENTRY.x+Math.sin(petal.age*1.7+petal.phase)*flutter*6;
  const y=u**3*petal.start.y+3*u*u*t*petal.first.y+3*u*t*t*petal.second.y+t**3*SHRINE_ENTRY.y+Math.sin(petal.age*1.1+petal.phase)*flutter*4;
  return{x,y,opacity:smooth(petal.age,0,.38)*(1-smooth(t,.89,1))*.94,depth:1-.76*smooth(t,.25,1),turn:petal.phase*57.3+Math.sin(petal.age*.95+petal.phase)*34+petal.age*(12+petal.phase*2),fold:.45+.5*Math.abs(Math.cos(petal.age*1.65+petal.phase)),layer:t>.84?1:t>.35?3:7};
}

/** Continuous emission credits avoid synchronized bursts and repeated shower gaps. */
export function createFlowEmitter(){return{credit:0,serial:0};}
export function emitFlowPetals(emitter:ReturnType<typeof createFlowEmitter>,seconds:number,rate:number,release:(serial:number)=>boolean){
  emitter.credit=Math.min(12,emitter.credit+seconds*Math.max(0,rate));
  while(emitter.credit>=1){emitter.credit--;release(emitter.serial++);}
}
