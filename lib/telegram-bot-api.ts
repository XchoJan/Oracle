type TelegramApiOk<T> = { ok: true; result: T } | { ok: false; description?: string };

async function tgCall<T>(botToken: string, method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as TelegramApiOk<T>;
  if (!json.ok) {
    throw new Error(json.description ?? `Telegram API ${method} failed`);
  }
  return json.result;
}

export async function createStarsInvoiceLink(params: {
  botToken: string;
  title: string;
  description: string;
  payload: string;
  starsAmount: number;
  label: string;
}): Promise<string> {
  const { botToken, title, description, payload, starsAmount, label } = params;
  if (payload.length > 128) {
    throw new Error("invoice payload must be <= 128 bytes");
  }
  return tgCall<string>(botToken, "createInvoiceLink", {
    title,
    description,
    payload,
    currency: "XTR",
    prices: [{ label, amount: starsAmount }],
  });
}

export async function answerPreCheckoutQuery(botToken: string, preCheckoutQueryId: string, ok: boolean): Promise<void> {
  await tgCall<boolean>(botToken, "answerPreCheckoutQuery", {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    error_message: ok ? undefined : "Сессия недоступна",
  });
}

/** Текст в чат (ответ на /start и т.п.). */
export async function sendTelegramChatMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<void> {
  await tgCall<unknown>(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

/** Ответ на /start: текст + кнопка, сразу открывающая Mini App (одно нажатие). */
export async function sendTelegramStartWithWebApp(
  botToken: string,
  chatId: number,
  params: { text: string; webAppUrl: string; buttonText?: string },
): Promise<void> {
  const { text, webAppUrl, buttonText = "Открыть приложение" } = params;
  await tgCall<unknown>(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{ text: buttonText, web_app: { url: webAppUrl } }]],
    },
  });
}

/** Кнопка меню слева от поля ввода (на весь бот). Вызовите один раз при настройке. */
export async function setBotMenuWebApp(
  botToken: string,
  webAppUrl: string,
  buttonText = "Открыть",
): Promise<void> {
  await tgCall<unknown>(botToken, "setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: buttonText,
      web_app: { url: webAppUrl },
    },
  });
}

export type WebhookInfoResult = {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
};

export async function getWebhookInfo(botToken: string): Promise<WebhookInfoResult> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const json = (await res.json()) as TelegramApiOk<WebhookInfoResult>;
  if (!json.ok) {
    throw new Error(json.description ?? "getWebhookInfo failed");
  }
  return json.result;
}
