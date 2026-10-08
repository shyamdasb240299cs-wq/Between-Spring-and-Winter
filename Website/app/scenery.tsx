"use client";
import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { CLOSE_START, smooth } from "./journey-data";
import { landscapeLayout, rabbitFrame, visibleFraction, type RabbitClock } from "./scenery-layout";
import { waterRoutes, type WaterPlane } from "./water-routes";
import { advanceWind, createWindClock, type WindClock } from "./wind-motion";

const art = "/scene/layers/";

function WaterRibbons({ plane }: { plane: WaterPlane }) {
  return <div className={`water-ribbons ${plane}-water`}>
    {waterRoutes[plane].map(route => <div key={route.id} className="waterfall-motion" data-plane={plane} data-running="false" style={{
      left: `${route.left * 100}%`, top: `${route.top * 100}%`, width: `${route.width * 100}%`, height: `${route.height * 100}%`,
      clipPath: route.clip, "--flow-period": `${route.period}s`, "--flow-delay": `${route.delay}s`, "--flow-alpha": route.opacity,
    } as CSSProperties}><div className="water-flow"/><div className="water-foam"/></div>)}
  </div>;
}

/** Two complete landscape planes; all scenery stays attached to its terrain. */
export default function Scenery({ position, paused, onWindClock }: { position: RefObject<number>; paused: boolean; onWindClock?: (clock:WindClock|null)=>void }) {
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
    const butterflies = Array.from(world.querySelectorAll<HTMLElement>(".garden-butterfly"));
    const garden = world.querySelector<HTMLElement>(".garden-life")!;
    let gardenTime = 0;
    const chime = world.querySelector<HTMLElement>(".furin")!;
    const paper = world.querySelector<HTMLElement>(".furin-paper")!;
    const paperFrames = Array.from(paper.querySelectorAll<HTMLElement>(".furin-paper-frame"));
    const branch = world.querySelector<HTMLElement>(".roof-blossom")!;
    const air = world.querySelector<HTMLElement>(".blossom-air")!;
    const airPaths = Array.from(air.querySelectorAll<SVGPathElement>("path"));
    const petals = Array.from(air.querySelectorAll<HTMLElement>(".wind-petal"));
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
      setMotion(running && active);
      const gardenVisible = visibleFraction(cameraX + layout.foreground.left + layout.foreground.width * .64, layout.foreground.top - foregroundY, layout.foreground.width * .36, layout.foreground.height * .72, layout.width, layout.height) > 0;
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
        petals.forEach((petal,i)=>{
          const travel=((gustAge-i*.22)/(2.3+i*.1))%1;
          const x=(1-travel)*layout.foreground.width*.35;
          const y=(.024+Math.sin(travel*Math.PI)*.1+i*.006)*layout.foreground.height;
          petal.style.transform=`translate3d(${x}px,${y}px,0) rotate(${travel*290+i*80}deg) scaleX(${.65+.35*Math.cos(travel*9)})`;
          petal.style.opacity=String(travel>0?Math.sin(travel*Math.PI):0);
        });
      }
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
        const visibility = skyVisible && !reduced.matches ? "visible" : "hidden";
        if (bird.style.visibility !== visibility) bird.style.visibility = visibility;
        if (!skyVisible || reduced.matches) return;
        if (moved || running) {
          const t = (flightTime / 18 + i * .12) % 1;
          const birdSize = layout.height * (i === 0 ? .06 : .045);
          const x = (.52 + t * .36) * layout.paintedWidth - layout.cropX - birdSize / 2;
          const y = (.11 - Math.sin(t * Math.PI) * .018 + i * .012) * layout.worldHeight - birdSize / 2;
          bird.style.transform = `translate3d(${x}px,${y}px,0)`;
          bird.style.opacity = String(smooth(t, 0, .12) * (1 - smooth(t, .84, 1)));
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
    const visibilityChanged = () => {
      if (document.hidden) { setMotion(false); garden.dataset.running = "false"; }
      last = performance.now();
      wake();
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("scroll",wake,{passive:true});
    reduced.addEventListener("change",wake);
    frame = requestAnimationFrame(tick);
    return () => { disposed = true; onWindClock?.(null); wakeAnimation.current=null; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", visibilityChanged); window.removeEventListener("scroll",wake); reduced.removeEventListener("change",wake); };
  }, [position,onWindClock]);

  return <div className="layered-world" ref={host} aria-hidden="true" data-water-running="false">
    <img className="continuous-landscape" src={`${art}continuous-shrine.webp`} srcSet={`${art}continuous-shrine-small.webp 960w, ${art}continuous-shrine.webp 1920w`} sizes="100vw" fetchPriority="high" alt="" />
    <div className="background-life">
      <WaterRibbons plane="background" />
      <div className="bird-flight bird-one"><div className="bird-sprite" /></div>
      <div className="bird-flight bird-two"><div className="bird-sprite" /></div>
    </div>
    <div className="foreground-world">
      <div className="foreground-terrain">
        <img className="foreground-landscape" src={`${art}forest-foreground-burned-out.webp`} decoding="async" alt="" />
        <WaterRibbons plane="foreground" />
        <div className="garden-life" data-running="false">
          <div className="campfire-smoke">{Array.from({length:4},(_,i)=><span key={i} style={{"--smoke-delay":`${-i * 2.2}s`, "--smoke-drift":`${-8-i*3}px`, "--smoke-tilt":`${-1-i*.7}deg`} as CSSProperties}/>)}</div>
          <img className="roof-blossom" src={`${art}roof-blossom.webp`} alt="" decoding="async"/>
          <div className="blossom-air"><svg viewBox="0 0 600 300" fill="none"><path pathLength="1000" d="M630 38 C565 66 548 67 523 92 C493 130 523 222 454 229 C389 235 364 164 389 139 C414 114 441 139 431 165 C416 207 294 185 227 168 C130 139 52 151 -40 172"/><path pathLength="1000" d="M630 59 C555 96 526 75 498 120 C473 162 496 245 425 245 C347 245 354 177 379 165 C415 144 412 202 373 203 C275 213 143 156 -40 194"/></svg>{[0,1,2].map(i=><span key={i} className="wind-petal"/>)}</div>
          <div className="furin"><img className="furin-bell" src={`${art}furin-bell.webp`} alt=""/><div className="furin-paper"><div className="furin-paper-frame"/><div className="furin-paper-frame"/></div></div>
          <div className="butterfly-garden">
            {[0,1,2].map(i=><div key={i} className={`garden-butterfly butterfly-${i}`}><div className="butterfly-sprite"/></div>)}
            <img className="garden-blossoms" src={`${art}garden-blossoms.webp`} alt="" decoding="async"/>
          </div>
        </div>
      </div>
      <div className="house-rabbit"><div className="rabbit-sprite" /></div>
    </div>
  </div>;
}
