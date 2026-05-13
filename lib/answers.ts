import { SURVEY_QUESTIONS } from "@/lib/questions";

export type AnswerBody = {
  yn: "yes" | "no";
  detail?: string;
};

export function isAnswerBody(v: unknown): v is AnswerBody {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.yn === "yes" || o.yn === "no";
}

export function validateAnswers(body: unknown): body is Record<string, AnswerBody> {
  if (!body || typeof body !== "object") return false;
  const rec = body as Record<string, unknown>;
  for (const q of SURVEY_QUESTIONS) {
    if (!isAnswerBody(rec[q.id])) return false;
  }
  return true;
}

export function buildQaBlock(answers: Record<string, AnswerBody>): string {
  return SURVEY_QUESTIONS.map((q) => {
    const a = answers[q.id];
    const yn = a.yn === "yes" ? "Да" : "Нет";
    const base = `${q.text}\nОтвет: ${yn}`;
    const d = a.detail?.trim();
    return d ? `${base}\nУточнение: ${d}` : base;
  }).join("\n\n");
}
