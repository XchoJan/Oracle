export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function supabaseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase not configured");
  const baseHeaders = new Headers(init.headers);
  baseHeaders.set("apikey", env.key);
  baseHeaders.set("Authorization", `Bearer ${env.key}`);
  return fetch(`${env.url}${path}`, { ...init, headers: baseHeaders });
}
