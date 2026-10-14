# City Traffic Simulator over gRPC

Kinematic traffic sim (5 km square, 9×9 grid, 4 signalized intersections,
12 edge portals, cap 300 cars) with two real gRPC microservices and a
MapLibre + Canvas web UI (Canvas2D fallback when WebGL2 is missing).

## Layout

```
proto/                  sim.proto, signals.proto (+ buf.yaml / buf.gen.yaml)
gen/                    buf output (intermediate; copied into packages by gen.sh)
services/signals/       SignalService :50051 h2c / :50061 h1
services/sim/           SimService    :50052 h2c / :50062 h1
web/                    Vite + TS + MapLibre + OpenFreeMap  :5173
```

Each service serves **real gRPC over HTTP/2 plaintext** (for `grpcurl` /
server-to-server) **and** gRPC-Web/Connect over HTTP/1.1 (for browsers) via
`connectNodeAdapter`. Single-port h2c+HTTP/1 is impossible with Node's
plaintext h2 server (verified: HTTP/1 client receives a binary preface
error), hence two ports per service.

## Run

```bash
npm install
bash scripts/gen.sh            # buf generate + copy into packages
npm run dev -w signals &       # :50051 / :50061
npm run dev -w sim &           # :50052 / :50062  (SIGNALS_URL=http://localhost:50051)
npm run dev -w web             # :5173
```

## Prove gRPC is load-bearing

```bash
# true gRPC over h2c (needs buf's --http2-prior-knowledge for plaintext)
./node_modules/.bin/buf curl --protocol grpc --http2-prior-knowledge \
  --schema proto --data '{"running": true}' \
  http://localhost:50052/traffic.sim.v1.SimService/Control

./node_modules/.bin/buf curl --protocol grpc --http2-prior-knowledge \
  --schema proto --data '{"intersectionId":"i3x3","tick":"100"}' \
  http://localhost:50051/traffic.signals.v1.SignalService/GetPhase

# stream frames (20 Hz server tick)
./node_modules/.bin/buf curl --protocol grpc --http2-prior-knowledge \
  --schema proto --data '{}' \
  http://localhost:50052/traffic.sim.v1.SimService/SubscribeFrames

# gRPC-Web binary framing, same bytes a browser sends (port :50061 = h1)
python3 -c "import struct; p=b'\x0a\x04i3x3\x10\x64'; open('/tmp/gw.bin','wb').write(b'\x00'+struct.pack('>I',len(p))+p)"
curl -X POST http://localhost:50061/traffic.signals.v1.SignalService/GetPhase \
  -H 'Content-Type: application/grpc-web+proto' -H 'X-Grpc-Web: 1' \
  --data-binary @/tmp/gw.bin | xxd | head -3   # ends with grpc-status: 0

# kill signals -> sim degrades to all-red (dependency is load-bearing)
# kill -STOP <signals-pid> ; watch cars stop at the 4 lights, then -CONT
```

## Design notes

- One wall clock: `tick = floor(Date.now()/50)` everywhere, so sim logic,
  signal stream, and `GetPhase` always agree on phase.
- Server ticks at fixed 20 Hz; slow stream consumers get latest-only
  (drop, don't queue).
- Cars: kinematic-heterogeneous (`v0` 8–16 m/s), stop at red within
  braking distance or leader gap < 9 m. Poisson spawn at portals.
- Renderer: MapLibre (OpenFreeMap liberty, no key) + canvas overlay for
  grid/signals/cars, **plus a three.js 3D city** (default view): extruded
  blocks, road grid with dashes, live signal poles, instanced 3D cars.
  Toggle with the "2D map / 3D city" button. No-WebGL browsers get the
  Canvas2D/raster fallback. Both 3D and 2D read the same `Frame` stream.
