import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, BACKEND_URL, PROXY_SECRET } from "@/lib/bff";

async function proxyToBackend(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  // CSRF check: reject non-GET/HEAD requests without a matching Origin header
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (host && originUrl.host !== host) {
          return NextResponse.json(
            { code: "CSRF_ORIGIN_MISMATCH", message: "Cross-origin state-changing request rejected" },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { code: "INVALID_ORIGIN", message: "Invalid Origin header" },
          { status: 403 }
        );
      }
    }
  }

  const { path } = await context.params;
  const subPath = path.join("/");
  const search = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/v1/${subPath}${search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const accept = req.headers.get("accept");
  if (accept) {
    headers.set("Accept", accept);
  }
  const idempotencyKey = req.headers.get("idempotency-key");
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }
  const ifMatch = req.headers.get("if-match");
  if (ifMatch) {
    headers.set("If-Match", ifMatch);
  }

  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  headers.set("X-Proxy-Secret", PROXY_SECRET);

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const bodyBuffer = await req.arrayBuffer();
    if (bodyBuffer.byteLength > 0) {
      init.body = bodyBuffer;
    }
  }

  const upstream = await fetch(targetUrl, init);

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("Content-Type", upstreamContentType);
  }
  const contentDisposition = upstream.headers.get("content-disposition");
  if (contentDisposition) {
    responseHeaders.set("Content-Disposition", contentDisposition);
  }
  for (const name of ["etag", "location", "idempotent-replayed"]) {
    const val = upstream.headers.get(name);
    if (val) {
      responseHeaders.set(name, val);
    }
  }

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const PATCH = proxyToBackend;
export const DELETE = proxyToBackend;
