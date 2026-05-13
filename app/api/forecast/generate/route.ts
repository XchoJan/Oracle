import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/forecast-session-store";
import { generateForecastFromAnswers } from "@/lib/generate-forecast";
import {
  assertFreshAuth,
  parseInitDataUser,
  validateTelegramInitData,
} from "@/lib/telegram-init-data";

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN не задан" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const initData = typeof rec.initData === "string" ? rec.initData : "";
  const sessionId = typeof rec.sessionId === "string" ? rec.sessionId : "";

  if (!initData || !validateTelegramInitData(initData, botToken)) {
    return NextResponse.json({ error: "Недействительные данные Telegram" }, { status: 401 });
  }

  const user = parseInitDataUser(initData);
  if (!user || !assertFreshAuth(user.authDate)) {
    return NextResponse.json({ error: "Сессия Telegram устарела, перезапустите мини-приложение" }, { status: 401 });
  }

  if (!sessionId || sessionId.length > 128) {
    return NextResponse.json({ error: "Некорректный sessionId" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Сессия не найдена или отчёт уже выдан" }, { status: 404 });
  }

  if (session.telegramUserId !== user.userId) {
    return NextResponse.json({ error: "Несовпадение пользователя" }, { status: 403 });
  }

  if (!session.paid) {
    return NextResponse.json(
      { error: "Оплата не подтверждена", retry: true },
      { status: 402 },
    );
  }

  try {
    const forecast = await generateForecastFromAnswers(session.answers);
    await deleteSession(sessionId);
    return NextResponse.json(forecast);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка генерации";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
