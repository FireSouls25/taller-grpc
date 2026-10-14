import type { ConnectRouter } from "@connectrpc/connect";
/**
 * Serve the same Connect routes twice:
 * - HTTP/2 h2c (PLAINTEXT_PORT): real gRPC for grpcurl + server-to-server.
 * - HTTP/1.1 (WEB_PORT): gRPC-Web / Connect for browsers.
 * Single-port h2c+HTTP/1 is impossible: Node's plaintext h2 server cannot
 * downgrade (verified: HTTP/1 client gets a binary preface error).
 */
export declare function serveDual(routes: (router: ConnectRouter) => void, name: string, ports: {
    h2Port: number;
    h1Port: number;
}): void;
