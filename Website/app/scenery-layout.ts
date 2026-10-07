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
  // Place the rabbit on the mossy ledge at the left of the falls.  Its feet
  // use the same baseline as the terrain so it belongs to the painting.
  const rabbitHeight = .034 * worldHeight, rabbitWidth = rabbitHeight;
  return {
    width, height, worldHeight, paintedWidth, cropX, travel, camera, letterCamera,
    background: { left: -cropX, top: 0, width: paintedWidth, height: worldHeight },
    foreground: { left: -cropX, top: foregroundTop, width: paintedWidth, height: paintedWidth },
    rabbit: { left: x(410 / 1254) - rabbitWidth / 2, top: foregroundTop + 800 / 1254 * paintedWidth - rabbitHeight * 220 / 256, width: rabbitWidth, height: rabbitHeight },
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
