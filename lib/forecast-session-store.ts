import type { AnswerBody } from "@/lib/answers-types";
import type { TestId } from "@/lib/tests/types";
import { supabaseEnv, supabaseFetch } from "@/lib/supabase-rest";

export type ForecastSessionRecord = {
  id: string;
  testId: TestId;
  telegramUserId: number;
  answers: Record<string, AnswerBody>;
  paid: boolean;
  createdAt: number;
};

const TTL_MS = 60 * 60 * 1000;
const memory = new Map<string, ForecastSessionRecord>();

function gcMemory() {
  const now = Date.now();
  for (const [id, row] of memory) {
    if (now - row.createdAt > TTL_MS) memory.delete(id);
  }
}

export async function saveSession(row: ForecastSessionRecord): Promise<void> {
  gcMemory();
  const sb = supabaseEnv();
  if (!sb) {
    memory.set(row.id, row);
    return;
  }
  const res = await supabaseFetch("/rest/v1/forecast_sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      id: row.id,
      test_id: row.testId,
      telegram_user_id: row.telegramUserId,
      answers: row.answers,
      paid: row.paid,
      created_at: new Date(row.createdAt).toISOString(),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[forecast_sessions] Supabase insert failed:", res.status, text);
    throw new Error(
      `Не удалось сохранить сессию оплаты (${res.status}). Проверьте Supabase и таблицу forecast_sessions.`,
    );
  }
  memory.set(row.id, row);
}

export async function getSession(id: string): Promise<ForecastSessionRecord | null> {
  gcMemory();
  const cached = memory.get(id);
  if (!supabaseEnv()) {
    return cached ?? null;
  }
  try {
    const res = await supabaseFetch(
      `/rest/v1/forecast_sessions?select=id,test_id,telegram_user_id,answers,paid,created_at&id=eq.${encodeURIComponent(id)}&limit=1`,
      { method: "GET", headers: { Accept: "application/json" } },
    );
    if (!res.ok) {
      console.warn("[forecast_sessions] get failed:", res.status, await res.text());
      return cached ?? null;
    }
    const rows = (await res.json()) as Array<{
      id: string;
      test_id?: string;
      telegram_user_id: number | string;
      answers: Record<string, AnswerBody>;
      paid: boolean;
      created_at: string;
    }>;
    const r = rows[0];
    if (!r) return cached ?? null;
    const row: ForecastSessionRecord = {
      id: r.id,
      testId: (r.test_id as TestId) || "paid_map24",
      telegramUserId: Number(r.telegram_user_id),
      answers: r.answers,
      paid: r.paid,
      createdAt: new Date(r.created_at).getTime(),
    };
    memory.set(row.id, row);
    return row;
  } catch (e) {
    console.error("[forecast_sessions] get error:", e);
    return cached ?? null;
  }
}

export async function markSessionPaid(id: string): Promise<boolean> {
  gcMemory();
  const local = memory.get(id);
  if (local) local.paid = true;
  if (!supabaseEnv()) {
    return Boolean(local);
  }
  try {
    const res = await supabaseFetch(`/rest/v1/forecast_sessions?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ paid: true }),
    });
    if (!res.ok) {
      console.warn("[forecast_sessions] mark paid failed:", res.status, await res.text());
      return Boolean(local);
    }
    return true;
  } catch (e) {
    console.error("[forecast_sessions] mark paid error:", e);
    return Boolean(local);
  }
}

export async function deleteSession(id: string): Promise<void> {
  memory.delete(id);
  if (!supabaseEnv()) return;
  await supabaseFetch(`/rest/v1/forecast_sessions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
