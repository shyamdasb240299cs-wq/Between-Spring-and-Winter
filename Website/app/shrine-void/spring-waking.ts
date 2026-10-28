/** Small first-person fixation changes, in radians; never alters the saved view. */
export const SPRING_WAKE_MS=3200;
const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
export function springWakingPose(seconds:number,reduced=false){
  if(reduced)return {pitch:0,yaw:0,roll:0};
  const t=Math.max(0,seconds),settle=1-smooth(2.35,3.2,t);
  return {
    pitch:(-.055*(1-smooth(.2,2.6,t))+.009*smooth(.82,1.03,t)-.009*smooth(1.45,1.7,t))*settle,
    yaw:(-.018*smooth(.45,.67,t)+.034*smooth(1.1,1.28,t)-.016*smooth(1.85,2.15,t))*settle,
    roll:-.008*(1-smooth(.3,2.8,t))*settle,
  };
}
