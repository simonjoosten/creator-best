"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ===========================================================================
//  Foto-collage maker — kies foto's, kies een indeling, download als PNG.
// ===========================================================================

type Cell = { x: number; y: number; w: number; h: number };
type Layout = { id: string; naam: string; emoji: string; cells: Cell[] };

// Hulpje: maak een rooster van kolommen × rijen
function grid(cols: number, rows: number): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows });
  return cells;
}

const LAYOUTS: Layout[] = [
  { id: "1", naam: "Enkel", emoji: "⬛", cells: [{ x: 0, y: 0, w: 1, h: 1 }] },
  { id: "2h", naam: "Naast elkaar", emoji: "⬛⬛", cells: grid(2, 1) },
  { id: "2v", naam: "Boven elkaar", emoji: "🔲", cells: grid(1, 2) },
  { id: "2x2", naam: "Vier (2×2)", emoji: "🔳", cells: grid(2, 2) },
  { id: "3strip", naam: "Strip ×3", emoji: "📶", cells: grid(1, 3) },
  { id: "4strip", naam: "Fotohokje ×4", emoji: "🎞️", cells: grid(1, 4) },
  { id: "3x3", naam: "Negen (3×3)", emoji: "#️⃣", cells: grid(3, 3) },
  { id: "3x2", naam: "Zes (3×2)", emoji: "🧱", cells: grid(3, 2) },
  {
    id: "bigL", naam: "Groot links", emoji: "◧",
    cells: [
      { x: 0, y: 0, w: 0.6, h: 1 },
      { x: 0.6, y: 0, w: 0.4, h: 0.5 },
      { x: 0.6, y: 0.5, w: 0.4, h: 0.5 },
    ],
  },
  {
    id: "bigT", naam: "Groot boven", emoji: "⬒",
    cells: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.5, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
    ],
  },
];

const RATIOS = [
  { id: "vierkant", naam: "Vierkant", w: 1200, h: 1200 },
  { id: "staand", naam: "Staand", w: 1080, h: 1350 },
  { id: "liggend", naam: "Liggend", w: 1350, h: 1080 },
  { id: "verhaal", naam: "Verhaal", w: 1080, h: 1920 },
];

const BG_KLEUREN = ["#ffffff", "#000000", "#f7d6e0", "#ffd76e", "#a0e9ff", "#0b1020", "#3fa34d", "#ff5f8f"];

type Foto = { id: number; url: string; el: HTMLImageElement };

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export default function CollagePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const idRef = useRef(0);

  const [fotos, setFotos] = useState<Foto[]>([]);
  const [layoutId, setLayoutId] = useState("2x2");
  const [ratioId, setRatioId] = useState("vierkant");
  const [gap, setGap] = useState(16);
  const [radius, setRadius] = useState(18);
  const [bg, setBg] = useState("#ffffff");
  const [caption, setCaption] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  const ratio = RATIOS.find((r) => r.id === ratioId) ?? RATIOS[0];

  // ----- Foto's inladen -----
  const addFiles = useCallback((files: FileList | File[] | null | undefined) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    for (const file of arr) {
      const url = URL.createObjectURL(file);
      const el = new Image();
      el.onload = () => setFotos((cur) => [...cur, { id: idRef.current++, url, el }]);
      el.onerror = () => URL.revokeObjectURL(url);
      el.src = url;
    }
  }, []);

  // Plakken van een foto
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const imgs = Array.from(e.clipboardData?.items ?? []).filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile()).filter(Boolean) as File[];
      if (imgs.length) addFiles(imgs);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  useEffect(() => () => { fotos.forEach((f) => URL.revokeObjectURL(f.url)); }, [fotos]);

  function removeFoto(id: number) {
    setFotos((cur) => cur.filter((f) => f.id !== id));
  }
  function clearAll() {
    setFotos([]);
  }

  // ----- Collage tekenen -----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = ratio.w, H = ratio.h;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const capH = caption.trim() ? Math.round(H * 0.09) : 0;
    const pad = gap;
    const innerW = W - 2 * pad;
    const innerH = H - 2 * pad - capH;

    layout.cells.forEach((cell, i) => {
      const cx = pad + cell.x * innerW + gap / 2;
      const cy = pad + cell.y * innerH + gap / 2;
      const cw = cell.w * innerW - gap;
      const ch = cell.h * innerH - gap;
      if (cw <= 0 || ch <= 0) return;

      ctx.save();
      roundRectPath(ctx, cx, cy, cw, ch, radius);
      ctx.clip();

      const foto = fotos.length ? fotos[i % fotos.length] : null;
      if (foto && foto.el.naturalWidth) {
        const iw = foto.el.naturalWidth, ih = foto.el.naturalHeight;
        const scale = Math.max(cw / iw, ch / ih);
        const dw = iw * scale, dh = ih * scale;
        ctx.drawImage(foto.el, cx + (cw - dw) / 2, cy + (ch - dh) / 2, dw, dh);
      } else {
        // Lege plek
        ctx.fillStyle = "rgba(128,128,128,0.25)";
        ctx.fillRect(cx, cy, cw, ch);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `${Math.round(Math.min(cw, ch) * 0.3)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("＋", cx + cw / 2, cy + ch / 2);
      }
      ctx.restore();
    });

    // Bijschrift
    if (capH) {
      const dark = ["#ffffff", "#f7d6e0", "#ffd76e", "#a0e9ff"].includes(bg);
      ctx.fillStyle = dark ? "#222" : "#fff";
      ctx.font = `600 ${Math.round(capH * 0.42)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(caption.trim(), W / 2, H - capH / 2 - pad / 2);
    }
  }, [fotos, layout, ratio, gap, radius, bg, caption]);

  useEffect(() => { draw(); }, [draw]);

  // ----- Downloaden / delen -----
  function maakEnDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      blobRef.current = blob;
      const file = new File([blob], "collage.png", { type: "image/png" });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
      setResultUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
    }, "image/png");
  }

  async function shareResult() {
    const blob = blobRef.current;
    if (!blob) return;
    try { await navigator.share({ files: [new File([blob], "collage.png", { type: blob.type })], title: "Mijn collage" }); } catch { /* afgebroken */ }
  }
  async function copyResult() {
    const blob = blobRef.current;
    if (!blob) return;
    try { await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); setShareMsg("Gekopieerd! 📋"); } catch { setShareMsg("Kopiëren lukte niet — gebruik Download."); }
    setTimeout(() => setShareMsg(null), 2500);
  }

  const previewAspect = `${ratio.w} / ${ratio.h}`;

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">🖼️ Foto-collage</h1>
          <span className="w-12" />
        </div>

        {/* Upload-zone / foto's */}
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${dragOver ? "border-pink-500 bg-pink-500/10" : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500"}`}
        >
          <span className="text-3xl">📷</span>
          <p className="font-semibold">Kies of sleep je foto&apos;s</p>
          <p className="text-xs text-zinc-400">Meerdere tegelijk mag · of plak met ⌘V</p>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <span className="mt-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2 text-sm font-semibold">📂 Kies foto&apos;s</span>
        </label>

        {/* Gekozen foto's */}
        {fotos.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            {fotos.map((f) => (
              <div key={f.id} className="relative shrink-0">
                <img src={f.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <button onClick={() => removeFoto(f.id)} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold shadow">×</button>
              </div>
            ))}
            <button onClick={clearAll} className="ml-1 shrink-0 rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">Wis alles</button>
          </div>
        )}

        {/* Voorbeeld */}
        <div className="mt-4 flex justify-center">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl" style={{ aspectRatio: previewAspect }}>
            <canvas ref={canvasRef} className="h-full w-full object-contain" />
          </div>
        </div>

        {/* Indelingen */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-zinc-300">Indeling</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {LAYOUTS.map((l) => (
              <button key={l.id} onClick={() => setLayoutId(l.id)} className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center transition-all ${layoutId === l.id ? "border-pink-500 ring-2 ring-pink-500/40" : "border-zinc-800 hover:border-zinc-600"}`}>
                <span className="text-lg">{l.emoji}</span>
                <span className="text-[10px] text-zinc-300">{l.naam}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formaat */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-zinc-300">Formaat</p>
          <div className="flex flex-wrap gap-2">
            {RATIOS.map((r) => (
              <button key={r.id} onClick={() => setRatioId(r.id)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${ratioId === r.id ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{r.naam}</button>
            ))}
          </div>
        </div>

        {/* Kleur */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-zinc-300">Achtergrondkleur</p>
          <div className="flex flex-wrap items-center gap-2">
            {BG_KLEUREN.map((c) => (
              <button key={c} onClick={() => setBg(c)} className={`h-8 w-8 rounded-full border-2 transition-transform active:scale-90 ${bg === c ? "border-pink-500 ring-2 ring-pink-500/40" : "border-zinc-700"}`} style={{ background: c }} />
            ))}
            <label className="ml-1 flex items-center gap-2 text-xs text-zinc-400">
              Eigen
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-8 w-10 cursor-pointer rounded bg-transparent" />
            </label>
          </div>
        </div>

        {/* Schuifjes + bijschrift */}
        <div className="mt-4 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:grid-cols-2 sm:p-4">
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="w-20">Tussenruimte</span>
            <input type="range" min={0} max={60} value={gap} onChange={(e) => setGap(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-pink-500" />
          </label>
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <span className="w-20">Ronde hoeken</span>
            <input type="range" min={0} max={80} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-pink-500" />
          </label>
          <label className="flex items-center gap-3 text-sm text-zinc-300 sm:col-span-2">
            <span className="w-20">Bijschrift</span>
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optioneel tekstje onderaan…" className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-pink-500" />
          </label>
        </div>

        {/* Maak-knop */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={maakEnDownload} disabled={fotos.length === 0} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-semibold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-40">🖼️ Maak collage</button>
          {fotos.length === 0 && <span className="text-sm text-zinc-500">Voeg eerst foto&apos;s toe.</span>}
        </div>

        {/* Resultaat */}
        {resultUrl && (
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-300">🎉 Je collage is klaar!</p>
            <img src={resultUrl} alt="Collage" className="mx-auto max-h-96 rounded-xl" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={resultUrl} download="collage.png" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download</a>
              {canShare && <button onClick={shareResult} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">📤 Exporteren / delen</button>}
              <button onClick={copyResult} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 transition-colors hover:bg-zinc-800">📋 Kopiëren</button>
              {shareMsg && <span className="text-sm text-zinc-400">{shareMsg}</span>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
