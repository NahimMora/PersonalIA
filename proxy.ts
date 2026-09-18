import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Protects every page and API route except auth endpoints, the login page,
// static assets and the Shortcuts API (which uses its own bearer-token auth,
// see lib/shortcuts-auth.ts).
//
// Deliberately NOT using the `auth(...)` HOF wrapper from lib/auth.ts here:
// Hostinger sits behind Cloudflare + its own reverse proxy, and that chain
// sends `x-forwarded-proto` as a comma-joined multi-value header (e.g.
// "https, http"). next-auth@5.0.0-beta.32 builds an internal URL directly
// from that header without sanitizing it, which throws `TypeError: Invalid
// URL` on every single request in production (reproduced locally too — see
// docs/DECISIONS.md). `getToken()` only decodes the JWT session cookie, so
// it never hits that broken code path. The proxy also rewrites the header to
// its first value before continuing, so the actual `/api/auth/*` route
// handlers (which DO go through the buggy code) don't crash either.
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const requestHeaders = new Headers(req.headers);
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  if (forwardedProto?.includes(",")) {
    requestHeaders.set("x-forwarded-proto", forwardedProto.split(",")[0].trim());
  }

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/shortcuts") ||
    pathname.startsWith("/api/debug-env"); // TEMPORARY, remove after diagnosing the Hostinger deploy

  const continueWithCleanHeaders = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  if (isPublic) return continueWithCleanHeaders();

  // Must agree with whatever NextAuth itself used to decide the cookie name
  // when it set the session (the `__Secure-` prefix). That decision is tied
  // to AUTH_URL's scheme, not the (untrusted, multi-value) forwarded-proto
  // header, so derive it the same way here instead of from that header.
  const secureCookie = process.env.AUTH_URL?.startsWith("https://") ?? req.nextUrl.protocol === "https:";

  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return continueWithCleanHeaders();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
