"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, FILTERS } from "./filters";
import { drawScene, drawSlitScan, makeSeeds, pickMimeType, type Seed } from "./render";
import { AccessoryArt, HudLayer, OverlayLayers } from "./effects";
import { GameOverlay } from "./games";
import { FaceAccessories, useFaceLandmarker } from "./face";

export default function FilterPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const seedsRef = useRef<Seed[]>(makeSeeds(40));

  const filterRef = useRef(FILTERS[0]);
  const zoomRef = useRef(1);
  const mirrorRef = useRef(true);

  const [filterId, setFilterId] = useState(FILTERS[0].id);
  const [zoom, setZoom] = useState(1);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [zoek, setZoek] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("webm");

  const { landmarker, status: faceStatus } = useFaceLandmarker();
  const f = FILTERS.find((x) => x.id === filterId) ?? FILTERS[0];
  const seeds = seedsRef.current;
  const mirror = facing === "user";

  useEffect(() => { filterRef.current = f; }, [f]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { mirrorRef.current = mirror; }, [mirror]);

  // ----- Camera starten (verandert mee met voor/achter-camera) -----
  useEffect(() => {
    let stopped = false;
    async function init() {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setError(null);
      } catch {
        setError("Geen toegang tot de camera. Sta camera/microfoon toe in je browser en herlaad de pagina.");
      }
    }
    init();
    return () => { stopped = true; };
  }, [facing]);

  // Camera netjes stoppen bij verlaten pagina
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // ----- Opnemen (canvas bakt het filter in de video) -----
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef(0);
  const slitStartRef = useRef(0);
  const recordingRef = useRef(false);
  const resultBlobRef = useRef<Blob | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const isScan = f.special === "scan";
  // fx-filters (echte VHS enz.) worden live óók op het canvas gerenderd,
  // zodat wat je ziet exact is wat je opneemt. Het canvas tekent dan de hele
  // scène, dus de losse DOM-lagen slaan we over (anders dubbel).
  const canvasFull = !!f.fx;
  const showCanvas = isScan || canvasFull;

  // Tap het canvas maar ÉÉN keer af (Safari laat dat niet vaker toe) en hergebruik
  function getCanvasStream(canvas: HTMLCanvasElement, mic: MediaStream) {
    let cs = canvasStreamRef.current;
    if (!cs) { cs = canvas.captureStream(30); canvasStreamRef.current = cs; }
    cs.getAudioTracks().forEach((t) => cs!.removeTrack(t));
    mic.getAudioTracks().forEach((t) => cs!.addTrack(t));
    return cs;
  }

  // Eén teken-lus: actief bij de scanner (live slit-scan) of tijdens opnemen
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const fcur = filterRef.current;
      const scanner = fcur.special === "scan";
      const fx = !!fcur.fx;
      const live = scanner || fx;
      if (video && canvas && video.videoWidth && (live || recordingRef.current)) {
        // Live (niet-opnemend) canvas-formaat kiezen: scanner op volle res,
        // fx wat kleiner voor soepele per-pixel-verwerking.
        if (live && !recordingRef.current) {
          const targetH = scanner ? video.videoHeight : Math.min(360, video.videoHeight);
          const cw = Math.round((video.videoWidth * targetH) / video.videoHeight);
          if (canvas.width !== cw || canvas.height !== targetH) {
            canvas.width = cw;
            canvas.height = targetH;
            slitStartRef.current = performance.now();
            recStartRef.current = performance.now();
          }
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (scanner) {
            drawSlitScan(ctx, video, (performance.now() - slitStartRef.current) / 1000, canvas.width, canvas.height, mirrorRef.current);
          } else {
            drawScene(ctx, video, fcur, zoomRef.current, (performance.now() - recStartRef.current) / 1000, canvas.width, canvas.height, seedsRef.current, mirrorRef.current);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Slit-scan opnieuw starten als je de scanner kiest
  useEffect(() => {
    if (f.special === "scan" && canvasRef.current && videoRef.current?.videoWidth) {
      const c = canvasRef.current;
      c.width = videoRef.current.videoWidth;
      c.height = videoRef.current.videoHeight;
      c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      slitStartRef.current = performance.now();
    }
  }, [filterId, f.special]);

  function startRecording() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!canvas || !video || !stream || !video.videoWidth) return;

    if (f.special !== "scan") {
      const scale = Math.min(1, 540 / video.videoHeight);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      recStartRef.current = performance.now();
    }
    recordingRef.current = true;

    const { mime, ext } = pickMimeType();
    const canvasStream = getCanvasStream(canvas, stream);

    const recorder = new MediaRecorder(canvasStream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
      resultBlobRef.current = blob;
      const file = new File([blob], `videobest.${ext}`, { type: blob.type });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
      setResultUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
      setResultExt(ext);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recordingRef.current = false;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function deleteResult() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultBlobRef.current = null;
    setResultUrl(null);
  }

  async function shareResult() {
    const blob = resultBlobRef.current;
    if (!blob) return;
    const file = new File([blob], `videobest.${resultExt}`, { type: blob.type });
    try { await navigator.share({ files: [file], title: "Mijn VideoBest-video" }); } catch { /* afgebroken */ }
  }

  async function copyResult() {
    const blob = resultBlobRef.current;
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setShareMsg("Gekopieerd! 📋");
    } catch {
      setShareMsg("Kopiëren lukte niet — gebruik Download.");
    }
    setTimeout(() => setShareMsg(null), 2500);
  }

  const zichtbareFilters = FILTERS.filter((x) =>
    zoek.trim() ? x.naam.toLowerCase().includes(zoek.toLowerCase()) : x.cat === cat
  );
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const fixedProps = f.props?.filter((p) => !p.anchor) ?? [];
  const anchoredProps = f.props?.filter((p) => p.anchor) ?? [];
  const isGame = f.special && f.special !== "scan";

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        {/* Kop */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">🎨 Filterstudio</h1>
          <span className="w-12" />
        </div>

        {/* Camerabeeld */}
        <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl sm:rounded-3xl" style={{ containerType: "size" }}>
          {/* Spiegel + zoom op een wrapper, zodat de video-animatie (glitch/wiebel) eroverheen kan */}
          <div className="absolute inset-0 overflow-hidden" style={{ transform: `scaleX(${mirror ? -1 : 1}) scale(${zoom})` }}>
            <video
              ref={videoRef}
              muted
              playsInline
              className={`h-full w-full object-cover ${f.vid ?? ""}`}
              style={{ filter: f.css || "none" }}
            />
          </div>

          {/* Opname-canvas — zichtbaar bij de scanner (slit-scan) en bij fx-filters (VHS) */}
          <canvas ref={canvasRef} className={showCanvas ? "absolute inset-0 h-full w-full object-cover" : "hidden"} />

          {/* Gekleurde laag (bij fx zit dit al in het canvas) */}
          {f.overlay && !canvasFull && <OverlayLayers overlay={f.overlay} />}

          {/* Camera-schermpje (REC, timecode, dradenkruis…) */}
          {f.hud && !canvasFull && <HudLayer hud={f.hud} />}

          {/* Deeltjes */}
          {f.particles && !canvasFull &&
            Array.from({ length: f.particles.count }).map((_, i) => {
              const s = seeds[i % seeds.length];
              const dur = Math.max(1, 1 / Math.abs(f.particles!.speed));
              return (
                <span
                  key={i}
                  className="pointer-events-none absolute top-0 select-none"
                  style={{
                    left: `${s.x * 100}%`,
                    fontSize: `${f.particles!.size * 100}cqh`,
                    opacity: s.alpha,
                    mixBlendMode: (f.particles!.blend ?? "normal") as React.CSSProperties["mixBlendMode"],
                    animation: `${f.particles!.speed >= 0 ? "vb-fall" : "vb-rise"} ${dur}s linear ${(-s.phase * dur).toFixed(2)}s infinite`,
                    willChange: "transform",
                  }}
                >
                  {f.particles!.emoji}
                </span>
              );
            })}

          {/* Vaste stickers */}
          {!canvasFull && fixedProps.map((pr, i) => (
            <span
              key={i}
              className="pointer-events-none absolute select-none"
              style={{ left: `${pr.x * 100}%`, top: `${pr.y * 100}%`, fontSize: `${pr.size * 100}cqh`, lineHeight: 1, transform: `translate(-50%,-50%) rotate(${pr.rot ?? 0}deg)` }}
            >
              {pr.emoji}
            </span>
          ))}

          {/* Gezicht-volgende accessoires */}
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

          {/* Spel */}
          {isGame && <GameOverlay game={f.special!} />}

          {/* Opname-indicator */}
          {recording && (
            <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-sm backdrop-blur">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />{mmss}
            </div>
          )}

          {/* Filternaam */}
          {!isGame && <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur sm:text-sm">{f.emoji} {f.naam}</div>}

          {/* Camerafout */}
          {error && <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-zinc-300"><p>📷 {error}</p></div>}
        </div>

        {/* Bedieningsbalk */}
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:flex-row sm:items-center sm:p-4">
          <label className="flex flex-1 items-center gap-3 text-sm text-zinc-300">
            🔍
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-pink-500" />
            <span className="w-10 text-right tabular-nums text-zinc-400">{zoom.toFixed(1)}×</span>
          </label>
          <div className="flex items-center gap-2">
            <button onClick={() => setFacing((p) => (p === "user" ? "environment" : "user"))} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl transition-transform active:scale-90" title="Wissel camera">🔄</button>
            {recording ? (
              <button onClick={stopRecording} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-3 font-semibold transition-transform active:scale-95 sm:flex-none">⏹ Stop</button>
            ) : (
              <button onClick={startRecording} disabled={!!error} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-semibold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-40 sm:flex-none">⏺ Neem op</button>
            )}
          </div>
        </div>

        {/* Resultaat */}
        {resultUrl && (
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-300">🎉 Je opname is klaar!</p>
            <video src={resultUrl} controls playsInline className="w-full rounded-xl" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={resultUrl} download={`videobest.${resultExt}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download</a>
              {canShare && <button onClick={shareResult} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">📤 Exporteren / delen</button>}
              <button onClick={copyResult} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 transition-colors hover:bg-zinc-800">📋 Kopiëren</button>
              <button onClick={deleteResult} className="inline-flex items-center gap-2 rounded-full border border-red-500/50 px-5 py-2.5 font-semibold text-red-300 transition-colors hover:bg-red-500/15">🗑 Verwijder</button>
              {shareMsg && <span className="text-sm text-zinc-400">{shareMsg}</span>}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Tip: via &ldquo;Exporteren / delen&rdquo; → Foto&apos;s, Google Drive, AirDrop of Mail.</p>
          </div>
        )}

        {/* Filterbalk */}
        <div className="mt-5">
          <input type="text" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="🔍 Zoek een filter…" className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-pink-500" />

          {!zoek.trim() && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((c) => (
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
          <p className="mt-3 text-center text-xs text-zinc-600">{FILTERS.length} filters · {CATEGORIES.length} categorieën ✨</p>
        </div>
      </div>
    </main>
  );
}
