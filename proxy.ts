import { NextRequest, NextResponse } from "next/server";
import { LEAD_COOKIE, verifyAdminToken } from "./lib/auth";

export function proxy(request: NextRequest) {
  if (verifyAdminToken(request.cookies.get(LEAD_COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Admin auth required" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = { matcher: ["/((?!login|api/auth/login|_next/static|_next/image|favicon.ico).*)"] };
