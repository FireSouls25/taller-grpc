// Pure signal timing: 30 s cycle @20Hz => 600 ticks.
// NS_GREEN 0-239, NS_YELLOW 240-299, EW_GREEN 300-539, EW_YELLOW 540-599.

export const TICKS_PER_SEC = 20;
export const CYCLE_TICKS = 600;

export type PhaseName = "NS_GREEN" | "NS_YELLOW" | "EW_GREEN" | "EW_YELLOW";

export function phaseAt(tick: number): { phase: PhaseName; remainingS: number } {
  const t = ((Math.floor(tick) % CYCLE_TICKS) + CYCLE_TICKS) % CYCLE_TICKS;
  if (t < 240) return { phase: "NS_GREEN", remainingS: (240 - t) / TICKS_PER_SEC };
  if (t < 300) return { phase: "NS_YELLOW", remainingS: (300 - t) / TICKS_PER_SEC };
  if (t < 540) return { phase: "EW_GREEN", remainingS: (540 - t) / TICKS_PER_SEC };
  return { phase: "EW_YELLOW", remainingS: (600 - t) / TICKS_PER_SEC };
}

/** Movement along NS axis allowed? heading 0=N(+y), 180=S */
export function nsAllowed(phase: PhaseName): boolean {
  return phase === "NS_GREEN";
}

/** Movement along EW axis allowed? heading 90=E(+x), 270=W */
export function ewAllowed(phase: PhaseName): boolean {
  return phase === "EW_GREEN";
}

// Must match services/sim city.ts: signalized = roads [3,4] x roads [3,4].
export const SIGNALIZED_IDS = ["i3x3", "i3x4", "i4x3", "i4x4"];
