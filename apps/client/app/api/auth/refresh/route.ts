import { NextRequest, NextResponse } from "next/server";
import {
  attachAuthCookies,
  BACKEND_URL,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  SpringAuthTokensResponse,
} from "@/lib/bff";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) {
    const res = NextResponse.json(
      { code: "NO_REFRESH_COOKIE", message: "No active session refresh token" },
      { status: 401 }
    );
    return clearAuthCookies(res);
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const res = NextResponse.json(data, { status: upstream.status });
    return clearAuthCookies(res);
  }

  const tokens = data as SpringAuthTokensResponse;
  const response = NextResponse.json({
    userId: tokens.userId,
    tenantId: tokens.tenantId,
    email: tokens.email,
  });

  return attachAuthCookies(response, tokens);
}
