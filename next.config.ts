import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // No `output: "standalone"` — the real deploy target is Hostinger shared
  // hosting, which just runs `npm run build` + `npm start` (plain `next
  // start`, which standalone output breaks). The Dockerfile (optional VPS
  // path) runs the same `npm start` for consistency instead of relying on
  // the standalone server.js.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
