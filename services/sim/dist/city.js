// 5 km square city: procedural grid + portals + Manhattan routes.
// Units: meters. Origin (0,0) SW corner, x east, y north.
export const CITY_SIZE = 5000;
export const GRID_N = 9; // 9 roads per axis
export const SPACING = CITY_SIZE / (GRID_N - 1); // 625 m
function roadPos(i) {
    return i * SPACING;
}
// Center 2x2 intersections signalized (roads 3,4 x roads 3,4)
const SIG_ROADS = [3, 4];
export const INTERSECTIONS = (() => {
    const out = [];
    for (let ix = 0; ix < GRID_N; ix++) {
        for (let iy = 0; iy < GRID_N; iy++) {
            const sig = SIG_ROADS.includes(ix) && SIG_ROADS.includes(iy);
            out.push({
                id: `i${ix}x${iy}`,
                x: roadPos(ix),
                y: roadPos(iy),
                signalized: sig,
            });
        }
    }
    return out;
})();
export const SIGNALIZED = INTERSECTIONS.filter((i) => i.signalized);
export const SIGNALIZED_IDS = SIGNALIZED.map((i) => i.id);
// Mid-edge portals: W+E on roads 2,4,6 and S+N on roads 2,4,6 (12 total)
export const PORTALS = (() => {
    const roads = [2, 4, 6];
    const out = [];
    for (const r of roads) {
        out.push({ id: `W${r}`, x: 0, y: roadPos(r), headingDeg: 90 });
        out.push({ id: `E${r}`, x: CITY_SIZE, y: roadPos(r), headingDeg: 270 });
        out.push({ id: `S${r}`, x: roadPos(r), y: 0, headingDeg: 0 });
        out.push({ id: `N${r}`, x: roadPos(r), y: CITY_SIZE, headingDeg: 180 });
    }
    return out;
})();
/** Manhattan route: enter at portal A, exit at portal B. */
export function makeRoute(from, to, rng) {
    const pts = [{ x: from.x, y: from.y }];
    // L-shaped: with 50% go x-first else y-first, snapped to grid roads
    const cx = clampToRoad(to.x, from.x);
    const cy = clampToRoad(from.y, to.y);
    if (rng() < 0.5) {
        pts.push({ x: cx, y: from.y });
        pts.push({ x: cx, y: to.y });
    }
    else {
        pts.push({ x: from.x, y: cy });
        pts.push({ x: to.x, y: cy });
    }
    pts.push({ x: to.x, y: to.y });
    return pts;
}
function clampToRoad(a, b) {
    // snap midpoint-ish: just use target coord snapped to nearest road
    const i = Math.round(a / SPACING);
    const c = Math.max(0, Math.min(GRID_N - 1, i)) * SPACING;
    return c !== b ? c : a;
}
export function headingBetween(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy))
        return dx >= 0 ? 90 : 270;
    return dy >= 0 ? 0 : 180;
}
// Geo anchor for map projection (Manizales, CO)
export const ANCHOR = { lat: 5.069, lng: -75.517 };
const M_PER_DEG_LAT = 111_320;
export function toLngLat(x, y) {
    const lat = ANCHOR.lat + (y - CITY_SIZE / 2) / M_PER_DEG_LAT;
    const lng = ANCHOR.lng +
        (x - CITY_SIZE / 2) / (M_PER_DEG_LAT * Math.cos((ANCHOR.lat * Math.PI) / 180));
    return { lng, lat };
}
//# sourceMappingURL=city.js.map