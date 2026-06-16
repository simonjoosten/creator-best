"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { pickMimeType } from "../filter/render";
import { isPromptOk } from "../lib/safe";

const STIJLEN = [
  { naam: "Verras me", extra: "" },
  { naam: "Fotorealistisch", extra: ", photorealistic, cinematic" },
  { naam: "Cartoon", extra: ", cartoon style, vibrant" },
  { naam: "Anime", extra: ", anime style" },
  { naam: "3D", extra: ", 3d render, pixar style" },
  { naam: "Sprookje", extra: ", fairytale, magical, dreamy" },
];

export default function AiVideoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prompt, setPrompt] = useState("");
  const [stijl, setStijl] = useState(STIJLEN[0]);
  const [scenes, setScenes] = useState(3);
  const [status, setStatus] = useState<"idle" | "bezig" | "klaar" | "fout">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("webm");
  const blobRef = useRef<Blob | null>(null);

  async function maak() {
    const tekst = prompt.trim();
    if (!tekst) return;
    if (!isPromptOk(tekst)) { setStatus("fout"); setStatusMsg("Dat kan ik niet maken. 😊 Probeer iets anders."); return; }
    setVideoUrl(null);
    setStatus("bezig");

    // 1) Plaatjes maken (klein = snel, geen time-out)
    const bitmaps: ImageBitmap[] = [];
    for (let i = 0; i < scenes; i++) {
      setStatusMsg(`Scène ${i + 1}/${scenes} tekenen… (kan ~15 sec per scène duren)`);
      const seed = Math.floor(Math.random() * 1_000_000);
      const url = `/api/genimg?prompt=${encodeURIComponent(tekst + stijl.extra + ", cinematic")}&w=640&h=384&seed=${seed}`;
      try {
        // Ruim de tijd geven (ComfyUI kan even bezig zijn), maar netjes afhandelen
        const r = await fetch(url, { signal: AbortSignal.timeout(180000) });
        if (!r.ok) throw new Error("gen");
        const blob = await r.blob();
        if (!blob.type.startsWith("image")) throw new Error("geen plaatje");
        bitmaps.push(await createImageBitmap(blob));
      } catch {
        bitmaps.forEach((b) => b.close?.());
        setStatus("fout");
        setStatusMsg("Het maken van een plaatje lukte niet. Staat ComfyUI aan? Probeer het zo nog eens, of kies minder scènes.");
        return;
      }
    }

    // 2) Video maken van de plaatjes (met beweging + overgangen)
    setStatusMsg("Filmpje in elkaar zetten…");
    try {
      await maakVideo(bitmaps);
      setStatus("klaar");
      setStatusMsg("");
    } catch {
      setStatus("fout");
      setStatusMsg("Het filmpje maken lukte niet in deze browser. Probeer Chrome.");
    } finally {
      bitmaps.forEach((b) => b.close?.());
    }
  }

  function maakVideo(bitmaps: ImageBitmap[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) return reject();
      const W = 1024, H = 576;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject();

      const secPer = 3.2, fade = 0.7;
      const total = bitmaps.length * secPer;

      const drawCover = (bm: ImageBitmap, zoom: number, alpha: number) => {
        const scale = Math.max(W / bm.width, H / bm.height) * zoom;
        const dw = bm.width * scale, dh = bm.height * scale;
        ctx.globalAlpha = alpha;
        ctx.drawImage(bm, (W - dw) / 2, (H - dh) / 2, dw, dh);
        ctx.globalAlpha = 1;
      };

      let recorder: MediaRecorder;
      let stream: MediaStream;
      let ext = "webm";
      try {
        const picked = pickMimeType();
        ext = picked.ext;
        stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, picked.mime ? { mimeType: picked.mime } : undefined);
      } catch {
        return reject(new Error("opname niet ondersteund"));
      }
      const parts: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) parts.push(e.data); };
      recorder.onstop = () => {
        try {
          const blob = new Blob(parts, { type: recorder.mimeType || "video/webm" });
          blobRef.current = blob;
          setVideoUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
          setResultExt(ext);
          resolve();
        } catch { reject(new Error("opslaan mislukt")); }
      };

      const start = performance.now();
      let raf = 0;
      const loop = () => {
        try {
          const t = (performance.now() - start) / 1000;
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, W, H);
          const idx = Math.min(bitmaps.length - 1, Math.floor(t / secPer));
          const localT = t - idx * secPer;
          const zoom = 1.04 + (localT / secPer) * 0.12;
          drawCover(bitmaps[idx], zoom, 1);
          if (localT > secPer - fade && idx < bitmaps.length - 1) {
            drawCover(bitmaps[idx + 1], 1.04, (localT - (secPer - fade)) / fade);
          }
          if (t < total) raf = requestAnimationFrame(loop);
        } catch {
          cancelAnimationFrame(raf);
        }
      };
      try { recorder.start(); } catch { return reject(new Error("opname start mislukt")); }
      loop();
      setTimeout(() => {
        cancelAnimationFrame(raf);
        try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* al gestopt */ }
      }, total * 1000 + 200);
    });
  }

  async function download() {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl; a.download = `ai-video.${resultExt}`; a.click();
  }
  async function bewaar() {
    const blob = blobRef.current;
    if (!blob) return;
    try {
      const file = new File([blob], `ai-video.${resultExt}`, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Mijn AI-video" });
      else if (videoUrl) window.open(videoUrl, "_blank");
    } catch { /* afgebroken */ }
  }
  function verwijder() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    blobRef.current = null;
    setVideoUrl(null);
    setStatus("idle");
  }

  const bezig = status === "bezig";

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">🎥 AI video maken</h1>
          <span className="w-12" />
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
          <label className="mb-2 block text-sm font-semibold text-zinc-300">Wat moet er in je filmpje?</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Bijv. een ruimteschip dat langs planeten vliegt" className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-pink-500" />

          <p className="mb-2 mt-4 text-sm font-semibold text-zinc-300">Stijl</p>
          <div className="flex flex-wrap gap-2">
            {STIJLEN.map((s) => <button key={s.naam} onClick={() => setStijl(s)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${stijl.naam === s.naam ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{s.naam}</button>)}
          </div>

          <p className="mb-2 mt-4 text-sm font-semibold text-zinc-300">Aantal scènes (langer filmpje = meer wachten)</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setScenes(n)} className={`h-10 w-10 rounded-full text-sm font-bold transition-colors ${scenes === n ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{n}</button>)}
          </div>

          <button onClick={maak} disabled={bezig} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-lg font-bold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-50">
            {bezig ? "⏳ Bezig…" : "🎥 Maak mijn filmpje"}
          </button>
          {statusMsg && <p className={`mt-3 text-sm ${status === "fout" ? "text-red-400" : "text-zinc-400"}`}>{bezig && "⏳ "}{statusMsg}</p>}
          {bezig && <p className="mt-1 text-xs text-zinc-500">Elke scène is een AI-plaatje — even geduld als de AI druk is, hij blijft doorproberen.</p>}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {videoUrl && status === "klaar" && (
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-300">🎉 Je AI-filmpje is klaar!</p>
            <video src={videoUrl} controls playsInline loop className="w-full rounded-xl" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={bewaar} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">📥 Bewaar in Foto&apos;s</button>
              <button onClick={download} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download</button>
              <button onClick={verwijder} className="inline-flex items-center gap-2 rounded-full border border-red-500/50 px-5 py-2.5 font-semibold text-red-300 transition-colors hover:bg-red-500/15">🗑 Verwijder</button>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-zinc-600">De AI maakt plaatjes van je idee; ik zet ze in een vloeiend filmpje met beweging ✨</p>
      </div>
    </main>
  );
}
