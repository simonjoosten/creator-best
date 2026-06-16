"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, FILTERS } from "../filter/filters";
import { drawScene, makeSeeds, pickMimeType, type Seed } from "../filter/render";
import { OverlayLayers } from "../filter/effects";

// Voor bestaande video's: alle filters behalve spel/scan
const VID_CATS = CATEGORIES.filter((c) => c !== "Spel");
const VID_FILTERS = FILTERS.filter((f) => !f.special);

export default function VideoFilterPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seedsRef = useRef<Seed[]>(makeSeeds(40));
  const filterRef = useRef(VID_FILTERS[0]);

  // Web Audio (geluid meenemen in de render)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioCtxRef = useRef<any>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [filterId, setFilterId] = useState(VID_FILTERS[0].id);
  const [cat, setCat] = useState(VID_CATS[0]);
  const [zoek, setZoek] = useState("");
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("webm");
  const [canShare, setCanShare] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const f = VID_FILTERS.find((x) => x.id === filterId) ?? VID_FILTERS[0];
  const seeds = seedsRef.current;
  useEffect(() => { filterRef.current = f; }, [f]);

  function loadFile(file: File | null | undefined) {
    if (!file) return;
    const ok = file.type.startsWith("video/") || /\.(mov|mp4|m4v|webm|avi|mkv)$/i.test(file.name);
    if (!ok) return;
    setResultUrl(null);
    setFileUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
  }

  // Plakken (copy-paste) van een video
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("video/"));
      if (item) loadFile(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  function getCanvasStream(canvas: HTMLCanvasElement, audioTrack: MediaStreamTrack | null) {
    let cs = canvasStreamRef.current;
    if (!cs) { cs = canvas.captureStream(30); canvasStreamRef.current = cs; }
    cs.getAudioTracks().forEach((t) => cs!.removeTrack(t));
    if (audioTrack) cs.addTrack(audioTrack);
    return cs;
  }

  async function render() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || rendering) return;

    setRendering(true);
    setResultUrl(null);
    setProgress(0);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Geluid via Web Audio (1 keer opzetten, daarna hergebruiken)
    let audioTrack: MediaStreamTrack | null = null;
    try {
      if (!audioCtxRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ac = new AC();
        const srcNode = ac.createMediaElementSource(video);
        const dest = ac.createMediaStreamDestination();
        srcNode.connect(dest);
        srcNode.connect(ac.destination);
        audioCtxRef.current = ac;
        audioDestRef.current = dest;
      }
      await audioCtxRef.current.resume();
      audioTrack = audioDestRef.current!.stream.getAudioTracks()[0] ?? null;
    } catch { audioTrack = null; }

    const { mime, ext } = pickMimeType();
    const stream = getCanvasStream(canvas, audioTrack);
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime || "video/webm" });
      blobRef.current = blob;
      const file = new File([blob], `videobest.${ext}`, { type: blob.type });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
      setResultUrl(URL.createObjectURL(blob));
      setResultExt(ext);
      setRendering(false);
      setProgress(1);
    };

    let raf = 0;
    const start = performance.now();
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (ctx && video.videoWidth) drawScene(ctx, video, filterRef.current, 1, (performance.now() - start) / 1000, canvas.width, canvas.height, seedsRef.current, false);
      if (video.duration) setProgress(video.currentTime / video.duration);
      raf = requestAnimationFrame(draw);
    };

    const onEnded = () => {
      cancelAnimationFrame(raf);
      recorder.stop();
      video.removeEventListener("ended", onEnded);
    };

    video.currentTime = 0;
    video.muted = false;
    recorder.start();
    try { await video.play(); } catch { /* ignore */ }
    video.addEventListener("ended", onEnded);
    draw();
  }

  async function shareResult() {
    const blob = blobRef.current;
    if (!blob) return;
    try { await navigator.share({ files: [new File([blob], `videobest.${resultExt}`, { type: blob.type })], title: "Mijn VideoBest-video" }); } catch { /* afgebroken */ }
  }
  async function copyResult() {
    const blob = blobRef.current;
    if (!blob) return;
    try { await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); setShareMsg("Gekopieerd! 📋"); } catch { setShareMsg("Kopiëren lukte niet — gebruik Download."); }
    setTimeout(() => setShareMsg(null), 2500);
  }
  function deleteResult() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    blobRef.current = null;
    setResultUrl(null);
  }

  const zichtbareFilters = VID_FILTERS.filter((x) => (zoek.trim() ? x.naam.toLowerCase().includes(zoek.toLowerCase()) : x.cat === cat));
  const fixedProps = f.props?.filter((p) => !p.anchor) ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">🎞️ Filter op je video</h1>
          <span className="w-12" />
        </div>

        {!fileUrl ? (
          /* Upload-zone */
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]); }}
            className={`mt-4 flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-pink-500 bg-pink-500/10" : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500"}`}
          >
            <span className="text-5xl">🎞️</span>
            <p className="text-lg font-semibold">Kies of sleep een video</p>
            <p className="text-sm text-zinc-400">Uit Foto&apos;s, Bestanden, Drive… of plak met ⌘V</p>
            <input type="file" accept="video/*,video/quicktime,.mov,.mp4,.m4v,.webm,.avi" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
            <span className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2.5 font-semibold">📂 Kies video</span>
          </label>
        ) : (
          <>
            {/* Preview met filter */}
            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl sm:rounded-3xl" style={{ containerType: "size" }}>
              <video ref={videoRef} src={fileUrl} controls playsInline className={`absolute inset-0 h-full w-full object-contain ${f.vid ?? ""}`} style={{ filter: f.css || "none" }} />
              {f.overlay && <OverlayLayers overlay={f.overlay} />}
              {f.particles &&
                Array.from({ length: f.particles.count }).map((_, i) => {
                  const s = seeds[i % seeds.length];
                  const dur = Math.max(1, 1 / Math.abs(f.particles!.speed));
                  return <span key={i} className="pointer-events-none absolute top-0 select-none" style={{ left: `${s.x * 100}%`, fontSize: `${f.particles!.size * 100}cqh`, opacity: s.alpha, mixBlendMode: (f.particles!.blend ?? "normal") as React.CSSProperties["mixBlendMode"], animation: `${f.particles!.speed >= 0 ? "vb-fall" : "vb-rise"} ${dur}s linear ${(-s.phase * dur).toFixed(2)}s infinite` }}>{f.particles!.emoji}</span>;
                })}
              {fixedProps.map((pr, i) => (
                <span key={i} className="pointer-events-none absolute select-none" style={{ left: `${pr.x * 100}%`, top: `${pr.y * 100}%`, fontSize: `${pr.size * 100}cqh`, lineHeight: 1, transform: `translate(-50%,-50%) rotate(${pr.rot ?? 0}deg)` }}>{pr.emoji}</span>
              ))}
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur sm:text-sm">{f.emoji} {f.naam}</div>
            </div>

            {/* Render-knop */}
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
              <button onClick={render} disabled={rendering} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-semibold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-50">
                {rendering ? "⏳ Bezig…" : "✨ Render met filter"}
              </button>
              <label className="cursor-pointer rounded-full border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 hover:bg-zinc-800">
                📂 Andere video
                <input type="file" accept="video/*,video/quicktime,.mov,.mp4,.m4v,.webm,.avi" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
              </label>
              {rendering && (
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              )}
              {rendering && <p className="w-full text-xs text-zinc-500">De video speelt één keer af terwijl ik het filter erin bak — even geduld tot het einde.</p>}
            </div>

            {/* Resultaat */}
            {resultUrl && (
              <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
                <p className="mb-3 text-sm font-semibold text-zinc-300">🎉 Je video met filter is klaar!</p>
                <video src={resultUrl} controls playsInline className="w-full rounded-xl" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a href={resultUrl} download={`videobest.${resultExt}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download</a>
                  {canShare && <button onClick={shareResult} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">📤 Exporteren / delen</button>}
                  <button onClick={copyResult} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 transition-colors hover:bg-zinc-800">📋 Kopiëren</button>
                  <button onClick={deleteResult} className="inline-flex items-center gap-2 rounded-full border border-red-500/50 px-5 py-2.5 font-semibold text-red-300 transition-colors hover:bg-red-500/15">🗑 Verwijder</button>
                  {shareMsg && <span className="text-sm text-zinc-400">{shareMsg}</span>}
                </div>
              </div>
            )}

            {/* Filterbalk */}
            <div className="mt-5">
              <input type="text" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="🔍 Zoek een filter…" className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-pink-500" />
              {!zoek.trim() && (
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {VID_CATS.map((c) => (
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
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
