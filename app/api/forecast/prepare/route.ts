import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { AnswerBody } from "@/lib/answers";
import { parseTestIdFromBody, validateAnswersForTest } from "@/lib/answers";
import { getTest } from "@/lib/tests/catalog";
import type { TestId } from "@/lib/tests/types";
import { saveSession } from "@/lib/forecast-session-store";
import { createStarsInvoiceLink } from "@/lib/telegram-bot-api";
import {
  assertFreshAuth,
  explainInitDataFailure,
  parseInitDataUser,
  validateTelegramInitData,
} from "@/lib/telegram-init-data";

async function serverBotUsername(token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = (await res.json()) as { ok: boolean; result?: { username?: string } };
    return json.ok ? (json.result?.username ?? null) : null;
  } catch {
    return null;
  }
}

function initDataErrorMessage(
  reason: NonNullable<ReturnType<typeof explainInitDataFailure>>,
  botUsername: string | null,
): string {
  switch (reason) {
    case "empty":
      return "Нет данных Telegram. Откройте приложение из бота (кнопка меню), не из браузера.";
    case "expired":
      return "Сессия Telegram устарела. Закройте Mini App и откройте снова из бота.";
    case "missing_hash":
      return "Неполные данные Telegram. Обновите Telegram и перезапустите Mini App.";
    case "invalid_auth_date":
      return "Некорректная дата авторизации Telegram. Перезапустите Mini App.";
    case "invalid_signature":
    case "unknown":
      return botUsername
        ? `Подпись Telegram не совпала. На сервере настроен бот @${botUsername} — Mini App должен открываться именно из него (TELEGRAM_BOT_TOKEN в BotFather).`
        : "Подпись Telegram не совпала. Проверьте TELEGRAM_BOT_TOKEN на сервере: тот же бот, из которого открыли приложение.";
    default:
      return "Недействительные данные Telegram";
  }
}

export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
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

  if (!initData) {
    return NextResponse.json(
      { error: initDataErrorMessage("empty", null) },
      { status: 401 },
    );
  }
  if (!validateTelegramInitData(initData, botToken)) {
    const reason = explainInitDataFailure(initData, botToken) ?? "invalid_signature";
    const botUsername = await serverBotUsername(botToken);
    return NextResponse.json(
      { error: initDataErrorMessage(reason, botUsername), reason, server_bot: botUsername },
      { status: 401 },
    );
  }

  const user = parseInitDataUser(initData);
  if (!user || !assertFreshAuth(user.authDate)) {
    return NextResponse.json({ error: "Сессия Telegram устарела, перезапустите мини-приложение" }, { status: 401 });
  }

  const parsedId = parseTestIdFromBody(rec) ?? "paid_map24";
  const test = getTest(parsedId);
  if (!test || test.tier !== "paid") {
    return NextResponse.json({ error: "Некорректный платный тест" }, { status: 400 });
  }
  const testId: TestId = test.id;

  if (!validateAnswersForTest(testId, answers)) {
    return NextResponse.json({ error: "Не все вопросы отвечены" }, { status: 400 });
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();

  try {
    await saveSession({
      id: sessionId,
      testId,
      telegramUserId: user.userId,
      answers: answers as Record<string, AnswerBody>,
      paid: false,
      createdAt: now,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сохранения сессии";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  try {
    const invoiceUrl = await createStarsInvoiceLink({
      botToken,
      title: test.invoiceTitle,
      description: test.invoiceDescription,
      payload: sessionId,
      starsAmount: test.priceStars,
      label: "Отчёт",
    });
    return NextResponse.json({
      sessionId,
      invoiceUrl,
      stars: test.priceStars,
      testId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка создания счёта";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
