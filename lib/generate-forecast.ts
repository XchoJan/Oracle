import OpenAI from "openai";
import type { ForecastPayload } from "@/lib/forecast-schema";
import type { AnswerBody } from "@/lib/answers-types";
import { buildQaBlock } from "@/lib/answers";
import { getTest } from "@/lib/tests/catalog";
import type { ReportSpec, TestId } from "@/lib/tests/types";

function validatePayload(parsed: ForecastPayload, spec: ReportSpec): void {
  if (!Array.isArray(parsed.sections) || typeof parsed.methodology_note !== "string") {
    throw new Error("Некорректная структура ответа модели");
  }
  if (
    parsed.sections.length < spec.minSections ||
    parsed.sections.length > spec.maxSections
  ) {
    throw new Error("Неверное число секций в ответе модели");
  }
  for (const s of parsed.sections) {
    if (typeof s.title !== "string" || typeof s.content !== "string") {
      throw new Error("Некорректная секция ответа модели");
    }
    if (
      !Array.isArray(s.recommendations) ||
      s.recommendations.length !== spec.recsPerSection ||
      !s.recommendations.every((r) => typeof r === "string" && r.trim().length > 0)
    ) {
      throw new Error(`У каждой секции должно быть ровно ${spec.recsPerSection} рекомендаций`);
    }
  }
}

export async function generateForecastFromAnswers(
  testId: TestId,
  answers: Record<string, AnswerBody>,
): Promise<ForecastPayload> {
  const test = getTest(testId);
  if (!test) throw new Error("Неизвестный тест");

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Сервер не настроен: отсутствует OPENAI_API_KEY");
  }

  const qaText = buildQaBlock(test.questions, answers);
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const openai = new OpenAI({ apiKey: key });

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content: `Ты аналитик поведенческих и жизненных траекторий. Тема отчёта: «${test.title}». Опирайся только на опросник. Не выдумывай факты. ${test.report.jsonInstruction}`,
      },
      {
        role: "user",
        content: `Материал опросника (самоотчёт):\n\n${qaText}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Пустой ответ модели");

  const parsed = JSON.parse(raw) as ForecastPayload;
  validatePayload(parsed, test.report);
  return parsed;
}
