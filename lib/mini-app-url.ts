/** Публичный URL Mini App (кнопки web_app в боте и BotFather). */
export function getMiniAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://matchai.live";
  return raw.replace(/\/$/, "");
}
