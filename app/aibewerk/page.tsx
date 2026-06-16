"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isPromptOk } from "../lib/safe";

const STIJLEN = [
  { naam: "Zelfde stijl", extra: "" },
  { naam: "Tekening", extra: ", cartoon drawing style" },
  { naam: "Anime", extra: ", anime style" },
  { naam: "3D", extra: ", 3d render, pixar style" },
  { naam: "Schilderij", extra: ", oil painting" },
  { naam: "Superheld", extra: ", epic superhero, comic style" },
];

const IDEEEN = ["maak er een superheld van", "verander naar de winter met sneeuw", "maak het een waterverf-schilderij", "zet er een draak naast", "maak het nacht met sterren"];

export default function AiBewerkPage() {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [watIs, setWatIs] = useState("");
  const [verandering, setVerandering] = useState("");
  const [stijl, setStijl] = useState(STIJLEN[0]);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [sterkte, setSterkte] = useState(0.6);
  const fotoFileRef = useRef<File | null>(null);

  function loadFile(file: File | null | undefined) {
    if (!file) return;
    const ok = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic|gif)$/i.test(file.name);
    if (!ok) return;
    fotoFileRef.current = file;
    setImgUrl(null);
    setFotoUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
  }

  // Echte foto-bewerking via ComfyUI (jouw foto wordt écht aangepast)
  async function echtVeranderen() {
    if (!verandering.trim() || !fotoFileRef.current) return;
    if (!isPromptOk(`${watIs} ${verandering}`)) { setMelding("Dat kan ik niet maken. 😊 Probeer iets anders."); return; }
    setMelding(null); setError(false); setLoading(true); setImgUrl(null);
    try {
      const fd = new FormData();
      fd.append("image", fotoFileRef.current);
      fd.append("prompt", `${watIs.trim() ? watIs.trim() + ", " : ""}${verandering.trim()}${stijl.extra}`);
      fd.append("sterkte", String(sterkte));
      const r = await fetch("/api/editimg", { method: "POST", body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setMelding(j.error || "Het lukte niet. Staat ComfyUI aan?");
        setLoading(false);
        return;
      }
      const blob = await r.blob();
      setImgUrl(URL.createObjectURL(blob));
      setLoading(false);
    } catch {
      setMelding("Er ging iets mis. Staat ComfyUI aan?");
      setLoading(false);
    }
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (item) loadFile(item.getAsFile());
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
  useEffect(() => () => { if (fotoUrl) URL.revokeObjectURL(fotoUrl); }, [fotoUrl]);

  function genereer() {
    if (!verandering.trim()) return;
    if (!isPromptOk(`${watIs} ${verandering}`)) {
      setMelding("Dat kan ik niet maken. 😊 Probeer iets anders.");
      return;
    }
    setMelding(null);
    setError(false);
    setLoading(true);
    const tekst = `${watIs.trim() ? watIs.trim() + ", " : ""}${verandering.trim()}${stijl.extra}, high quality, detailed`;
    const seed = Math.floor(Math.random() * 1_000_000);
    setImgUrl(`/api/genimg?prompt=${encodeURIComponent(tekst)}&w=1024&h=1024&seed=${seed}`);
  }

  async function download() {
    if (!imgUrl) return;
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u; a.download = "ai-bewerkt.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } catch { window.open(imgUrl, "_blank"); }
  }
  async function deel() {
    if (!imgUrl) return;
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], "ai-bewerkt.png", { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Mijn AI-foto" });
      else window.open(imgUrl, "_blank");
    } catch { /* afgebroken */ }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">🖼️ AI foto veranderen</h1>
          <span className="w-12" />
        </div>

        {!fotoUrl ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]); }}
            className={`mt-4 flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-pink-500 bg-pink-500/10" : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500"}`}
          >
            <span className="text-5xl">🖼️</span>
            <p className="text-lg font-semibold">Kies of sleep een foto</p>
            <p className="text-sm text-zinc-400">Uit Foto&apos;s, Bestanden… of plak met ⌘V</p>
            <input type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.heic" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
            <span className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-2.5 font-semibold">📂 Kies foto</span>
          </label>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-zinc-400">Jouw foto</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoUrl} alt="origineel" className="aspect-square w-full rounded-xl object-cover" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-zinc-400">AI-versie</p>
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
                  {loading && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-900/80"><div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-pink-500" /><p className="text-xs text-zinc-400">AI tekent…</p></div>}
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl} alt="ai" className="h-full w-full object-cover" onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError(true); }} />
                  ) : (
                    <span className="text-3xl">🪄</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
              <label className="mb-1 block text-sm font-semibold text-zinc-300">Wat staat er op je foto? (kort)</label>
              <input value={watIs} onChange={(e) => setWatIs(e.target.value)} placeholder="bijv. een jongen op een trap" className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 outline-none focus:border-pink-500" />

              <label className="mb-1 block text-sm font-semibold text-zinc-300">Wat wil je veranderen?</label>
              <input value={verandering} onChange={(e) => setVerandering(e.target.value)} placeholder="bijv. maak er een superheld van" className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 outline-none focus:border-pink-500" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {IDEEEN.map((v) => <button key={v} onClick={() => setVerandering(v)} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700">💡 {v}</button>)}
              </div>

              <p className="mb-2 mt-4 text-sm font-semibold text-zinc-300">Stijl</p>
              <div className="flex flex-wrap gap-2">
                {STIJLEN.map((s) => <button key={s.naam} onClick={() => setStijl(s)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${stijl.naam === s.naam ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{s.naam}</button>)}
              </div>

              <label className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
                Hoeveel veranderen?
                <input type="range" min={0.3} max={0.85} step={0.05} value={sterkte} onChange={(e) => setSterkte(Number(e.target.value))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-pink-500" />
                <span className="w-16 text-right text-zinc-400">{sterkte < 0.5 ? "weinig" : sterkte < 0.7 ? "gemiddeld" : "veel"}</span>
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={echtVeranderen} disabled={loading} className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-bold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-50">{loading ? "⏳ Bezig…" : "🪄 Verander mijn échte foto"}</button>
                <button onClick={genereer} disabled={loading} className="rounded-full border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50" title="Maakt een nieuw plaatje op basis van je beschrijving">🎨 Nieuw plaatje</button>
                <label className="cursor-pointer rounded-full border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 hover:bg-zinc-800">📂 Andere foto<input type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.heic" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} /></label>
              </div>

              {melding && <p className="mt-3 rounded-xl bg-amber-500/15 px-4 py-2 text-sm text-amber-200">🛡️ {melding}</p>}
              {error && <p className="mt-3 text-sm text-red-400">Het lukte even niet (AI was druk). Probeer nog eens.</p>}
              {imgUrl && !loading && !error && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={deel} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">📥 Bewaar in Foto&apos;s</button>
                  <button onClick={download} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download</button>
                  <button onClick={genereer} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 hover:bg-zinc-800">🎲 Opnieuw</button>
                </div>
              )}
            </div>
          </>
        )}

        <p className="mt-4 text-center text-xs text-zinc-600">🔒 Je eigen foto blijft op je apparaat. De AI maakt een nieuwe versie op basis van jouw beschrijving (Flux/Pollinations).</p>
      </div>
    </main>
  );
}
