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
