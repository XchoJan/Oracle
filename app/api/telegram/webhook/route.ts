import { NextRequest, NextResponse } from "next/server";
import { getSession, markSessionPaid } from "@/lib/forecast-session-store";
import { FORECAST_PRICE_STARS } from "@/lib/pricing";
import { getMiniAppUrl } from "@/lib/mini-app-url";
import { answerPreCheckoutQuery, sendTelegramStartWithWebApp } from "@/lib/telegram-bot-api";

export const dynamic = "force-dynamic";

type PreCheckoutQuery = {
  id: string;
  from: { id: number };
  currency: string;
  total_amount: number;
  invoice_payload: string;
};

type SuccessfulPayment = {
  currency: string;
  total_amount: number;
  invoice_payload: string;
};

type IncomingMessage = {
  chat?: { id: number };
  text?: string;
  successful_payment?: SuccessfulPayment;
};

type Update = {
  update_id?: number;
  pre_checkout_query?: PreCheckoutQuery;
  message?: IncomingMessage;
};

const START_REPLY_TEXT =
  "Прогностическая карта — условный сценарий на 24 месяца по вашим ответам.\n\nНажмите кнопку ниже, чтобы начать опрос.";

function isStartCommand(text: string | undefined): boolean {
  if (!text) return false;
  return /^\/start(?:@\w+)?(?:\s|$)/i.test(text.trim());
}

function readWebhookSecretHeader(req: NextRequest): string | null {
  return (
    req.headers.get("x-telegram-bot-api-secret-token") ??
    req.headers.get("X-Telegram-Bot-Api-Secret-Token")
  );
}

/** Telegram ждёт быстрый 200; при внутренних сбоях всё равно отвечаем 200, чтобы не копились retry. */
function okResponse() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const secretEnv = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secretEnv) {
    const header = readWebhookSecretHeader(req)?.trim();
    if (header !== secretEnv) {
      console.error(
        "[telegram/webhook] 401: неверный X-Telegram-Bot-Api-Secret-Token",
      );
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    console.error("[telegram/webhook] TELEGRAM_BOT_TOKEN не задан");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      let ok = false;
      let reason = "unknown";
      try {
        const session = await getSession(q.invoice_payload);
        if (!session) {
          reason = "session_not_found";
        } else if (Number(session.telegramUserId) !== Number(q.from.id)) {
          reason = "user_mismatch";
        } else if (q.currency !== "XTR") {
          reason = "bad_currency";
        } else if (q.total_amount !== FORECAST_PRICE_STARS) {
          reason = "bad_amount";
        } else {
          ok = true;
          reason = "ok";
        }
      } catch (e) {
        console.error("[telegram/webhook] getSession error:", e);
        reason = "session_lookup_error";
      }

      if (!ok) {
        console.error("[telegram/webhook] pre_checkout rejected:", {
          reason,
          payload: q.invoice_payload,
          from: q.from.id,
          currency: q.currency,
          amount: q.total_amount,
          expectedStars: FORECAST_PRICE_STARS,
        });
      }

      try {
        await answerPreCheckoutQuery(botToken, q.id, ok);
      } catch (e) {
        console.error("[telegram/webhook] answerPreCheckoutQuery failed:", e);
      }
      return okResponse();
    }

    const sp = update.message?.successful_payment;
    if (sp?.invoice_payload) {
      if (sp.currency === "XTR" && sp.total_amount === FORECAST_PRICE_STARS) {
        try {
          await markSessionPaid(sp.invoice_payload);
        } catch (e) {
          console.error("[telegram/webhook] markSessionPaid error:", e);
        }
      }
      return okResponse();
    }

    const msg = update.message;
    const chatId = msg?.chat?.id;
    if (chatId != null && msg != null && isStartCommand(msg.text)) {
      try {
        await sendTelegramStartWithWebApp(botToken, chatId, {
          text: START_REPLY_TEXT,
          webAppUrl: getMiniAppUrl(),
          buttonText: "▶ Запустить",
        });
      } catch (e) {
        console.error("[telegram/webhook] sendMessage /start:", e);
      }
      return okResponse();
    }

    return okResponse();
  } catch (e) {
    console.error("[telegram/webhook] unhandled:", e);
    return okResponse();
  }
}
