// Echte foto-bewerking (img2img) via jouw lokale ComfyUI.
// Je foto wordt naar ComfyUI gestuurd (op je eigen computer, blijft dus lokaal)
// en daar omgetoverd volgens je beschrijving, met behoud van de vorm.
import { isPromptOk } from "../../lib/safe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMFY = "http://127.0.0.1:8188";
const CHECKPOINT = "sd_xl_turbo_1.0_fp16.safetensors";

async function naarEngels(text: string): Promise<string> {
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    if (!r.ok) return text;
    const data = await r.json();
    if (Array.isArray(data?.[0])) return data[0].map((s: unknown[]) => s[0]).join("");
    return text;
  } catch { return text; }
}

async function comfyAan(): Promise<boolean> {
  try { return (await fetch(`${COMFY}/system_stats`, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("image");
  const prompt = String(form.get("prompt") || "").trim();
  const sterkte = Math.min(0.85, Math.max(0.3, parseFloat(String(form.get("sterkte") || "0.6"))));

  if (!(file instanceof Blob)) return Response.json({ error: "Geen foto ontvangen." }, { status: 400 });
  if (!prompt) return Response.json({ error: "Geen beschrijving." }, { status: 400 });
  if (!isPromptOk(prompt)) return Response.json({ error: "Dat kan ik niet maken. 😊" }, { status: 400 });
  if (!(await comfyAan())) return Response.json({ error: "ComfyUI staat uit. Start ComfyUI voor echte foto-bewerking." }, { status: 503 });

  try {
    // 1) Foto uploaden naar ComfyUI
    const up = new FormData();
    up.append("image", file, "input.png");
    up.append("overwrite", "true");
    const ur = await fetch(`${COMFY}/upload/image`, { method: "POST", body: up });
    if (!ur.ok) return Response.json({ error: "Upload mislukt." }, { status: 500 });
    const uj = await ur.json();
    const imgName = uj.subfolder ? `${uj.subfolder}/${uj.name}` : uj.name;

    const engels = await naarEngels(prompt);
    const seed = Math.floor(Math.random() * 1_000_000);
    const workflow = {
      "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CHECKPOINT } },
      "10": { class_type: "LoadImage", inputs: { image: imgName } },
      "11": { class_type: "VAEEncode", inputs: { pixels: ["10", 0], vae: ["4", 2] } },
      "6": { class_type: "CLIPTextEncode", inputs: { text: engels, clip: ["4", 1] } },
      "7": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["4", 1] } },
      "3": { class_type: "KSampler", inputs: { seed, steps: 8, cfg: 1.2, sampler_name: "euler_ancestral", scheduler: "normal", denoise: sterkte, model: ["4", 0], positive: ["6", 0], negative: ["7", 0], latent_image: ["11", 0] } },
      "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
      "9": { class_type: "SaveImage", inputs: { filename_prefix: "videobest-edit", images: ["8", 0] } },
    };

    const pr = await fetch(`${COMFY}/prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: workflow, client_id: "videobest" }) });
    if (!pr.ok) return Response.json({ error: "Bewerken mislukt." }, { status: 500 });
    const { prompt_id } = await pr.json();

    for (let i = 0; i < 180; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const hr = await fetch(`${COMFY}/history/${prompt_id}`);
      if (!hr.ok) continue;
      const hist = await hr.json();
      const entry = hist?.[prompt_id];
      if (!entry?.outputs) continue;
      for (const nid of Object.keys(entry.outputs)) {
        const imgs = entry.outputs[nid]?.images;
        if (imgs?.length) {
          const im = imgs[0];
          const vr = await fetch(`${COMFY}/view?filename=${encodeURIComponent(im.filename)}&subfolder=${encodeURIComponent(im.subfolder || "")}&type=${encodeURIComponent(im.type || "output")}`);
          if (vr.ok) return new Response(await vr.arrayBuffer(), { headers: { "Content-Type": vr.headers.get("content-type") || "image/png", "Cache-Control": "no-store" } });
        }
      }
    }
    return Response.json({ error: "Time-out." }, { status: 504 });
  } catch {
    return Response.json({ error: "Er ging iets mis bij het bewerken." }, { status: 500 });
  }
}
