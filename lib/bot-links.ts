export function getBotUsername(): string {
  return (process.env.NEXT_PUBLIC_BOT_USERNAME ?? "EchoOracle_bot").replace(/^@/, "");
}

export function getBotTelegramUrl(start?: string): string {
  const user = getBotUsername();
  if (start) return `https://t.me/${user}?start=${encodeURIComponent(start)}`;
  return `https://t.me/${user}`;
}
