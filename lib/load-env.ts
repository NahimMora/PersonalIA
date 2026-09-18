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
