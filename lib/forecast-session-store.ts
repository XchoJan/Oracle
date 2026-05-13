import type { AnswerBody } from "@/lib/answers";

export type ForecastSessionRecord = {
  id: string;
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

function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function supabaseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase not configured");
  const baseHeaders = new Headers(init.headers);
  baseHeaders.set("apikey", env.key);
  baseHeaders.set("Authorization", `Bearer ${env.key}`);
  return fetch(`${env.url}${path}`, { ...init, headers: baseHeaders });
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
      telegram_user_id: row.telegramUserId,
      answers: row.answers,
      paid: row.paid,
      created_at: new Date(row.createdAt).toISOString(),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("[forecast_sessions] Supabase insert failed, using memory:", res.status, text);
    memory.set(row.id, row);
  }
}

export async function getSession(id: string): Promise<ForecastSessionRecord | null> {
  gcMemory();
  if (!supabaseEnv()) {
    return memory.get(id) ?? null;
  }
  const res = await supabaseFetch(
    `/rest/v1/forecast_sessions?select=id,telegram_user_id,answers,paid,created_at&id=eq.${encodeURIComponent(id)}&limit=1`,
    { method: "GET", headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    return memory.get(id) ?? null;
  }
  const rows = (await res.json()) as Array<{
    id: string;
    telegram_user_id: number;
    answers: Record<string, AnswerBody>;
    paid: boolean;
    created_at: string;
  }>;
  const r = rows[0];
  if (!r) return memory.get(id) ?? null;
  return {
    id: r.id,
    telegramUserId: r.telegram_user_id,
    answers: r.answers,
    paid: r.paid,
    createdAt: new Date(r.created_at).getTime(),
  };
}

export async function markSessionPaid(id: string): Promise<boolean> {
  gcMemory();
  if (!supabaseEnv()) {
    const row = memory.get(id);
    if (!row) return false;
    row.paid = true;
    return true;
  }
  const res = await supabaseFetch(`/rest/v1/forecast_sessions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ paid: true }),
  });
  if (!res.ok) {
    const row = memory.get(id);
    if (!row) return false;
    row.paid = true;
    return true;
  }
  const local = memory.get(id);
  if (local) local.paid = true;
  return true;
}

export async function deleteSession(id: string): Promise<void> {
  memory.delete(id);
  if (!supabaseEnv()) return;
  await supabaseFetch(`/rest/v1/forecast_sessions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
