import { NextResponse } from "next/server";
import { db, ensureTeamMessagesTable } from "../../../lib/db";
import type { TeamMessage } from "../../teamMessages";

export async function GET() {
  try {
    await ensureTeamMessagesTable();
    const result = await db.query(
      `SELECT id, quote, author, COALESCE(theme, '') AS theme
       FROM team_messages
       WHERE active = TRUE
       ORDER BY priority ASC, created_at ASC, id ASC`
    );

    return NextResponse.json({ messages: result.rows as TeamMessage[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen bir sunucu hatası oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
