import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createServer as createH1 } from "node:http";
import { createServer as createH2 } from "node:http2";
/**
 * Serve the same Connect routes twice:
 * - HTTP/2 h2c (PLAINTEXT_PORT): real gRPC for grpcurl + server-to-server.
 * - HTTP/1.1 (WEB_PORT): gRPC-Web / Connect for browsers.
 * Single-port h2c+HTTP/1 is impossible: Node's plaintext h2 server cannot
 * downgrade (verified: HTTP/1 client gets a binary preface error).
 */
export function serveDual(routes, name, ports) {
    const { h2Port, h1Port } = ports;
    const inner = connectNodeAdapter({ routes });
    const call = inner;
    const handle = (req, res, proceed) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms, Grpc-Timeout, X-Grpc-Web, X-User-Agent");
        res.setHeader("Access-Control-Expose-Headers", "Grpc-Status, Grpc-Message");
        if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }
        proceed();
    };
    createH2().on("request", (req, res) => handle(req, res, () => call(req, res))).listen(h2Port);
    createH1((req, res) => handle(req, res, () => call(req, res))).listen(h1Port);
    console.log(`${name}: grpc(h2c) :${h2Port}  grpc-web(h1) :${h1Port}`);
}
//# sourceMappingURL=serve.js.map