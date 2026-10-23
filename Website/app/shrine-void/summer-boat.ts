import { SUMMER_ANCHORS, SUMMER_WATER_LEVEL, summerColliderIntersects, summerGroundHeight, summerInsideBounds, summerWorldColliders } from './summer-layout';
import type { SummerAnchorId, SummerCollider } from './summer-layout';

export interface SummerPose { x: number; y: number; z: number; yaw: number; pitch?: number; }
export interface SummerTravelState extends SummerPose { pitch: number; velocity: number; distance: number; activePhotoIndex: number; approachFactor: number; boundary: boolean; }
export interface SummerBoatOptions { anchor?: SummerAnchorId; colliders?: readonly SummerCollider[]; groundHeight?: (x: number, z: number) => number; waterHeight?: (x: number, z: number, time: number) => number; }
/** Metre-scale sockets shared with the RIB model. Forward is local -Z. */
export const SUMMER_BOAT_SOCKETS = {
  helm: {x: -.43, y: 1.50, z: .80},
  deck: {x: .38, y: 1.805, z: 1.56},
  ladder: {x: .73, y: -.30, z: 3.45},
  waterEntry: {x: .73, y: -.30, z: 3.65},
} as const;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const inputKey = (key: string) => key.length === 1 ? key.toLowerCase() : key;
const accepted = new Set(['w','s','a','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
/** A surface hull controller: camera look is independent from the heading of the boat. */
export function createSummerBoat(options: SummerBoatOptions = {}) {
  const ground = options.groundHeight ?? summerGroundHeight, colliders = options.colliders ?? summerWorldColliders;
  let anchorId: SummerAnchorId = options.anchor ?? 'berth';
  const initial = SUMMER_ANCHORS[anchorId];
  // Hull position and seated camera are distinct: a camera at the hull origin is inside the console.
  const hull = {x: initial.x as number, y: initial.y as number, z: initial.z as number};
  const state: SummerTravelState = { ...initial, y: initial.y + 1.50, pitch: -.04, velocity: 0, distance: -initial.z, activePhotoIndex: -1, approachFactor: 0, boundary: false };
  let heading = initial.yaw, speed = 0, stickX = 0, stickY = 0, lookX = 0, lookY = 0, clock = 0;
  let blocked = false, moored = true, engineRunning = false, docking = false;
  const keys = new Set<string>();
  function localPose(point: {x:number;y:number;z:number}): SummerPose {
    const c=Math.cos(heading),s=Math.sin(heading);
    return {x:hull.x+c*point.x+s*point.z,y:hull.y+point.y,z:hull.z-s*point.x+c*point.z,yaw:heading,pitch:-.04};
  }
  function syncCamera(){Object.assign(state,localPose(SUMMER_BOAT_SOCKETS.helm),{yaw:state.yaw,pitch:state.pitch,distance:-hull.z});}
  syncCamera();
  function resetInput() { keys.clear(); stickX = stickY = lookX = lookY = speed = 0; state.velocity = 0; }
  function valid(x: number, z: number, yaw: number) {
    if (![x, z, yaw].every(Number.isFinite)) return false;
    // Three overlapping hull discs cover the complete 5.9 m × 2.45 m hull, including its ends.
    for (const along of [-1.725, 0, 1.725]) {
      const sx = x - Math.sin(yaw) * along, sz = z - Math.cos(yaw) * along, radius = 1.225;
      if (!summerInsideBounds(sx, sz, radius) || !Number.isFinite(ground(sx, sz)) || ground(sx, sz) > -.8) return false;
      for (const [dx, dz] of [[radius,0],[-radius,0],[0,radius],[0,-radius]]) {
        const bed = ground(sx + dx, sz + dz);
        if (!Number.isFinite(bed) || bed > -.55) return false;
      }
      if (colliders.some(c => summerColliderIntersects(c, sx, sz, -.65, .62, radius))) return false;
    }
    return true;
  }
  function setPose(pose: Partial<SummerPose>) {
    const x = pose.x ?? hull.x, z = pose.z ?? hull.z, yaw = pose.yaw ?? heading;
    if (![x,z,yaw,pose.pitch??state.pitch].every(Number.isFinite) || !valid(x,z,yaw)) return false;
    hull.x = x; hull.z = z; hull.y = SUMMER_WATER_LEVEL; heading = yaw; state.yaw = yaw; state.pitch = clamp(pose.pitch ?? state.pitch,-1.1,.95);
    state.boundary = false; syncCamera(); resetInput(); return true;
  }
  function recover(id: SummerAnchorId = anchorId) {
    anchorId = id; const anchor = SUMMER_ANCHORS[id];
    // Recovery is an explicit user action and always restores an authored, stable anchor.
    Object.assign(hull,anchor);Object.assign(state,{yaw:anchor.yaw,pitch:-.04,boundary:false});
    heading = anchor.yaw; moored = true; engineRunning = false; syncCamera(); resetInput();
  }
  function canMoor(id: SummerAnchorId){const anchor=SUMMER_ANCHORS[id];return Math.hypot(hull.x-anchor.x,hull.z-anchor.z)<=8&&Math.abs(speed)<1.4;}
  /** Berth assist approaches from the open-water side and sweeps the whole alignment. */
  function canDockApproach(){
    const anchor=SUMMER_ANCHORS.berth;
    if(!canMoor('berth')||hull.x<47.7||Math.abs(hull.z-anchor.z)>5.5)return false;
    const turn=Math.atan2(Math.sin(anchor.yaw-heading),Math.cos(anchor.yaw-heading));
    for(let i=0;i<=48;i++){const t=i/48;if(!valid(hull.x+(anchor.x-hull.x)*t,hull.z+(anchor.z-hull.z)*t,heading+turn*t))return false;}
    return true;
  }
  return {
    state, resetInput, setPose, recover,
    get pose(): SummerPose { return { ...hull, yaw: heading, pitch: 0 }; },
    localPose,
    deckPose(){return localPose(SUMMER_BOAT_SOCKETS.deck);},
    ladderPose(){return localPose(SUMMER_BOAT_SOCKETS.ladder);},
    waterEntryPose(){return localPose(SUMMER_BOAT_SOCKETS.waterEntry);},
    canReachLadder(pose: Pick<SummerPose,'x'|'y'|'z'>){const ladder=localPose(SUMMER_BOAT_SOCKETS.ladder);return [pose.x,pose.y,pose.z].every(Number.isFinite)&&Math.hypot(pose.x-ladder.x,pose.z-ladder.z)<=1.9&&pose.y>=hull.y-1.65&&pose.y<=hull.y+.25;},
    get heading() { return heading; }, get anchor() { return anchorId; }, get moored() { return moored; }, get engineRunning() { return engineRunning; },
    canOccupy: valid,
    key(key: string, down: boolean) { const k = inputKey(key); if (!accepted.has(k)) return false; if (down && !blocked) keys.add(k); else keys.delete(k); return true; },
    joystick(x: number, y: number) { if (!blocked) { stickX = Number.isFinite(x)?clamp(x,-1,1):0; stickY = Number.isFinite(y)?clamp(y,-1,1):0; } },
    look(dx: number, dy: number) { if (!blocked && Number.isFinite(dx) && Number.isFinite(dy)) { lookX += clamp(dx,-180,180)*.003; lookY += clamp(dy,-180,180)*.0025; } },
    handleWheel(delta: number) { void delta; /* A wheel does not leave a running throttle behind. */ },
    block(value: boolean) { blocked = value; resetInput(); },
    setDocking(value: boolean) { docking = value; },
    setEngine(value: boolean) { engineRunning = value; if (!value) resetInput(); },
    release(startEngine = true) { moored = false; engineRunning = startEngine; resetInput(); },
    canMoor,canDockApproach,
    moor(id: SummerAnchorId) {
      const anchor = SUMMER_ANCHORS[id];
      if (!canMoor(id)) return false;
      anchorId = id; Object.assign(hull,anchor);Object.assign(state,{yaw:anchor.yaw,pitch:-.04,boundary:false});
      heading = anchor.yaw; moored = true; syncCamera(); resetInput(); return true;
    },
    update(dt: number) {
      if (blocked || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt,.1); clock += dt; state.boundary = false;
      const blend = 1-Math.exp(-dt*32);
      state.yaw -= lookX*blend; state.pitch = clamp(state.pitch-lookY*blend,-1.1,.95); lookX *= 1-blend; lookY *= 1-blend;
      for (let remaining = dt; remaining > .000001;) {
        const step = Math.min(remaining,1/120); remaining -= step;
        const throttle = clamp(Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown'))-stickY,-1,1);
        const steering = clamp(Number(keys.has('a')||keys.has('ArrowLeft'))-Number(keys.has('d')||keys.has('ArrowRight'))-stickX,-1,1);
        const target = moored || !engineRunning ? 0 : throttle*(throttle < 0 ? 1.4 : docking ? 1.25 : 4);
        speed += (target-speed)*(1-Math.exp(-step*(target === 0 ? 2.8 : 1.8)));
        if (moored) { speed = 0; continue; }
        const rotation = engineRunning?steering*step*.58*clamp(Math.abs(speed)/2,.08,1)*(speed < -.02 ? -1 : 1):0;
        if (valid(hull.x,hull.z,heading+rotation)) { heading += rotation; state.yaw += rotation; }
        else if(rotation)state.boundary=true;
        const x = hull.x-Math.sin(heading)*speed*step, z = hull.z-Math.cos(heading)*speed*step;
        if (valid(x,z,heading)) { hull.x = x; hull.z = z; }
        else {
          // Sweep in <= 3.4 cm steps and slide along the shore, rather than crossing thin solids.
          const slideX = valid(x,hull.z,heading); if (slideX) hull.x = x;
          const slideZ = valid(hull.x,z,heading); if (slideZ) hull.z = z;
          if (!slideX && !slideZ) speed *= Math.exp(-step*12);
          state.boundary = true;
        }
      }
      const surface = options.waterHeight?.(hull.x,hull.z,clock) ?? SUMMER_WATER_LEVEL;
      hull.y = Number.isFinite(surface) ? surface : SUMMER_WATER_LEVEL;
      syncCamera(); state.velocity = Math.abs(speed);
    },
    dispose: resetInput,
  };
}
export type SummerBoat = ReturnType<typeof createSummerBoat>;
