import { NextResponse } from "next/server";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
export const PROXY_SECRET = process.env.PROXY_SECRET ?? "ims-dev-bff-proxy-secret-2026";

const IS_PROD = process.env.NODE_ENV === "production";

// Use __Host- prefix on HTTPS production; fall back to ims_ on local http://localhost
export const ACCESS_COOKIE_NAME = IS_PROD ? "__Host-ims_at" : "ims_at";
export const REFRESH_COOKIE_NAME = IS_PROD ? "__Host-ims_rt" : "ims_rt";

export interface SpringAuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  userId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  email: string;
  fullName: string;
  permissions: string[];
}

export function attachAuthCookies(
  response: NextResponse,
  tokens: SpringAuthTokensResponse
): NextResponse {
  response.cookies.set(ACCESS_COOKIE_NAME, tokens.accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: "/",
    maxAge: tokens.expiresInSeconds,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(ACCESS_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
}
