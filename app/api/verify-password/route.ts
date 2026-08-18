import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body.password as string | undefined;
    const expected = process.env.UPLOAD_PASSWORD;

    if (!expected) {
      return NextResponse.json(
        { error: "UPLOAD_PASSWORD ortam değişkeni tanımlanmamış. Lütfen .env.local dosyasına ekleyin." },
        { status: 500 }
      );
    }

    if (!password || password !== expected) {
      return NextResponse.json({ error: "Hatalı şifre." }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Şifre doğrulaması yapılamadı." }, { status: 500 });
  }
}