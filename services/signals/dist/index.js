import { Phase, SignalService } from "./gen/signals_pb.js";
import { serveDual } from "./serve.js";
import { phaseAt, SIGNALIZED_IDS } from "./timing.js";
const TICK_MS = 50;
const NAME_TO_PROTO = {
    NS_GREEN: Phase.NS_GREEN,
    NS_YELLOW: Phase.NS_YELLOW,
    EW_GREEN: Phase.EW_GREEN,
    EW_YELLOW: Phase.EW_YELLOW,
};
export function wallTick() {
    return BigInt(Math.floor(Date.now() / TICK_MS));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function routes(router) {
    router.service(SignalService, {
        async getPhase(req) {
            const { phase, remainingS } = phaseAt(Number(req.tick));
            return {
                intersectionId: req.intersectionId,
                phase: NAME_TO_PROTO[phase],
                remainingS,
            };
        },
        async *subscribeSignals(_req, ctx) {
            while (!ctx.signal.aborted) {
                const tick = wallTick();
                const { phase, remainingS } = phaseAt(Number(tick));
                yield {
                    tick,
                    states: SIGNALIZED_IDS.map((id) => ({
                        intersectionId: id,
                        phase: NAME_TO_PROTO[phase],
                        remainingS,
                    })),
                };
                await sleep(250);
            }
        },
    });
}
serveDual(routes, "signals", {
    h2Port: Number(process.env.PLAINTEXT_PORT ?? 50051),
    h1Port: Number(process.env.WEB_PORT ?? 50061),
});
//# sourceMappingURL=index.js.map