"use client";
import { useEffect, useId, useRef, type CSSProperties, type RefObject } from "react";
import { CLOSE_START } from "./journey-data";
import { landscapeLayout, rabbitFrame, visibleFraction, type RabbitClock } from "./scenery-layout";
import { waterRoutes, type WaterPlane } from "./water-routes";
import { advanceWind, createWindClock, type WindClock } from "./wind-motion";
import {OPENING_BRANCH,FLOCK_SIZE,horizonBird,createOpeningWind,advanceOpeningWind} from './opening-motion';
import {VALLEY_TREE,SHRINE_GATE,PETAL_CAPACITY,createPetalFlow,releaseFlowPetal,advancePetalFlow,flowPetalPose} from './petal-flow';
import type {ShrineLink} from './shrine-entry-motion';

const art = "/scene/layers/";
function WindStrokes({paths,viewBox}:{paths:string[];viewBox:string}){
  const id=useId().replace(/:/g,'');
  return <svg viewBox={viewBox} fill="none"><defs><linearGradient id={id} x1="0" x2="1"><stop stopColor="#e8d6c9" stopOpacity="0"/><stop offset=".3" stopColor="#fff4de" stopOpacity=".55"/><stop offset=".7" stopColor="#ffe7df" stopOpacity=".7"/><stop offset="1" stopColor="#ffe7df" stopOpacity="0"/></linearGradient></defs>{paths.map((d,i)=><g key={i}><path className="wind-shadow" style={{stroke:`url(#${id})`}} pathLength="1000" d={d}/><path className="wind-highlight" style={{stroke:`url(#${id})`}} pathLength="1000" d={d}/></g>)}</svg>;
}

function WaterRibbons({ plane }: { plane: WaterPlane }) {
  return <div className={`water-ribbons ${plane}-water`}>
    {waterRoutes[plane].map(route => <div key={route.id} className="waterfall-motion" data-plane={plane} data-running="false" style={{
      left: `${route.left * 100}%`, top: `${route.top * 100}%`, width: `${route.width * 100}%`, height: `${route.height * 100}%`,
      clipPath: route.clip, "--flow-period": `${route.period}s`, "--flow-delay": `${route.delay}s`, "--flow-alpha": route.opacity,
    } as CSSProperties}><div className="water-flow"/><div className="water-foam"/></div>)}
  </div>;
}

/** Two complete landscape planes; all scenery stays attached to its terrain. */
export default function Scenery({ position, paused, onWindClock, shrineLink }: { position: RefObject<number>; paused: boolean; onWindClock?: (clock:WindClock|null)=>void; shrineLink:RefObject<ShrineLink> }) {
  const host = useRef<HTMLDivElement>(null), pause = useRef(paused);
  const wakeAnimation = useRef<(() => void) | null>(null);
  useEffect(() => { pause.current = paused; wakeAnimation.current?.(); }, [paused]);
  useEffect(() => {
    const world = host.current!;
    const background = world.querySelector<HTMLElement>(".continuous-landscape")!;
    const backgroundLife = world.querySelector<HTMLElement>(".background-life")!;
    const foreground = world.querySelector<HTMLElement>(".foreground-world")!;
    const terrain = world.querySelector<HTMLElement>(".foreground-terrain")!;
    const backgroundWater = world.querySelector<HTMLElement>(".background-water")!;
    const waterCurtains = Array.from(world.querySelectorAll<HTMLElement>(".waterfall-motion"));
    let waterBounds: { element: HTMLElement; plane: WaterPlane; left: number; top: number; width: number; height: number }[] = [];
    const rabbit = world.querySelector<HTMLElement>(".house-rabbit")!;
    const rabbitSprite = rabbit.firstElementChild as HTMLElement;
    const birds = Array.from(world.querySelectorAll<HTMLElement>(".bird-flight"));
    const opening = world.querySelector<HTMLElement>('.opening-foreground')!;
    const openingBranch = world.querySelector<HTMLElement>('.opening-branch')!;
    const openingAir = world.querySelector<HTMLElement>('.opening-air')!;
    const openingAirPaths=Array.from(openingAir.querySelectorAll<SVGPathElement>('path'));
    const openingWind=createOpeningWind();
    const valley=world.querySelector<HTMLElement>('.valley-foreground')!;
    const valleyTree=world.querySelector<HTMLElement>('.valley-tree')!;
    const shrine=world.querySelector<HTMLElement>('.shrine-world')!;
    const valleyAir=world.querySelector<HTMLElement>('.valley-air')!;
    const valleyAirPaths=Array.from(valleyAir.querySelectorAll<SVGPathElement>('path'));
    const valleyWind={...createOpeningWind(),seed:773,start:.8,duration:5.3,strength:.63};
    const flow=createPetalFlow(),flowElements=Array.from(world.querySelectorAll<HTMLElement>('.flow-petal'));
    let nextOpeningPetal=1.8,nextValleyPetal=1.4,nextRoofPetal=2;
    let openingSerial=0,valleySerial=0,roofSerial=0;
    const butterflies = Array.from(world.querySelectorAll<HTMLElement>(".garden-butterfly"));
    const garden = world.querySelector<HTMLElement>(".garden-life")!;
    let gardenTime = 0;
    const chime = world.querySelector<HTMLElement>(".furin")!;
    const paper = world.querySelector<HTMLElement>(".furin-paper")!;
    const paperFrames = Array.from(paper.querySelectorAll<HTMLElement>(".furin-paper-frame"));
    const branch = world.querySelector<HTMLElement>(".roof-blossom")!;
    const air = world.querySelector<HTMLElement>(".blossom-air")!;
    const airPaths = Array.from(air.querySelectorAll<SVGPathElement>("path"));
    const wind = createWindClock();
    onWindClock?.(wind);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, previous = -1, last = performance.now(), flightTime = 0, lastWing = -1;
    let rabbitCell = -1, disposed = false, awakeUntil = performance.now()+700;
    let rabbitReady = false;
    const rabbitImage = new Image();
    rabbitImage.src = `${art}rabbit-polished.webp`;
    rabbitImage.decode().then(() => { if (!disposed) rabbitReady = true; }).catch(() => {});
    let layout = landscapeLayout(world.clientWidth, world.clientHeight);
    const size = () => {
      layout = landscapeLayout(world.clientWidth, world.clientHeight);
      for (const layer of [background, backgroundLife, foreground]) layer.style.height = layout.worldHeight + "px";
      for (const [element, bounds] of [[background,layout.background], [terrain, layout.foreground], [rabbit, layout.rabbit], [backgroundWater,layout.background]] as const) {
        element.style.left = bounds.left + "px"; element.style.top = bounds.top + "px";
        element.style.width = bounds.width + "px"; element.style.height = bounds.height + "px";
      }
      opening.style.left=layout.background.left+'px';opening.style.width=layout.paintedWidth+'px';opening.style.height=layout.worldHeight+'px';
      for(const layer of [valley,shrine]){layer.style.left=layout.background.left+'px';layer.style.width=layout.paintedWidth+'px';layer.style.height=layout.worldHeight+'px';}
      let cursor = 0;
      waterBounds = (["background", "foreground"] as const).flatMap(plane => {
        const bounds = layout[plane];
        return waterRoutes[plane].map(route => ({
          element: waterCurtains[cursor++], plane, left: bounds.left + route.left * bounds.width, top: bounds.top + route.top * bounds.height,
          width: route.width * bounds.width, height: route.height * bounds.height,
        }));
      });
      previous = -1;
      wakeAnimation.current?.();
    };
    size(); const observer = new ResizeObserver(size); observer.observe(world);
    const rabbitClock: RabbitClock = { eating: 0, lifting: 0 };
    const setMotion = (running: boolean) => {
      const value = String(running);
      if (world.dataset.waterRunning !== value) world.dataset.waterRunning = value;
    };
    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min(now - last, 80); last = now;
      if(shrineLink.current.complete||(shrineLink.current.committed&&world.style.visibility==='hidden')){setMotion(false);garden.dataset.running='false';return;}
      if (document.hidden) { setMotion(false); garden.dataset.running = "false"; return; }
      const p = position.current, sceneryProgress = Math.min(p, 5.25);
      const moved = Math.abs(sceneryProgress - previous) > .0001;
      const active = p < 5.75 || p > CLOSE_START + 2.6;
      const running = !pause.current && !reduced.matches;
      if ((running && active) || now < awakeUntil) frame = requestAnimationFrame(tick);
      const cameraY = layout.camera(p);
      const cameraX = layout.cameraX(p);
      const foregroundDepth = (cameraY - layout.letterCamera) * .075;
      const foregroundY = cameraY + foregroundDepth;
      const skyVisible = cameraY < layout.worldHeight * .14 + layout.height * .06;
      const scale=layout.paintedWidth/887;
      const valleyDepth=(cameraY-layout.camera(1.65))*.04,valleyY=cameraY+valleyDepth;
      const valleyVisible=visibleFraction(cameraX+layout.background.left+VALLEY_TREE.left*scale,VALLEY_TREE.top*scale-valleyY,VALLEY_TREE.width*scale,VALLEY_TREE.height*scale,layout.width,layout.height)>0;
      const openingVisible=visibleFraction(cameraX+layout.background.left,-cameraY*1.09,layout.paintedWidth,layout.worldHeight*Math.max(OPENING_BRANCH.height,500/1774),layout.width,layout.height)>0;
      opening.dataset.running=String(running&&active&&openingVisible);
      if(running&&active&&openingVisible){
        advanceOpeningWind(openingWind,dt/1000);
        openingBranch.style.transform=`translate3d(${openingWind.air*layout.paintedWidth*.002}px,0,0) rotate(${-openingWind.angle}rad)`;
        openingAir.style.opacity=String(openingWind.air*.95);
        const age=Math.max(0,openingWind.time-openingWind.start);
        openingAirPaths.forEach((path,i)=>path.style.strokeDashoffset=String(-age*(245+Math.floor(i/2)*18)));
        if(openingWind.air>.15&&openingWind.time>nextOpeningPetal){
          for(let i=0;i<3;i++)if(releaseFlowPetal(flow,'opening',openingSerial,-openingWind.angle,-cameraY*.09/scale,openingWind.air*887*.002))openingSerial++;
          nextOpeningPetal=openingWind.time+.38;
        }
      }
      if(running&&active&&valleyVisible){
        advanceOpeningWind(valleyWind,dt/1000);
        valleyTree.style.transform=`rotate(${-valleyWind.angle*.65}rad)`;
        valleyAir.style.opacity=String(valleyWind.air*.8);
        const age=Math.max(0,valleyWind.time-valleyWind.start);
        valleyAirPaths.forEach((path,i)=>path.style.strokeDashoffset=String(-age*(220+Math.floor(i/2)*13)));
        if(valleyWind.air>.15&&valleyWind.time>nextValleyPetal){
          for(let i=0;i<2;i++)if(releaseFlowPetal(flow,'valley',valleySerial,-valleyWind.angle*.65,-valleyDepth/scale))valleySerial++;
          nextValleyPetal=valleyWind.time+.38;
        }
      }else if(!valleyVisible)valleyAir.style.opacity='0';
      setMotion(running && active);
      const gardenVisible = visibleFraction(cameraX + layout.foreground.left + layout.foreground.width * .64, layout.foreground.top - foregroundY, layout.foreground.width * .36, layout.foreground.height * .72, layout.width, layout.height) > 0;
      const roofVisible=visibleFraction(cameraX+layout.foreground.left+layout.foreground.width*.883,layout.foreground.top-layout.foreground.width*.005-foregroundY,layout.foreground.width*.125,layout.foreground.width*.1875,layout.width,layout.height)>0;
      const gardenRunning = String(running && active && gardenVisible);
      if (garden.dataset.running !== gardenRunning) garden.dataset.running = gardenRunning;
      if (running && active && gardenVisible) {
        gardenTime += dt / 1000;
        advanceWind(wind,dt/1000);
        // Leftward air reaches the branch first, then the hanging bell.
        branch.style.transform = `rotate(${-wind.branch}rad)`;
        chime.style.transform = `rotate(${-wind.angle}rad)`;
        paper.style.transform = `rotate(${-wind.paper*.12}rad)`;
        const bend = Math.max(0,Math.min(15,7.5+wind.paper*8));
        const first = Math.floor(bend), mix = bend-first;
        paperFrames.forEach((element,i) => {
          const cell = i ? Math.min(15,first+1) : first;
          element.style.backgroundPosition = `${cell%4/3*100}% ${Math.floor(cell/4)/3*100}%`;
          element.style.opacity = String(i ? mix : 1-mix);
        });
        air.style.opacity = String(Math.abs(wind.air)*.8);
        const gustAge=Math.max(0,wind.time-wind.start);
        airPaths.forEach((path,i)=>path.style.strokeDashoffset=String(-gustAge*(390+i*12)));
        if(roofVisible&&Math.abs(wind.air)>.17&&wind.time>nextRoofPetal){
          for(let i=0;i<3;i++)if(releaseFlowPetal(flow,'roof',roofSerial,-wind.branch,-foregroundDepth/scale))roofSerial++;
          nextRoofPetal=wind.time+.45;
        }
      }
      if((running||shrineLink.current.charge>0)&&active)advancePetalFlow(flow,dt/1000*(1+shrineLink.current.charge*7));
      if(moved||running||shrineLink.current.charge>0||reduced.matches)flow.forEach((petal,i)=>{
        const element=flowElements[i];
        if(!petal.active||reduced.matches){if(element.style.opacity!=='0')element.style.opacity='0';return;}
        const pose=flowPetalPose(petal),x=cameraX+layout.background.left+pose.x*scale,y=pose.y*scale-cameraY;
        if(x<-16||x>layout.width+16||y<-16||y>layout.height+16){if(element.style.opacity!=='0')element.style.opacity='0';return;}
        const size=petal.size/6*scale*pose.depth;
        element.style.opacity=String(pose.opacity);element.style.zIndex=String(pose.layer);
        element.style.transform=`translate3d(${x}px,${y}px,0) rotate(${pose.turn}deg) scale(${size},${size*pose.fold})`;
      });
      if (gardenVisible && (moved || running || reduced.matches)) {
        butterflies.forEach((butterfly, i) => {
          const t = gardenTime * (.45 + i * .07) + i * 2.2;
          const x = 22 + i * 21 + Math.sin(t) * (17 - i * 2);
          const y = 43 + Math.sin(t * 1.7 + i) * 22 + Math.cos(t * .6) * 7;
          const tilt = Math.cos(t) * 16;
          butterfly.style.transform = `translate3d(${x/100*layout.foreground.width*.18}px,${y/100*layout.foreground.height*.17}px,0) rotate(${tilt}deg)`;
          const wing = reduced.matches ? 0 : Math.floor(gardenTime * 13 + i * 2) % 6;
          (butterfly.firstElementChild as HTMLElement).style.backgroundPosition = `${wing % 3 / 2 * 100}% ${Math.floor(wing / 3) * 100}%`;
        });
      }
      for (const bounds of waterBounds) {
        const y = bounds.top - (bounds.plane === "background" ? cameraY : foregroundY);
        const value = String(running && active && visibleFraction(cameraX + bounds.left, y, bounds.width, bounds.height, layout.width, layout.height) > 0);
        if (bounds.element.dataset.running !== value) bounds.element.dataset.running = value;
      }
      if (!moved && !active && !skyVisible) return;
      if (moved) {
        background.style.transform = backgroundLife.style.transform = `translate3d(${cameraX}px,${-cameraY}px,0)`;
        foreground.style.transform = `translate3d(${cameraX}px,${-foregroundY}px,0)`;
        opening.style.transform=`translate3d(${cameraX}px,${-cameraY*1.09}px,0)`;
        valley.style.transform=`translate3d(${cameraX}px,${-valleyY}px,0)`;
        shrine.style.transform=`translate3d(${cameraX}px,${-cameraY}px,0)`;
        const x=cameraX+layout.background.left+568*scale,y=1200*scale-cameraY;
        shrineLink.current.reportAnchor({x,y,width:122*scale,height:102*scale,viewportWidth:layout.width,viewportHeight:layout.height,visible:p<4.2&&y>85&&y<layout.height-80&&x>20&&x<layout.width-20});
        world.dataset.scene = p < 1.2 ? "sunset" : p < 2.64 ? "valley" : p < 3.65 ? "shrine" : "waterfall";
        world.dataset.ready = "true";
        previous = sceneryProgress;
      }
      if (p < 2.3) { rabbitClock.eating = 0; rabbitClock.lifting = 0; }
      const rabbitVisible = rabbitReady && active && visibleFraction(cameraX + layout.rabbit.left, layout.rabbit.top - foregroundY, layout.rabbit.width, layout.rabbit.height, layout.width, layout.height) >= .8;
      const cell = rabbitFrame(rabbitClock, dt, rabbitVisible, running, reduced.matches);
      if (cell !== rabbitCell) {
        rabbitSprite.style.backgroundPosition = `${cell % 4 / 3 * 100}% ${Math.floor(cell / 4) / 2 * 100}%`;
        rabbitSprite.dataset.pose = cell < 8 ? "eating" : cell < 11 ? "looking-up" : "watching";
        rabbitCell = cell;
      }
      const rabbitVisibility=rabbitReady ? "visible" : "hidden";
      if(rabbit.style.visibility!==rabbitVisibility)rabbit.style.visibility=rabbitVisibility;
      // Birds belong to one patch of sky and leave the view with the background.
      if (running && skyVisible) flightTime += dt / 1000;
      const wingTick = Math.floor(flightTime * 7);
      birds.forEach((bird, i) => {
        const flight=horizonBird(flightTime,i,layout);
        const visibility = skyVisible && !reduced.matches&&flight.visible ? "visible" : "hidden";
        if (bird.style.visibility !== visibility) bird.style.visibility = visibility;
        if (!skyVisible || reduced.matches||!flight.visible) return;
        if (moved || running) {
          bird.style.transform = `translate3d(${flight.x-14}px,${flight.y-14}px,0) rotate(${flight.rotation}deg) scale(${flight.size/28})`;
          bird.style.opacity = String(flight.opacity);
        }
        if (wingTick !== lastWing) (bird.firstElementChild as HTMLElement).style.backgroundPosition = `${(wingTick + i * 2) % 6 / 5 * 100}% 0`;
      });
      lastWing = wingTick;
    };
    const wake = () => {
      awakeUntil=performance.now()+700;
      if (!frame && !document.hidden) { last=performance.now(); frame=requestAnimationFrame(tick); }
    };
    wakeAnimation.current=wake;
    shrineLink.current.setWake(wake);
    const visibilityChanged = () => {
      if (document.hidden) { setMotion(false); garden.dataset.running = "false"; }
      last = performance.now();
      wake();
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("scroll",wake,{passive:true});
    reduced.addEventListener("change",wake);
    frame = requestAnimationFrame(tick);
    return () => { disposed = true; onWindClock?.(null); wakeAnimation.current=null; shrineLink.current.setWake(null); cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", visibilityChanged); window.removeEventListener("scroll",wake); reduced.removeEventListener("change",wake); };
  }, [position,onWindClock,shrineLink]);

  return <div className="layered-world" ref={host} aria-hidden="true" data-water-running="false">
    <div className="entry-plane entry-far-plane">
    <img className="continuous-landscape" src={`${art}continuous-shrine-entry.webp`} srcSet={`${art}continuous-shrine-entry-small.webp 960w, ${art}continuous-shrine-entry.webp 1920w, ${art}continuous-shrine-entry-large.webp 2880w`} sizes="(max-width:1024px) and (orientation:portrait) 133vh, max(178vh,100vw)" fetchPriority="high" decoding="async" alt="" />
    <div className="background-life">
      <WaterRibbons plane="background" />
      {Array.from({length:FLOCK_SIZE},(_,i)=><div key={i} className="bird-flight"><div className="bird-sprite" /></div>)}
    </div>
    </div>
    <div className="entry-plane entry-gate-plane">
    <div className="shrine-world"><img className="shrine-gate" src={`${art}shrine-gate-detailed.webp`} alt="" decoding="async" style={{left:`${SHRINE_GATE.left/887*100}%`,top:`${SHRINE_GATE.top/1774*100}%`,width:`${SHRINE_GATE.width/887*100}%`,height:`${SHRINE_GATE.height/1774*100}%`}}/><div className="shrine-opening-shine"/></div>
    </div>
    <div className="entry-plane entry-tree-plane">
    <div className="valley-foreground"><img className="valley-tree" src={`${art}valley-cherry-tree.webp`} alt="" decoding="async" style={{left:`${VALLEY_TREE.left/887*100}%`,top:`${VALLEY_TREE.top/1774*100}%`,width:`${VALLEY_TREE.width/887*100}%`,height:`${VALLEY_TREE.height/1774*100}%`}}/><div className="valley-air"><WindStrokes viewBox="0 0 887 1774" paths={[
      'M25 916 C85 983 170 897 220 930 C273 964 243 1008 291 1024 C355 1048 419 1044 500 1126 C546 1172 548 1188 568 1200',
      'M60 962 C165 1026 205 938 293 977 C353 1004 348 1062 396 1087 C456 1118 522 1144 563 1193',
    ]}/></div></div>
    </div>
    <div className="entry-plane entry-canopy-plane">
    <div className="opening-foreground" data-running="false"><img className="opening-branch" src={`${art}opening-blossom.webp`} alt="" decoding="async"/><div className="opening-air"><WindStrokes viewBox="0 0 887 500" paths={[
      'M25 118 C140 191 258 83 350 105 C405 118 370 169 412 180 C468 197 550 178 593 233 C641 294 618 334 602 411',
      'M180 83 C294 175 387 111 465 148 C519 174 462 205 526 237 C608 278 555 329 570 374 C581 408 587 447 574 492',
    ]}/></div></div>
    </div>
    <div className="petal-stream">{Array.from({length:PETAL_CAPACITY},(_,i)=><span key={i} className="flow-petal"/>)}</div>
    <div className="entry-plane entry-near-plane">
    <div className="foreground-world">
      <div className="foreground-terrain">
        <img className="foreground-landscape" src={`${art}forest-foreground-burned-out.webp`} decoding="async" alt="" />
        <WaterRibbons plane="foreground" />
        <div className="garden-life" data-running="false">
          <div className="campfire-smoke">{Array.from({length:4},(_,i)=><span key={i} style={{"--smoke-delay":`${-i * 2.2}s`, "--smoke-drift":`${-8-i*3}px`, "--smoke-tilt":`${-1-i*.7}deg`} as CSSProperties}/>)}</div>
          <img className="roof-blossom" src={`${art}roof-blossom.webp`} alt="" decoding="async"/>
          <div className="blossom-air"><WindStrokes viewBox="0 0 600 300" paths={['M630 38 C565 66 548 67 523 92 C493 130 523 222 454 229 C389 235 364 164 389 139 C414 114 441 139 431 165 C416 207 294 185 227 168 C130 139 52 90 2 77','M630 59 C555 96 526 75 498 120 C473 162 496 245 425 245 C347 245 354 177 379 165 C415 144 412 202 373 203 C275 213 143 121 2 88']}/></div>
          <div className="furin"><img className="furin-bell" src={`${art}furin-bell.webp`} alt=""/><div className="furin-paper"><div className="furin-paper-frame"/><div className="furin-paper-frame"/></div></div>
          <div className="butterfly-garden">
            {[0,1,2].map(i=><div key={i} className={`garden-butterfly butterfly-${i}`}><div className="butterfly-sprite"/></div>)}
            <img className="garden-blossoms" src={`${art}garden-blossoms.webp`} alt="" decoding="async"/>
          </div>
        </div>
      </div>
      <div className="house-rabbit"><div className="rabbit-sprite" /></div>
    </div>
    </div>
  </div>;
}
