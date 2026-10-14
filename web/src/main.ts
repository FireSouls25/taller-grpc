import { sim, sigs } from "./client.js";
import type { CarView } from "./client.js";
import { Fallback2D } from "./fallback.js";
import { Overlay, hasWebGL2, initMap } from "./map.js";
import type { SignalView } from "./map.js";
import { City3D } from "./city3d.js";

const stats = document.getElementById("stats")!;
const lights = document.getElementById("lights")!;
const btn = document.getElementById("btn-run") as HTMLButtonElement;
const btnView = document.getElementById("btn-view") as HTMLButtonElement;
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

// Sinks receive the same streams; visibility decides what you see.
let overlay: Overlay | null = null;
let city3d: City3D | null = null;
let mapObj: ReturnType<typeof initMap> | null = null;
let mode: "3d" | "2d" = "3d";

function pushCars(cars: CarView[]) {
  if (overlay) overlay.cars = cars;
  if (city3d) city3d.cars = cars;
}

function pushSignals(s: SignalView[]) {
  if (overlay) overlay.signals = s;
  if (city3d) city3d.signals = s;
}

function applyMode() {
  const show3d = mode === "3d";
  city3d?.setVisible(show3d);
  document.getElementById("map")!.style.display = show3d ? "none" : "block";
  document.getElementById("cars")!.style.display = show3d ? "none" : "block";
  btnView.textContent = show3d ? "2D map" : "3D city";
  if (!show3d && !mapObj) {
    mapObj = initMap(() => {});
    overlay = new Overlay(mapObj);
  } else if (!show3d && mapObj) {
    mapObj.resize();
  }
}

btnView.onclick = () => {
  mode = mode === "3d" ? "2d" : "3d";
  applyMode();
};

let statBase = "streaming…";
let lastFrameAt = 0;
setInterval(() => {
  if (!lastFrameAt) return;
  const age = (Date.now() - lastFrameAt) / 1000;
  stats.textContent = age > 2 ? `${statBase} · STALLED ${age.toFixed(0)}s` : statBase;
}, 500);

async function consumeFrames() {
  for (;;) {
    try {
      for await (const f of sim.subscribeFrames({})) {
        lastFrameAt = Date.now();
        pushCars(f.vehicles as unknown as CarView[]);
        const cars = f.vehicles;
        const avg = cars.length
          ? cars.reduce((a, c) => a + c.speedMps, 0) / cars.length
          : 0;
        statBase = `${cars.length} cars · avg ${avg.toFixed(1)} m/s · gRPC-Web`;
        stats.textContent = statBase;
      }
    } catch (err) {
      statBase = `stream error: ${(err as Error).message} — retrying…`;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function consumeSignals() {
  try {
    for await (const f of sigs.subscribeSignals({})) {
      pushSignals(f.states.map((s) => ({ id: s.intersectionId, phase: s.phase })));
      lights.innerHTML = f.states
        .map(
          (s) =>
            `<span class="sig ${s.phase <= 2 ? "ns" : "ew"}">${s.intersectionId}:${s.phase}</span>`,
        )
        .join("");
    }
  } catch (err) {
    lights.textContent = `signals error: ${(err as Error).message}`;
  }
}

if (hasWebGL2()) {
  stats.textContent = "streaming…";
  city3d = new City3D();
  applyMode();
  void consumeFrames();
  void consumeSignals();
} else {
  const fb = new Fallback2D();
  btnView.disabled = true;
  stats.textContent = "2D fallback mode";
  void (async () => {
    for await (const f of sim.subscribeFrames({})) {
      fb.cars = f.vehicles as unknown as CarView[];
      stats.textContent = `2D fallback · ${f.vehicles.length} cars`;
    }
  })();
  void (async () => {
    for await (const f of sigs.subscribeSignals({})) {
      fb.signals = f.states.map((s) => ({ id: s.intersectionId, phase: s.phase }));
    }
  })();
}
