"use client";
import {useEffect,useId,useRef,type RefObject} from 'react';
import {advanceEntry,beginEntryHold,cancelEntryHold,createEntryClock,type ShrineLink} from './shrine-entry-motion';
import {createShrineInput} from './shrine-entry-input';
import {SHRINE_FILM,filmLayout,shrineVideoPose,filmBlack} from './shrine-video-motion';
import {paperBurnContour,contourPath,paintWashi,createBurnPainter} from './shrine-paper-burn';
import {preloadShrineFilm} from './shrine-film-preload';
import {getAudioEnabled} from './audio-setting';
import {sanctuaryCue} from './shrine-void/sanctuary-audio';
import {smooth} from './journey-data';
import {landscapeBlocked} from './landscape-guard';
import './shrine-entry.css';

/** Living landscape → still washi print → burning reveal of an already-playing film. */
export default function ShrineEntry({link,stage,onCommit,onComplete}:{link:RefObject<ShrineLink>;stage:RefObject<HTMLDivElement|null>;onCommit:()=>void;onComplete:()=>void}){
  const host=useRef<HTMLDivElement>(null),id=useId().replace(/:/g,'');
  useEffect(()=>{
    const shrineLink=link.current,root=host.current!,screen=stage.current!,scene=screen.querySelector<HTMLElement>('.layered-world')!;
    const hit=root.querySelector<HTMLButtonElement>('.shrine-hit')!,retry=root.querySelector<HTMLButtonElement>('.entry-retry')!;
    const effects=root.querySelector<HTMLElement>('.entry-effects')!,glow=root.querySelector<HTMLElement>('.entry-glow')!,dark=root.querySelector<HTMLElement>('.entry-dark')!;
    const windowElement=root.querySelector<HTMLElement>('.entry-film-window')!,plate=root.querySelector<HTMLElement>('.entry-film-plate')!;
    const poster=root.querySelector<HTMLImageElement>('.entry-film-poster')!,video=root.querySelector<HTMLVideoElement>('video')!;
    const paper=root.querySelector<HTMLCanvasElement>('.entry-washi')!,burn=root.querySelector<HTMLCanvasElement>('.entry-burn')!;
    const cut=root.querySelector<SVGPathElement>('.entry-cut')!,burnPainter=createBurnPainter(burn);
    const planes=Array.from(scene.children) as HTMLElement[];
    const clock=createEntryClock(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,disposed=false,completed=false,locked=false,artTime=0,zoom=0,blackTime=0,lastBlack=0,stallTime=0,previousMedia=0;
    let width=innerWidth,height=screen.clientHeight,origin={x:0,y:0,w:0},phaseOrigin:{x:number;y:number;w:number}|null=null;
    let videoReady=false,presented=false,starting=false,requestedPlayback=false,failed=false,frameCallback:number|null=null,attempts=0,retryAt=0,lastVideoFrame=0,recordedOpening=false;
    let filmUrl:string|null=null,preloading=false;
    const inertBefore=new Map<HTMLElement,boolean>();
    const oldOverflow=document.documentElement.style.overflow,oldPadding=document.body.style.paddingRight,oldBackground=document.body.style.backgroundColor;
    root.dataset.phase='idle';poster.style.opacity='1';retry.hidden=true;
    const sync=()=>{
      const anchor=shrineLink.anchor;
      const partial=anchor&&width<height&&anchor.y>85&&anchor.y<height-80&&anchor.x+anchor.width*.5>12&&anchor.x-anchor.width*.5<width-12;
      hit.hidden=!(anchor?.visible||partial)||clock.committed;
      if(!anchor||clock.committed)return;origin={x:anchor.x,y:anchor.y,w:anchor.width};
      const left=Math.max(0,anchor.x-anchor.width*.5-8),right=Math.min(width,anchor.x+anchor.width*.5+8);
      Object.assign(hit.style,{left:left+'px',top:anchor.y-anchor.height*.64-8+'px',width:Math.max(0,right-left)+'px',height:anchor.height+16+'px'});
    };
    const resize=()=>{
      if(!screen.clientWidth||!screen.clientHeight)return;width=innerWidth;height=screen.clientHeight;
      if(phaseOrigin)origin={x:phaseOrigin.x*width,y:phaseOrigin.y*height,w:phaseOrigin.w*width};
      const layout=filmLayout(width,height);
      Object.assign(plate.style,{left:-width+'px',top:-height+'px',right:'auto',bottom:'auto',width:width*3+'px',height:height*3+'px'});
      for(const element of [video,...plate.querySelectorAll<HTMLImageElement>('img')]){
        const tileX=Number(element.dataset.tileX||0),tileY=Number(element.dataset.tileY||0);
        Object.assign(element.style,{left:layout.left+width+tileX*layout.width+'px',top:layout.top+height+tileY*layout.height+'px',width:layout.width+'px',height:layout.height+'px'});
      }
      paintWashi(paper,width,height);burnPainter.resize(width,height);sync();if(clock.phase!=='idle')wake();
    };
    const lock=()=>{if(locked)return;locked=true;const scrollbar=innerWidth-document.documentElement.clientWidth;if(scrollbar)document.body.style.paddingRight=scrollbar+'px';document.documentElement.style.overflow='hidden';};
    const unlock=()=>{if(!locked)return;document.documentElement.style.overflow=oldOverflow;document.body.style.paddingRight=oldPadding;locked=false;};
    const sound=()=>{video.muted=zoom===0||!getAudioEnabled();video.volume=.55*(1-lastBlack);};
    const loaded=()=>{if(disposed)return;videoReady=video.readyState>=2;root.dataset.videoReady=String(videoReady);wake();};
    const videoError=()=>{if(disposed)return;failed=true;starting=false;root.dataset.videoError=String(video.error?.code??'playback');retry.hidden=!clock.committed;wake();};
    const prepareFilm=async()=>{
      if(disposed||preloading||filmUrl)return;
      preloading=true;root.dataset.filmPreload='loading';
      try{
        const film=await preloadShrineFilm();
        if(disposed)return;
        filmUrl=URL.createObjectURL(film);video.src=filmUrl;video.load();
        root.dataset.filmPreload='ready';root.dataset.filmBytes=String(film.size);wake();
      }catch{
        if(disposed)return;
        root.dataset.filmPreload='failed';videoError();
      }finally{preloading=false;}
    };
    const present=(_now:number,metadata:VideoFrameCallbackMetadata)=>{
      frameCallback=null;if(disposed)return;presented=true;lastVideoFrame=performance.now();poster.style.opacity='0';root.dataset.videoPresented='true';
      root.dataset.mediaTime=metadata.mediaTime.toFixed(3);root.dataset.videoFrames=String(metadata.presentedFrames);
      if(!completed)frameCallback=video.requestVideoFrameCallback(present);wake();
    };
    const trackFrames=()=>{if(frameCallback===null&&typeof video.requestVideoFrameCallback==='function')frameCallback=video.requestVideoFrameCallback(present);};
    const playback=()=>{
      if(disposed||failed||starting||!filmUrl||!requestedPlayback||video.ended||!video.paused||performance.now()<retryAt)return;
      starting=true;attempts++;video.muted=true;trackFrames();
      // Start muted inline playback before the burn exposes its first pixels.
      void video.play().then(()=>{
        starting=false;if(disposed||!requestedPlayback){video.pause();return;}
        videoReady=video.readyState>=2;failed=false;retry.hidden=true;attempts=0;root.dataset.videoError='';
        if(typeof video.requestVideoFrameCallback!=='function'&&videoReady){presented=true;poster.style.opacity='0';}
        wake();
      }).catch(()=>{
        starting=false;if(disposed||!requestedPlayback)return;
        retryAt=performance.now()+500;if(attempts>=3)videoError();else wake();
      });
    };
    const commit=()=>{
      shrineLink.commit();phaseOrigin={x:origin.x/width,y:origin.y/height,w:origin.w/width};
      document.body.style.backgroundColor='#000';hit.hidden=true;screen.dataset.shrineState='committed';screen.dataset.shrineArt='true';shrineLink.setFrozen(true);
      for(const child of Array.from(screen.children))if(child!==root){const el=child as HTMLElement;inertBefore.set(el,el.inert);el.inert=true;}
      retry.hidden=!failed;onCommit();sanctuaryCue('film');
    };
    const complete=()=>{if(completed||disposed)return;completed=true;requestedPlayback=false;video.pause();dark.style.opacity='1';shrineLink.finish();root.dataset.phase='complete';screen.dataset.shrineState='complete';scene.style.visibility='hidden';onComplete();};
    const tick=(now:number)=>{
      frame=0;if(disposed||document.hidden||landscapeBlocked())return;
      const dt=last?Math.min(80,Math.max(0,now-last)):0;last=now;
      const committed=clock.committed;if(!committed)advanceEntry(clock,dt);if(!committed&&clock.committed)commit();
      shrineLink.setCharge(clock.charge);effects.style.opacity=clock.phase==='idle'?'0':'1';
      if(!clock.committed){
        root.dataset.phase=clock.phase;glow.style.width=Math.max(90,origin.w*1.8)+'px';glow.style.height=Math.max(100,origin.w*2)+'px';
        glow.style.transform=`translate(${origin.x}px,${origin.y}px) translate(-50%,-50%)`;glow.style.opacity=String(clock.charge*.65);shrineLink.wake();
        if(clock.phase==='idle'){screen.removeAttribute('data-shrine-state');effects.style.opacity='0';unlock();return;}
        playback();
      }else{
        artTime=Math.min(SHRINE_FILM.artMs,artTime+dt);const artwork=smooth(artTime,0,reduced.matches?300:SHRINE_FILM.artMs);
        scene.style.filter=`grayscale(${artwork*.9}) sepia(${artwork*.65}) saturate(${1-artwork*.38}) contrast(${1+artwork*.23})`;
        paper.style.opacity=String(artwork);glow.style.opacity=String(.65*(1-artwork));
        // Preserve the opening shot for the reveal instead of consuming the
        // approach invisibly during the charge and artwork treatment.
        if(artTime>=SHRINE_FILM.artMs){requestedPlayback=true;playback();}
        // The reveal waits for a presented video frame, never a paused poster.
        const freshFrame=typeof video.requestVideoFrameCallback!=='function'||now-lastVideoFrame<450;
        if(artTime>=SHRINE_FILM.artMs&&videoReady&&presented&&freshFrame&&!failed&&!video.paused)zoom=Math.min(SHRINE_FILM.zoomMs,zoom+dt);
        const pose=shrineVideoPose(reduced.matches&&zoom>0?SHRINE_FILM.zoomMs:zoom,origin,width,height);
        const transform=`translate3d(${pose.tx}px,${pose.ty}px,0) scale(${pose.scale})`;
        for(const plane of planes){plane.style.transformOrigin='0 0';plane.style.transform=reduced.matches?'':transform;}
        // Match the first film gate to the painting in both size and position.
        // One live video expands with the approach; the tear stays inside it.
        plate.style.transformOrigin=`${width}px ${height}px`;plate.style.transform=`translate3d(${pose.plateX}px,${pose.plateY}px,0) scale(${pose.plateScale})`;
        const points=paperBurnContour(pose.burnProgress,{x:pose.x,y:pose.y},width,height),path=contourPath(points);
        if(zoom>0&&!recordedOpening){
          recordedOpening=true;root.dataset.openingMediaTime=video.currentTime.toFixed(3);root.dataset.openingPaused=String(video.paused);
          root.dataset.openingGate=[pose.x,pose.y,origin.w*pose.scale].map(n=>n.toFixed(2)).join(',');
          root.dataset.paintedGate=[origin.x,origin.y,origin.w].map(n=>n.toFixed(2)).join(',');
        }
        cut.setAttribute('d',path);windowElement.style.clipPath=pose.p>=.999?'none':`url(#${id}-reveal)`;
        windowElement.style.opacity=zoom>0?'1':'0';burnPainter.paint(points,reduced.matches?1:pose.p,(artTime+zoom)/1000);
        if(pose.p>=.999){scene.style.visibility='hidden';paper.style.opacity='0';}
        root.dataset.phase=failed?'awaiting-playback':artTime<SHRINE_FILM.artMs?'artwork':zoom===0?'buffering':pose.p<1?'burning':'video';
        root.dataset.zoom=pose.p.toFixed(3);root.dataset.cameraTravel=pose.travel.toFixed(3);root.dataset.gateX=pose.x.toFixed(2);root.dataset.gateY=pose.y.toFixed(2);root.dataset.gateWidth=(origin.w*pose.scale).toFixed(2);root.dataset.mediaTime=video.currentTime.toFixed(3);root.dataset.paused=String(video.paused);root.dataset.readyState=String(video.readyState);sound();
        if(videoReady&&!video.paused&&!video.ended){
          stallTime=Math.abs(video.currentTime-previousMedia)<.001?stallTime+dt:0;previousMedia=video.currentTime;
          if(stallTime>8000){video.pause();retryAt=0;stallTime=0;playback();}
        }
        if(!presented&&video.currentTime>.05&&video.readyState>=2&&typeof video.requestVideoFrameCallback!=='function'){presented=true;poster.style.opacity='0';}
        if(zoom>=SHRINE_FILM.zoomMs){
          const black=Math.max(lastBlack,video.ended?1:filmBlack(video.currentTime,video.duration));lastBlack=black;
          dark.style.opacity=String(black);root.dataset.black=black.toFixed(3);if(black>0)root.dataset.phase='fading';
          if(black>=.999&&video.ended){blackTime+=dt;root.dataset.phase='black';if(blackTime>=SHRINE_FILM.blackHoldMs){complete();return;}}
        }
      }
      frame=requestAnimationFrame(tick);
    };
    function wake(){if(!frame&&!document.hidden&&!landscapeBlocked()&&!disposed&&!completed){last=performance.now();frame=requestAnimationFrame(tick);}}
    const start=()=>{
      if(hit.hidden||!shrineLink.anchor||!beginEntryHold(clock))return false;sync();lock();screen.dataset.shrineState='charging';
      requestedPlayback=false;failed=false;retryAt=0;attempts=0;video.currentTime=0;presented=false;poster.style.opacity='1';if(!filmUrl)void prepareFilm();wake();return true;
    };
    const cancel=()=>{if(clock.committed)return;requestedPlayback=false;video.pause();cancelEntryHold(clock);wake();};
    const input=createShrineInput(hit,start,cancel,()=>clock.committed);
    const clicked=()=>{if(!clock.committed)start();};
    const keyDown=(event:KeyboardEvent)=>{if(!['Enter',' '].includes(event.key))return;event.preventDefault();if(!event.repeat)clicked();};
    const retryFilm=()=>{failed=false;attempts=0;retryAt=0;requestedPlayback=true;retry.hidden=true;if(!filmUrl)void prepareFilm();else if(video.error)video.load();playback();wake();};
    const prevent=(event:Event)=>{if(locked)event.preventDefault();};
    const preventKeys=(event:KeyboardEvent)=>{if(locked&&['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))event.preventDefault();};
    const hidden=()=>{if(document.hidden||landscapeBlocked()){input.abort();video.pause();cancelAnimationFrame(frame);frame=0;}else if(clock.phase!=='idle'){retryAt=0;playback();wake();}};
    const blur=()=>{if(!clock.committed)input.abort();};
    const mediaWake=()=>{videoReady=video.readyState>=2;wake();};
    video.addEventListener('loadeddata',loaded);video.addEventListener('canplay',loaded);video.addEventListener('error',videoError);
    for(const name of ['playing','pause','ended','waiting','stalled'])video.addEventListener(name,mediaWake);
    window.addEventListener('journey-audio-change',sound);
    video.muted=true;void prepareFilm();if(video.readyState>=2)loaded();
    hit.addEventListener('pointerdown',input.down);hit.addEventListener('pointerup',input.up);hit.addEventListener('pointercancel',input.up);hit.addEventListener('lostpointercapture',input.lost);
    hit.addEventListener('keydown',keyDown);hit.addEventListener('click',clicked);hit.addEventListener('blur',blur);hit.addEventListener('contextmenu',prevent);retry.addEventListener('click',retryFilm);
    document.addEventListener('wheel',prevent,{passive:false});document.addEventListener('touchmove',prevent,{passive:false});document.addEventListener('keydown',preventKeys);
    document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);window.addEventListener('journey-orientation-change',hidden);
    const observer=new ResizeObserver(resize);observer.observe(screen);shrineLink.setSync(sync);resize();
    return()=>{
      disposed=true;requestedPlayback=false;cancelAnimationFrame(frame);if(frameCallback!==null)video.cancelVideoFrameCallback(frameCallback);video.pause();video.removeAttribute('src');video.load();
      if(filmUrl)URL.revokeObjectURL(filmUrl);
      observer.disconnect();shrineLink.setSync(null);shrineLink.reset();input.dispose();
      video.removeEventListener('loadeddata',loaded);video.removeEventListener('canplay',loaded);video.removeEventListener('error',videoError);
      for(const name of ['playing','pause','ended','waiting','stalled'])video.removeEventListener(name,mediaWake);
      window.removeEventListener('journey-audio-change',sound);window.removeEventListener('journey-orientation-change',hidden);window.removeEventListener('blur',blur);
      hit.removeEventListener('pointerdown',input.down);hit.removeEventListener('pointerup',input.up);hit.removeEventListener('pointercancel',input.up);hit.removeEventListener('lostpointercapture',input.lost);
      hit.removeEventListener('keydown',keyDown);hit.removeEventListener('click',clicked);hit.removeEventListener('blur',blur);hit.removeEventListener('contextmenu',prevent);retry.removeEventListener('click',retryFilm);
      document.removeEventListener('wheel',prevent);document.removeEventListener('touchmove',prevent);document.removeEventListener('keydown',preventKeys);document.removeEventListener('visibilitychange',hidden);
      for(const[el,inert]of inertBefore)el.inert=inert;unlock();document.body.style.backgroundColor=oldBackground;scene.style.filter='';scene.style.visibility='';
      for(const plane of planes){plane.style.transform='';plane.style.transformOrigin='';}screen.removeAttribute('data-shrine-state');screen.removeAttribute('data-shrine-art');shrineLink.wake();
    };
  },[link,stage,onCommit,onComplete,id]);
  return <div className="shrine-entry" ref={host}>
    <button className="shrine-hit" hidden aria-label="Enter the memory shrine" title="Press or hold to enter the shrine"/>
    <svg className="entry-clip-defs" aria-hidden="true"><defs><clipPath id={`${id}-reveal`} clipPathUnits="userSpaceOnUse"><path className="entry-cut"/></clipPath></defs></svg>
    <div className="entry-effects">
      <div className="entry-glow" aria-hidden="true"/><canvas className="entry-washi" aria-hidden="true"/>
      <div className="entry-film-window" aria-hidden="true"><div className="entry-film-plate">
        <video preload="auto" playsInline muted disablePictureInPicture poster="/scene/entry/shrine-entry-clean-first.webp"/>
        <img className="entry-film-poster" src="/scene/entry/shrine-entry-clean-first.webp" alt="" decoding="async"/>
      </div></div>
      <canvas className="entry-burn" aria-hidden="true"/><div className="entry-dark" aria-hidden="true"/>
      <button className="entry-retry" hidden>Play shrine film</button>
    </div>
  </div>;
}
