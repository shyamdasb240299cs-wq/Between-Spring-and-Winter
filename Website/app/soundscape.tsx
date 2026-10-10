"use client";
import {useEffect,useRef,useState,type RefObject} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import {soundMix} from './sound-mix';
import {pausePlayback,startPlayback} from './sound-playback';
import type {WindClock} from './wind-motion';

const base='/audio/';
const ambientFiles={birds:'birds-v2.mp3',waterfall:'waterfall-v2.mp3',breeze:'breeze-v3.mp3',fire:'fire-v2.mp3'};
type Props={position:RefObject<number>;wind:RefObject<WindClock|null>;paused:boolean;silenced?:boolean};
type Layer={gain:GainNode;media:HTMLAudioElement;started:boolean;starting:boolean;target:number;failed:boolean;attempt:number};
type Engine={context:AudioContext;music:Layer;filter:BiquadFilterNode;layers:Map<string,Layer>;buffers:Map<string,AudioBuffer>;pending:Set<string>;failed:Set<string>;controller:AbortController;disposed:boolean;muted:boolean;birdAt:number;birdCount:number;lastRing:number;lastVelocity:number;clock:number;elapsed:number;active:Set<AudioBufferSourceNode>;error:(message:string)=>void};

function stream(context:AudioContext,file:string,destination:AudioNode,host:HTMLElement):Layer{
  const media=new Audio();media.crossOrigin='anonymous';media.preload='none';media.loop=true;media.src=base+file;
  const gain=context.createGain();gain.gain.value=0;
  context.createMediaElementSource(media).connect(gain);gain.connect(destination);
  media.hidden=true;host.appendChild(media);
  return {gain,media,started:false,starting:false,target:-1,failed:false,attempt:0};
}
function fadeLayer(layer:Layer,target:number,time:number){
  if(Math.abs(layer.target-target)<.002)return;
  layer.target=target;layer.media.dataset.target=target.toFixed(3);
  layer.gain.gain.cancelScheduledValues(time);
  layer.gain.gain.setTargetAtTime(target,time,1.4);
}
async function loadContact(engine:Engine,key:string,file:string){
  if(engine.buffers.has(key)||engine.pending.has(key)||engine.failed.has(key)||engine.disposed)return;
  engine.pending.add(key);
  try{
    const response=await fetch(base+file,{signal:engine.controller.signal});
    if(!response.ok)throw Error('Unavailable sound');
    const buffer=await engine.context.decodeAudioData(await response.arrayBuffer());
    if(!engine.disposed)engine.buffers.set(key,buffer);
  }catch{if(!engine.disposed){engine.failed.add(key);engine.error('A sound could not load. Toggle music to retry.');}}
  finally{engine.pending.delete(key);}
}
function contact(engine:Engine,key:string,volume:number,pan:number){
  const buffer=engine.buffers.get(key);if(!buffer||volume<.01||engine.disposed)return false;
  const source=engine.context.createBufferSource(),gain=engine.context.createGain(),stereo=engine.context.createStereoPanner();
  source.buffer=buffer;gain.gain.value=volume;stereo.pan.value=pan;
  source.connect(gain);gain.connect(stereo);stereo.connect(engine.context.destination);
  engine.active.add(source);
  source.onended=()=>{engine.active.delete(source);source.disconnect();gain.disconnect();stereo.disconnect();};
  source.start();return true;
}
function dispose(engine:Engine){
  engine.disposed=true;engine.controller.abort();
  for(const layer of [engine.music,...engine.layers.values()]){pausePlayback(layer);layer.media.removeAttribute('src');layer.media.load();layer.media.remove();}
  for(const source of engine.active)source.stop();engine.active.clear();
  void engine.context.close();
}

export default function Soundscape({position,wind,paused,silenced=false}:Props){
  const engine=useRef<Engine|null>(null),pause=useRef(paused);
  const silence=useRef(silenced);
  const audioHost=useRef<HTMLDivElement>(null);
  const [enabled,setEnabled]=useState(false),[error,setError]=useState('');
  useEffect(()=>{pause.current=paused;},[paused]);
  useEffect(()=>{silence.current=silenced;},[silenced]);
  const toggle=()=>{
    let current=engine.current;
    if(!current){
      let context:AudioContext;
      try{context=new AudioContext({latencyHint:'playback'});}catch{setError('Sound is unavailable in this browser.');return;}
      const filter=context.createBiquadFilter();
      filter.type='lowpass';filter.frequency.value=5800;filter.Q.value=.4;filter.connect(context.destination);
      current={context,filter,music:stream(context,'music-v4.mp3',filter,audioHost.current!),layers:new Map(),buffers:new Map(),pending:new Set(),failed:new Set(),controller:new AbortController(),disposed:false,muted:false,birdAt:2.8,birdCount:0,lastRing:-10,lastVelocity:0,clock:0,elapsed:0,active:new Set(),error:setError};
      engine.current=current;
      void loadContact(current,'bird','opening-bird-v3.mp3');
    }else current.muted=!current.muted;
    setEnabled(!current.muted);setError('');
    if(current.muted){
      for(const layer of [current.music,...current.layers.values()])pausePlayback(layer);
      for(const source of current.active)source.stop();
      void current.context.suspend();
    }else{
      current.failed.clear();for(const layer of [current.music,...current.layers.values()])layer.failed=false;
      void current.context.resume();startPlayback(current,current.music);
      // Safari authorizes media per element: prime each stream silently within
      // this gesture, then let the scroll mixer pause and resume it as needed.
      for(const [name,file] of Object.entries(ambientFiles)){
        let layer=current.layers.get(name);
        if(!layer){layer=stream(current.context,file,current.context.destination,audioHost.current!);current.layers.set(name,layer);}
        layer.gain.gain.cancelScheduledValues(current.context.currentTime);layer.gain.gain.setValueAtTime(0,current.context.currentTime);layer.target=-1;
        startPlayback(current,layer);
      }
      void loadContact(current,'bird','opening-bird-v3.mp3');
    }
  };
  useEffect(()=>{
    if(!enabled)return;
    let last=performance.now(),timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
    let lastFrequency=-1;
    const visibility=()=>{
      const current=engine.current;
      if(document.hidden){
        if(timer)clearTimeout(timer);
        if(current){for(const layer of [current.music,...current.layers.values()])pausePlayback(layer);for(const source of current.active)source.stop();current.lastVelocity=0;void current.context.suspend();}
      }else{last=performance.now();if(current&&!current.muted){void current.context.resume();startPlayback(current,current.music);}tick();}
    };
    const tick=()=>{
      if(disposed||document.hidden)return;
      timer=setTimeout(tick,50);
      const now=performance.now(),seconds=Math.min(.15,(now-last)/1000);last=now;
      const current=engine.current;if(!current||current.muted)return;
      current.elapsed+=seconds;
      const motion=wind.current;
      const mix=soundMix(position.current,innerWidth,innerHeight,pause.current?0:motion?.air??0);
      const audioTime=current.context.currentTime;
      fadeLayer(current.music,silence.current?0:mix.music,audioTime);
      if(Math.abs(lastFrequency-mix.frequency)>8){current.filter.frequency.cancelScheduledValues(audioTime);current.filter.frequency.setTargetAtTime(mix.frequency,audioTime,2.2);lastFrequency=mix.frequency;}
      audioHost.current!.dataset.reading=String(mix.reading>.99);
      for(const [name,file] of Object.entries(ambientFiles)){
        const volume=silence.current?0:mix[name as keyof typeof ambientFiles];
        let layer=current.layers.get(name);
        if(volume>.01&&!layer){layer=stream(current.context,file,current.context.destination,audioHost.current!);current.layers.set(name,layer);}
        if(!layer)continue;
        fadeLayer(layer,volume,audioTime);
        if(volume>.01&&!layer.started)startPlayback(current,layer);
        // Silent media sleeps after its fade. It resumes without re-downloading.
        if(volume<.001&&layer.gain.gain.value<.001&&layer.started&&!layer.starting)pausePlayback(layer);
      }
      if(!silence.current&&mix.openingBird>.05&&current.birdCount<2&&current.elapsed>current.birdAt){
        if(contact(current,'bird',mix.openingBird,current.birdCount===0?-.25:.25)){current.birdCount++;audioHost.current!.dataset.birdCalls=String(current.birdCount);current.birdAt=current.elapsed+13.5;}
      }
      if(mix.bell>.02)void loadContact(current,'bell','furin-contact-v3.mp3');
      if(motion){
        // A clapper contacts the glass near a swing reversal, with no ticking loop.
        const reversal=current.lastVelocity*motion.velocity<0;
        if(!silence.current&&!pause.current&&reversal&&Math.abs(motion.angle)>.027&&motion.time-current.lastRing>1.7&&mix.bell>.01){
          if(contact(current,'bell',mix.bell*Math.min(1,.4+Math.abs(motion.paper)),.22)){current.lastRing=motion.time;audioHost.current!.dataset.lastRing=String(motion.time);}
        }
        current.lastVelocity=motion.velocity;current.clock=motion.time;
      }
    };
    tick();document.addEventListener('visibilitychange',visibility);
    return()=>{disposed=true;if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};
  },[position,wind,enabled]);
  useEffect(()=>()=>{if(engine.current){dispose(engine.current);engine.current=null;}},[]);
  return <div className="sound-control">
    <div ref={audioHost} hidden aria-hidden="true"/>
    <button className="sound-toggle" aria-label={enabled?'Turn music off':'Turn music on'} aria-pressed={enabled} onClick={toggle}>{enabled?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{enabled?'Music on':'Music off'}</span></button>
    {error&&<span className="sound-error" role="status">{error}</span>}
  </div>;
}
