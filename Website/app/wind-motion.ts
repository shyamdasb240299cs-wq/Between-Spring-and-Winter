/** A damped hanging bell and a lighter, flexible paper tail, driven by gusts. */
export type WindClock = {
  time: number; angle: number; velocity: number; paper: number; paperVelocity: number;
  start: number; duration: number; strength: number; seed: number; wind: number;
};
export function createWindClock(): WindClock {
  return {time:0,angle:0,velocity:0,paper:0,paperVelocity:0,start:1.5,duration:3.8,strength:.75,seed:431,wind:0};
}
function random(clock: WindClock) {
  clock.seed = (Math.imul(clock.seed,1664525)+1013904223) >>> 0;
  return clock.seed / 4294967296;
}
export function advanceWind(clock: WindClock, seconds: number) {
  const steps = Math.max(1,Math.ceil(seconds*120)), h = seconds/steps;
  for (let i=0;i<steps;i++) {
    clock.time += h;
    if (clock.time > clock.start+clock.duration) {
      clock.start = clock.time+3+random(clock)*7;
      clock.duration = 2.8+random(clock)*3;
      clock.strength = (.45+random(clock)*.5)*(random(clock)>.24?1:-1);
    }
    const phase = (clock.time-clock.start)/clock.duration;
    clock.wind = phase>0&&phase<1 ? clock.strength*Math.sin(Math.PI*phase)**2*(.92+.08*Math.sin(phase*18)) : 0;
    // Gravity restores the bell; drag removes energy after each breeze.
    clock.velocity += (clock.wind*2.8-18*Math.sin(clock.angle)-2.1*clock.velocity)*h;
    clock.angle += clock.velocity*h;
    // The light paper bends more, with delayed response to the bell and air.
    clock.paperVelocity += (clock.wind*22-clock.velocity*8-25*clock.paper-5*clock.paperVelocity)*h;
    clock.paper += clock.paperVelocity*h;
  }
}
