import { CITY_SIZE, SIGNALIZED, gridRoads } from "./geo.js";
import type { CarView } from "./client.js";
import type { SignalView } from "./map.js";

/** No-WebGL fallback: OSM raster tiles + Canvas2D, same frame stream. */
export class Fallback2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private el: HTMLElement;
  private z = 13;
  cars: CarView[] = [];
  signals: SignalView[] = [];
  private tiles = new Map<string, HTMLImageElement>();

  constructor() {
    document.getElementById("map")?.remove();
    document.getElementById("cars")?.remove();
    const nogl = document.getElementById("nogl");
    nogl!.hidden = false;
    this.el = document.getElementById("map2d")!;
    this.canvas = document.createElement("canvas");
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    const fit = () => {
      this.canvas.width = this.el.clientWidth;
      this.canvas.height = this.el.clientHeight;
      this.loadTiles();
    };
    new ResizeObserver(fit).observe(this.el);
    fit();
    const draw = () => {
      this.draw();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  // Anchor: Manizales 5.069,-75.517
  private center = (() => {
    const lat = 5.069;
    const lng = -75.517;
    const n = 2 ** this.z;
    return {
      x: ((lng + 180) / 360) * n * 256,
      y: ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n * 256,
    };
  })();

  private loadTiles() {
    const n = 2 ** this.z;
    const cx = Math.floor(this.center.x / 256);
    const cy = Math.floor(this.center.y / 256);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const key = `${this.z}/${cx + dx}/${cy + dy}`;
        if (this.tiles.has(key)) continue;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `https://tile.openstreetmap.org/${key}.png`;
        this.tiles.set(key, img);
        img.onload = () => this.drawStatic();
      }
    }
  }

  private scale(): number {
    return Math.min(this.canvas.width, this.canvas.height) / (CITY_SIZE * 1.15);
  }

  private toPx(x: number, y: number) {
    const s = this.scale();
    const ox = this.canvas.width / 2 - (CITY_SIZE / 2) * s;
    const oy = this.canvas.height / 2 - (CITY_SIZE / 2) * s;
    return { x: ox + x * s, y: oy + (CITY_SIZE - y) * s };
  }

  private drawStatic() {}

  private draw() {
    const { ctx } = this;
    ctx.fillStyle = "#0b0e12";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // tiles as dim backdrop
    ctx.globalAlpha = 0.45;
    const n = 2 ** this.z;
    const ox = this.canvas.width / 2 - this.center.x * this.scale() * 40;
    void n;
    void ox;
    for (const [key, img] of this.tiles) {
      if (!img.complete || !img.naturalWidth) continue;
      const [, tx, ty] = key.split("/").map(Number);
      const px = this.canvas.width / 2 + (tx * 256 - this.center.x);
      const py = this.canvas.height / 2 + (ty * 256 - this.center.y);
      ctx.drawImage(img, px, py);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#3a4149";
    ctx.lineWidth = 2;
    for (const r of gridRoads()) {
      const a = this.toPx(0, r);
      const b = this.toPx(CITY_SIZE, r);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const c = this.toPx(r, 0);
      const d = this.toPx(r, CITY_SIZE);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }
    for (const c of this.cars) {
      const p = this.toPx(c.x, c.y);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(((c.headingDeg + 180) * Math.PI) / 180);
      ctx.fillStyle = c.color;
      ctx.fillRect(-2, -5, 4, 10);
      ctx.restore();
    }
    ctx.fillStyle = "#eee";
    ctx.font = "12px system-ui";
    ctx.fillText(`2D fallback · ${this.cars.length} cars · z${this.z}`, 8, 16);
    void SIGNALIZED;
  }
}
