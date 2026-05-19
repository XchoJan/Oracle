import { getFeedbackLikesCount } from "@/lib/test-feedback";
import { supabaseEnv, supabaseFetch } from "@/lib/supabase-rest";

export type AppStats = {
  launches: number;
  completedTests: number;
  likesCount: number;
};

const STATS_ROW_ID = "main";

/** In-memory fallback, если Supabase не настроен (локальная разработка). */
const memoryStats: AppStats = { launches: 0, completedTests: 0, likesCount: 0 };

async function withLikes(base: Omit<AppStats, "likesCount">): Promise<AppStats> {
  const likesCount = await getFeedbackLikesCount();
  return { ...base, likesCount };
}

export async function getAppStats(): Promise<AppStats> {
  if (!supabaseEnv()) {
    return { ...memoryStats };
  }
  const res = await supabaseFetch(
    `/rest/v1/app_global_stats?id=eq.${STATS_ROW_ID}&select=launches,completed_tests&limit=1`,
    { method: "GET", headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    console.warn("[app_stats] read failed:", res.status, await res.text());
    return { ...memoryStats };
  }
  const rows = (await res.json()) as Array<{
    launches: number;
    completed_tests: number;
  }>;
  const row = rows[0];
  if (!row) {
    return withLikes({ launches: 0, completedTests: 0 });
  }
  return withLikes({
    launches: Number(row.launches) || 0,
    completedTests: Number(row.completed_tests) || 0,
  });
}

export type StatEvent = "launch" | "completed";

export async function incrementAppStat(event: StatEvent): Promise<AppStats> {
  if (!supabaseEnv()) {
    if (event === "launch") memoryStats.launches += 1;
    else memoryStats.completedTests += 1;
    return { ...memoryStats, likesCount: memoryStats.likesCount };
  }

  const field = event === "launch" ? "launches" : "completed_tests";
  const res = await supabaseFetch("/rest/v1/rpc/increment_app_stat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_field: field }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn("[app_stats] increment failed:", res.status, text);
    if (event === "launch") memoryStats.launches += 1;
    else memoryStats.completedTests += 1;
    return withLikes({
      launches: memoryStats.launches,
      completedTests: memoryStats.completedTests,
    });
  }

  const data = (await res.json()) as {
    launches?: number;
    completed_tests?: number;
  } | null;

  if (data && typeof data === "object") {
    return withLikes({
      launches: Number(data.launches) || 0,
      completedTests: Number(data.completed_tests) || 0,
    });
  }

  return getAppStats();
}
