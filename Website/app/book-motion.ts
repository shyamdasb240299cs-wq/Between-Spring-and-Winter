/** Limit angular speed after a fast scroll, then stop exactly at the target. */
export function settleBookYaw(current: number, target: number, dt: number, reduced: boolean) {
  if (reduced) return target;
  const delta = (target - current) * (1 - Math.exp(-dt / .12));
  const next = current + Math.min(dt * 3.8, Math.max(-dt * 3.8, delta));
  return Math.abs(next - target) < .0001 ? target : next;
}

export const CLOSED_BOOK_CENTER = { x: -2.86, z: -.02135 };
