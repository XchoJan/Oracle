import { NextRequest, NextResponse } from "next/server";
import { validateAnswersForTest, parseTestIdFromBody } from "@/lib/answers";
import { generateForecastFromAnswers } from "@/lib/generate-forecast";
import { recordTestCompleted } from "@/lib/record-test-completed";
import { getTest } from "@/lib/tests/catalog";
import {
  assertFreshAuth,
  parseInitDataUser,
  validateTelegramInitData,
} from "@/lib/telegram-init-data";
import type { AnswerBody } from "@/lib/answers-types";

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
  const testId = parseTestIdFromBody(rec);
  if (!testId) {
    return NextResponse.json({ error: "Укажите testId" }, { status: 400 });
  }

  const test = getTest(testId);
  if (!test || test.tier !== "free") {
    return NextResponse.json({ error: "Тест недоступен бесплатно" }, { status: 400 });
  }

  const initData = typeof rec.initData === "string" ? rec.initData : "";
  if (!initData || !validateTelegramInitData(initData, botToken)) {
    return NextResponse.json({ error: "Недействительные данные Telegram" }, { status: 401 });
  }

  const user = parseInitDataUser(initData);
  if (!user || !assertFreshAuth(user.authDate)) {
    return NextResponse.json({ error: "Сессия Telegram устарела" }, { status: 401 });
  }

  const answers = rec.answers;
  if (!validateAnswersForTest(testId, answers)) {
    return NextResponse.json({ error: "Не все вопросы отвечены" }, { status: 400 });
  }

  try {
    const forecast = await generateForecastFromAnswers(
      testId,
      answers as Record<string, AnswerBody>,
    );
    recordTestCompleted();
    return NextResponse.json(forecast);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка генерации";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
