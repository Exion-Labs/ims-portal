import { NextRequest, NextResponse } from "next/server";
import { attachAuthCookies, BACKEND_URL, SpringAuthTokensResponse } from "@/lib/bff";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const tokens = data as SpringAuthTokensResponse;
  const response = NextResponse.json({
    userId: tokens.userId,
    tenantId: tokens.tenantId,
    tenantName: tokens.tenantName,
    tenantSlug: tokens.tenantSlug,
    email: tokens.email,
    fullName: tokens.fullName,
    permissions: tokens.permissions,
  });

  return attachAuthCookies(response, tokens);
}
