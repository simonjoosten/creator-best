"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  // Hoeveel procent is "geladen" (0 tot 100)
  const [progress, setProgress] = useState(0);
  // Is het laden klaar? Dan tonen we het welkomstscherm
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Elke 40 milliseconden tellen we de laadbalk een stukje op
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          // Kleine pauze, dan laadscherm weg
          setTimeout(() => setDone(true), 400);
          return 100;
        }
        return p + 2;
      });
    }, 40);

    return () => clearInterval(timer);
  }, []);

  // ----- Hoofdscherm (na het laden) -----
  if (done) {
    return <MainScreen />;
  }

  // ----- Laadscherm -----
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      {/* Draaiend logo / icoon */}
      <div className="relative mb-8 h-24 w-24">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-zinc-700 border-t-pink-500" />
        <div className="absolute inset-0 flex items-center justify-center text-4xl">
          🎬
        </div>
      </div>

      {/* Titel */}
      <h1 className="mb-2 text-3xl font-bold tracking-tight">VideoBest</h1>
      <p className="mb-8 text-zinc-400">Bezig met laden…</p>

      {/* Laadbalk */}
      <div className="h-2 w-64 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-zinc-500">{progress}%</p>
    </main>
  );
}

// Alle tools die op het hoofdscherm staan. Later voeg je hier gewoon
// een regel toe en verschijnt de tool vanzelf (en is hij doorzoekbaar).
const TOOLS = [
  {
    naam: "Filter video maken",
    beschrijving: "Zet een filter over je video.",
    icoon: "🎨",
    link: "/filter",
  },
  {
    naam: "Filter foto maken",
    beschrijving: "Maak een foto met een filter.",
    icoon: "📸",
    link: "/foto",
  },
  {
    naam: "Filter op je video",
    beschrijving: "Zet een filter op een bestaande video.",
    icoon: "🎞️",
    link: "/videofilter",
  },
  {
    naam: "Ondertiteling maken",
    beschrijving: "Automatische ondertitels onder je video.",
    icoon: "💬",
    link: "/ondertiteling",
  },
  {
    naam: "AI foto generator",
    beschrijving: "Typ wat je wil en de AI maakt het plaatje.",
    icoon: "🪄",
    link: "/aifoto",
  },
  {
    naam: "AI foto veranderen",
    beschrijving: "Zet een foto neer en de AI verandert hem.",
    icoon: "🖼️",
    link: "/aibewerk",
  },
  {
    naam: "AI video maken",
    beschrijving: "Typ je idee en de AI maakt er een filmpje van.",
    icoon: "🎥",
    link: "/aivideo",
  },
  {
    naam: "Kleurplaat maker",
    beschrijving: "AI maakt een kleurplaat om te printen.",
    icoon: "🖍️",
    link: "/kleurplaat",
  },
  {
    naam: "Sticker maker",
    beschrijving: "Maak je eigen vrolijke AI-sticker.",
    icoon: "🌟",
    link: "/sticker",
  },
  {
    naam: "Emoji maker",
    beschrijving: "Verzin je eigen emoji.",
    icoon: "😎",
    link: "/emoji",
  },
  {
    naam: "Logo maker",
    beschrijving: "AI maakt een logo voor je kanaal of team.",
    icoon: "✏️",
    link: "/logo",
  },
  {
    naam: "Poster maker",
    beschrijving: "Maak een coole poster voor aan de muur.",
    icoon: "🖼️",
    link: "/poster",
  },
];

function MainScreen() {
  // Wat de gebruiker in de zoekbalk typt
  const [zoek, setZoek] = useState("");

  // Houd alleen de tools over waarvan de naam de zoekterm bevat
  const gevonden = TOOLS.filter((tool) =>
    tool.naam.toLowerCase().includes(zoek.toLowerCase())
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-6 py-20 text-white">
      {/* Zachte kleurgloed op de achtergrond */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-pink-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-20 -right-40 h-[24rem] w-[24rem] rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="relative mx-auto max-w-2xl">
        {/* Kop */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-1 text-sm text-zinc-300 backdrop-blur">
            🎬 VideoBest
          </span>
          <h1 className="mt-6 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            Wat wil je maken?
          </h1>
          <p className="mt-3 text-zinc-400">Kies een tool om mee te beginnen.</p>
        </div>

        {/* Zoeker / zoekbalk */}
        <div className="relative mt-10">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            🔍
          </span>
          <input
            type="text"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek een tool…"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 py-4 pl-12 pr-4 text-white placeholder-zinc-500 shadow-lg outline-none backdrop-blur transition-colors focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30"
          />
        </div>

        {/* Lijst met gevonden tools */}
        <div className="mt-6 grid gap-4">
          {gevonden.map((tool) => (
            <Link
              key={tool.naam}
              href={tool.link}
              className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-pink-500/60 hover:bg-zinc-900 hover:shadow-xl hover:shadow-pink-500/10"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-2xl ring-1 ring-white/10">
                {tool.icoon}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{tool.naam}</span>
                <span className="block text-sm text-zinc-400">
                  {tool.beschrijving}
                </span>
              </span>
              <span className="ml-auto text-zinc-600 transition-all group-hover:translate-x-1 group-hover:text-pink-400">
                →
              </span>
            </Link>
          ))}

          {/* Niets gevonden? */}
          {gevonden.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-800 py-10 text-center text-zinc-500">
              Geen tool gevonden voor “{zoek}”.
            </p>
          )}
        </div>

        {/* Voetregel */}
        <p className="mt-12 text-center text-xs text-zinc-600">
          {TOOLS.length} tool{TOOLS.length === 1 ? "" : "s"} beschikbaar · meer
          komt eraan ✨
        </p>
      </div>
    </main>
  );
}
