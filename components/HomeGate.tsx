"use client";

import { useEffect, useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import { SurveyExperience } from "@/components/SurveyExperience";

type Mode = "detect" | "app" | "landing";

/** В Telegram — Mini App. В браузере — лендинг с воронкой в бота. */
export function HomeGate() {
  const [mode, setMode] = useState<Mode>("detect");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    queueMicrotask(() => {
      setMode(tg?.initData?.trim() ? "app" : "landing");
    });
  }, []);

  if (mode === "detect") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030306]">
        <div className="h-px w-32 animate-pulse bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
      </div>
    );
  }

  if (mode === "app") return <SurveyExperience />;
  return <LandingPage />;
}
