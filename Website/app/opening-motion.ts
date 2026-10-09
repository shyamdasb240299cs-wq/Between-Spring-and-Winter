import {clamp,smooth} from './journey-data';
import type {landscapeLayout} from './scenery-layout';

export const OPENING_BRANCH={width:630/887,height:370/1774};
export const SUN={x:.668,y:.114};
export const FLOCK_SIZE=5;
export const FLOCK_PERIOD=22;
type Layout=ReturnType<typeof landscapeLayout>;

/** One flock enters through the left edge, recedes into the sun, then rests. */
export function horizonBird(time:number,index:number,layout:Layout){
  const age=time%FLOCK_PERIOD-.4-index*.3,duration=14.6+index*.12;
  const visible=age>=0&&age<duration;
  const t=clamp(age/duration),u=1-(1-t)**1.2;
  const startX=-46-index*13,startY=layout.height*(.37+index*.018);
  const endX=SUN.x*layout.paintedWidth-layout.cropX,endY=SUN.y*layout.worldHeight;
  const controlX=layout.width*.3,controlY=Math.min(startY,endY)-layout.height*.14;
  const inverse=1-u;
  const x=inverse*inverse*startX+2*inverse*u*controlX+u*u*endX;
  const y=inverse*inverse*startY+2*inverse*u*controlY+u*u*endY;
  const dx=2*inverse*(controlX-startX)+2*u*(endX-controlX);
  const dy=2*inverse*(controlY-startY)+2*u*(endY-controlY);
  return {visible,x,y,size:clamp(layout.height*.036,14,26)*(.1+.9*(1-t)**1.3),opacity:1-smooth(t,.91,1),rotation:Math.atan2(dy,dx)*180/Math.PI};
}

export type OpeningWind={time:number;start:number;duration:number;strength:number;seed:number;air:number;angle:number;velocity:number};
export function createOpeningWind():OpeningWind{return{time:0,start:1.1,duration:4.8,strength:.65,seed:921,air:0,angle:0,velocity:0};}
function random(clock:OpeningWind){clock.seed=(Math.imul(clock.seed,1664525)+1013904223)>>>0;return clock.seed/4294967296;}
export function advanceOpeningWind(clock:OpeningWind,seconds:number){
  const steps=Math.max(1,Math.ceil(seconds*120)),dt=seconds/steps;
  for(let i=0;i<steps;i++){
    clock.time+=dt;
    if(clock.time>clock.start+clock.duration+1){clock.start=clock.time+2.8+random(clock)*4.5;clock.duration=4+random(clock)*2;clock.strength=.42+random(clock)*.32;}
    const phase=(clock.time-clock.start)/clock.duration;
    clock.air=phase>0&&phase<1?clock.strength*Math.sin(Math.PI*phase)**2:0;
    clock.velocity+=(clock.air*(.7+.09*Math.sin(clock.time*5))-32*clock.angle-8.8*clock.velocity)*dt;
    clock.angle+=clock.velocity*dt;
  }
}

export type OpeningPetal={active:boolean;age:number;life:number;x:number;y:number;vx:number;vy:number;phase:number;size:number};
export function createOpeningPetals():OpeningPetal[]{return Array.from({length:7},(_,i)=>({active:false,age:0,life:7+i*.35,x:0,y:0,vx:0,vy:0,phase:i*1.7,size:4+i%3}));}
const flowers=[[.12,.42],[.3,.34],[.53,.17],[.65,.32],[.2,.65],[.41,.43],[.08,.8]];
export function releaseOpeningPetal(petal:OpeningPetal,index:number){const flower=flowers[index%flowers.length];petal.active=true;petal.age=0;petal.x=flower[0]*630;petal.y=flower[1]*370;petal.vx=10;petal.vy=5;}
export function advanceOpeningPetals(petals:OpeningPetal[],seconds:number,wind:number){
  for(const petal of petals){
    if(!petal.active)continue;
    petal.age+=seconds;
    if(petal.age>=petal.life){petal.active=false;continue;}
    petal.vx+=(10+wind*46-petal.vx)*seconds*1.8;
    petal.vy=Math.min(20,petal.vy+seconds*3.5);
    petal.x+=petal.vx*seconds;petal.y+=petal.vy*seconds;
  }
}
