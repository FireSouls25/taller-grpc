// Pure signal timing: 20 s cycle @20Hz => 400 ticks (short cycle keeps
// queues discharging in a saturated demo city).
// NS_GREEN 0-159, NS_YELLOW 160-199, EW_GREEN 200-359, EW_YELLOW 360-399.

export const TICKS_PER_SEC = 20;
export const CYCLE_TICKS = 400;

export type PhaseName = "NS_GREEN" | "NS_YELLOW" | "EW_GREEN" | "EW_YELLOW";

export function phaseAt(tick: number): { phase: PhaseName; remainingS: number } {
  const t = ((Math.floor(tick) % CYCLE_TICKS) + CYCLE_TICKS) % CYCLE_TICKS;
  if (t < 160) return { phase: "NS_GREEN", remainingS: (160 - t) / TICKS_PER_SEC };
  if (t < 200) return { phase: "NS_YELLOW", remainingS: (200 - t) / TICKS_PER_SEC };
  if (t < 360) return { phase: "EW_GREEN", remainingS: (360 - t) / TICKS_PER_SEC };
  return { phase: "EW_YELLOW", remainingS: (400 - t) / TICKS_PER_SEC };
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
