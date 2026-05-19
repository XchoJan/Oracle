import {
  AuthDateInvalidError,
  ExpiredError,
  isValid,
  parse,
  SignatureInvalidError,
  SignatureMissingError,
  validate,
} from "@tma.js/init-data-node";

const MAX_AUTH_AGE_SEC = 24 * 60 * 60;

/** Убирает обёртку URL, если initData скопировали из адресной строки. */
export function normalizeInitData(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("?")) s = s.slice(1);
  const tgPrefix = "tgWebAppData=";
  const idx = s.indexOf(tgPrefix);
  if (idx >= 0) {
    s = s.slice(idx + tgPrefix.length);
    try {
      s = decodeURIComponent(s);
    } catch {
      /* keep as-is */
    }
  }
  return s;
}

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  const token = botToken.trim();
  const normalized = normalizeInitData(initData);
  if (!normalized || !token) return false;
  return isValid(normalized, token, { expiresIn: MAX_AUTH_AGE_SEC });
}

export type InitDataValidationFailure =
  | "empty"
  | "missing_hash"
  | "invalid_auth_date"
  | "expired"
  | "invalid_signature"
  | "unknown";

export function explainInitDataFailure(
  initData: string,
  botToken: string,
): InitDataValidationFailure | null {
  const token = botToken.trim();
  const normalized = normalizeInitData(initData);
  if (!normalized || !token) return "empty";
  try {
    validate(normalized, token, { expiresIn: MAX_AUTH_AGE_SEC });
    return null;
  } catch (e) {
    if (e instanceof SignatureMissingError) return "missing_hash";
    if (e instanceof AuthDateInvalidError) return "invalid_auth_date";
    if (e instanceof ExpiredError) return "expired";
    if (e instanceof SignatureInvalidError) return "invalid_signature";
    return "unknown";
  }
}

export function parseInitDataUser(initData: string): { userId: number; authDate: number } | null {
  const normalized = normalizeInitData(initData);
  if (!normalized) return null;
  try {
    const data = parse(normalized);
    const userId = data.user?.id;
    const authDate = data.auth_date;
    if (typeof userId !== "number" || authDate == null) return null;
    const ts = authDate instanceof Date ? Math.floor(authDate.getTime() / 1000) : Number(authDate);
    if (!Number.isFinite(ts)) return null;
    return { userId, authDate: ts };
  } catch {
    return null;
  }
}

export function assertFreshAuth(authDate: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - authDate <= MAX_AUTH_AGE_SEC;
}
