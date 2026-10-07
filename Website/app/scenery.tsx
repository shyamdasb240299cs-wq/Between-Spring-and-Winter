"use client";
import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { CLOSE_START, smooth } from "./journey-data";
import { landscapeLayout, rabbitFrame, visibleFraction, type RabbitClock } from "./scenery-layout";
import { waterRoutes, type WaterPlane } from "./water-routes";
import { advanceWind, createWindClock } from "./wind-motion";

const art = "/scene/layers/";

function WaterRibbons({ plane }: { plane: WaterPlane }) {
  return <div className={`water-ribbons ${plane}-water`}>
    {waterRoutes[plane].map(route => <div key={route.id} className="waterfall-motion" data-plane={plane} data-running="false" style={{
      left: `${route.left * 100}%`, top: `${route.top * 100}%`, width: `${route.width * 100}%`, height: `${route.height * 100}%`,
      clipPath: route.clip, "--flow-period": `${route.period}s`, "--flow-delay": `${route.delay}s`, "--flow-alpha": route.opacity,
    } as CSSProperties}><div className="water-flow" /></div>)}
  </div>;
}

/** Two complete landscape planes; all scenery stays attached to its terrain. */
export default function Scenery({ position, paused }: { position: RefObject<number>; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null), pause = useRef(paused);
  useEffect(() => { pause.current = paused; }, [paused]);
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
    const air = world.querySelector<HTMLElement>(".furin-air")!;
    const airPaths = Array.from(air.querySelectorAll<SVGPathElement>("path"));
    const petals = Array.from(air.querySelectorAll<HTMLElement>(".wind-petal"));
    const wind = createWindClock();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const portrait = matchMedia("(max-width: 1024px) and (orientation: portrait)");
    let frame = 0, previous = -1, last = performance.now(), flightTime = 0, lastWing = -1;
    let rabbitCell = -1, disposed = false;
    let rabbitReady = false;
    const rabbitImage = new Image();
    rabbitImage.src = `${art}rabbit-polished.webp`;
    rabbitImage.decode().then(() => { if (!disposed) rabbitReady = true; }).catch(() => {});
    let layout = landscapeLayout(world.clientWidth, world.clientHeight);
    const size = () => {
      layout = landscapeLayout(world.clientWidth, world.clientHeight);
      for (const layer of [background, backgroundLife, foreground]) layer.style.height = layout.worldHeight + "px";
      for (const [element, bounds] of [[terrain, layout.foreground], [rabbit, layout.rabbit], [backgroundWater,layout.background]] as const) {
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
    };
    size(); const observer = new ResizeObserver(size); observer.observe(world);
    const rabbitClock: RabbitClock = { eating: 0, lifting: 0 };
    const setMotion = (running: boolean) => {
      const value = String(running);
      if (world.dataset.waterRunning !== value) world.dataset.waterRunning = value;
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 80); last = now;
      if (document.hidden || portrait.matches) { setMotion(false); garden.dataset.running = "false"; return; }
      const p = position.current, sceneryProgress = Math.min(p, 5.25);
      const moved = Math.abs(sceneryProgress - previous) > .0001;
      const active = p < 5.75 || p > CLOSE_START + 2.6;
      const running = !pause.current && !reduced.matches;
      const cameraY = layout.camera(p);
      const foregroundDepth = (cameraY - layout.letterCamera) * .035;
      const foregroundY = cameraY + foregroundDepth;
      const skyVisible = cameraY < layout.worldHeight * .14 + layout.height * .06;
      setMotion(running && active);
      const gardenVisible = visibleFraction(layout.foreground.left + layout.foreground.width * .76, layout.foreground.top + layout.foreground.height * .2 - foregroundY, layout.foreground.width * .24, layout.foreground.height * .52, layout.width, layout.height) > 0;
      garden.dataset.running = String(running && active && gardenVisible);
      if (running && active && gardenVisible) {
        gardenTime += dt / 1000;
        advanceWind(wind,dt/1000);
        chime.style.transform = `rotate(${wind.angle}rad)`;
        paper.style.transform = `rotate(${wind.paper*.12}rad)`;
        const bend = Math.max(0,Math.min(15,7.5+wind.paper*8));
        const first = Math.floor(bend), mix = bend-first;
        paperFrames.forEach((element,i) => {
          const cell = i ? Math.min(15,first+1) : first;
          element.style.backgroundPosition = `${cell%4/3*100}% ${Math.floor(cell/4)/3*100}%`;
          element.style.opacity = String(i ? mix : 1-mix);
        });
        air.style.opacity = String(Math.abs(wind.wind)*.8);
        air.style.transform = wind.wind < 0 ? "scaleX(-1)" : "scaleX(1)";
        airPaths.forEach((path,i)=>path.style.strokeDashoffset=String(-wind.time*(68+i*13)));
        petals.forEach((petal,i)=>{
          const travel=(wind.time/(3.8+i*.5)+i*.31)%1;
          petal.style.left=`${travel*100}%`;
          petal.style.top=`${35+i*16+Math.sin(travel*6+i)*12}%`;
          petal.style.transform=`rotate(${travel*290+i*80}deg) scaleX(${.65+.35*Math.cos(travel*9)})`;
          petal.style.opacity=String(Math.sin(travel*Math.PI));
        });
      }
      if (gardenVisible && (moved || running || reduced.matches)) {
        butterflies.forEach((butterfly, i) => {
          const t = gardenTime * (.45 + i * .07) + i * 2.2;
          const x = 22 + i * 21 + Math.sin(t) * (17 - i * 2);
          const y = 43 + Math.sin(t * 1.7 + i) * 22 + Math.cos(t * .6) * 7;
          const tilt = Math.cos(t) * 16;
          butterfly.style.left = `${x}%`; butterfly.style.top = `${y}%`;
          butterfly.style.transform = `translate3d(0,0,0) rotate(${tilt}deg)`;
          const wing = reduced.matches ? 0 : Math.floor(gardenTime * 13 + i * 2) % 6;
          (butterfly.firstElementChild as HTMLElement).style.backgroundPosition = `${wing % 3 / 2 * 100}% ${Math.floor(wing / 3) * 100}%`;
        });
      }
      for (const bounds of waterBounds) {
        const y = bounds.top - (bounds.plane === "background" ? cameraY : foregroundY);
        const value = String(running && active && visibleFraction(bounds.left, y, bounds.width, bounds.height, layout.width, layout.height) > 0);
        if (bounds.element.dataset.running !== value) bounds.element.dataset.running = value;
      }
      if (!moved && !active && !skyVisible) return;
      if (moved) {
        background.style.transform = backgroundLife.style.transform = `translate3d(0,${-cameraY}px,0)`;
        foreground.style.transform = `translate3d(0,${-foregroundY}px,0)`;
        world.dataset.scene = p < 1.2 ? "sunset" : p < 2.64 ? "valley" : p < 3.65 ? "shrine" : "waterfall";
        world.dataset.ready = "true";
        previous = sceneryProgress;
      }
      if (p < 2.3) { rabbitClock.eating = 0; rabbitClock.lifting = 0; }
      const rabbitVisible = rabbitReady && active && visibleFraction(layout.rabbit.left, layout.rabbit.top - foregroundY, layout.rabbit.width, layout.rabbit.height, layout.width, layout.height) >= .8;
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
    const visibilityChanged = () => {
      if (document.hidden) { setMotion(false); garden.dataset.running = "false"; }
      last = performance.now();
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    frame = requestAnimationFrame(tick);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", visibilityChanged); };
  }, [position]);

  return <div className="layered-world" ref={host} aria-hidden="true" data-water-running="false">
    <img className="continuous-landscape" src={`${art}continuous-shrine.webp`} srcSet={`${art}continuous-shrine-small.webp 960w, ${art}continuous-shrine.webp 1920w`} sizes="100vw" fetchPriority="high" alt="" />
    <div className="background-life">
      <WaterRibbons plane="background" />
      <div className="bird-flight bird-one"><div className="bird-sprite" /></div>
      <div className="bird-flight bird-two"><div className="bird-sprite" /></div>
    </div>
    <div className="foreground-world">
      <div className="foreground-terrain">
        <img className="foreground-landscape" src={`${art}forest-foreground.webp`} decoding="async" alt="" />
        <WaterRibbons plane="foreground" />
        <div className="garden-life" data-running="false">
          <div className="campfire"><div className="campfire-shadow"/><div className="campfire-glow"/><img src={`${art}campfire.webp`} alt="" decoding="async"/><div className="campfire-smoke">{Array.from({length:3},(_,i)=><span key={i} style={{"--smoke-delay":`${-i * 2.4}s`, "--smoke-drift":`${i % 2 ? 10 : -6}px`, "--smoke-tilt":`${i % 2 ? 3 : -2}deg`} as CSSProperties}/>)}</div></div>
          <div className="furin-air"><svg viewBox="0 0 400 150" fill="none"><path d="M-100 81 C20 123 99 22 185 57 S292 103 500 31"/><path d="M-100 106 C25 160 129 64 210 86 S328 128 500 53"/><path d="M-100 44 C15 96 112 0 190 29 S304 65 500 4"/></svg>{[0,1,2].map(i=><span key={i} className="wind-petal"/>)}</div>
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
