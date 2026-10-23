export const SUMMER_AIR_CAPACITY = 300;

export function summerAirSeconds(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(SUMMER_AIR_CAPACITY, Math.floor(value)))
    : SUMMER_AIR_CAPACITY;
}

export function summerAirTime(seconds: number) {
  const remaining = summerAirSeconds(seconds);
  return `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
}

export function summerAirWarning(seconds: number) {
  if (seconds <= 15) return 'Reserve air: ascend now or choose Return to boat. Your discoveries are saved.';
  if (seconds <= 45) return 'Air low: return to the descent rope and climb aboard to refill.';
  if (seconds <= 90) return '90 seconds of air remain. Start your return to the boat.';
  return '';
}
