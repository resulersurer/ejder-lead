import { NextRequest, NextResponse } from "next/server";
import { db, ensureLeadsTable } from "../../../../lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fromPerson = body.fromPerson as string | undefined;
    const toPerson = body.toPerson as string | undefined;

    if (!fromPerson || !toPerson) {
      return NextResponse.json(
        { error: "Kaynak ve hedef personel gereklidir." },
        { status: 400 }
      );
    }

    if (fromPerson === toPerson) {
      return NextResponse.json(
        { error: "Kaynak ve hedef personel aynı olamaz." },
        { status: 400 }
      );
    }

    await ensureLeadsTable();
    const result = await db.query(
      `UPDATE leads SET sales_person = $1 WHERE sales_person = $2 RETURNING id`,
      [toPerson, fromPerson]
    );

    return NextResponse.json({ transferred: result.rowCount ?? 0 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bilinmeyen bir sunucu hatası oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}