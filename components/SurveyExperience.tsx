"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ForecastPayload } from "@/lib/forecast-schema";
import { FORECAST_PRICE_STARS } from "@/lib/pricing";
import { SURVEY_QUESTIONS } from "@/lib/questions";

type Yn = "yes" | "no";
type AnswerState = { yn: Yn | null; detail: string };

const BLOCKS = [
  { title: "I — Соматика и наблюдение", from: 0, to: 6 },
  { title: "II — Занятость и финансы", from: 6, to: 12 },
  { title: "III — Отношения и границы", from: 12, to: 18 },
  { title: "IV — Стресс и регуляция", from: 18, to: 24 },
  { title: "V — Работа и быт", from: 24, to: 30 },
  { title: "VI — Риски и контроль", from: 30, to: 36 },
] as const;

function initialAnswers(): Record<string, AnswerState> {
  return Object.fromEntries(
    SURVEY_QUESTIONS.map((q) => [q.id, { yn: null, detail: "" }]),
  );
}

function collectAnswers(answers: Record<string, AnswerState>): Record<string, { yn: Yn; detail?: string }> | null {
  const payload: Record<string, { yn: Yn; detail?: string }> = {};
  for (const q of SURVEY_QUESTIONS) {
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
    if (res.ok && "sections" in data) {
      return data;
    }
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
  const [phase, setPhase] = useState<
    "intro" | "survey" | "checkout" | "loading" | "result"
  >("intro");
  const [blockIndex, setBlockIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [isTelegramUi, setIsTelegramUi] = useState(false);

  const total = SURVEY_QUESTIONS.length;
  const answeredCount = useMemo(
    () => SURVEY_QUESTIONS.filter((q) => answers[q.id]?.yn !== null).length,
    [answers],
  );

  const isTelegram = isTelegramUi;

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    queueMicrotask(() => {
      setIsTelegramUi(Boolean(tg?.initData));
    });
    if (!tg) return;
    tg.ready();
    tg.expand?.();
    tg.setHeaderColor?.("#030306");
    tg.setBackgroundColor?.("#030306");
  }, []);

  const setYn = useCallback((id: string, yn: Yn) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...prev[id], yn },
    }));
  }, []);

  const setDetail = useCallback((id: string, detail: string) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...prev[id], detail },
    }));
  }, []);

  const currentBlock = BLOCKS[blockIndex];
  const blockQuestions = SURVEY_QUESTIONS.slice(currentBlock.from, currentBlock.to);

  const blockComplete = blockQuestions.every((q) => answers[q.id]?.yn !== null);
  const allComplete = SURVEY_QUESTIONS.every((q) => answers[q.id]?.yn !== null);

  const progress = Math.round((answeredCount / total) * 100);

  const goCheckout = useCallback(() => {
    if (!allComplete) return;
    setError(null);
    setPhase("checkout");
  }, [allComplete]);

  async function submitFreeForecast() {
    const payload = collectAnswers(answers);
    if (!payload) return;
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ForecastPayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка запроса");
      setForecast(data);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сбой соединения");
      setPhase("checkout");
    }
  }

  async function startTelegramPayment() {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData ?? "";
    const payload = collectAnswers(answers);
    const app = tg;
    if (!payload || !initData || !app?.openInvoice) {
      setError("Нет данных Telegram Mini App. Откройте ссылку из бота.");
      return;
    }
    setCheckoutBusy(true);
    setError(null);
    try {
      const prep = await fetch("/api/forecast/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, answers: payload }),
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
          setError("Оплата не прошла");
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

  if (phase === "intro") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.12),transparent)]" />
        <div className="relative max-w-2xl text-center">
          <p className="fn-mono mb-4 text-[11px] uppercase tracking-[0.35em] text-sky-400/90">
            Протокол самоотчёта · горизонт 24 мес. · Telegram Mini App
          </p>
          <h1 className="fn-serif text-balance text-4xl font-medium tracking-tight text-zinc-50 sm:text-5xl">
            Прогностическая карта
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-400">
            36 вопросов с фиксированными ответами и полем уточнения. После заполнения — оплата{" "}
            <span className="text-zinc-200">{FORECAST_PRICE_STARS} Telegram Stars</span>, затем
            генерация условного сценария на два года. Без мотивационных клише; не медицинское и не
            юридическое заключение.
          </p>
          <div className="mx-auto mt-8 flex flex-col items-center gap-1 border border-amber-500/25 bg-amber-500/5 px-8 py-4 sm:gap-2">
            <p className="fn-mono text-[10px] uppercase tracking-[0.28em] text-amber-200/75">
              Стоимость
            </p>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <span className="fn-serif text-4xl font-semibold tabular-nums tracking-tight text-amber-50 sm:text-2xl">
                {FORECAST_PRICE_STARS}
              </span>
              <span
                className="select-none text-6xl leading-none text-amber-300 drop-shadow-[0_0_24px_rgba(251,191,36,0.35)] sm:text-2xl sm:leading-none"
                aria-hidden
              >
                ★
              </span>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => setPhase("survey")}
              className="group relative overflow-hidden rounded-none border border-sky-500/40 bg-sky-500/10 px-10 py-4 text-sm font-medium uppercase tracking-widest text-sky-100 transition hover:border-sky-400/60 hover:bg-sky-500/20"
            >
              <span className="relative z-10">Начать опрос</span>
              <span className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition group-hover:translate-x-[100%] duration-700" />
            </button>
            <p className="max-w-xs text-left text-xs leading-relaxed text-zinc-600 sm:text-right">
              Время: 12–22 мин. Отвечайте в спокойной обстановке.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "checkout") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg border border-white/[0.08] bg-zinc-950/50 p-8 sm:p-10">
          <p className="fn-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500">Оплата</p>
          <h2 className="fn-serif mt-3 text-2xl text-zinc-50">Доступ к отчёту</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Откроется стандартное окно Telegram. После успешной оплаты Stars отчёт формируется
            автоматически (обычно до минуты).
          </p>
          <div className="fn-mono mt-8 border border-zinc-800 px-4 py-3 text-center text-sm text-zinc-200">
            {FORECAST_PRICE_STARS} Telegram Stars
          </div>
          {error && (
            <div className="mt-6 border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            {isTelegram ? (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={() => void startTelegramPayment()}
                className="border border-sky-500/50 bg-sky-500/15 px-6 py-4 text-xs font-medium uppercase tracking-widest text-sky-50 transition enabled:hover:bg-sky-500/25 disabled:opacity-40"
              >
                {checkoutBusy ? "Открываем счёт…" : `Оплатить ${FORECAST_PRICE_STARS} ★`}
              </button>
            ) : (
              <p className="text-sm text-zinc-500">
                Мини-приложение не внутри Telegram (нет initData). Откройте тест из бота через кнопку
                Mini App.
              </p>
            )}
            {allowFreeBrowser && (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={() => void submitFreeForecast()}
                className="border border-zinc-700 px-6 py-3 text-xs uppercase tracking-widest text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
              >
                Dev: без оплаты
              </button>
            )}
            <button
              type="button"
              disabled={checkoutBusy}
              onClick={() => setPhase("survey")}
              className="text-xs uppercase tracking-widest text-zinc-600 underline-offset-4 hover:text-zinc-400 hover:underline"
            >
              Вернуться к вопросам
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
        <p className="mt-2 text-sm text-zinc-400">Обычно 15–60 секунд</p>
      </div>
    );
  }

  if (phase === "result" && forecast) {
    return (
      <div className="min-h-screen px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <header className="mb-16 border-b border-white/10 pb-10">
            <p className="fn-mono text-[11px] uppercase tracking-[0.35em] text-sky-400/80">
              Итоговый разбор
            </p>
            <h2 className="fn-serif mt-3 text-3xl font-medium text-zinc-50 sm:text-4xl">
              Горизонт 24 месяца
            </h2>
          </header>
          <div className="space-y-14">
            {forecast.sections.map((s) => (
              <article
                key={s.title}
                className="border-l border-sky-500/30 pl-6 sm:pl-8"
              >
                <h3 className="fn-mono text-xs uppercase tracking-widest text-zinc-500">
                  {s.title}
                </h3>
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-zinc-300">
                  {s.content}
                </p>
              </article>
            ))}
          </div>
          <footer className="mt-20 border-t border-white/10 pt-10">
            <p className="text-sm leading-relaxed text-zinc-500">{forecast.methodology_note}</p>
            <button
              type="button"
              onClick={() => {
                setAnswers(initialAnswers());
                setBlockIndex(0);
                setForecast(null);
                setPhase("intro");
              }}
              className="mt-8 border border-zinc-700 px-6 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              Новый проход
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 pt-8 sm:pt-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="fn-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">
              Блок {blockIndex + 1} / {BLOCKS.length}
            </p>
            <h2 className="fn-serif mt-1 text-2xl text-zinc-100">{currentBlock.title}</h2>
          </div>
          <div className="w-full sm:max-w-[200px]">
            <div className="fn-mono flex justify-between text-[10px] uppercase tracking-widest text-zinc-600">
              <span>Прогресс</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-1 w-full bg-zinc-900">
              <div
                className="h-full bg-sky-500/70 transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        {error && phase === "survey" && (
          <div className="mb-8 border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-10">
          {blockQuestions.map((q, i) => (
            <div
              key={q.id}
              className="border border-white/[0.06] bg-zinc-950/40 p-6 sm:p-8"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <p className="fn-mono text-[10px] text-zinc-600">
                Вопрос {SURVEY_QUESTIONS.findIndex((x) => x.id === q.id) + 1} / {total}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-zinc-200">{q.text}</p>
              {q.context && (
                <p className="mt-3 border-l border-amber-500/30 pl-3 text-xs leading-relaxed text-amber-200/70">
                  {q.context}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {(
                  [
                    { key: "yes" as const, label: "Да" },
                    { key: "no" as const, label: "Нет" },
                  ] as const
                ).map(({ key, label }) => {
                  const active = answers[q.id]?.yn === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setYn(q.id, key)}
                      className={`min-w-[100px] border px-5 py-2.5 text-xs font-medium uppercase tracking-widest transition ${
                        active
                          ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                          : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <label className="mt-6 block">
                <span className="fn-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  Уточнение — необязательно
                </span>
                <textarea
                  value={answers[q.id]?.detail ?? ""}
                  onChange={(e) => setDetail(q.id, e.target.value)}
                  rows={2}
                  placeholder="Контекст, который снижает двусмысленность ответа"
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
            onClick={() => setBlockIndex((idx) => Math.max(0, idx - 1))}
            className="border border-zinc-800 px-6 py-3 text-xs font-medium uppercase tracking-widest text-zinc-500 transition enabled:hover:border-zinc-600 enabled:hover:text-zinc-300 disabled:opacity-30"
          >
            Назад
          </button>
          {blockIndex < BLOCKS.length - 1 ? (
            <button
              type="button"
              disabled={!blockComplete}
              onClick={() => blockComplete && setBlockIndex((idx) => idx + 1)}
              className="border border-sky-600/40 bg-sky-500/10 px-8 py-3 text-xs font-medium uppercase tracking-widest text-sky-100 transition enabled:hover:bg-sky-500/20 disabled:opacity-30"
            >
              Далее
            </button>
          ) : (
            <button
              type="button"
              disabled={!allComplete}
              onClick={goCheckout}
              className="border border-sky-500/50 bg-sky-500/15 px-8 py-3 text-xs font-medium uppercase tracking-widest text-sky-50 transition enabled:hover:bg-sky-500/25 disabled:opacity-30"
            >
              К оплате · {FORECAST_PRICE_STARS} ★
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
