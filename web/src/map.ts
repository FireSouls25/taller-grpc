import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ANCHOR_LL, CITY_SIZE, SIGNALIZED, gridRoads, toLngLat } from "./geo.js";
import type { CarView } from "./client.js";
import { Phase } from "./gen/signals_pb.js";

export interface SignalView {
  id: string;
  phase: Phase;
}

export function hasWebGL2(): boolean {
  const c = document.createElement("canvas");
  return !!c.getContext("webgl2");
}

export function initMap(onReady: () => void) {
  const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [ANCHOR_LL.lng, ANCHOR_LL.lat],
    zoom: 12,
    pitch: 0,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.on("load", onReady);
  return map;
}

/** Canvas overlay renderer: synthetic grid + signals + cars. */
export class Overlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  cars: CarView[] = [];
  signals: SignalView[] = [];

  constructor(private map: maplibregl.Map) {
    this.canvas = document.getElementById("cars") as HTMLCanvasElement;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = this.canvas.clientWidth * dpr;
      this.canvas.height = this.canvas.clientHeight * dpr;
    };
    new ResizeObserver(fit).observe(this.canvas);
    fit();
    const draw = () => {
      this.draw();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  private project(x: number, y: number) {
    const { lng, lat } = toLngLat(x, y);
    return this.map.project([lng, lat]);
  }

  private draw() {
    const { ctx } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.save();
    ctx.scale(dpr, dpr);

    // roads
    ctx.strokeStyle = "rgba(30,34,40,0.9)";
    ctx.lineWidth = 5;
    for (const r of gridRoads()) {
      let a = this.project(0, r);
      let b = this.project(CITY_SIZE, r);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      a = this.project(r, 0);
      b = this.project(r, CITY_SIZE);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // center dashes
    ctx.strokeStyle = "rgba(220,220,220,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    for (const r of gridRoads()) {
      const a = this.project(0, r);
      const b = this.project(CITY_SIZE, r);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // signals
    for (const s of SIGNALIZED) {
      const p = this.project(s.x, s.y);
      const st = this.signals.find((v) => v.id === s.id);
      const nsGo = st && (st.phase === Phase.NS_GREEN || st.phase === Phase.NS_YELLOW);
      ctx.fillStyle = nsGo ? "#2ecc71" : "#e74c3c";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "8px system-ui";
      ctx.fillText(s.id, p.x + 9, p.y + 3);
    }

    // cars (kinematic boxes with heading)
    for (const c of this.cars) {
      const p = this.project(c.x, c.y);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(((c.headingDeg + 180) * Math.PI) / 180);
      ctx.fillStyle = c.color;
      ctx.fillRect(-3, -7, 6, 14);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(-3, -4, 6, 5);
      ctx.restore();
    }
    ctx.restore();
  }
}
