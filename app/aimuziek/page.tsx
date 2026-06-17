"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { isPromptOk } from "../lib/safe";

const STIJLEN = [
  "vrolijke 8-bit game muziek",
  "rustige piano",
  "epische film-soundtrack",
  "chille lofi beat",
  "spannende actie-muziek",
  "vrolijke ukelele",
];

// Maak van AI-geluid een speelbaar/downloadbaar WAV-bestand
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE");
  w(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, "data"); view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Blob([view], { type: "audio/wav" });
}

export default function AiMuziekPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synthRef = useRef<{ tokenizer: any; model: any } | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const [prompt, setPrompt] = useState("");
  const [lengte, setLengte] = useState(256); // tokens ≈ duur
  const [status, setStatus] = useState<"idle" | "bezig" | "klaar" | "fout">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function maak() {
    const t = prompt.trim();
    if (!t) return;
    if (!isPromptOk(t)) { setStatus("fout"); setStatusMsg("Dat kan ik niet maken. 😊"); return; }
    setStatus("bezig"); setAudioUrl(null);
    try {
      setStatusMsg("AI laden… (eerste keer een grotere download, daarna onthoudt je browser het)");
      if (!synthRef.current) {
        const url = ["https://cdn.jsdelivr.net/npm", "/@huggingface/transformers@3.8.0"].join("");
        const mod = await import(/* webpackIgnore: true */ url);
        mod.env.allowLocalModels = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prog = (p: any) => { if (p.status === "progress" && p.file) setStatusMsg(`AI laden: ${p.file} ${Math.round(p.progress || 0)}%`); };
        const tokenizer = await mod.AutoTokenizer.from_pretrained("Xenova/musicgen-small", { progress_callback: prog });
        const model = await mod.MusicgenForConditionalGeneration.from_pretrained("Xenova/musicgen-small", { progress_callback: prog });
        synthRef.current = { tokenizer, model };
      }
      setStatusMsg("Muziek aan het maken… (dit duurt even, je Mac doet het werk)");
      const { tokenizer, model } = synthRef.current;
      const inputs = tokenizer(t);
      const audioValues = await model.generate({ ...inputs, max_new_tokens: lengte, do_sample: true, guidance_scale: 3 });
      const sr = model.config?.audio_encoder?.sampling_rate ?? 32000;
      const blob = encodeWAV(audioValues.data as Float32Array, sr);
      blobRef.current = blob;
      setAudioUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
      setStatus("klaar"); setStatusMsg("");
    } catch (e) {
      setStatus("fout");
      setStatusMsg("Het muziek maken lukte niet in deze browser. Probeer Chrome (met WebGPU).");
      console.error(e);
    }
  }

  async function deel() {
    if (!blobRef.current) return;
    try {
      const file = new File([blobRef.current], "ai-muziek.wav", { type: "audio/wav" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Mijn AI-muziek" });
      else if (audioUrl) window.open(audioUrl, "_blank");
    } catch { /* afgebroken */ }
  }

  const bezig = status === "bezig";

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">🎵 AI muziek maken</h1>
          <span className="w-12" />
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
          <label className="mb-2 block text-sm font-semibold text-zinc-300">Wat voor muziek?</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="bijv. vrolijke 8-bit game muziek met een snel ritme" className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-pink-500" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STIJLEN.map((v) => <button key={v} onClick={() => setPrompt(v)} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700">🎶 {v}</button>)}
          </div>

          <p className="mb-2 mt-4 text-sm font-semibold text-zinc-300">Lengte</p>
          <div className="flex flex-wrap gap-2">
            {[{ n: "Kort (~5s)", v: 256 }, { n: "Middel (~10s)", v: 512 }, { n: "Lang (~15s)", v: 768 }].map((o) => (
              <button key={o.v} onClick={() => setLengte(o.v)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${lengte === o.v ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{o.n}</button>
            ))}
          </div>

          <button onClick={maak} disabled={bezig} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-lg font-bold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-50">
            {bezig ? "⏳ Bezig…" : "🎵 Maak muziek"}
          </button>
          {statusMsg && <p className={`mt-3 text-sm ${status === "fout" ? "text-red-400" : "text-zinc-400"}`}>{bezig && "⏳ "}{statusMsg}</p>}
        </div>

        {audioUrl && status === "klaar" && (
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-300">🎉 Je muziekje is klaar!</p>
            <audio src={audioUrl} controls loop className="w-full" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={deel} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">📤 Doorsturen / delen</button>
              <a href={audioUrl} download="ai-muziek.wav" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download</a>
              <button onClick={maak} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 hover:bg-zinc-800">🎲 Opnieuw</button>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-zinc-600">AI-muziek (MusicGen) draait op je eigen computer · eerste keer een grote download · experimenteel</p>
      </div>
    </main>
  );
}
