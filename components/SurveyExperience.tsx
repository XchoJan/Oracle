"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForecastPayload } from "@/lib/forecast-schema";
import type { SurveyQuestion } from "@/lib/questions";
import { FORECAST_PRICE_STARS } from "@/lib/pricing";
import { ResultFeedback } from "@/components/ResultFeedback";
import { TestHub } from "@/components/TestHub";
import { getTest } from "@/lib/tests/catalog";
import type { TestDefinition, TestId } from "@/lib/tests/types";

type Yn = "yes" | "no";
type AnswerState = { yn: Yn | null; detail: string };
type Phase = "hub" | "survey" | "checkout" | "loading" | "result";

function initialAnswers(questions: SurveyQuestion[]): Record<string, AnswerState> {
  return Object.fromEntries(questions.map((q) => [q.id, { yn: null, detail: "" }]));
}

function collectAnswers(
  questions: SurveyQuestion[],
  answers: Record<string, AnswerState>,
): Record<string, { yn: Yn; detail?: string }> | null {
  const payload: Record<string, { yn: Yn; detail?: string }> = {};
  for (const q of questions) {
    const a = answers[q.id];
    if (!a?.yn) return null;
    payload[q.id] = { yn: a.yn, detail: a.detail.trim() || undefined };
  }
  return payload;
}

const allowFreeBrowser =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ALLOW_FREE_FORECAST === "true";

async function pollGenerate(sessionId: string, initData: string): Promise<ForecastPayload> {
  let lastErr = "Оплата не подтверждена";
  for (let i = 0; i < 24; i++) {
    const res = await fetch("/api/forecast/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, initData }),
    });
    const data = (await res.json()) as ForecastPayload & { error?: string; retry?: boolean };
    if (res.ok && "sections" in data) return data;
    if (res.status === 402 && data.retry) {
      lastErr = data.error ?? lastErr;
      await new Promise((r) => setTimeout(r, 350 + i * 50));
      continue;
    }
    throw new Error(data.error ?? "Ошибка генерации");
  }
  throw new Error(lastErr);
}

export function SurveyExperience() {
  const [phase, setPhase] = useState<Phase>("hub");
  const [activeTestId, setActiveTestId] = useState<TestId | null>(null);
  const [blockIndex, setBlockIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);
  const surveyScrollAnchorRef = useRef<HTMLDivElement>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [isTelegramUi, setIsTelegramUi] = useState(false);

  const activeTest: TestDefinition | null = activeTestId ? getTest(activeTestId) : null;
  const questions = activeTest?.questions ?? [];
  const blocks = activeTest?.blocks ?? [];

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    queueMicrotask(() => setIsTelegramUi(Boolean(tg?.initData)));
    if (!tg) return;
    tg.ready();
    tg.expand?.();
    tg.setHeaderColor?.("#030306");
    tg.setBackgroundColor?.("#030306");
  }, []);

  useEffect(() => {
    if (phase !== "survey") return;
    const run = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      surveyScrollAnchorRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    };
    requestAnimationFrame(run);
  }, [blockIndex, phase]);

  const startTest = useCallback((id: TestId) => {
    const test = getTest(id);
    if (!test) return;
    setActiveTestId(id);
    setAnswers(initialAnswers(test.questions));
    setBlockIndex(0);
    setForecast(null);
    setError(null);
    setPhase("survey");
  }, []);

  const resetHub = useCallback(() => {
    setActiveTestId(null);
    setAnswers({});
    setBlockIndex(0);
    setForecast(null);
    setError(null);
    setPhase("hub");
  }, []);

  const total = questions.length;
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id]?.yn !== null).length,
    [answers, questions],
  );

  const setYn = useCallback((id: string, yn: Yn) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], yn } }));
  }, []);

  const setDetail = useCallback((id: string, detail: string) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], detail } }));
  }, []);

  const currentBlock = blocks[blockIndex];
  const blockQuestions = currentBlock
    ? questions.slice(currentBlock.from, currentBlock.to)
    : [];
  const blockComplete = blockQuestions.every((q) => answers[q.id]?.yn !== null);
  const allComplete = questions.every((q) => answers[q.id]?.yn !== null);
  const progress = total ? Math.round((answeredCount / total) * 100) : 0;

  const goCheckout = useCallback(() => {
    if (!allComplete || activeTest?.tier !== "paid") return;
    setError(null);
    setPhase("checkout");
  }, [allComplete, activeTest]);

  async function submitFreeTest() {
    if (!activeTest || activeTest.tier !== "free") return;
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData?.trim() ?? "";
    const payload = collectAnswers(questions, answers);
    if (!payload || !initData) {
      setError("Откройте из Telegram Mini App.");
      return;
    }
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/forecast/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId: activeTest.id, initData, answers: payload }),
      });
      const data = (await res.json()) as ForecastPayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка запроса");
      setForecast(data);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сбой");
      setPhase("survey");
    }
  }

  async function startTelegramPayment() {
    if (!activeTest || activeTest.tier !== "paid") return;
    const tg = window.Telegram?.WebApp;
    tg?.ready?.();
    const initData = tg?.initData?.trim() ?? "";
    const payload = collectAnswers(questions, answers);
    const app = tg;
    if (!payload || !initData || !app?.openInvoice) {
      setError("Нет данных Telegram Mini App.");
      return;
    }
    setCheckoutBusy(true);
    setError(null);
    try {
      const prep = await fetch("/api/forecast/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          answers: payload,
          testId: activeTest.id,
        }),
      });
      const prepJson = (await prep.json()) as {
        sessionId?: string;
        invoiceUrl?: string;
        error?: string;
      };
      if (!prep.ok) throw new Error(prepJson.error ?? "Не удалось создать счёт");
      const sid = prepJson.sessionId;
      const url = prepJson.invoiceUrl;
      if (!sid || !url) throw new Error("Пустой ответ prepare");

      app.openInvoice(url, async (status) => {
        if (status === "paid") {
          setPhase("loading");
          try {
            const data = await pollGenerate(sid, app.initData);
            setForecast(data);
            setPhase("result");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка после оплаты");
            setPhase("checkout");
          }
        } else if (status === "failed") {
          setError("Оплата не прошла. Проверьте вебхук бота.");
        } else if (status === "cancelled") {
          setError(null);
        }
        setCheckoutBusy(false);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сбой");
      setCheckoutBusy(false);
    }
  }

  if (phase === "hub") {
    return <TestHub onSelect={startTest} />;
  }

  if (!activeTest) {
    return <TestHub onSelect={startTest} />;
  }

  if (phase === "checkout") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg border border-white/[0.08] bg-zinc-950/50 p-8 sm:p-10">
          <p className="fn-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500">Оплата</p>
          <h2 className="fn-serif mt-3 text-2xl text-zinc-50">{activeTest.title}</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            После оплаты Stars отчёт формируется автоматически.
          </p>
          <div className="fn-mono mt-8 border border-zinc-800 px-4 py-3 text-center text-sm text-zinc-200">
            {activeTest.priceStars} Telegram Stars
          </div>
          {error && (
            <div className="mt-6 border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            {isTelegramUi ? (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={() => void startTelegramPayment()}
                className="border border-sky-500/50 bg-sky-500/15 px-6 py-4 text-xs font-medium uppercase tracking-widest text-sky-50 transition enabled:hover:bg-sky-500/25 disabled:opacity-40"
              >
                {checkoutBusy ? "Открываем счёт…" : `Оплатить ${activeTest.priceStars} ★`}
              </button>
            ) : (
              <p className="text-sm text-zinc-500">Откройте из бота Telegram.</p>
            )}
            <button
              type="button"
              disabled={checkoutBusy}
              onClick={() => setPhase("survey")}
              className="text-xs uppercase tracking-widest text-zinc-600 hover:text-zinc-400"
            >
              Назад к вопросам
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="h-px w-48 animate-pulse bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
        <p className="fn-mono mt-8 text-xs uppercase tracking-[0.3em] text-zinc-500">
          Синтез сценария
        </p>
        <p className="mt-2 text-sm text-zinc-400">{activeTest.title}</p>
      </div>
    );
  }

  if (phase === "result" && forecast) {
    return (
      <div className="min-h-screen px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <header className="mb-16 border-b border-white/10 pb-10">
            <p className="fn-mono text-[11px] uppercase tracking-[0.35em] text-sky-400/80">
              {activeTest.tier === "free" ? "Мини-разбор" : "Итоговый разбор"}
            </p>
            <h2 className="fn-serif mt-3 text-3xl font-medium text-zinc-50 sm:text-4xl">
              {activeTest.resultTitle}
            </h2>
          </header>
          <div className="space-y-14">
            {forecast.sections.map((s) => (
              <article key={s.title} className="border-l border-sky-500/30 pl-6 sm:pl-8">
                <h3 className="fn-mono text-xs uppercase tracking-widest text-zinc-500">{s.title}</h3>
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-zinc-300">
                  {s.content}
                </p>
                {s.recommendations.length > 0 && (
                  <div className="mt-8 border-t border-white/[0.06] pt-8">
                    <p className="fn-mono text-[10px] uppercase tracking-[0.28em] text-sky-500/90">
                      Рекомендации
                    </p>
                    <ul className="mt-4 list-none space-y-3 text-[14px] leading-relaxed text-zinc-200">
                      {s.recommendations.map((item, idx) => (
                        <li key={`${s.title}-${idx}`} className="flex gap-3">
                          <span className="fn-mono mt-0.5 shrink-0 text-[11px] text-zinc-600">
                            {(idx + 1).toString().padStart(2, "0")}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
          {activeTest.tier === "paid" && <ResultFeedback />}
          {activeTest.tier === "free" && (
            <div className="border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-zinc-300">
              <p className="fn-mono text-[10px] uppercase tracking-widest text-amber-200/80">
                Полный протокол
              </p>
              <p className="mt-3 leading-relaxed">
                Это пробный срез. В платных тестах — в 2–3 раза больше вопросов, больше блоков и
                детальнее сценарий на 12–24 месяца.
              </p>
              <button
                type="button"
                onClick={resetHub}
                className="mt-4 border border-sky-500/40 px-6 py-3 text-xs uppercase tracking-widest text-sky-100"
              >
                Выбрать полный протокол · {FORECAST_PRICE_STARS} ★
              </button>
            </div>
          )}
          <footer className="mt-12 border-t border-white/10 pt-10">
            <p className="text-sm leading-relaxed text-zinc-500">{forecast.methodology_note}</p>
            <button
              type="button"
              onClick={resetHub}
              className="mt-8 border border-zinc-700 px-6 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              Другой тест
            </button>
          </footer>
        </div>
      </div>
    );
  }

  const isFree = activeTest.tier === "free";
  const qIndex = (id: string) => questions.findIndex((x) => x.id === id) + 1;

  return (
    <div className="min-h-screen pb-32 pt-8 sm:pt-12">
      <div ref={surveyScrollAnchorRef} className="h-px w-full scroll-mt-4" aria-hidden />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="mb-10">
          <button
            type="button"
            onClick={resetHub}
            className="fn-mono text-[10px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400"
          >
            ← Все тесты
          </button>
          <p className="fn-mono mt-4 text-[10px] uppercase tracking-[0.35em] text-sky-400/80">
            {activeTest.tagline}
          </p>
          <h2 className="fn-serif mt-2 text-2xl text-zinc-100">{activeTest.title}</h2>
          {currentBlock && (
            <p className="fn-mono mt-2 text-[10px] uppercase tracking-widest text-zinc-600">
              Блок {blockIndex + 1} / {blocks.length} · {currentBlock.title}
            </p>
          )}
          <div className="mt-6 w-full sm:max-w-[200px]">
            <div className="fn-mono flex justify-between text-[10px] uppercase tracking-widest text-zinc-600">
              <span>Прогресс</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-1 w-full bg-zinc-900">
              <div
                className="h-full bg-sky-500/70 transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-8 border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-10">
          {blockQuestions.map((q) => (
            <div key={q.id} className="border border-white/[0.06] bg-zinc-950/40 p-6 sm:p-8">
              <p className="fn-mono text-[10px] text-zinc-600">
                Вопрос {qIndex(q.id)} / {total}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-200">{q.text}</p>
              {q.context && (
                <p className="mt-3 border-l border-amber-500/30 pl-3 text-xs text-amber-200/70">
                  {q.context}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {(["yes", "no"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setYn(q.id, key)}
                    className={`min-w-[100px] border px-5 py-2.5 text-xs font-medium uppercase tracking-widest transition ${
                      answers[q.id]?.yn === key
                        ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    }`}
                  >
                    {key === "yes" ? "Да" : "Нет"}
                  </button>
                ))}
              </div>
              <label className="mt-6 block">
                <span className="fn-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Уточнение — необязательно
                </span>
                <textarea
                  value={answers[q.id]?.detail ?? ""}
                  onChange={(e) => setDetail(q.id, e.target.value)}
                  rows={2}
                  className="mt-2 w-full resize-y border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 focus:border-sky-500/40 focus:outline-none"
                />
              </label>
            </div>
          ))}
        </div>

        <nav className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            disabled={blockIndex === 0}
            onClick={() => setBlockIndex((i) => Math.max(0, i - 1))}
            className="border border-zinc-800 px-6 py-3 text-xs uppercase tracking-widest text-zinc-500 disabled:opacity-30"
          >
            Назад
          </button>
          {blockIndex < blocks.length - 1 ? (
            <button
              type="button"
              disabled={!blockComplete}
              onClick={() => blockComplete && setBlockIndex((i) => i + 1)}
              className="border border-sky-600/40 bg-sky-500/10 px-8 py-3 text-xs uppercase tracking-widest text-sky-100 disabled:opacity-30"
            >
              Далее
            </button>
          ) : isFree ? (
            <button
              type="button"
              disabled={!allComplete}
              onClick={() => void submitFreeTest()}
              className="border border-emerald-500/50 bg-emerald-500/15 px-8 py-3 text-xs uppercase tracking-widest text-emerald-50 disabled:opacity-30"
            >
              Получить мини-разбор
            </button>
          ) : (
            <button
              type="button"
              disabled={!allComplete}
              onClick={goCheckout}
              className="border border-sky-500/50 bg-sky-500/15 px-8 py-3 text-xs uppercase tracking-widest text-sky-50 disabled:opacity-30"
            >
              К оплате · {activeTest.priceStars} ★
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
