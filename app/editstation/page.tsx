"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, FILTERS } from "../filter/filters";
import { applyColorFilter, drawOverlay, parseFilter, pickMimeType } from "../filter/render";
import { OverlayLayers } from "../filter/effects";

const EDIT_FILTERS = FILTERS.filter((f) => !f.special);
const EDIT_CATS = CATEGORIES.filter((c) => c !== "Spel");
const PANELS = ["🎨 Filters", "🌈 Kleur", "🔄 Vorm", "✂️ Knippen", "🅰️ Tekst", "🔊 Geluid"];

export default function EditStation() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioCtxRef = useRef<any>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [panel, setPanel] = useState(PANELS[0]);
  const [filterId, setFilterId] = useState("geen");
  const [cat, setCat] = useState(EDIT_CATS[0]);
  // Kleuraanpassingen
  const [br, setBr] = useState(1);
  const [co, setCo] = useState(1);
  const [sa, setSa] = useState(1);
  const [hu, setHu] = useState(0);
  const [bl, setBl] = useState(0);
  // Vorm
  const [rot, setRot] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  // Knippen + snelheid + geluid
  const [duur, setDuur] = useState(0);
  const [start, setStart] = useState(0);
  const [eind, setEind] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [vol, setVol] = useState(1);
  // Tekst
  const [tekstAan, setTekstAan] = useState(false);
  const [tekst, setTekst] = useState("Mijn titel");
  const [tGrootte, setTGrootte] = useState(0.08);
  const [tKleur, setTKleur] = useState("#ffffff");
  const [tX, setTX] = useState(0.5);
  const [tY, setTY] = useState(0.85);
  // Export
  const [dragOver, setDragOver] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("webm");

  const f = EDIT_FILTERS.find((x) => x.id === filterId) ?? EDIT_FILTERS[0];

  function loadFile(file: File | null | undefined) {
    if (!file) return;
    const ok = file.type.startsWith("video/") || /\.(mov|mp4|m4v|webm|avi|mkv)$/i.test(file.name);
    if (!ok) return;
    setResultUrl(null);
    setFileUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
  }
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const it = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("video/"));
      if (it) loadFile(it.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Snelheid/volume live + knippen-lus
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    v.volume = vol;
  }, [speed, vol, fileUrl]);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => { if (eind > 0 && v.currentTime >= eind) v.currentTime = start; };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [start, eind, fileUrl]);

  const css = [f.css, `brightness(${br})`, `contrast(${co})`, `saturate(${sa})`, `hue-rotate(${hu}deg)`, bl > 0 ? `blur(${bl}px)` : ""].filter(Boolean).join(" ");
  const transform = `rotate(${rot}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1}) scale(${zoom})`;

  function resetKleur() { setBr(1); setCo(1); setSa(1); setHu(0); setBl(0); }

  async function exporteer() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || exporting) return;
    setExporting(true); setResultUrl(null); setProgress(0);
    const scale = Math.min(1, 720 / video.videoHeight);
    const W = Math.round(video.videoWidth * scale), H = Math.round(video.videoHeight * scale);
    canvas.width = W; canvas.height = H;
    const ops = parseFilter(css);

    // Audio
    let audioTrack: MediaStreamTrack | null = null;
    try {
      if (!audioCtxRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ac = new AC();
        const src = ac.createMediaElementSource(video);
        const dest = ac.createMediaStreamDestination();
        const g = ac.createGain(); g.gain.value = 1;
        src.connect(g); g.connect(dest); g.connect(ac.destination);
        audioCtxRef.current = ac; audioDestRef.current = dest;
      }
      await audioCtxRef.current.resume();
      audioTrack = audioDestRef.current!.stream.getAudioTracks()[0] ?? null;
    } catch { audioTrack = null; }

    const { mime, ext } = pickMimeType();
    let cs = canvasStreamRef.current;
    if (!cs) { cs = canvas.captureStream(30); canvasStreamRef.current = cs; }
    cs.getAudioTracks().forEach((t) => cs!.removeTrack(t));
    if (audioTrack) cs.addTrack(audioTrack);

    const recorder = new MediaRecorder(cs, mime ? { mimeType: mime } : undefined);
    const parts: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) parts.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(parts, { type: mime || "video/webm" });
      blobRef.current = blob;
      setResultUrl(URL.createObjectURL(blob));
      setResultExt(ext); setExporting(false); setProgress(1);
    };

    const eindTijd = eind > 0 ? eind : video.duration;
    let raf = 0;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (ctx && video.videoWidth) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.scale((flipH ? -1 : 1) * zoom, (flipV ? -1 : 1) * zoom);
        const cover = (Math.max(W, H) / Math.min(video.videoWidth, video.videoHeight));
        const dw = video.videoWidth * cover, dh = video.videoHeight * cover;
        ctx.drawImage(video, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
        if (ops.length) { const img = ctx.getImageData(0, 0, W, H); applyColorFilter(img.data, ops); ctx.putImageData(img, 0, 0); }
        if (f.overlay) drawOverlay(ctx, f.overlay, W, H);
        if (tekstAan && tekst.trim()) {
          const fs = Math.round(tGrootte * H);
          ctx.font = `bold ${fs}px sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineWidth = Math.max(2, fs * 0.12); ctx.strokeStyle = "rgba(0,0,0,0.7)";
          ctx.strokeText(tekst, tX * W, tY * H); ctx.fillStyle = tKleur; ctx.fillText(tekst, tX * W, tY * H);
        }
      }
      if (video.duration) setProgress(Math.min(1, (video.currentTime - start) / Math.max(0.1, eindTijd - start)));
      raf = requestAnimationFrame(draw);
    };
    const stop = () => { cancelAnimationFrame(raf); try { if (recorder.state !== "inactive") recorder.stop(); } catch {} video.removeEventListener("ended", stop); video.removeEventListener("timeupdate", chk); };
    const chk = () => { if (video.currentTime >= eindTijd) stop(); };

    video.currentTime = start; video.playbackRate = speed; video.muted = false;
    recorder.start();
    try { await video.play(); } catch {}
    video.addEventListener("ended", stop);
    video.addEventListener("timeupdate", chk);
    draw();
  }

  async function bewaar() {
    const blob = blobRef.current;
    if (!blob) return;
    try {
      const file = new File([blob], `editstation.${resultExt}`, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Mijn video" });
      else if (resultUrl) window.open(resultUrl, "_blank");
    } catch {}
  }

  const Slider = ({ label, val, set, min, max, step, fmt }: { label: string; val: number; set: (n: number) => void; min: number; max: number; step: number; fmt?: (n: number) => string }) => (
    <label className="block">
      <span className="mb-1 flex justify-between text-sm text-zinc-300"><span>{label}</span><span className="text-zinc-500">{fmt ? fmt(val) : val}</span></span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-pink-500" />
    </label>
  );

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">🎬 Edit Station</h1>
          <span className="w-12" />
        </div>

        {/* Bestandskiezer (altijd aanwezig, wordt via de knoppen geopend) */}
        <input ref={fileRef} type="file" accept="video/*,video/quicktime,.mov,.mp4,.m4v,.webm" className="hidden" onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ""; }} />

        {!fileUrl ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]); }}
            className={`mt-4 flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-pink-500 bg-pink-500/10" : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500"}`}
          >
            <span className="text-5xl">🎬</span>
            <p className="text-lg font-semibold">Kies of sleep een video om te bewerken</p>
            <p className="text-sm text-zinc-400">Uit Foto&apos;s, Bestanden… of plak met ⌘V · 100+ tools</p>
            <span className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2.5 font-semibold">📂 Kies video</span>
          </div>
        ) : (
          <>
            {/* Voorbeeld */}
            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl sm:rounded-3xl" style={{ containerType: "size" }}>
              <video ref={videoRef} src={fileUrl} controls playsInline className="absolute inset-0 h-full w-full object-cover" style={{ filter: css, transform }} onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setDuur(d); setEind(d); }} />
              {f.overlay && <OverlayLayers overlay={f.overlay} />}
              {tekstAan && tekst.trim() && (
                <span className="pointer-events-none absolute select-none font-bold" style={{ left: `${tX * 100}%`, top: `${tY * 100}%`, fontSize: `${tGrootte * 100}cqh`, color: tKleur, transform: "translate(-50%,-50%)", textShadow: "0 2px 6px #000, 0 0 2px #000" }}>{tekst}</span>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Export */}
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
              <button onClick={exporteer} disabled={exporting} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-semibold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-50">{exporting ? "⏳ Exporteren…" : "✨ Exporteer video"}</button>
              <button onClick={() => fileRef.current?.click()} className="rounded-full border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 hover:bg-zinc-800">📂 Andere video</button>
              {exporting && <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
              {exporting && <p className="w-full text-xs text-zinc-500">De video speelt één keer af terwijl ik alles erin bak — even geduld tot het eind van je gekozen stuk.</p>}
            </div>

            {resultUrl && (
              <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
                <p className="mb-3 text-sm font-semibold text-zinc-300">🎉 Klaar!</p>
                <video src={resultUrl} controls playsInline className="w-full rounded-xl" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={bewaar} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold">📥 Bewaar/deel</button>
                  <a href={resultUrl} download={`editstation.${resultExt}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black">⬇ Download</a>
                </div>
              </div>
            )}

            {/* Gereedschap-panelen */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {PANELS.map((p) => <button key={p} onClick={() => setPanel(p)} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${panel === p ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{p}</button>)}
            </div>

            <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
              {panel === "🎨 Filters" && (
                <>
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {EDIT_CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${cat === c ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300"}`}>{c}</button>)}
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {EDIT_FILTERS.filter((x) => x.cat === cat).map((x) => (
                      <button key={x.id} onClick={() => setFilterId(x.id)} className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 ${filterId === x.id ? "border-pink-500 ring-2 ring-pink-500/40" : "border-zinc-800"}`}>
                        <span className="flex aspect-square w-full items-center justify-center rounded-lg text-xl" style={{ background: x.swatch }}>{x.emoji}</span>
                        <span className="line-clamp-1 text-[10px] text-zinc-300">{x.naam}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {panel === "🌈 Kleur" && (
                <div className="space-y-4">
                  <Slider label="Helderheid" val={br} set={setBr} min={0.3} max={2} step={0.05} />
                  <Slider label="Contrast" val={co} set={setCo} min={0.3} max={2.5} step={0.05} />
                  <Slider label="Verzadiging" val={sa} set={setSa} min={0} max={3} step={0.05} />
                  <Slider label="Kleurtint" val={hu} set={setHu} min={0} max={360} step={5} fmt={(n) => `${n}°`} />
                  <Slider label="Wazig" val={bl} set={setBl} min={0} max={8} step={0.5} fmt={(n) => `${n}px`} />
                  <button onClick={resetKleur} className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm hover:bg-zinc-800">↺ Reset kleur</button>
                </div>
              )}
              {panel === "🔄 Vorm" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setRot((r) => (r + 270) % 360)} className="rounded-full bg-zinc-800 px-4 py-2 hover:bg-zinc-700">↺ Draai links</button>
                    <button onClick={() => setRot((r) => (r + 90) % 360)} className="rounded-full bg-zinc-800 px-4 py-2 hover:bg-zinc-700">↻ Draai rechts</button>
                    <button onClick={() => setFlipH((v) => !v)} className={`rounded-full px-4 py-2 ${flipH ? "bg-pink-500" : "bg-zinc-800 hover:bg-zinc-700"}`}>⇄ Spiegel</button>
                    <button onClick={() => setFlipV((v) => !v)} className={`rounded-full px-4 py-2 ${flipV ? "bg-pink-500" : "bg-zinc-800 hover:bg-zinc-700"}`}>⇅ Omdraaien</button>
                  </div>
                  <Slider label="Inzoomen" val={zoom} set={setZoom} min={1} max={3} step={0.05} fmt={(n) => `${n.toFixed(1)}×`} />
                </div>
              )}
              {panel === "✂️ Knippen" && (
                <div className="space-y-4">
                  <Slider label="Begin" val={start} set={(n) => setStart(Math.min(n, eind - 0.2))} min={0} max={duur || 1} step={0.1} fmt={(n) => `${n.toFixed(1)}s`} />
                  <Slider label="Einde" val={eind} set={(n) => setEind(Math.max(n, start + 0.2))} min={0} max={duur || 1} step={0.1} fmt={(n) => `${n.toFixed(1)}s`} />
                  <Slider label="Snelheid" val={speed} set={setSpeed} min={0.25} max={2} step={0.05} fmt={(n) => `${n.toFixed(2)}×`} />
                  <p className="text-xs text-zinc-500">Gekozen stuk: {start.toFixed(1)}s – {eind.toFixed(1)}s</p>
                </div>
              )}
              {panel === "🅰️ Tekst" && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tekstAan} onChange={(e) => setTekstAan(e.target.checked)} /> Tekst tonen</label>
                  <input value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Typ je titel…" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white outline-none focus:border-pink-500" />
                  <div className="flex items-center gap-3"><span className="text-sm text-zinc-300">Kleur</span><input type="color" value={tKleur} onChange={(e) => setTKleur(e.target.value)} className="h-9 w-14 rounded" /></div>
                  <Slider label="Grootte" val={tGrootte} set={setTGrootte} min={0.03} max={0.2} step={0.01} fmt={(n) => `${Math.round(n * 100)}`} />
                  <Slider label="Links/rechts" val={tX} set={setTX} min={0} max={1} step={0.02} fmt={(n) => `${Math.round(n * 100)}%`} />
                  <Slider label="Hoog/laag" val={tY} set={setTY} min={0} max={1} step={0.02} fmt={(n) => `${Math.round(n * 100)}%`} />
                </div>
              )}
              {panel === "🔊 Geluid" && (
                <div className="space-y-4">
                  <Slider label="Volume" val={vol} set={setVol} min={0} max={1} step={0.05} fmt={(n) => `${Math.round(n * 100)}%`} />
                  <button onClick={() => setVol(0)} className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm hover:bg-zinc-800">🔇 Dempen</button>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-zinc-600">{EDIT_FILTERS.length} filters + kleur, vorm, knippen, snelheid, tekst & geluid = 100+ tools ✨</p>
          </>
        )}
      </div>
    </main>
  );
}
