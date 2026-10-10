/** Input-driven first-person travel. Distances remain global when render pools recycle. */
export interface PhotoStop { z: number; index: number }
export function createTravelController(photoCount: number,firstPhoto=12) {
  const state = { distance: 0, x: 0, yaw: 0, pitch: -.08, velocity: 0, activePhotoIndex: -1, approachFactor: 0 };
  const keys = new Set<string>();
  let stickX = 0, stickY = 0, wheel = 0, vx = 0, vz = 0, blocked = false,collisions=true;
  const accepted = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d']);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  function resetInput() { keys.clear(); stickX = stickY = wheel = vx = vz = 0; state.velocity = 0; }
  function key(key: string, down: boolean) {
    const k = key.length === 1 ? key.toLowerCase() : key;
    if (!accepted.has(k)) return false;
    if (down && !blocked) keys.add(k); else keys.delete(k);
    return true;
  }
  function update(dt: number) {
    dt = clamp(dt, 0, .05);
    if (!blocked) {
      state.yaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * dt * 1.25;
      let forward = (keys.has('ArrowUp') || keys.has('w') ? 1 : 0) - (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - stickY + wheel;
      let sideways = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0) + stickX;
      const length = Math.max(1, Math.hypot(forward, sideways)); forward /= length; sideways /= length;
      const alpha = 1 - Math.exp(-dt * 16), speed = 3.8;
      vx += ((-Math.sin(state.yaw) * forward + Math.cos(state.yaw) * sideways) * speed - vx) * alpha;
      vz += ((Math.cos(state.yaw) * forward + Math.sin(state.yaw) * sideways) * speed - vz) * alpha;
      wheel *= Math.exp(-dt * 9);
      let x = clamp(state.x + vx * dt, -4.1, 4.1), distance = Math.max(-1, state.distance + vz * dt);
      // Slide along each stone island rather than travelling through its monument.
      const nearest = Math.round((distance - firstPhoto) / 18);
      for (let n = Math.max(0, nearest - 1); collisions&&n <= nearest + 1; n++) {
        const dz = distance - (firstPhoto + n * 18), radius = Math.hypot(x, dz);
        if (radius < 1.5) {
          const angle = Math.atan2(dz, x || .01);
          x = Math.cos(angle) * 1.5; distance = firstPhoto + n * 18 + Math.sin(angle) * 1.5;
        }
      }
      state.x = x; state.distance = distance; state.velocity = Math.hypot(vx, vz);
    }
    state.activePhotoIndex = -1; state.approachFactor = 0;
    const n = Math.max(0, Math.round((state.distance - firstPhoto) / 18));
    const dz = firstPhoto + n * 18 - state.distance, d = Math.hypot(state.x, dz);
    const facing = (state.x * Math.sin(state.yaw) + dz * Math.cos(state.yaw)) / Math.max(.01, d);
    // Photographs face the entrance (+Z); the back of a pillar never activates one.
    if (dz > .5 && d < 8 && facing > .35) {
      state.activePhotoIndex = n % photoCount; state.approachFactor = 1 - d / 8;
    }
  }
  return { state, key, update, resetInput,
    joystick(x: number, y: number) { if (!blocked) { stickX = clamp(x,-1,1); stickY = clamp(y,-1,1); } },
    look(dx: number, dy: number) { if (!blocked) { state.yaw -= dx * .003; state.pitch = clamp(state.pitch - dy * .0025,-.85,.55); } },
    handleWheel(delta: number) { if (!blocked) wheel = clamp(wheel + delta * .006,-1,1); },
    block(value: boolean) { blocked = value; resetInput(); },
    setCollisions(value:boolean){collisions=value;},
    dispose: resetInput
  };
}
