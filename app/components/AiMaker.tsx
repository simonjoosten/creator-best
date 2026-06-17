"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { isPromptOk } from "../lib/safe";

export type MakerConfig = {
  titel: string;
  icoon: string;
  uitleg: string;
  suffix: string; // wordt achter je tekst geplakt (bepaalt de stijl)
  placeholder: string;
  voorbeelden: string[];
  w?: number;
  h?: number;
};

export default function AiMaker({ cfg }: { cfg: MakerConfig }) {
  const [prompt, setPrompt] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const triesRef = useRef(0);
  const W = cfg.w ?? 768;
  const H = cfg.h ?? 768;

  function bouwUrl() {
    const seed = Math.floor(Math.random() * 1_000_000);
    return `/api/genimg?prompt=${encodeURIComponent(prompt.trim() + cfg.suffix)}&w=${W}&h=${H}&seed=${seed}`;
  }
  function maak() {
    const t = prompt.trim();
    if (!t) return;
    if (!isPromptOk(t)) { setMelding("Dat kan ik niet maken. 😊 Kies iets anders!"); return; }
    setMelding(null);
    setError(false);
    setLoading(true);
    triesRef.current = 0;
    setImgUrl(bouwUrl());
  }
  function bijFout() {
    setLoading(false);
    if (triesRef.current < 3) { triesRef.current += 1; setLoading(true); setTimeout(() => setImgUrl(bouwUrl()), 2500); }
    else setError(true);
  }
  async function download() {
    if (!imgUrl) return;
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = u; a.download = `${cfg.titel.toLowerCase().replace(/\s+/g, "-")}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } catch { window.open(imgUrl, "_blank"); }
  }
  async function bewaar() {
    if (!imgUrl) return;
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], "videobest.png", { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: cfg.titel });
      else window.open(imgUrl, "_blank");
    } catch { /* afgebroken */ }
  }
  function printen() {
    if (!imgUrl) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${cfg.titel}</title><style>@page{margin:1cm}html,body{margin:0;height:100%}img{max-width:100%;max-height:100%;display:block;margin:auto}</style></head><body><img src="${imgUrl}" onload="window.focus();window.print();"></body></html>`);
    w.document.close();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">{cfg.icoon} {cfg.titel}</h1>
          <span className="w-12" />
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
          <p className="mb-2 text-sm text-zinc-400">{cfg.uitleg}</p>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder={cfg.placeholder} className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-pink-500" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cfg.voorbeelden.map((v) => <button key={v} onClick={() => setPrompt(v)} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700">💡 {v}</button>)}
          </div>
          <button onClick={maak} disabled={loading} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-lg font-bold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-50">
            {loading ? "⏳ Aan het maken…" : `${cfg.icoon} Maak het!`}
          </button>
          {melding && <p className="mt-3 rounded-xl bg-amber-500/15 px-4 py-2 text-sm text-amber-200">🛡️ {melding}</p>}
        </div>

        {imgUrl && (
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
            <div className="relative overflow-hidden rounded-xl bg-black">
              {loading && <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 bg-zinc-900/80"><div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-pink-500" /><p className="text-sm text-zinc-400">{triesRef.current > 0 ? `Even druk… opnieuw (${triesRef.current}/3)` : "De AI is bezig…"}</p></div>}
              {error && <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 p-6 text-center"><span className="text-4xl">😕</span><p className="text-sm text-zinc-400">Het lukte even niet. Probeer nog eens (of zet ComfyUI aan voor topkwaliteit).</p></div>}
              {!error && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl} alt={cfg.titel} className={loading ? "hidden" : "w-full"} onLoad={() => setLoading(false)} onError={bijFout} />
              )}
            </div>
            {!loading && !error && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={printen} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">🖨️ Printen</button>
                <button onClick={bewaar} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">📥 Bewaar/deel</button>
                <button onClick={download} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 hover:bg-zinc-800">⬇ Download</button>
                <button onClick={maak} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 hover:bg-zinc-800">🎲 Opnieuw</button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
