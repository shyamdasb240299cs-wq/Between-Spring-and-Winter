"use client";
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {Dialog as DialogPrimitive} from 'radix-ui';
import {ArrowLeft,ArrowRight,BookOpen,Rows3,X,ZoomIn,ZoomOut} from 'lucide-react';
import {bookProgressKey,clampBookPage,savedBookPage,seasonBook} from './season-book-data';
import type {SeasonId} from './seasons';
import './season-reader.css';

/** Chapter-scoped, right-to-left page reading or continuous vertical reading. */
export default function SeasonMangaReader({season,onClose}:{season:SeasonId;onClose:()=>void}){
  const chapter=seasonBook(season),[page,setPage]=useState(()=>savedBookPage(season,chapter.pages.length)),[mode,setMode]=useState<'page'|'scroll'>('page');
  const [cover,setCover]=useState(false),[zoom,setZoom]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  const [aspect,setAspect]=useState(2/3);
  const scroll=useRef<HTMLDivElement>(null),pointer=useRef<{id:number;x:number;y:number}|null>(null),pageRef=useRef(page);
  const record=useCallback((n:number)=>{const index=clampBookPage(n,chapter.pages.length);pageRef.current=index;setPage(index);try{localStorage.setItem(bookProgressKey(season),String(index));}catch{}},[chapter.pages.length,season]);
  const go=useCallback((n:number)=>{record(n);setZoom(false);setFailed(false);setCover(false);if(mode==='scroll')scroll.current?.querySelector(`[data-reading-page="${clampBookPage(n,chapter.pages.length)}"]`)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[chapter.pages.length,record,mode]);
  const next=useCallback(()=>{if(cover){setCover(false);go(0);}else go(pageRef.current+1);},[cover,go]);
  const previous=useCallback(()=>{if(pageRef.current===0){setCover(true);setZoom(false);setMode('page');}else go(pageRef.current-1);},[go]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.target as HTMLElement).closest('input,select,textarea'))return;
    if(zoom)return;if(event.key==='ArrowLeft'){event.preventDefault();next();}if(event.key==='ArrowRight'){event.preventDefault();previous();}if(event.key==='Home'){event.preventDefault();go(0);}if(event.key==='End'){event.preventDefault();go(chapter.pages.length-1);}
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[next,previous,go,zoom,chapter.pages.length]);
  useEffect(()=>{if(mode!=='scroll'||!scroll.current)return;const host=scroll.current;host.querySelector(`[data-reading-page="${pageRef.current}"]`)?.scrollIntoView({block:'start'});
    const visible=new Map<Element,number>();const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)visible.set(e.target,e.intersectionRatio);else visible.delete(e.target);const top=[...visible].sort((a,b)=>b[1]-a[1])[0];if(top)record(Number((top[0]as HTMLElement).dataset.readingPage));},{root:host,threshold:[.1,.3,.5,.7,.9]});
    host.querySelectorAll('[data-reading-page]').forEach(e=>observer.observe(e));return()=>observer.disconnect();
  },[mode,record]);
  useEffect(()=>{setFailed(false);const nextPage=chapter.pages[page+1];if(nextPage){const img=new Image();img.src=nextPage.src;img.decode?.().catch(()=>{});}},[page,season]);
  const current=chapter.pages[page],last=page===chapter.pages.length-1&&!cover;
  return <DialogPrimitive.Root open onOpenChange={open=>{if(!open)onClose();}}><DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="season-reader-backdrop"/>
    <DialogPrimitive.Content className="season-reader-shell" onCloseAutoFocus={event=>{event.preventDefault();document.querySelector<HTMLCanvasElement>('.void-render canvas')?.focus();}} onPointerDownOutside={event=>event.preventDefault()}>
      <DialogPrimitive.Title className="sr-only">Read {chapter.title} · Between Spring and Winter</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">Right-to-left manga reading. Left arrow advances; right arrow goes back. Use Scroll mode for continuous pages. Escape closes the reader and returns to the same place.</DialogPrimitive.Description>
      <header className="season-reader-top"><div><BookOpen size={20}/><span>Between Spring and Winter<small>{chapter.title}</small></span></div><button onClick={onClose} aria-label="Close the book and return to the scene"><X size={21}/></button></header>
      <nav className="season-reader-tools" aria-label="Reading controls"><div role="group" aria-label="Reading layout"><button aria-pressed={mode==='page'} onClick={()=>{setMode('page');setZoom(false);}}>Single page</button><button aria-pressed={mode==='scroll'} onClick={()=>{setMode('scroll');setCover(false);setZoom(false);}}><Rows3 size={15}/>Scroll</button></div><button onClick={()=>{setCover(true);setMode('page');setZoom(false);}}>Season cover</button><button disabled={mode==='scroll'} onClick={()=>setZoom(!zoom)} aria-label={zoom?'Fit the page':'Zoom into the page'}>{zoom?<ZoomOut size={18}/>:<ZoomIn size={18}/>}</button></nav>
      {mode==='page'?<div className={'season-reader-page'+(zoom?' is-zoomed':'')} tabIndex={0} aria-label="Manga page" onPointerDown={e=>{if(zoom||e.button!==0)return;pointer.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerCancel={()=>pointer.current=null} onPointerUp={e=>{const p=pointer.current;pointer.current=null;if(!p||p.id!==e.pointerId||zoom)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){dx>0?next():previous();}}}>
        <figure key={`${cover?'cover':page}-${retry}`} style={{'--page-aspect':aspect} as CSSProperties}><img src={cover?chapter.cover:current.src} alt={cover?chapter.title:`${chapter.title}, page ${current.number}${current.blank?', blank page':''}`} width={1200} height={1800} draggable={false} onLoad={event=>{setFailed(false);setAspect(event.currentTarget.naturalWidth/event.currentTarget.naturalHeight);}} onError={()=>setFailed(true)}/>{!cover&&current.blank&&<figcaption>Page {current.number} · Blank page</figcaption>}</figure>
        {failed&&<div className="season-reader-failure" role="alert"><p>This page could not load.</p><button onClick={()=>{setFailed(false);setRetry(retry+1);}}>Try again</button></div>}
      </div>:<div ref={scroll} className="season-reader-scroll" tabIndex={0} aria-label="Continuous manga pages">{chapter.pages.map((p,i)=><figure key={p.number} data-reading-page={i}>{Math.abs(i-page)<=2?<img src={p.src} alt={`${chapter.title}, page ${p.number}${p.blank?', blank page':''}`} width={1200} height={1800} loading={Math.abs(i-page)<=1?'eager':'lazy'}/>:<div className="season-reader-page-space" aria-label={`Page ${p.number}`}/>}<figcaption>Page {p.number}{p.blank?' · Blank page':''}</figcaption></figure>)}</div>}
      <footer className="season-reader-bottom"><div><button onClick={next} disabled={last} aria-label="Next manga page"><ArrowLeft size={18}/><span>Next</span></button><label>{cover?'Season cover':`Page ${current.number} of ${chapter.pages.length}`}<select aria-label="Go to manga page" value={page} onChange={e=>go(Number(e.target.value))}>{chapter.pages.map((p,i)=><option key={p.number} value={i}>Page {p.number}</option>)}</select></label><button onClick={previous} disabled={cover} aria-label="Previous manga page"><span>Previous</span><ArrowRight size={18}/></button></div><p>{last?<button onClick={onClose}>End of {chapter.title} · Close the book</button>:zoom?'Scroll to inspect the enlarged page':mode==='page'?'← Next · Previous → · Swipe right to advance · Progress saved':'Scroll to read · Progress saved'}</p></footer>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal></DialogPrimitive.Root>;
}
