import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const PROXY_SECRET = process.env.IMS_PROXY_SECRET ?? "ims-dev-bff-proxy-secret-2026";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = `/api/platform/${path.join("/")}${req.nextUrl.search}`;
  const cookieStore = await cookies();
  const token = cookieStore.get("ims_platform_token")?.value;

  const headers: Record<string, string> = {
    "X-Proxy-Secret": PROXY_SECRET,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const ct = req.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;

  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;
  const res = await fetch(`${BACKEND_URL}${targetPath}`, {
    method: req.method,
    headers,
    body,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
