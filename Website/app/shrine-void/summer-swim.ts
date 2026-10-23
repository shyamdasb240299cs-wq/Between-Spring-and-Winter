import { SUMMER_ROUTE_POSTS, SUMMER_WATER_LEVEL, summerColliderIntersects, summerSolidGroundHeight, summerInsideBounds, summerWorldColliders } from './summer-layout';
import type { SummerCollider, SummerRoutePostId } from './summer-layout';
import type { SummerPose, SummerTravelState } from './summer-boat';

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const accepted = new Set(['w','s','a','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Space','Spacebar','Control','c']);
/** Eye-relative bounds include the equipped body's boots and moving fins. */
export const SUMMER_SWIM_CAPSULE={radius:.34,eyeToFoot:1.85,eyeToCrown:.18,bedClearance:.08} as const;
const radius=SUMMER_SWIM_CAPSULE.radius,diagonal=radius/Math.SQRT2;
const footprint=[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius],[diagonal,diagonal],[-diagonal,diagonal],[diagonal,-diagonal],[-diagonal,-diagonal]] as const;
export interface SummerSwimOptions { checkpoint?: SummerRoutePostId; colliders?: readonly SummerCollider[]; groundHeight?: (x: number, z: number) => number; hull?: () => SummerPose | null; }
/** Capsule-proxy swimming. Looking vertically never changes depth without an explicit vertical input. */
export function createSummerSwim(options: SummerSwimOptions = {}) {
  const ground = options.groundHeight ?? summerSolidGroundHeight, colliders = options.colliders ?? summerWorldColliders;
  let checkpoint: SummerRoutePostId = options.checkpoint ?? 'training';
  const initial = SUMMER_ROUTE_POSTS[checkpoint];
  const state: SummerTravelState = { ...initial, pitch: -.04, velocity: 0, distance: -initial.z, activePhotoIndex: -1, approachFactor: 0, boundary: false };
  const keys = new Set<string>();
  let blocked = false, stickX = 0, stickY = 0, up = false, down = false, lookX = 0, lookY = 0, vx = 0, vy = 0, vz = 0;
  function resetInput() { keys.clear(); stickX = stickY = lookX = lookY = vx = vy = vz = 0; up = down = false; state.velocity = 0; }
  function minimumEyeHeight(x:number,z:number) {
    let height=-Infinity;
    for(const [dx,dz] of footprint){const bed=ground(x+dx,z+dz);if(!Number.isFinite(bed))return Infinity;height=Math.max(height,bed);}
    return height+SUMMER_SWIM_CAPSULE.eyeToFoot+SUMMER_SWIM_CAPSULE.bedClearance;
  }
  function occupancy(x:number,y:number,z:number,floor:number) {
    const minY=y-SUMMER_SWIM_CAPSULE.eyeToFoot,maxY=y+SUMMER_SWIM_CAPSULE.eyeToCrown;
    if (!summerInsideBounds(x,z,radius) || !Number.isFinite(y) || y > SUMMER_WATER_LEVEL+.22 || y < -28.6) return false;
    if(y<floor-1e-7)return false;
    if (colliders.some(c => summerColliderIntersects(c,x,z,minY,maxY,radius))) return false;
    const hull = options.hull?.();
    if (hull && minY < hull.y+.5 && maxY > hull.y-.7) {
      const dx=x-hull.x,dz=z-hull.z,localX=Math.cos(hull.yaw)*dx-Math.sin(hull.yaw)*dz,localZ=Math.sin(hull.yaw)*dx+Math.cos(hull.yaw)*dz;
      if (Math.abs(localX)<1.225+radius && Math.abs(localZ)<2.95+radius) return false;
    }
    return true;
  }
  function valid(x:number,y:number,z:number){return occupancy(x,y,z,minimumEyeHeight(x,z));}
  function setPose(pose: Partial<SummerPose>) {
    const x = pose.x ?? state.x, y = pose.y ?? state.y, z = pose.z ?? state.z;
    if (!valid(x,y,z) || !Number.isFinite(pose.yaw ?? state.yaw) || !Number.isFinite(pose.pitch ?? state.pitch)) return false;
    Object.assign(state,{x,y,z,yaw:pose.yaw??state.yaw,pitch:clamp(pose.pitch??state.pitch,-1.1,1.1),distance:-z,boundary:false}); resetInput(); return true;
  }
  function recover(id: SummerRoutePostId = checkpoint) {
    checkpoint = id; const target = SUMMER_ROUTE_POSTS[id];
    // Safe posts are deliberately clear sand. Keep their last completed puzzle progress elsewhere.
    Object.assign(state,target,{pitch:-.04,distance:-target.z,boundary:false}); resetInput();
  }
  return {
    state, resetInput, setPose, recover, canOccupy: valid,
    get checkpoint() { return checkpoint; },
    setCheckpoint(id: SummerRoutePostId) { const p=SUMMER_ROUTE_POSTS[id]; if(Math.hypot(state.x-p.x,state.y-p.y,state.z-p.z)<6) { checkpoint=id; return true; } return false; },
    key(key: string, pressed: boolean) { const k = key.length === 1 ? key.toLowerCase() : key; if (!accepted.has(k)) return false; if (pressed && !blocked) keys.add(k); else keys.delete(k); return true; },
    joystick(x: number, y: number) { if (!blocked) { stickX=Number.isFinite(x)?clamp(x,-1,1):0; stickY=Number.isFinite(y)?clamp(y,-1,1):0; } },
    vertical(ascend: boolean, descend: boolean) { if (!blocked) { up=ascend; down=descend; } else { up=down=false; } },
    look(dx: number, dy: number) { if (!blocked && Number.isFinite(dx) && Number.isFinite(dy)) { lookX+=clamp(dx,-180,180)*.003; lookY+=clamp(dy,-180,180)*.0025; } },
    handleWheel(delta: number) { void delta; /* Swimming depth uses the labelled explicit ascent/descent controls. */ },
    block(value: boolean) { blocked=value; resetInput(); },
    update(dt: number) {
      if (blocked || !Number.isFinite(dt) || dt<=0) return;
      dt=Math.min(dt,.1); state.boundary=false;
      const blend=1-Math.exp(-dt*32); state.yaw-=lookX*blend; state.pitch=clamp(state.pitch-lookY*blend,-1.1,1.1); lookX*=1-blend; lookY*=1-blend;
      for(let remaining=dt;remaining>.000001;) {
        const step=Math.min(remaining,1/120); remaining-=step;
        let f=Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown'))-stickY;
        let s=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'))+stickX;
        const length=Math.max(1,Math.hypot(f,s)); f/=length; s/=length;
        const vertical=Number(up||keys.has(' ')||keys.has('Space')||keys.has('Spacebar'))-Number(down||keys.has('Control')||keys.has('c'));
        const alpha=1-Math.exp(-step*5);
        vx+=((-Math.sin(state.yaw)*f+Math.cos(state.yaw)*s)*1.3-vx)*alpha;
        vz+=((-Math.cos(state.yaw)*f-Math.sin(state.yaw)*s)*1.3-vz)*alpha;
        vy+=(vertical*.65-vy)*alpha;
        const x=state.x+vx*step,z=state.z+vz*step,floor=minimumEyeHeight(x,z),desiredY=clamp(state.y+vy*step,-28.6,SUMMER_WATER_LEVEL+.22);
        // Resolve a downward contact against the whole footprint. Following a
        // gentle sand slope keeps forward swimming manageable at the bottom.
        const y=floor<=state.y+.035?Math.max(desiredY,floor):desiredY;
        if(y>desiredY)vy=Math.max(0,vy);
        if(occupancy(x,y,z,floor)){state.x=x;state.y=y;state.z=z;}
        else {
          // Substeps are <= 1.1 cm horizontally. Axis sweeps permit sliding and free ascent past a wall.
          if(valid(x,state.y,state.z))state.x=x;else vx=0;
          if(valid(state.x,state.y,z))state.z=z;else vz=0;
          if(valid(state.x,y,state.z))state.y=y;else vy=0;
          state.boundary=true;
        }
      }
      state.distance=-state.z;state.velocity=Math.hypot(vx,vy,vz);
    },
    dispose: resetInput,
  };
}
export type SummerSwim = ReturnType<typeof createSummerSwim>;
