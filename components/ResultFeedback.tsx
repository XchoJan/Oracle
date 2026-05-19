"use client";

import { useState } from "react";

type Rating = "like" | "dislike";

export function ResultFeedback() {
  const [rating, setRating] = useState<Rating | null>(null);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!rating || submitting || submitted) return;
    setError(null);
    setSubmitting(true);
    try {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user as { id?: number } | undefined;
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          reviewText: review.trim() || undefined,
          telegramUserId: typeof tgUser?.id === "number" ? tgUser.id : undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось отправить");
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="mt-16 border border-emerald-500/20 bg-emerald-500/5 px-6 py-8 sm:px-8">
        <p className="fn-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400/90">
          Спасибо
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          Отзыв сохранён. Он помогает улучшать протокол и формулировки отчёта.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-16 border border-white/[0.08] bg-zinc-950/40 px-6 py-8 sm:px-8">
      <p className="fn-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        Оценка отчёта
      </p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Насколько полезен был разбор? При желании оставьте короткий комментарий.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <RatingButton
          active={rating === "like"}
          label="Полезно"
          onClick={() => setRating("like")}
          variant="like"
        />
        <RatingButton
          active={rating === "dislike"}
          label="Не полезно"
          onClick={() => setRating("dislike")}
          variant="dislike"
        />
      </div>

      <label className="mt-8 block">
        <span className="fn-mono text-[10px] uppercase tracking-widest text-zinc-600">
          Отзыв — необязательно
        </span>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Что сработало, чего не хватило, что было неточным…"
          className="mt-2 w-full resize-y border border-zinc-800 bg-black/40 px-3 py-3 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-700 focus:border-sky-500/40 focus:outline-none"
        />
        <span className="mt-1 block text-right text-[10px] text-zinc-600">
          {review.length} / 2000
        </span>
      </label>

      {error && (
        <p className="mt-4 border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!rating || submitting}
        onClick={() => void handleSubmit()}
        className="mt-6 w-full border border-sky-500/40 bg-sky-500/10 px-6 py-3.5 text-xs font-medium uppercase tracking-widest text-sky-100 transition enabled:hover:bg-sky-500/20 disabled:opacity-40 sm:w-auto"
      >
        {submitting ? "Отправка…" : "Отправить оценку"}
      </button>
    </section>
  );
}

function RatingButton({
  active,
  label,
  onClick,
  variant,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  variant: Rating;
}) {
  const likeActive = variant === "like" && active;
  const dislikeActive = variant === "dislike" && active;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[140px] flex-1 items-center justify-center gap-2 border px-5 py-3 text-xs font-medium uppercase tracking-widest transition sm:flex-none ${
        likeActive
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-100"
          : dislikeActive
            ? "border-red-500/40 bg-red-950/40 text-red-200"
            : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
      }`}
    >
      <span className="text-base leading-none" aria-hidden>
        {variant === "like" ? "↑" : "↓"}
      </span>
      {label}
    </button>
  );
}
