import { bookSheets, CLOSED_REST, CLOSE_START, FLIP_START, READ_START, clamp, smooth } from './journey-data';

export const FLIP_SECONDS = .82;
export const COVER_SECONDS = .40;
type Phase = 'intro' | 'forward' | 'closed' | 'reverse';

/** Scroll chooses a direction; elapsed time owns every intermediate page. */
export class BookSequence {
  phase:Phase='intro';
  position=4.2;
  cursor=0;
  private elapsed=0;
  get active(){return this.phase==='forward'||this.phase==='reverse';}
  get lockAt(){return this.phase==='forward'?FLIP_START:this.phase==='reverse'?CLOSED_REST:null;}

  step(requested:number,dt:number,ready:boolean,reduced=false):number|null{
    if(!this.active){
      if(this.phase==='intro'){
        const target=Math.min(requested,FLIP_START);
        this.position=reduced?target:this.position+Math.sign(target-this.position)*Math.min(Math.abs(target-this.position),dt*6);
        this.cursor=0;
        if(requested>=FLIP_START&&this.position>=READ_START&&ready){this.phase='forward';this.elapsed=0;}
      }else{
        this.position=Math.max(CLOSED_REST,requested);this.cursor=bookSheets.length;
        if(requested<CLOSED_REST-.10){this.phase='reverse';this.elapsed=0;}
      }
      if(!this.active)return null;
    }
    this.elapsed+=dt;
    const total=FLIP_SECONDS+COVER_SECONDS;
    const time=reduced?total:this.elapsed;
    if(this.phase==='forward'){
      this.cursor=bookSheets.length*clamp(time/FLIP_SECONDS);
      this.position=time<FLIP_SECONDS?FLIP_START:CLOSE_START+(CLOSED_REST-CLOSE_START)*smooth(time,FLIP_SECONDS,total);
      if(time>=total){this.phase='closed';this.cursor=bookSheets.length;this.position=CLOSED_REST;return CLOSED_REST;}
    }else{
      this.position=CLOSE_START+(CLOSED_REST-CLOSE_START)*(1-smooth(time,0,COVER_SECONDS));
      this.cursor=bookSheets.length*(1-clamp((time-COVER_SECONDS)/FLIP_SECONDS));
      if(time>=COVER_SECONDS)this.position=READ_START;
      if(time>=total){this.phase='intro';this.cursor=0;this.position=READ_START;return READ_START;}
    }
    return null;
  }
}
