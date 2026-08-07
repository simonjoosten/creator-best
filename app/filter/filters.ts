// ===========================================================================
//  Alle filters van VideoBest 🎬  — Safari-proof (alleen technieken die op
//  een live camera werken: standaard CSS-filters + gekleurde lagen + animaties)
//   - css        : standaard CSS-filter (saturate, contrast, hue-rotate…)
//   - vid        : animatie-klasse op de video (vb-glitch, vb-wobble)
//   - overlay    : een gekleurde laag eroverheen (wash/gradient/duotone/vignet…)
//   - props      : stickers (emoji of SVG-tekening, evt. gezicht-volgend)
//   - particles  : rondvliegende deeltjes (sneeuw, hartjes…)
//   - special    : een mini-game of scan-effect
// ===========================================================================

export type Overlay = {
  kind: "wash" | "linear" | "radial" | "vignette" | "scanlines" | "duotone";
  colors?: string[];
  stops?: number[];
  angle?: number;
  blend?: string;
  opacity?: number;
  lineColor?: string;
  lineGap?: number;
};

export type Prop = {
  emoji: string;
  x: number;
  y: number;
  size: number;
  rot?: number;
  art?: string;
  anchor?: "eyes" | "head" | "nose" | "mouth";
  lift?: number;
};

export type Particle = {
  emoji: string;
  count: number;
  speed: number;
  size: number;
  sway?: number;
  blend?: string;
};

// Camera-schermpje (record-stip, timecode, dradenkruis, VHS-ruis…).
// Zowel live (DOM) als in de opname (canvas) getekend uit dezelfde data.
export type Hud = {
  accent?: string;      // hoofdkleur van de UI (standaard wit)
  mono?: boolean;       // digitale mono-letters
  rec?: boolean;        // knipperende REC ●
  recLabel?: string;    // tekst naast de stip (standaard "REC")
  timecode?: boolean;   // lopende teller 0:00:00
  date?: boolean;       // datum/tijd-stempel onderin
  dateText?: string;    // vaste tekst i.p.v. tijd (bv "▶ PLAY")
  battery?: boolean;    // batterij-icoon rechtsboven
  crosshair?: boolean;  // dradenkruis in het midden
  brackets?: boolean;   // focus-haakjes rond het midden
  corners?: boolean;    // hoek-haakjes in de schermhoeken
  cinemaBars?: boolean; // zwarte filmbalken boven + onder
  noiseBand?: boolean;  // tracking-ruis balk onderaan (VHS)
  circleMask?: boolean; // verrekijker-masker (ronde rand)
  countdown?: boolean;  // film-aftelling 3-2-1
  horizon?: boolean;    // horizon-lijn (drone)
  topLabel?: string;    // tekst linksboven (bv "CAM 03", "● LIVE")
  info?: string;        // tekst onderin (bv "ALT 120m", "f/1.8")
};

export type Filter = {
  id: string;
  naam: string;
  emoji: string;
  cat: string;
  css?: string;
  vid?: string;
  overlay?: Overlay;
  props?: Prop[];
  particles?: Particle;
  special?: string;
  hud?: Hud;
  swatch: string;
};

// Bouwhulpjes ---------------------------------------------------------------
const wash = (color: string, blend = "soft-light", opacity = 1): Overlay => ({ kind: "wash", colors: [color], blend, opacity });
const lin = (angle: number, colors: string[], blend = "soft-light", opacity = 1): Overlay => ({ kind: "linear", angle, colors, blend, opacity });
const vignette = (opacity = 0.7): Overlay => ({ kind: "vignette", opacity });
const scan = (lineColor = "rgba(0,0,0,0.35)", lineGap = 3, opacity = 0.6): Overlay => ({ kind: "scanlines", lineColor, lineGap, opacity });
const duo = (dark: string, light: string, opacity = 1): Overlay => ({ kind: "duotone", colors: [dark, light], opacity });

export const CATEGORIES = ["Kleuren", "Camera", "Stijl", "Effecten", "Glitch", "Achtergrond", "Grappig", "Spel"];

export const FILTERS: Filter[] = [
  { id: "geen", naam: "Origineel", emoji: "🚫", cat: "Kleuren", swatch: "#3f3f46" },

  // ---- KLEUREN -------------------------------------------------------------
  { id: "warm", naam: "Warm", emoji: "🔥", cat: "Kleuren", css: "saturate(1.3) contrast(1.05)", overlay: wash("#ff8a3d", "soft-light", 0.55), swatch: "linear-gradient(135deg,#ff9a3d,#ff5e62)" },
  { id: "koud", naam: "Koel", emoji: "🧊", cat: "Kleuren", css: "saturate(1.1) brightness(1.02)", overlay: wash("#3da5ff", "soft-light", 0.5), swatch: "linear-gradient(135deg,#36d1ff,#5b6cff)" },
  { id: "zw", naam: "Zwart-wit", emoji: "⚫", cat: "Kleuren", css: "grayscale(1) contrast(1.1)", swatch: "linear-gradient(135deg,#fff,#000)" },
  { id: "contrast", naam: "Hoog contrast", emoji: "🌗", cat: "Kleuren", css: "contrast(1.5) saturate(1.2)", swatch: "linear-gradient(135deg,#fff,#222)" },
  { id: "pastel", naam: "Pastel", emoji: "🍬", cat: "Kleuren", css: "saturate(0.8) brightness(1.08)", overlay: wash("#ffd1ec", "soft-light", 0.6), swatch: "linear-gradient(135deg,#ffd1ec,#c9f0ff)" },
  { id: "neon", naam: "Neon", emoji: "💜", cat: "Kleuren", css: "saturate(1.8) contrast(1.1)", overlay: wash("#ff00d4", "screen", 0.35), swatch: "linear-gradient(135deg,#ff00d4,#00e0ff)" },
  { id: "goud", naam: "Goud", emoji: "🥇", cat: "Kleuren", css: "sepia(0.5) saturate(1.4)", overlay: wash("#ffbf3d", "soft-light", 0.5), swatch: "linear-gradient(135deg,#ffe259,#ffa751)" },
  { id: "roze", naam: "Roze droom", emoji: "🌸", cat: "Kleuren", css: "saturate(1.1)", overlay: wash("#ff5fa2", "soft-light", 0.55), swatch: "linear-gradient(135deg,#ff9ac9,#ff5fa2)" },
  { id: "oceaan", naam: "Oceaan", emoji: "🌊", cat: "Kleuren", css: "saturate(1.2)", overlay: wash("#00b4d8", "soft-light", 0.55), swatch: "linear-gradient(135deg,#00d2ff,#0077b6)" },
  { id: "zonsondergang", naam: "Zonsondergang", emoji: "🌅", cat: "Kleuren", css: "saturate(1.25) contrast(1.05)", overlay: lin(20, ["#ff512f", "#dd2476"], "soft-light", 0.6), swatch: "linear-gradient(135deg,#ff512f,#dd2476)" },
  { id: "paars", naam: "Paarse mist", emoji: "🔮", cat: "Kleuren", css: "saturate(1.2)", overlay: wash("#8a3dff", "soft-light", 0.5), swatch: "linear-gradient(135deg,#b06bff,#6a11cb)" },
  { id: "limoen", naam: "Limoen", emoji: "🍏", cat: "Kleuren", css: "saturate(1.3)", overlay: wash("#9bff3d", "soft-light", 0.45), swatch: "linear-gradient(135deg,#a8ff78,#56ab2f)" },
  { id: "koraal", naam: "Koraal", emoji: "🪸", cat: "Kleuren", css: "saturate(1.2)", overlay: wash("#ff6f61", "soft-light", 0.5), swatch: "linear-gradient(135deg,#ff9966,#ff5e62)" },
  { id: "ijs", naam: "IJsblauw", emoji: "❄️", cat: "Kleuren", css: "brightness(1.05) saturate(0.9)", overlay: wash("#a9e7ff", "screen", 0.3), swatch: "linear-gradient(135deg,#e0f7ff,#7ad7ff)" },
  { id: "negatief", naam: "Negatief", emoji: "🔄", cat: "Kleuren", css: "invert(1) hue-rotate(180deg)", swatch: "linear-gradient(135deg,#00ffe1,#ff009d)" },
  { id: "infrarood", naam: "Infrarood", emoji: "🛰️", cat: "Kleuren", css: "hue-rotate(200deg) saturate(2)", overlay: wash("#ff2bd6", "overlay", 0.4), swatch: "linear-gradient(135deg,#f00,#0ff)" },
  { id: "lavendel", naam: "Lavendel", emoji: "💐", cat: "Kleuren", css: "saturate(1.05) brightness(1.05)", overlay: wash("#b39dff", "soft-light", 0.5), swatch: "linear-gradient(135deg,#c3a0ff,#8e7bef)" },
  { id: "sepia", naam: "Sepia diep", emoji: "📜", cat: "Kleuren", css: "sepia(0.9) contrast(1.05)", swatch: "linear-gradient(135deg,#d3a37a,#7a4a25)" },
  { id: "regenboog", naam: "Regenboog", emoji: "🌈", cat: "Kleuren", css: "saturate(1.4)", overlay: lin(60, ["#ff0000", "#ffee00", "#00ff66", "#00d4ff", "#b400ff"], "overlay", 0.4), swatch: "linear-gradient(135deg,#ff0000,#ffee00,#00ff66,#00d4ff,#b400ff)" },
  { id: "munt", naam: "Muntgroen", emoji: "🌿", cat: "Kleuren", css: "saturate(1.2) brightness(1.05)", overlay: wash("#3dffb0", "soft-light", 0.45), swatch: "linear-gradient(135deg,#a8ffce,#3dffb0)" },
  { id: "perzik", naam: "Perzik", emoji: "🍑", cat: "Kleuren", css: "saturate(1.1) brightness(1.05)", overlay: wash("#ffb38a", "soft-light", 0.5), swatch: "linear-gradient(135deg,#ffd3a5,#ff9a8b)" },
  { id: "cyberpaars", naam: "Cyberpaars", emoji: "🟣", cat: "Kleuren", css: "saturate(1.6) contrast(1.1)", overlay: lin(135, ["#ff00cc", "#3333ff"], "screen", 0.4), swatch: "linear-gradient(135deg,#ff00cc,#3333ff)" },

  // ---- STIJL ---------------------------------------------------------------
  { id: "noir", naam: "Film noir", emoji: "🎩", cat: "Stijl", css: "grayscale(1) contrast(1.4) brightness(0.95)", overlay: vignette(0.75), swatch: "linear-gradient(135deg,#9a9a9a,#000)" },
  { id: "oudfilm", naam: "Oude film", emoji: "🎞️", cat: "Stijl", css: "sepia(0.6) contrast(1.1) brightness(0.95)", overlay: scan("rgba(0,0,0,0.3)", 3, 0.5), swatch: "linear-gradient(135deg,#caa472,#3a2a16)" },
  { id: "cinematic", naam: "Cinematic", emoji: "🎬", cat: "Stijl", css: "contrast(1.15) saturate(1.1)", overlay: lin(90, ["#00263a", "#ff7a3c"], "soft-light", 0.5), swatch: "linear-gradient(135deg,#0b6e8f,#ff7a3c)" },
  { id: "droom", naam: "Dromerig", emoji: "☁️", cat: "Stijl", css: "blur(1px) brightness(1.1) saturate(1.1)", overlay: wash("#ffd6f0", "screen", 0.3), swatch: "linear-gradient(135deg,#fdeff9,#ec77ab)" },
  { id: "polaroid", naam: "Polaroid", emoji: "📷", cat: "Stijl", css: "sepia(0.25) saturate(1.1) brightness(1.05) contrast(0.95)", overlay: wash("#fff2cc", "soft-light", 0.4), swatch: "linear-gradient(135deg,#fff8e7,#d8c08a)" },
  { id: "cartoon", naam: "Cartoon", emoji: "🖍️", cat: "Stijl", css: "contrast(1.7) saturate(1.9) brightness(1.05)", swatch: "linear-gradient(135deg,#ffd93d,#ff6f91)" },
  { id: "strip", naam: "Strip / comic", emoji: "💢", cat: "Stijl", css: "contrast(2.2) saturate(2.2) brightness(1.03)", swatch: "linear-gradient(135deg,#ff006e,#ffbe0b)" },
  { id: "olieverf", naam: "Olieverf", emoji: "🖌️", cat: "Stijl", css: "blur(1.1px) contrast(1.4) saturate(1.6)", swatch: "linear-gradient(135deg,#3a86ff,#ff6f61)" },
  { id: "inkt", naam: "Inkt", emoji: "🖊️", cat: "Stijl", css: "grayscale(1) contrast(2.6) brightness(1.15)", swatch: "linear-gradient(135deg,#fff,#000)" },
  { id: "aquarel", naam: "Aquarel", emoji: "🎨", cat: "Stijl", css: "saturate(1.3) brightness(1.08) blur(0.5px)", overlay: wash("#a0e9ff", "screen", 0.25), swatch: "linear-gradient(135deg,#a0e9ff,#ffd1dc)" },
  { id: "retro80", naam: "Retro 80s", emoji: "🕹️", cat: "Stijl", css: "saturate(1.6) contrast(1.1)", overlay: lin(45, ["#f72585", "#4361ee"], "screen", 0.4), swatch: "linear-gradient(135deg,#f72585,#4361ee)" },
  { id: "goudenuur", naam: "Gouden uur", emoji: "🌇", cat: "Stijl", css: "sepia(0.3) saturate(1.3) brightness(1.05)", overlay: lin(30, ["#ffcf6e", "#ff7e3d"], "soft-light", 0.55), swatch: "linear-gradient(135deg,#ffcf6e,#ff7e3d)" },
  { id: "donker", naam: "Donker mysterie", emoji: "🌑", cat: "Stijl", css: "brightness(0.8) contrast(1.2) saturate(0.9)", overlay: vignette(0.85), swatch: "linear-gradient(135deg,#3a3a4a,#000)" },
  { id: "kauwgom", naam: "Kauwgom", emoji: "🫧", cat: "Stijl", css: "saturate(1.4) brightness(1.05)", overlay: lin(135, ["#ff8ad8", "#8ad4ff"], "screen", 0.45), swatch: "linear-gradient(135deg,#ff8ad8,#8ad4ff)" },
  { id: "duoroze", naam: "Duotone roze", emoji: "🩷", cat: "Stijl", css: "grayscale(1) contrast(1.15)", overlay: duo("#1a0b2e", "#ff5fa2"), swatch: "linear-gradient(135deg,#1a0b2e,#ff5fa2)" },
  { id: "duocyaan", naam: "Duotone cyaan", emoji: "🩵", cat: "Stijl", css: "grayscale(1) contrast(1.15)", overlay: duo("#04111f", "#46e0ff"), swatch: "linear-gradient(135deg,#04111f,#46e0ff)" },
  { id: "duogoud", naam: "Duotone goud", emoji: "🟡", cat: "Stijl", css: "grayscale(1) contrast(1.15)", overlay: duo("#0a0a0a", "#ffd277"), swatch: "linear-gradient(135deg,#000,#ffd277)" },
  { id: "duogroen", naam: "Duotone gif", emoji: "🟢", cat: "Stijl", css: "grayscale(1) contrast(1.2)", overlay: duo("#04140a", "#6dff7a"), swatch: "linear-gradient(135deg,#04140a,#6dff7a)" },
  { id: "helder", naam: "Helder & fris", emoji: "✨", cat: "Stijl", css: "brightness(1.1) saturate(1.3) contrast(1.05)", swatch: "linear-gradient(135deg,#fffff0,#9af0ff)" },

  // ---- EFFECTEN ------------------------------------------------------------
  { id: "blur", naam: "Wazige droom", emoji: "😵‍💫", cat: "Effecten", css: "blur(2px) brightness(1.05)", swatch: "linear-gradient(135deg,#cfd9ff,#9aa7ff)" },
  { id: "vignet", naam: "Vignet", emoji: "🕳️", cat: "Effecten", css: "contrast(1.05)", overlay: vignette(0.8), swatch: "radial-gradient(circle,#888,#000)" },
  { id: "scanlines", naam: "Scanlijnen", emoji: "📺", cat: "Effecten", css: "saturate(1.1)", overlay: scan("rgba(0,0,0,0.4)", 3, 0.7), swatch: "repeating-linear-gradient(0deg,#000 0 2px,#444 2px 4px)" },
  { id: "gloed", naam: "Gloed", emoji: "🌟", cat: "Effecten", css: "brightness(1.15) saturate(1.3)", overlay: wash("#fff4c2", "screen", 0.3), swatch: "radial-gradient(circle,#fff7c2,#ff9d00)" },
  { id: "thermisch", naam: "Warmtebeeld", emoji: "🌡️", cat: "Effecten", css: "saturate(2.5) hue-rotate(300deg) contrast(1.3)", overlay: lin(0, ["#000033", "#ff0000", "#ffff00"], "screen", 0.5), swatch: "linear-gradient(135deg,#000033,#ff0000,#ffff00)" },
  { id: "rontgen", naam: "Röntgen", emoji: "🦴", cat: "Effecten", css: "invert(1) contrast(1.3) brightness(1.1)", overlay: wash("#0a3d62", "multiply", 0.5), swatch: "linear-gradient(135deg,#dfe9f3,#0a3d62)" },
  { id: "spook", naam: "Spookachtig", emoji: "👻", cat: "Effecten", css: "brightness(1.1) contrast(0.9) saturate(0.7)", overlay: wash("#bfffe0", "screen", 0.25), swatch: "linear-gradient(135deg,#dffff0,#7fffd4)" },
  { id: "onderwater", naam: "Onderwater", emoji: "🐠", cat: "Effecten", css: "blur(0.6px) saturate(1.3) hue-rotate(15deg)", vid: "vb-wobble", overlay: wash("#0096c7", "soft-light", 0.55), swatch: "linear-gradient(135deg,#48cae4,#0077b6)" },
  { id: "mist", naam: "Mist", emoji: "🌁", cat: "Effecten", css: "contrast(0.85) brightness(1.1)", overlay: wash("#ffffff", "screen", 0.35), swatch: "linear-gradient(135deg,#f0f0f0,#c0c0c0)" },
  { id: "wiebel", naam: "Wiebelwereld", emoji: "🌀", cat: "Effecten", css: "saturate(1.2)", vid: "vb-wobble", swatch: "linear-gradient(135deg,#00c6ff,#0072ff)" },
  { id: "vuur", naam: "Vuurzee", emoji: "🔥", cat: "Effecten", css: "saturate(1.5) contrast(1.1)", overlay: lin(0, ["#3a0000", "#ff4500"], "screen", 0.5), particles: { emoji: "🔥", count: 18, speed: -0.25, size: 0.05, sway: 0.04, blend: "screen" }, swatch: "linear-gradient(135deg,#ff0000,#ffae00)" },
  { id: "disco", naam: "Discolicht", emoji: "🪩", cat: "Effecten", css: "saturate(1.6)", overlay: lin(90, ["#ff00d4", "#00e0ff", "#ffee00"], "overlay", 0.4), particles: { emoji: "✨", count: 20, speed: 0.15, size: 0.04, sway: 0.06, blend: "screen" }, swatch: "linear-gradient(135deg,#ff00d4,#00e0ff,#ffee00)" },
  { id: "sterrenstof", naam: "Sterrenstof", emoji: "🌌", cat: "Effecten", css: "brightness(1.05) saturate(1.2)", overlay: wash("#1a0a3d", "soft-light", 0.4), particles: { emoji: "⭐", count: 26, speed: 0.05, size: 0.025, sway: 0.02, blend: "screen" }, swatch: "linear-gradient(135deg,#2b1055,#7597de)" },

  // ---- GLITCH (eigen categorie!) ------------------------------------------
  { id: "glitch", naam: "Glitch klassiek", emoji: "📛", cat: "Glitch", css: "saturate(1.5) contrast(1.2)", vid: "vb-glitch", overlay: scan("rgba(0,255,255,0.18)", 2, 0.5), swatch: "linear-gradient(135deg,#00fff0,#ff003c)" },
  { id: "glitchrgb", naam: "RGB-split", emoji: "🟥", cat: "Glitch", css: "saturate(1.7) contrast(1.15)", vid: "vb-glitch", overlay: lin(90, ["#ff0033", "#00ffe1"], "screen", 0.35), swatch: "linear-gradient(135deg,#ff0033,#00ffe1)" },
  { id: "datamosh", naam: "Datamosh", emoji: "🧩", cat: "Glitch", css: "saturate(2) contrast(1.4) hue-rotate(20deg)", vid: "vb-glitch", overlay: scan("rgba(255,0,200,0.2)", 4, 0.5), swatch: "linear-gradient(135deg,#7b2ff7,#00ffa3)" },
  { id: "vhs", naam: "VHS tape", emoji: "📼", cat: "Glitch", css: "saturate(1.4) contrast(1.1)", overlay: scan("rgba(255,0,200,0.18)", 2, 0.7), swatch: "linear-gradient(135deg,#00eaff,#ff00c8)" },
  { id: "neonglitch", naam: "Neon glitch", emoji: "⚡", cat: "Glitch", css: "saturate(2) contrast(1.2)", vid: "vb-glitch", overlay: wash("#ff00d4", "screen", 0.3), swatch: "linear-gradient(135deg,#ff00d4,#00ffd0)" },
  { id: "kapot", naam: "Kapot scherm", emoji: "💥", cat: "Glitch", css: "contrast(1.5) saturate(1.3)", vid: "vb-glitch", overlay: scan("rgba(0,0,0,0.4)", 5, 0.5), swatch: "linear-gradient(135deg,#222,#00fff0)" },
  { id: "hologram", naam: "Hologram", emoji: "🛸", cat: "Glitch", css: "saturate(1.6) brightness(1.1) hue-rotate(160deg)", vid: "vb-wobble", overlay: scan("rgba(0,255,200,0.2)", 3, 0.6), swatch: "linear-gradient(135deg,#00ffd0,#0066ff)" },

  // ---- ACHTERGROND (deeltjes) ---------------------------------------------
  { id: "sneeuw", naam: "Sneeuwbui", emoji: "❄️", cat: "Achtergrond", css: "brightness(1.05) saturate(0.95)", overlay: wash("#cfeaff", "screen", 0.2), particles: { emoji: "❄️", count: 28, speed: 0.2, size: 0.035, sway: 0.05 }, swatch: "linear-gradient(135deg,#e0f7ff,#9bd0ff)" },
  { id: "hartjes", naam: "Hartjesregen", emoji: "❤️", cat: "Achtergrond", css: "saturate(1.2)", overlay: wash("#ff8ab5", "soft-light", 0.3), particles: { emoji: "❤️", count: 22, speed: 0.22, size: 0.045, sway: 0.06 }, swatch: "linear-gradient(135deg,#ff5f8f,#ffb3c6)" },
  { id: "confetti", naam: "Confetti", emoji: "🎉", cat: "Achtergrond", css: "saturate(1.3)", particles: { emoji: "🎊", count: 26, speed: 0.3, size: 0.04, sway: 0.08 }, swatch: "linear-gradient(135deg,#ff0,#0f0,#0ff,#f0f)" },
  { id: "matrix", naam: "Matrix", emoji: "🟩", cat: "Achtergrond", css: "brightness(1.05) saturate(1.2) hue-rotate(80deg)", overlay: wash("#00ff66", "soft-light", 0.3), particles: { emoji: "🟢", count: 24, speed: 0.4, size: 0.03, blend: "screen" }, swatch: "linear-gradient(135deg,#001a00,#00ff66)" },
  { id: "sterren", naam: "Sterrenhemel", emoji: "✨", cat: "Achtergrond", css: "brightness(1.02)", overlay: wash("#0a0a2a", "soft-light", 0.35), particles: { emoji: "✨", count: 30, speed: 0.06, size: 0.03, sway: 0.02, blend: "screen" }, swatch: "linear-gradient(135deg,#0a0a2a,#fff)" },
  { id: "bubbels", naam: "Bubbels", emoji: "🫧", cat: "Achtergrond", css: "saturate(1.1)", overlay: wash("#a0e9ff", "screen", 0.2), particles: { emoji: "🫧", count: 20, speed: -0.18, size: 0.05, sway: 0.05 }, swatch: "linear-gradient(135deg,#caf0ff,#48cae4)" },
  { id: "bladeren", naam: "Herfstbladeren", emoji: "🍂", cat: "Achtergrond", css: "sepia(0.2) saturate(1.3)", particles: { emoji: "🍁", count: 20, speed: 0.18, size: 0.05, sway: 0.1 }, swatch: "linear-gradient(135deg,#ff9a3d,#a8421a)" },
  { id: "vuurwerk", naam: "Vuurwerk", emoji: "🎆", cat: "Achtergrond", css: "saturate(1.4) contrast(1.05)", overlay: wash("#1a0033", "soft-light", 0.3), particles: { emoji: "🎆", count: 14, speed: -0.12, size: 0.07, sway: 0.03, blend: "screen" }, swatch: "linear-gradient(135deg,#1a0033,#ff00aa,#ffee00)" },
  { id: "geld", naam: "Geldregen", emoji: "💸", cat: "Achtergrond", css: "saturate(1.2) brightness(1.05)", particles: { emoji: "💵", count: 18, speed: 0.25, size: 0.05, sway: 0.09 }, swatch: "linear-gradient(135deg,#a8ff78,#56ab2f)" },
  { id: "bloemen", naam: "Bloemenregen", emoji: "🌸", cat: "Achtergrond", css: "saturate(1.2) brightness(1.05)", overlay: wash("#ffd1ec", "soft-light", 0.3), particles: { emoji: "🌸", count: 22, speed: 0.18, size: 0.045, sway: 0.08 }, swatch: "linear-gradient(135deg,#ffd1ec,#ff8ad8)" },
  { id: "vlinders", naam: "Vlinders", emoji: "🦋", cat: "Achtergrond", css: "saturate(1.3)", particles: { emoji: "🦋", count: 16, speed: -0.1, size: 0.05, sway: 0.14 }, swatch: "linear-gradient(135deg,#43c6ac,#191654)" },
  { id: "regen", naam: "Regenbui", emoji: "🌧️", cat: "Achtergrond", css: "brightness(0.95) saturate(1.05)", overlay: wash("#5a7d99", "soft-light", 0.35), particles: { emoji: "💧", count: 30, speed: 0.5, size: 0.03 }, swatch: "linear-gradient(135deg,#536976,#292e49)" },
  { id: "pizza", naam: "Pizzaregen", emoji: "🍕", cat: "Achtergrond", css: "saturate(1.2)", particles: { emoji: "🍕", count: 16, speed: 0.22, size: 0.06, sway: 0.1 }, swatch: "linear-gradient(135deg,#ffb347,#ffcc33)" },
  { id: "kikker", naam: "Kikkerregen", emoji: "🐸", cat: "Achtergrond", css: "saturate(1.3)", particles: { emoji: "🐸", count: 14, speed: 0.2, size: 0.06, sway: 0.12 }, swatch: "linear-gradient(135deg,#a8ff78,#1d976c)" },
  { id: "spook2", naam: "Spokenfeest", emoji: "👻", cat: "Achtergrond", css: "brightness(1.05) saturate(0.9)", overlay: wash("#1a1a3d", "soft-light", 0.3), particles: { emoji: "👻", count: 12, speed: -0.1, size: 0.06, sway: 0.1, blend: "screen" }, swatch: "linear-gradient(135deg,#2a2a4a,#b0b0ff)" },

  // ---- GRAPPIG -------------------------------------------------------------
  { id: "zonnebril2", naam: "Coole zonnebril", emoji: "🕶️", cat: "Grappig", css: "contrast(1.05) saturate(1.15)", props: [{ emoji: "🕶️", art: "zonnebril", anchor: "eyes", x: 0.5, y: 0.43, size: 0.85 }], swatch: "linear-gradient(135deg,#111,#444)" },
  { id: "kroon2", naam: "Gouden kroon", emoji: "👑", cat: "Grappig", css: "saturate(1.2) brightness(1.05)", props: [{ emoji: "👑", art: "kroon", anchor: "head", lift: 0.4, x: 0.5, y: 0.13, size: 0.7 }], swatch: "linear-gradient(135deg,#ffe259,#ffa751)" },
  { id: "snor2", naam: "Nette snor", emoji: "🥸", cat: "Grappig", props: [{ emoji: "🥸", art: "snor", anchor: "mouth", x: 0.5, y: 0.6, size: 0.42 }], swatch: "linear-gradient(135deg,#5a4630,#2a1d10)" },
  { id: "feestmuts2", naam: "Feestmuts", emoji: "🥳", cat: "Grappig", css: "saturate(1.2)", props: [{ emoji: "🥳", art: "feestmuts", anchor: "head", lift: 0.6, x: 0.5, y: 0.12, size: 0.5 }], particles: { emoji: "🎊", count: 14, speed: 0.26, size: 0.04, sway: 0.08 }, swatch: "linear-gradient(135deg,#ff4d9d,#ffd23f)" },
  { id: "hond", naam: "Hondje", emoji: "🐶", cat: "Grappig", props: [{ emoji: "🐶", anchor: "head", lift: 0.45, x: 0.5, y: 0.18, size: 0.55 }, { emoji: "👅", anchor: "mouth", x: 0.5, y: 0.7, size: 0.3 }], swatch: "linear-gradient(135deg,#d8a26b,#8a5a2b)" },
  { id: "engel", naam: "Engeltje", emoji: "😇", cat: "Grappig", css: "brightness(1.1)", props: [{ emoji: "😇", anchor: "head", lift: 0.6, x: 0.5, y: 0.08, size: 0.45 }], overlay: wash("#fff6c2", "screen", 0.25), swatch: "linear-gradient(135deg,#fff,#ffe98a)" },
  { id: "duivel", naam: "Duiveltje", emoji: "😈", cat: "Grappig", css: "saturate(1.3)", props: [{ emoji: "😈", anchor: "head", lift: 0.45, x: 0.5, y: 0.12, size: 0.42 }], overlay: wash("#ff2b2b", "soft-light", 0.3), swatch: "linear-gradient(135deg,#8a0000,#ff2b2b)" },
  { id: "clown", naam: "Clown", emoji: "🤡", cat: "Grappig", css: "saturate(1.5)", props: [{ emoji: "🔴", anchor: "nose", x: 0.5, y: 0.55, size: 0.22 }, { emoji: "🤡", anchor: "head", lift: 0.5, x: 0.5, y: 0.1, size: 0.45 }], swatch: "linear-gradient(135deg,#ff4d4d,#ffd24d)" },
  { id: "cowboy", naam: "Cowboy", emoji: "🤠", cat: "Grappig", props: [{ emoji: "🤠", anchor: "head", lift: 0.55, x: 0.5, y: 0.1, size: 0.6 }], swatch: "linear-gradient(135deg,#d9a066,#8a5a2b)" },
  { id: "feest", naam: "Feestbeest", emoji: "🥳", cat: "Grappig", css: "saturate(1.3)", props: [{ emoji: "🥳", anchor: "head", lift: 0.5, x: 0.5, y: 0.1, size: 0.45 }], particles: { emoji: "🎉", count: 16, speed: 0.28, size: 0.04, sway: 0.08 }, swatch: "linear-gradient(135deg,#ff00aa,#ffee00)" },
  { id: "nerd", naam: "Nerd", emoji: "🤓", cat: "Grappig", props: [{ emoji: "🤓", anchor: "eyes", x: 0.5, y: 0.45, size: 0.9 }], swatch: "linear-gradient(135deg,#9ad,#456)" },
  { id: "kus", naam: "Kusjes", emoji: "💋", cat: "Grappig", css: "saturate(1.2)", props: [{ emoji: "💋", anchor: "mouth", x: 0.5, y: 0.6, size: 0.35 }], particles: { emoji: "💋", count: 12, speed: -0.14, size: 0.05, sway: 0.06 }, swatch: "linear-gradient(135deg,#ff5f8f,#c9184a)" },
  { id: "neppersoon", naam: "Nep-persoon", emoji: "🧍", cat: "Grappig", props: [{ emoji: "🕺", x: 0.82, y: 0.62, size: 0.5 }], swatch: "linear-gradient(135deg,#6a11cb,#2575fc)" },
  { id: "alien", naam: "Alien-vriend", emoji: "👽", cat: "Grappig", css: "hue-rotate(60deg) saturate(1.2)", props: [{ emoji: "👽", x: 0.82, y: 0.5, size: 0.34 }, { emoji: "🛸", x: 0.5, y: 0.1, size: 0.2 }], swatch: "linear-gradient(135deg,#00ff87,#60efff)" },
  { id: "tweeling", naam: "Nep-tweeling", emoji: "👥", cat: "Grappig", props: [{ emoji: "🧑", x: 0.16, y: 0.6, size: 0.42 }, { emoji: "🧑", x: 0.84, y: 0.6, size: 0.42 }], swatch: "linear-gradient(135deg,#11998e,#38ef7d)" },

  // ---- SPEL ----------------------------------------------------------------
  { id: "scanner", naam: "Scanner", emoji: "📡", cat: "Spel", css: "brightness(1.05) saturate(1.2) hue-rotate(70deg)", vid: "vb-wobble", special: "scan", overlay: wash("#00ffaa", "soft-light", 0.2), swatch: "linear-gradient(135deg,#001a12,#00ffaa)" },
  { id: "tikspel", naam: "Tik op tijd!", emoji: "🎯", cat: "Spel", css: "saturate(1.2)", special: "tik", swatch: "linear-gradient(135deg,#7b2ff7,#f107a3)" },
  { id: "mikspel", naam: "Mik & tik", emoji: "🎈", cat: "Spel", css: "saturate(1.2)", special: "mik", swatch: "linear-gradient(135deg,#f12711,#f5af19)" },
  { id: "snelspel", naam: "Sneltik (10s)", emoji: "⚡", cat: "Spel", css: "saturate(1.2)", special: "snel", swatch: "linear-gradient(135deg,#00c6ff,#0072ff)" },
  { id: "reactiespel", naam: "Reactietest", emoji: "🟢", cat: "Spel", css: "saturate(1.1)", special: "reactie", swatch: "linear-gradient(135deg,#11998e,#38ef7d)" },
  { id: "vangspel", naam: "Vang het!", emoji: "🧺", cat: "Spel", css: "saturate(1.2)", special: "vang", swatch: "linear-gradient(135deg,#ee0979,#ff6a00)" },
  { id: "kleurspel", naam: "Kleurtik", emoji: "🟢", cat: "Spel", css: "saturate(1.2)", special: "kleur", swatch: "linear-gradient(135deg,#00ff66,#ff0033)" },
  { id: "volgspel", naam: "Volg de stip", emoji: "🔮", cat: "Spel", css: "saturate(1.2)", special: "volg", swatch: "linear-gradient(135deg,#ff5f8f,#7b2ff7)" },

  // ---- CAMERA (echte camera-schermpjes / opname-effecten) ------------------
  { id: "cam-rec", naam: "Camcorder REC", emoji: "🔴", cat: "Camera", css: "saturate(1.15) contrast(1.05)", overlay: wash("#ffb060", "soft-light", 0.22), hud: { accent: "#ffffff", mono: true, rec: true, timecode: true, battery: true, corners: true }, swatch: "linear-gradient(135deg,#2a2a2a,#ff3b3b)" },
  { id: "cam-vhs85", naam: "VHS 1985", emoji: "📼", cat: "Camera", css: "saturate(1.4) contrast(1.08)", vid: "vb-wobble", overlay: scan("rgba(255,0,200,0.16)", 2, 0.6), hud: { accent: "#eaeaea", mono: true, dateText: "▶ PLAY", date: true, noiseBand: true, topLabel: "SP" }, swatch: "linear-gradient(135deg,#00eaff,#ff00c8)" },
  { id: "cam-super8", naam: "Super-8 (8mm)", emoji: "🎞️", cat: "Camera", css: "sepia(0.45) saturate(1.2) contrast(1.05) brightness(1.03)", vid: "vb-flicker", overlay: scan("rgba(0,0,0,0.22)", 3, 0.35), hud: { accent: "#ffd9a0", mono: true, topLabel: "8mm", corners: true }, swatch: "linear-gradient(135deg,#caa472,#3a2a16)" },
  { id: "cam-cctv", naam: "Bewaking CCTV", emoji: "📹", cat: "Camera", css: "grayscale(0.7) contrast(1.2) brightness(1.02)", overlay: vignette(0.7), hud: { accent: "#d7ffd9", mono: true, rec: true, topLabel: "CAM 03", date: true, corners: true }, swatch: "linear-gradient(135deg,#334455,#000)" },
  { id: "cam-night", naam: "Nachtzicht", emoji: "🌙", cat: "Camera", css: "brightness(1.1) saturate(1.3) hue-rotate(70deg) contrast(1.15)", overlay: wash("#00ff66", "soft-light", 0.35), hud: { accent: "#8dff8d", mono: true, crosshair: true, brackets: true, topLabel: "NIGHT VISION" }, swatch: "linear-gradient(135deg,#001a00,#00ff66)" },
  { id: "cam-count", naam: "Film-aftelling", emoji: "🎬", cat: "Camera", css: "sepia(0.3) contrast(1.1) brightness(0.98)", overlay: scan("rgba(0,0,0,0.2)", 3, 0.3), hud: { accent: "#ffffff", countdown: true, corners: true }, swatch: "linear-gradient(135deg,#111,#eee)" },
  { id: "cam-dash", naam: "Dashcam", emoji: "🚗", cat: "Camera", css: "saturate(1.1) contrast(1.05)", hud: { accent: "#ffffff", mono: true, rec: true, date: true, info: "0 km/h" }, swatch: "linear-gradient(135deg,#1f2937,#60a5fa)" },
  { id: "cam-throw", naam: "Wegwerpcamera", emoji: "📸", cat: "Camera", css: "saturate(1.25) contrast(1.1) brightness(1.05)", overlay: vignette(0.8), hud: { accent: "#ffcf6e", mono: true, dateText: "'98 JUL 14", date: true }, swatch: "linear-gradient(135deg,#ffcf6e,#7a4a25)" },
  { id: "cam-webcam", naam: "Webcam 2005", emoji: "💻", cat: "Camera", css: "saturate(0.85) contrast(0.95) brightness(1.05) blur(0.5px)", hud: { accent: "#ffffff", mono: true, topLabel: "● LIVE", date: true }, swatch: "linear-gradient(135deg,#556677,#223344)" },
  { id: "cam-drone", naam: "Drone HUD", emoji: "🚁", cat: "Camera", css: "saturate(1.2) contrast(1.05)", hud: { accent: "#9fffe0", mono: true, crosshair: true, brackets: true, horizon: true, topLabel: "● REC", info: "ALT 120m" }, swatch: "linear-gradient(135deg,#001122,#00ffd0)" },
  { id: "cam-cinema", naam: "Cinema-take", emoji: "🎦", cat: "Camera", css: "contrast(1.12) saturate(1.1)", overlay: lin(90, ["#00263a", "#ff7a3c"], "soft-light", 0.35), hud: { accent: "#ffffff", mono: true, cinemaBars: true, timecode: true, info: "SCENE 01  TAKE 01" }, swatch: "linear-gradient(135deg,#0b6e8f,#ff7a3c)" },
  { id: "cam-90s", naam: "Camcorder 90s", emoji: "🕹️", cat: "Camera", css: "saturate(1.2) contrast(1.05)", overlay: scan("rgba(0,0,0,0.12)", 3, 0.3), hud: { accent: "#7fd0ff", mono: true, rec: true, date: true }, swatch: "linear-gradient(135deg,#00aaff,#003366)" },
  { id: "cam-bino", naam: "Verrekijker", emoji: "🔭", cat: "Camera", css: "contrast(1.05) saturate(1.1)", hud: { accent: "#ffffff", mono: true, circleMask: true, crosshair: true, info: "8×42" }, swatch: "linear-gradient(135deg,#111,#888)" },
  { id: "cam-gopro", naam: "Actiecam 4K", emoji: "🪖", cat: "Camera", css: "saturate(1.5) contrast(1.1) brightness(1.03)", hud: { accent: "#ffffff", mono: true, rec: true, battery: true, topLabel: "4K", corners: true }, swatch: "linear-gradient(135deg,#0066ff,#00ffff)" },
  { id: "cam-dslr", naam: "Foto-zoeker", emoji: "📷", cat: "Camera", css: "contrast(1.08) saturate(1.12)", hud: { accent: "#ffffff", mono: true, brackets: true, info: "f/1.8  1/250  ISO400", topLabel: "[ ● ]" }, swatch: "linear-gradient(135deg,#222,#bbb)" },

  // ---- KLEUREN (nieuw) -----------------------------------------------------
  { id: "mango", naam: "Mango", emoji: "🥭", cat: "Kleuren", css: "saturate(1.35) brightness(1.04)", overlay: wash("#ffb02e", "soft-light", 0.5), swatch: "linear-gradient(135deg,#ffd15c,#ff7a18)" },
  { id: "bosgroen", naam: "Bosgroen", emoji: "🌲", cat: "Kleuren", css: "saturate(1.2) contrast(1.05)", overlay: wash("#1f7a3d", "soft-light", 0.45), swatch: "linear-gradient(135deg,#3fa34d,#0b3d1e)" },
  { id: "framboos", naam: "Framboos", emoji: "🍇", cat: "Kleuren", css: "saturate(1.3)", overlay: wash("#c81d6b", "soft-light", 0.5), swatch: "linear-gradient(135deg,#ff5fa2,#8a0e46)" },
  { id: "middernacht", naam: "Middernacht", emoji: "🌌", cat: "Kleuren", css: "brightness(0.92) saturate(1.1)", overlay: wash("#1a2a6c", "soft-light", 0.55), swatch: "linear-gradient(135deg,#1a2a6c,#0b1020)" },
  { id: "karamel", naam: "Karamel", emoji: "🍮", cat: "Kleuren", css: "sepia(0.4) saturate(1.3)", overlay: wash("#c47a2c", "soft-light", 0.45), swatch: "linear-gradient(135deg,#e8a15d,#7a4a1e)" },
  { id: "aqua2", naam: "Aqua", emoji: "💧", cat: "Kleuren", css: "saturate(1.25) brightness(1.03)", overlay: wash("#12d6c4", "soft-light", 0.45), swatch: "linear-gradient(135deg,#5efce8,#0ea5a5)" },
  { id: "wijnrood", naam: "Wijnrood", emoji: "🍷", cat: "Kleuren", css: "saturate(1.25) contrast(1.08)", overlay: wash("#7b1030", "soft-light", 0.5), swatch: "linear-gradient(135deg,#b21e46,#4a0a1e)" },
  { id: "mintijs", naam: "Mint-ijs", emoji: "🍨", cat: "Kleuren", css: "brightness(1.06) saturate(1.05)", overlay: wash("#9af7d6", "screen", 0.3), swatch: "linear-gradient(135deg,#d6fff0,#7fe9c4)" },
  { id: "zonnebloem", naam: "Zonnebloem", emoji: "🌻", cat: "Kleuren", css: "saturate(1.4) brightness(1.05)", overlay: wash("#ffd21f", "soft-light", 0.45), swatch: "linear-gradient(135deg,#ffe259,#ffb302)" },
  { id: "grijszacht", naam: "Zacht grijs", emoji: "🌫️", cat: "Kleuren", css: "saturate(0.55) contrast(1.02) brightness(1.03)", swatch: "linear-gradient(135deg,#e0e0e0,#8a8a8a)" },
  { id: "terracotta", naam: "Terracotta", emoji: "🏺", cat: "Kleuren", css: "sepia(0.35) saturate(1.3)", overlay: wash("#c8613b", "soft-light", 0.45), swatch: "linear-gradient(135deg,#e08a5f,#8a3b22)" },
  { id: "elektrischblauw", naam: "Elektrisch blauw", emoji: "⚡", cat: "Kleuren", css: "saturate(1.5) contrast(1.1)", overlay: wash("#1e6bff", "screen", 0.35), swatch: "linear-gradient(135deg,#00c6ff,#0033ff)" },
  { id: "vintagewarm", naam: "Vintage warm", emoji: "📻", cat: "Kleuren", css: "sepia(0.3) saturate(1.15) contrast(1.03)", overlay: wash("#ffcf8a", "soft-light", 0.4), swatch: "linear-gradient(135deg,#e8c79a,#a9793f)" },
  { id: "koudnoir", naam: "Koud noir", emoji: "🌑", cat: "Kleuren", css: "grayscale(0.6) brightness(0.95) contrast(1.15)", overlay: wash("#2a3b55", "soft-light", 0.4), swatch: "linear-gradient(135deg,#5a6b85,#0a0f1a)" },
  { id: "bubblegum", naam: "Bubblegum", emoji: "🍬", cat: "Kleuren", css: "saturate(1.4) brightness(1.05)", overlay: lin(135, ["#ff8ad8", "#8ad4ff"], "screen", 0.4), swatch: "linear-gradient(135deg,#ff9ac9,#8ad4ff)" },

  // ---- STIJL (nieuw) -------------------------------------------------------
  { id: "anime", naam: "Anime", emoji: "🌸", cat: "Stijl", css: "saturate(1.5) contrast(1.15) brightness(1.05)", overlay: wash("#ffd6f0", "screen", 0.2), swatch: "linear-gradient(135deg,#ffd1ec,#8ad4ff)" },
  { id: "vaporwave", naam: "Vaporwave", emoji: "🌴", cat: "Stijl", css: "saturate(1.5) contrast(1.05)", overlay: lin(135, ["#ff71ce", "#01cdfe"], "screen", 0.4), swatch: "linear-gradient(135deg,#ff71ce,#01cdfe)" },
  { id: "pixelart", naam: "Pixel-art", emoji: "👾", cat: "Stijl", css: "saturate(1.5) contrast(1.35)", overlay: scan("rgba(0,0,0,0.25)", 4, 0.4), swatch: "linear-gradient(135deg,#7b2ff7,#2fd6ff)" },
  { id: "schets", naam: "Potloodschets", emoji: "✏️", cat: "Stijl", css: "grayscale(1) contrast(1.8) brightness(1.2)", swatch: "linear-gradient(135deg,#fff,#888)" },
  { id: "popart", naam: "Popart", emoji: "🎯", cat: "Stijl", css: "saturate(2.4) contrast(1.5)", overlay: lin(45, ["#ff006e", "#ffbe0b"], "overlay", 0.35), swatch: "linear-gradient(135deg,#ff006e,#ffbe0b)" },
  { id: "grunge", naam: "Grunge", emoji: "🎸", cat: "Stijl", css: "sepia(0.3) contrast(1.3) saturate(0.9) brightness(0.95)", overlay: vignette(0.7), swatch: "linear-gradient(135deg,#6b5b4a,#1a1410)" },
  { id: "korrelfilm", naam: "Filmkorrel", emoji: "🎬", cat: "Stijl", css: "sepia(0.15) contrast(1.15) saturate(1.05)", overlay: scan("rgba(0,0,0,0.1)", 2, 0.4), swatch: "linear-gradient(135deg,#cbb89a,#4a4038)" },
  { id: "y2k", naam: "Y2K", emoji: "💿", cat: "Stijl", css: "saturate(1.6) contrast(1.1) brightness(1.05)", overlay: lin(90, ["#c0c0ff", "#ffb3ec"], "screen", 0.35), swatch: "linear-gradient(135deg,#b3c6ff,#ffb3ec)" },
  { id: "cottage", naam: "Cottagecore", emoji: "🌾", cat: "Stijl", css: "sepia(0.2) saturate(1.15) brightness(1.06)", overlay: wash("#ffe6b3", "soft-light", 0.4), swatch: "linear-gradient(135deg,#f5e0b0,#b7c98a)" },
  { id: "kodak", naam: "Kodak-look", emoji: "🟨", cat: "Stijl", css: "saturate(1.25) contrast(1.08) brightness(1.02)", overlay: wash("#ffcf6e", "soft-light", 0.3), swatch: "linear-gradient(135deg,#ffcf6e,#c98a3a)" },
  { id: "fuji", naam: "Fuji-look", emoji: "🟩", cat: "Stijl", css: "saturate(1.15) contrast(1.05)", overlay: wash("#7ad0b0", "soft-light", 0.3), swatch: "linear-gradient(135deg,#a0e9c4,#3a8a6a)" },
  { id: "scifiblauw", naam: "Sci-fi blauw", emoji: "🛰️", cat: "Stijl", css: "saturate(1.2) contrast(1.1) hue-rotate(10deg)", overlay: lin(90, ["#001a3a", "#00d4ff"], "soft-light", 0.45), swatch: "linear-gradient(135deg,#001a3a,#00d4ff)" },
  { id: "western", naam: "Western", emoji: "🌵", cat: "Stijl", css: "sepia(0.6) saturate(1.2) contrast(1.1)", overlay: wash("#d98a3d", "soft-light", 0.4), swatch: "linear-gradient(135deg,#d98a3d,#5a3a1a)" },
  { id: "neonnoir", naam: "Neon noir", emoji: "🌃", cat: "Stijl", css: "contrast(1.2) saturate(1.3) brightness(0.95)", overlay: lin(120, ["#0a0033", "#ff00aa"], "screen", 0.4), swatch: "linear-gradient(135deg,#0a0033,#ff00aa)" },
  { id: "fairyglow", naam: "Fairy glow", emoji: "🧚", cat: "Stijl", css: "brightness(1.12) saturate(1.25) blur(0.4px)", overlay: wash("#ffe6ff", "screen", 0.3), particles: { emoji: "✨", count: 16, speed: 0.06, size: 0.025, sway: 0.03, blend: "screen" }, swatch: "linear-gradient(135deg,#ffe6ff,#c9a0ff)" },

  // ---- EFFECTEN (nieuw) ----------------------------------------------------
  { id: "bokeh", naam: "Bokeh", emoji: "⚪", cat: "Effecten", css: "brightness(1.08) saturate(1.2) blur(0.4px)", particles: { emoji: "⚪", count: 16, speed: 0.05, size: 0.08, sway: 0.03, blend: "screen" }, swatch: "radial-gradient(circle,#fff,#8899ff)" },
  { id: "lensflare", naam: "Lens-flare", emoji: "🔆", cat: "Effecten", css: "brightness(1.1) saturate(1.2)", overlay: lin(30, ["#ffffff", "#ff9d00"], "screen", 0.3), swatch: "radial-gradient(circle,#fff7c2,#ff9d00)" },
  { id: "lichtstraal", naam: "Lichtstralen", emoji: "🌤️", cat: "Effecten", css: "brightness(1.1) contrast(1.05)", overlay: lin(60, ["rgba(255,240,180,0.0)", "rgba(255,240,180,0.9)"], "screen", 0.35), swatch: "linear-gradient(135deg,#fff3b0,#ffd24d)" },
  { id: "regenlens", naam: "Regen op lens", emoji: "💦", cat: "Effecten", css: "blur(0.6px) contrast(1.05) brightness(1.03)", particles: { emoji: "💧", count: 20, speed: 0.12, size: 0.05, sway: 0.02 }, swatch: "linear-gradient(135deg,#7fb0d0,#2a4a6a)" },
  { id: "warmtegolf", naam: "Warmtegolf", emoji: "🥵", cat: "Effecten", css: "saturate(1.3) hue-rotate(-10deg)", vid: "vb-wobble", overlay: wash("#ff7a3c", "soft-light", 0.3), swatch: "linear-gradient(135deg,#ff9a3d,#ff3c00)" },
  { id: "prisma", naam: "Prisma", emoji: "🔺", cat: "Effecten", css: "saturate(1.5) hue-rotate(20deg) contrast(1.05)", overlay: lin(75, ["#ff0000", "#00ff00", "#0000ff"], "screen", 0.25), swatch: "linear-gradient(135deg,#f00,#0f0,#00f)" },
  { id: "zachtglow", naam: "Zachte glow", emoji: "🌼", cat: "Effecten", css: "brightness(1.12) saturate(1.15) blur(0.6px)", overlay: wash("#fff4c2", "screen", 0.25), swatch: "radial-gradient(circle,#fffbe0,#ffd24d)" },
  { id: "korrelruis", naam: "Korrelruis", emoji: "📷", cat: "Effecten", css: "contrast(1.1) saturate(1.05)", overlay: scan("rgba(255,255,255,0.05)", 1, 0.5), swatch: "linear-gradient(135deg,#999,#333)" },
  { id: "echo", naam: "Echo-beeld", emoji: "👣", cat: "Effecten", css: "saturate(1.3) contrast(1.05)", vid: "vb-glitch", overlay: wash("#00ffe1", "screen", 0.15), swatch: "linear-gradient(135deg,#00ffe1,#7b2ff7)" },
  { id: "sneeuwblur", naam: "Sneeuwstorm", emoji: "🌨️", cat: "Effecten", css: "brightness(1.08) contrast(0.95) blur(0.5px)", particles: { emoji: "❄️", count: 34, speed: 0.35, size: 0.03, sway: 0.06 }, swatch: "linear-gradient(135deg,#eaf6ff,#a9c9e0)" },
  { id: "oudtv", naam: "Oude TV", emoji: "📺", cat: "Effecten", css: "saturate(1.2) contrast(1.15)", overlay: scan("rgba(0,0,0,0.35)", 3, 0.6), swatch: "repeating-linear-gradient(0deg,#000 0 2px,#555 2px 4px)" },
  { id: "hittewaas", naam: "Hittewaas", emoji: "♨️", cat: "Effecten", css: "blur(0.5px) saturate(1.2)", vid: "vb-wobble", swatch: "linear-gradient(135deg,#ffd1a0,#ff8a3d)" },
  { id: "sterflits", naam: "Sterflits", emoji: "🌟", cat: "Effecten", css: "brightness(1.1) saturate(1.3)", particles: { emoji: "✨", count: 22, speed: 0.1, size: 0.04, sway: 0.04, blend: "screen" }, swatch: "radial-gradient(circle,#fff,#ffcc00)" },
  { id: "vervaagrand", naam: "Vervaagrand", emoji: "⭕", cat: "Effecten", css: "brightness(1.05) blur(0.3px)", overlay: vignette(0.6), swatch: "radial-gradient(circle,#ccc,#222)" },
  { id: "dubbelzicht", naam: "Dubbelzicht", emoji: "😵", cat: "Effecten", css: "saturate(1.4) contrast(1.1)", vid: "vb-glitch", overlay: lin(90, ["#ff0033", "#00ffe1"], "screen", 0.25), swatch: "linear-gradient(135deg,#ff0033,#00ffe1)" },

  // ---- GLITCH (nieuw) ------------------------------------------------------
  { id: "signaal", naam: "Signaalstoring", emoji: "📶", cat: "Glitch", css: "saturate(1.5) contrast(1.2)", vid: "vb-glitch", overlay: scan("rgba(255,255,255,0.15)", 2, 0.6), swatch: "linear-gradient(135deg,#00fff0,#ff003c)" },
  { id: "pixelsort", naam: "Pixel-sort", emoji: "🧬", cat: "Glitch", css: "saturate(1.8) contrast(1.3)", vid: "vb-glitch", overlay: lin(0, ["#ff00cc", "#00ffcc"], "screen", 0.3), swatch: "linear-gradient(135deg,#ff00cc,#00ffcc)" },
  { id: "databend", naam: "Databend", emoji: "🧩", cat: "Glitch", css: "saturate(2) contrast(1.4) hue-rotate(40deg)", vid: "vb-glitch", overlay: scan("rgba(0,255,200,0.2)", 4, 0.5), swatch: "linear-gradient(135deg,#7b2ff7,#00ffa3)" },
  { id: "tvuit", naam: "TV valt uit", emoji: "📴", cat: "Glitch", css: "contrast(1.6) brightness(1.1) saturate(0.8)", vid: "vb-glitch", overlay: scan("rgba(0,0,0,0.4)", 3, 0.6), swatch: "linear-gradient(135deg,#111,#fff)" },
  { id: "alarmrood", naam: "Rood alarm", emoji: "🚨", cat: "Glitch", css: "saturate(1.8) contrast(1.2)", vid: "vb-glitch", overlay: wash("#ff0033", "screen", 0.35), swatch: "linear-gradient(135deg,#ff0033,#330000)" },
  { id: "wormhole", naam: "Wormgat", emoji: "🕳️", cat: "Glitch", css: "saturate(1.6) hue-rotate(120deg) contrast(1.1)", vid: "vb-wobble", overlay: vignette(0.8), swatch: "radial-gradient(circle,#7b2ff7,#000)" },
  { id: "corruptjpeg", naam: "Corrupt JPEG", emoji: "🗂️", cat: "Glitch", css: "saturate(1.7) contrast(1.35)", vid: "vb-glitch", overlay: scan("rgba(255,0,120,0.2)", 6, 0.5), swatch: "linear-gradient(135deg,#ff0078,#00d0ff)" },
  { id: "trilbeeld", naam: "Trilbeeld", emoji: "📳", cat: "Glitch", css: "saturate(1.4) contrast(1.15)", vid: "vb-glitch", swatch: "linear-gradient(135deg,#00fff0,#ff9d00)" },
  { id: "scanzwaar", naam: "Zware scanlijnen", emoji: "🖥️", cat: "Glitch", css: "saturate(1.3) contrast(1.2)", overlay: scan("rgba(0,0,0,0.5)", 2, 0.8), swatch: "repeating-linear-gradient(0deg,#000 0 2px,#0ff 2px 4px)" },
  { id: "alarmgeel", naam: "Geel alarm", emoji: "⚠️", cat: "Glitch", css: "saturate(1.7) contrast(1.2)", vid: "vb-glitch", overlay: wash("#ffee00", "screen", 0.3), swatch: "linear-gradient(135deg,#ffee00,#332b00)" },
  { id: "hackgroen", naam: "Hack groen", emoji: "🟩", cat: "Glitch", css: "brightness(1.05) saturate(1.4) hue-rotate(80deg) contrast(1.2)", vid: "vb-glitch", overlay: wash("#00ff66", "screen", 0.3), swatch: "linear-gradient(135deg,#001a00,#00ff66)" },
  { id: "chroomsplit", naam: "Chroom-split", emoji: "🌈", cat: "Glitch", css: "saturate(1.9) contrast(1.15)", vid: "vb-glitch", overlay: lin(90, ["#ff0033", "#0033ff"], "screen", 0.3), swatch: "linear-gradient(135deg,#ff0033,#0033ff)" },

  // ---- ACHTERGROND (nieuw) -------------------------------------------------
  { id: "sterrenregen", naam: "Sterrenregen", emoji: "⭐", cat: "Achtergrond", css: "brightness(1.03) saturate(1.2)", overlay: wash("#0a0a2a", "soft-light", 0.3), particles: { emoji: "⭐", count: 26, speed: 0.28, size: 0.035, sway: 0.05, blend: "screen" }, swatch: "linear-gradient(135deg,#0a0a2a,#ffd24d)" },
  { id: "goudbel", naam: "Goudbellen", emoji: "🫧", cat: "Achtergrond", css: "saturate(1.2) brightness(1.04)", particles: { emoji: "🟡", count: 20, speed: -0.16, size: 0.045, sway: 0.05, blend: "screen" }, swatch: "linear-gradient(135deg,#ffe259,#ffa751)" },
  { id: "noten", naam: "Muzieknoten", emoji: "🎵", cat: "Achtergrond", css: "saturate(1.25)", particles: { emoji: "🎵", count: 18, speed: -0.14, size: 0.05, sway: 0.1 }, swatch: "linear-gradient(135deg,#a18cd1,#fbc2eb)" },
  { id: "vuurvlieg", naam: "Vuurvliegjes", emoji: "🌟", cat: "Achtergrond", css: "brightness(0.98) saturate(1.2)", overlay: wash("#0a1a0a", "soft-light", 0.35), particles: { emoji: "✨", count: 22, speed: 0.04, size: 0.02, sway: 0.06, blend: "screen" }, swatch: "linear-gradient(135deg,#0a1a0a,#c8ff6a)" },
  { id: "kersenbloesem", naam: "Kersenbloesem", emoji: "🌸", cat: "Achtergrond", css: "saturate(1.2) brightness(1.05)", overlay: wash("#ffd1ec", "soft-light", 0.3), particles: { emoji: "🌸", count: 22, speed: 0.16, size: 0.04, sway: 0.12 }, swatch: "linear-gradient(135deg,#ffd1ec,#ff8ad8)" },
  { id: "ballonnen", naam: "Ballonnen", emoji: "🎈", cat: "Achtergrond", css: "saturate(1.3)", particles: { emoji: "🎈", count: 16, speed: -0.14, size: 0.06, sway: 0.05 }, swatch: "linear-gradient(135deg,#ff5f8f,#ffd24d)" },
  { id: "diamanten", naam: "Diamanten", emoji: "💎", cat: "Achtergrond", css: "brightness(1.05) saturate(1.2)", particles: { emoji: "💎", count: 18, speed: 0.2, size: 0.045, sway: 0.07, blend: "screen" }, swatch: "linear-gradient(135deg,#a0e9ff,#5b6cff)" },
  { id: "emojistorm", naam: "Emoji-storm", emoji: "🤪", cat: "Achtergrond", css: "saturate(1.3)", particles: { emoji: "😜", count: 20, speed: 0.24, size: 0.05, sway: 0.1 }, swatch: "linear-gradient(135deg,#ffde59,#ff914d)" },
  { id: "bladgoud", naam: "Bladgoud", emoji: "🍃", cat: "Achtergrond", css: "sepia(0.2) saturate(1.3) brightness(1.03)", particles: { emoji: "🍂", count: 18, speed: 0.16, size: 0.05, sway: 0.12 }, swatch: "linear-gradient(135deg,#ffd24d,#a86a1a)" },
  { id: "herfstwind", naam: "Herfstwind", emoji: "🍁", cat: "Achtergrond", css: "sepia(0.25) saturate(1.25)", particles: { emoji: "🍁", count: 22, speed: 0.22, size: 0.05, sway: 0.16 }, swatch: "linear-gradient(135deg,#ff9a3d,#a8421a)" },
  { id: "kerstsneeuw", naam: "Kerstsneeuw", emoji: "🎄", cat: "Achtergrond", css: "brightness(1.04) saturate(1.15)", overlay: wash("#0a1a2a", "soft-light", 0.25), particles: { emoji: "❄️", count: 30, speed: 0.2, size: 0.035, sway: 0.05 }, swatch: "linear-gradient(135deg,#0a3d2a,#e0f7ff)" },
  { id: "tropisch", naam: "Tropisch", emoji: "🌺", cat: "Achtergrond", css: "saturate(1.4) brightness(1.05)", overlay: wash("#00b4a0", "soft-light", 0.25), particles: { emoji: "🌺", count: 16, speed: 0.16, size: 0.05, sway: 0.1 }, swatch: "linear-gradient(135deg,#00d2a0,#ffde59)" },
  { id: "onweer", naam: "Onweer", emoji: "⛈️", cat: "Achtergrond", css: "brightness(0.9) contrast(1.2) saturate(0.9)", overlay: wash("#33405a", "soft-light", 0.4), particles: { emoji: "⚡", count: 10, speed: 0.5, size: 0.06, blend: "screen" }, swatch: "linear-gradient(135deg,#2a3450,#0a0f1a)" },
  { id: "veren", naam: "Verenregen", emoji: "🪶", cat: "Achtergrond", css: "brightness(1.05) saturate(1.1)", particles: { emoji: "🪶", count: 16, speed: 0.1, size: 0.05, sway: 0.18 }, swatch: "linear-gradient(135deg,#fff,#c9d6e0)" },
  { id: "melkweg", naam: "Melkweg", emoji: "🌠", cat: "Achtergrond", css: "brightness(1.02) saturate(1.3)", overlay: lin(120, ["#0a0a2a", "#4a2a7a"], "soft-light", 0.4), particles: { emoji: "⭐", count: 30, speed: 0.05, size: 0.02, sway: 0.02, blend: "screen" }, swatch: "linear-gradient(135deg,#2b1055,#7597de)" },

  // ---- GRAPPIG (nieuw) -----------------------------------------------------
  { id: "groteogen", naam: "Grote ogen", emoji: "👀", cat: "Grappig", props: [{ emoji: "👀", anchor: "eyes", x: 0.5, y: 0.44, size: 0.9 }], swatch: "linear-gradient(135deg,#fff,#8ad4ff)" },
  { id: "hoorntjes", naam: "Duivelhoorntjes", emoji: "😈", cat: "Grappig", css: "saturate(1.2)", props: [{ emoji: "😈", anchor: "head", lift: 0.5, x: 0.5, y: 0.1, size: 0.4 }], overlay: wash("#ff2b2b", "soft-light", 0.25), swatch: "linear-gradient(135deg,#8a0000,#ff2b2b)" },
  { id: "regenboogkots", naam: "Regenboog-kots", emoji: "🌈", cat: "Grappig", css: "saturate(1.4)", props: [{ emoji: "🌈", anchor: "mouth", x: 0.5, y: 0.72, size: 0.5 }], swatch: "linear-gradient(135deg,#ff0000,#00d4ff)" },
  { id: "hartogen", naam: "Hartjes-ogen", emoji: "😍", cat: "Grappig", css: "saturate(1.2)", props: [{ emoji: "😍", anchor: "eyes", x: 0.5, y: 0.44, size: 0.9 }], particles: { emoji: "❤️", count: 12, speed: -0.14, size: 0.045, sway: 0.06 }, swatch: "linear-gradient(135deg,#ff5f8f,#ff9ac9)" },
  { id: "goudketting", naam: "Goudketting", emoji: "📿", cat: "Grappig", css: "saturate(1.25) brightness(1.04)", props: [{ emoji: "🕶️", art: "zonnebril", anchor: "eyes", x: 0.5, y: 0.43, size: 0.85 }, { emoji: "📿", x: 0.5, y: 0.9, size: 0.4 }], swatch: "linear-gradient(135deg,#ffe259,#ffa751)" },
  { id: "katoortjes", naam: "Katoortjes", emoji: "🐱", cat: "Grappig", props: [{ emoji: "🐱", anchor: "head", lift: 0.5, x: 0.5, y: 0.1, size: 0.5 }, { emoji: "👃", anchor: "nose", x: 0.5, y: 0.55, size: 0.16 }], swatch: "linear-gradient(135deg,#ffb37f,#8a5a2b)" },
  { id: "bloemenkrans", naam: "Bloemenkrans", emoji: "🌼", cat: "Grappig", css: "saturate(1.2)", props: [{ emoji: "🌸", anchor: "head", lift: 0.7, x: 0.5, y: 0.06, size: 0.5 }], swatch: "linear-gradient(135deg,#ffd1ec,#a8ff78)" },
  { id: "robotogen", naam: "Robot-ogen", emoji: "🤖", cat: "Grappig", css: "saturate(1.2) hue-rotate(10deg)", props: [{ emoji: "🤖", anchor: "eyes", x: 0.5, y: 0.44, size: 0.85 }], swatch: "linear-gradient(135deg,#9aa,#456)" },
  { id: "spekbaard", naam: "Spekbaard", emoji: "🥓", cat: "Grappig", props: [{ emoji: "🧔", anchor: "mouth", x: 0.5, y: 0.68, size: 0.55 }], swatch: "linear-gradient(135deg,#c98a5a,#6a3a1a)" },
  { id: "alienantennes", naam: "Alien-antennes", emoji: "👽", cat: "Grappig", css: "hue-rotate(70deg) saturate(1.2)", props: [{ emoji: "👽", anchor: "head", lift: 0.55, x: 0.5, y: 0.08, size: 0.42 }], overlay: wash("#00ff87", "screen", 0.2), swatch: "linear-gradient(135deg,#00ff87,#60efff)" },
  { id: "groothoofd", naam: "Groot hoofd", emoji: "🗣️", cat: "Grappig", props: [{ emoji: "🎈", anchor: "head", lift: 0.3, x: 0.5, y: 0.2, size: 0.9 }], swatch: "linear-gradient(135deg,#ff5f8f,#ffd24d)" },
  { id: "cyclops", naam: "Cyclops", emoji: "👁️", cat: "Grappig", props: [{ emoji: "👁️", anchor: "eyes", x: 0.5, y: 0.44, size: 0.5 }], swatch: "linear-gradient(135deg,#fff,#8a3dff)" },
  { id: "vlinderkroon", naam: "Vlinderkroon", emoji: "🦋", cat: "Grappig", css: "saturate(1.25)", props: [{ emoji: "🦋", anchor: "head", lift: 0.65, x: 0.5, y: 0.07, size: 0.45 }], particles: { emoji: "🦋", count: 10, speed: -0.1, size: 0.04, sway: 0.14 }, swatch: "linear-gradient(135deg,#43c6ac,#f8ffae)" },
  { id: "sterbril", naam: "Sterrenbril", emoji: "🤩", cat: "Grappig", props: [{ emoji: "🤩", anchor: "eyes", x: 0.5, y: 0.44, size: 0.9 }], swatch: "linear-gradient(135deg,#ffd24d,#ff5f8f)" },
  { id: "piraat", naam: "Piraat", emoji: "🏴‍☠️", cat: "Grappig", props: [{ emoji: "🎩", anchor: "head", lift: 0.6, x: 0.5, y: 0.08, size: 0.5 }, { emoji: "🦜", x: 0.82, y: 0.5, size: 0.3 }], swatch: "linear-gradient(135deg,#3a3a4a,#8a5a2b)" },

  // ---- SPEL (nieuw) --------------------------------------------------------
  { id: "doelspel", naam: "Doeltik", emoji: "🎯", cat: "Spel", css: "saturate(1.2)", special: "doel", swatch: "linear-gradient(135deg,#f12711,#f5af19)" },
  { id: "ritmespel", naam: "Ritme-tik", emoji: "🥁", cat: "Spel", css: "saturate(1.2)", special: "ritme", swatch: "linear-gradient(135deg,#7b2ff7,#00d4ff)" },
  { id: "kantspel", naam: "Links of rechts", emoji: "↔️", cat: "Spel", css: "saturate(1.2)", special: "kant", swatch: "linear-gradient(135deg,#11998e,#38ef7d)" },
];
