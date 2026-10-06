"use client";
import { useEffect, useRef, type RefObject } from "react";
import { CLOSE_START, smooth } from "./journey-data";
import { landscapeLayout, rabbitFrame, visibleFraction, type RabbitClock } from "./scenery-layout";

const art = "/scene/layers/";

/** A continuous painting with foregrounds grounded in its terrain coordinates. */
export default function Scenery({ position, paused }: { position: RefObject<number>; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null), pause = useRef(paused);
  useEffect(() => { pause.current = paused; }, [paused]);
  useEffect(() => {
    const world = host.current!;
    const background = world.querySelector<HTMLElement>(".continuous-landscape")!;
    const architecture = world.querySelector<HTMLElement>(".architecture-world")!;
    const birdWorld = world.querySelector<HTMLElement>(".bird-world")!;
    const house = world.querySelector<HTMLElement>(".house-layer")!;
    const shrine = world.querySelector<HTMLElement>(".torii-layer")!;
    const forestRabbit = world.querySelector<HTMLElement>(".forest-rabbit")!;
    const canopy = world.querySelector<HTMLElement>(".canopy-layer")!;
    const rabbits = Array.from(world.querySelectorAll<HTMLElement>(".rabbit-sprite"));
    const birds = Array.from(world.querySelectorAll<HTMLElement>(".bird-flight"));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const portrait = matchMedia("(max-width: 1024px) and (orientation: portrait) and (pointer: coarse)");
    let frame = 0, previous = -1, last = performance.now(), time = 0, lastWing = -1;
    let layout = landscapeLayout(world.clientWidth, world.clientHeight);
    const size = () => {
      layout = landscapeLayout(world.clientWidth, world.clientHeight);
      for (const layer of [background, architecture, birdWorld]) layer.style.height = layout.worldHeight + "px";
      for (const [element, bounds] of [[house, layout.house], [shrine, layout.gate], [forestRabbit, layout.rabbit]] as const) {
        element.style.left = bounds.left + "px"; element.style.top = bounds.top + "px";
        element.style.width = bounds.width + "px"; element.style.height = bounds.height + "px";
      }
      previous = -1;
    };
    size(); const observer = new ResizeObserver(size); observer.observe(world);
    const clocks: RabbitClock[] = [{ eating: 0, lifting: 0 }, { eating: 0, lifting: 0 }];
    const cells = [-1, -1];
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 80); last = now;
      if (document.hidden || portrait.matches) return;
      const p = position.current, sceneryProgress = Math.min(p, 5.1);
      const moved = Math.abs(sceneryProgress - previous) > .0001;
      const active = p < 5.25 || p > CLOSE_START + 2.6;
      const running = !pause.current && !reduced.matches;
      const cameraY = layout.camera(p);
      const skyVisible = cameraY < layout.worldHeight * .14 + layout.height * .06;
      if (!moved && !active && !skyVisible) return;
      const depth = cameraY - layout.letterCamera;
      // Nearby scenery travels a little faster; each layer shares a terrain anchor.
      const passHouse = smooth(p, 3.78, 4.35);
      const houseX = passHouse * layout.houseExit;
      const houseY = -depth * .045 - passHouse * layout.height * .06;
      const shrineY = -depth * .012;
      const rabbitY = -depth * .065;
      const rabbitOpacity = smooth(p, 3.9, 4.08);
      if (moved) {
        const cameraTransform = `translate3d(0,${-cameraY}px,0)`;
        background.style.transform = architecture.style.transform = birdWorld.style.transform = cameraTransform;
        house.style.transform = `translate3d(${houseX}px,${houseY}px,0)`;
        shrine.style.transform = `translate3d(0,${shrineY}px,0)`;
        forestRabbit.style.transform = `translate3d(0,${rabbitY}px,0)`;
        forestRabbit.style.opacity = String(rabbitOpacity);
        canopy.style.opacity = String(smooth(p, 2.7, 3.6) * .45);
        canopy.style.transform = `translate3d(${-(Math.min(p, 5.1) - 3.15) * 1.2}%,${-depth * .09}px,0)`;
        world.dataset.scene = p < 1.2 ? "sunset" : p < 2.64 ? "valley" : p < 4 ? "house" : "shrine";
        previous = sceneryProgress;
      }
      const porch = layout.house;
      const porchHeight = porch.height * .18, porchWidth = porchHeight * 2 / 3;
      const visible = [
        active && visibleFraction(porch.left + houseX + porch.width * .445, porch.top + porch.height * .573 - cameraY + houseY, porchWidth, porchHeight, layout.width, layout.height) >= .8,
        active && rabbitOpacity >= .95 && visibleFraction(layout.rabbit.left, layout.rabbit.top - cameraY + rabbitY, layout.rabbit.width, layout.rabbit.height, layout.width, layout.height) >= .8,
      ];
      rabbits.forEach((rabbit, i) => {
        if (p < (i === 0 ? 2.35 : 3.55)) { clocks[i].eating = 0; clocks[i].lifting = 0; }
        const cell = rabbitFrame(clocks[i], dt, visible[i], running, reduced.matches);
        if (cell === cells[i]) return;
        rabbit.style.backgroundPosition = `${cell / 7 * 100}% 0`;
        rabbit.dataset.pose = cell < 4 ? "eating" : cell < 7 ? "looking-up" : "watching";
        cells[i] = cell;
      });
      // A short flight belongs to this sky patch, so scrolling carries it away.
      if (running && skyVisible) time += dt / 1000;
      const wingTick = Math.floor(time * 7);
      birds.forEach((bird, i) => {
        const visibility = skyVisible && !reduced.matches ? "visible" : "hidden";
        if (bird.style.visibility !== visibility) bird.style.visibility = visibility;
        if (!skyVisible || reduced.matches) return;
        if (moved || running) {
          const t = (time / 18 + i * .12) % 1;
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
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [position]);

  return <div className="layered-world" ref={host} aria-hidden="true">
    <img className="continuous-landscape" src={`${art}continuous-world.webp`} srcSet={`${art}continuous-world-small.webp 960w, ${art}continuous-world.webp 1920w`} sizes="100vw" fetchPriority="high" alt="" />
    <div className="bird-world">
      <div className="bird-flight bird-one"><div className="bird-sprite" /></div>
      <div className="bird-flight bird-two"><div className="bird-sprite" /></div>
    </div>
    <div className="architecture-world">
      <div className="house-layer">
        <img className="house-art" src={`${art}house.webp`} decoding="async" alt="" />
        <img className="house-ground" src={`${art}grounding-bank.webp`} decoding="async" alt="" />
        <div className="porch-rabbit"><div className="rabbit-sprite" /></div>
      </div>
      <img className="torii-layer" src={`${art}torii.webp`} decoding="async" alt="" />
      <div className="forest-rabbit"><div className="rabbit-sprite" /></div>
    </div>
    <img className="canopy-layer" src={`${art}canopy.webp`} decoding="async" alt="" />
  </div>;
}
