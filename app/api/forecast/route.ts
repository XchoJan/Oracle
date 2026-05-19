import { NextRequest, NextResponse } from "next/server";
import { validateAnswersForTest } from "@/lib/answers";
import { generateForecastFromAnswers } from "@/lib/generate-forecast";

/** Только для локальной отладки в браузере без Telegram. В продакшене не включать. */
function allowFreeForecast(): boolean {
  return process.env.ALLOW_FREE_FORECAST === "true";
}

export async function POST(req: NextRequest) {
  if (!allowFreeForecast()) {
    return NextResponse.json(
      { error: "Прямой доступ отключён. Используйте Telegram Mini App и оплату Stars." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  if (!validateAnswersForTest("paid_map24", body)) {
    return NextResponse.json(
      { error: "Не все вопросы отвечены или формат ответа неверный" },
      { status: 400 },
    );
  }

  try {
    const forecast = await generateForecastFromAnswers("paid_map24", body);
    return NextResponse.json(forecast);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
