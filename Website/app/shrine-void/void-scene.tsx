"use client";
import { useEffect,useRef,useState,type PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SharpOutput} from './sharp-output';
import { ArrowLeft,ArrowRight,BookOpen,KeyRound,Pause,Play,ZoomIn,Volume2,VolumeX,Hand,HandMetal,ArrowDownToLine } from 'lucide-react';
import {createWorld,type VoidWorld} from './create-world';
import {preloadVoidAssets,type PhotoManifest} from './assets';
import PhotoOverlay from './photo-overlay';
import type {AwakeningPhase} from './awakening';
import {sanctuaryCue} from './sanctuary-audio';
import {useAudioEnabled,requestAudioToggle} from '../audio-setting';
import './void.css';
import {landscapeBlocked} from '../landscape-guard';
import {SEASONS,isSeasonId,type SeasonId} from './seasons';
import {loadSeasonWorld,prewarmSeason,type SeasonWorld} from './season-world';
import {SEASON_CRYSTALS} from './season-crystal-journey';
import SeasonMangaReader from './season-manga-reader';
import type {RelicHUD} from './season-relics';
import {SpringTreasureUI} from './spring-treasure-ui';
import type {SpringTarget} from './spring-treasure-state';
import {SummerUI,SummerHUD} from './summer-ui';
import type {SummerPanel} from './summer-state';

export default function VoidScene({active,paused,onReady,onExit,preview=false}:{active:boolean;paused:boolean;onReady?:()=>void;onExit?:()=>void;preview?:boolean}){
  const soundEnabled=useAudioEnabled();
  const host=useRef<HTMLDivElement>(null),world=useRef<VoidWorld|null>(null),pausedRef=useRef(paused),overlayRef=useRef(false),readyRef=useRef(onReady);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[motionPaused,setMotionPaused]=useState(paused);
  const [manifest,setManifest]=useState<PhotoManifest|null>(null),[activePhoto,setActivePhoto]=useState(-1),[photo,setPhoto]=useState(-1);
  const [stick,setStick]=useState({x:0,y:0}),stickPointer=useRef<number|null>(null);
  const black=useRef<HTMLDivElement>(null),flash=useRef<HTMLDivElement>(null);
  const [phase,setPhase]=useState<AwakeningPhase>('arrival'),[nearCrystal,setNearCrystal]=useState(false);
  const seasonWorld=useRef<SeasonWorld|null>(null),changeSeason=useRef<(id:SeasonId|null)=>void>(()=>{}),curtain=useRef<HTMLDivElement>(null);
  const cancelSeason=useRef<()=>void>(()=>{});
  const [season,setSeason]=useState<SeasonId|null>(null),[transitioning,setTransitioning]=useState(false),[seasonMessage,setSeasonMessage]=useState(''),[seasonError,setSeasonError]=useState('');
  const [interactionHint,setInteractionHint]=useState('');
  const takeSeasonCrystal=useRef<()=>void>(()=>{}),seasonAura=useRef<HTMLDivElement>(null);
  const [takingCrystal,setTakingCrystal]=useState<SeasonId|null>(null),[crystalReady,setCrystalReady]=useState<SeasonId|null>(null);
  const [readerSeason,setReaderSeason]=useState<SeasonId|null>(null),[relicHUD,setRelicHUD]=useState<RelicHUD|null>(null),[relicMessage,setRelicMessage]=useState('');
  const readerOpen=useRef(false);
  const [springTarget,setSpringTarget]=useState<SpringTarget|'satchel'|null>(null);
  const [summerTarget,setSummerTarget]=useState<SummerPanel|null>(null),[summerDepth,setSummerDepth]=useState(0),[summerHeading,setSummerHeading]=useState(0);
  const closeSummer=()=>{seasonWorld.current?.closeSummer();setSummerTarget(null);sceneFocus();};
  const closeSpring=()=>{seasonWorld.current?.closeSpring();setSpringTarget(null);sceneFocus();};
  const sceneFocus=()=>host.current?.querySelector('canvas')?.focus({preventScroll:true});
  const useRelic=()=>{if(!seasonWorld.current){if(nearCrystal)world.current?.touchCrystal();else if(activePhoto>=0)setPhoto(activePhoto);}else{const message=seasonWorld.current.interact();if(message)setRelicMessage(message);}sceneFocus();};
  const pickObject=()=>{if(!seasonWorld.current){if(crystalReady)takeSeasonCrystal.current();}else{const message=seasonWorld.current.pickupObject();if(message)setRelicMessage(message);}sceneFocus();};
  const dropObject=()=>{const message=seasonWorld.current?.dropObject();if(message)setRelicMessage(message);sceneFocus();};
  const readBook=()=>{if(seasonWorld.current?.readBook()){setRelicMessage('Opening the book…');stickPointer.current=null;setStick({x:0,y:0});}};
  const closeBook=()=>{readerOpen.current=false;seasonWorld.current?.closeBook();setReaderSeason(null);setRelicMessage('');};
  const travel=()=>seasonWorld.current?.travel||world.current?.travel;
  const previewSummerView=(view:string)=>{
    if(!preview)return;const scene=seasonWorld.current;if(!scene?.summerMovement||scene.summerMovement.mode!=='walking')return;
    scene.travel.resetInput();scene.travel.setSurface(view==='overview'?()=>49:view==='reef'?()=>-8.6:view==='wreck'?()=>-15.3:view==='boat'?()=>3.1:null);
    const points:Record<string,{x:number;z:number;yaw:number;pitch:number}>={equipment:{x:31,z:-5.8,yaw:.25,pitch:-.14},boat:{x:50.9,z:-5.9,yaw:.62,pitch:-.77},wreck:{x:166,z:-22,yaw:-1.1,pitch:-.12},reef:{x:127,z:-29,yaw:-1.0,pitch:-.23},overview:{x:-7,z:78,yaw:-.06,pitch:-.57},forest:{x:-5,z:-5,yaw:.64,pitch:-.14},jetty:{x:43,z:-8,yaw:-1.15,pitch:-.16},beach:{x:-34,z:4,yaw:1.36,pitch:-.09}};
    const point=points[view];if(!point)return;Object.assign(scene.travel.state,point,{y:(scene.travel.height(point.x,point.z)??1.25)+1.63,velocity:0});scene.update(0,false);sceneFocus();
  };
  useEffect(()=>{pausedRef.current=motionPaused;},[motionPaused]);
  useEffect(()=>{readyRef.current=onReady;},[onReady]);
  useEffect(()=>{if(!relicMessage)return;const timer=setTimeout(()=>setRelicMessage(''),3200);return()=>clearTimeout(timer);},[relicMessage]);
  useEffect(()=>{
    if(!active)return;
    const previous=document.body.style.overflow,ownsLock=previous!=='hidden';
    if(ownsLock)document.body.style.overflow='hidden';
    const clear=()=>{stickPointer.current=null;setStick({x:0,y:0});travel()?.resetInput();};
    window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
    return()=>{if(ownsLock)document.body.style.overflow=previous;window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
  },[active]);
  useEffect(()=>{overlayRef.current=photo>=0||readerSeason!==null||springTarget!==null||summerTarget!==null;world.current?.blockOverlay(overlayRef.current||seasonWorld.current!==null);},[photo,readerSeason,springTarget,summerTarget]);
  useEffect(()=>{const entry=manifest?.photos[activePhoto];prewarmSeason(active&&!season&&phase==='awake'&&isSeasonId(entry?.season)?entry.season:null);return()=>prewarmSeason(null);},[active,manifest,activePhoto,phase,season]);
  useEffect(()=>{
    if(!active||!host.current)return;
    setPhase('arrival');setNearCrystal(false);setPhoto(-1);setActivePhoto(-1);setSeason(null);setTransitioning(false);setSeasonError('');setTakingCrystal(null);setCrystalReady(null);
    setReaderSeason(null);readerOpen.current=false;setRelicHUD(null);setRelicMessage('');setSpringTarget(null);setSummerTarget(null);
    const container=host.current;let dead=false,renderer:THREE.WebGLRenderer|null=null,composer:EffectComposer|null=null,w:VoidWorld|null=null;
    let s:SeasonWorld|null=null,switching=false,extracting=false,seasonScale=1;
    const controller=new AbortController();
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
      container.appendChild(renderer.domElement);w=createWorld(renderer,assets,preview);world.current=w;container.dataset.world='sanctuary';
      composer=new EffectComposer(renderer);
      const scenePass=new RenderPass(w.scene,w.camera);
      for(const [pass,label] of [[scenePass,'scene'],[new SharpOutput(),'output']] as const){
        const draw=pass.render.bind(pass);
        pass.render=(...args)=>{const q=s?.qualityController||w!.quality;q.beginRender(label);draw(...args);q.endRender();};composer.addPass(pass);
      }
      function size(){
        if(dead||!renderer||!composer||!w)return;
        const width=container.clientWidth,height=container.clientHeight;
        const scale=Math.min(w.quality.scale,Math.sqrt((s?(s.mobile?921600:2073600):1900000)/Math.max(1,width*height)))*(s?seasonScale:1);
        const rw=Math.max(1,Math.round(width*scale)),rh=Math.max(1,Math.round(height*scale));
        renderer.setSize(rw,rh,false);composer.setSize(rw,rh);w.resize(width,height);s?.resize(width,height);
        container.dataset.renderSize=rw+'×'+rh;
      }
      container.dataset.gpu=w.quality.gpu;
      size();w.update(0,pausedRef.current);await w.compile();if(dead)return;
      w.warmRender(()=>composer!.render());
      composer.render();setReady(true);readyRef.current?.();renderer.domElement.focus({preventScroll:true});
      sanctuaryCue('arrival');
      takeSeasonCrystal.current=()=>{
        if(dead||switching||extracting||s||overlayRef.current)return;
        const id=w!.takeSeasonCrystal();if(!id)return;
        extracting=true;setTakingCrystal(id);setCrystalReady(null);stickPointer.current=null;setStick({x:0,y:0});
        sanctuaryCue('charging');
      };
      changeSeason.current=(id)=>{
        if(dead||switching||id===s?.id||(!id&&!s))return;
        switching=true;setTransitioning(true);setSeasonError('');setSeasonMessage(id?`Entering ${SEASONS[id].title.toLowerCase()}…`:'Returning to the blossoms…');
        w!.blockOverlay(true);s?.travel.block(true);stickPointer.current=null;setStick({x:0,y:0});
        if(curtain.current)curtain.current.style.opacity='1';
        void(async()=>{
          let next:SeasonWorld|null=null;
          const request=new AbortController(),abort=()=>request.abort();
          let cancelled=false;
          cancelSeason.current=()=>{cancelled=true;request.abort();};
          controller.signal.addEventListener('abort',abort,{once:true});
          const timeout=setTimeout(()=>request.abort(),90000);
          try{
            const fade=new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?160:650));
            if(id){
              const loaded=loadSeasonWorld(renderer!,id,request.signal,message=>{if(!dead)setSeasonMessage(message);});
              [next]=await Promise.all([loaded,fade]);
            }else await fade;
            if(request.signal.aborted){next?.dispose();next=null;throw new DOMException('Aborted','AbortError');}
            if(dead){next?.dispose();return;}
            s?.dispose();s=next;seasonWorld.current=s;seasonScale=1;
            s?.setQuality(Math.max(.45,(seasonScale-.4)/.6));
            renderer!.shadowMap.enabled=!!s;renderer!.shadowMap.autoUpdate=false;renderer!.toneMappingExposure=s?.exposure||1.02;
            scenePass.scene=s?.scene||w!.scene;scenePass.camera=s?.camera||w!.camera;
            setSeason(s?.id||null);setActivePhoto(-1);setSeasonMessage('');setRelicHUD(null);setRelicMessage('');setSpringTarget(null);
            renderer!.domElement.setAttribute('aria-label',`${s?SEASONS[s.id].title+' world':'Memory sanctuary'}: use arrow keys to walk, drag to look`);
            container.dataset.world=s?.id||'sanctuary';container.dataset.model=s?.manifest.model||'';container.dataset.assetBytes=String(s?.manifest.bytes||0);
            sanctuaryCue(s?'idle':'awake');size();s?.update(0,pausedRef.current);composer!.render();
          }catch(reason){
            if(dead)return;
            if(!cancelled){console.error('[Season entry]',reason);setSeasonError(request.signal.aborted?'The landscape took too long to arrive. Please try again.':reason instanceof Error?reason.message:'This season could not load. Please try again.');}setSeasonMessage('');
          }finally{
            clearTimeout(timeout);controller.signal.removeEventListener('abort',abort);cancelSeason.current=()=>{};
            if(!dead){
              w!.resetSeasonCrystal();extracting=false;setTakingCrystal(null);setCrystalReady(null);
              if(seasonAura.current)seasonAura.current.style.opacity='0';
              if(!s){w!.update(0,pausedRef.current);composer!.render();}
              if(curtain.current)curtain.current.style.opacity='0';
              await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?160:650));
              if(!dead){switching=false;setTransitioning(false);w!.blockOverlay(Boolean(s)||overlayRef.current);s?.travel.block(false);renderer!.domElement.focus({preventScroll:true});}
            }
          }
        })();
      };
      if(preview){const requested=new URLSearchParams(window.location.search).get('season');if(isSeasonId(requested))changeSeason.current(requested);}
      const canvas=renderer.domElement;let drag:number|null=null,px=0,py=0,pressX=0,pressY=0,pressTime=0,dragDistance=0,lastTap=0,lost=false,statsTime=0,frames=0,lastStats=-2,lastPhase:AwakeningPhase='arrival',lastNear=false,hintTime=0,lastHint='',lastCrystal:SeasonId|null=null,lastRelic='';
      const editable=(e:KeyboardEvent)=>e.target instanceof Element&&e.target.closest('input,textarea,a,button,[role=dialog]');
      const down=(e:KeyboardEvent)=>{if(overlayRef.current||editable(e)||switching||extracting)return;
        if(s&&e.key.toLowerCase()==='r'&&!e.repeat){e.preventDefault();if(s.readBook()){setRelicMessage('Opening the book…');stickPointer.current=null;setStick({x:0,y:0});}return;}
        if(s?.bookBusy){if(e.key==='Escape'){e.preventDefault();s.closeBook();}return;}
        if(s&&e.key==='Escape'){e.preventDefault();changeSeason.current(null);return;}
        if(s&&e.key.toLowerCase()==='f'&&!e.repeat){e.preventDefault();const message=s.pickOrDrop();if(message)setRelicMessage(message);return;}
        if(s&&(e.key.toLowerCase()==='e'||e.key==='Enter')&&!e.repeat){e.preventDefault();const message=s.interact();if(message)setRelicMessage(message);return;}
        if(!s&&(e.key.toLowerCase()==='e'||e.key==='Enter')&&!e.repeat&&w!.cinematic.phase==='awake'){
          if(w!.seasonCrystal){e.preventDefault();takeSeasonCrystal.current();return;}
          if(w!.travel.state.activePhotoIndex>=0){e.preventDefault();setPhoto(w!.travel.state.activePhotoIndex);return;}
        }
        if(!s&&e.key.toLowerCase()==='f'&&!e.repeat&&w!.seasonCrystal){e.preventDefault();takeSeasonCrystal.current();return;}
        if(!s&&e.key==='Enter'&&!e.repeat&&w!.cinematic.canTouch){e.preventDefault();w!.touchCrystal();return;}
        if(!s&&e.key.toLowerCase()==='p'&&!e.repeat){if(w!.touchCrystal())e.preventDefault();return;}
        if((s?.travel||w!.travel).key(e.key,true))e.preventDefault();};
      const up=(e:KeyboardEvent)=>{(s?.travel||w!.travel).key(e.key,false);};
      const clear=()=>{(s?.travel||w?.travel)?.resetInput();drag=null;};
      const wheel=(e:WheelEvent)=>{if(overlayRef.current||switching||extracting||s?.bookBusy)return;e.preventDefault();(s?.travel||w!.travel).handleWheel(e.deltaY);};
      const pointerDown=(e:PointerEvent)=>{if(overlayRef.current||switching||extracting||s?.bookBusy||drag!==null||e.button!==0)return;drag=e.pointerId;pressX=px=e.clientX;pressY=py=e.clientY;pressTime=performance.now();dragDistance=0;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});};
      const pointerMove=(e:PointerEvent)=>{if(e.pointerId!==drag)return;dragDistance+=Math.hypot(e.clientX-px,e.clientY-py);(s?.travel||w!.travel).look(e.clientX-px,e.clientY-py);px=e.clientX;py=e.clientY;};
      const pointerEnd=(e:PointerEvent)=>{if(e.pointerId!==drag)return;
        const now=performance.now(),tap=e.type==='pointerup'&&!extracting&&dragDistance<8&&Math.hypot(e.clientX-pressX,e.clientY-pressY)<8&&now-pressTime<350;
        if(tap&&now-lastTap<340){lastTap=0;if(s){const status=s.bookStatus();const message=status.heldObject?s.dropObject():status.canInteract?s.interact():status.canPick?s.pickupObject():null;if(message)setRelicMessage(message);}else if(w!.seasonCrystal)takeSeasonCrystal.current();else if(w!.travel.state.activePhotoIndex>=0)setPhoto(w!.travel.state.activePhotoIndex);}
        else lastTap=tap?now:0;
        drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      };
      const tick=(now:number)=>{
        frame=0;if(dead||document.hidden||landscapeBlocked()||lost)return;
        const raw=last?(now-last)/1000:1/60;last=now;
        // The curtain holds the last frame while another world owns GPU preparation.
        if(switching||readerOpen.current){frame=requestAnimationFrame(tick);return;}
        const activeQuality=s?.qualityController||w!.quality;activeQuality.update(raw);
        // Keep native scene clarity and authored density; optimize visibility instead.
        const updateStart=performance.now();if(s)s.update(Math.min(raw,.1),pausedRef.current);else w!.update(Math.min(raw,.1),pausedRef.current||overlayRef.current);
        if(s?.readerReady&&!readerOpen.current){readerOpen.current=true;overlayRef.current=true;s.travel.resetInput();setReaderSeason(s.id);setRelicMessage('');}
        const passage=w!.seasonPassage;
        if(!s){
          const crystal=w!.seasonCrystal?.season??null;if(crystal!==lastCrystal){lastCrystal=crystal;setCrystalReady(crystal);}
          container.dataset.crystalStage=passage.stage;container.dataset.crystalSeason=passage.season||'';
          if(seasonAura.current){seasonAura.current.style.opacity=String(passage.envelop*.88);if(passage.season)seasonAura.current.style.setProperty('--crystal-colour',SEASON_CRYSTALS[passage.season].css);}
          if(extracting&&passage.ready&&passage.season){changeSeason.current(passage.season);}
        }
        const updateMs=performance.now()-updateStart;
        hintTime+=raw;if(hintTime>.2){hintTime=0;setSpringTarget(s?.springTarget??null);setSummerTarget(s?.summerTarget??null);if(s?.summer){setSummerDepth(Math.max(0,-s.travel.state.y));setSummerHeading(-s.travel.state.yaw*180/Math.PI);}const hint=s?.interactionHint()||'';if(hint!==lastHint){lastHint=hint;setInteractionHint(hint);}const hud=s?.bookStatus()??null,key=JSON.stringify(hud);if(key!==lastRelic){lastRelic=key;setRelicHUD(hud);}if(hud){container.dataset.relicStage=hud.stage;container.dataset.hasKey=String(hud.hasKey);container.dataset.hasBook=String(hud.hasBook);}}
        const cinematic=s?{phase:'awake' as const,black:0,flash:0,pulse:0,canTouch:false}:w!.cinematic;
        if(black.current)black.current.style.opacity=String(cinematic.black);
        if(flash.current){flash.current.style.opacity=String(cinematic.flash);if(cinematic.flash>0){const p=w!.pulseOrigin,r=(.035+cinematic.pulse**2*1.25)*Math.hypot(container.clientWidth,container.clientHeight);flash.current.style.background=`radial-gradient(ellipse ${r}px ${r}px at ${p.x*100}% ${p.y*100}%,#fff 0%,#fff 30%,#ffffffbf 56%,#ffffff30 76%,transparent 94%)`;}}
        if(lastPhase!==cinematic.phase){lastPhase=cinematic.phase;setPhase(lastPhase);container.dataset.phase=lastPhase;sanctuaryCue(lastPhase);}
        if(lastNear!==cinematic.canTouch){lastNear=cinematic.canTouch;setNearCrystal(lastNear);}
        const activeTravel=s?.travel||w!.travel;
        if(activeTravel.state.activePhotoIndex!==lastStats){lastStats=activeTravel.state.activePhotoIndex;setActivePhoto(lastStats);}
        renderer!.info.reset();renderer!.info.autoReset=false;
        const renderStart=performance.now();composer!.render();
        const renderMs=performance.now()-renderStart;
        frames++;statsTime+=raw;
        if(statsTime>.75){container.dataset.fps=(frames/statsTime).toFixed(1);container.dataset.gpuMs=activeQuality.gpuMs.toFixed(2);container.dataset.sceneMs=activeQuality.sceneMs.toFixed(2);container.dataset.outputMs=activeQuality.outputMs.toFixed(2);container.dataset.updateMs=updateMs.toFixed(2);container.dataset.renderMs=renderMs.toFixed(2);container.dataset.drawCalls=String(renderer!.info.render.calls);container.dataset.triangles=String(renderer!.info.render.triangles);container.dataset.geometries=String(renderer!.info.memory.geometries);container.dataset.textures=String(renderer!.info.memory.textures);container.dataset.distance=activeTravel.state.distance.toFixed(2);container.dataset.cameraX=activeTravel.state.x.toFixed(2);container.dataset.cameraZ=(s?.travel.state.z??w!.camera.position.z).toFixed(2);container.dataset.yaw=activeTravel.state.yaw.toFixed(3);container.dataset.quality=String(seasonScale);if(s){const snapshot=s.snapshot();container.dataset.ballPosition=JSON.stringify(snapshot.ballPosition);container.dataset.lanternOn=String(snapshot.lanternOn);container.dataset.treeCount=String(snapshot.treeCount);container.dataset.waterDepth=snapshot.waterDepth.toFixed(3);if(s.summer){container.dataset.summerMode=s.summer.state.mode;container.dataset.summerCheckpoint=s.summer.state.checkpoint;container.dataset.summerPlates=s.summer.state.plates.join(',');container.dataset.cameraY=s.travel.state.y.toFixed(2);}container.dataset.lakeRipples=String(snapshot.lakeRipples);container.dataset.fishJumps=String(snapshot.fishJumps);}statsTime=frames=0;}
        frame=requestAnimationFrame(tick);
      };
      const wake=()=>{clear();if(document.hidden||landscapeBlocked()){cancelAnimationFrame(frame);frame=0;}else if(!frame&&!lost&&!dead){last=0;frame=requestAnimationFrame(tick);}};
      const onLost=(e:Event)=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;clear();setReady(false);setError('The graphics connection was interrupted. Please reload the sanctuary.');};
      const restored=()=>{lost=false;setError('');setReady(true);wake();};
      // Development preview moves only the observer, so browser QA can inspect
      // every physical clue without writing puzzle progress or bypassing actions.
      const previewPose=(event:Event)=>{
        if(!preview||process.env.NODE_ENV!=='development'||!s||s.bookBusy)return;
        const pose=(event as CustomEvent<{x:number;z:number;y?:number;yaw:number;pitch:number}>).detail;
        if(!pose||![pose.x,pose.z,pose.yaw,pose.pitch].every(Number.isFinite))return;
        if(s.summerMovement?.mode==='swimming'){
          if(!Number.isFinite(pose.y)||!s.summerMovement.swim.setPose({...pose,y:pose.y!}))return;
          s.travel.resetInput();s.update(0,pausedRef.current);canvas.focus({preventScroll:true});return;
        }
        const surface=s.travel.height(pose.x,pose.z);if(surface===null)return;
        s.travel.resetInput();Object.assign(s.travel.state,{x:pose.x,z:pose.z,y:surface+1.63,yaw:pose.yaw,pitch:Math.max(-1.1,Math.min(.95,pose.pitch))});s.update(0,pausedRef.current);canvas.focus({preventScroll:true});
      };
      if(preview&&process.env.NODE_ENV==='development')window.addEventListener('spring-preview-pose',previewPose);
      window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',wake);window.addEventListener('journey-orientation-change',wake);
      canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);
      canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);canvas.addEventListener('lostpointercapture',pointerEnd);
      canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',restored);
      cleanupInput=()=>{window.removeEventListener('spring-preview-pose',previewPose);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',wake);window.removeEventListener('journey-orientation-change',wake);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerEnd);canvas.removeEventListener('pointercancel',pointerEnd);canvas.removeEventListener('lostpointercapture',pointerEnd);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',restored);};
      observer=new ResizeObserver(size);observer.observe(container);frame=requestAnimationFrame(tick);
    })().catch(fail);
    return()=>{dead=true;controller.abort();changeSeason.current=()=>{};takeSeasonCrystal.current=()=>{};cancelAnimationFrame(frame);observer?.disconnect();cleanupInput();s?.dispose();seasonWorld.current=null;w?.dispose();world.current=null;
      composer?.passes.forEach(pass=>pass.dispose());composer?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
  },[active,retry,preview]);
  function joystick(e:ReactPointerEvent<HTMLDivElement>){
    const rect=e.currentTarget.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(e.clientX-rect.left-rect.width/2)/38)),y=Math.max(-1,Math.min(1,(e.clientY-rect.top-rect.height/2)/38));
    travel()?.joystick(x,y);setStick({x,y});
  }
  function endStick(e:ReactPointerEvent<HTMLDivElement>){if(e.pointerId!==stickPointer.current)return;stickPointer.current=null;travel()?.joystick(0,0);setStick({x:0,y:0});if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
  const activeEntry=manifest?.photos[activePhoto];
  return <div className="void-scene-wrapper" role="region" aria-label={season?`${SEASONS[season].title} world`:'Memory sanctuary'} data-preview={preview} data-world={season||'sanctuary'} data-ready={ready} data-phase={phase}>
    <div className="void-render" ref={host}/>
    <div className="void-loading" aria-hidden={ready} style={{opacity:ready?0:1}}>{error?<div role="alert"><p>{error}</p><button onClick={()=>{setError('');setReady(false);setRetry(retry+1);}}>Try again</button><button onClick={onExit}>Return to the story</button></div>:<span className="void-loading-light"/>}</div>
    <div className="void-cinematic-black" ref={black} style={{opacity:1}}/><div className="void-cinematic-flash" ref={flash}/>
    <div className="void-season-aura" ref={seasonAura} aria-hidden="true"/>
    {takingCrystal&&!transitioning&&<p className="void-crystal-passage" role="status">The {SEASON_CRYSTALS[takingCrystal].name} crystal awakens…</p>}
    {ready&&<div className="void-hud" data-phase={phase} inert={photo>=0||transitioning||!!takingCrystal||readerSeason!==null||springTarget!==null||summerTarget!==null}><button className="void-back" disabled={relicHUD?.busy} onClick={()=>season?changeSeason.current(null):onExit?.()}><ArrowLeft size={16}/><span>{season?'Return to the blossoms':'Return to the story'}</span></button>
      <div className="void-caption"><span>{season?`PART ${['spring','summer','autumn','winter'].indexOf(season)+1} · ${SEASONS[season].title.toUpperCase()}`:phase==='awake'?'THE MEMORY SANCTUARY':'FOLLOW THE DISTANT LIGHT'}</span><p className="void-desktop-help">WASD / Arrows · Drag to look{season==='summer'?' · Enter Interact · Space Up · C Down':season?' · Double tap Interact · Enter Interact · F Pick / Drop · R Read':''}</p><p className="void-mobile-help">Joystick to move · Drag to look · Tap Interact</p><a href="/void/credits.html" target="_blank" rel="noopener noreferrer">Asset credits</a></div>
      <button className="void-motion" aria-label={motionPaused?'Play ambient motion':'Pause ambient motion'} onClick={()=>setMotionPaused(!motionPaused)}>{motionPaused?<Play size={16}/>:<Pause size={16}/>}</button>
      <button className="void-sound" aria-label={soundEnabled?'Turn sanctuary sound off':'Turn sanctuary sound on'} aria-pressed={soundEnabled} onClick={requestAudioToggle}>{soundEnabled?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>{soundEnabled?'Sound on':'Sound off'}</span></button>
      <div className="void-object-actions" aria-label="Object controls"><button onClick={pickObject} disabled={season?relicHUD?.busy||!relicHUD?.canPick:!crystalReady}><Hand size={17}/><span>Pick up</span><kbd>F</kbd></button><button onClick={useRelic} disabled={season?relicHUD?.busy||!relicHUD?.canInteract:!nearCrystal&&activePhoto<0}><HandMetal size={17}/><span>Interact</span><kbd>Enter</kbd></button><button onClick={dropObject} disabled={!season||relicHUD?.busy||!relicHUD?.canDrop}><ArrowDownToLine size={17}/><span>Drop</span><kbd>F</kbd></button></div>
      {season&&relicHUD&&<div className="void-inventory" aria-label="Carried items">{season==='spring'&&<button onClick={()=>{seasonWorld.current?.openSatchel();setSpringTarget(seasonWorld.current?.springTarget??null);}} disabled={relicHUD.busy}><BookOpen size={17}/>Satchel & notes</button>}{relicHUD.heldObject&&<span><Hand size={16}/>{relicHUD.heldObject}</span>}{relicHUD.hasKey&&<span><KeyRound size={16}/>Brass key</span>}{relicHUD.hasBook&&<button onClick={readBook} disabled={relicHUD.busy||!!relicHUD.heldObject}><BookOpen size={17}/>Read book<kbd>R</kbd></button>}</div>}
      {season==='summer'&&seasonWorld.current?.summer&&<><SummerHUD controller={seasonWorld.current.summer} depth={summerDepth} heading={summerHeading} onOpen={panel=>{seasonWorld.current?.openSummer(panel);setSummerTarget(panel);stickPointer.current=null;setStick({x:0,y:0});}}/>{seasonWorld.current.summerMovement?.mode==='swimming'&&<div className="summer-swim-controls" aria-label="Swimming depth controls">{(['up','down'] as const).map(direction=><button key={direction} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);seasonWorld.current?.summerMovement?.vertical(direction==='up',direction==='down');}} onPointerUp={()=>seasonWorld.current?.summerMovement?.vertical(false,false)} onPointerCancel={()=>seasonWorld.current?.summerMovement?.vertical(false,false)} onLostPointerCapture={()=>seasonWorld.current?.summerMovement?.vertical(false,false)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();seasonWorld.current?.summerMovement?.vertical(direction==='up',direction==='down');}}} onKeyUp={()=>seasonWorld.current?.summerMovement?.vertical(false,false)}>{direction==='up'?'↑ Ascend':'↓ Descend'}</button>)}</div>}</>}
      {season&&<div className="void-feedback" aria-live="polite">{relicHUD?.busy&&relicHUD.stage!=='resting'&&!readerSeason?<p role="status">{relicHUD.stage==='unlocking'?'The key turns. The box opens…':relicHUD.stage==='taking'?'You take the book…':relicHUD.stage==='dropping'?'Putting it down…':relicHUD.stage==='closing'?'Closing the book…':'Opening the cover…'}</p>:<>{relicMessage&&<p role="status">{relicMessage}</p>}{interactionHint&&<p className="void-context-hint">{interactionHint}</p>}</>}</div>}
      {!transitioning&&!springTarget&&!summerTarget&&!readerSeason&&<div className="void-crosshair" aria-hidden="true">+</div>}
      {!season&&<div className="void-feedback">{nearCrystal&&phase==='seeking'?<p>Interact to touch the crystal</p>:activeEntry&&phase==='awake'&&!takingCrystal?<p>{isSeasonId(activeEntry.season)?crystalReady===activeEntry.season?`Pick up the ${SEASON_CRYSTALS[activeEntry.season].name} crystal`:`Approach the ${SEASON_CRYSTALS[activeEntry.season].name} crystal · ${SEASONS[activeEntry.season].title}`:'Interact to view the cover'}</p>:null}</div>}
      <div className="void-joystick" role="group" aria-label="Movement joystick" onPointerDown={e=>{if(stickPointer.current!==null)return;stickPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);joystick(e);}} onPointerMove={e=>{if(e.pointerId===stickPointer.current)joystick(e);}} onPointerUp={endStick} onPointerCancel={endStick} onLostPointerCapture={endStick}><span style={{transform:`translate(${stick.x*28}px,${stick.y*28}px)`}}/></div>
    </div>}
    <div ref={curtain} className="void-season-curtain" aria-hidden={!transitioning}/>
    {transitioning&&<div className="void-season-loading" role="status" aria-live="polite"><span className="void-loading-light"/><p>{seasonMessage}</p><button onClick={()=>cancelSeason.current()}>Stay here</button></div>}
    {seasonError&&!transitioning&&<div className="void-season-error" role="alert"><p>{seasonError}</p><button onClick={()=>setSeasonError('')}>Continue exploring</button></div>}
    {preview&&ready&&<nav className="void-preview-tools" aria-label="Development world preview" inert={transitioning||!!takingCrystal||!!relicHUD?.busy||readerSeason!==null}><button onClick={()=>changeSeason.current(null)}>Blossom world</button>{(Object.keys(SEASONS) as SeasonId[]).map(id=><button key={id} onClick={()=>changeSeason.current(id)}>{SEASONS[id].title}</button>)}{season==='summer'&&<select aria-label="Summer authoring viewpoint" defaultValue="" onChange={event=>{previewSummerView(event.target.value);event.target.value='';}}><option value="" disabled>Inspect Summer…</option><option value="overview">Island overview</option><option value="forest">Forest pools</option><option value="jetty">Jetty & boat</option><option value="beach">Beach chairs</option><option value="equipment">Scuba equipment</option><option value="boat">Boat interior</option><option value="reef">Underwater reef</option><option value="wreck">Shipwreck</option></select>}</nav>}
    <PhotoOverlay activeIndex={photo} photoSrc={manifest?.photos[photo]?.src} photoCaption={manifest?.photos[photo]?.caption} onClose={()=>setPhoto(-1)} onPrev={photo>0?()=>setPhoto(photo-1):undefined} onNext={manifest&&photo<manifest.photos.length-1?()=>setPhoto(photo+1):undefined}/>
    {readerSeason&&<SeasonMangaReader season={readerSeason} onClose={closeBook}/>}
    {season==='summer'&&summerTarget&&seasonWorld.current?.summer&&<SummerUI key={summerTarget} controller={seasonWorld.current.summer} target={summerTarget} onClose={closeSummer} onReadBook={()=>{const opened=seasonWorld.current?.readBook()??false;if(opened){setSummerTarget(null);stickPointer.current=null;setStick({x:0,y:0});}return opened;}}/>}
    {season==='spring'&&springTarget&&seasonWorld.current?.spring&&<SpringTreasureUI key={springTarget} controller={seasonWorld.current.spring} target={springTarget} onClose={closeSpring} onReadBook={()=>{if(!seasonWorld.current?.readBook())return false;setSpringTarget(null);stickPointer.current=null;setStick({x:0,y:0});return true;}}/>}
  </div>;
}
