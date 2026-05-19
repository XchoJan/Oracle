import type { AnswerBody } from "@/lib/answers-types";
import { getTest, isTestId } from "@/lib/tests/catalog";
import type { TestId } from "@/lib/tests/types";
import type { SurveyQuestion } from "@/lib/questions";

export type { AnswerBody } from "@/lib/answers-types";

export function isAnswerBody(v: unknown): v is AnswerBody {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.yn === "yes" || o.yn === "no";
}

export function validateAnswersForTest(
  testId: string,
  body: unknown,
): body is Record<string, AnswerBody> {
  const test = getTest(testId);
  if (!test || !body || typeof body !== "object") return false;
  const rec = body as Record<string, unknown>;
  for (const q of test.questions) {
    if (!isAnswerBody(rec[q.id])) return false;
  }
  return true;
}

/** @deprecated используйте validateAnswersForTest("paid_map24", body) */
export function validateAnswers(body: unknown): body is Record<string, AnswerBody> {
  return validateAnswersForTest("paid_map24", body);
}

export function buildQaBlock(
  questions: SurveyQuestion[],
  answers: Record<string, AnswerBody>,
): string {
  return questions
    .map((q) => {
      const a = answers[q.id];
      if (!a) return "";
      const yn = a.yn === "yes" ? "Да" : "Нет";
      const base = `${q.text}\nОтвет: ${yn}`;
      const d = a.detail?.trim();
      return d ? `${base}\nУточнение: ${d}` : base;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function parseTestIdFromBody(rec: Record<string, unknown>): TestId | null {
  const id = rec.testId;
  return typeof id === "string" && isTestId(id) ? id : null;
}
