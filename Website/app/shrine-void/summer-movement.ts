import { createSummerBoat, SUMMER_BOAT_SOCKETS } from './summer-boat';
import type { SummerBoat } from './summer-boat';
import type { SummerBoatOptions, SummerPose, SummerTravelState } from './summer-boat';
import { createSummerSwim } from './summer-swim';
import type { SummerSwimOptions } from './summer-swim';
import { SUMMER_ANCHORS } from './summer-layout';
import type { SummerAnchorId, SummerRoutePostId } from './summer-layout';

export type SummerMovementMode = 'walking' | 'deck' | 'boating' | 'swimming';
export interface SummerWalkingController {
  state: Omit<SummerTravelState,'boundary'> & {boundary?: boolean};
  key(key:string,down:boolean):boolean; joystick(x:number,y:number):void; look(dx:number,dy:number):void;
  handleWheel(delta:number):void; block(blocked:boolean):void; resetInput():void; update(dt:number):void; dispose():void;
  height(x:number,z:number):number|null; setSurface(surface:((x:number,z:number)=>number|null)|null):void;
}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
/** A small, bounded aft cockpit. The tube edges, two seats and fuel tank remain solid. */
export function createSummerDeck(boat: SummerBoat) {
  const start=boat.deckPose();
  const state:SummerTravelState={...start,pitch:-.04,velocity:0,distance:-start.z,activePhotoIndex:-1,approachFactor:0,boundary:false};
  const keys=new Set<string>();let blocked=false,stickX=0,stickY=0,lookX=0,lookY=0,vx=0,vz=0;
  const accepted=new Set(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  const local=(x:number,z:number)=>{const hull=boat.pose,c=Math.cos(hull.yaw),s=Math.sin(hull.yaw),dx=x-hull.x,dz=z-hull.z;return{x:c*dx-s*dz,z:s*dx+c*dz};};
  function canOccupy(x:number,z:number){
    if(![x,z].every(Number.isFinite))return false;
    const p=local(x,z),radius=.18,width=.68-clamp((p.z-1.6)/.8,0,1)*.08;
    if(Math.abs(p.x)+radius>width||p.z-radius<.12||p.z+radius>2.30)return false;
    const boxes=[{x:-.43,z:.69,hx:.225,hz:.36},{x:.43,z:.69,hx:.225,hz:.36},{x:-.43,z:1.75,hx:.325,hz:.265}];
    return !boxes.some(b=>Math.max(0,Math.abs(p.x-b.x)-b.hx)**2+Math.max(0,Math.abs(p.z-b.z)-b.hz)**2<radius*radius);
  }
  function resetInput(){keys.clear();stickX=stickY=lookX=lookY=vx=vz=0;state.velocity=0;}
  function setPose(pose:Partial<SummerPose>={}){
    const x=pose.x??state.x,z=pose.z??state.z,yaw=pose.yaw??state.yaw,pitch=pose.pitch??state.pitch;
    if(!canOccupy(x,z)||![yaw,pitch].every(Number.isFinite))return false;
    Object.assign(state,{x,z,y:boat.pose.y+SUMMER_BOAT_SOCKETS.deck.y,yaw,pitch:clamp(pitch,-1.1,.95),distance:-z,boundary:false});resetInput();return true;
  }
  return {state,canOccupy,setPose,resetInput,
    key(key:string,down:boolean){const k=key.length===1?key.toLowerCase():key;if(!accepted.has(k))return false;if(down&&!blocked)keys.add(k);else keys.delete(k);return true;},
    joystick(x:number,y:number){if(!blocked){stickX=Number.isFinite(x)?clamp(x,-1,1):0;stickY=Number.isFinite(y)?clamp(y,-1,1):0;}},
    look(dx:number,dy:number){if(!blocked&&Number.isFinite(dx)&&Number.isFinite(dy)){lookX+=clamp(dx,-180,180)*.003;lookY+=clamp(dy,-180,180)*.0025;}},
    handleWheel(delta:number){void delta;},
    block(value:boolean){blocked=value;resetInput();},
    update(dt:number){
      if(blocked||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);state.boundary=false;
      const blend=1-Math.exp(-dt*32);state.yaw-=lookX*blend;state.pitch=clamp(state.pitch-lookY*blend,-1.1,.95);lookX*=1-blend;lookY*=1-blend;
      for(let remaining=dt;remaining>.000001;){
        const step=Math.min(remaining,1/120);remaining-=step;
        state.yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*step*1.25;
        let f=Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown'))-stickY,s=Number(keys.has('d'))-Number(keys.has('a'))+stickX;
        const length=Math.max(1,Math.hypot(f,s));f/=length;s/=length;
        const alpha=1-Math.exp(-step*14);vx+=((-Math.sin(state.yaw)*f+Math.cos(state.yaw)*s)*.85-vx)*alpha;vz+=((-Math.cos(state.yaw)*f-Math.sin(state.yaw)*s)*.85-vz)*alpha;
        const x=state.x+vx*step,z=state.z+vz*step;
        if(canOccupy(x,z)){state.x=x;state.z=z;}
        else{if(canOccupy(x,state.z))state.x=x;else vx=0;if(canOccupy(state.x,z))state.z=z;else vz=0;state.boundary=true;}
      }
      state.y=boat.pose.y+SUMMER_BOAT_SOCKETS.deck.y;state.distance=-state.z;state.velocity=Math.hypot(vx,vz);
    },dispose:resetInput};
}
/** Keeps the shared walking controller intact while routing the same desktop/touch inputs by mode. */
export function createSummerMovement(walking: SummerWalkingController, options: {boat?: SummerBoatOptions; swim?: SummerSwimOptions} = {}) {
  const boat=createSummerBoat(options.boat), swim=createSummerSwim({...options.swim,hull:options.swim?.hull??(()=>boat.pose)});
  const deck=createSummerDeck(boat);
  let mode: SummerMovementMode='walking', blocked=false;
  const active=()=>mode==='walking'?walking:mode==='deck'?deck:mode==='boating'?boat:swim;
  function resetInput(){walking.resetInput();deck.resetInput();boat.resetInput();swim.resetInput();}
  function setMode(next: SummerMovementMode, pose?: Partial<SummerPose>) {
    resetInput();
    if(next==='boating') {
      if(pose&&!boat.setPose(pose))return false;
    } else if(next==='deck') {
      if(!deck.setPose(pose??(mode==='deck'?{}:boat.deckPose())))return false;
      boat.setEngine(false);
    } else if(next==='swimming') {
      if(pose&&!swim.setPose(pose))return false;
      boat.setEngine(false);
    } else if(pose) {
      const x=pose.x??walking.state.x,z=pose.z??walking.state.z,h=walking.height(x,z);
      if(h===null||![x,z,h,pose.yaw??walking.state.yaw,pose.pitch??-.04].every(Number.isFinite))return false;
      Object.assign(walking.state,{x,z,y:h+1.63,yaw:pose.yaw??walking.state.yaw,pitch:pose.pitch??-.04,distance:-z,velocity:0});
    }
    mode=next;active().block(blocked);return true;
  }
  return {
    get state(){return active().state;},get mode(){return mode;},get onBoat(){return mode==='deck'||mode==='boating';},boat,deck,swim,walking,setMode,resetInput,
    key(key:string,down:boolean){return active().key(key,down);},joystick(x:number,y:number){active().joystick(x,y);},
    vertical(up:boolean,down:boolean){swim.vertical(mode==='swimming'&&up,mode==='swimming'&&down);},
    look(dx:number,dy:number){active().look(dx,dy);},handleWheel(delta:number){active().handleWheel(delta);},
    block(value:boolean){blocked=value;walking.block(value);deck.block(value);boat.block(value);swim.block(value);},
    height(x:number,z:number){return walking.height(x,z);},setSurface:walking.setSurface,
    update(dt:number){active().update(dt);},
    recover(target:'island'|'boat'|SummerRoutePostId,anchor:SummerAnchorId='dive') {
      resetInput();
      if(target==='island'){boat.recover('berth');return setMode('walking',{x:32,z:-8,yaw:Math.PI/2});}
      if(target==='boat'){
        boat.recover(anchor);return setMode('deck',boat.deckPose());
      }
      boat.recover('dive');swim.recover(target);mode='swimming';swim.block(blocked);return true;
    },
    /** Place the floating boat at a durable save anchor without leaving held inputs active. */
    restoreBoat(anchor:SummerAnchorId){boat.recover(anchor);resetInput();return SUMMER_ANCHORS[anchor];},
    dispose(){walking.dispose();deck.dispose();boat.dispose();swim.dispose();},
  };
}
export type SummerMovement = ReturnType<typeof createSummerMovement>;
