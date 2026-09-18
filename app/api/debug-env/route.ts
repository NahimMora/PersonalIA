import "@/lib/load-env";
import { NextResponse } from "next/server";

// TEMPORARY diagnostic endpoint — remove once the Hostinger deploy is fully
// verified. Only ever returns AUTH_URL's raw value (safe, it's just the
// public domain) plus booleans for everything else, never real secrets.
export async function GET() {
  const authUrl = process.env.AUTH_URL;
  let parseError: string | null = null;
  if (authUrl) {
    try {
      new URL(authUrl);
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    AUTH_URL_raw: authUrl ?? null,
    AUTH_URL_length: authUrl?.length ?? null,
    AUTH_URL_charCodes: authUrl ? Array.from(authUrl).map((c) => c.charCodeAt(0)) : null,
    AUTH_URL_parseError: parseError,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? null,
    hasDATABASE_URL: Boolean(process.env.DATABASE_URL),
    hasAUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    NODE_ENV: process.env.NODE_ENV ?? null,
  });
}
