"use client";
import {useEffect,useRef,type RefObject} from 'react';
import {advanceEntry,beginEntryHold,cancelEntryHold,createEntryClock,type ShrineLink} from './shrine-entry-motion';
import {createShrineInput} from './shrine-entry-input';
import {SHRINE_FILM,filmLayout,shrineVideoPose,filmBlack} from './shrine-video-motion';
import {getAudioEnabled} from './audio-setting';
import {sanctuaryCue} from './shrine-void/sanctuary-audio';
import {smooth} from './journey-data';
import {landscapeBlocked} from './landscape-guard';
import './shrine-entry.css';

/** Registered 2D approach → exact decoded opening frame → supplied film → black. */
export default function ShrineEntry({link,stage,onCommit,onComplete}:{link:RefObject<ShrineLink>;stage:RefObject<HTMLDivElement|null>;onCommit:()=>void;onComplete:()=>void}){
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const shrineLink=link.current;
    const root=host.current!,screen=stage.current!,scene=screen.querySelector<HTMLElement>('.layered-world')!;
    const hit=root.querySelector<HTMLButtonElement>('.shrine-hit')!,effects=root.querySelector<HTMLElement>('.entry-effects')!;
    const glow=root.querySelector<HTMLElement>('.entry-glow')!,wash=root.querySelector<HTMLElement>('.entry-colour-wash')!,dark=root.querySelector<HTMLElement>('.entry-dark')!;
    const plate=root.querySelector<HTMLElement>('.entry-film-plate')!,poster=root.querySelector<HTMLImageElement>('.entry-film-poster')!,video=root.querySelector<HTMLVideoElement>('video')!;
    const canvas=root.querySelector<HTMLCanvasElement>('.entry-trails')!,context=canvas.getContext('2d',{alpha:true});
    for(const key of ['videoPresented','handoffTime','mediaTime','videoFrames','droppedFrames','videoError'])delete root.dataset[key];
    poster.style.opacity='1';root.dataset.phase='idle';
    const clock=createEntryClock(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,disposed=false,completed=false,locked=false,zoom=0,blackTime=0,fallbackTime=0,waiting=0,previousMedia=0,lastBlack=0;
    let width=innerWidth,height=screen.clientHeight,origin={x:0,y:0,w:0},phaseOrigin:{x:number;y:number;w:number}|null=null;
    let posterReady=false,videoReady=false,failed=false,playing=false,ended=false,decoded=false,starting=false,frameCallback:number|null=null;
    const inertBefore=new Map<HTMLElement,boolean>();
    const oldOverflow=document.documentElement.style.overflow,oldPadding=document.body.style.paddingRight,oldBackground=document.body.style.backgroundColor;
    const sync=()=>{
      const anchor=shrineLink.anchor;
      const partial=anchor&&width<height&&anchor.y>85&&anchor.y<height-80&&anchor.x+anchor.width*.5>12&&anchor.x-anchor.width*.5<width-12;
      hit.hidden=!(anchor?.visible||partial)||clock.committed;
      if(!anchor||clock.committed)return;origin={x:anchor.x,y:anchor.y,w:anchor.width};
      const left=Math.max(0,anchor.x-anchor.width*.5-8),right=Math.min(width,anchor.x+anchor.width*.5+8);
      hit.style.left=left+'px';hit.style.top=anchor.y-anchor.height*.64-8+'px';hit.style.width=Math.max(0,right-left)+'px';hit.style.height=anchor.height+16+'px';
    };
    const resize=()=>{
      if(!screen.clientWidth||!screen.clientHeight)return;
      width=innerWidth;height=screen.clientHeight;
      const dpr=Math.min(devicePixelRatio,1.5,1920/width,1200/height);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context?.setTransform(dpr,0,0,dpr,0,0);
      if(phaseOrigin)origin={x:phaseOrigin.x*width,y:phaseOrigin.y*height,w:phaseOrigin.w*width};
      const layout=filmLayout(width,height);
      for(const element of [poster,video]){element.style.left=layout.left+'px';element.style.top=layout.top+'px';element.style.width=layout.width+'px';element.style.height=layout.height+'px';}
      sync();if(clock.phase!=='idle')wake();
    };
    const lock=()=>{if(locked)return;locked=true;const scrollbar=innerWidth-document.documentElement.clientWidth;if(scrollbar)document.body.style.paddingRight=scrollbar+'px';document.documentElement.style.overflow='hidden';};
    const unlock=()=>{if(!locked)return;document.documentElement.style.overflow=oldOverflow;document.body.style.paddingRight=oldPadding;locked=false;};
    const sound=()=>{video.muted=!getAudioEnabled();video.volume=.55;};
    const loaded=()=>{if(disposed)return;videoReady=true;root.dataset.videoReady='true';wake();};
    const videoError=()=>{if(disposed)return;failed=true;root.dataset.videoError='true';wake();};
    const videoEnd=()=>{ended=true;wake();};
    const present=(_now?:number,metadata?:VideoFrameCallbackMetadata)=>{if(disposed)return;decoded=true;poster.style.opacity='0';root.dataset.videoPresented='true';root.dataset.handoffTime=String(metadata?.mediaTime??0);wake();};
    const playback=()=>{
      if(starting||playing||failed||!videoReady)return;starting=true;sound();sanctuaryCue('film');
      if(typeof video.requestVideoFrameCallback==='function')frameCallback=video.requestVideoFrameCallback(present);
      void video.play().catch(()=>{video.muted=true;return video.play();}).then(()=>{if(disposed){video.pause();return;}playing=true;starting=false;if(typeof video.requestVideoFrameCallback!=='function')present();wake();}).catch(()=>{starting=false;videoError();});
    };
    const commit=()=>{
      shrineLink.commit();phaseOrigin={x:origin.x/width,y:origin.y/height,w:origin.w/width};document.body.style.backgroundColor='#000';hit.hidden=true;screen.dataset.shrineState='committed';
      for(const child of Array.from(screen.children))if(child!==root){const el=child as HTMLElement;inertBefore.set(el,el.inert);el.inert=true;}onCommit();
    };
    const paint=(time:number,x:number,y:number,amount:number)=>{
      if(!context)return;context.clearRect(0,0,width,height);if(reduced.matches||amount<.001)return;
      const ctx=context,radius=Math.hypot(width,height);
      for(let i=0;i<100;i++){
        const life=(i*.618034+time*(clock.committed?.72:.22))%1,a=i*2.399963+life*.8;
        const r=radius*.78*(1-life)**1.5,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.66;
        const alpha=amount*Math.min(1,life*7)*Math.min(1,(1-life)*8),size=(2+i%4)*(1-life*.65);
        ctx.save();ctx.translate(px,py);ctx.rotate(a+time*(.4+i%3*.1));ctx.fillStyle=`rgba(255,${174+i%25},${200+i%25},${alpha})`;
        ctx.beginPath();ctx.moveTo(0,-size*1.8);ctx.bezierCurveTo(size*1.4,-size*.7,size*1.2,size,0,size*1.6);ctx.bezierCurveTo(-size*1.3,size,-size*1.1,-size*.9,0,-size*1.8);ctx.fill();ctx.restore();
      }
    };
    const complete=()=>{if(completed||disposed)return;completed=true;video.pause();dark.style.opacity='1';context?.clearRect(0,0,width,height);shrineLink.finish();root.dataset.phase='complete';screen.dataset.shrineState='complete';scene.style.visibility='hidden';onComplete();};
    const tick=(now:number)=>{
      frame=0;if(disposed||document.hidden||landscapeBlocked())return;const dt=last?Math.max(0,now-last):0;last=now;
      const committed=clock.committed;if(!committed)advanceEntry(clock,dt);if(!committed&&clock.committed)commit();
      shrineLink.setCharge(clock.charge);effects.style.opacity=clock.phase==='idle'?'0':'1';
      if(!clock.committed){
        root.dataset.phase=clock.phase;glow.style.width=Math.max(90,origin.w*1.8)+'px';glow.style.height=Math.max(100,origin.w*2)+'px';glow.style.transform=`translate(${origin.x}px,${origin.y}px) translate(-50%,-50%)`;glow.style.opacity=String(clock.charge*.8);wash.style.opacity=String(clock.charge*.12);
        scene.style.transform='';paint(clock.hold/1000,origin.x,origin.y,clock.charge*.62);shrineLink.wake();
        if(clock.phase==='idle'){screen.removeAttribute('data-shrine-state');effects.style.opacity='0';unlock();return;}
      }else{
        if(!reduced.matches&&!failed&&!ended){
          if(!videoReady||((playing||starting)&&Math.abs(video.currentTime-previousMedia)<.001))waiting+=dt;else waiting=0;
          previousMedia=video.currentTime;
          if(waiting>12000){video.pause();videoError();}
        }
        if(posterReady&&(videoReady||failed||reduced.matches))zoom=Math.min(SHRINE_FILM.zoomMs,zoom+dt);
        const pose=shrineVideoPose(reduced.matches?SHRINE_FILM.zoomMs:zoom,origin,width,height);
        scene.style.transformOrigin='0 0';scene.style.transform=reduced.matches?'':`translate3d(${pose.tx}px,${pose.ty}px,0) scale(${pose.scale})`;
        plate.style.transformOrigin='0 0';plate.style.transform=`translate3d(${pose.plateX}px,${pose.plateY}px,0) scale(${pose.plateScale})`;
        plate.style.opacity=String(reduced.matches?smooth(zoom,0,350):pose.plateOpacity);
        const feather=(1-pose.p)*18;
        plate.style.maskImage=pose.p>=.98?'none':`radial-gradient(circle ${pose.maskRadius}px at ${pose.target.x}px ${pose.target.y}px,#000 45%,transparent 100%),linear-gradient(to right,transparent,#000 ${feather}%,#000 ${100-feather}%,transparent),linear-gradient(to bottom,transparent,#000 ${feather}%,#000 ${100-feather}%,transparent)`;
        plate.style.maskComposite='intersect';
        glow.style.transform=`translate(${pose.x}px,${pose.y}px) translate(-50%,-50%) scale(${pose.scale})`;glow.style.opacity=String(.7*(1-pose.plateOpacity));wash.style.opacity=String(.25*(1-pose.plateOpacity));
        const atFilm=zoom>=SHRINE_FILM.zoomMs;
        root.dataset.phase=atFilm?'video':'zoom';root.dataset.zoom=pose.p.toFixed(3);
        paint((clock.hold+zoom)/1000,pose.x,pose.y,(.65+.2*pose.travel)*(1-pose.plateOpacity));
        if(atFilm){scene.style.visibility='hidden';if(!reduced.matches)playback();}
        root.dataset.mediaTime=video.currentTime.toFixed(3);
        if(playing&&typeof video.getVideoPlaybackQuality==='function'){const quality=video.getVideoPlaybackQuality();root.dataset.videoFrames=String(quality.totalVideoFrames);root.dataset.droppedFrames=String(quality.droppedVideoFrames);}
        let black=playing?filmBlack(video.currentTime,video.duration):0;
        if(ended)black=1;
        if((failed||reduced.matches)&&atFilm){fallbackTime+=dt;black=smooth(fallbackTime,0,reduced.matches?650:1000);}
        black=Math.max(lastBlack,black);lastBlack=black;
        if(black>0)root.dataset.phase='fading';dark.style.opacity=String(black);root.dataset.black=black.toFixed(3);video.volume=.55*(1-black);
        if(black>=.999&&(ended||failed||reduced.matches)){blackTime+=dt;root.dataset.phase='black';if(blackTime>=SHRINE_FILM.blackHoldMs){complete();return;}}
        if(!decoded&&starting)root.dataset.phase='handoff';
      }
      frame=requestAnimationFrame(tick);
    };
    function wake(){if(!frame&&!document.hidden&&!landscapeBlocked()&&!disposed&&!completed){last=performance.now();frame=requestAnimationFrame(tick);}}
    const start=()=>{if(hit.hidden||!shrineLink.anchor||!beginEntryHold(clock))return false;sync();lock();screen.dataset.shrineState='charging';wake();return true;};
    const cancel=()=>{if(clock.committed)return;cancelEntryHold(clock);wake();};
    const input=createShrineInput(hit,start,cancel,()=>clock.committed);
    const prevent=(event:Event)=>{if(locked)event.preventDefault();};
    const preventKeys=(event:KeyboardEvent)=>{if(locked&&['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))event.preventDefault();};
    const hidden=()=>{if(document.hidden||landscapeBlocked()){input.abort();video.pause();cancelAnimationFrame(frame);frame=0;}else if(clock.phase!=='idle'){if(playing&&!ended)void video.play().catch(()=>{});wake();}};
    const blur=()=>input.abort();
    video.addEventListener('loadeddata',loaded);video.addEventListener('error',videoError);video.addEventListener('ended',videoEnd);window.addEventListener('journey-audio-change',sound);
    if(!video.getAttribute('src'))video.src='/scene/entry/shrine-entry.mp4';if(video.readyState>=2)loaded();sound();
    void poster.decode().then(()=>{if(!disposed){posterReady=true;wake();}}).catch(()=>{posterReady=true;failed=true;wake();});
    hit.addEventListener('pointerdown',input.down);hit.addEventListener('pointerup',input.up);hit.addEventListener('pointercancel',input.up);hit.addEventListener('lostpointercapture',input.lost);hit.addEventListener('keydown',input.keyDown);hit.addEventListener('keyup',input.keyUp);hit.addEventListener('blur',blur);hit.addEventListener('contextmenu',prevent);
    document.addEventListener('wheel',prevent,{passive:false});document.addEventListener('touchmove',prevent,{passive:false});document.addEventListener('keydown',preventKeys);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);
    const observer=new ResizeObserver(resize);observer.observe(screen);shrineLink.setSync(sync);resize();
    window.addEventListener('journey-orientation-change',hidden);
    return()=>{
      disposed=true;cancelAnimationFrame(frame);if(frameCallback!==null)video.cancelVideoFrameCallback(frameCallback);video.pause();video.removeAttribute('src');video.load();observer.disconnect();shrineLink.setSync(null);shrineLink.reset();input.dispose();
      window.removeEventListener('journey-orientation-change',hidden);
      video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',videoError);video.removeEventListener('ended',videoEnd);window.removeEventListener('journey-audio-change',sound);
      hit.removeEventListener('pointerdown',input.down);hit.removeEventListener('pointerup',input.up);hit.removeEventListener('pointercancel',input.up);hit.removeEventListener('lostpointercapture',input.lost);hit.removeEventListener('keydown',input.keyDown);hit.removeEventListener('keyup',input.keyUp);hit.removeEventListener('blur',blur);hit.removeEventListener('contextmenu',prevent);
      document.removeEventListener('wheel',prevent);document.removeEventListener('touchmove',prevent);document.removeEventListener('keydown',preventKeys);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);
      for(const[el,inert]of inertBefore)el.inert=inert;unlock();document.body.style.backgroundColor=oldBackground;scene.style.transform='';scene.style.transformOrigin='';scene.style.visibility='';screen.removeAttribute('data-shrine-state');
    };
  },[link,stage,onCommit,onComplete]);
  return <div className="shrine-entry" ref={host}>
    <button className="shrine-hit" hidden aria-label="Hold to enter the shrine" title="Hold to enter the shrine"/>
    <div className="entry-effects" aria-hidden="true"><div className="entry-colour-wash"/><div className="entry-glow"/><div className="entry-film-plate"><video src="/scene/entry/shrine-entry.mp4" preload="auto" playsInline muted disablePictureInPicture poster="/scene/entry/shrine-entry-first.webp"/><img className="entry-film-poster" src="/scene/entry/shrine-entry-first.webp" alt="" decoding="async"/></div><canvas className="entry-trails"/><div className="entry-dark"/></div>
  </div>;
}
