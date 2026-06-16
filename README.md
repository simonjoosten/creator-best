# 🎬 VideoBest

Een browser-app vol video-, foto- en AI-tools. Gemaakt met Next.js.

## Wat zit erin?

**Camera & video**
- 🎨 Filter video maken — live camera met 90+ filters, opnemen, gezicht-volgende accessoires
- 📸 Filter foto maken — foto's met filters
- 🎞️ Filter op je video — zet een filter op een bestaande video
- 💬 Ondertiteling — automatische ondertitels (AI, in de browser)
- 🎮 Spellen — tik-, mik-, reactie- en vang-spellen door de camera

**AI-tools**
- 🪄 AI foto generator — typ tekst → plaatje
- 🖼️ AI foto veranderen — echte foto-bewerking (img2img)
- 🎥 AI video maken — maak een filmpje van je idee
- 🖍️ Kleurplaat / 🌟 Sticker / 😎 Emoji / ✏️ Logo / 🖼️ Poster makers

## AI: lokaal of online

De AI-beelden komen van **jouw eigen ComfyUI** (lokaal, onbeperkt, topkwaliteit) als die draait,
anders valt de app terug op een gratis online-AI. Er zit een veiligheidsfilter op zodat er geen
ongepaste dingen gemaakt worden.

## Zelf draaien

```bash
npm install
npm run dev
```

Open daarna http://localhost:3000

Voor de beste AI-kwaliteit: installeer [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
met het model `sd_xl_turbo_1.0_fp16.safetensors` en start het op poort 8188.

---
🤖 Mede gemaakt met Claude Code
