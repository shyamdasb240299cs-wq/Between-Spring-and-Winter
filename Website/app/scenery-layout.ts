import { smooth } from "./journey-data";

/** Two coherent terrain paintings share one camera and the same source scale. */
export function landscapeLayout(width: number, height: number) {
  const worldHeight = Math.max(height * 3.55, width * 2);
  const paintedWidth = worldHeight / 2;
  const cropX = (paintedWidth - width) / 2;
  const x = (u: number) => u * paintedWidth - cropX;
  const travel = .73 * worldHeight - .48 * height;
  const camera = (p: number) => smooth(p, 0, 3.5) * travel + smooth(p, 3.3, 4.35) * worldHeight * .14;
  const letterCamera = camera(3.15);
  const foregroundTop = .59 * worldHeight;
  const rabbitHeight = .017 * worldHeight, rabbitWidth = rabbitHeight;
  const pandaSize = .063 * worldHeight;
  return {
    width, height, worldHeight, paintedWidth, cropX, travel, camera, letterCamera,
    background: { left: -cropX, top: 0, width: paintedWidth, height: worldHeight },
    foreground: { left: -cropX, top: foregroundTop, width: paintedWidth, height: paintedWidth },
    // Both feet anchors are in the foreground painting: veranda and dry riverbank.
    rabbit: { left: x(985 / 1254) - rabbitWidth / 2, top: foregroundTop + 552 / 1254 * paintedWidth - rabbitHeight * 220 / 256, width: rabbitWidth, height: rabbitHeight },
    panda: { left: x(1030 / 1254) - pandaSize / 2, top: foregroundTop + 826 / 1254 * paintedWidth - pandaSize * 220 / 256, width: pandaSize, height: pandaSize },
    escapeDistance: .25 * paintedWidth,
    escapeDrop: .036 * paintedWidth,
  };
}

export function visibleFraction(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  const visibleWidth = Math.max(0, Math.min(x + width, viewportWidth) - Math.max(x, 0));
  const visibleHeight = Math.max(0, Math.min(y + height, viewportHeight) - Math.max(y, 0));
  return visibleWidth * visibleHeight / (width * height);
}

export type RabbitClock = { eating: number; lifting: number };
export const GRAZING_MS = 3600;
export const LIFT_MS = 450;

/** Count time the visitor can actually see the rabbit, including a nav jump. */
export function rabbitFrame(clock: RabbitClock, dt: number, visible: boolean, running: boolean, reduced: boolean) {
  if (reduced) return 11;
  if (visible && running) {
    const eating = Math.min(dt, Math.max(0, GRAZING_MS - clock.eating));
    clock.eating += eating;
    if (clock.eating >= GRAZING_MS) clock.lifting = Math.min(LIFT_MS, clock.lifting + dt - eating);
  }
  if (clock.eating < GRAZING_MS) return Math.floor(clock.eating / 90) % 8;
  return clock.lifting < LIFT_MS ? 8 + Math.min(2, Math.floor(clock.lifting / (LIFT_MS / 3))) : 11;
}

export type PandaClock = { eating: number; reaction: number; escape: number; phase: "eating" | "standing" | "running" | "gone" };
export const PANDA_EATING_MS = 2400;
export const PANDA_STANDING_MS = 1800;
export const PANDA_ESCAPE_MS = 3000;
export const PANDA_LAUNCH_MS = 420;

/** A short acceleration followed by a steady lope, with no braking at the exit. */
export function pandaTravel(elapsed: number) {
  const t = Math.min(PANDA_ESCAPE_MS, Math.max(0, elapsed));
  return t < PANDA_LAUNCH_MS ? t * t / (2 * PANDA_LAUNCH_MS) : t - PANDA_LAUNCH_MS / 2;
}

export function pandaPose(clock: PandaClock, dt: number, visible: boolean, running: boolean, approached: boolean, reduced: boolean) {
  if (reduced) return { frame: 0, progress: 0, phase: "eating" as const };
  if (visible && running && clock.phase !== "gone") {
    let remaining = dt;
    if (clock.phase === "eating") {
      const needed = Math.max(0, PANDA_EATING_MS - clock.eating);
      if (approached && remaining >= needed) {
        clock.eating += needed;
        remaining -= needed;
        clock.phase = "standing";
      } else {
        clock.eating += remaining;
        remaining = 0;
      }
    }
    if (clock.phase === "standing") {
      const consumed = Math.min(remaining, PANDA_STANDING_MS - clock.reaction);
      clock.reaction += consumed;
      remaining -= consumed;
      if (clock.reaction >= PANDA_STANDING_MS) clock.phase = "running";
    }
    if (clock.phase === "running") {
      clock.escape = Math.min(PANDA_ESCAPE_MS, clock.escape + remaining);
      if (clock.escape >= PANDA_ESCAPE_MS) clock.phase = "gone";
    }
  }
  const travel = pandaTravel(clock.escape);
  const frame = clock.phase === "eating" ? Math.floor(clock.eating / 140) % 8
    // Give the visitor time to read the look-up before the six rising/turning poses.
    : clock.phase === "standing" ? clock.reaction < 720 ? 8 + Math.floor(clock.reaction / 360) : 10 + Math.min(5, Math.floor((clock.reaction - 720) / 180))
    : Math.floor(travel / 60) % 8;
  return { frame, progress: travel / pandaTravel(PANDA_ESCAPE_MS), phase: clock.phase };
}
