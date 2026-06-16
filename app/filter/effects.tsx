"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Overlay } from "./filters";
import { overlayStyle } from "./render";

// Tekent een gekleurde laag in het live beeld (duotone = twee lagen)
export function OverlayLayers({ overlay }: { overlay: Overlay }) {
  if (overlay.kind === "duotone") {
    const [dark, light] = overlay.colors ?? ["#000", "#fff"];
    const op = overlay.opacity ?? 1;
    return (
      <>
        <div className="pointer-events-none absolute inset-0" style={{ background: light, mixBlendMode: "lighten", opacity: op }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: dark, mixBlendMode: "darken", opacity: op }} />
      </>
    );
  }
  return <div style={overlayStyle(overlay)} />;
}

// ===========================================================================
//  1) SVG-FILTERS — echte beeldfilters die op de videokaart draaien.
//     Je gebruikt ze via css: "url(#vb-cartoon)" enz.
// ===========================================================================
export function SvgFilters() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        {/* Cartoon: kleuren in stappen (posterize) */}
        <filter id="vb-cartoon" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feComponentTransfer in="b">
            <feFuncR type="discrete" tableValues="0 0.22 0.45 0.68 0.9 1" />
            <feFuncG type="discrete" tableValues="0 0.22 0.45 0.68 0.9 1" />
            <feFuncB type="discrete" tableValues="0 0.22 0.45 0.68 0.9 1" />
          </feComponentTransfer>
        </filter>

        {/* Comic: minder stappen + fellere kleuren */}
        <filter id="vb-comic" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="0.5" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1.4 0 0 0 -0.1  0 1.4 0 0 -0.1  0 0 1.4 0 -0.1  0 0 0 1 0"
            result="s"
          />
          <feComponentTransfer in="s">
            <feFuncR type="discrete" tableValues="0 0.35 0.7 1" />
            <feFuncG type="discrete" tableValues="0 0.35 0.7 1" />
            <feFuncB type="discrete" tableValues="0 0.35 0.7 1" />
          </feComponentTransfer>
        </filter>

        {/* Olieverf: zachte vlakken + stappen */}
        <filter id="vb-oil" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feComponentTransfer in="b">
            <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          </feComponentTransfer>
        </filter>

        {/* Inkt: grafisch hoog-contrast zwart/wit */}
        <filter id="vb-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
            result="g"
          />
          <feComponentTransfer in="g">
            <feFuncR type="discrete" tableValues="0 0 1 1" />
            <feFuncG type="discrete" tableValues="0 0 1 1" />
            <feFuncB type="discrete" tableValues="0 0 1 1" />
          </feComponentTransfer>
        </filter>

        {/* Duotone roze */}
        <filter id="vb-duoPink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
            result="g"
          />
          <feComponentTransfer in="g">
            <feFuncR type="table" tableValues="0.10 1.0" />
            <feFuncG type="table" tableValues="0.04 0.37" />
            <feFuncB type="table" tableValues="0.18 0.64" />
          </feComponentTransfer>
        </filter>

        {/* Duotone cyaan */}
        <filter id="vb-duoCyan" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
            result="g"
          />
          <feComponentTransfer in="g">
            <feFuncR type="table" tableValues="0.02 0.27" />
            <feFuncG type="table" tableValues="0.07 0.88" />
            <feFuncB type="table" tableValues="0.12 1.0" />
          </feComponentTransfer>
        </filter>

        {/* Duotone goud/noir */}
        <filter id="vb-duoGold" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
            result="g"
          />
          <feComponentTransfer in="g">
            <feFuncR type="table" tableValues="0 1.0" />
            <feFuncG type="table" tableValues="0 0.82" />
            <feFuncB type="table" tableValues="0 0.46" />
          </feComponentTransfer>
        </filter>

        {/* Glitch: bewegende horizontale vervorming */}
        <filter id="vb-glitch" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0 0.6" numOctaves="1" seed="3" result="n">
            <animate attributeName="baseFrequency" dur="0.5s" values="0 0.6;0 0.9;0 0.4;0 0.7" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Vloeibaar: zachte golfvervorming */}
        <filter id="vb-liquid" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="n">
            <animate attributeName="seed" from="0" to="60" dur="7s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Scan-warp: rustige verticale vervorming voor het scan-filter */}
        <filter id="vb-scanwarp" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.002 0.04" numOctaves="1" seed="11" result="n">
            <animate attributeName="seed" from="0" to="40" dur="4s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

// ===========================================================================
//  2) SCAN-OVERLAY — een scanlijn die over je heen gaat
// ===========================================================================
export function ScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 right-0 h-[8%]"
        style={{
          animation: "vb-scanline 2.2s linear infinite",
          background: "linear-gradient(to bottom, transparent, rgba(0,255,170,0.0) 30%, rgba(0,255,170,0.55) 50%, rgba(0,255,170,0.0) 70%, transparent)",
          boxShadow: "0 0 24px 6px rgba(0,255,170,0.45)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "repeating-linear-gradient(0deg, rgba(0,255,170,0.06) 0 2px, transparent 2px 4px)" }}
      />
    </div>
  );
}

// ===========================================================================
//  3) SPEL-OVERLAY — balk beweegt heen en weer, tik op het juiste moment
// ===========================================================================
export function GameOverlay() {
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const targetRef = useRef(0.5);
  const [pos, setPos] = useState(0);
  const [target, setTarget] = useState(0.5);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<{ ok: boolean; txt: string } | null>(null);

  // Balk heen en weer laten bewegen
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = 0.85; // baan per seconde
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let p = posRef.current + dirRef.current * speed * dt;
      if (p > 1) {
        p = 1;
        dirRef.current = -1;
      } else if (p < 0) {
        p = 0;
        dirRef.current = 1;
      }
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

  // Spatiebalk = tikken
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        tik();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tik]);

  return (
    <div className="absolute inset-x-0 bottom-0 p-4">
      {/* Score */}
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="rounded-full bg-black/60 px-3 py-1 backdrop-blur">⭐ {score}</span>
        {streak > 1 && <span className="rounded-full bg-pink-500/80 px-3 py-1">🔥 {streak}× streak</span>}
      </div>

      {/* De baan */}
      <div className="relative h-6 w-full rounded-full bg-black/50 backdrop-blur">
        {/* Doelzone */}
        <div
          className="absolute top-0 h-full rounded-full bg-emerald-400/40 ring-2 ring-emerald-300"
          style={{ left: `${(target - 0.06) * 100}%`, width: "12%" }}
        />
        {/* Bewegende marker */}
        <div
          className="absolute top-1/2 h-8 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
          style={{ left: `${pos * 100}%` }}
        />
      </div>

      {/* Feedback + knop */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`text-lg font-extrabold ${flash ? (flash.ok ? "text-emerald-400" : "text-red-400") : "text-transparent"}`}>
          {flash?.txt ?? "·"}
        </span>
        <button
          onClick={tik}
          className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-3 text-lg font-extrabold shadow-lg shadow-pink-500/30 transition-transform active:scale-90"
        >
          TIK! (of spatie)
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
//  4) ACCESSOIRES als nette SVG-tekeningen (i.p.v. emoji)
// ===========================================================================
export function AccessoryArt({ name }: { name: string }) {
  const common = { style: { width: "100%", height: "auto", display: "block", overflow: "visible" as const } };
  switch (name) {
    case "zonnebril":
      return (
        <svg viewBox="0 0 200 80" {...common}>
          <g fill="#0a0a0a" stroke="#000" strokeWidth="3">
            <rect x="6" y="14" width="78" height="52" rx="22" />
            <rect x="116" y="14" width="78" height="52" rx="22" />
          </g>
          <path d="M84 30 q16 -12 32 0" fill="none" stroke="#0a0a0a" strokeWidth="8" strokeLinecap="round" />
          <rect x="14" y="20" width="30" height="14" rx="7" fill="rgba(255,255,255,0.25)" />
          <rect x="124" y="20" width="30" height="14" rx="7" fill="rgba(255,255,255,0.25)" />
        </svg>
      );
    case "kroon":
      return (
        <svg viewBox="0 0 200 120" {...common}>
          <path d="M20 100 L20 50 L60 80 L100 30 L140 80 L180 50 L180 100 Z" fill="#ffd23f" stroke="#e0a500" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="20" cy="46" r="9" fill="#ff4d6d" />
          <circle cx="100" cy="26" r="10" fill="#4dd2ff" />
          <circle cx="180" cy="46" r="9" fill="#ff4d6d" />
          <rect x="20" y="98" width="160" height="14" rx="6" fill="#ffb703" />
        </svg>
      );
    case "snor":
      return (
        <svg viewBox="0 0 220 80" {...common}>
          <path
            d="M110 30 C95 8 70 6 45 20 C25 31 8 30 4 24 C18 58 55 66 88 46 C98 40 104 38 110 38 C116 38 122 40 132 46 C165 66 202 58 216 24 C212 30 195 31 175 20 C150 6 125 8 110 30 Z"
            fill="#3a2a1a"
          />
        </svg>
      );
    case "feestmuts":
      return (
        <svg viewBox="0 0 120 140" {...common}>
          <path d="M60 6 L96 110 L24 110 Z" fill="#ff4d9d" stroke="#c9184a" strokeWidth="3" />
          <path d="M24 110 q36 -18 72 0 q-36 18 -72 0Z" fill="#ffd23f" />
          <circle cx="60" cy="6" r="9" fill="#4dd2ff" />
          <circle cx="46" cy="50" r="5" fill="#fff" />
          <circle cx="72" cy="74" r="5" fill="#fff" />
        </svg>
      );
    default:
      return null;
  }
}
