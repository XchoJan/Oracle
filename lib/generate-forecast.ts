import OpenAI from "openai";
import type { ForecastPayload } from "@/lib/forecast-schema";
import { FORECAST_JSON_INSTRUCTION } from "@/lib/forecast-schema";
import type { AnswerBody } from "@/lib/answers";
import { buildQaBlock } from "@/lib/answers";

export async function generateForecastFromAnswers(
  answers: Record<string, AnswerBody>,
): Promise<ForecastPayload> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Сервер не настроен: отсутствует OPENAI_API_KEY");
  }
  const qaText = buildQaBlock(answers);
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const openai = new OpenAI({ apiKey: key });

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content: `Ты аналитик поведенческих и жизненных траекторий. Опирайся только на текст опросника. Не выдумывай факты вне опроса. ${FORECAST_JSON_INSTRUCTION}`,
      },
      {
        role: "user",
        content: `Материал опросника (самоотчёт):\n\n${qaText}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Пустой ответ модели");
  }

  const parsed = JSON.parse(raw) as ForecastPayload;
  if (!Array.isArray(parsed.sections) || typeof parsed.methodology_note !== "string") {
    throw new Error("Некорректная структура ответа модели");
  }
  return parsed;
}
