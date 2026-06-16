"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { isPromptOk } from "../lib/safe";

const STIJLEN = [
  { naam: "Verras me", extra: "" },
  { naam: "Fotorealistisch", extra: ", photorealistic, ultra detailed, 8k" },
  { naam: "Cartoon", extra: ", cartoon style, vibrant colors" },
  { naam: "Anime", extra: ", anime style, studio quality" },
  { naam: "3D render", extra: ", 3d render, pixar style, soft lighting" },
  { naam: "Digitale kunst", extra: ", digital art, trending on artstation" },
  { naam: "Olieverf", extra: ", oil painting, brush strokes" },
  { naam: "Potlood-schets", extra: ", pencil sketch, black and white" },
];

const FORMATEN = [
  { naam: "Vierkant", w: 1024, h: 1024, icoon: "⬛" },
  { naam: "Liggend", w: 1280, h: 768, icoon: "🖼️" },
  { naam: "Staand", w: 768, h: 1280, icoon: "📱" },
];

const VOORBEELDEN = ["een schattige robot die taart bakt", "een draak boven een kasteel bij zonsondergang", "een kat-astronaut in de ruimte", "een magisch bos met gloeiende paddenstoelen"];

export default function AiFotoPage() {
  const [prompt, setPrompt] = useState("");
  const [stijl, setStijl] = useState(STIJLEN[0]);
  const [formaat, setFormaat] = useState(FORMATEN[0]);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [vraag, setVraag] = useState<string | null>(null);
  const triesRef = useRef(0);

  function bouwUrl() {
    const volledig = prompt.trim() + stijl.extra + ", high quality, detailed";
    const seed = Math.floor(Math.random() * 1_000_000);
    // Via onze eigen server-route (die blijft proberen tot het lukt)
    return `/api/genimg?prompt=${encodeURIComponent(volledig)}&w=${formaat.w}&h=${formaat.h}&seed=${seed}`;
  }

  function genereer() {
    const tekst = prompt.trim();
    // De AI "stelt soms een extra vraag" als je beschrijving erg kort is
    if (tekst.length > 0 && tekst.split(/\s+/).length < 3) {
      setVraag("Vertel iets meer! Bijv. welke kleuren, waar speelt het zich af, en welke sfeer? 🎨");
      return;
    }
    if (!tekst) return;
    if (!isPromptOk(tekst)) {
      setVraag("Dat kan ik niet maken. 😊 Kies iets anders, bijvoorbeeld een dier, een plek of een avontuur!");
      return;
    }
    setVraag(null);
    setError(false);
    setLoading(true);
    triesRef.current = 0;
    setImgUrl(bouwUrl());
  }

  // Als het mislukt (AI druk): tot 3x automatisch opnieuw proberen
  function bijFout() {
    setLoading(false);
    if (triesRef.current < 3) {
      triesRef.current += 1;
      setLoading(true);
      setTimeout(() => setImgUrl(bouwUrl()), 2500);
    } else {
      setError(true);
    }
  }

  async function download() {
    if (!imgUrl) return;
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u; a.download = "ai-foto.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } catch {
      window.open(imgUrl, "_blank");
    }
  }

  async function deel() {
    if (!imgUrl) return;
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], "ai-foto.png", { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Mijn AI-foto" });
      else window.open(imgUrl, "_blank");
    } catch { /* afgebroken */ }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 transition-colors hover:text-white">← Terug</Link>
          <h1 className="text-base font-bold sm:text-lg">🪄 AI foto generator</h1>
          <span className="w-12" />
        </div>

        {/* Beschrijving */}
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
          <label className="mb-2 block text-sm font-semibold text-zinc-300">Wat wil je zien?</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Bijv. een schattige robot die taart bakt in een kleurrijke keuken"
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-pink-500"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VOORBEELDEN.map((v) => (
              <button key={v} onClick={() => setPrompt(v)} className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700">💡 {v}</button>
            ))}
          </div>

          {/* Stijl */}
          <p className="mb-2 mt-4 text-sm font-semibold text-zinc-300">Stijl</p>
          <div className="flex flex-wrap gap-2">
            {STIJLEN.map((s) => (
              <button key={s.naam} onClick={() => setStijl(s)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${stijl.naam === s.naam ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{s.naam}</button>
            ))}
          </div>

          {/* Formaat */}
          <p className="mb-2 mt-4 text-sm font-semibold text-zinc-300">Formaat</p>
          <div className="flex flex-wrap gap-2">
            {FORMATEN.map((fmt) => (
              <button key={fmt.naam} onClick={() => setFormaat(fmt)} className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${formaat.naam === fmt.naam ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{fmt.icoon} {fmt.naam}</button>
            ))}
          </div>

          <button onClick={genereer} disabled={loading} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-lg font-bold shadow-lg shadow-pink-500/30 transition-transform active:scale-95 disabled:opacity-50">
            {loading ? "⏳ Aan het maken…" : "🪄 Maak mijn plaatje"}
          </button>
          {vraag && <p className="mt-3 rounded-xl bg-amber-500/15 px-4 py-2 text-sm text-amber-200">🤖 {vraag}</p>}
        </div>

        {/* Resultaat */}
        {imgUrl && (
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
            <div className="relative overflow-hidden rounded-xl bg-black">
              {loading && (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 bg-zinc-900/80">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-pink-500" />
                  <p className="text-sm text-zinc-400">{triesRef.current > 0 ? `De AI is druk… ik probeer opnieuw (${triesRef.current}/3)` : "De AI tekent je plaatje…"}</p>
                </div>
              )}
              {error && (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <span className="text-4xl">😕</span>
                  <p className="text-sm font-semibold text-red-300">De gratis AI is op dit moment overbelast.</p>
                  <p className="text-xs text-zinc-400">Dit ligt niet aan jou — de gratis dienst laat soms geen plaatjes meer maken. Probeer het over een minuutje nog eens.</p>
                </div>
              )}
              {!error && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl}
                  alt="AI plaatje"
                  className={loading ? "hidden" : "w-full"}
                  onLoad={() => setLoading(false)}
                  onError={bijFout}
                />
              )}
            </div>
            {!loading && !error && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={deel} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2.5 font-semibold transition-transform active:scale-95">📥 Bewaar in Foto&apos;s</button>
                <button onClick={download} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform active:scale-95">⬇ Download</button>
                <button onClick={genereer} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 hover:bg-zinc-800">🎲 Opnieuw</button>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-zinc-600">Gemaakt met de gratis AI &ldquo;Flux&rdquo; (Pollinations) · soms even geduld als het druk is</p>
      </div>
    </main>
  );
}
