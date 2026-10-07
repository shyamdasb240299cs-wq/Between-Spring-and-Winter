"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Maximize, Minimize, X, ZoomIn, ZoomOut, Rows3 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { readingPages, progressKey } from "./reader-data";
import type { PageFlip } from "page-flip/dist/js/page-flip.module.js";

type Props={initialIndex:number;onClose:()=>void;embedded?:boolean;onExpand?:(index:number)=>void};
export default function MangaReader({initialIndex,onClose,embedded=false,onExpand}:Props){
  const [current,setCurrent]=useState(initialIndex),[mode,setMode]=useState(embedded?"spread":"page"),[zoom,setZoom]=useState(1),[full,setFull]=useState(false),[ready,setReady]=useState(false);
  const [host,setHost]=useState<HTMLDivElement|null>(null),[scrollHost,setScrollHost]=useState<HTMLDivElement|null>(null),[dimensions,setDimensions]=useState({width:0,height:0});
  const currentRef=useRef(initialIndex),dialog=useRef<HTMLDivElement>(null),flip=useRef<PageFlip|null>(null),total=readingPages.length;
  const record=useCallback((n:number)=>{n=Math.max(0,Math.min(total-1,n));currentRef.current=n;setCurrent(n);try{localStorage.setItem(progressKey,String(mode==="spread"&&readingPages[n].kind==="blank"?Math.min(total-1,n+1):n));}catch{}},[total,mode]);
  useEffect(()=>{if(!host)return;const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;setDimensions(old=>Math.abs(old.width-r.width)<2&&Math.abs(old.height-r.height)<2?old:{width:r.width,height:r.height});});observer.observe(host);return()=>observer.disconnect();},[host]);
  useEffect(()=>{
    if(mode==="scroll"||!host||!dimensions.width||!dimensions.height)return;
    let dead=false,instance:PageFlip|null=null;
    import("page-flip/dist/js/page-flip.module.js").then(({PageFlip})=>{
      if(dead)return;
      setReady(false);
      const root=document.createElement("div");root.className="physical-reader";host.appendChild(root);
      const spread=mode==="spread"&&dimensions.width>=700;
      const width=Math.floor(Math.min((dimensions.height-24)*2/3,(dimensions.width-32)/(spread?2:1)));
      root.style.width=(spread?width*2:width)+"px";root.style.height=width*1.5+"px";root.style.flexShrink="0";
      const nodes=readingPages.map(p=>{const leaf=document.createElement("div");leaf.className="reader-leaf";leaf.setAttribute("data-density",p.kind==="cover"||p.label.startsWith("Inside")?"hard":"soft");const img=document.createElement("img");img.src=p.src;img.alt=p.label;img.draggable=false;img.decoding="async";leaf.appendChild(img);root.appendChild(leaf);return leaf;});
      instance=new PageFlip(root,{width,height:Math.floor(width*1.5),size:"fixed",showCover:true,usePortrait:true,autoSize:false,drawShadow:true,maxShadowOpacity:.45,flippingTime:matchMedia("(prefers-reduced-motion: reduce)").matches?1:800,mobileScrollSupport:false,useMouseEvents:true,startPage:currentRef.current});
      instance.on("flip",event=>{if(!dead&&typeof event.data==="number")record(event.data);});instance.on("init",()=>{if(!dead)setReady(true);});instance.loadFromHTML(nodes);flip.current=instance;
    }).catch(()=>{if(!dead)setMode("scroll");});
    return()=>{dead=true;instance?.destroy();flip.current=null;host.replaceChildren();};
  },[host,mode,dimensions,record]);
  useEffect(()=>{
    if(mode!=="scroll"||!scrollHost)return;
    scrollHost.querySelector('[data-page="'+currentRef.current+'"]')?.scrollIntoView({block:"start"});
    const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);if(visible[0])record(Number((visible[0].target as HTMLElement).dataset.page));},{root:scrollHost,threshold:[.2,.5,.8]});scrollHost.querySelectorAll("[data-page]").forEach(p=>observer.observe(p));return()=>observer.disconnect();
  },[mode,scrollHost,record]);
  const go=useCallback((index:number)=>{index=Math.max(0,Math.min(total-1,index));record(index);setZoom(1);if(mode!=="scroll")flip.current?.turnToPage(index);else scrollHost?.querySelector('[data-page="'+index+'"]')?.scrollIntoView({behavior:"smooth",block:"start"});},[mode,record,scrollHost,total]);
  const next=useCallback((forward:boolean)=>{if(mode==="scroll")go(currentRef.current+(forward?1:-1));else forward?flip.current?.flipNext():flip.current?.flipPrev();},[go,mode]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest("input,[role=slider],[role=tab]"))return;if(zoom>1)return;if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();next(e.key==="ArrowRight");}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[next,zoom]);
  useEffect(()=>{const changed=()=>setFull(Boolean(document.fullscreenElement));document.addEventListener("fullscreenchange",changed);return()=>document.removeEventListener("fullscreenchange",changed);},[]);
  useEffect(()=>{if(host){const remaining=Math.max(0,total-2-current);host.style.setProperty("--paper-edge",((current===0||current===total-1)?.4:Math.min(2.2,.35+remaining*.07))+"px");}},[current,host,total]);
  const close=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});onClose();};
  const fullscreen=async()=>{if(embedded){onExpand?.(currentRef.current);return;}try{if(document.fullscreenElement)await document.exitFullscreen();else await dialog.current?.requestFullscreen();}catch{}};
  const physical=readingPages[current];
  const page=mode==="spread"&&physical.kind==="blank"&&current<total-1?readingPages[current+1]:physical,finished=current===total-1;
  const content=<>
    <header className="reader-top"><div className="reader-brand"><BookOpen size={19}/><div>Between Spring and Winter<small>Part One · Spring</small></div></div><button className="icon-button" onClick={close} aria-label={embedded?"Return to the cover":"Close reader"}><X size={22}/></button></header>
    <div className="reader-tools"><Tabs value={mode} onValueChange={v=>{setZoom(1);setMode(v);}}><TabsList aria-label="Reading layout"><TabsTrigger value="page">Single page</TabsTrigger><TabsTrigger className="spread-tab" value="spread">Book spread</TabsTrigger><TabsTrigger value="scroll"><Rows3 size={16}/>Scroll</TabsTrigger></TabsList></Tabs><div className="reader-tool-icons"><button className="icon-button" onClick={()=>setZoom(zoom===1?1.75:1)} aria-label={zoom===1?"Enlarge current page":"Fit page"}>{zoom===1?<ZoomIn size={21}/>:<ZoomOut size={21}/>}</button><button className="icon-button" onClick={fullscreen} aria-label={full?"Exit fullscreen":"Enter fullscreen"}>{full?<Minimize size={20}/>:<Maximize size={20}/>}</button></div></div>
    <div className={"reader-workspace mode-"+mode} tabIndex={0}>
      {mode!=="scroll"?<><div className="flip-host" ref={setHost}/>{!ready&&<div className="reader-loading">Opening Part One…</div>}</>:<div className="scroll-pages" ref={setScrollHost}>{readingPages.map((p,i)=><figure key={i} data-page={i}><img src={p.src} alt={p.label} width={1200} height={1800} loading={Math.abs(i-current)<2?"eager":"lazy"}/><figcaption>{p.label}</figcaption></figure>)}</div>}
      {zoom>1&&<div className="zoom-pane"><div className="zoom-controls"><span>{page.label} · {Math.round(zoom*100)}%</span><button onClick={()=>setZoom(Math.max(1.25,zoom-.25))} className="icon-button" aria-label="Zoom out"><ZoomOut size={18}/></button><button onClick={()=>setZoom(Math.min(3,zoom+.25))} className="icon-button" aria-label="Zoom in"><ZoomIn size={18}/></button><button onClick={()=>setZoom(1)} className="icon-button" aria-label="Close zoom"><X size={20}/></button></div><div className="zoom-scroll"><img src={page.src} alt={page.label+" enlarged"} style={{width:Math.round(zoom*600),maxWidth:"none"}}/></div></div>}
    </div>
    <div className="reader-bottom"><div className="reader-navigation"><button onClick={()=>next(false)} disabled={current<=0} className="page-nav" aria-label="Previous pages"><ChevronLeft size={20}/><span>Previous</span></button><span className="page-indicator" aria-live="polite">{page.label}<small>{current+1} / {total}</small></span>{finished?<button onClick={close} className="finish-button">Close the book</button>:<button onClick={()=>next(true)} className="page-nav" aria-label="Next pages"><span>Next</span><ChevronRight size={20}/></button>}</div><Slider aria-label="Reading position" min={0} max={total-1} step={1} value={[current]} onValueChange={v=>go(v[0])}/><p className="reader-hint">{finished?"End of Part One · Thank you for reading":"Turn a page, use the controls or press ← → · Progress saved"}</p></div>
  </>;
  if(embedded)return <div ref={dialog} className="reader-shell reader-embedded" role="region" aria-label="Read Part One">{content}</div>;
  return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent ref={dialog} className="reader-shell reader-dialog" showCloseButton={false}><DialogTitle className="sr-only">Read Part One · Between Spring and Winter</DialogTitle><DialogDescription className="sr-only">Use arrow keys or page controls. Choose single page, book spread, or continuous scroll.</DialogDescription>{content}</DialogContent></Dialog>;
}
