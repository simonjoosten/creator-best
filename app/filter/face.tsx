"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Prop } from "./filters";
import { AccessoryArt } from "./effects";

// MediaPipe-versie moet gelijk zijn aan de geïnstalleerde (zie package.json)
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Laadt de AI-gezichtsherkenning één keer
export function useFaceLandmarker() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [landmarker, setLandmarker] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lm: any = null;
    (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
        lm = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (cancelled) {
          try { lm.close?.(); } catch { /* niets */ }
          return;
        }
        setLandmarker(lm);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      try {
        lm?.close?.();
      } catch {
        /* niets */
      }
    };
  }, []);

  return { landmarker, status };
}

type Placed = { pr: Prop; left: number; top: number; width: number; roll: number };

export function FaceAccessories({
  videoRef,
  landmarker,
  props,
  zoomRef,
  mirrorRef,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  landmarker: any;
  props: Prop[];
  zoomRef: RefObject<number>;
  mirrorRef: RefObject<boolean>;
}) {
  const [items, setItems] = useState<Placed[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;
  const smoothRef = useRef<Placed[]>([]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = () => {
      const video = videoRef.current;
      if (video && landmarker && video.videoWidth && video.readyState >= 2) {
        const now = performance.now();
        if (now - last > 33) {
          last = now;
          let lm = null;
          try {
            const res = landmarker.detectForVideo(video, now);
            lm = res?.faceLandmarks?.[0] ?? null;
          } catch {
            lm = null;
          }
          if (lm) {
            const zoom = zoomRef.current;
            const mir = mirrorRef.current;
            // Beeldpunt: spiegelen (selfie) + inzoomen meenemen
            const sp = (i: number) => ({
              x: 0.5 + ((mir ? 1 - lm[i].x : lm[i].x) - 0.5) * zoom,
              y: 0.5 + (lm[i].y - 0.5) * zoom,
            });
            const eyeL = sp(33);
            const eyeR = sp(263);
            const cheekL = sp(234);
            const cheekR = sp(454);
            const fore = sp(10);
            const chin = sp(152);
            const mouth = sp(164);
            const nose = sp(1);
            const faceW = Math.hypot(cheekR.x - cheekL.x, cheekR.y - cheekL.y);
            const faceH = Math.hypot(chin.x - fore.x, chin.y - fore.y);
            // Ogen op schermvolgorde zetten (links→rechts), anders staat alles op de kop
            const aE = eyeL.x <= eyeR.x ? eyeL : eyeR;
            const bE = eyeL.x <= eyeR.x ? eyeR : eyeL;
            const roll = (Math.atan2(bE.y - aE.y, bE.x - aE.x) * 180) / Math.PI;
            let ux = fore.x - chin.x;
            let uy = fore.y - chin.y;
            const ul = Math.hypot(ux, uy) || 1;
            ux /= ul;
            uy /= ul;

            const placed = propsRef.current.map((pr) => {
              let cx: number, cy: number;
              if (pr.anchor === "eyes") {
                cx = (eyeL.x + eyeR.x) / 2;
                cy = (eyeL.y + eyeR.y) / 2;
              } else if (pr.anchor === "nose") {
                cx = nose.x;
                cy = nose.y;
              } else if (pr.anchor === "mouth") {
                cx = mouth.x;
                cy = mouth.y;
              } else {
                const lift = (pr.lift ?? 0.4) * faceH;
                cx = fore.x + ux * lift;
                cy = fore.y + uy * lift;
              }
              return { pr, left: cx * 100, top: cy * 100, width: faceW * pr.size * 100, roll };
            });
            // Vloeiend maken (minder trillen)
            const prev = smoothRef.current;
            const k = 0.5;
            const sm = placed.map((p, i) => {
              const q = prev[i];
              if (!q || q.pr !== p.pr) return p;
              return {
                pr: p.pr,
                left: q.left + (p.left - q.left) * k,
                top: q.top + (p.top - q.top) * k,
                width: q.width + (p.width - q.width) * k,
                roll: q.roll + (p.roll - q.roll) * k,
              };
            });
            smoothRef.current = sm;
            setItems(sm);
          } else {
            smoothRef.current = [];
            setItems((cur) => (cur.length ? [] : cur));
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, landmarker, zoomRef]);

  return (
    <>
      {items.map((it, i) => (
        <span
          key={i}
          className="pointer-events-none absolute select-none"
          style={{
            left: `${it.left}%`,
            top: `${it.top}%`,
            width: `${it.width}%`,
            transform: `translate(-50%,-50%) rotate(${it.roll}deg)`,
            transition: "transform 50ms linear",
          }}
        >
          {it.pr.art ? (
            <AccessoryArt name={it.pr.art} />
          ) : (
            <span style={{ fontSize: `${it.width}cqw`, lineHeight: 1 }}>{it.pr.emoji}</span>
          )}
        </span>
      ))}
    </>
  );
}
