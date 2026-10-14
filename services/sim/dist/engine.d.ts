import { Waypoint } from "./city.js";
export interface Car {
    id: number;
    v0: number;
    speed: number;
    x: number;
    y: number;
    headingDeg: number;
    color: string;
    route: Waypoint[];
    leg: number;
}
export interface PhaseInfo {
    nsGreen: boolean;
    ewGreen: boolean;
}
export declare function mulberry32(seed: number): () => number;
export declare function spawnCar(rng: () => number): Car;
declare function isSignalizedNear(x: number, y: number): boolean;
export declare function stepCar(car: Car, dt: number, cars: Car[], phases: Map<string, PhaseInfo>): void;
/** Finished when route done or outside square (+50 m margin). */
export declare function isDone(car: Car): boolean;
export { isSignalizedNear };
