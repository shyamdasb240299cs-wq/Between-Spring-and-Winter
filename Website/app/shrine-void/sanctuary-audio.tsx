"use client";
import {useEffect,useRef} from 'react';
import {getAudioEnabled} from '../audio-setting';
import {landscapeBlocked} from '../landscape-guard';
import type {AwakeningPhase} from './awakening';

type Cue=AwakeningPhase|'entry'|'film'|'idle';
export function sanctuaryCue(phase:Cue){window.dispatchEvent(new CustomEvent('sanctuary-audio-cue',{detail:phase}));}
export function sanctuaryStep(side:number){window.dispatchEvent(new CustomEvent('sanctuary-water-step',{detail:side}));}
const files={water:'sanctuary-water.wav',entry:'sanctuary-pull.mp3',charging:'sanctuary-crystal.mp3',relighting:'sanctuary-relight.mp3',lantern:'sanctuary-lantern.mp3',step0:'sanctuary-step-0.wav',step1:'sanctuary-step-1.wav',step2:'sanctuary-step-2.wav'};
type Engine={context:AudioContext;master:GainNode;waterGain:GainNode;water:AudioBufferSourceNode|null;buffers:Map<string,AudioBuffer>;active:Set<AudioBufferSourceNode>;timers:Set<ReturnType<typeof setTimeout>>;pending:Promise<void>|null;controller:AbortController;disposed:boolean};

/** Quiet, approved cues follow scene phases. No per-frame audio processing. */
export default function SanctuaryAudio(){
  const engine=useRef<Engine|null>(null);
  useEffect(()=>{
    let phase:Cue='idle',disposed=false,stepIndex=0;
    function obtain(){
      if(engine.current)return engine.current;
      try{
        const context=new AudioContext({latencyHint:'interactive'}),master=context.createGain(),waterGain=context.createGain();
        master.gain.value=0;waterGain.gain.value=0;waterGain.connect(master);master.connect(context.destination);
        return engine.current={context,master,waterGain,water:null,buffers:new Map(),active:new Set(),timers:new Set(),pending:null,controller:new AbortController(),disposed:false};
      }catch{return null;}
    }
    function clear(e:Engine){for(const timer of e.timers)clearTimeout(timer);e.timers.clear();for(const source of e.active)source.stop();e.active.clear();}
    function water(e:Engine,level:number){
      if(level>0&&!e.water){const buffer=e.buffers.get('water');if(buffer){const source=e.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(e.waterGain);source.start();e.water=source;}}
      const now=e.context.currentTime;e.waterGain.gain.cancelScheduledValues(now);e.waterGain.gain.setTargetAtTime(level,now,.45);
    }
    function one(e:Engine,key:string,level=1,pan=0){
      if(!getAudioEnabled()||document.hidden||landscapeBlocked()||e.disposed)return;
      const buffer=e.buffers.get(key);if(!buffer)return;
      const source=e.context.createBufferSource(),gain=e.context.createGain(),stereo=e.context.createStereoPanner();source.buffer=buffer;gain.gain.value=level;stereo.pan.value=pan;
      source.connect(gain);gain.connect(stereo);stereo.connect(e.master);e.active.add(source);
      source.onended=()=>{e.active.delete(source);source.disconnect();gain.disconnect();stereo.disconnect();};source.start(e.context.currentTime);
    }
    function apply(e:Engine,playCue:boolean){
      if(!getAudioEnabled()||document.hidden||landscapeBlocked()||e.disposed)return;
      const now=e.context.currentTime;e.master.gain.cancelScheduledValues(now);e.master.gain.setTargetAtTime(1,now,.12);
      water(e,phase==='awake'?.75:phase==='lanterns'?.65:phase==='relighting'&&!playCue?.45:0);
      if(phase==='blackout'||phase==='film'){clear(e);e.master.gain.setValueAtTime(0,now);return;}
      if(!playCue)return;
      if(phase==='entry'||phase==='charging'||phase==='relighting')one(e,phase);
      if(phase==='relighting'){const timer=setTimeout(()=>{e.timers.delete(timer);if(phase==='relighting')water(e,.45);},250);e.timers.add(timer);}
      if(phase==='lanterns')for(let i=0;i<6;i++){
        const timer=setTimeout(()=>{e.timers.delete(timer);if(phase==='lanterns'||phase==='awake')one(e,'lantern',.9-i*.08,i%2?.35:-.35);},150+i*650);e.timers.add(timer);
      }
    }
    async function load(e:Engine){
      if(e.pending)return e.pending;
      e.pending=Promise.all(Object.entries(files).map(async([key,file])=>{if(e.buffers.has(key))return;try{const response=await fetch('/audio/'+file,{signal:e.controller.signal});if(!response.ok)return;const data=await e.context.decodeAudioData(await response.arrayBuffer());if(!e.disposed)e.buffers.set(key,data);}catch{/* Optional sound never blocks the scene. */}})).then(()=>{});
      await e.pending;e.pending=null;
    }
    // Called synchronously inside the original sound-button gesture, so Safari
    // can authorize this context before any asynchronous asset decoding.
    const setting=()=>{
      if(!getAudioEnabled()){const e=engine.current;if(e){clear(e);water(e,0);e.master.gain.setValueAtTime(0,e.context.currentTime);void e.context.suspend();}return;}
      const e=obtain();if(!e)return;void e.context.resume();void load(e).then(()=>{if(!disposed)apply(e,false);});
    };
    const cue=(event:Event)=>{const next=(event as CustomEvent<Cue>).detail;if(next===phase)return;phase=next;const e=engine.current;if(e){if(next==='idle')clear(e);apply(e,true);}};
    const step=(event:Event)=>{const e=engine.current;if(e&&(phase==='seeking'||phase==='awake'))one(e,'step'+(stepIndex++%3),.7,(event as CustomEvent<number>).detail*.16);};
    const visibility=()=>{const e=engine.current;if(!e)return;if(document.hidden||landscapeBlocked()){clear(e);void e.context.suspend();}else if(getAudioEnabled()){void e.context.resume();apply(e,false);}};
    window.addEventListener('journey-audio-change',setting);window.addEventListener('sanctuary-audio-cue',cue);window.addEventListener('sanctuary-water-step',step);document.addEventListener('visibilitychange',visibility);window.addEventListener('journey-orientation-change',visibility);
    return()=>{disposed=true;window.removeEventListener('journey-audio-change',setting);window.removeEventListener('sanctuary-audio-cue',cue);window.removeEventListener('sanctuary-water-step',step);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('journey-orientation-change',visibility);const e=engine.current;if(e){e.disposed=true;e.controller.abort();clear(e);e.water?.stop();void e.context.close();engine.current=null;}};
  },[]);
  return null;
}
