"use client";

import { useEffect, useRef, useState } from "react";

type Stats = { launches: number; completedTests: number; likesCount: number };

function formatCount(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

function peopleWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "человек";
  if (mod10 === 1) return "человек";
  if (mod10 >= 2 && mod10 <= 4) return "человека";
  return "человек";
}

export function IntroStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const launchSent = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!launchSent.current) {
          launchSent.current = true;
          const inc = await fetch("/api/stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "launch" }),
          });
          if (inc.ok) {
            const data = (await inc.json()) as Stats;
            if (!cancelled) setStats(data);
            return;
          }
        }
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok && !cancelled) {
          setStats((await res.json()) as Stats);
        }
      } catch {
        /* счётчики необязательны для UX */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) {
    return (
      <div className="mx-auto mt-10 w-full max-w-lg space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <div className="h-14 animate-pulse border border-white/[0.06] bg-zinc-950/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-lg space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="Запусков"
          value={formatCount(stats.launches)}
          hint="Запусков приложения"
          accent="sky"
        />
        <StatCard
          label="Завершено"
          value={formatCount(stats.completedTests)}
          hint="полных прохождений"
          accent="amber"
        />
      </div>
      <LikesBanner count={stats.likesCount} />
    </div>
  );
}

function LikesBanner({ count }: { count: number }) {
  return (
    <div className="relative overflow-hidden border border-emerald-500/25 bg-emerald-500/5 px-5 py-4 text-center sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(52,211,153,0.1),transparent)]" />
      <p className="fn-mono relative text-[10px] uppercase tracking-[0.28em] text-emerald-400/80">
        Оценка пользователей
      </p>
      <p className="fn-serif relative mt-2 text-lg font-medium leading-snug text-zinc-100 sm:text-xl">
        Понравилось{" "}
        <span className="tabular-nums text-emerald-200">{formatCount(count)}</span>{" "}
        {peopleWord(count)}
      </p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="border border-white/[0.06] bg-zinc-950/50 px-4 py-5 sm:px-5 sm:py-6">
      <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
      <div className="mt-4 h-9 w-20 animate-pulse rounded bg-zinc-800/80" />
      <div className="mt-2 h-2 w-24 animate-pulse rounded bg-zinc-900" />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: "sky" | "amber";
}) {
  const border = accent === "sky" ? "border-sky-500/20" : "border-amber-500/20";
  const glow =
    accent === "sky"
      ? "bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(56,189,248,0.08),transparent)]"
      : "bg-[radial-gradient(ellipse_80%_80%_at_50%_0%,rgba(251,191,36,0.08),transparent)]";
  const valueColor = accent === "sky" ? "text-sky-100" : "text-amber-100";

  return (
    <div
      className={`relative overflow-hidden border ${border} bg-zinc-950/60 px-4 py-5 text-left sm:px-5 sm:py-6`}
    >
      <div className={`pointer-events-none absolute inset-0 ${glow}`} />
      <p className="fn-mono relative text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        {label}
      </p>
      <p
        className={`fn-serif relative mt-3 text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl ${valueColor}`}
      >
        {value}
      </p>
      <p className="relative mt-1.5 text-[11px] leading-snug text-zinc-600">{hint}</p>
    </div>
  );
}
