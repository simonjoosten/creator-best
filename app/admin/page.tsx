"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CODE = "simonai";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [invoer, setInvoer] = useState("");
  const [fout, setFout] = useState(false);

  const [server, setServer] = useState("");
  const [bewaard, setBewaard] = useState<string | null>(null);
  const [test, setTest] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("cb_admin") === "1") setUnlocked(true);
      setServer(localStorage.getItem("cb_ai_server") || "");
    } catch { /* niets */ }
  }, []);

  function ontgrendel() {
    if (invoer.trim().toLowerCase() === CODE) {
      setUnlocked(true);
      setFout(false);
      try { sessionStorage.setItem("cb_admin", "1"); } catch {}
    } else {
      setFout(true);
    }
  }

  function opslaan() {
    try {
      const v = server.trim().replace(/\/$/, "");
      if (v) localStorage.setItem("cb_ai_server", v);
      else localStorage.removeItem("cb_ai_server");
      setBewaard(v ? `Opgeslagen: ${v}` : "Leeg gemaakt — gebruikt nu deze computer (localhost).");
      setTimeout(() => setBewaard(null), 4000);
    } catch { setBewaard("Opslaan lukte niet."); }
  }

  async function testVerbinding() {
    setTest("Bezig met testen…");
    try {
      const base = server.trim().replace(/\/$/, "");
      const r = await fetch(`${base}/api/genimg?prompt=test&w=256&h=256&seed=1`, { method: "GET" });
      const type = r.headers.get("content-type") || "";
      if (r.ok && type.startsWith("image")) setTest("✅ Werkt! De AI-server maakte een plaatje.");
      else setTest(`⚠️ Antwoord gekregen (status ${r.status}), maar geen plaatje.`);
    } catch {
      setTest("❌ Geen verbinding. Klopt het adres? Staat de AI-server aan?");
    }
  }

  function vergrendel() {
    try { sessionStorage.removeItem("cb_admin"); } catch {}
    setUnlocked(false);
    setInvoer("");
  }

  if (!unlocked) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center shadow-2xl">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-3 text-2xl font-bold">Admin-paneel</h1>
          <p className="mt-1 text-sm text-zinc-400">Voer de code in om binnen te komen.</p>
          <input
            type="password"
            value={invoer}
            onChange={(e) => { setInvoer(e.target.value); setFout(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") ontgrendel(); }}
            placeholder="Code…"
            className="mt-6 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-white outline-none focus:border-pink-500"
            autoFocus
          />
          {fout && <p className="mt-2 text-sm text-red-400">Verkeerde code. Probeer opnieuw.</p>}
          <button onClick={ontgrendel} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 font-bold transition-transform active:scale-95">🔓 Openen</button>
          <Link href="/" className="mt-4 block text-xs text-zinc-500 hover:text-zinc-300">← Terug naar de app</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">← Terug naar de app</Link>
          <h1 className="text-lg font-bold">🔓 Admin-paneel</h1>
          <button onClick={vergrendel} className="rounded-full border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-800">🔒 Vergrendel</button>
        </div>

        {/* AI-server instellen */}
        <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="font-semibold">🤖 AI-server adres</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Leeg = deze computer (localhost). Vul een adres in (bijv. een tunnel naar je Mac) zodat de AI ook op de
            openbare <span className="text-zinc-200">https</span>-site werkt.
          </p>
          <input
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder="https://… (laat leeg voor deze computer)"
            className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white outline-none focus:border-pink-500"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={opslaan} className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2 font-semibold">💾 Opslaan</button>
            <button onClick={testVerbinding} className="rounded-full border border-zinc-700 px-5 py-2 font-semibold hover:bg-zinc-800">🔌 Test verbinding</button>
            <button onClick={() => { setServer(""); }} className="rounded-full border border-zinc-700 px-5 py-2 font-semibold hover:bg-zinc-800">↺ Leeg</button>
          </div>
          {bewaard && <p className="mt-3 text-sm text-emerald-400">{bewaard}</p>}
          {test && <p className="mt-2 text-sm text-zinc-300">{test}</p>}
        </div>

        {/* Snelle links */}
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="font-semibold">🔗 Snel naar</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {[["/", "🏠 Home"], ["/filter", "🎨 Filterstudio"], ["/editstation", "🎬 Edit Station"], ["/aifoto", "🪄 AI foto"], ["/aimuziek", "🎵 AI muziek"]].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-full bg-zinc-800 px-4 py-2 hover:bg-zinc-700">{label}</Link>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-600">🔒 Let op: deze code is een simpel slotje, geen sterke beveiliging. Zet er geen echte geheimen achter.</p>
      </div>
    </main>
  );
}
