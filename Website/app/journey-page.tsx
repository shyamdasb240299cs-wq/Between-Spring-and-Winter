"use client";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, ChevronUp } from "lucide-react";
const PremiumBook = lazy(() => import("./journey-book"));
const Soundscape = lazy(() => import("./soundscape"));
const loadVoidScene = () => import("./shrine-void/void-scene");
const VoidScene = lazy(loadVoidScene);
import type { WindClock } from "./wind-motion";
import Scenery from "./scenery";
import ShrineEntry from './shrine-entry';
import SanctuaryAudio,{sanctuaryCue} from './shrine-void/sanctuary-audio';
import {createShrineLink} from './shrine-entry-motion';
import AccessGate, { accessSessionKey } from "./access-gate";
import { CLOSE_START, CLOSED_REST, JOURNEY_LENGTH, READ_START, SCROLL_SCALE, clamp, smooth } from "./journey-data";

import {BookSequence} from './book-sequence';

export default function Home(){
  const journey=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null),position=useRef(0);
  const bookPosition=useRef<number|null>(null),sequence=useRef(new BookSequence());
  const [bookReady,setBookReady]=useState(false);
  useEffect(()=>{
    // Begin behind the initial access card, before the visitor reaches the book.
    if(typeof window.requestIdleCallback==='function'){const id=window.requestIdleCallback(()=>setBookReady(true),{timeout:350});return()=>window.cancelIdleCallback(id);}
    const id=window.setTimeout(()=>setBookReady(true),100);return()=>clearTimeout(id);
  },[]);
  const [paused,setPaused]=useState(false),[presenting,setPresenting]=useState(false);
  const [accessGranted,setAccessGranted]=useState(false);
  const shrineLink=useRef(createShrineLink());
  const [entering,setEntering]=useState(false),[entered,setEntered]=useState(false);
  const [entryVersion,setEntryVersion]=useState(0);
  const commitShrine=useCallback(()=>{sanctuaryCue('entry');setEntering(true);void loadVoidScene();},[]);
  const completeShrine=useCallback(()=>setEntered(true),[]);
  const exitShrine=useCallback(()=>{sanctuaryCue('idle');setEntered(false);setEntering(false);setEntryVersion(n=>n+1);},[]);
  useEffect(()=>{
    if(!accessGranted)return;
    // Decode the sanctuary only on visitor intent, rather than competing with
    // homepage scrolling, landscape decode and the book's texture uploads.
    const warm=(event:Event)=>{if(!(event.target instanceof Element)||!event.target.closest('.shrine-hit,.enter-shrine-void'))return;void import('./shrine-void/assets').then(module=>module.prewarmVoid());void loadVoidScene();};
    document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);
    return()=>{document.removeEventListener('pointerover',warm);document.removeEventListener('focusin',warm);};
  },[accessGranted]);
  const soundWind=useRef<WindClock|null>(null);
  const setSoundWind=useCallback((clock:WindClock|null)=>{soundWind.current=clock;},[]);
  useEffect(()=>{const frame=requestAnimationFrame(()=>{try{setAccessGranted(sessionStorage.getItem(accessSessionKey)==="granted");}catch{}});return()=>cancelAnimationFrame(frame);},[]);
  const jump=useCallback((unit:number)=>{
    if(!journey.current||sequence.current.active)return;
    const restart=unit<READ_START&&sequence.current.phase==='closed';
    if(restart){sequence.current=new BookSequence();sequence.current.position=unit;position.current=unit;bookPosition.current=unit;}
    window.scrollTo({top:journey.current.offsetTop+unit*innerHeight*SCROLL_SCALE,behavior:restart||matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  },[]);
  useEffect(()=>{
    const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionFrame=requestAnimationFrame(()=>setPaused(reduce));
    let frame=0,last=performance.now(),wasPresenting=false,viewportHeight=innerHeight,bookStarted=false,initialized=false,bookWarmup=0;
    const idleWarmup=typeof window.requestIdleCallback==="function";
    const screen=stage.current!,section=journey.current!;
    const size=()=>{const unit=window.scrollY/(viewportHeight*SCROLL_SCALE);viewportHeight=innerHeight;section.style.height=(JOURNEY_LENGTH*SCROLL_SCALE+1)*viewportHeight+"px";screen.style.height=viewportHeight+"px";window.scrollTo({top:unit*viewportHeight*SCROLL_SCALE,behavior:"instant"});wake();};
    const scenes=Array.from(screen.querySelectorAll<HTMLElement>("[data-reveal]")).map(element=>({element,range:element.dataset.reveal!.split(',').map(Number)}));
    const tick=()=>{
      frame=0;
      const now=performance.now(),dt=Math.min(64,now-last);last=now;
      const target=sequence.current.lockAt??clamp(window.scrollY/(viewportHeight*SCROLL_SCALE),0,JOURNEY_LENGTH);
      if(document.hidden)return;
      position.current=reduce||!initialized?target:position.current+(target-position.current)*(1-Math.exp(-dt/45));initialized=true;
      if(Math.abs(position.current-target)<.0002)position.current=target;
      const p=position.current>=4.2&&bookPosition.current!==null?bookPosition.current:position.current;
      if(!bookStarted&&p>1.4){
        bookStarted=true;
        const warm=()=>{bookWarmup=0;setBookReady(true);};
        bookWarmup=idleWarmup?window.requestIdleCallback(warm,{timeout:600}):window.setTimeout(warm,0);
      }
      const isPresenting=p>=READ_START-.18&&p<CLOSED_REST;
      screen.style.setProperty("--scene-shade",String(.08+smooth(p,4.65,6.6)*.76-smooth(p,CLOSE_START+1.7,CLOSE_START+3.2)*.70));
      screen.style.setProperty("--book-opacity",String(smooth(p,4.4,4.72)));
      screen.style.setProperty("--finished-opacity",String(smooth(p,CLOSE_START+3.15,CLOSE_START+3.7)));
      screen.dataset.bookPhase=p<CLOSE_START?"story":p<CLOSE_START+1.9?"left":p<CLOSE_START+3.45?"crossing":"right";screen.dataset.reading=String(isPresenting);screen.dataset.position=String(Math.round(p*1000)/1000);
      scenes.forEach(({element:el,range:[a,b,c,d]})=>{const op=smooth(p,a,b)*(1-smooth(p,c,d));el.style.opacity=String(op);el.style.transform=`translate3d(0,${(1-smooth(p,a,b))*45-smooth(p,c,d)*45}px,0)`;el.style.visibility=op<.01?"hidden":"visible";el.inert=op<.3;});
      if(wasPresenting!==isPresenting){wasPresenting=isPresenting;setPresenting(isPresenting);}
      if(Math.abs(position.current-target)>.0002)frame=requestAnimationFrame(tick);
    };
    function wake(){if(!frame){last=performance.now()-16;frame=requestAnimationFrame(tick);}}
    size();window.addEventListener("resize",size);window.addEventListener("scroll",wake,{passive:true});document.addEventListener("visibilitychange",wake);
    window.addEventListener('journey-book-update',wake);
    return()=>{cancelAnimationFrame(motionFrame);cancelAnimationFrame(frame);if(bookWarmup){if(idleWarmup)window.cancelIdleCallback(bookWarmup);else window.clearTimeout(bookWarmup);}window.removeEventListener('journey-book-update',wake);window.removeEventListener("resize",size);window.removeEventListener("scroll",wake);document.removeEventListener("visibilitychange",wake);};
  },[]);
  // While a cinematic is running, extra wheel/touch/key input cannot park a leaf
  // or queue an immediate reversal. Scrollbar dragging is held at the same anchor.
  useEffect(()=>{
    const stop=(event:Event)=>{if(sequence.current.active)event.preventDefault();};
    const key=(event:KeyboardEvent)=>{if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','PageDown','PageUp',' ','Home','End'].includes(event.key))stop(event);};
    const hold=()=>{const unit=sequence.current.lockAt;if(unit!==null){const top=unit*innerHeight*SCROLL_SCALE;if(Math.abs(scrollY-top)>1)window.scrollTo({top,behavior:'instant'});}};
    window.addEventListener('wheel',stop,{passive:false});window.addEventListener('touchmove',stop,{passive:false});window.addEventListener('keydown',key);window.addEventListener('scroll',hold,{passive:true});
    return()=>{window.removeEventListener('wheel',stop);window.removeEventListener('touchmove',stop);window.removeEventListener('keydown',key);window.removeEventListener('scroll',hold);};
  },[]);
  const finishSequence=useCallback((unit:number)=>{
    position.current=unit;bookPosition.current=unit;
    window.scrollTo({top:unit*innerHeight*SCROLL_SCALE,behavior:'instant'});
    window.dispatchEvent(new Event('journey-book-update'));
  },[]);
  return <main className={"manga-journey "+(paused||entered?"motion-paused":"")} data-domain-ready={entered}>
    {accessGranted&&<SanctuaryAudio/>}
    {!accessGranted&&<AccessGate onUnlock={()=>{setAccessGranted(true);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".intro-actions button")?.focus({preventScroll:true}));}}/>}
    <section ref={journey} className="journey-scroll" inert={!accessGranted||entered} style={{height:`${(JOURNEY_LENGTH*SCROLL_SCALE+1)*100}svh`}} aria-label="Between Spring and Winter — a story for Aami">
      <div ref={stage} className="journey-screen" style={{display:entered?'none':undefined}}>
        <Scenery position={position} paused={paused||!accessGranted||entered} onWindClock={setSoundWind} shrineLink={shrineLink}/><div className="scene-shade" aria-hidden="true"/>
        {accessGranted&&<ShrineEntry key={entryVersion} link={shrineLink} stage={stage} onCommit={commitShrine} onComplete={completeShrine}/>}
    <header className="journey-header" aria-hidden={presenting||entering} inert={presenting||entering}>
          <a href="#" className="full-wordmark" onClick={e=>{e.preventDefault();jump(0);}} aria-label="Between Spring and Winter — return to the beginning"><span>Between</span><span>Spring <i>&</i> Winter</span></a>
          <nav className="intro-nav" aria-label="Introduction"><button onClick={()=>jump(1.8)}>The story</button><button onClick={()=>jump(3.15)}>A love letter</button><button className="book-link" onClick={()=>jump(4.65)}>The book</button></nav>
          <span className="season-note"><span lang="ja">春</span><span>PART I<br/>SPRING</span></span>
        </header>
        <section className="reveal-copy introduction" data-reveal="-1,-.5,.9,1.18" aria-label="Cover page">
          <p className="chapter-label">A LOVE LETTER, TOLD IN PAGES</p><h1>Between<br/><em>Spring</em> <span>&</span> Winter</h1>
          <p className="intro-dedication">For Aami, who makes even the waiting<br/>feel like the beginning of spring.</p>
          <div className="intro-actions"><button className="text-action" onClick={()=>jump(1.8)}>Enter the story <span className="action-line"/></button></div>
          <p className="byline">A birthday gift, with love from Shyamu</p>
        </section>
        <section className="reveal-copy story-introduction" data-reveal="1.23,1.6,2.4,2.65" aria-label="About the story">
          <div className="story-copy"><p className="chapter-label">01 / A DAY I DREAM OF</p><h2>If I could give you<br/><em>one ordinary day.</em></h2><p>Four years, and still my heart measures distance in the moments I wish were ours.</p><p>A quiet morning. Your hand in mine. An evening with nowhere to be but beside you. These pages hold the day I have carried within me, waiting to give it to you.</p><p className="story-signoff">For the hours we have shared.<br/>For the days still waiting for us.</p></div>
          <div className="panel-preview" aria-hidden="true"><img className="preview-back" src="/manga/cover-back.webp" alt=""/><img className="preview-front" src="/manga/cover-front.webp" alt=""/><span>THE BEGINNING OF SPRING</span></div>
        </section>
        <section className="reveal-copy author-introduction" data-reveal="2.72,3.05,3.75,3.98" aria-label="A letter from Shyamu">
          <div className="author-rule"/><p className="chapter-label">02 / FROM SHYAMU, TO AAMI</p><h2>My dearest Aami,<span>you are my gentlest season.</span></h2>
          <p>If love could fold the miles between us, I would be at your door before the morning light.</p><p>Until then, I have made you a little world of paper: a day without goodbyes, where nothing hurries us, and every small moment has room for you.</p><p>For your birthday, and for all the days after it, this is my heart, asking to sit beside yours.</p><p className="author-signature">Ever yours, Shyamu.</p>
        </section>
        <div className="book-invitation" data-reveal="4.08,4.35,4.65,5.05"><p className="chapter-label">03 / OUR FIRST SEASON</p><h2>Let the world grow quiet.<br/><em>Stay a little.</em></h2><p>Keep scrolling. I saved a day for us.</p></div>
        {bookReady&&!entering&&!entered&&<Suspense fallback={<div className="journey-book"><img className="journey-book-fallback" src="/manga/cover-front.webp" alt=""/></div>}><PremiumBook position={position} bookPosition={bookPosition} sequence={sequence} onSequenceEnd={finishSequence} paused={paused||!accessGranted}/></Suspense>}
        <footer className="journey-footer"><span className="journey-scroll-cue">{presenting?"SCROLL TO CONTINUE THE STORY":"SCROLL TO DISCOVER"}<span/></span><div className="footer-controls">{accessGranted&&<Suspense fallback={null}><Soundscape position={position} wind={soundWind} paused={paused} silenced={entering||entered} hidden={entered}/></Suspense>}<button className="ambient-button" onClick={()=>setPaused(!paused)} aria-label={paused?"Play ambient motion":"Pause ambient motion"}>{paused?<Play size={15}/>:<Pause size={15}/>}<span>{paused?"Motion paused":"Pause motion"}</span></button></div></footer>
        <section className="ending-whisper" data-reveal={`${CLOSE_START+1.15},${CLOSE_START+1.5},${CLOSE_START+1.9},${CLOSE_START+2.2}`} aria-label="A last little thought"><p className="chapter-label">A DAY, KEPT BETWEEN THESE PAGES</p><p>Some stories stay with you.<br/><em>Like you stay with me.</em></p></section>
        <section className="ending-copy" data-reveal={`${CLOSE_START+3.15},${CLOSE_START+3.7},${JOURNEY_LENGTH+1},${JOURNEY_LENGTH+2}`} aria-label="Part One complete"><p className="chapter-label">END OF PART ONE</p><h2>Until our next day<br/><em>together.</em></h2><p>Wherever you are, my Aami,<br/>the best of me is already with you.</p><div style={{display:"flex",gap:"18px",flexWrap:"wrap",alignItems:"center"}}><button className="text-action enter-shrine-void" onClick={()=>setEntered(true)}>Step into the memory shrine <span className="action-line"/></button><button className="text-action" onClick={()=>jump(READ_START+.1)}>Revisit the letter <span className="action-line"/></button></div><button className="back-to-beginning" onClick={()=>jump(0)}><ChevronUp size={17}/> Back to the beginning</button></section>
      </div>
    </section>
    {entered&&<Suspense fallback={<div className="void-scene-wrapper" style={{position:'fixed',inset:0,background:'#010104',zIndex:500}}/>}><VoidScene active={entered} paused={paused} onExit={exitShrine}/></Suspense>}
  </main>;
}

