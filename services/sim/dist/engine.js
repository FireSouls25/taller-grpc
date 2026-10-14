// Kinematic-heterogeneous engine: per-car constant v0, stop at red / leader gap.
// Pure logic: no gRPC imports, testable in isolation.
import { CITY_SIZE, INTERSECTIONS, PORTALS, headingBetween, makeRoute, } from "./city.js";
const COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#ecf0f1", "#e67e22", "#9b59b6"];
const STOP_GAP = 9; // m
const BRAKE_DIST = 25; // m
const LIGHT_RADIUS = 12; // m: distance to intersection center considered "at" it
let nextId = 1;
export function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function spawnCar(rng) {
    const from = PORTALS[Math.floor(rng() * PORTALS.length)];
    let to = PORTALS[Math.floor(rng() * PORTALS.length)];
    if (to.id === from.id)
        to = PORTALS[(PORTALS.indexOf(from) + 5) % PORTALS.length];
    const route = makeRoute(from, to, rng);
    const seg0 = route[1] ?? route[0];
    return {
        id: nextId++,
        v0: 8 + rng() * 8, // 8-16 m/s heterogeneous
        speed: 0,
        x: route[0].x,
        y: route[0].y,
        headingDeg: headingBetween(route[0], seg0),
        color: COLORS[Math.floor(rng() * COLORS.length)],
        route,
        leg: 1,
    };
}
function isSignalizedNear(x, y) {
    for (const it of INTERSECTIONS) {
        if (!it.signalized)
            continue;
        if (Math.hypot(it.x - x, it.y - y) < LIGHT_RADIUS + BRAKE_DIST)
            return true;
    }
    return false;
}
/** Nearest signalized intersection ahead within BRAKE_DIST, if any. */
function redAhead(car, phases) {
    for (const it of INTERSECTIONS) {
        if (!it.signalized)
            continue;
        const dx = it.x - car.x;
        const dy = it.y - car.y;
        const dist = Math.hypot(dx, dy);
        if (dist > LIGHT_RADIUS + BRAKE_DIST || dist < 1)
            continue;
        // ahead? dot with heading vector
        const hx = car.headingDeg === 90 ? 1 : car.headingDeg === 270 ? -1 : 0;
        const hy = car.headingDeg === 0 ? 1 : car.headingDeg === 180 ? -1 : 0;
        if (dx * hx + dy * hy <= 0)
            continue;
        const ph = phases.get(it.id);
        if (!ph)
            continue;
        const ns = hx === 0;
        const allowed = ns ? ph.nsGreen : ph.ewGreen;
        if (!allowed)
            return true;
    }
    return false;
}
function leaderGap(car, cars) {
    let best = Infinity;
    const hx = car.headingDeg === 90 ? 1 : car.headingDeg === 270 ? -1 : 0;
    const hy = car.headingDeg === 0 ? 1 : car.headingDeg === 180 ? -1 : 0;
    for (const o of cars) {
        if (o.id === car.id)
            continue;
        const dx = o.x - car.x;
        const dy = o.y - car.y;
        const along = dx * hx + dy * hy;
        if (along <= 0 || along > STOP_GAP + 6)
            continue;
        const lat = Math.abs(dx * hy - dy * hx);
        if (lat < 3)
            best = Math.min(best, along);
    }
    return best;
}
export function stepCar(car, dt, cars, phases) {
    const blocked = redAhead(car, phases) || leaderGap(car, cars) < STOP_GAP;
    car.speed = blocked ? 0 : car.v0;
    if (car.speed === 0)
        return;
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
        car.headingDeg = headingBetween({ x: car.x, y: car.y }, t);
        const adv = Math.min(d, remaining);
        car.x += (dx / d) * adv;
        car.y += (dy / d) * adv;
        remaining -= adv;
        if (adv >= d - 1e-9)
            car.leg++;
    }
}
/** Finished when route done or outside square (+50 m margin). */
export function isDone(car) {
    if (car.leg >= car.route.length)
        return true;
    return car.x < -50 || car.x > CITY_SIZE + 50 || car.y < -50 || car.y > CITY_SIZE + 50;
}
export { isSignalizedNear };
//# sourceMappingURL=engine.js.map