"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pickMimeType } from "../filter/render";

type Cue = { start: number; end: number; text: string };

// Talen om uit te kiezen (verbetert de herkenning)
const TALEN = [
  { naam: "Automatisch", code: null as string | null, vlag: "🌍" },
  { naam: "Nederlands", code: "dutch", vlag: "🇳🇱" },
  { naam: "Engels", code: "english", vlag: "🇬🇧" },
  { naam: "Duits", code: "german", vlag: "🇩🇪" },
  { naam: "Frans", code: "french", vlag: "🇫🇷" },
  { naam: "Spaans", code: "spanish", vlag: "🇪🇸" },
];

// Tijd → 00:00:02,500 (voor .srt)
function fmt(t: number) {
  const ms = Math.floor((t % 1) * 1000);
  const s = Math.floor(t) % 60;
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`;
}
function toSRT(cues: Cue[]) {
  return cues.map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text.trim()}`).join("\n\n") + "\n";
}

export default function OndertitelingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transcriberRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioCtxRef = useRef<any>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const cuesRef = useRef<Cue[]>([]);
  const blobRef = useRef<Blob | null>(null);

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>("dutch");
  const [status, setStatus] = useState<"idle" | "werkt" | "klaar" | "fout">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [cues, setCues] = useState<Cue[]>([]);
  const [current, setCurrent] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("webm");

  function loadFile(file: File | null | undefined) {
    if (!file) return;
    const ok = file.type.startsWith("video/") || /\.(mov|mp4|m4v|webm|avi|mkv)$/i.test(file.name);
    if (!ok) return;
    setCues([]); cuesRef.current = []; setResultUrl(null); setStatus("idle"); setStatusMsg("");
    setFileUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("video/"));
      if (item) loadFile(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Ondertitel tonen die past bij het huidige moment
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      const t = v.currentTime;
      const c = cuesRef.current.find((x) => t >= x.start && t <= x.end);
      setCurrent(c ? c.text.trim() : "");
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [fileUrl]);

  // Geluid opvangen door het bestand één keer (stil) af te spelen — Safari-proof
  async function getAudio(url: string): Promise<Float32Array> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ac = new AC();
    await ac.resume();
    const el = document.createElement("audio");
    el.src = url;
    el.crossOrigin = "anonymous";

    const src = ac.createMediaElementSource(el);
    const proc = ac.createScriptProcessor(4096, 1, 1);
    const gain = ac.createGain();
    gain.gain.value = 0; // stil afspelen
    src.connect(proc);
    proc.connect(gain);
    gain.connect(ac.destination);

    const chunks: Float32Array[] = [];
    proc.onaudioprocess = (e) => { chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };

    await new Promise<void>((resolve, reject) => {
      el.onended = () => resolve();
      el.onerror = () => reject(new Error("audio"));
      el.play().catch(reject);
    });

    proc.disconnect();
    src.disconnect();

    let len = 0;
    chunks.forEach((c) => (len += c.length));
    const flat = new Float32Array(len);
    let o = 0;
    chunks.forEach((c) => { flat.set(c, o); o += c.length; });

    // Omzetten naar 16kHz (wat Whisper wil)
    const inBuf = ac.createBuffer(1, Math.max(1, flat.length), ac.sampleRate);
    inBuf.copyToChannel(flat, 0);
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil((flat.length / ac.sampleRate) * 16000)), 16000);
    const bs = off.createBufferSource();
    bs.buffer = inBuf;
    bs.connect(off.destination);
    bs.start();
    const out = await off.startRendering();
    ac.close();
    return out.getChannelData(0);
  }

  async function transcribe() {
    if (!fileUrl) return;
    setStatus("werkt");
    setResultUrl(null);
    try {
      setStatusMsg("AI laden… (eerste keer kan even duren)");
      if (!transcriberRef.current) {
        // Transformers.js via CDN laden (geen bundel-gedoe)
        const url = ["https://cdn.jsdelivr.net/npm", "/@xenova/transformers@2.17.2"].join("");
        const mod = await import(/* webpackIgnore: true */ url);
        mod.env.allowLocalModels = false;
        transcriberRef.current = await mod.pipeline("automatic-speech-recognition", "Xenova/whisper-small", {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress_callback: (p: any) => {
            if (p.status === "progress" && p.file) setStatusMsg(`AI laden: ${p.file} ${Math.round(p.progress || 0)}%`);
          },
        });
      }

      setStatusMsg("Geluid opvangen (de video speelt één keer stil af)…");
      const audio = await getAudio(fileUrl);

      setStatusMsg("Bezig met luisteren en typen…");
      const out = await transcriberRef.current(audio, {
        language: lang,
        task: "transcribe",
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chunks: any[] = out.chunks ?? [];
      const result: Cue[] = chunks
        .filter((c) => c.text && c.text.trim())
        .map((c, i) => ({
          start: c.timestamp?.[0] ?? 0,
          end: c.timestamp?.[1] ?? (c.timestamp?.[0] ?? 0) + 2,
          text: c.text,
        }))
        .filter((c) => c.end > c.start);

      setCues(result);
      cuesRef.current = result;
      setStatus("klaar");
      setStatusMsg(`Klaar! ${result.length} ondertitels gevonden.`);
    } catch (e) {
      setStatus("fout");
      setStatusMsg("Het lukte niet om de ondertiteling te maken. Werkt het bestand wel af in de speler? Probeer een MP4/MOV.");
      console.error(e);
    }
  }

  function downloadSRT() {
    const blob = new Blob([toSRT(cuesRef.current)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ondertiteling.srt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getCanvasStream(canvas: HTMLCanvasElement, audioTrack: MediaStreamTrack | null) {
    let cs = canvasStreamRef.current;
    if (!cs) { cs = canvas.captureStream(30); canvasStreamRef.current = cs; }
    cs.getAudioTracks().forEach((t) => cs!.removeTrack(t));
    if (audioTrack) cs.addTrack(audioTrack);
    return cs;
  }

  // Ondertitels in de video "inbranden" en als nieuwe video opslaan
  async function burnIn() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || rendering) return;
    setRendering(true);
    setResultUrl(null);
    setProgress(0);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

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
    const parts: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) parts.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(parts, { type: mime || "video/webm" });
      blobRef.current = blob;
      setResultUrl(URL.createObjectURL(blob));
      setResultExt(ext);
      setRendering(false);
      setProgress(1);
    };

    const W = canvas.width, H = canvas.height;
    let raf = 0;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (ctx && video.videoWidth) {
        ctx.drawImage(video, 0, 0, W, H);
        const t = video.currentTime;
        const cue = cuesRef.current.find((x) => t >= x.start && t <= x.end);
        if (cue) drawSubtitle(ctx, cue.text.trim(), W, H);
      }
      if (video.duration) setProgress(video.currentTime / video.duration);
      raf = requestAnimationFrame(draw);
    };
    const onEnded = () => { cancelAnimationFrame(raf); recorder.stop(); video.removeEventListener("ended", onEnded); };

    video.currentTime = 0;
    video.muted = false;
    recorder.start();
    try { await video.play(); } catch { /* ignore */ }
    video.addEventListener("ended", onEnded);
    draw();
  }

  const busy = status === "werkt";

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">💬 Ondertiteling</h1>
          <span className="w-12" />
        </div>

        {!fileUrl ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]); }}
            className={`mt-4 flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-pink-500 bg-pink-500/10" : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500"}`}
          >
            <span className="text-5xl">💬</span>
            <p className="text-lg font-semibold">Kies of sleep een video</p>
            <p className="text-sm text-zinc-400">Uit Foto&apos;s, Bestanden, Drive… of plak met ⌘V</p>
            <input type="file" accept="video/*,video/quicktime,.mov,.mp4,.m4v,.webm,.avi" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
            <span className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2.5 font-semibold">📂 Kies video</span>
          </label>
        ) : (
          <>
            {/* Video met ondertitel-voorbeeld */}
            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl sm:rounded-3xl">
              <video ref={videoRef} src={fileUrl} controls playsInline className="absolute inset-0 h-full w-full object-contain" />
              {current && (
                <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
                  <span className="rounded-md bg-black/70 px-3 py-1 text-center text-lg font-semibold text-white shadow-lg" style={{ textShadow: "0 2px 4px #000" }}>{current}</span>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Taalkeuze */}
            <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
              <p className="mb-2 text-sm font-semibold text-zinc-300">In welke taal wordt er gesproken?</p>
              <div className="flex flex-wrap gap-2">
                {TALEN.map((t) => (
                  <button key={t.naam} onClick={() => setLang(t.code)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${lang === t.code ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
                    <span>{lang === t.code ? "✅" : t.vlag}</span> {t.naam}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={transcribe} disabled={busy} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-semibold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-50">
                  {busy ? "⏳ Bezig…" : "💬 Maak ondertiteling"}
                </button>
                <label className="cursor-pointer rounded-full border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 hover:bg-zinc-800">
                  📂 Andere video
                  <input type="file" accept="video/*,video/quicktime,.mov,.mp4,.m4v,.webm,.avi" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
                </label>
              </div>
              {statusMsg && <p className={`mt-3 text-sm ${status === "fout" ? "text-red-400" : "text-zinc-400"}`}>{statusMsg}</p>}
            </div>

            {/* Resultaat: ondertitels */}
            {cues.length > 0 && (
              <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button onClick={downloadSRT} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download .srt</button>
                  <button onClick={burnIn} disabled={rendering} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95 disabled:opacity-50">{rendering ? "⏳ Bezig…" : "🔥 In video branden"}</button>
                </div>
                {rendering && (
                  <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                )}
                {resultUrl && (
                  <div className="mb-3">
                    <p className="mb-2 text-sm font-semibold text-zinc-300">🎉 Video met ondertiteling:</p>
                    <video src={resultUrl} controls playsInline className="w-full rounded-xl" />
                    <a href={resultUrl} download={`videobest-ondertiteld.${resultExt}`} className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 font-semibold text-black">⬇ Download video</a>
                  </div>
                )}
                <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
                  {cues.map((c, i) => (
                    <button key={i} onClick={() => { if (videoRef.current) videoRef.current.currentTime = c.start; }} className="flex w-full gap-3 rounded-lg px-2 py-1 text-left hover:bg-zinc-800">
                      <span className="shrink-0 tabular-nums text-zinc-500">{fmt(c.start).slice(3, 8)}</span>
                      <span className="text-zinc-200">{c.text.trim()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function drawSubtitle(ctx: CanvasRenderingContext2D, text: string, W: number, H: number) {
  const fontSize = Math.round(H * 0.05);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  // tekst evt. over twee regels
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > W * 0.9 && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);

  const lh = fontSize * 1.25;
  let y = H - H * 0.06 - (lines.length - 1) * lh;
  for (const l of lines) {
    const w = ctx.measureText(l).width;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(W / 2 - w / 2 - 12, y - fontSize - 4, w + 24, fontSize + 14);
    ctx.fillStyle = "#fff";
    ctx.lineWidth = Math.max(2, fontSize * 0.08);
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(l, W / 2, y);
    ctx.fillText(l, W / 2, y);
    y += lh;
  }
}
