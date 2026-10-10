"use client";
import {useEffect,useRef,type RefObject} from 'react';
import {advanceEntry,beginEntryHold,cancelEntryHold,createEntryClock,entryPose,entryPlaneScale,type ShrineLink} from './shrine-entry-motion';
import {createShrineInput} from './shrine-entry-input';
import './shrine-entry.css';

/** 2D projection through the registered torii, with a future-world completion hook. */
export default function ShrineEntry({link,stage,onCommit,onComplete}:{link:RefObject<ShrineLink>;stage:RefObject<HTMLDivElement|null>;onCommit:()=>void;onComplete:()=>void}){
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=host.current!,screen=stage.current!,scene=screen.querySelector<HTMLElement>('.layered-world')!;
    const hit=root.querySelector<HTMLButtonElement>('.shrine-hit')!,effects=root.querySelector<HTMLElement>('.entry-effects')!;
    const glow=root.querySelector<HTMLElement>('.entry-glow')!,shade=root.querySelector<HTMLElement>('.entry-shade')!,flash=root.querySelector<HTMLElement>('.entry-flash')!,dark=root.querySelector<HTMLElement>('.entry-dark')!;
    const canvas=root.querySelector<HTMLCanvasElement>('canvas')!,context=canvas.getContext('2d',{alpha:true});
    const aperture=root.querySelector<HTMLElement>('.entry-aperture')!;
    const planes=[['.entry-far-plane',3],['.entry-gate-plane',1.15],['.entry-tree-plane',1.05],['.entry-near-plane',.95],['.entry-canopy-plane',.9]].map(([selector,distance])=>({element:scene.querySelector<HTMLElement>(String(selector))!,distance:Number(distance)}));
    const clock=createEntryClock(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,disposed=false,completed=false,locked=false;
    let width=screen.clientWidth,height=screen.clientHeight,origin={x:0,y:0,w:0},phaseOrigin:{x:number;y:number;w:number}|null=null;
    const inertBefore=new Map<HTMLElement,boolean>();
    const oldOverflow=document.documentElement.style.overflow,oldPadding=document.body.style.paddingRight,oldBackground=document.body.style.backgroundColor;
    const resize=()=>{
      width=screen.clientWidth;height=screen.clientHeight;
      const dpr=Math.min(devicePixelRatio,1.5,1920/width,1200/height);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context?.setTransform(dpr,0,0,dpr,0,0);
      if(phaseOrigin)origin={x:phaseOrigin.x*width,y:phaseOrigin.y*height,w:phaseOrigin.w*width};
      glow.style.width=Math.max(80,origin.w*1.8)+'px';glow.style.height=Math.max(100,origin.w*2.3)+'px';
      aperture.style.width=origin.w*.42+'px';aperture.style.height=origin.w*.63+'px';
      sync();if(clock.phase!=='idle')wake();
    };
    const sync=()=>{
      const anchor=link.current.anchor;
      hit.hidden=!anchor?.visible||clock.committed;
      if(!anchor||clock.committed)return;
      origin={x:anchor.x,y:anchor.y,w:anchor.width};
      glow.style.width=Math.max(80,origin.w*1.8)+'px';glow.style.height=Math.max(100,origin.w*2.3)+'px';
      aperture.style.width=origin.w*.42+'px';aperture.style.height=origin.w*.63+'px';
      hit.style.left=anchor.x-anchor.width*.5-8+'px';hit.style.top=anchor.y-anchor.height*.64-8+'px';
      hit.style.width=anchor.width+16+'px';hit.style.height=anchor.height+16+'px';
    };
    const lock=()=>{
      if(locked)return;locked=true;
      const scrollbar=innerWidth-document.documentElement.clientWidth;
      if(scrollbar)document.body.style.paddingRight=scrollbar+'px';
      document.documentElement.style.overflow='hidden';
    };
    const unlock=()=>{if(!locked)return;document.documentElement.style.overflow=oldOverflow;document.body.style.paddingRight=oldPadding;locked=false;};
    const commit=()=>{
      link.current.commit();phaseOrigin={x:origin.x/width,y:origin.y/height,w:origin.w/width};document.body.style.backgroundColor='#000';
      hit.hidden=true;screen.dataset.shrineState='committed';
      for(const child of Array.from(screen.children))if(child!==root){const el=child as HTMLElement;inertBefore.set(el,el.inert);el.inert=true;}
      onCommit();
    };
    const paint=(ms:number,pose:ReturnType<typeof entryPose>,x:number,y:number)=>{
      if(!context)return;context.clearRect(0,0,width,height);if(reduced.matches||clock.phase==='idle'||clock.phase==='complete')return;
      const ctx=context,time=ms/1000,radius=Math.hypot(width,height),q=clock.charge;
      // Bounded tapered trails provide directional blur without filtering the screen.
      for(let i=0;i<54;i++){
        const angle=i*2.399963,seed=(i*.618034)%1;
        const travel=(seed+time*(clock.committed?1.35:.23))%1;
        const distance=origin.w*.18+radius*travel*travel;
        const tail=(35+distance*.62)*pose.streak;
        const dx=Math.cos(angle),dy=Math.sin(angle);
        const a=pose.streak*(.18+.65*travel)*(1-pose.black);
        const gradient=ctx.createLinearGradient(x+dx*(distance-tail),y+dy*(distance-tail),x+dx*distance,y+dy*distance);
        gradient.addColorStop(0,'transparent');gradient.addColorStop(1,i%3===0?`rgba(255,213,150,${a})`:`rgba(255,163,199,${a})`);
        ctx.strokeStyle=gradient;ctx.lineWidth=i%5===0?4:1.2;ctx.beginPath();ctx.moveTo(x+dx*(distance-tail),y+dy*(distance-tail));ctx.lineTo(x+dx*distance,y+dy*distance);ctx.stroke();
      }
      if(!clock.committed||clock.elapsed<1000){
        for(let i=0;i<3;i++){
          ctx.strokeStyle=`rgba(${i===1?'255,216,162':'255,160,194'},${q*.38*pose.glow})`;ctx.lineWidth=1+i*.3;
          ctx.beginPath();ctx.ellipse(x,y,origin.w*(.5+i*.14),origin.w*(.68+i*.16),-.15,time*(1+i*.12)+i*2,time*(1+i*.12)+i*2+1.9);ctx.stroke();
        }
      }
      // A short projected tunnel; it never constructs or loads the future world.
      if(pose.tunnel>.001){
        const tunnelGradient=ctx.createRadialGradient(width*.5,height*.5,8,width*.5,height*.5,radius*.65);
        tunnelGradient.addColorStop(0,'transparent');tunnelGradient.addColorStop(.18,`rgba(255,175,211,${pose.tunnel*.25})`);tunnelGradient.addColorStop(.45,`rgba(232,119,172,${pose.tunnel*.16})`);tunnelGradient.addColorStop(1,'transparent');
        for(let i=0;i<12;i++){
          ctx.strokeStyle=tunnelGradient;ctx.lineWidth=1.8;ctx.beginPath();
          const points=Array.from({length:9},(_,j)=>{const z=.22+j*.085,angle=i*2.399963+time*.35+z*2.3,r=radius*.7*z*z;return{x:width*.5+Math.cos(angle)*r,y:height*.5+Math.sin(angle)*r*.76};});
          ctx.moveTo(points[0].x,points[0].y);for(let j=1;j<points.length-1;j++)ctx.quadraticCurveTo(points[j].x,points[j].y,(points[j].x+points[j+1].x)/2,(points[j].y+points[j+1].y)/2);ctx.stroke();
        }
        for(let i=0;i<26;i++){
          const z=((i*.618034+time*.62)%1),angle=i*2.399963+time*.45,r=radius*.82*z*z;
          const px=width*.5+Math.cos(angle)*r,py=height*.5+Math.sin(angle)*r*.76;
          const size=2+z*z*18,alpha=pose.tunnel*Math.min(1,z*6)*Math.min(1,(1-z)*5)*.82;
          ctx.save();ctx.translate(px,py);ctx.rotate(angle+time);ctx.fillStyle=`rgba(255,171,200,${alpha})`;
          ctx.shadowColor=`rgba(255,135,187,${alpha*.7})`;ctx.shadowBlur=7;
          ctx.beginPath();ctx.ellipse(0,0,size*.35,size,0,0,Math.PI*2);ctx.fill();ctx.restore();
          ctx.strokeStyle=`rgba(239,115,175,${alpha*.25})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-Math.cos(angle)*size*5,py-Math.sin(angle)*size*4);ctx.stroke();
        }
      }
    };
    const tick=(now:number)=>{
      frame=0;if(disposed||document.hidden)return;
      const dt=last?Math.max(0,now-last):0;last=now;const wasCommitted=clock.committed;
      advanceEntry(clock,dt,reduced.matches);if(!wasCommitted&&clock.committed)commit();
      link.current.setCharge(clock.charge);
      const pose=entryPose(clock,reduced.matches),x=origin.x+(width*.5-origin.x)*pose.travel,y=origin.y+(height*.5-origin.y)*pose.travel;
      if(pose.black<.99)link.current.wake();
      effects.dataset.phase=clock.phase;effects.style.opacity=clock.phase==='idle'?'0':'1';
      effects.dataset.charge=clock.charge>.75?'ready':'building';
      scene.style.transformOrigin=`${origin.x}px ${origin.y}px`;
      scene.style.transform=reduced.matches?'':`translate3d(${x-origin.x}px,${y-origin.y}px,0) scale(${pose.scale*(1+clock.charge*.01)},${pose.scale*(1-clock.charge*.008)})`;
      for(const plane of planes){plane.element.style.transformOrigin=`${origin.x}px ${origin.y}px`;plane.element.style.transform=clock.committed&&!reduced.matches?`scale(${entryPlaneScale(clock.elapsed,plane.distance)})`:'';}
      scene.style.visibility=pose.black>.99?'hidden':'';
      glow.style.opacity=String(pose.glow*(clock.committed?.9:clock.charge*.75));glow.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${1+Math.min(3,(pose.scale-1)*.2)})`;
      shade.style.background=`radial-gradient(ellipse at ${x/width*100}% ${y/height*100}%,transparent 4%,#0f0210 76%)`;shade.style.opacity=String(pose.shade);
      flash.style.opacity=String(pose.flash);dark.style.opacity=String(pose.black);
      const opening=clock.committed&&!reduced.matches?Math.min(1,Math.max(0,(clock.elapsed-170)/670)):0;
      aperture.style.opacity=String(opening*(1-pose.black));aperture.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${1+opening**3*Math.max(width,height)/Math.max(30,origin.w*.18)})`;
      root.style.setProperty('--tunnel-glow',String(pose.tunnel*.9));
      paint(clock.hold+clock.elapsed,pose,x,y);
      if(clock.phase==='complete'&&!completed){completed=true;link.current.finish();screen.dataset.shrineState='complete';scene.style.visibility='hidden';onComplete();return;}
      if(clock.phase==='idle'){screen.removeAttribute('data-shrine-state');scene.style.transform='';scene.style.transformOrigin='';effects.style.opacity='0';unlock();return;}
      frame=requestAnimationFrame(tick);
    };
    function wake(){if(!frame&&!document.hidden&&!disposed){last=performance.now();frame=requestAnimationFrame(tick);}}
    const start=()=>{if(!link.current.anchor?.visible||!beginEntryHold(clock))return false;sync();lock();screen.dataset.shrineState='charging';wake();return true;};
    const cancel=()=>{if(clock.committed)return;cancelEntryHold(clock);wake();};
    const input=createShrineInput(hit,start,cancel,()=>clock.committed);
    const down=input.down,up=input.up,lost=input.lost,keyDown=input.keyDown,keyUp=input.keyUp;
    const prevent=(event:Event)=>{if(locked)event.preventDefault();};
    const preventKeys=(event:KeyboardEvent)=>{if(locked&&['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))event.preventDefault();};
    const hidden=()=>{if(document.hidden){input.abort();cancelAnimationFrame(frame);frame=0;}else if(clock.phase!=='idle')wake();};
    const blur=()=>input.abort();
    hit.addEventListener('pointerdown',down);hit.addEventListener('pointerup',up);hit.addEventListener('pointercancel',up);hit.addEventListener('lostpointercapture',lost);hit.addEventListener('keydown',keyDown);hit.addEventListener('keyup',keyUp);hit.addEventListener('blur',blur);hit.addEventListener('contextmenu',prevent);
    document.addEventListener('wheel',prevent,{passive:false});document.addEventListener('touchmove',prevent,{passive:false});document.addEventListener('keydown',preventKeys);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);
    const observer=new ResizeObserver(resize);observer.observe(screen);link.current.setSync(sync);resize();
    return()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();link.current.setSync(null);link.current.reset();
      input.dispose();
      hit.removeEventListener('pointerdown',down);hit.removeEventListener('pointerup',up);hit.removeEventListener('pointercancel',up);hit.removeEventListener('lostpointercapture',lost);hit.removeEventListener('keydown',keyDown);hit.removeEventListener('keyup',keyUp);hit.removeEventListener('blur',blur);hit.removeEventListener('contextmenu',prevent);
      document.removeEventListener('wheel',prevent);document.removeEventListener('touchmove',prevent);document.removeEventListener('keydown',preventKeys);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);
      for(const[el,inert]of inertBefore)el.inert=inert;for(const plane of planes){plane.element.style.transform='';plane.element.style.transformOrigin='';}unlock();document.body.style.backgroundColor=oldBackground;scene.style.transform='';scene.style.transformOrigin='';scene.style.visibility='';screen.removeAttribute('data-shrine-state');
    };
  },[link,stage,onCommit,onComplete]);
  return <div className="shrine-entry" ref={host}>
    <button className="shrine-hit" hidden aria-label="Hold to enter the shrine" title="Hold to enter the shrine"/>
    <div className="entry-effects" aria-hidden="true"><div className="entry-shade"/><div className="entry-glow"/><div className="entry-aperture"/><div className="entry-dark"/><canvas/><div className="entry-flash"/></div>
  </div>;
}
