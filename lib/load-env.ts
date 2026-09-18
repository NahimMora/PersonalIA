import { config } from "dotenv";

// Hostinger's Node.js Web App hosting does NOT run `npm start` — it generates
// its own `server.js` that calls Next's internal `startServer()` directly,
// skipping the `next` CLI entirely. The CLI is what normally loads `.env`
// (via `@next/env`), so in this custom entrypoint nothing ever reads it and
// `process.env.DATABASE_URL` etc. come back empty even with a valid `.env`
// sitting right next to `server.js`. Importing this module (for its side
// effect) from every entry point that reads env vars at module-load or
// first-use time works around that — see docs/DECISIONS.md.
//
// `config()` never overwrites a variable that's already set, so this is a
// no-op wherever env vars ARE already injected by the host (local dev, a
// real VPS, Vercel, etc.) and only fills the gap on Hostinger.
config();
