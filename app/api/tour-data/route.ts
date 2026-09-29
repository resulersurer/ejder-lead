import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.TUR_TRACKER_API_URL;
  const apiKey = process.env.INTEGRATION_API_KEY;
  if (!baseUrl || !apiKey) return NextResponse.json({ error: "TurTakip entegrasyonu henüz yapılandırılmadı." }, { status: 503 });
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/integrations/lead-data`, {
      headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store"
    });
    const body = await response.json();
    if (!response.ok) return NextResponse.json({ error: body.error || "TurTakip verileri alınamadı." }, { status: response.status });
    return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "TurTakip uygulamasına ulaşılamadı." }, { status: 502 });
  }
}
