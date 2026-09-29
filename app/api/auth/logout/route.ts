import { NextResponse } from "next/server";
import { LEAD_COOKIE } from "../../../../lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LEAD_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
