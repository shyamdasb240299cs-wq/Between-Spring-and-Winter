/** Contact follows actual travel, including strafing; blocked movement is silent. */
export function createFootstepMotion() {
  let x=0,distance=0,walked=0,side=-1,initial=true,movingPreviously=false,gait=0;
  return {
    update(currentX:number,currentDistance:number,enabled:boolean) {
      const movement=Math.hypot(currentX-x,currentDistance-distance);
      x=currentX;distance=currentDistance;
      if(initial){initial=false;return {contact:false,side,bob:0};}
      if(!enabled||movement<.0001){movingPreviously=false;walked=0;return {contact:false,side,bob:0};}
      if(!movingPreviously)walked=1.65-.14;
      movingPreviously=true;walked+=movement;gait+=movement*Math.PI/1.65;
      const contact=walked>=1.65;
      if(contact){walked%=1.65;side=-side;}
      return {contact,side,bob:Math.sin(gait*2)*.009};
    }
  };
}
