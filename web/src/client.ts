import { createClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { SignalService } from "./gen/signals_pb.js";
import { SimService } from "./gen/sim_pb.js";

const SIM_URL = import.meta.env.VITE_SIM_URL ?? "http://localhost:50062";
const SIGNALS_URL = import.meta.env.VITE_SIGNALS_URL ?? "http://localhost:50061";

export const sim = createClient(
  SimService,
  createGrpcWebTransport({ baseUrl: SIM_URL }),
);
export const sigs = createClient(
  SignalService,
  createGrpcWebTransport({ baseUrl: SIGNALS_URL }),
);

export interface CarView {
  id: number;
  x: number;
  y: number;
  headingDeg: number;
  speed: number;
  color: string;
}
