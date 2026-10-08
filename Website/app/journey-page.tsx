"use client";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Maximize, Minimize, ZoomIn, X, ChevronUp } from "lucide-react";
const PremiumBook = lazy(() => import("./journey-book"));
const Soundscape = lazy(() => import("./soundscape"));
import type { WindClock } from "./wind-motion";
import Scenery from "./scenery";
import AccessGate, { accessSessionKey } from "./access-gate";
import { CLOSE_START, JOURNEY_LENGTH, PAGE_STEP, READ_START, SCROLL_SCALE, clamp, journeySpreads, journeyProgressKey, smooth, focusedSide, type PrintedPage } from "./journey-data";

export default function Home(){
  const journey=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null),position=useRef(0);
  const [bookReady,setBookReady]=useState(false);
  const [paused,setPaused]=useState(false),[reading,setReading]=useState(false),[index,setIndex]=useState(0),[focus,setFocus]=useState<"left"|"right">("right"),[zoom,setZoom]=useState<PrintedPage|null>(null),[full,setFull]=useState(false),[saved,setSaved]=useState(0);
  const [accessGranted,setAccessGranted]=useState(false);
  const [portrait,setPortrait]=useState(false);
  const soundWind=useRef<WindClock|null>(null);
  const setSoundWind=useCallback((clock:WindClock|null)=>{soundWind.current=clock;},[]);
  useEffect(()=>{const query=matchMedia("(max-width: 1024px) and (orientation: portrait)");const update=()=>setPortrait(query.matches);const frame=requestAnimationFrame(update);query.addEventListener("change",update);return()=>{cancelAnimationFrame(frame);query.removeEventListener("change",update);};},[]);
  useEffect(()=>{const frame=requestAnimationFrame(()=>{try{setAccessGranted(sessionStorage.getItem(accessSessionKey)==="granted");}catch{}});return()=>cancelAnimationFrame(frame);},[]);
  const jump=useCallback((unit:number)=>{if(!journey.current)return;window.scrollTo({top:journey.current.offsetTop+unit*innerHeight*SCROLL_SCALE,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});},[]);
  useEffect(()=>{
    const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileQuery=matchMedia("(max-width: 1024px) and (orientation: portrait)");
    let restored=0;try{restored=clamp(Number(localStorage.getItem(journeyProgressKey))||0,0,journeySpreads.length-1);}catch{}
    const motionFrame=requestAnimationFrame(()=>{setPaused(reduce);setSaved(restored);});
    let frame=0,last=performance.now(),lastPage=-1,lastFocus="",wasReading=false,viewportHeight=innerHeight,bookStarted=false,initialized=false,bookWarmup=0;
    const idleWarmup=typeof window.requestIdleCallback==="function";
    const screen=stage.current!,section=journey.current!;
    const size=()=>{const unit=window.scrollY/(viewportHeight*SCROLL_SCALE);viewportHeight=innerHeight;section.style.height=(JOURNEY_LENGTH*SCROLL_SCALE+1)*viewportHeight+"px";screen.style.height=viewportHeight+"px";window.scrollTo({top:unit*viewportHeight*SCROLL_SCALE,behavior:"instant"});wake();};
    const scenes=Array.from(screen.querySelectorAll<HTMLElement>("[data-reveal]"));
    const tick=()=>{
      frame=0;
      const now=performance.now(),dt=Math.min(64,now-last);last=now;
      const target=clamp(window.scrollY/(viewportHeight*SCROLL_SCALE),0,JOURNEY_LENGTH);
      if(document.hidden)return;
      position.current=reduce||!initialized?target:position.current+(target-position.current)*(1-Math.exp(-dt/45));initialized=true;
      if(Math.abs(position.current-target)<.0002)position.current=target;
      const p=position.current,raw=(p-READ_START)/PAGE_STEP;
      if(!bookStarted&&p>2.65&&!matchMedia("(max-width: 1024px) and (orientation: portrait)").matches){
        bookStarted=true;
        const warm=()=>{bookWarmup=0;setBookReady(true);};
        bookWarmup=idleWarmup?window.requestIdleCallback(warm,{timeout:600}):window.setTimeout(warm,0);
      }
      const n=clamp(Math.floor(raw),0,journeySpreads.length-1),isReading=p>=READ_START-.18&&p<CLOSE_START+.1;
      const side=focusedSide(n,raw-n,mobileQuery.matches);
      const opacity=smooth(p,READ_START-.22,READ_START+.03)*(1-smooth(p,CLOSE_START-.12,CLOSE_START+.32));
      screen.style.setProperty("--page-opacity",String(opacity));
      screen.style.setProperty("--scene-shade",String(.08+smooth(p,4.65,6.6)*.76-smooth(p,CLOSE_START+1.7,CLOSE_START+3.2)*.70));
      screen.style.setProperty("--book-opacity",String(smooth(p,4.4,4.72)));
      screen.style.setProperty("--portrait-page-opacity",String(smooth(p,5.05,5.45)*(1-smooth(p,CLOSE_START+.1,CLOSE_START+.75))));
      screen.style.setProperty("--progress",String(clamp((p-READ_START)/(CLOSE_START-READ_START))));
      screen.style.setProperty("--finished-opacity",String(smooth(p,CLOSE_START+3.85,CLOSE_START+4.25)));
      screen.dataset.reading=String(isReading);screen.dataset.position=String(Math.round(p*1000)/1000);
      scenes.forEach(el=>{const [a,b,c,d]=el.dataset.reveal!.split(",").map(Number),op=smooth(p,a,b)*(1-smooth(p,c,d));el.style.opacity=String(op);el.style.transform=`translate3d(0,${(1-smooth(p,a,b))*45-smooth(p,c,d)*45}px,0)`;el.style.visibility=op<.01?"hidden":"visible";el.inert=op<.3;});
      if(wasReading!==isReading){wasReading=isReading;setReading(isReading);}
      if(side!==lastFocus){lastFocus=side;setFocus(side);}
      if(n!==lastPage&&p>=READ_START){lastPage=n;setIndex(n);if(p<CLOSE_START){try{localStorage.setItem(journeyProgressKey,String(n));}catch{}setSaved(n);}}
      if(Math.abs(position.current-target)>.0002)frame=requestAnimationFrame(tick);
    };
    function wake(){if(!frame){last=performance.now()-16;frame=requestAnimationFrame(tick);}}
    size();window.addEventListener("resize",size);window.addEventListener("scroll",wake,{passive:true});document.addEventListener("visibilitychange",wake);mobileQuery.addEventListener("change",wake);
    const changed=()=>setFull(Boolean(document.fullscreenElement));document.addEventListener("fullscreenchange",changed);
    return()=>{cancelAnimationFrame(motionFrame);cancelAnimationFrame(frame);if(bookWarmup){if(idleWarmup)window.cancelIdleCallback(bookWarmup);else window.clearTimeout(bookWarmup);}window.removeEventListener("resize",size);window.removeEventListener("scroll",wake);document.removeEventListener("visibilitychange",wake);mobileQuery.removeEventListener("change",wake);document.removeEventListener("fullscreenchange",changed);};
  },[]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{if(!accessGranted||zoom||!reading||(e.target as HTMLElement).closest("button,a,input"))return;const mobile=portrait;
      if(["ArrowDown","ArrowRight","PageDown"," "].includes(e.key)){e.preventDefault();jump(READ_START+(mobile&&index>2&&focus==="left"&&index<13?index+.48:Math.min(journeySpreads.length,index+1)+.03)*PAGE_STEP);}
      if(["ArrowUp","ArrowLeft","PageUp"].includes(e.key)){e.preventDefault();jump(READ_START+(mobile&&index>2&&focus==="right"?index+.08:Math.max(0,index-1)+.03)*PAGE_STEP);}
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[accessGranted,index,focus,jump,reading,zoom,portrait]);
  useEffect(()=>{if(!zoom)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setZoom(null);if(e.key==="Tab")e.preventDefault();};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[zoom]);
  const fullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen().catch(()=>{});};
  const spread=journeySpreads[index],label=index===0?"A dedication":index===1?"Part One":index===2?"Page 1":index===13?"Page 22":portrait?spread[focus].label:`Pages ${spread.left.number}–${spread.right.number}`;
  const shownPage=reading?spread[focus]:{src:"/manga/cover-front.webp",label:"Between Spring and Winter cover",number:0};
  useEffect(()=>{if(!portrait||!reading)return;const neighbors=focus==="left"?[spread.right,journeySpreads[index-1]?.right]:[journeySpreads[index+1]?.left,journeySpreads[index+1]?.right];for(const page of neighbors){if(page&&page.src!==shownPage.src){const image=new Image();image.src=page.src;}}},[portrait,reading,index,focus,spread,shownPage.src]);
  return <main className={"manga-journey "+(paused?"motion-paused":"")}>
    {!accessGranted&&<AccessGate onUnlock={()=>{setAccessGranted(true);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".intro-actions button")?.focus({preventScroll:true}));}}/>}
    <section ref={journey} className="journey-scroll" inert={!accessGranted} style={{height:`${(JOURNEY_LENGTH*SCROLL_SCALE+1)*100}svh`}} aria-label="Between Spring and Winter — a story for Aami">
      <div ref={stage} className="journey-screen">
        <Scenery position={position} paused={paused||!accessGranted} onWindClock={setSoundWind}/><div className="scene-shade" aria-hidden="true"/>
        <header className="journey-header" aria-hidden={reading} inert={reading}>
          <a href="#" className="full-wordmark" onClick={e=>{e.preventDefault();jump(0);}} aria-label="Between Spring and Winter — return to the beginning"><span>Between</span><span>Spring <i>&</i> Winter</span></a>
          <nav className="intro-nav" aria-label="Introduction"><button onClick={()=>jump(1.8)}>The story</button><button onClick={()=>jump(3.15)}>A love letter</button><button className="read-link" onClick={()=>jump(READ_START+.1)}>Read Spring</button></nav>
          <span className="season-note"><span lang="ja">春</span><span>PART I<br/>SPRING</span></span>
        </header>
        <section className="reveal-copy introduction" data-reveal="-1,-.5,.9,1.18" aria-label="Cover page">
          <p className="chapter-label">A LOVE LETTER, TOLD IN PAGES</p><h1>Between<br/><em>Spring</em> <span>&</span> Winter</h1>
          <p className="intro-dedication">For Aami, who makes even the waiting<br/>feel like the beginning of spring.</p>
          <div className="intro-actions"><button className="text-action" onClick={()=>jump(1.8)}>Enter the story <span className="action-line"/></button>{saved>0&&<button className="resume-link" onClick={()=>jump(READ_START+saved*PAGE_STEP+.08)}>Continue reading</button>}</div>
          <p className="byline">A birthday gift, with love from Shyamu</p>
        </section>
        <section className="reveal-copy story-introduction" data-reveal="1.23,1.6,2.4,2.65" aria-label="About the story">
          <div className="story-copy"><p className="chapter-label">01 / A DAY I DREAM OF</p><h2>If I could give you<br/><em>one ordinary day.</em></h2><p>Four years, and still my heart measures distance in the moments I wish were ours.</p><p>A quiet morning. Your hand in mine. An evening with nowhere to be but beside you. These pages hold the day I have carried within me, waiting to give it to you.</p><p className="story-signoff">For the hours we have shared.<br/>For the days still waiting for us.</p></div>
          <div className="panel-preview" aria-hidden="true"><img className="preview-back" src="/manga/page-002.webp" alt=""/><img className="preview-front" src="/manga/page-001.webp" alt=""/><span>THE BEGINNING OF SPRING</span></div>
        </section>
        <section className="reveal-copy author-introduction" data-reveal="2.72,3.05,3.75,3.98" aria-label="A letter from Shyamu">
          <div className="author-rule"/><p className="chapter-label">02 / FROM SHYAMU, TO AAMI</p><h2>My dearest Aami,<span>you are my gentlest season.</span></h2>
          <p>If love could fold the miles between us, I would be at your door before the morning light.</p><p>Until then, I have made you a little world of paper: a day without goodbyes, where nothing hurries us, and every small moment has room for you.</p><p>For your birthday, and for all the days after it, this is my heart, asking to sit beside yours.</p><p className="author-signature">Ever yours, Shyamu.</p>
        </section>
        <div className="book-invitation" data-reveal="4.08,4.35,4.65,5.05"><p className="chapter-label">03 / OUR FIRST SEASON</p><h2>Let the world grow quiet.<br/><em>Stay a little.</em></h2><p>Keep scrolling. I saved a day for us.</p></div>
        {bookReady&&!portrait&&<Suspense fallback={<div className="journey-book"><img className="journey-book-fallback" src="/manga/cover-front.webp" alt=""/></div>}><PremiumBook position={position} paused={paused||!accessGranted}/></Suspense>}
        {portrait&&<div className="portrait-reader" aria-hidden={!reading}><img src={shownPage.src} alt={shownPage.label} decoding="async"/></div>}
        <div className="reading-chrome" aria-hidden={!reading} inert={!reading}>
          <span className="reading-label">SPRING <span>{label}</span></span><span className="reading-instruction">Scroll to turn · Scroll up to return</span>
          <div className="reading-actions">{!portrait&&spread.left.number>0&&index<13&&<button className="zoom-left" aria-label={`Enlarge page ${spread.left.number}`} onClick={()=>setZoom(spread.left)}><ZoomIn size={17}/><span>{spread.left.number}</span></button>}<button aria-label={`Enlarge ${spread[focus].label.toLowerCase()}`} onClick={()=>setZoom(spread[focus])}><ZoomIn size={20}/></button><button aria-label={full?"Exit fullscreen":"Enter fullscreen"} onClick={fullscreen}>{full?<Minimize size={20}/>:<Maximize size={20}/>}</button></div>
        </div>
        <footer className="journey-footer"><span className="journey-scroll-cue">{reading?"SCROLL TO TURN THE PAGE":"SCROLL TO DISCOVER"}<span/></span><div className="footer-controls">{accessGranted&&<Suspense fallback={null}><Soundscape position={position} wind={soundWind} paused={paused}/></Suspense>}<button className="ambient-button" onClick={()=>setPaused(!paused)} aria-label={paused?"Play ambient motion":"Pause ambient motion"}>{paused?<Play size={15}/>:<Pause size={15}/>}<span>{paused?"Motion paused":"Pause motion"}</span></button></div><div className="reading-progress"/></footer>
        <section className="ending-copy" data-reveal={`${CLOSE_START+3.85},${CLOSE_START+4.25},${JOURNEY_LENGTH+1},${JOURNEY_LENGTH+2}`} aria-label="Part One complete"><p className="chapter-label">END OF PART ONE</p><h2>Until our next day<br/><em>together.</em></h2><p>Wherever you are, my Aami,<br/>the best of me is already with you.</p><button className="text-action" onClick={()=>jump(READ_START+.1)}>Read Spring again <span className="action-line"/></button><button className="back-to-beginning" onClick={()=>jump(0)}><ChevronUp size={17}/> Back to the beginning</button></section>
        {zoom&&<div className="page-detail" role="dialog" aria-modal="true" aria-label={`Enlarged ${zoom.label}`}><div className="detail-header"><span>{zoom.label} · Scroll to explore</span><button autoFocus aria-label="Close enlarged page" onClick={()=>setZoom(null)}><X size={24}/></button></div><div className="detail-scroll"><img src={zoom.src} alt={zoom.label+" enlarged"}/></div></div>}
      </div>
    </section>
  </main>;
}

