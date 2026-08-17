import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { extension, destination } = await request.json();

    if (!extension || !destination) {
      return NextResponse.json({ error: "Eksik parametre (extension veya destination)" }, { status: 400 });
    }

    const apiKey = process.env.VERIMOR_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Verimor API anahtarı yapılandırılmamış." }, { status: 500 });
    }

    // Clean up destination number (remove spaces, etc.)
    const cleanDestination = destination.replace(/\D/g, "");

    // Verimor API'ye GET isteği
    const verimorUrl = new URL("https://api.bulutsantralim.com/originate");
    verimorUrl.searchParams.append("key", apiKey);
    verimorUrl.searchParams.append("extension", extension);
    verimorUrl.searchParams.append("destination", cleanDestination);

    const response = await fetch(verimorUrl.toString(), {
      method: "GET", // Verimor originate API uses GET according to docs
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Verimor API Hatası:", errorText);
      return NextResponse.json(
        { error: `Verimor API hatası: ${errorText}` },
        { status: response.status }
      );
    }

    const callUuid = await response.text();
    return NextResponse.json({ success: true, callUuid: callUuid.trim() });
  } catch (error) {
    console.error("Call API error:", error);
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu" }, { status: 500 });
  }
}
