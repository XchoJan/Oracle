"use client";

import { getBotTelegramUrl, getBotUsername } from "@/lib/bot-links";
import { telegramStarsLabel } from "@/lib/pricing";
import { FREE_TESTS, PAID_TESTS } from "@/lib/tests/catalog";

function BotLink({
  children,
  className,
  start,
}: {
  children: React.ReactNode;
  className?: string;
  start?: string;
}) {
  return (
    <a href={getBotTelegramUrl(start)} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export function LandingPage() {
  const botUser = getBotUsername();

  return (
    <div className="min-h-screen text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-15%,rgba(56,189,248,0.14),transparent)]" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="fn-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500">Echo Oracle</span>
        <BotLink
          start="landing"
          className="fn-mono text-[10px] uppercase tracking-widest text-sky-400/90 hover:text-sky-300"
        >
          @{botUser}
        </BotLink>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <section className="pt-6 sm:pt-12">
          <p className="fn-mono text-[11px] uppercase tracking-[0.35em] text-sky-400/85">
            Прогностическая карта
          </p>
          <h1 className="fn-serif mt-5 max-w-3xl text-4xl font-medium leading-tight text-zinc-50 sm:text-5xl">
            Сначала попробуйте бесплатно — потом полный протокол
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            В боте: 3 коротких теста по 12 вопросов и платные глубокие разборы. Тот же формат «да / нет»,
            холодный аналитический тон.
          </p>
          <BotLink
            start="landing"
            className="mt-10 inline-flex border border-sky-500/45 bg-sky-500/12 px-8 py-4 text-sm font-medium uppercase tracking-widest text-sky-50"
          >
            Открыть в Telegram →
          </BotLink>
        </section>

        <section className="mt-20">
          <h2 className="fn-serif text-2xl text-zinc-100">Пробные разборы · бесплатно</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {FREE_TESTS.map((t) => (
              <li key={t.id} className="border border-white/[0.07] bg-zinc-950/40 p-4">
                <p className="fn-mono text-[10px] uppercase text-emerald-400/90">0 ★</p>
                <p className="fn-serif mt-2 font-medium text-zinc-100">{t.title}</p>
                <p className="mt-2 text-xs text-zinc-500">{t.durationHint}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 border-t border-white/[0.06] pt-14">
          <h2 className="fn-serif text-2xl text-zinc-100">Полные протоколы</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Больше вопросов → точнее сценарий и детальнее шаги. Каждый отчёт —{" "}
            <span className="text-zinc-200">{telegramStarsLabel()}</span>.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {PAID_TESTS.map((t) => (
              <li
                key={t.id}
                className="border border-amber-500/20 bg-amber-500/[0.04] p-4"
              >
                <p className="fn-mono text-[10px] text-amber-300/90">{t.priceStars} ★</p>
                <p className="fn-serif mt-2 font-medium text-zinc-100">{t.title}</p>
                <p className="mt-2 text-xs text-zinc-500">{t.tagline}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
