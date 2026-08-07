"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, FILTERS } from "../filter/filters";
import { drawScene, makeSeeds, type Seed } from "../filter/render";
import { AccessoryArt, HudLayer, OverlayLayers } from "../filter/effects";
import { FaceAccessories, useFaceLandmarker } from "../filter/face";

// Voor foto's gebruiken we alle filters behalve de spellen
const FOTO_CATS = CATEGORIES.filter((c) => c !== "Spel");
const FOTO_FILTERS = FILTERS.filter((f) => !f.special);

export default function FotoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const seedsRef = useRef<Seed[]>(makeSeeds(40));

  const zoomRef = useRef(1);
  const mirrorRef = useRef(true);
  const filterRef = useRef(FOTO_FILTERS[0]);

  const [filterId, setFilterId] = useState(FOTO_FILTERS[0].id);
  const [zoom, setZoom] = useState(1);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cat, setCat] = useState(FOTO_CATS[0]);
  const [zoek, setZoek] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const photoBlobRef = useRef<Blob | null>(null);

  const { landmarker, status: faceStatus } = useFaceLandmarker();
  const f = FOTO_FILTERS.find((x) => x.id === filterId) ?? FOTO_FILTERS[0];
  const seeds = seedsRef.current;
  const mirror = facing === "user";

  useEffect(() => { filterRef.current = f; }, [f]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { mirrorRef.current = mirror; }, [mirror]);

  useEffect(() => {
    let stopped = false;
    async function init() {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setError(null);
      } catch {
        setError("Geen toegang tot de camera. Sta camera toe in je browser en herlaad de pagina.");
      }
    }
    init();
    return () => { stopped = true; };
  }, [facing]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  function takePhoto() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) drawScene(ctx, video, filterRef.current, zoomRef.current, performance.now() / 1000, canvas.width, canvas.height, seedsRef.current, mirrorRef.current);
    canvas.toBlob((blob) => {
      if (!blob) return;
      photoBlobRef.current = blob;
      const file = new File([blob], "videobest-foto.png", { type: "image/png" });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
      setPhotoUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
    }, "image/png");
  }

  async function sharePhoto() {
    const blob = photoBlobRef.current;
    if (!blob) return;
    try { await navigator.share({ files: [new File([blob], "videobest-foto.png", { type: blob.type })], title: "Mijn VideoBest-foto" }); } catch { /* afgebroken */ }
  }
  async function copyPhoto() {
    const blob = photoBlobRef.current;
    if (!blob) return;
    try { await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); setShareMsg("Gekopieerd! 📋"); } catch { setShareMsg("Kopiëren lukte niet — gebruik Download."); }
    setTimeout(() => setShareMsg(null), 2500);
  }
  function deletePhoto() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoBlobRef.current = null;
    setPhotoUrl(null);
  }

  const zichtbareFilters = FOTO_FILTERS.filter((x) => (zoek.trim() ? x.naam.toLowerCase().includes(zoek.toLowerCase()) : x.cat === cat));
  const fixedProps = f.props?.filter((p) => !p.anchor) ?? [];
  const anchoredProps = f.props?.filter((p) => p.anchor) ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">📸 Fotostudio</h1>
          <span className="w-12" />
        </div>

        {/* Camerabeeld */}
        <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl sm:rounded-3xl" style={{ containerType: "size" }}>
          <div className="absolute inset-0 overflow-hidden" style={{ transform: `scaleX(${mirror ? -1 : 1}) scale(${zoom})` }}>
            <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${f.vid ?? ""}`} style={{ filter: f.css || "none" }} />
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {f.overlay && <OverlayLayers overlay={f.overlay} />}

          {f.hud && <HudLayer hud={f.hud} />}

          {f.particles &&
            Array.from({ length: f.particles.count }).map((_, i) => {
              const s = seeds[i % seeds.length];
              const dur = Math.max(1, 1 / Math.abs(f.particles!.speed));
              return (
                <span key={i} className="pointer-events-none absolute top-0 select-none" style={{ left: `${s.x * 100}%`, fontSize: `${f.particles!.size * 100}cqh`, opacity: s.alpha, mixBlendMode: (f.particles!.blend ?? "normal") as React.CSSProperties["mixBlendMode"], animation: `${f.particles!.speed >= 0 ? "vb-fall" : "vb-rise"} ${dur}s linear ${(-s.phase * dur).toFixed(2)}s infinite`, willChange: "transform" }}>
                  {f.particles!.emoji}
                </span>
              );
            })}

          {fixedProps.map((pr, i) => (
            <span key={i} className="pointer-events-none absolute select-none" style={{ left: `${pr.x * 100}%`, top: `${pr.y * 100}%`, fontSize: `${pr.size * 100}cqh`, lineHeight: 1, transform: `translate(-50%,-50%) rotate(${pr.rot ?? 0}deg)` }}>{pr.emoji}</span>
          ))}

          {anchoredProps.length > 0 && faceStatus === "ready" && landmarker && (
            <FaceAccessories videoRef={videoRef} landmarker={landmarker} props={anchoredProps} zoomRef={zoomRef} mirrorRef={mirrorRef} />
          )}
          {anchoredProps.length > 0 && faceStatus === "error" &&
            anchoredProps.map((pr, i) => (
              <span key={i} className="pointer-events-none absolute select-none" style={{ left: `${pr.x * 100}%`, top: `${pr.y * 100}%`, width: `${Math.min(pr.size, 1) * 26}cqh`, transform: "translate(-50%,-50%)" }}>
                {pr.art ? <AccessoryArt name={pr.art} /> : <span style={{ fontSize: `${Math.min(pr.size, 1) * 22}cqh` }}>{pr.emoji}</span>}
              </span>
            ))}
          {anchoredProps.length > 0 && faceStatus === "loading" && (
            <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur">🙂 gezicht laden…</div>
          )}

          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur sm:text-sm">{f.emoji} {f.naam}</div>
          {error && <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-zinc-300"><p>📷 {error}</p></div>}
        </div>

        {/* Bediening */}
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:flex-row sm:items-center sm:p-4">
          <label className="flex flex-1 items-center gap-3 text-sm text-zinc-300">
            🔍
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-pink-500" />
            <span className="w-10 text-right tabular-nums text-zinc-400">{zoom.toFixed(1)}×</span>
          </label>
          <div className="flex items-center gap-2">
            <button onClick={() => setFacing((p) => (p === "user" ? "environment" : "user"))} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl transition-transform active:scale-90" title="Wissel camera">🔄</button>
            <button onClick={takePhoto} disabled={!!error} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-lg font-semibold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-40 sm:flex-none">📸 Maak foto</button>
          </div>
        </div>

        {/* Resultaat */}
        {photoUrl && (
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-300">📸 Je foto is klaar!</p>
            <img src={photoUrl} alt="Jouw foto" className="w-full rounded-xl" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={photoUrl} download="videobest-foto.png" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download</a>
              {canShare && <button onClick={sharePhoto} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">📤 Exporteren / delen</button>}
              <button onClick={copyPhoto} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 transition-colors hover:bg-zinc-800">📋 Kopiëren</button>
              <button onClick={deletePhoto} className="inline-flex items-center gap-2 rounded-full border border-red-500/50 px-5 py-2.5 font-semibold text-red-300 transition-colors hover:bg-red-500/15">🗑 Verwijder</button>
              {shareMsg && <span className="text-sm text-zinc-400">{shareMsg}</span>}
            </div>
          </div>
        )}

        {/* Filterbalk */}
        <div className="mt-5">
          <input type="text" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="🔍 Zoek een filter…" className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-pink-500" />
          {!zoek.trim() && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {FOTO_CATS.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${cat === c ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{c}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {zichtbareFilters.map((x) => (
              <button key={x.id} onClick={() => setFilterId(x.id)} className={`flex flex-col items-center gap-1 overflow-hidden rounded-xl border p-1.5 text-center transition-all ${filterId === x.id ? "border-pink-500 ring-2 ring-pink-500/40" : "border-zinc-800 hover:border-zinc-600"}`}>
                <span className="flex aspect-square w-full items-center justify-center rounded-lg text-xl sm:text-2xl" style={{ background: x.swatch }}>{x.emoji}</span>
                <span className="line-clamp-1 w-full text-[10px] text-zinc-300 sm:text-xs">{x.naam}</span>
              </button>
            ))}
            {zichtbareFilters.length === 0 && <p className="col-span-full py-6 text-center text-sm text-zinc-500">Geen filter gevonden.</p>}
          </div>
          <p className="mt-3 text-center text-xs text-zinc-600">{FOTO_FILTERS.length} filters voor foto&apos;s ✨</p>
        </div>
      </div>
    </main>
  );
}
