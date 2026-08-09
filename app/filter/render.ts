// ===========================================================================
//  Teken-logica: tekent camera + filter op een canvas.
//  Hetzelfde canvas dat je ziet, wordt opgenomen → opname = exact je voorbeeld.
// ===========================================================================
import type { CSSProperties } from "react";
import type { Filter, Hud, Overlay, Particle } from "./filters";

export type Seed = { x: number; phase: number; alpha: number; spin: number };

// Maak een vaste set deeltjes-posities (1 keer, blijven hetzelfde tijdens opname)
export function makeSeeds(n: number): Seed[] {
  const seeds: Seed[] = [];
  for (let i = 0; i < n; i++) {
    seeds.push({
      x: Math.random(),
      phase: Math.random(),
      alpha: 0.7 + Math.random() * 0.3,
      spin: Math.random() * 2,
    });
  }
  return seeds;
}

// Maak van de gekleurde stops een gradient-string-stukje
function stopList(colors: string[]): { c: string; at: number }[] {
  const n = colors.length;
  return colors.map((c, i) => ({ c, at: n === 1 ? 0 : i / (n - 1) }));
}

export function drawOverlay(ctx: CanvasRenderingContext2D, o: Overlay, W: number, H: number) {
  ctx.save();
  const op = o.opacity ?? 1;

  if (o.kind === "duotone") {
    const [dark, light] = o.colors ?? ["#000", "#fff"];
    ctx.globalAlpha = op;
    ctx.globalCompositeOperation = "lighten";
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "darken";
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  if (o.kind === "scanlines") {
    ctx.globalAlpha = op;
    ctx.fillStyle = o.lineColor ?? "rgba(0,0,0,0.4)";
    const gap = o.lineGap ?? 3;
    for (let y = 0; y < H; y += gap * 2) ctx.fillRect(0, y, W, gap);
    ctx.restore();
    return;
  }

  if (o.kind === "vignette") {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${op})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  ctx.globalAlpha = op;
  ctx.globalCompositeOperation = (o.blend as GlobalCompositeOperation) ?? "source-over";

  if (o.kind === "wash") {
    ctx.fillStyle = o.colors?.[0] ?? "#000";
  } else if (o.kind === "linear") {
    const rad = ((o.angle ?? 0) * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const half = (Math.abs(dx) * W + Math.abs(dy) * H) / 2;
    const g = ctx.createLinearGradient(W / 2 - dx * half, H / 2 - dy * half, W / 2 + dx * half, H / 2 + dy * half);
    for (const s of stopList(o.colors ?? ["#000", "#fff"])) g.addColorStop(s.at, s.c);
    ctx.fillStyle = g;
  } else {
    // radial
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.7);
    for (const s of stopList(o.colors ?? ["#000", "#fff"])) g.addColorStop(s.at, s.c);
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, p: Particle, seeds: Seed[], t: number, W: number, H: number) {
  ctx.save();
  ctx.globalCompositeOperation = (p.blend as GlobalCompositeOperation) ?? "source-over";
  ctx.font = `${Math.round(p.size * H)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const range = H * 1.2;
  const margin = H * 0.1;
  for (let i = 0; i < p.count; i++) {
    const s = seeds[i % seeds.length];
    const base = t * Math.abs(p.speed) + s.phase;
    const frac = base - Math.floor(base);
    const y = p.speed >= 0 ? frac * range - margin : range - margin - frac * range;
    const x = s.x * W + Math.sin(t * (1 + s.spin) + s.phase * 6) * (p.sway ?? 0) * W;
    ctx.globalAlpha = s.alpha;
    ctx.fillText(p.emoji, x, y);
  }
  ctx.restore();
}

function drawProps(ctx: CanvasRenderingContext2D, props: NonNullable<Filter["props"]>, W: number, H: number) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const pr of props) {
    if (pr.anchor) continue; // gezicht-volgende accessoires worden live (DOM) getekend
    ctx.save();
    ctx.translate(pr.x * W, pr.y * H);
    if (pr.rot) ctx.rotate((pr.rot * Math.PI) / 180);
    ctx.font = `${Math.round(pr.size * H)}px serif`;
    ctx.fillText(pr.emoji, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ---- Filter zélf toepassen (pixel-voor-pixel) — werkt overal, ook Safari ----
type Op =
  | { t: "bright" | "contrast" | "sat" | "gray" | "sepia" | "invert"; v: number }
  | { t: "hue"; m: number[] };

export function parseFilter(css: string): Op[] {
  const ops: Op[] = [];
  const re = /([a-z-]+)\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const name = m[1];
    const v = parseFloat(m[2]);
    if (name === "brightness") ops.push({ t: "bright", v });
    else if (name === "contrast") ops.push({ t: "contrast", v });
    else if (name === "saturate") ops.push({ t: "sat", v });
    else if (name === "grayscale") ops.push({ t: "gray", v });
    else if (name === "sepia") ops.push({ t: "sepia", v });
    else if (name === "invert") ops.push({ t: "invert", v });
    else if (name === "hue-rotate") {
      const a = (v * Math.PI) / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      ops.push({
        t: "hue",
        m: [
          0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
          0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
          0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
        ],
      });
    }
  }
  return ops;
}

export function applyColorFilter(data: Uint8ClampedArray, ops: Op[]) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;
    for (const op of ops) {
      if (op.t === "bright") { r *= op.v; g *= op.v; b *= op.v; }
      else if (op.t === "contrast") { r = (r - 0.5) * op.v + 0.5; g = (g - 0.5) * op.v + 0.5; b = (b - 0.5) * op.v + 0.5; }
      else if (op.t === "sat") { const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; r = l + (r - l) * op.v; g = l + (g - l) * op.v; b = l + (b - l) * op.v; }
      else if (op.t === "gray") { const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; r += (l - r) * op.v; g += (l - g) * op.v; b += (l - b) * op.v; }
      else if (op.t === "invert") { r = r + (1 - 2 * r) * op.v; g = g + (1 - 2 * g) * op.v; b = b + (1 - 2 * b) * op.v; }
      else if (op.t === "sepia") {
        const sr = 0.393 * r + 0.769 * g + 0.189 * b, sg = 0.349 * r + 0.686 * g + 0.168 * b, sb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = r + (sr - r) * op.v; g = g + (sg - g) * op.v; b = b + (sb - b) * op.v;
      } else if (op.t === "hue") {
        const m = op.m;
        const nr = r * m[0] + g * m[1] + b * m[2];
        const ng = r * m[3] + g * m[4] + b * m[5];
        const nb = r * m[6] + g * m[7] + b * m[8];
        r = nr; g = ng; b = nb;
      }
    }
    data[i] = r * 255;
    data[i + 1] = g * 255;
    data[i + 2] = b * 255;
  }
}

// ---- Slit-scan: scanlijn loopt naar beneden en "bevriest" elke rij ---------
export function drawSlitScan(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, t: number, W: number, H: number, mirror: boolean) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  const speed = 0.16;
  const frac = (t * speed) % 1;
  const y = Math.floor(frac * H);
  const band = Math.max(3, Math.floor(H * 0.025));

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, W, band);
  ctx.clip();
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, vw, vh, 0, 0, W, H);
  ctx.restore();

  // groene scanlijn met gloed
  ctx.save();
  ctx.fillStyle = "rgba(0,255,170,0.7)";
  ctx.fillRect(0, y + band, W, 3);
  ctx.fillStyle = "rgba(0,255,170,0.15)";
  ctx.fillRect(0, y + band + 3, W, band * 2);
  ctx.restore();
}

// ---- Camera-schermpje (REC, timecode, dradenkruis, VHS-ruis…) op canvas ----
export function fmtTimecode(t: number): string {
  const total = Math.max(0, Math.floor(t));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function dateStamp(): string {
  const d = new Date();
  const mo = ["JAN", "FEB", "MRT", "APR", "MEI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"][d.getMonth()];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${mo} ${p(d.getDate())} ${d.getFullYear()}  ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function drawHud(ctx: CanvasRenderingContext2D, hud: Hud, t: number, W: number, H: number) {
  const accent = hud.accent ?? "#ffffff";
  const fam = hud.mono ? "monospace" : "sans-serif";
  const fs = Math.max(11, Math.round(H * 0.045));
  const pad = Math.round(H * 0.045);
  const cx = W / 2, cy = H / 2;

  ctx.save();
  ctx.textBaseline = "top";

  // Zwarte filmbalken boven + onder
  if (hud.cinemaBars) {
    ctx.fillStyle = "#000";
    const bar = Math.round(H * 0.11);
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
  }

  // Verrekijker-masker: alles zwart behalve een rond venster
  if (hud.circleMask) {
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(cx, cy, Math.min(W, H) * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill("evenodd");
  }

  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = Math.max(2, H * 0.006);
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;

  // Dradenkruis in het midden
  if (hud.crosshair) {
    ctx.save();
    ctx.lineWidth = Math.max(1, H * 0.003);
    const g = fs * 0.6, arm = fs * 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - g - arm, cy); ctx.lineTo(cx - g, cy);
    ctx.moveTo(cx + g, cy); ctx.lineTo(cx + g + arm, cy);
    ctx.moveTo(cx, cy - g - arm); ctx.lineTo(cx, cy - g);
    ctx.moveTo(cx, cy + g); ctx.lineTo(cx, cy + g + arm);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, g * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Horizonlijn (drone)
  if (hud.horizon) {
    ctx.save();
    ctx.lineWidth = Math.max(1, H * 0.0025);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, cy); ctx.lineTo(cx - fs, cy);
    ctx.moveTo(cx + fs, cy); ctx.lineTo(W * 0.8, cy);
    ctx.stroke();
    ctx.restore();
  }

  // Focus-haakjes rond het midden
  if (hud.brackets) {
    ctx.save();
    ctx.lineWidth = Math.max(1, H * 0.004);
    const bw = W * 0.26, bh = H * 0.26, len = Math.min(bw, bh) * 0.3;
    const corners = [
      [cx - bw, cy - bh, 1, 1], [cx + bw, cy - bh, -1, 1],
      [cx - bw, cy + bh, 1, -1], [cx + bw, cy + bh, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Hoek-haakjes in de schermhoeken
  if (hud.corners) {
    ctx.save();
    ctx.lineWidth = Math.max(1, H * 0.004);
    const m = pad, len = H * 0.06;
    const corners = [
      [m, m, 1, 1], [W - m, m, -1, 1],
      [m, H - m, 1, -1], [W - m, H - m, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Film-aftelling 3-2-1
  if (hud.countdown) {
    ctx.save();
    const R = Math.min(W, H) * 0.32;
    const frac = t - Math.floor(t);
    const n = 3 - (Math.floor(t) % 3);
    ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(R)}px ${fam}`;
    ctx.fillText(String(n), cx, cy);
    ctx.restore();
    ctx.textBaseline = "top";
  }

  // VHS tracking-ruis balk onderaan
  if (hud.noiseBand) {
    ctx.save();
    const by = H * 0.72 + Math.sin(t * 8) * H * 0.03;
    const bh = H * 0.05;
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 40; i++) {
      const seg = ((Math.sin(i * 12.9898 + Math.floor(t * 12) * 7.233) * 43758.5) % 1 + 1) % 1;
      ctx.fillStyle = seg > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";
      ctx.fillRect((i / 40) * W, by + seg * bh * 0.5, W / 40, bh * (0.3 + seg * 0.7));
    }
    ctx.restore();
    ctx.fillStyle = accent;
  }

  // Tekst: REC + label linksboven
  let ty = pad + (hud.cinemaBars ? H * 0.11 : 0);
  if (hud.rec) {
    const on = Math.floor(t * 2) % 2 === 0;
    const r = fs * 0.34;
    if (on) {
      ctx.save(); ctx.fillStyle = "#ff3b3b";
      ctx.beginPath(); ctx.arc(pad + r, ty + fs * 0.5, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.textAlign = "left";
    ctx.font = `bold ${fs}px ${fam}`;
    ctx.fillStyle = accent;
    ctx.fillText(hud.recLabel ?? "REC", pad + r * 2 + fs * 0.4, ty);
    ty += fs * 1.4;
  }
  if (hud.topLabel) {
    ctx.textAlign = "left";
    ctx.font = `bold ${fs}px ${fam}`;
    ctx.fillStyle = accent;
    ctx.fillText(hud.topLabel, pad, ty);
    ty += fs * 1.4;
  }

  // Rechtsboven: timecode + batterij
  let tyR = pad + (hud.cinemaBars ? H * 0.11 : 0);
  ctx.textAlign = "right";
  ctx.font = `${fs}px ${fam}`;
  ctx.fillStyle = accent;
  if (hud.timecode) { ctx.fillText(fmtTimecode(t), W - pad, tyR); tyR += fs * 1.4; }
  if (hud.battery) {
    const bw = fs * 1.7, bh = fs * 0.8, x2 = W - pad, x1 = x2 - bw, y = tyR;
    ctx.save();
    ctx.lineWidth = Math.max(1, H * 0.003);
    ctx.strokeStyle = accent;
    ctx.strokeRect(x1, y, bw, bh);
    ctx.fillStyle = accent;
    ctx.fillRect(x2, y + bh * 0.28, fs * 0.14, bh * 0.44);
    ctx.fillStyle = "#5eff8a";
    ctx.fillRect(x1 + 2, y + 2, (bw - 4) * 0.7, bh - 4);
    ctx.restore();
    ctx.fillStyle = accent;
  }

  // Onderin: datum/tijd links, info rechts
  const by = H - pad - fs - (hud.cinemaBars ? H * 0.11 : 0);
  if (hud.date || hud.dateText) {
    ctx.textAlign = "left";
    ctx.font = `${fs}px ${fam}`;
    ctx.fillText(hud.dateText ?? dateStamp(), pad, by);
  }
  if (hud.info) {
    ctx.textAlign = "right";
    ctx.font = `${fs}px ${fam}`;
    ctx.fillText(hud.info, W - pad, by);
  }

  ctx.restore();
}

// Subtiele filmflikker + krasje (voor vid: "vb-flicker") in de opname bakken
function drawFlicker(ctx: CanvasRenderingContext2D, t: number, W: number, H: number) {
  ctx.save();
  ctx.globalAlpha = 0.06 + 0.05 * Math.abs(Math.sin(t * 20));
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.5;
  const x = ((t * 0.13) % 1) * W;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x, 0, Math.max(1, W * 0.0015), H);
  ctx.restore();
}

// ---- ECHTE VHS: RGB-split (kleuren uit elkaar) + tracking-scheuren + ruis ---
type VhsOpts = { chroma: number; tear: number; noise: number; wob: number };
const VHS_PRESETS: Record<string, VhsOpts> = {
  vhs: { chroma: 0.006, tear: 1, noise: 0.10, wob: 1.2 },
  vhsheavy: { chroma: 0.013, tear: 2.2, noise: 0.22, wob: 2.6 },
};

// Snelle pseudo-ruis (geen Math.sin per pixel = veel sneller)
function hash8(n: number): number {
  n = (n << 13) ^ n;
  return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) & 0xff;
}

export function applyVHS(ctx: CanvasRenderingContext2D, t: number, W: number, H: number, preset: string) {
  const o = VHS_PRESETS[preset] ?? VHS_PRESETS.vhs;
  const img = ctx.getImageData(0, 0, W, H);
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  const shift = Math.max(1, Math.round(W * o.chroma));
  const frame = Math.floor(t * 30);
  const tearY = ((t * 0.25) % 1) * H;       // langzaam omhoog scrollende scheur
  const tearY2 = ((t * 0.6 + 0.4) % 1) * H; // snellere tweede scheur

  for (let y = 0; y < H; y++) {
    // horizontale verschuiving per rij (gewiebel + scheuren)
    let rs = Math.round(Math.sin(y * 0.25 + t * 6) * o.wob);
    const d1 = Math.abs(y - tearY);
    if (d1 < H * 0.02) rs += Math.round((1 - d1 / (H * 0.02)) * 18 * o.tear);
    const d2 = Math.abs(y - tearY2);
    if (d2 < H * 0.012) rs += Math.round((1 - d2 / (H * 0.012)) * 34 * o.tear);
    const scan = (y & 1) === 0 ? 0.82 : 1; // scanlijn-donkering
    const rowBase = y * W;

    for (let x = 0; x < W; x++) {
      const i = (rowBase + x) * 4;
      // rood links, blauw rechts van groen → klassieke kleurschifting
      let gx = x + rs; if (gx < 0) gx = 0; else if (gx >= W) gx = W - 1;
      let rx = gx - shift; if (rx < 0) rx = 0;
      let bx = gx + shift; if (bx >= W) bx = W - 1;
      const nz = (hash8(x * 13 + y * 7 + frame * 131) - 128) * o.noise;
      out[i] = src[(rowBase + rx) * 4] * scan + nz;
      out[i + 1] = src[(rowBase + gx) * 4 + 1] * scan + nz;
      out[i + 2] = src[(rowBase + bx) * 4 + 2] * scan + nz;
      out[i + 3] = 255;
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
}

// De hele scene tekenen: video (met filter, gespiegeld + ingezoomd) + lagen
export function drawScene(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  filter: Filter,
  zoom: number,
  t: number,
  W: number,
  H: number,
  seeds: Seed[],
  mirror = true
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    return;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Bewegende filters (glitch/wiebel) ook in de opname bakken
  let dx = 0;
  let skew = 0;
  let extra = 1;
  if (filter.vid === "vb-glitch") {
    const ph = t % 1.4;
    if (ph < 0.06) dx = -0.03 * W;
    else if (ph < 0.1) dx = 0.03 * W;
    else if (ph > 0.77 && ph < 0.83) dx = 0.02 * W;
  } else if (filter.vid === "vb-wobble") {
    skew = Math.sin(t * 1.6) * 0.045;
    extra = 1.03 + Math.sin(t * 1.6) * 0.01;
  }

  // 1) Camerabeeld, gespiegeld (selfie) en ingezoomd
  ctx.save();
  const z = zoom * extra;
  const sw = vw / z;
  const sh = vh / z;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.translate(W / 2 + (mirror ? -dx : dx), H / 2);
  ctx.transform(1, 0, skew, 1, 0, 0);
  if (mirror) ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, -W / 2, -H / 2, W, H);
  ctx.restore();

  // 1b) Het filter zélf op de pixels toepassen (Safari-proof)
  const ops = parseFilter(filter.css || "");
  if (ops.length) {
    const img = ctx.getImageData(0, 0, W, H);
    applyColorFilter(img.data, ops);
    ctx.putImageData(img, 0, 0);
  }

  // 1c) Echt per-pixel effect (VHS-kleurschifting, scheuren, ruis)
  if (filter.fx) applyVHS(ctx, t, W, H, filter.fx);

  // 2) Gekleurde laag eroverheen
  if (filter.overlay) drawOverlay(ctx, filter.overlay, W, H);
  // 3) Rondvliegende deeltjes
  if (filter.particles) drawParticles(ctx, filter.particles, seeds, t, W, H);
  // 4) Stickers / props
  if (filter.props) drawProps(ctx, filter.props, W, H);
  // 5) Filmflikker (super-8)
  if (filter.vid === "vb-flicker") drawFlicker(ctx, t, W, H);
  // 6) Camera-schermpje (REC, timecode, dradenkruis…)
  if (filter.hud) drawHud(ctx, filter.hud, t, W, H);
}

// ---- CSS-versie van een overlay, voor het SOEPELE live voorbeeld ----------
function cssStops(colors: string[]): string {
  const n = colors.length;
  if (n === 1) return colors[0];
  return colors.map((c, i) => `${c} ${Math.round((i / (n - 1)) * 100)}%`).join(", ");
}

export function overlayStyle(o: Overlay): CSSProperties {
  const base: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };

  if (o.kind === "scanlines") {
    const gap = o.lineGap ?? 3;
    const c = o.lineColor ?? "rgba(0,0,0,0.4)";
    return {
      ...base,
      opacity: o.opacity ?? 1,
      background: `repeating-linear-gradient(0deg, ${c} 0, ${c} 1px, transparent 1px, transparent ${gap * 2}px)`,
    };
  }
  if (o.kind === "vignette") {
    return {
      ...base,
      background: `radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,${o.opacity ?? 0.7}) 100%)`,
    };
  }

  const blend = (o.blend ?? "normal") as CSSProperties["mixBlendMode"];
  if (o.kind === "wash") {
    return { ...base, opacity: o.opacity ?? 1, mixBlendMode: blend, background: o.colors?.[0] ?? "#000" };
  }
  if (o.kind === "linear") {
    return {
      ...base,
      opacity: o.opacity ?? 1,
      mixBlendMode: blend,
      background: `linear-gradient(${o.angle ?? 0}deg, ${cssStops(o.colors ?? ["#000", "#fff"])})`,
    };
  }
  return {
    ...base,
    opacity: o.opacity ?? 1,
    mixBlendMode: blend,
    background: `radial-gradient(circle at 50% 50%, ${cssStops(o.colors ?? ["#000", "#fff"])})`,
  };
}

// Kies een opname-formaat dat de browser ondersteunt
export function pickMimeType(): { mime: string; ext: string } {
  const types = [
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
    { mime: "video/mp4", ext: "mp4" },
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t.mime)) return t;
  }
  return { mime: "", ext: "webm" };
}
