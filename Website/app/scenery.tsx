"use client";
import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { CLOSE_START, smooth } from "./journey-data";
import { landscapeLayout, pandaPose, rabbitFrame, visibleFraction, type PandaClock, type RabbitClock } from "./scenery-layout";
import { waterRoutes, type WaterPlane } from "./water-routes";

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
    const panda = world.querySelector<HTMLElement>(".panda-actor")!;
    const pandaSprite = panda.firstElementChild as HTMLElement;
    const birds = Array.from(world.querySelectorAll<HTMLElement>(".bird-flight"));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const portrait = matchMedia("(max-width: 1024px) and (orientation: portrait)");
    let frame = 0, previous = -1, last = performance.now(), flightTime = 0, lastWing = -1;
    let rabbitCell = -1, pandaCell = "", pandaProgress = -1, disposed = false;
    let rabbitReady = false, pandaReady = false;
    const rabbitImage = new Image(), pandaImage = new Image(), pandaRunImage = new Image();
    rabbitImage.src = `${art}rabbit-polished.webp`; pandaImage.src = `${art}panda-encounter.webp`; pandaRunImage.src = `${art}panda-run-refined.webp`;
    rabbitImage.decode().then(() => { if (!disposed) rabbitReady = true; }).catch(() => {});
    Promise.all([pandaImage.decode(),pandaRunImage.decode()]).then(() => { if (!disposed) pandaReady = true; }).catch(() => {});
    let layout = landscapeLayout(world.clientWidth, world.clientHeight);
    const size = () => {
      layout = landscapeLayout(world.clientWidth, world.clientHeight);
      for (const layer of [background, backgroundLife, foreground]) layer.style.height = layout.worldHeight + "px";
      for (const [element, bounds] of [[terrain, layout.foreground], [rabbit, layout.rabbit], [panda, layout.panda], [backgroundWater,layout.background]] as const) {
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
      previous = -1; pandaProgress = -1;
    };
    size(); const observer = new ResizeObserver(size); observer.observe(world);
    const rabbitClock: RabbitClock = { eating: 0, lifting: 0 };
    const pandaClock: PandaClock = { eating: 0, reaction: 0, escape: 0, phase: "eating" };
    const setMotion = (running: boolean) => {
      const value = String(running);
      if (world.dataset.waterRunning !== value) world.dataset.waterRunning = value;
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 80); last = now;
      if (document.hidden || portrait.matches) { setMotion(false); return; }
      const p = position.current, sceneryProgress = Math.min(p, 5.25);
      const moved = Math.abs(sceneryProgress - previous) > .0001;
      const active = p < 5.75 || p > CLOSE_START + 2.6;
      const running = !pause.current && !reduced.matches;
      const cameraY = layout.camera(p);
      const foregroundDepth = (cameraY - layout.letterCamera) * .035;
      const foregroundY = cameraY + foregroundDepth;
      const skyVisible = cameraY < layout.worldHeight * .14 + layout.height * .06;
      setMotion(running && active);
      for (const bounds of waterBounds) {
        const y = bounds.top - (bounds.plane === "background" ? cameraY : foregroundY);
        const value = String(running && active && visibleFraction(bounds.left, y, bounds.width, bounds.height, layout.width, layout.height) > 0);
        if (bounds.element.dataset.running !== value) bounds.element.dataset.running = value;
      }
      if(!active){pandaClock.phase="gone";if(panda.style.visibility!=="hidden")panda.style.visibility="hidden";}
      if (!moved && !active && !skyVisible) return;
      if (moved) {
        background.style.transform = backgroundLife.style.transform = `translate3d(0,${-cameraY}px,0)`;
        foreground.style.transform = `translate3d(0,${-foregroundY}px,0)`;
        world.dataset.scene = p < 1.2 ? "sunset" : p < 2.64 ? "valley" : p < 3.65 ? "shrine" : "waterfall";
        world.dataset.ready = "true";
        previous = sceneryProgress;
      }
      if (p < 2.3) { rabbitClock.eating = 0; rabbitClock.lifting = 0; }
      if (p < 3.3) { pandaClock.eating = 0; pandaClock.reaction = 0; pandaClock.escape = 0; pandaClock.phase = "eating"; }
      const rabbitVisible = rabbitReady && active && visibleFraction(layout.rabbit.left, layout.rabbit.top - foregroundY, layout.rabbit.width, layout.rabbit.height, layout.width, layout.height) >= .8;
      const cell = rabbitFrame(rabbitClock, dt, rabbitVisible, running, reduced.matches);
      if (cell !== rabbitCell) {
        rabbitSprite.style.backgroundPosition = `${cell % 4 / 3 * 100}% ${Math.floor(cell / 4) / 2 * 100}%`;
        rabbitSprite.dataset.pose = cell < 8 ? "eating" : cell < 11 ? "looking-up" : "watching";
        rabbitCell = cell;
      }
      const rabbitVisibility=rabbitReady ? "visible" : "hidden";
      if(rabbit.style.visibility!==rabbitVisibility)rabbit.style.visibility=rabbitVisibility;
      // Count visible honey-eating time before the approach response can begin.
      const pandaVisible = pandaReady && active && (pandaClock.phase!=="eating" || visibleFraction(layout.panda.left, layout.panda.top - foregroundY, layout.panda.width, layout.panda.height, layout.width, layout.height) >= .25);
      const pose = pandaPose(pandaClock, dt, pandaVisible, running, p >= 3.72, reduced.matches);
      const pandaKey=`${pose.phase}:${pose.frame}`;
      if (pandaKey !== pandaCell) {
        pandaSprite.style.backgroundPosition = `${pose.frame % 4 / 3 * 100}% ${Math.floor(pose.frame / 4) / (pose.phase==="running"?1:3) * 100}%`;
        pandaCell = pandaKey;
      }
      if (pose.progress !== pandaProgress) {
        panda.style.transform = `translate3d(${pose.progress * layout.escapeDistance}px,${pose.progress * layout.escapeDrop}px,0)`;
        pandaProgress = pose.progress;
      }
      if (panda.dataset.pose !== pose.phase) panda.dataset.pose = pose.phase;
      const pandaVisibility = pandaReady && active && pandaClock.phase !== "gone" ? "visible" : "hidden";
      if (panda.style.visibility !== pandaVisibility) panda.style.visibility = pandaVisibility;
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
    frame = requestAnimationFrame(tick);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); };
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
      </div>
      <div className="house-rabbit"><div className="rabbit-sprite" /></div>
      <div className="panda-actor" data-pose="eating"><div className="panda-sprite" /></div>
    </div>
  </div>;
}
