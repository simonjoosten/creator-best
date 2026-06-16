"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Kiest het juiste spel op basis van het filter
export function GameOverlay({ game }: { game: string }) {
  if (game === "mik") return <MikGame />;
  if (game === "snel") return <SnelGame />;
  if (game === "reactie") return <ReactieGame />;
  if (game === "vang") return <VangGame />;
  if (game === "kleur") return <KleurGame />;
  if (game === "volg") return <VolgGame />;
  return <TikGame />;
}

function Hud({ children }: { children: React.ReactNode }) {
  return <div className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-sm font-bold backdrop-blur">{children}</div>;
}

// ---- 1) TIK OP TIJD: balk heen en weer, raak de groene zone ----------------
function TikGame() {
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const targetRef = useRef(0.5);
  const [pos, setPos] = useState(0);
  const [target, setTarget] = useState(0.5);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<{ ok: boolean; txt: string } | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = 0.85;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let p = posRef.current + dirRef.current * speed * dt;
      if (p > 1) { p = 1; dirRef.current = -1; } else if (p < 0) { p = 0; dirRef.current = 1; }
      posRef.current = p;
      setPos(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tik = useCallback(() => {
    const d = Math.abs(posRef.current - targetRef.current);
    if (d < 0.06) {
      const perfect = d < 0.025;
      setScore((s) => s + (perfect ? 100 : 50));
      setStreak((s) => s + 1);
      setFlash({ ok: true, txt: perfect ? "PERFECT! +100" : "Goed! +50" });
    } else {
      setStreak(0);
      setFlash({ ok: false, txt: "Mis!" });
    }
    const nt = 0.12 + Math.random() * 0.76;
    targetRef.current = nt;
    setTarget(nt);
    setTimeout(() => setFlash(null), 600);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); tik(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tik]);

  return (
    <>
      <Hud>⭐ {score}{streak > 1 ? ` · 🔥${streak}` : ""}</Hud>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="relative h-6 w-full rounded-full bg-black/50 backdrop-blur">
          <div className="absolute top-0 h-full rounded-full bg-emerald-400/40 ring-2 ring-emerald-300" style={{ left: `${(target - 0.06) * 100}%`, width: "12%" }} />
          <div className="absolute top-1/2 h-8 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" style={{ left: `${pos * 100}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={`text-lg font-extrabold ${flash ? (flash.ok ? "text-emerald-400" : "text-red-400") : "text-transparent"}`}>{flash?.txt ?? "·"}</span>
          <button onClick={tik} className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-3 text-lg font-extrabold shadow-lg shadow-pink-500/30 transition-transform active:scale-90">TIK! (of spatie)</button>
        </div>
      </div>
    </>
  );
}

// ---- 2) MIK & TIK: ballonnen poppen op, tik ze weg -------------------------
function MikGame() {
  const [targets, setTargets] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const [score, setScore] = useState(0);
  const idRef = useRef(0);
  const emojis = ["🎈", "🎈", "🎈", "💥", "⭐", "🍎"];

  useEffect(() => {
    const spawn = setInterval(() => {
      const id = idRef.current++;
      const t = { id, x: 0.1 + Math.random() * 0.8, y: 0.15 + Math.random() * 0.7, emoji: emojis[Math.floor(Math.random() * emojis.length)] };
      setTargets((cur) => [...cur, t]);
      setTimeout(() => setTargets((cur) => cur.filter((x) => x.id !== id)), 1300);
    }, 750);
    return () => clearInterval(spawn);
  }, []);

  const pop = (id: number, bom: boolean) => {
    setTargets((cur) => cur.filter((x) => x.id !== id));
    setScore((s) => s + (bom ? -30 : 10));
  };

  return (
    <>
      <Hud>⭐ {score}</Hud>
      <div className="absolute inset-0">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => pop(t.id, t.emoji === "💥")}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-5xl transition-transform active:scale-75"
            style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, animation: "vb-pop 0.2s ease-out" }}
          >
            {t.emoji}
          </button>
        ))}
        <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white/80">Tik de ballonnen! (💥 = -30)</p>
      </div>
    </>
  );
}

// ---- 3) SNELTIK: zo vaak mogelijk tikken in 10 seconden --------------------
function SnelGame() {
  const [count, setCount] = useState(0);
  const [time, setTime] = useState(10);
  const [running, setRunning] = useState(false);
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (!running) return;
    if (time <= 0) {
      setRunning(false);
      setBest((b) => Math.max(b, count));
      return;
    }
    const id = setTimeout(() => setTime((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [running, time, count]);

  const start = () => { setCount(0); setTime(10); setRunning(true); };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/20">
      <Hud>⏱️ {time}s · 🏆 {best}</Hud>
      {running ? (
        <button onClick={() => setCount((c) => c + 1)} className="flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-5xl font-black shadow-2xl transition-transform active:scale-90">
          {count}
        </button>
      ) : (
        <div className="text-center">
          {count > 0 && <p className="mb-3 text-2xl font-extrabold">Jouw score: {count} 🎉</p>}
          <button onClick={start} className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-10 py-4 text-xl font-extrabold shadow-lg transition-transform active:scale-90">START</button>
        </div>
      )}
    </div>
  );
}

// ---- 4) REACTIETEST: wacht op groen, tik zo snel mogelijk ------------------
function ReactieGame() {
  const [state, setState] = useState<"idle" | "wacht" | "nu" | "klaar" | "vroeg">("idle");
  const [ms, setMs] = useState(0);
  const [best, setBest] = useState(0);
  const startRef = useRef(0);
  const toRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const begin = () => {
    setState("wacht");
    const delay = 1200 + Math.random() * 2500;
    toRef.current = setTimeout(() => { startRef.current = performance.now(); setState("nu"); }, delay);
  };

  const tap = () => {
    if (state === "idle" || state === "klaar" || state === "vroeg") return begin();
    if (state === "wacht") { if (toRef.current) clearTimeout(toRef.current); setState("vroeg"); return; }
    if (state === "nu") {
      const t = Math.round(performance.now() - startRef.current);
      setMs(t);
      setBest((b) => (b === 0 ? t : Math.min(b, t)));
      setState("klaar");
    }
  };

  useEffect(() => () => { if (toRef.current) clearTimeout(toRef.current); }, []);

  const bg = state === "nu" ? "bg-emerald-500/80" : state === "wacht" ? "bg-red-500/60" : "bg-black/40";
  const txt =
    state === "idle" ? "Tik om te starten" :
    state === "wacht" ? "Wacht op GROEN…" :
    state === "nu" ? "TIK NU!" :
    state === "vroeg" ? "Te vroeg! Tik opnieuw" :
    `${ms} ms ⚡  (beste: ${best})  — tik opnieuw`;

  return (
    <button onClick={tap} className={`absolute inset-0 flex items-center justify-center text-center text-2xl font-extrabold ${bg}`}>
      {txt}
    </button>
  );
}

// ---- 5) VANG HET: dingen vallen, tik ze voor ze de grond raken -------------
function VangGame() {
  const [items, setItems] = useState<{ id: number; x: number; emoji: string }[]>([]);
  const [score, setScore] = useState(0);
  const idRef = useRef(0);
  const goed = ["🍎", "🍌", "🍓", "⭐", "🍒"];

  useEffect(() => {
    const spawn = setInterval(() => {
      const id = idRef.current++;
      setItems((cur) => [...cur, { id, x: 0.12 + Math.random() * 0.76, emoji: goed[Math.floor(Math.random() * goed.length)] }]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 3600);
    }, 850);
    return () => clearInterval(spawn);
  }, []);

  const vang = (id: number) => { setItems((cur) => cur.filter((x) => x.id !== id)); setScore((s) => s + 10); };

  return (
    <>
      <Hud>🧺 {score}</Hud>
      <div className="absolute inset-0 z-10 overflow-hidden">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => vang(it.id)}
            className="absolute top-0 text-6xl active:scale-90"
            style={{ left: `${it.x * 100}%`, animation: "vb-fall 3.6s linear forwards" }}
          >
            {it.emoji}
          </button>
        ))}
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-white/80">Tik het fruit voor het valt! 🍎</p>
      </div>
    </>
  );
}

// ---- 6) KLEURTIK: tik bij GROEN, niet bij ROOD -----------------------------
function KleurGame() {
  const [groen, setGroen] = useState(true);
  const [score, setScore] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setGroen(Math.random() > 0.4), 850);
    return () => clearInterval(id);
  }, []);
  return (
    <button onClick={() => setScore((s) => s + (groen ? 10 : -10))} className={`absolute inset-0 flex items-center justify-center text-4xl font-black transition-colors ${groen ? "bg-emerald-500/45" : "bg-red-500/45"}`}>
      <Hud>⭐ {score}</Hud>
      {groen ? "TIK! 🟢" : "STOP! 🔴"}
    </button>
  );
}

// ---- 7) VOLG DE STIP: tik de bewegende stip --------------------------------
function VolgGame() {
  const [p, setP] = useState({ x: 0.5, y: 0.5 });
  const pRef = useRef({ x: 0.5, y: 0.5 });
  const tRef = useRef({ x: 0.5, y: 0.5 });
  const [score, setScore] = useState(0);
  useEffect(() => {
    let raf = 0;
    const retarget = setInterval(() => { tRef.current = { x: 0.12 + Math.random() * 0.76, y: 0.15 + Math.random() * 0.7 }; }, 1100);
    const loop = () => {
      const c = pRef.current, t = tRef.current;
      const n = { x: c.x + (t.x - c.x) * 0.06, y: c.y + (t.y - c.y) * 0.06 };
      pRef.current = n;
      setP(n);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); clearInterval(retarget); };
  }, []);
  return (
    <>
      <Hud>⭐ {score}</Hud>
      <button onClick={() => setScore((s) => s + 5)} className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 shadow-[0_0_18px_rgba(244,114,182,0.8)] active:scale-90" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} />
      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-white/80">Tik de stip zo vaak mogelijk! 🔮</p>
    </>
  );
}
