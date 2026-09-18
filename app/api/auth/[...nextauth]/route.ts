import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

// Belt-and-suspenders alongside proxy.ts's header rewrite: in Hostinger's
// custom server.js entrypoint, middleware's `NextResponse.next({ request:
// { headers } })` rewrite doesn't reliably reach route handlers (unlike a
// normal `next start`/dev server), so the malformed multi-value
// `x-forwarded-proto` Cloudflare/Hostinger send (see docs/DECISIONS.md)
// still crashes next-auth's internal URL building here even after the
// middleware fix. Sanitize it again, directly on the request this route
// handler actually receives.
function sanitizeForwardedProto(request: NextRequest): NextRequest {
  const proto = request.headers.get("x-forwarded-proto");
  if (!proto?.includes(",")) return request;

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-proto", proto.split(",")[0].trim());

  return new NextRequest(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: request.body ? "half" : undefined,
  });
}

export async function GET(request: NextRequest) {
  return handlers.GET(sanitizeForwardedProto(request));
}

export async function POST(request: NextRequest) {
  return handlers.POST(sanitizeForwardedProto(request));
}
