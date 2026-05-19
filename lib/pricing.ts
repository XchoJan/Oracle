/** Стоимость отчёта в Telegram Stars (XTR), целое число. */
export const FORECAST_PRICE_STARS = 100;

export function telegramStarsLabel(amount: number = FORECAST_PRICE_STARS): string {
  return amount === 1 ? "1 Telegram Star" : `${amount} Telegram Stars`;
}
