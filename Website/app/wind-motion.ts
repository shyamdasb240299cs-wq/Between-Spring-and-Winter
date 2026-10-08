/** A damped hanging bell and a lighter, flexible paper tail, driven by gusts. */
export type WindClock = {
  time: number; angle: number; velocity: number; paper: number; paperVelocity: number;
  start: number; duration: number; strength: number; seed: number; wind: number; air: number;
  branch: number; branchVelocity: number;
};
export function createWindClock(): WindClock {
  return {time:0,angle:0,velocity:0,paper:0,paperVelocity:0,start:1.5,duration:4.2,strength:-.75,seed:431,wind:0,air:0,branch:0,branchVelocity:0};
}
export const BELL_WIND_DELAY=1.25;
function random(clock: WindClock) {
  clock.seed = (Math.imul(clock.seed,1664525)+1013904223) >>> 0;
  return clock.seed / 4294967296;
}
export function advanceWind(clock: WindClock, seconds: number) {
  const steps = Math.max(1,Math.ceil(seconds*120)), h = seconds/steps;
  for (let i=0;i<steps;i++) {
    clock.time += h;
    if (clock.time > clock.start+clock.duration+BELL_WIND_DELAY) {
      clock.start = clock.time+3+random(clock)*7;
      clock.duration = 3.5+random(clock)*2.5;
      clock.strength = -(.45+random(clock)*.5);
    }
    const envelope = (time: number) => {
      const phase = (time-clock.start)/clock.duration;
      return phase>0&&phase<1 ? clock.strength*Math.sin(Math.PI*phase)**2*(.92+.08*Math.sin(phase*18)) : 0;
    };
    // The breeze crosses the garden before reaching the suspended bell.
    clock.air = envelope(clock.time);
    clock.wind = envelope(clock.time-BELL_WIND_DELAY);
    clock.branchVelocity += (clock.air*1.8-32*clock.branch-9*clock.branchVelocity)*h;
    clock.branch += clock.branchVelocity*h;
    // Gravity restores the bell; drag removes energy after each breeze.
    clock.velocity += (clock.wind*2.8-18*Math.sin(clock.angle)-7.6*clock.velocity)*h;
    clock.angle += clock.velocity*h;
    // The light paper bends more, with delayed response to the bell and air.
    clock.paperVelocity += (clock.wind*22-clock.velocity*8-25*clock.paper-8.2*clock.paperVelocity)*h;
    clock.paper += clock.paperVelocity*h;
  }
}
