import * as THREE from "three";
import { CITY_SIZE, SIGNALIZED, gridRoads } from "./geo.js";
import type { CarView } from "./client.js";
import type { SignalView } from "./map.js";
import { Phase } from "./gen/signals_pb.js";

// City meters -> three.js units (y-up). North = -z.
const C = CITY_SIZE / 2;
const X = (x: number) => x - C;
const Z = (y: number) => -(y - C);

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_CARS = 300;

/** Basic 3D city: blocks, roads, live signals, instanced cars. */
export class City3D {
  cars: CarView[] = [];
  signals: SignalView[] = [];

  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private bodyMesh!: THREE.InstancedMesh;
  private cabinMesh!: THREE.InstancedMesh;
  private wheelMesh!: THREE.InstancedMesh;
  private brakeMesh!: THREE.InstancedMesh;
  private heads = new Map<string, { ns: THREE.Mesh; ew: THREE.Mesh }>();
  private bodyColor = new THREE.Color();
  private brakeOn = new THREE.Color(0xff2222);
  private brakeOff = new THREE.Color(0x3a0a0a);

  // orbit state
  private target = new THREE.Vector3(0, 0, 0);
  private radius = 2400;
  private theta = 0.6;
  private phi = 1.02;

  constructor() {
    this.canvas = document.getElementById("view3d") as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene.background = new THREE.Color(0x0b0e13);
    this.scene.fog = new THREE.Fog(0x0b0e13, 6000, 16000);

    this.camera = new THREE.PerspectiveCamera(50, 1, 10, 40000);

    this.scene.add(new THREE.HemisphereLight(0xbdd3ff, 0x1a2027, 1.15));
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.0);
    sun.position.set(-3000, 5000, 2500);
    this.scene.add(sun);

    this.buildGround();
    this.buildRoads();
    this.buildBlocks();
    this.buildSignals();
    this.buildCars();
    this.bindControls();
    this.resize();
    window.addEventListener("resize", () => this.resize());

    const loop = () => {
      this.updateCamera();
      this.updateCars();
      this.updateSignals();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  setVisible(v: boolean) {
    this.canvas.style.display = v ? "block" : "none";
  }

  private resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- static geometry ----------

  private flat(w: number, d: number, color: number, y = 0): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ color }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    this.scene.add(m);
    return m;
  }

  private buildGround() {
    this.flat(24000, 24000, 0x11151a, -0.5); // outskirts
    const slab = this.flat(CITY_SIZE + 200, CITY_SIZE + 200, 0x20262d, 0);
    slab.position.set(0, 0, 0);
  }

  private buildRoads() {
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x49525d });
    const roads = gridRoads();
    for (const r of roads) {
      for (const vertical of [true, false]) {
        const g = new THREE.PlaneGeometry(vertical ? 16 : CITY_SIZE, vertical ? CITY_SIZE : 16);
        const m = new THREE.Mesh(g, roadMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(vertical ? X(r) : 0, 0.2, vertical ? 0 : Z(r));
        this.scene.add(m);
      }
    }
    // center dashes, one InstancedMesh for all roads
    const dashGeo = new THREE.BoxGeometry(0.35, 0.1, 4);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x9aa3ad });
    const positions: [number, number][] = [];
    for (const r of roads) {
      for (let s = 200; s < CITY_SIZE - 100; s += 16) {
        positions.push([r, s]);
        positions.push([s, r]);
      }
    }
    const dashes = new THREE.InstancedMesh(dashGeo, dashMat, positions.length);
    const m4 = new THREE.Matrix4();
    positions.forEach(([a, b], i) => {
      m4.makeTranslation(X(a), 0.3, Z(b));
      dashes.setMatrixAt(i, m4);
    });
    dashes.instanceMatrix.needsUpdate = true;
    this.scene.add(dashes);
  }

  private buildBlocks() {
    const rng = mulberry(42);
    const roads = gridRoads();
    const palette = [0x2e3640, 0x39424e, 0x465064, 0x525e70, 0x3a3f4a, 0x4c5666];
    const mats: { pos: THREE.Vector3; scale: THREE.Vector3; color: THREE.Color }[] = [];
    for (let ix = 0; ix < roads.length - 1; ix++) {
      for (let iy = 0; iy < roads.length - 1; iy++) {
        const x0 = roads[ix] + 14;
        const x1 = roads[ix + 1] - 14;
        const y0 = roads[iy] + 14;
        const y1 = roads[iy + 1] - 14;
        // 2x2 lots per block, random skip
        for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
          if (rng() < 0.25) continue;
          const cx = x0 + (x1 - x0) * fx;
          const cy = y0 + (y1 - y0) * fy;
          const w = 60 + rng() * 120;
          const d = 60 + rng() * 120;
          const distC = Math.hypot(cx - C, cy - C) / C; // 0 center -> ~1 edge
          const h = 12 + rng() * rng() * 90 * (1.3 - distC);
          mats.push({
            pos: new THREE.Vector3(X(cx), h / 2, Z(cy)),
            scale: new THREE.Vector3(w, h, d),
            color: new THREE.Color(palette[Math.floor(rng() * palette.length)]),
          });
        }
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const inst = new THREE.InstancedMesh(geo, mat, mats.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    void one;
    mats.forEach((b, i) => {
      m4.compose(b.pos, q, b.scale);
      inst.setMatrixAt(i, m4);
      inst.setColorAt(i, b.color);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.scene.add(inst);
  }

  private pole(x: number, z: number) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 9, 8),
      new THREE.MeshLambertMaterial({ color: 0x14171b }),
    );
    pole.position.y = 4.5;
    g.add(pole);
    const mkHead = (dy: number) => {
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xe74c3c }),
      );
      head.position.y = dy;
      g.add(head);
      return head;
    };
    g.position.set(x, 0, z);
    this.scene.add(g);
    return { ns: mkHead(9.5), ew: mkHead(7.2) };
  }

  private buildSignals() {
    for (const s of SIGNALIZED) {
      this.heads.set(s.id, this.pole(X(s.x) + 11, Z(s.y) - 11));
    }
  }

  private buildCars() {
    // 2x exaggerated: real 4.4 m cars are sub-pixel at city zoom
    const bodyGeo = new THREE.BoxGeometry(3.8, 2.0, 8.8);
    const cabinGeo = new THREE.BoxGeometry(3.2, 1.4, 4.0);
    // unlit bodies: car colors stay bright under any light
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cabinMat = new THREE.MeshLambertMaterial({ color: 0x14181d });
    this.bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, MAX_CARS);
    this.cabinMesh = new THREE.InstancedMesh(cabinGeo, cabinMat, MAX_CARS);
    const wheelGeo = new THREE.BoxGeometry(1.0, 1.2, 1.9);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0b0d10 });
    this.wheelMesh = new THREE.InstancedMesh(wheelGeo, wheelMat, MAX_CARS * 4);
    const brakeGeo = new THREE.BoxGeometry(1.1, 0.7, 0.5);
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.brakeMesh = new THREE.InstancedMesh(brakeGeo, brakeMat, MAX_CARS * 2);
    this.bodyMesh.count = 0;
    this.cabinMesh.count = 0;
    this.wheelMesh.count = 0;
    this.brakeMesh.count = 0;
    this.bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cabinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.wheelMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.brakeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.bodyMesh, this.cabinMesh, this.wheelMesh, this.brakeMesh);
  }

  // ---------- per-frame ----------

  private updateCars() {
    const n = Math.min(this.cars.length, MAX_CARS);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const c = this.cars[i];
      const rad = (c.headingDeg * Math.PI) / 180;
      const yaw = Math.atan2(Math.sin(rad), -Math.cos(rad));
      // right-hand lane offset, same as 2D snapshot
      const ox = Math.cos(rad) * 1.8;
      const oy = -Math.sin(rad) * 1.8;
      q.setFromEuler(e.set(0, yaw, 0));
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const rx = -fz;
      const rz = fx;
      const cx = X(c.x + ox);
      const cz = Z(c.y + oy);
      p.set(cx, 1.5, cz);
      m4.compose(p, q, s);
      this.bodyMesh.setMatrixAt(i, m4);
      this.bodyColor.set(c.color);
      this.bodyMesh.setColorAt(i, this.bodyColor);
      p.y = 3.2;
      p.x = cx - fx * 0.5;
      p.z = cz - fz * 0.5;
      m4.compose(p, q, s);
      this.cabinMesh.setMatrixAt(i, m4);
      // wheels: 4 corners
      let w = i * 4;
      for (const [sx, sz] of [[1.6, 2.9], [-1.6, 2.9], [1.6, -2.9], [-1.6, -2.9]]) {
        p.set(cx + rx * sx + fx * sz, 0.7, cz + rz * sx + fz * sz);
        m4.compose(p, q, s);
        this.wheelMesh.setMatrixAt(w++, m4);
      }
      // brake lights: bright red when slow/stopped
      const bc = c.speed < 2 ? this.brakeOn : this.brakeOff;
      for (const side of [1.2, -1.2]) {
        const bi = i * 2 + (side > 0 ? 0 : 1);
        p.set(cx + rx * side - fx * 4.45, 2.0, cz + rz * side - fz * 4.45);
        m4.compose(p, q, s);
        this.brakeMesh.setMatrixAt(bi, m4);
        this.brakeMesh.setColorAt(bi, bc);
      }
    }
    this.bodyMesh.count = n;
    this.cabinMesh.count = n;
    this.wheelMesh.count = n * 4;
    this.brakeMesh.count = n * 2;
    this.bodyMesh.instanceMatrix.needsUpdate = true;
    this.cabinMesh.instanceMatrix.needsUpdate = true;
    this.wheelMesh.instanceMatrix.needsUpdate = true;
    this.brakeMesh.instanceMatrix.needsUpdate = true;
    if (this.bodyMesh.instanceColor) this.bodyMesh.instanceColor.needsUpdate = true;
    if (this.brakeMesh.instanceColor) this.brakeMesh.instanceColor.needsUpdate = true;
  }

  private updateSignals() {
    for (const [id, heads] of this.heads) {
      const st = this.signals.find((v) => v.id === id);
      const ph = st?.phase;
      const nsCol =
        ph === Phase.NS_GREEN ? 0x2ecc71 : ph === Phase.NS_YELLOW ? 0xf1c40f : 0xe74c3c;
      const ewCol =
        ph === Phase.EW_GREEN ? 0x2ecc71 : ph === Phase.EW_YELLOW ? 0xf1c40f : 0xe74c3c;
      (heads.ns.material as THREE.MeshBasicMaterial).color.setHex(nsCol);
      (heads.ew.material as THREE.MeshBasicMaterial).color.setHex(ewCol);
    }
  }

  // ---------- camera ----------

  private updateCamera() {
    const { theta, phi, radius } = this;
    this.camera.position.set(
      this.target.x + radius * Math.sin(phi) * Math.sin(theta),
      this.target.y + radius * Math.cos(phi),
      this.target.z + radius * Math.sin(phi) * Math.cos(theta),
    );
    this.camera.lookAt(this.target);
  }

  private bindControls() {
    let dragging = false;
    let panning = false;
    let lx = 0;
    let ly = 0;
    this.canvas.addEventListener("pointerdown", (ev) => {
      dragging = true;
      panning = ev.shiftKey || ev.button === 2;
      lx = ev.clientX;
      ly = ev.clientY;
      this.canvas.setPointerCapture(ev.pointerId);
    });
    this.canvas.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - lx;
      const dy = ev.clientY - ly;
      lx = ev.clientX;
      ly = ev.clientY;
      if (panning) {
        const k = this.radius / 900;
        const sin = Math.sin(this.theta);
        const cos = Math.cos(this.theta);
        this.target.x -= (cos * dx - sin * dy) * k;
        this.target.z += (sin * dx + cos * dy) * k;
        const lim = 5000;
        this.target.x = Math.max(-lim, Math.min(lim, this.target.x));
        this.target.z = Math.max(-lim, Math.min(lim, this.target.z));
      } else {
        this.theta -= dx * 0.005;
        this.phi = Math.max(0.2, Math.min(1.35, this.phi - dy * 0.005));
      }
    });
    const up = () => (dragging = false);
    this.canvas.addEventListener("pointerup", up);
    this.canvas.addEventListener("pointercancel", up);
    this.canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
    this.canvas.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        this.radius = Math.max(600, Math.min(12000, this.radius * (1 + ev.deltaY * 0.001)));
      },
      { passive: false },
    );
  }
}
