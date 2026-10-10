import {clamp, smooth} from './journey-data';

export const HOLD_MS=700;
export const ENTRY_MS=3000;
export type EntryPhase='idle'|'charging'|'returning'|'rush'|'portal'|'tunnel'|'settling'|'complete';
export type ShrineAnchor={x:number;y:number;width:number;height:number;viewportWidth:number;viewportHeight:number;visible:boolean};
export function createShrineLink(){
  const state={charge:0,committed:false,complete:false,anchor:null as ShrineAnchor|null,sync:null as (()=>void)|null,wake:null as (()=>void)|null};
  return{
    get charge(){return state.charge;},get committed(){return state.committed;},get complete(){return state.complete;},get anchor(){return state.anchor;},
    sync(){state.sync?.();},wake(){state.wake?.();},setSync(fn:(()=>void)|null){state.sync=fn;},setWake(fn:(()=>void)|null){state.wake=fn;},
    reportAnchor(anchor:ShrineAnchor){state.anchor=anchor;state.sync?.();},setCharge(value:number){state.charge=value;},commit(){state.committed=true;},
    finish(){state.complete=true;state.charge=0;},reset(){state.charge=0;state.committed=false;state.complete=false;},
  };
}
export type ShrineLink=ReturnType<typeof createShrineLink>;
export function createEntryClock(){return{phase:'idle' as EntryPhase,hold:0,elapsed:0,charge:0,cancelFrom:0,cancelElapsed:0,committed:false};}
export type EntryClock=ReturnType<typeof createEntryClock>;
export function beginEntryHold(clock:EntryClock){if(clock.committed||clock.phase==='charging')return false;clock.phase='charging';clock.hold=0;return true;}
export function cancelEntryHold(clock:EntryClock){if(clock.phase!=='charging'||clock.committed)return;clock.phase='returning';clock.cancelFrom=clock.charge;clock.cancelElapsed=0;}
/** One time source, one commitment. Hidden tabs do not advance this clock. */
export function advanceEntry(clock:EntryClock,ms:number,reduced=false){
  if(clock.phase==='charging'){
    clock.hold+=ms;clock.charge=Math.max(clock.charge,smooth(clock.hold,0,HOLD_MS));
    if(clock.hold>=HOLD_MS){clock.committed=true;clock.phase='rush';clock.elapsed=clock.hold-HOLD_MS;clock.charge=1;}
  }else if(clock.phase==='returning'){
    clock.cancelElapsed+=ms;clock.charge=clock.cancelFrom*(1-smooth(clock.cancelElapsed,0,240));
    if(clock.cancelElapsed>=240){clock.phase='idle';clock.charge=0;}
  }else if(clock.committed&&clock.phase!=='complete')clock.elapsed+=ms;
  if(clock.committed){
    const duration=reduced?700:ENTRY_MS;
    clock.phase=clock.elapsed>=duration?'complete':reduced?'settling':clock.elapsed<680?'rush':clock.elapsed<1120?'portal':clock.elapsed<2550?'tunnel':'settling';
  }
}
export function entryPose(clock:EntryClock,reduced=false){
  const t=clock.elapsed/1000,q=clock.charge;
  if(!clock.committed)return{scale:1+q*.009,travel:0,shade:q*.32,flash:0,black:0,tunnel:0,streak:q*.12,glow:q};
  if(reduced)return{scale:1,travel:0,shade:0,flash:0,black:smooth(clock.elapsed,0,650),tunnel:0,streak:0,glow:1-smooth(clock.elapsed,0,350)};
  const scale=1;
  return{scale,travel:smooth(t,.04,.62),shade:.32+smooth(t,0,.7)*.18,
    flash:smooth(t,.84,.96)*(1-smooth(t,1,1.18)),black:smooth(t,1.01,1.22),
    tunnel:smooth(t,1.04,1.25)*(1-smooth(t,2.45,2.93)),
    streak:smooth(t,0,.3)*(1-smooth(t,1.03,1.2)),glow:1-smooth(t,1.03,1.2)};
}
/** Different plane distances simulate travel; the entire page never zooms. */
export function entryPlaneScale(ms:number,distance:number){const travel=.92*clamp(ms/900)**2.4;return Math.min(8,1/Math.max(.125,1-travel/distance));}
