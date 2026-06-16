// Server-route op je eigen computer.
// 1) Probeert eerst JOUW ComfyUI (lokaal, onbeperkt, topkwaliteit).
// 2) Staat ComfyUI uit? Dan valt-ie terug op de gratis online-AI (Pollinations),
//    die geduldig blijft proberen als het druk is.
import { isPromptOk } from "../../lib/safe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMFY = "http://127.0.0.1:8188";
const CHECKPOINT = "sd_xl_turbo_1.0_fp16.safetensors";

// De AI snapt Engels veel beter — vertaal de tekst eerst (gratis, geen sleutel)
async function naarEngels(text: string): Promise<string> {
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    if (!r.ok) return text;
    const data = await r.json();
    if (Array.isArray(data?.[0])) return data[0].map((seg: unknown[]) => seg[0]).join("");
    return text;
  } catch {
    return text;
  }
}

async function comfyAan(): Promise<boolean> {
  try {
    const r = await fetch(`${COMFY}/system_stats`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

// Genereer via lokale ComfyUI (SDXL-Turbo). Geeft de afbeelding terug, of null.
async function viaComfy(prompt: string, w: number, h: number, seed: number): Promise<{ buf: ArrayBuffer; type: string } | null> {
  const workflow = {
    "3": { class_type: "KSampler", inputs: { seed, steps: 4, cfg: 1.0, sampler_name: "euler_ancestral", scheduler: "normal", denoise: 1.0, model: ["4", 0], positive: ["6", 0], negative: ["7", 0], latent_image: ["5", 0] } },
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CHECKPOINT } },
    "5": { class_type: "EmptyLatentImage", inputs: { width: w, height: h, batch_size: 1 } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4", 1] } },
    "7": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["4", 1] } },
    "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
    "9": { class_type: "SaveImage", inputs: { filename_prefix: "videobest", images: ["8", 0] } },
  };
  try {
    const post = await fetch(`${COMFY}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: "videobest" }),
    });
    if (!post.ok) return null;
    const { prompt_id } = await post.json();
    if (!prompt_id) return null;

    // Wachten tot het plaatje klaar is (max ~3 min)
    for (let i = 0; i < 180; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const hr = await fetch(`${COMFY}/history/${prompt_id}`);
      if (!hr.ok) continue;
      const hist = await hr.json();
      const entry = hist?.[prompt_id];
      if (!entry?.outputs) continue;
      for (const nodeId of Object.keys(entry.outputs)) {
        const imgs = entry.outputs[nodeId]?.images;
        if (imgs?.length) {
          const im = imgs[0];
          const vr = await fetch(`${COMFY}/view?filename=${encodeURIComponent(im.filename)}&subfolder=${encodeURIComponent(im.subfolder || "")}&type=${encodeURIComponent(im.type || "output")}`);
          if (vr.ok) return { buf: await vr.arrayBuffer(), type: vr.headers.get("content-type") || "image/png" };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function viaPollinations(prompt: string, w: string, h: string, seed: string): Promise<{ buf: ArrayBuffer; type: string } | null> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&safe=true&model=flux&referrer=videobest`;
  for (let i = 0; i < 10; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "VideoBest/1.0" } });
      const type = r.headers.get("content-type") || "";
      if (r.ok && type.startsWith("image")) return { buf: await r.arrayBuffer(), type };
    } catch {
      /* opnieuw proberen */
    }
    await new Promise((res) => setTimeout(res, 3500));
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt")?.trim() || "een mooi kleurrijk plaatje";
  const w = searchParams.get("w") || "1024";
  const h = searchParams.get("h") || "1024";
  const seed = searchParams.get("seed") || String(Math.floor(Math.random() * 1_000_000));

  if (!isPromptOk(prompt)) {
    return new Response(JSON.stringify({ error: "Dat kan ik niet maken. Probeer iets anders. 😊" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const engels = await naarEngels(prompt);

  // 1) Lokale ComfyUI als die aanstaat
  if (await comfyAan()) {
    const res = await viaComfy(engels, parseInt(w), parseInt(h), parseInt(seed));
    if (res) return new Response(res.buf, { headers: { "Content-Type": res.type, "Cache-Control": "no-store", "X-Bron": "comfyui" } });
  }

  // 2) Anders: gratis online-AI
  const res = await viaPollinations(engels, w, h, seed);
  if (res) return new Response(res.buf, { headers: { "Content-Type": res.type, "Cache-Control": "no-store", "X-Bron": "pollinations" } });

  return new Response(JSON.stringify({ error: "De AI is nu te druk. Probeer het zo nog eens." }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
