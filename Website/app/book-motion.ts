/** Limit angular speed after a fast scroll, then stop exactly at the target. */
export function settleBookYaw(current: number, target: number, dt: number, reduced: boolean) {
  if (reduced) return target;
  const delta = (target - current) * (1 - Math.exp(-dt / .12));
  const next = current + Math.min(dt * 3.8, Math.max(-dt * 3.8, delta));
  return Math.abs(next - target) < .0001 ? target : next;
}

export const CLOSED_BOOK_CENTER = { x: -2.86, z: -.02135 };

/** Bound the complete presentation, including a leaf rising toward the camera. */
export function bookViewport(width:number,height:number,reservedHeight:number){
  const readWidth=Math.min(width-22,Math.max(80,height-reservedHeight)*6.06/4.5);
  const readHeight=readWidth*4.5/6.06;
  const turnHeight=readHeight/(1-.101*readHeight/height);
  const left=Math.max(0,Math.floor((width-readWidth)/2-40));
  const right=Math.min(width,Math.ceil(Math.max((width+readWidth)/2+40,width*.74+height*.22+40)));
  const top=Math.max(0,Math.floor(Math.min(44,(height-Math.max(turnHeight,height*.8))/2-12)));
  return{left,top,width:right-left,height:height-top*2};
}
