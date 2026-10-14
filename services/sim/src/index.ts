import { createClient } from "@connectrpc/connect";
import type { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { Phase, SignalService } from "./gen/signals_pb.js";
import { SimService } from "./gen/sim_pb.js";
import { serveDual } from "./serve.js";
import { SIGNALIZED } from "./city.js";
import { isDone, gapAhead, mulberry32, spawnCar, stepCar, type Car, type PhaseInfo } from "./engine.js";

const SIGNALS_URL = process.env.SIGNALS_URL ?? "http://localhost:50051";
const TICK_MS = 50;
const MAX_CARS = 300;

const rng = mulberry32(20261014);

const state = {
  cars: new Map<number, Car>(),
  running: true,
  speed: 1,
  spawnRate: 0.5, // cars/sec: matched to green capacity; raise for gridlock demo
  spawnAcc: 0,
  lastLoop: Date.now(),
};

// Real gRPC over HTTP/2 to the signals service (server-to-server).
const signals = createClient(
  SignalService,
  createGrpcTransport({ baseUrl: SIGNALS_URL }),
);

async function fetchPhases(tick: bigint): Promise<Map<string, PhaseInfo>> {
  const out = new Map<string, PhaseInfo>();
  await Promise.all(
    SIGNALIZED.map(async (it) => {
      try {
        const r = await signals.getPhase({ intersectionId: it.id, tick });
        out.set(it.id, {
          nsGreen: r.phase === Phase.NS_GREEN,
          nsYellow: r.phase === Phase.NS_YELLOW,
          ewGreen: r.phase === Phase.EW_GREEN,
          ewYellow: r.phase === Phase.EW_YELLOW,
        });
      } catch (err) {
        // signals unreachable -> all red (dependency is load-bearing)
        console.error(`getPhase ${it.id} failed:`, (err as Error).message);
        out.set(it.id, { nsGreen: false, nsYellow: false, ewGreen: false, ewYellow: false });
      }
    }),
  );
  return out;
}

async function loop() {
  const now = Date.now();
  const elapsed = Math.min((now - state.lastLoop) / 1000, 0.5);
  state.lastLoop = now;
  if (!state.running) return;
  const tick = BigInt(Math.floor(now / TICK_MS));
  const phases = await fetchPhases(tick);
  const cars = [...state.cars.values()];
  const dt = elapsed * state.speed;
  for (const car of cars) stepCar(car, dt, cars, phases);
  for (const [id, car] of state.cars) if (isDone(car)) state.cars.delete(id);
  state.spawnAcc += state.spawnRate * elapsed;
  while (state.spawnAcc >= 1 && state.cars.size < MAX_CARS) {
    state.spawnAcc -= 1;
    const car = spawnCar(rng);
    // don't materialize inside another car; try again next tick
    if (gapAhead(car, [...state.cars.values()]) < 8) {
      state.spawnAcc = Math.min(state.spawnAcc + 1, 3);
      continue;
    }
    state.cars.set(car.id, car);
  }
  if (state.cars.size >= MAX_CARS) state.spawnAcc = 0;
}
setInterval(() => void loop(), TICK_MS);

const LANE_OFFSET = 1.8; // right-hand visual offset so opposing flows don't overlap

function snapshot() {
  return {
    tick: BigInt(Math.floor(Date.now() / TICK_MS)),
    vehicles: [...state.cars.values()].map((c) => {
      const r = (c.headingDeg * Math.PI) / 180;
      const fx = Math.sin(r);
      const fy = Math.cos(r);
      return {
        id: c.id,
        x: c.x + fy * LANE_OFFSET,
        y: c.y - fx * LANE_OFFSET,
        headingDeg: c.headingDeg,
        speedMps: c.speed,
        color: c.color,
      };
    }),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function routes(router: ConnectRouter) {
  router.service(SimService, {
    async control(req) {
      if (req.running !== undefined) state.running = req.running;
      if (req.speed !== undefined) state.speed = Math.min(8, Math.max(0.1, req.speed));
      if (req.spawnRate !== undefined)
        state.spawnRate = Math.min(10, Math.max(0, req.spawnRate));
      return {
        running: state.running,
        speed: state.speed,
        spawnRate: state.spawnRate,
        tick: BigInt(Math.floor(Date.now() / TICK_MS)),
        vehicleCount: state.cars.size,
      };
    },
    async *subscribeFrames(_req, ctx: HandlerContext) {
      while (!ctx.signal.aborted) {
        yield snapshot();
        await sleep(TICK_MS);
      }
    },
  });
}

serveDual(routes, "sim", {
  h2Port: Number(process.env.PLAINTEXT_PORT ?? 50052),
  h1Port: Number(process.env.WEB_PORT ?? 50062),
});
console.log(`sim -> signals ${SIGNALS_URL}`);
