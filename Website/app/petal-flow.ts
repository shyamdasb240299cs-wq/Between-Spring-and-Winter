import {clamp,smooth} from './journey-data';

export const SCENE_CANVAS={width:887,height:1774};
export const VALLEY_TREE={left:0,top:750,width:300,height:380,pivot:{x:18,y:1100}};
export const SHRINE_GATE={left:490,top:1110,width:160,height:180};
export const SHRINE_ENTRY={x:568,y:1200};
export const PETAL_CAPACITY=50;
export type PetalSource='opening'|'valley'|'roof';
type Point={x:number;y:number};
export type FlowPetal={active:boolean;source:PetalSource;age:number;life:number;start:Point;first:Point;second:Point;phase:number;size:number};
export function createPetalFlow():FlowPetal[]{return Array.from({length:PETAL_CAPACITY},(_,i)=>({active:false,source:'opening',age:0,life:0,start:{x:0,y:0},first:{x:0,y:0},second:{x:0,y:0},phase:i*2.39996,size:4+i%4}));}
const sourceLimits={opening:24,valley:12,roof:14};
const origins={
  opening:[[65,135],[170,115],[285,75],[395,115],[490,60],[130,245],[245,200]],
  valley:[[25,795],[90,890],[160,930],[215,985],[125,1005],[40,915]],
  roof:[[830,1135],[856,1162],[880,1085],[810,1170],[875,1190]],
};

/** Registered blossoms emit toward the gate; camera parallax is removed at birth. */
export function releaseFlowPetal(pool:FlowPetal[],source:PetalSource,serial:number,angle:number,offsetY:number,shiftX=0){
  if(pool.filter(p=>p.active&&p.source===source).length>=sourceLimits[source])return false;
  const petal=pool.find(p=>!p.active);if(!petal)return false;
  const origin=origins[source][serial%origins[source].length];
  const pivot=source==='opening'?{x:0,y:370*.19}:source==='valley'?VALLEY_TREE.pivot:{x:894,y:1045};
  const x=origin[0]-pivot.x,y=origin[1]-pivot.y;
  petal.start={x:pivot.x+x*Math.cos(angle)-y*Math.sin(angle)+shiftX,y:pivot.y+x*Math.sin(angle)+y*Math.cos(angle)+offsetY};
  const variation=(serial%5-2)*12;
  petal.first=source==='opening'?{x:petal.start.x+210,y:petal.start.y+65}:source==='valley'?{x:petal.start.x+160,y:petal.start.y+40}:{x:petal.start.x-130,y:petal.start.y+55};
  petal.second=source==='opening'?{x:720+variation,y:740}:source==='valley'?{x:440+variation,y:1155}:{x:610+variation,y:1250};
  petal.active=true;petal.source=source;petal.age=0;
  petal.life=(source==='opening'?20:source==='valley'?11:13)+(serial%5)*.7;
  return true;
}
export function advancePetalFlow(pool:FlowPetal[],seconds:number){for(const petal of pool){if(!petal.active)continue;petal.age=Math.min(petal.life,petal.age+seconds);if(petal.age>=petal.life)petal.active=false;}}
export function flowPetalPose(petal:FlowPetal){
  const t=clamp(petal.age/petal.life),u=1-t;
  const flutter=Math.sin(t*Math.PI)*(1-smooth(t,.72,1));
  const x=u**3*petal.start.x+3*u*u*t*petal.first.x+3*u*t*t*petal.second.x+t**3*SHRINE_ENTRY.x+Math.sin(petal.age*2+petal.phase)*flutter*5;
  const y=u**3*petal.start.y+3*u*u*t*petal.first.y+3*u*t*t*petal.second.y+t**3*SHRINE_ENTRY.y+Math.sin(petal.age*1.4+petal.phase)*flutter*3;
  return{x,y,opacity:smooth(petal.age,0,.18)*(1-smooth(t,.87,1))*.92,depth:1-.68*smooth(t,.3,1),turn:petal.age*36+petal.phase*60,fold:.55+.4*Math.cos(petal.age*3+petal.phase),layer:t>.86?1:t>.35?3:7};
}
