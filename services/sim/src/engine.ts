// IDM car-following + signal stop lines + uncontrolled yield + smooth turns.
// Pure logic: no gRPC imports, testable in isolation.

import {
  CITY_SIZE,
  INTERSECTIONS,
  PORTALS,
  Waypoint,
  headingBetween,
  makeRoute,
} from "./city.js";

export interface Car {
  id: number;
  v0: number; // desired speed m/s
  accel: number; // IDM max accel a m/s^2
  comfort: number; // IDM comfortable decel b m/s^2
  headway: number; // IDM desired headway T s
  speed: number; // current speed m/s
  x: number;
  y: number;
  headingDeg: number;
  color: string;
  route: Waypoint[];
  leg: number; // index of current target waypoint
}

export interface PhaseInfo {
  nsGreen: boolean;
  nsYellow: boolean;
  ewGreen: boolean;
  ewYellow: boolean;
}

const COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#ecf0f1", "#e67e22", "#9b59b6"];
const BRAKE_DIST = 40; // m: lookahead for signals / yield
const LIGHT_RADIUS = 12;
const STOP_OFFSET = 7; // stop line sits this far before intersection center
const CAR_LEN = 4.5;
const S0 = 3; // IDM minimum gap
const TURN_RATE = 240; // deg/s visual turn smoothing

let nextId = 1;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function spawnCar(rng: () => number): Car {
  const from = PORTALS[Math.floor(rng() * PORTALS.length)];
  let to = PORTALS[Math.floor(rng() * PORTALS.length)];
  if (to.id === from.id) to = PORTALS[(PORTALS.indexOf(from) + 5) % PORTALS.length];
  const route = makeRoute(from, to, rng);
  const seg0 = route[1] ?? route[0];
  return {
    id: nextId++,
    v0: 10 + rng() * 8, // 10-18 m/s heterogeneous
    accel: 1.2 + rng() * 0.8,
    comfort: 1.8 + rng() * 0.8,
    headway: 0.8 + rng() * 0.6,
    speed: 0,
    x: route[0].x,
    y: route[0].y,
    headingDeg: headingBetween(route[0], seg0),
    color: COLORS[Math.floor(rng() * COLORS.length)],
    route,
    leg: 1,
  };
}

function fwd(headingDeg: number): { hx: number; hy: number } {
  const r = (headingDeg * Math.PI) / 180;
  return { hx: Math.sin(r), hy: Math.cos(r) };
}

/** Along-track gap to nearest same-direction leader + its speed. */
function leaderConstraint(
  car: Car,
  cars: Car[],
): { gap: number; dv: number } | null {
  const { hx, hy } = fwd(car.headingDeg);
  let bestGap = Infinity;
  let bestDv = 0;
  for (const o of cars) {
    if (o.id === car.id) continue;
    const dx = o.x - car.x;
    const dy = o.y - car.y;
    const along = dx * hx + dy * hy;
    if (along <= 0 || along > BRAKE_DIST) continue;
    const lat = Math.abs(dx * hy - dy * hx);
    if (lat > 2.5) continue;
    if (along < bestGap) {
      bestGap = along;
      bestDv = car.speed - o.speed;
    }
  }
  if (!isFinite(bestGap)) return null;
  return { gap: Math.max(bestGap - CAR_LEN, 0.1), dv: bestDv };
}

interface StopLine {
  gap: number; // distance to stop line along track
  mustStop: boolean;
}

/** Stop line imposed by a signal or a yield, if the car should brake. */
function stopLine(
  car: Car,
  cars: Car[],
  phases: Map<string, PhaseInfo>,
): StopLine | null {
  const { hx, hy } = fwd(car.headingDeg);
  const ns = Math.abs(hy) >= Math.abs(hx);
  let best: StopLine | null = null;
  for (const it of INTERSECTIONS) {
    const dx = it.x - car.x;
    const dy = it.y - car.y;
    const along = dx * hx + dy * hy;
    if (along <= 0 || along > LIGHT_RADIUS + BRAKE_DIST) continue;
    const lat = Math.abs(dx * hy - dy * hx);
    if (lat > 4) continue;
    const gap = along - STOP_OFFSET;
    if (gap < -2) continue; // already committed / inside
    if (it.signalized) {
      const ph = phases.get(it.id);
      if (!ph) continue;
      const green = ns ? ph.nsGreen : ph.ewGreen;
      if (green) continue;
      const yellow = ns ? ph.nsYellow : ph.ewYellow;
      if (yellow) {
        // beat the yellow if stopping is unsafe
        const stopDist = (car.speed * car.speed) / (2 * car.comfort) + 4;
        if (gap < stopDist) continue;
      }
      if (!best || gap < best.gap) best = { gap: Math.max(gap, 0.1), mustStop: true };
    } else {
      // uncontrolled: yield if the box is occupied
      let occupied = false;
      for (const o of cars) {
        if (o.id === car.id) continue;
        if (Math.hypot(o.x - it.x, o.y - it.y) < 11) {
          occupied = true;
          break;
        }
      }
      if (occupied && (!best || gap < best.gap))
        best = { gap: Math.max(gap, 0.1), mustStop: true };
    }
  }
  return best;
}

/** IDM acceleration for one constraint (static obstacle: dv = v). */
function idm(car: Car, v: number, gap: number, dv: number): number {
  const sStar = S0 + Math.max(0, v * car.headway + (v * dv) / (2 * Math.sqrt(car.accel * car.comfort)));
  const free = 1 - Math.pow(v / Math.max(car.v0, 0.1), 4);
  return car.accel * (free - (sStar / Math.max(gap, 0.1)) ** 2);
}

function rotateToward(cur: number, target: number, maxStep: number): number {
  let d = ((target - cur + 540) % 360) - 180;
  if (d > maxStep) d = maxStep;
  if (d < -maxStep) d = -maxStep;
  return (cur + d + 360) % 360;
}

export function stepCar(car: Car, dt: number, cars: Car[], phases: Map<string, PhaseInfo>): void {
  if (dt <= 0) return;
  const v = car.speed;

  let acc = car.accel * (1 - Math.pow(v / Math.max(car.v0, 0.1), 4)); // free flow
  const lead = leaderConstraint(car, cars);
  if (lead) acc = Math.min(acc, idm(car, v, lead.gap, lead.dv));
  const line = stopLine(car, cars, phases);
  if (line) acc = Math.min(acc, idm(car, v, line.gap, v));

  car.speed = Math.max(0, Math.min(car.v0, v + acc * dt));
  if (car.speed < 0.05 && acc < 0) car.speed = 0;

  // advance along route
  let remaining = car.speed * dt;
  while (remaining > 0 && car.leg < car.route.length) {
    const t = car.route[car.leg];
    const dx = t.x - car.x;
    const dy = t.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5) {
      car.leg++;
      continue;
    }
    const adv = Math.min(d, remaining);
    car.x += (dx / d) * adv;
    car.y += (dy / d) * adv;
    remaining -= adv;
    if (adv >= d - 1e-9) car.leg++;
  }

  // smooth visual heading toward current leg
  if (car.leg < car.route.length) {
    const t = car.route[car.leg];
    const target = headingBetween({ x: car.x, y: car.y }, t);
    car.headingDeg = rotateToward(car.headingDeg, target, TURN_RATE * dt);
  }
}

/** Gap ahead for spawn gating: don't materialize inside another car. */
export function gapAhead(car: Car, cars: Car[]): number {
  const lead = leaderConstraint(car, cars);
  return lead ? lead.gap : Infinity;
}

/** Finished when route done or outside square (+50 m margin). */
export function isDone(car: Car): boolean {
  if (car.leg >= car.route.length) return true;
  return car.x < -50 || car.x > CITY_SIZE + 50 || car.y < -50 || car.y > CITY_SIZE + 50;
}
