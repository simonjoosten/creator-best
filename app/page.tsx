"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(() => setDone(true), 400);
          return 100;
        }
        return p + 2;
      });
    }, 40);
    return () => clearInterval(timer);
  }, []);

  if (done) return <MainScreen />;

  // ----- Laadscherm -----
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="relative mb-8 h-24 w-24">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-zinc-700 border-t-pink-500" />
        <div className="absolute inset-0 flex items-center justify-center text-4xl">🎨</div>
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Creator Best</h1>
      <p className="mb-8 text-zinc-400">Bezig met laden…</p>
      <div className="h-2 w-64 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-75" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-sm text-zinc-500">{progress}%</p>
    </main>
  );
}

const TABS = [
  { naam: "Video Best", icoon: "🎬" },
  { naam: "Foto Best", icoon: "📸" },
  { naam: "Creatie Best", icoon: "🎨" },
];

// Elke tool hoort bij een tabblad
const TOOLS = [
  // ---- Video Best ----
  { tab: "Video Best", naam: "Filter video maken", beschrijving: "Live camera met 90+ filters + opnemen.", icoon: "🎨", link: "/filter" },
  { tab: "Video Best", naam: "Filter op je video", beschrijving: "Zet een filter op een bestaande video.", icoon: "🎞️", link: "/videofilter" },
  { tab: "Video Best", naam: "Ondertiteling maken", beschrijving: "Automatische ondertitels onder je video.", icoon: "💬", link: "/ondertiteling" },
  { tab: "Video Best", naam: "AI video maken", beschrijving: "Typ je idee en de AI maakt er een filmpje van.", icoon: "🎥", link: "/aivideo" },

  // ---- Foto Best ----
  { tab: "Foto Best", naam: "Filter foto maken", beschrijving: "Maak een foto met een filter.", icoon: "📸", link: "/foto" },
  { tab: "Foto Best", naam: "AI foto generator", beschrijving: "Typ wat je wil en de AI maakt het plaatje.", icoon: "🪄", link: "/aifoto" },
  { tab: "Foto Best", naam: "AI foto veranderen", beschrijving: "Zet een foto neer en de AI verandert hem echt.", icoon: "🖼️", link: "/aibewerk" },

  // ---- Creatie Best ----
  { tab: "Creatie Best", naam: "Kleurplaat maker", beschrijving: "AI maakt een kleurplaat om te printen.", icoon: "🖍️", link: "/kleurplaat" },
  { tab: "Creatie Best", naam: "Sticker maker", beschrijving: "Maak je eigen vrolijke AI-sticker.", icoon: "🌟", link: "/sticker" },
  { tab: "Creatie Best", naam: "Emoji maker", beschrijving: "Verzin je eigen emoji.", icoon: "😎", link: "/emoji" },
  { tab: "Creatie Best", naam: "Logo maker", beschrijving: "AI maakt een logo voor je kanaal of team.", icoon: "✏️", link: "/logo" },
  { tab: "Creatie Best", naam: "Poster maker", beschrijving: "Maak een coole poster voor aan de muur.", icoon: "🖼️", link: "/poster" },
];

function MainScreen() {
  const [zoek, setZoek] = useState("");
  const [tab, setTab] = useState(TABS[0].naam);

  const zoekt = zoek.trim().length > 0;
  const zichtbaar = TOOLS.filter((t) =>
    zoekt ? t.naam.toLowerCase().includes(zoek.toLowerCase()) : t.tab === tab
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-5 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-pink-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-20 -right-40 h-[24rem] w-[24rem] rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="relative mx-auto max-w-2xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-1 text-sm text-zinc-300 backdrop-blur">🎨 Creator Best</span>
          <h1 className="mt-6 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">Wat wil je maken?</h1>
          <p className="mt-3 text-zinc-400">Kies een tabblad en een tool.</p>
        </div>

        {/* Tabbladen */}
        <div className="mt-8 flex justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.naam}
              onClick={() => { setTab(t.naam); setZoek(""); }}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all sm:text-base ${!zoekt && tab === t.naam ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30" : "bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800"}`}
            >
              {t.icoon} {t.naam}
            </button>
          ))}
        </div>

        {/* Zoeker */}
        <div className="relative mt-5">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
          <input type="text" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Of zoek een tool…" className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 py-3.5 pl-12 pr-4 text-white placeholder-zinc-500 shadow-lg outline-none backdrop-blur transition-colors focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30" />
        </div>

        {/* Tools */}
        <div className="mt-6 grid gap-4">
          {zichtbaar.map((tool) => (
            <Link key={tool.naam} href={tool.link} className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-pink-500/60 hover:bg-zinc-900 hover:shadow-xl hover:shadow-pink-500/10">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-2xl ring-1 ring-white/10">{tool.icoon}</span>
              <span className="min-w-0">
                <span className="block font-semibold">{tool.naam}</span>
                <span className="block text-sm text-zinc-400">{tool.beschrijving}</span>
              </span>
              <span className="ml-auto text-zinc-600 transition-all group-hover:translate-x-1 group-hover:text-pink-400">→</span>
            </Link>
          ))}
          {zichtbaar.length === 0 && <p className="rounded-2xl border border-dashed border-zinc-800 py-10 text-center text-zinc-500">Geen tool gevonden voor “{zoek}”.</p>}
        </div>

        <p className="mt-12 text-center text-xs text-zinc-600">{TOOLS.length} tools · 3 tabbladen ✨</p>
      </div>
    </main>
  );
}
