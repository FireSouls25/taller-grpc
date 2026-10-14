export declare const TICKS_PER_SEC = 20;
export declare const CYCLE_TICKS = 600;
export type PhaseName = "NS_GREEN" | "NS_YELLOW" | "EW_GREEN" | "EW_YELLOW";
export declare function phaseAt(tick: number): {
    phase: PhaseName;
    remainingS: number;
};
/** Movement along NS axis allowed? heading 0=N(+y), 180=S */
export declare function nsAllowed(phase: PhaseName): boolean;
/** Movement along EW axis allowed? heading 90=E(+x), 270=W */
export declare function ewAllowed(phase: PhaseName): boolean;
export declare const SIGNALIZED_IDS: string[];
