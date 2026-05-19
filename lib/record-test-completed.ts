import { incrementAppStat } from "@/lib/app-stats";

/** +1 к счётчику «прошли тест» на главной и в API stats. */
export function recordTestCompleted(): void {
  void incrementAppStat("completed").catch((e) =>
    console.warn("[stats] completed increment failed:", e),
  );
}
