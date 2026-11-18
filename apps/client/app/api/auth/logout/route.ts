import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, clearAuthCookies, REFRESH_COOKIE_NAME } from "@/lib/bff";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshToken) {
    await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }

  const response = NextResponse.json({ status: "LOGGED_OUT" });
  return clearAuthCookies(response);
}
