// Shared geo math (mirrors services/sim city.ts anchor).
export const CITY_SIZE = 5000;
const GRID_N = 9;
export const SPACING = CITY_SIZE / (GRID_N - 1);
const ANCHOR = { lat: 5.069, lng: -75.517 };
const M_PER_DEG_LAT = 111_320;

export function toLngLat(x: number, y: number): { lng: number; lat: number } {
  const lat = ANCHOR.lat + (y - CITY_SIZE / 2) / M_PER_DEG_LAT;
  const lng =
    ANCHOR.lng +
    (x - CITY_SIZE / 2) / (M_PER_DEG_LAT * Math.cos((ANCHOR.lat * Math.PI) / 180));
  return { lng, lat };
}

export function gridRoads(): number[] {
  const r: number[] = [];
  for (let i = 0; i < GRID_N; i++) r.push(i * SPACING);
  return r;
}

// Signalized intersections (must match services).
export const SIGNALIZED: { id: string; x: number; y: number }[] = [3, 4]
  .flatMap((ix) => [3, 4].map((iy) => ({ ix, iy })))
  .map(({ ix, iy }) => ({ id: `i${ix}x${iy}`, x: ix * SPACING, y: iy * SPACING }));

export const ANCHOR_LL = toLngLat(CITY_SIZE / 2, CITY_SIZE / 2);
