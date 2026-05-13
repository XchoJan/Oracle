import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { AnswerBody } from "@/lib/answers";
import { validateAnswers } from "@/lib/answers";
import { saveSession } from "@/lib/forecast-session-store";
import { FORECAST_PRICE_STARS } from "@/lib/pricing";
import { createStarsInvoiceLink } from "@/lib/telegram-bot-api";
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
  const answers = rec.answers;

  if (!initData || !validateTelegramInitData(initData, botToken)) {
    return NextResponse.json({ error: "Недействительные данные Telegram" }, { status: 401 });
  }

  const user = parseInitDataUser(initData);
  if (!user || !assertFreshAuth(user.authDate)) {
    return NextResponse.json({ error: "Сессия Telegram устарела, перезапустите мини-приложение" }, { status: 401 });
  }

  if (!validateAnswers(answers)) {
    return NextResponse.json({ error: "Не все вопросы отвечены" }, { status: 400 });
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();

  await saveSession({
    id: sessionId,
    telegramUserId: user.userId,
    answers: answers as Record<string, AnswerBody>,
    paid: false,
    createdAt: now,
  });

  try {
    const invoiceUrl = await createStarsInvoiceLink({
      botToken,
      title: "Прогноз на 24 месяца",
      description: "Персональный разбор по протоколу самоотчёта",
      payload: sessionId,
      starsAmount: FORECAST_PRICE_STARS,
      label: "Отчёт",
    });
    return NextResponse.json({ sessionId, invoiceUrl, stars: FORECAST_PRICE_STARS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка создания счёта";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
