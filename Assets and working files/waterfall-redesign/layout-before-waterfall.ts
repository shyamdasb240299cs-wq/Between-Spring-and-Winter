import { smooth } from "./journey-data";

/** Coordinates refer to the one 1920 × 3840 painting, before cover cropping. */
export function landscapeLayout(width: number, height: number) {
  const worldHeight = Math.max(height * 3.55, width * 2);
  const paintedWidth = worldHeight / 2;
  const cropX = (paintedWidth - width) / 2;
  const x = (u: number) => u * paintedWidth - cropX;
  const travel = .73 * worldHeight - .48 * height;
  const camera = (p: number) => smooth(p, 0, 3.5) * travel;
  const letterCamera = camera(3.15);
  const houseHeight = .24 * worldHeight, houseWidth = houseHeight * .8;
  const houseFloor = .812 * worldHeight;
  const gateSize = .22 * height;
  const rabbitHeight = .044 * worldHeight, rabbitWidth = rabbitHeight * 2 / 3;
  return {
    width, height, worldHeight, paintedWidth, cropX, travel, camera, letterCamera,
    house: { left: x(.84) - .55 * houseWidth, top: houseFloor - houseHeight, width: houseWidth, height: houseHeight },
    gate: { left: x(.605) - gateSize / 2, top: .728 * worldHeight - gateSize * 580 / 600, width: gateSize, height: gateSize },
    rabbit: { left: x(.40) - rabbitWidth / 2, top: .795 * worldHeight - rabbitHeight * 345 / 384, width: rabbitWidth, height: rabbitHeight },
    houseExit: width - (x(.84) - .55 * houseWidth) + height * .04,
  };
}

export function visibleFraction(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  const visibleWidth = Math.max(0, Math.min(x + width, viewportWidth) - Math.max(x, 0));
  const visibleHeight = Math.max(0, Math.min(y + height, viewportHeight) - Math.max(y, 0));
  return visibleWidth * visibleHeight / (width * height);
}

export type RabbitClock = { eating: number; lifting: number };
export const GRAZING_MS = 3600;
export const LIFT_MS = 640;

/** Count time the visitor can actually see the rabbit, including a nav jump. */
export function rabbitFrame(clock: RabbitClock, dt: number, visible: boolean, running: boolean, reduced: boolean) {
  if (reduced) return 7;
  if (visible && running) {
    const eating = Math.min(dt, Math.max(0, GRAZING_MS - clock.eating));
    clock.eating += eating;
    if (clock.eating >= GRAZING_MS) clock.lifting = Math.min(LIFT_MS, clock.lifting + dt - eating);
  }
  if (clock.eating < GRAZING_MS) return Math.floor(clock.eating / 180) % 4;
  return clock.lifting < LIFT_MS ? 4 + Math.min(2, Math.floor(clock.lifting / (LIFT_MS / 3))) : 7;
}
