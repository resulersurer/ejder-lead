import { NextResponse } from "next/server";
import { createAdminToken, LEAD_COOKIE } from "../../../../lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = process.env.ADMIN_PASSWORD || process.env.UPLOAD_PASSWORD;
  if (!password || body.password !== password) return NextResponse.json({ error: "Şifre hatalı." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LEAD_COOKIE, createAdminToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 12, path: "/" });
  return response;
}
