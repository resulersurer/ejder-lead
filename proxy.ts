import { NextRequest, NextResponse } from "next/server";

// Mevcut sayfalar korunur; erişim bu noktadan kapatılır.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const headers = { "Cache-Control": "no-store" };

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Bu uygulama şu anda kullanılamamaktadır." },
      { status: 503, headers }
    );
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse("Bu sayfa kullanılamamaktadır.", { status: 503, headers });
  }

  if (pathname === "/kullanilamiyor") {
    return NextResponse.next({ headers });
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/kullanilamiyor";
  destination.search = "";
  return NextResponse.redirect(destination, { status: 307, headers });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
