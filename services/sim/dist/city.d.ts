export declare const CITY_SIZE = 5000;
export declare const GRID_N = 9;
export declare const SPACING: number;
export interface Intersection {
    id: string;
    x: number;
    y: number;
    signalized: boolean;
}
export interface Portal {
    id: string;
    x: number;
    y: number;
    headingDeg: number;
}
export declare const INTERSECTIONS: Intersection[];
export declare const SIGNALIZED: Intersection[];
export declare const SIGNALIZED_IDS: string[];
export declare const PORTALS: Portal[];
export interface Waypoint {
    x: number;
    y: number;
}
/** Manhattan route: enter at portal A, exit at portal B. */
export declare function makeRoute(from: Portal, to: Portal, rng: () => number): Waypoint[];
export declare function headingBetween(a: Waypoint, b: Waypoint): number;
export declare const ANCHOR: {
    lat: number;
    lng: number;
};
export declare function toLngLat(x: number, y: number): {
    lng: number;
    lat: number;
};
