#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd proto && ../node_modules/.bin/buf generate)
mkdir -p services/signals/src/gen services/sim/src/gen web/src/gen
cp gen/signals_pb.ts services/signals/src/gen/
cp gen/sim_pb.ts gen/signals_pb.ts services/sim/src/gen/
cp gen/sim_pb.ts gen/signals_pb.ts web/src/gen/
echo OK
