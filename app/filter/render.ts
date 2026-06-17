// ===========================================================================
//  Teken-logica: tekent camera + filter op een canvas.
//  Hetzelfde canvas dat je ziet, wordt opgenomen → opname = exact je voorbeeld.
// ===========================================================================
import type { CSSProperties } from "react";
import type { Filter, Overlay, Particle } from "./filters";

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

  // 2) Gekleurde laag eroverheen
  if (filter.overlay) drawOverlay(ctx, filter.overlay, W, H);
  // 3) Rondvliegende deeltjes
  if (filter.particles) drawParticles(ctx, filter.particles, seeds, t, W, H);
  // 4) Stickers / props
  if (filter.props) drawProps(ctx, filter.props, W, H);
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
