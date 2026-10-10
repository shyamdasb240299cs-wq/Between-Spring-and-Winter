"use client";
import { useEffect,useRef,useState,type PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GlowPass } from './glow-pass';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ArrowLeft,Pause,Play,ZoomIn,Volume2,VolumeX } from 'lucide-react';
import {createWorld,type VoidWorld} from './create-world';
import {preloadVoidAssets,type PhotoManifest} from './assets';
import PhotoOverlay from './photo-overlay';
import type {AwakeningPhase} from './awakening';
import {sanctuaryCue} from './sanctuary-audio';
import {useAudioEnabled,requestAudioToggle} from '../audio-setting';
import './void.css';

export default function VoidScene({active,paused,onReady,onExit}:{active:boolean;paused:boolean;onReady?:()=>void;onExit?:()=>void}){
  const soundEnabled=useAudioEnabled();
  const host=useRef<HTMLDivElement>(null),world=useRef<VoidWorld|null>(null),pausedRef=useRef(paused),overlayRef=useRef(false),readyRef=useRef(onReady);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[motionPaused,setMotionPaused]=useState(paused);
  const [manifest,setManifest]=useState<PhotoManifest|null>(null),[activePhoto,setActivePhoto]=useState(-1),[photo,setPhoto]=useState(-1);
  const [stick,setStick]=useState({x:0,y:0}),stickPointer=useRef<number|null>(null);
  const black=useRef<HTMLDivElement>(null),flash=useRef<HTMLDivElement>(null);
  const [phase,setPhase]=useState<AwakeningPhase>('arrival'),[nearCrystal,setNearCrystal]=useState(false);
  useEffect(()=>{pausedRef.current=motionPaused;},[motionPaused]);
  useEffect(()=>{readyRef.current=onReady;},[onReady]);
  useEffect(()=>{
    if(!active)return;
    const previous=document.body.style.overflow,ownsLock=previous!=='hidden';
    if(ownsLock)document.body.style.overflow='hidden';
    const clear=()=>{stickPointer.current=null;setStick({x:0,y:0});world.current?.travel.resetInput();};
    window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
    return()=>{if(ownsLock)document.body.style.overflow=previous;window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
  },[active]);
  useEffect(()=>{overlayRef.current=photo>=0;world.current?.blockOverlay(photo>=0);},[photo]);
  useEffect(()=>{
    if(!active||!host.current)return;
    setPhase('arrival');setNearCrystal(false);setPhoto(-1);setActivePhoto(-1);
    const container=host.current;let dead=false,renderer:THREE.WebGLRenderer|null=null,composer:EffectComposer|null=null,w:VoidWorld|null=null;
    let frame=0,last=0,observer:ResizeObserver|undefined,cleanupInput=()=>{};
    const fail=(reason:unknown)=>{if(dead)return;console.error('[Memory sanctuary]',reason);setError('The sanctuary could not load. Please try again.');};
    void (async()=>{
      const assets=await preloadVoidAssets();if(dead)return;
      setManifest(assets.manifest);
      renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
      renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
      renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none';
      renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Memory sanctuary: use arrow keys to walk, drag to look');
      container.appendChild(renderer.domElement);w=createWorld(renderer,assets);world.current=w;
      composer=new EffectComposer(renderer);composer.addPass(new RenderPass(w.scene,w.camera));
      const glow=new GlowPass();composer.addPass(glow);composer.addPass(new OutputPass());
      function size(){
        if(dead||!renderer||!composer||!w)return;
        const width=container.clientWidth,height=container.clientHeight;
        const budget=Math.sqrt(1050000/Math.max(1,width*height)),scale=w.quality.scale*Math.min(1,budget);
        const rw=Math.max(1,Math.round(width*scale)),rh=Math.max(1,Math.round(height*scale));
        renderer.setSize(rw,rh,false);composer.setSize(rw,rh);w.resize(width,height);
        container.dataset.renderSize=rw+'×'+rh;
      }
      container.dataset.gpu=w.quality.gpu;
      size();w.update(0,pausedRef.current);await w.compile();if(dead)return;
      w.warmRender(()=>composer!.render());
      composer.render();setReady(true);readyRef.current?.();renderer.domElement.focus({preventScroll:true});
      sanctuaryCue('arrival');
      const canvas=renderer.domElement;let drag:number|null=null,px=0,py=0,lost=false,statsTime=0,frames=0,lastStats=0,lastPhase:AwakeningPhase='arrival',lastNear=false;
      const editable=(e:KeyboardEvent)=>(e.target as HTMLElement)?.closest('input,textarea,a,[role=dialog]');
      const down=(e:KeyboardEvent)=>{if(overlayRef.current||editable(e))return;if(e.key.toLowerCase()==='p'&&!e.repeat){if(w!.touchCrystal())e.preventDefault();return;}if(w!.travel.key(e.key,true))e.preventDefault();};
      const up=(e:KeyboardEvent)=>{w!.travel.key(e.key,false);};
      const clear=()=>{w?.travel.resetInput();drag=null;};
      const wheel=(e:WheelEvent)=>{if(overlayRef.current)return;e.preventDefault();w!.travel.handleWheel(e.deltaY);};
      const pointerDown=(e:PointerEvent)=>{if(overlayRef.current||drag!==null||e.button!==0)return;drag=e.pointerId;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});};
      const pointerMove=(e:PointerEvent)=>{if(e.pointerId!==drag)return;w!.travel.look(e.clientX-px,e.clientY-py);px=e.clientX;py=e.clientY;};
      const pointerEnd=(e:PointerEvent)=>{if(e.pointerId===drag){drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
      const tick=(now:number)=>{
        frame=0;if(dead||document.hidden||lost)return;
        const raw=last?(now-last)/1000:1/60;last=now;
        if(w!.quality.update(raw))size();
        w!.update(Math.min(raw,.05),pausedRef.current||overlayRef.current);
        const cinematic=w!.cinematic;
        if(black.current)black.current.style.opacity=String(cinematic.black);
        if(flash.current){flash.current.style.opacity=String(cinematic.flash);if(cinematic.flash>0){const p=w!.pulseOrigin,r=(.035+cinematic.pulse**2*1.25)*Math.hypot(container.clientWidth,container.clientHeight);flash.current.style.background=`radial-gradient(ellipse ${r}px ${r}px at ${p.x*100}% ${p.y*100}%,#fff 0%,#fff 30%,#ffffffbf 56%,#ffffff30 76%,transparent 94%)`;}}
        if(lastPhase!==cinematic.phase){lastPhase=cinematic.phase;setPhase(lastPhase);container.dataset.phase=lastPhase;sanctuaryCue(lastPhase);}
        if(lastNear!==cinematic.canTouch){lastNear=cinematic.canTouch;setNearCrystal(lastNear);}
        if(w!.travel.state.activePhotoIndex!==lastStats){lastStats=w!.travel.state.activePhotoIndex;setActivePhoto(lastStats);}
        renderer!.info.reset();renderer!.info.autoReset=false;composer!.render();
        frames++;statsTime+=raw;
        if(statsTime>.75){container.dataset.fps=(frames/statsTime).toFixed(1);container.dataset.drawCalls=String(renderer!.info.render.calls);container.dataset.triangles=String(renderer!.info.render.triangles);container.dataset.distance=w!.travel.state.distance.toFixed(2);container.dataset.cameraX=w!.travel.state.x.toFixed(2);container.dataset.yaw=w!.travel.state.yaw.toFixed(3);statsTime=frames=0;}
        frame=requestAnimationFrame(tick);
      };
      const wake=()=>{clear();if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(!frame&&!lost&&!dead){last=0;frame=requestAnimationFrame(tick);}};
      const onLost=(e:Event)=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;clear();setReady(false);setError('The graphics connection was interrupted. Please reload the sanctuary.');};
      const restored=()=>{lost=false;setError('');setReady(true);wake();};
      window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',wake);
      canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);
      canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('lostpointercapture',pointerEnd);
      canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',restored);
      cleanupInput=()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',wake);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerEnd);canvas.removeEventListener('pointercancel',pointerEnd);canvas.removeEventListener('lostpointercapture',pointerEnd);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',restored);};
      observer=new ResizeObserver(size);observer.observe(container);frame=requestAnimationFrame(tick);
    })().catch(fail);
    return()=>{dead=true;cancelAnimationFrame(frame);observer?.disconnect();cleanupInput();w?.dispose();world.current=null;
      composer?.passes.forEach(pass=>pass.dispose());composer?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
  },[active,retry]);
  function joystick(e:ReactPointerEvent<HTMLDivElement>){
    const rect=e.currentTarget.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(e.clientX-rect.left-rect.width/2)/38)),y=Math.max(-1,Math.min(1,(e.clientY-rect.top-rect.height/2)/38));
    world.current?.travel.joystick(x,y);setStick({x,y});
  }
  function endStick(e:ReactPointerEvent<HTMLDivElement>){if(e.pointerId!==stickPointer.current)return;stickPointer.current=null;world.current?.travel.joystick(0,0);setStick({x:0,y:0});if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
  const activeEntry=manifest?.photos[activePhoto];
  return <div className="void-scene-wrapper" role="region" aria-label="Memory sanctuary" data-ready={ready} data-phase={phase}>
    <div className="void-render" ref={host}/>
    <div className="void-loading" aria-hidden={ready} style={{opacity:ready?0:1}}>{error?<div role="alert"><p>{error}</p><button onClick={()=>{setError('');setReady(false);setRetry(retry+1);}}>Try again</button><button onClick={onExit}>Return to the story</button></div>:<span className="void-loading-light"/>}</div>
    <div className="void-cinematic-black" ref={black} style={{opacity:1}}/><div className="void-cinematic-flash" ref={flash}/>
    {ready&&<div className="void-hud" data-phase={phase} inert={photo>=0}><button className="void-back" onClick={onExit}><ArrowLeft size={16}/><span>Return to the story</span></button>
      <div className="void-caption"><span>{phase==='awake'?'THE MEMORY SANCTUARY':'FOLLOW THE DISTANT LIGHT'}</span><p className="void-desktop-help">↑ ↓ Walk · ← → Turn · Drag to look · A / D Step sideways</p><p className="void-mobile-help">Move with the joystick · Drag to look</p><a href="/void/credits.html" target="_blank" rel="noopener noreferrer">Asset credits</a></div>
      <button className="void-motion" aria-label={motionPaused?'Play petal motion':'Pause petal motion'} onClick={()=>setMotionPaused(!motionPaused)}>{motionPaused?<Play size={16}/>:<Pause size={16}/>}</button>
      <button className="void-sound" aria-label={soundEnabled?'Turn sanctuary sound off':'Turn sanctuary sound on'} aria-pressed={soundEnabled} onClick={requestAudioToggle}>{soundEnabled?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>{soundEnabled?'Sound on':'Sound off'}</span></button>
      {activeEntry&&phase==='awake'&&<button className="void-photo-button" onClick={()=>setPhoto(activePhoto)}><ZoomIn size={16}/>View this memory</button>}
      {nearCrystal&&phase==='seeking'&&<button className="void-photo-button void-crystal-button" onClick={()=>world.current?.touchCrystal()}><span className="void-desktop-help">Press P to touch the crystal</span><span className="void-mobile-help">Touch the crystal</span></button>}
      <div className="void-joystick" role="group" aria-label="Movement joystick" onPointerDown={e=>{if(stickPointer.current!==null)return;stickPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);joystick(e);}} onPointerMove={e=>{if(e.pointerId===stickPointer.current)joystick(e);}} onPointerUp={endStick} onPointerCancel={endStick} onLostPointerCapture={endStick}><span style={{transform:`translate(${stick.x*28}px,${stick.y*28}px)`}}/></div>
    </div>}
    <PhotoOverlay activeIndex={photo} photoSrc={manifest?.photos[photo]?.src} photoCaption={manifest?.photos[photo]?.caption} onClose={()=>setPhoto(-1)} onPrev={photo>0?()=>setPhoto(photo-1):undefined} onNext={manifest&&photo<manifest.photos.length-1?()=>setPhoto(photo+1):undefined}/>
  </div>;
}
