import { NextResponse } from "next/server";
import { getMiniAppUrl } from "@/lib/mini-app-url";
import { setBotMenuWebApp } from "@/lib/telegram-bot-api";

/**
 * POST: один раз настроить кнопку меню бота (слева от поля ввода) → Mini App.
 * Защита: заголовок X-Setup-Token = TELEGRAM_WEBHOOK_SECRET (или любой ADMIN_SETUP_TOKEN).
 */
export async function POST(req: Request) {
  const expected =
    process.env.ADMIN_SETUP_TOKEN?.trim() || process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "TELEGRAM_WEBHOOK_SECRET не задан" }, { status: 500 });
  }
  const token = req.headers.get("x-setup-token")?.trim();
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN не задан" }, { status: 500 });
  }

  const url = getMiniAppUrl();
  try {
    await setBotMenuWebApp(botToken, url, "Прогноз");
    return NextResponse.json({ ok: true, menu_web_app_url: url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
