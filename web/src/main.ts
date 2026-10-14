import { sim, sigs } from "./client.js";
import { Fallback2D } from "./fallback.js";
import { Overlay, hasWebGL2, initMap } from "./map.js";

const stats = document.getElementById("stats")!;
const lights = document.getElementById("lights")!;
const btn = document.getElementById("btn-run") as HTMLButtonElement;
const inSpeed = document.getElementById("in-speed") as HTMLInputElement;
const inSpawn = document.getElementById("in-spawn") as HTMLInputElement;

let running = true;
btn.onclick = async () => {
  running = !running;
  await sim.control({ running });
  btn.textContent = running ? "Pause" : "Resume";
};
inSpeed.onchange = async () => {
  await sim.control({ speed: Number(inSpeed.value) });
};
inSpawn.onchange = async () => {
  await sim.control({ spawnRate: Number(inSpawn.value) });
};

async function consumeFrames(setCars: (n: number) => void, push: (c: never[]) => void) {
  for await (const f of sim.subscribeFrames({})) {
    push(f.vehicles as never[]);
    setCars(f.vehicles.length);
  }
}

async function consumeSignals(
  setSignals: (s: { id: string; phase: number }[]) => void,
) {
  for await (const f of sigs.subscribeSignals({})) {
    setSignals(
      f.states.map((s) => ({ id: s.intersectionId, phase: s.phase })),
    );
    lights.innerHTML = f.states
      .map(
        (s) =>
          `<span class="sig ${s.phase <= 2 ? "ns" : "ew"}">${s.intersectionId}:${s.phase}</span>`,
      )
      .join("");
  }
}

if (hasWebGL2()) {
  const map = initMap(() => stats.textContent = "streaming…");
  const overlay = new Overlay(map);
  map.on("move", () => {});
  void consumeFrames(
    (n) => (stats.textContent = `${n} cars · gRPC-Web → :50062/:50061`),
    (cars) => (overlay.cars = cars as never as typeof overlay.cars),
  );
  void consumeSignals((s) => (overlay.signals = s as never as typeof overlay.signals));
} else {
  const fb = new Fallback2D();
  stats.textContent = "2D fallback mode";
  void consumeFrames(
    (n) => (stats.textContent = `2D fallback · ${n} cars`),
    (cars) => (fb.cars = cars as never as typeof fb.cars),
  );
  void consumeSignals((s) => (fb.signals = s as never as typeof fb.signals));
}
