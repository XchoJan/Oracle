import { NextResponse } from "next/server";
import { getWebhookInfo } from "@/lib/telegram-bot-api";

/**
 * GET: состояние вебхука (без токена). Откройте в браузере после деплоя, если /start не отвечает.
 * Проверьте last_error_message и что в allowed_updates есть "message" (или массив пустой = все типы).
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN не задан" }, { status: 500 });
  }
  try {
    const info = await getWebhookInfo(token);
    const allowed = info.allowed_updates;
    const allUpdates = !allowed || allowed.length === 0;
    const messagesEnabled = allUpdates || allowed.includes("message");
    const preCheckoutEnabled = allUpdates || allowed.includes("pre_checkout_query");
    const webhookUrl = info.url?.trim() ?? "";
    const paymentsReady = Boolean(webhookUrl) && preCheckoutEnabled;

    let hint_payments: string | null = null;
    if (!webhookUrl) {
      hint_payments =
        "Вебхук не установлен (url пустой). Stars не пройдут: Telegram ждёт answerPreCheckoutQuery. Вызовите setWebhook на https://ваш-домен/api/telegram/webhook";
    } else if (!preCheckoutEnabled) {
      hint_payments =
        'В allowed_updates нет "pre_checkout_query" — оплата Stars будет отклоняться. Переустановите вебхук с pre_checkout_query или без allowed_updates.';
    }

    return NextResponse.json({
      url: webhookUrl || null,
      pending_update_count: info.pending_update_count ?? 0,
      last_error_date: info.last_error_date ?? null,
      last_error_message: info.last_error_message ?? null,
      allowed_updates: allowed ?? null,
      payments_ready: paymentsReady,
      hint_payments,
      hint_messages:
        messagesEnabled
          ? null
          : "Вебхук не получает message — /start не придёт. Добавьте message или уберите allowed_updates.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
