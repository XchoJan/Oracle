import crypto from "node:crypto";

const MAX_AUTH_AGE_SEC = 24 * 60 * 60;

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash")?.toLowerCase();
  if (!hash) return false;
  params.delete("hash");

  const pairs: [string, string][] = [];
  params.forEach((value, key) => pairs.push([key, value]));
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (hmac.length !== hash.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function parseInitDataUser(initData: string): { userId: number; authDate: number } | null {
  const params = new URLSearchParams(initData);
  const rawUser = params.get("user");
  const rawAuth = params.get("auth_date");
  if (!rawUser || rawAuth == null) return null;
  try {
    const user = JSON.parse(rawUser) as { id?: number };
    if (typeof user.id !== "number") return null;
    const authDate = Number(rawAuth);
    if (!Number.isFinite(authDate)) return null;
    return { userId: user.id, authDate };
  } catch {
    return null;
  }
}

export function assertFreshAuth(authDate: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - authDate <= MAX_AUTH_AGE_SEC;
}
