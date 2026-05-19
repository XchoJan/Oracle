"use client";

import { IntroStats } from "@/components/IntroStats";
import { telegramStarsLabel } from "@/lib/pricing";
import { FREE_TESTS, PAID_TESTS } from "@/lib/tests/catalog";
import type { TestDefinition, TestId } from "@/lib/tests/types";

type Props = {
  onSelect: (id: TestId) => void;
};

function TestCard({
  test,
  onSelect,
  variant,
}: {
  test: TestDefinition;
  onSelect: (id: TestId) => void;
  variant: "free" | "paid";
}) {
  const isPaid = variant === "paid";
  return (
    <button
      type="button"
      onClick={() => onSelect(test.id)}
      className={`group w-full border p-5 text-left transition ${
        isPaid
          ? "border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-400/40 hover:bg-amber-500/[0.07]"
          : "border-white/[0.08] bg-zinc-950/50 hover:border-sky-500/30 hover:bg-sky-500/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="fn-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          {test.tagline}
        </p>
        {isPaid ? (
          <span className="fn-mono shrink-0 text-[10px] text-amber-300/90">
            {test.priceStars} ★
          </span>
        ) : (
          <span className="fn-mono shrink-0 text-[10px] uppercase tracking-widest text-emerald-400/90">
            Бесплатно
          </span>
        )}
      </div>
      <h3 className="fn-serif mt-3 text-lg font-medium text-zinc-50 group-hover:text-white">
        {test.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{test.introLine}</p>
      <p className="fn-mono mt-4 text-[10px] uppercase tracking-widest text-zinc-600">
        {test.durationHint} →
      </p>
    </button>
  );
}

export function TestHub({ onSelect }: Props) {
  return (
    <div className="relative min-h-screen px-4 py-12 sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.12),transparent)]" />
      <div className="relative mx-auto max-w-3xl">
        <p className="fn-mono text-[11px] uppercase tracking-[0.35em] text-sky-400/90">
          Echo Oracle · Telegram Mini App
        </p>
        <h1 className="fn-serif mt-4 text-balance text-3xl font-medium tracking-tight text-zinc-50 sm:text-4xl">
          Прогностическая карта
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
          Сначала — короткие срезы бесплатно. Потом полные протоколы: больше вопросов, глубже
          сценарий, точнее шаги.
        </p>
        <IntroStats />

        <section className="mt-14">
          <h2 className="fn-serif text-xl text-zinc-100">Пробные разборы</h2>
          <p className="mt-2 text-sm text-zinc-500">
            12 вопросов · мини-отчёт сразу · почувствуете формат до оплаты
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-1">
            {FREE_TESTS.map((t) => (
              <TestCard key={t.id} test={t} onSelect={onSelect} variant="free" />
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-white/[0.06] pt-14">
          <h2 className="fn-serif text-xl text-zinc-100">Полные протоколы</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Платные тесты строятся на большем числе вопросов и дают{" "}
            <span className="text-zinc-200">более точный и детальный</span> разбор: больше блоков,
            больше рекомендаций, горизонт до 24 месяцев. Это не «ещё один гороскоп» — тот же
            холодный аналитический стиль, но с полной картиной.
          </p>
          <p className="fn-mono mt-4 text-[10px] uppercase tracking-[0.28em] text-amber-200/70">
            {telegramStarsLabel()} за каждый полный отчёт
          </p>
          <div className="mt-6 grid gap-3">
            {PAID_TESTS.map((t) => (
              <TestCard key={t.id} test={t} onSelect={onSelect} variant="paid" />
            ))}
          </div>
        </section>

        <p className="fn-mono mt-12 text-center text-[10px] leading-relaxed text-zinc-600">
          Не медицинское и не финансовое заключение · вероятностная модель по самоотчёту
        </p>
      </div>
    </div>
  );
}
