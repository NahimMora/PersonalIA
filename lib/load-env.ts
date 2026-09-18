import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Hostinger's Node.js Web App hosting does NOT run `npm start` — it generates
// its own `server.js` that calls Next's internal `startServer()` directly,
// skipping the `next` CLI entirely, which is what normally loads `.env` (via
// `@next/env`). Nothing in that path ever reads `.env`, even with a valid one
// sitting right next to `server.js`.
//
// This is deliberately a hand-rolled loader instead of `dotenv`: Hostinger's
// deploy packaging strips `package.json` out of every `node_modules`
// subpackage in the served runtime folder, which breaks `require("dotenv")`
// (its entry point is `lib/main.js`, resolved via `package.json#main` — with
// that file gone, Node can't find it). A loader that's part of our own
// bundled source code has no such dependency-resolution failure mode.
//
// Never overwrites a variable that's already set, so this is a no-op
// anywhere env vars ARE already injected by the host (local dev via
// docker/npm scripts, a real VPS, Vercel, etc.) and only fills the gap on
// Hostinger. See docs/DECISIONS.md.
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) value = value.slice(1, -1);

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(process.cwd(), ".env"));

// Cloudflare + Hostinger's own reverse proxy each append to `x-forwarded-proto`
// instead of replacing it, so it arrives as e.g. "https, http". next-auth
// (@auth/core, still beta) builds an internal URL straight from that header
// without sanitizing it, which throws `TypeError: Invalid URL` on every
// request — reproduced locally with this exact header value. Middleware-level
// and route-handler-level request rewrites (see proxy.ts and
// app/api/auth/[...nextauth]/route.ts) turned out not to be enough on their
// own: something in next-auth's Next.js integration reads request headers via
// Next's ambient `headers()`/AsyncLocalStorage context rather than solely the
// Request object handlers receive, so those per-request rewrites don't reach
// every internal read. Patching `Headers.prototype.get` here — once, at
// module load, before any request is processed — covers every caller
// regardless of how it obtained the Headers instance. See docs/DECISIONS.md.
const patchedHeadersFlag = "__forwardedProtoPatched";
if (!(globalThis as Record<string, unknown>)[patchedHeadersFlag]) {
  const originalGet = Headers.prototype.get;
  Headers.prototype.get = function patchedGet(name: string) {
    const value = originalGet.call(this, name);
    if (value && name.toLowerCase() === "x-forwarded-proto" && value.includes(",")) {
      return value.split(",")[0].trim();
    }
    return value;
  };
  (globalThis as Record<string, unknown>)[patchedHeadersFlag] = true;
}
