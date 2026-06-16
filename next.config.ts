import type { NextConfig } from "next";

// Voor de openbare GitHub Pages speel-link bouwen we een "statische" versie.
// Lokaal (npm run dev) blijft alles normaal werken, mét de AI-server-routes.
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = isExport
  ? {
      output: "export",
      basePath: "/creator-best",
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {};

export default nextConfig;
