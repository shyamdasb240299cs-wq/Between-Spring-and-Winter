export const CRYSTAL_DISTANCE=18;
export const FIRST_MEMORY=28;
export type AwakeningPhase='arrival'|'seeking'|'charging'|'blackout'|'relighting'|'lanterns'|'awake';
const smooth=(t:number,a:number,b:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
/** One monotonic clock. Seeking waits for deliberate input, never a timer. */
export function createAwakening(reduced=false){
  const state={phase:'arrival' as AwakeningPhase,age:0,origin:0,canTouch:false};
  function advance(dt:number){
    state.age+=Math.max(0,Math.min(.1,dt));
    const duration=state.phase==='arrival'?1.8:state.phase==='charging'?(reduced?1.2:3.8):state.phase==='blackout'?2:state.phase==='relighting'?2.2:state.phase==='lanterns'?(reduced?2.8:5.4):Infinity;
    if(state.age>=duration){state.age-=duration;state.phase=state.phase==='arrival'?'seeking':state.phase==='charging'?'blackout':state.phase==='blackout'?'relighting':state.phase==='relighting'?'lanterns':'awake';}
  }
  function pose(){
    const phase=state.phase,t=state.age;
    const reveal=phase==='awake'?1:phase==='lanterns'?smooth(t,reduced?.6:1.8,reduced?2.6:5):0;
    // White stays opaque until the black curtain covers it: no glimpse of the
    // crystal between the pulse and the two-second, fully black pause.
    const flash=phase==='charging'&&!reduced?smooth(t,.7,2.1):0;
    const black=phase==='arrival'?1-smooth(t,.5,1.8):phase==='charging'?smooth(t,reduced?.6:2.8,reduced?1.2:3.45):phase==='blackout'?1:phase==='relighting'?1-smooth(t,0,.5):0;
    return {phase,black,flash,pulse:phase==='charging'?smooth(t,.25,2.25):0,reveal,crystalPower:phase==='charging'?(1+smooth(t,0,reduced?.7:2.1)*5)*(1-smooth(t,reduced?.9:3.45,reduced?1.2:3.8)):phase==='relighting'?smooth(t,.25,2.2):phase==='blackout'?0:1,
      movement:phase==='seeking'||phase==='awake',canTouch:state.canTouch&&phase==='seeking'};
  }
  return {state,advance,pose,contact(distance:number,x:number,yaw:number){
    const dz=CRYSTAL_DISTANCE-distance,d=Math.hypot(x,dz),facing=(x*Math.sin(yaw)+dz*Math.cos(yaw))/Math.max(.01,d);
    state.canTouch=state.phase==='seeking'&&d<3.4&&facing>.35;
  },touch(distance:number){if(state.phase!=='seeking'||!state.canTouch)return false;state.phase='charging';state.age=0;state.origin=distance;state.canTouch=false;return true;},
  lantern(index:number,side:number){if(state.phase==='awake')return 1;if(state.phase!=='lanterns')return 0;
    const order=Math.abs(index*9+2-state.origin)/9+(side>0?.25:0),spacing=reduced?.11:.24;
    return smooth(state.age,.12+order*spacing,.45+order*spacing);}};
}
