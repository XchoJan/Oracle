import { NextResponse } from "next/server";

/**
 * GET: какой бот привязан к TELEGRAM_BOT_TOKEN на этом сервере (без утечки токена).
 * Сверьте username с ботом, из которого открываете Mini App.
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN не задан" }, { status: 500 });
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = (await res.json()) as {
      ok: boolean;
      result?: { id: number; username?: string; first_name?: string };
      description?: string;
    };
    if (!json.ok) {
      return NextResponse.json(
        { error: json.description ?? "getMe failed", hint: "Проверьте TELEGRAM_BOT_TOKEN на хостинге" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      bot_id: json.result?.id,
      username: json.result?.username ?? null,
      first_name: json.result?.first_name ?? null,
      hint: "Mini App должен открываться из этого же бота (@username в BotFather).",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
