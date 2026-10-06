"use client";
import { useEffect, useRef, type RefObject } from "react";
import type { PageFlip } from "page-flip/dist/js/page-flip.module.js";
import { CLOSE_START, PAGE_STEP, READ_START, TURN_START, clamp, journeyPages, smooth } from "./journey-data";

export default function ScrollPages({position}:{position:RefObject<number>}){
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const parent=host.current!;let book:PageFlip|null=null,dead=false,frame=0,base=-1,folding=false,lastTurn=-1;
    const clearFold=()=>{if(!book)return;const render=book.getRender();render.setBottomPage(null);render.setFlippingPage(null);render.clearShadow();};
    const build=async()=>{
      const {PageFlip}=await import("page-flip/dist/js/page-flip.module.js");if(dead)return;
      book?.destroy();parent.replaceChildren();
      const height=Math.floor(Math.min(parent.clientHeight-12,(parent.clientWidth-24)*1.5)),width=Math.floor(height*2/3);
      const root=document.createElement("div");root.className="scroll-book-pages";root.style.width=width+"px";root.style.height=height+"px";parent.appendChild(root);
      const nodes=journeyPages.map((p,i)=>{const leaf=document.createElement("div");leaf.className="scroll-book-leaf";leaf.setAttribute("data-density","soft");const img=document.createElement("img");img.src=p.src;img.alt=p.label;img.draggable=false;img.decoding="async";img.loading=i<3?"eager":"lazy";leaf.appendChild(img);root.appendChild(leaf);return leaf;});
      // Preserve full-resolution artwork. The page fold follows the scroll position.
      book=new PageFlip(root,{width,height,size:"fixed",showCover:false,usePortrait:true,autoSize:false,useMouseEvents:false,mobileScrollSupport:true,drawShadow:true,maxShadowOpacity:.24,flippingTime:500,startPage:0});
      book.loadFromHTML(nodes);base=-1;folding=false;lastTurn=-1;
    };
    void build();let resizeTimer:ReturnType<typeof setTimeout>;
    const observer=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>void build(),120);});observer.observe(parent);
    const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick=()=>{
      if(dead)return;
      if(book){
        const raw=clamp((position.current-READ_START)/PAGE_STEP,0,journeyPages.length-.0001),n=Math.floor(raw),turn=reduce?0:smooth(raw-n,TURN_START,1);
        if(n!==base){clearFold();book.turnToPage(n);base=n;folding=false;lastTurn=-1;const images=parent.querySelectorAll<HTMLImageElement>(".scroll-book-leaf img");for(let i=Math.max(0,n-1);i<Math.min(images.length,n+4);i++)images[i].loading="eager";}
        if(n<journeyPages.length-1&&turn>.0001){
          const render=book.getRender(),r=render.getRect(),spine=r.left+r.pageWidth;
          const flip=book.getFlipController();
          if(!folding){flip.start({x:spine+r.pageWidth-1,y:r.top+r.height-1});folding=true;}
          if(Math.abs(lastTurn-turn)>.0002){flip.fold({x:spine+r.pageWidth*(1-2*turn),y:r.top+r.height-Math.sin(turn*Math.PI)*r.height*.22-1});lastTurn=turn;}
        }else if(folding){clearFold();book.turnToPage(n);folding=false;lastTurn=-1;}
        parent.style.setProperty("--paper-edge",`${.35+(journeyPages.length-1-n)*.045}px`);
        parent.dataset.page=String(n);parent.dataset.turn=turn.toFixed(3);
        parent.style.visibility=position.current<READ_START-.3||position.current>CLOSE_START+.4?"hidden":"visible";
      }
      frame=requestAnimationFrame(tick);
    };tick();
    return()=>{dead=true;cancelAnimationFrame(frame);clearTimeout(resizeTimer);observer.disconnect();book?.destroy();parent.replaceChildren();};
  },[position]);
  return <div ref={host} className="scroll-pages-host" aria-label="Manga pages controlled by scrolling"><noscript>Please enable JavaScript to read the scroll edition.</noscript></div>;
}
