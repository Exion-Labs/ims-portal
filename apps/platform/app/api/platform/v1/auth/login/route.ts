import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const PROXY_SECRET = process.env.IMS_PROXY_SECRET ?? "ims-dev-bff-proxy-secret-2026";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${BACKEND_URL}/api/platform/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Proxy-Secret": PROXY_SECRET,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
  }
  const data = JSON.parse(text);
  const cookieStore = await cookies();
  cookieStore.set("ims_platform_token", data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });
  return NextResponse.json({ user: data.user });
}
