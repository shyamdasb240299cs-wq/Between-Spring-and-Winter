import type { SeasonNavigation } from './seasons';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
/** Walking follows a small baked navigation grid, never the high-detail render meshes. */
export function createSeasonTravel(nav: SeasonNavigation,blockedAt?:(x:number,z:number)=>boolean) {
  if (nav.cell <= 0 || nav.width < 2 || nav.depth < 2 || nav.heights.length !== nav.width * nav.depth) throw new Error('Invalid season navigation');
  const keys = new Set<string>();
  const accepted = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']);
  let lookX=0,lookY=0;
  let blocked = false, stickX = 0, stickY = 0, wheel = 0, vx = 0, vz = 0;
  function height(x: number, z: number): number | null {
    const gx = (x - nav.origin[0]) / nav.cell, gz = (z - nav.origin[1]) / nav.cell;
    const ix = Math.floor(gx), iz = Math.floor(gz);
    if (ix < 0 || iz < 0 || ix >= nav.width - 1 || iz >= nav.depth - 1) return null;
    const h = [nav.heights[iz * nav.width + ix], nav.heights[iz * nav.width + ix + 1], nav.heights[(iz + 1) * nav.width + ix], nav.heights[(iz + 1) * nav.width + ix + 1]];
    if (h.some(v => v === null || !Number.isFinite(v))) return null;
    const [a, b, c, d] = h as number[], tx = gx - ix, tz = gz - iz;
    if (Math.max(...h as number[]) - Math.min(...h as number[]) > nav.cell * .85) return null;
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }
  const spawnHeight = height(nav.spawn.x, nav.spawn.z);
  if (spawnHeight === null) throw new Error('Season spawn is outside its walkable surface');
  const state = { x: nav.spawn.x, z: nav.spawn.z, y: spawnHeight + 1.63, distance: -nav.spawn.z, yaw: nav.spawn.yaw, pitch: -.04, velocity: 0, activePhotoIndex: -1, approachFactor: 0 };
  function resetInput() { keys.clear(); lookX=lookY=0; stickX = stickY = wheel = vx = vz = 0; state.velocity = 0; }
  function canMove(x: number, z: number) {
    if(blockedAt?.(x,z))return null;
    // A 28 cm radius keeps the visitor's body clear of walls and edges.
    const samples = [[0, 0], [.28, 0], [-.28, 0], [0, .28], [0, -.28]].map(([dx, dz]) => height(x + dx, z + dz));
    return samples.every(h => h !== null && h - (state.y - 1.63) <= .3 && h - (state.y - 1.63) >= -.45) ? samples[0] : null;
  }
  return {
    state, height, resetInput,
    key(key: string, down: boolean) { const k = key.length === 1 ? key.toLowerCase() : key; if (!accepted.has(k)) return false; if (down && !blocked) keys.add(k); else keys.delete(k); return true; },
    joystick(x: number, y: number) { if (!blocked) { stickX = clamp(x, -1, 1); stickY = clamp(y, -1, 1); } },
    look(dx: number, dy: number) { if (!blocked) { lookX+=clamp(dx,-180,180)*.003;lookY+=clamp(dy,-180,180)*.0025; } },
    handleWheel(delta: number) { if (!blocked) wheel = clamp(wheel + delta * .006, -1, 1); },
    block(value: boolean) { blocked = value; resetInput(); },
    update(dt: number) {
      if (blocked) return;
      dt = clamp(dt, 0, .1);
      const lookBlend=1-Math.exp(-dt*32);state.yaw-=lookX*lookBlend;state.pitch=clamp(state.pitch-lookY*lookBlend,-1.1,.95);lookX*=1-lookBlend;lookY*=1-lookBlend;
      // Fixed small collision steps keep behavior consistent at 30, 60 and 120 Hz.
      for (let remaining = dt; remaining > .000001;) {
        const step = Math.min(remaining, 1 / 90); remaining -= step;
        state.yaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * step * 1.25;
        let f = Number(keys.has('w') || keys.has('ArrowUp')) - Number(keys.has('s') || keys.has('ArrowDown')) - stickY + wheel;
        let s = Number(keys.has('d')) - Number(keys.has('a')) + stickX;
        const length = Math.max(1, Math.hypot(f, s)); f /= length; s /= length;
        const alpha = 1 - Math.exp(-step * 16);
        const depth=Math.max(0,(nav.waterLevel??-Infinity)-(state.y-1.63)),speed=3.2*(1-clamp(depth/(nav.wadingDepth??.65),0,1)*.45);
        vx += ((-Math.sin(state.yaw) * f + Math.cos(state.yaw) * s) * speed - vx) * alpha;
        vz += ((-Math.cos(state.yaw) * f - Math.sin(state.yaw) * s) * speed - vz) * alpha;
        wheel *= Math.exp(-step * 9);
        const x = state.x + vx * step, z = state.z + vz * step;
        let h = canMove(x, z);
        if (h !== null) { state.x = x; state.z = z; }
        else { h = canMove(x, state.z); if (h !== null) state.x = x; const zh = canMove(state.x, z); if (zh !== null) { state.z = z; h = zh; } }
        if (h !== null) state.y = h + 1.63;
      }
      state.distance = -state.z; state.velocity = Math.hypot(vx, vz);
    },
    dispose: resetInput,
  };
}
