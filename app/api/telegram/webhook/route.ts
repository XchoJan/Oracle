import { NextRequest, NextResponse } from "next/server";
import { getSession, markSessionPaid } from "@/lib/forecast-session-store";
import { FORECAST_PRICE_STARS } from "@/lib/pricing";
import { answerPreCheckoutQuery } from "@/lib/telegram-bot-api";

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

type Update = {
  pre_checkout_query?: PreCheckoutQuery;
  message?: { successful_payment?: SuccessfulPayment };
};

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (update.pre_checkout_query) {
    const q = update.pre_checkout_query;
    const session = await getSession(q.invoice_payload);
    const ok =
      Boolean(session) &&
      session!.telegramUserId === q.from.id &&
      q.currency === "XTR" &&
      q.total_amount === FORECAST_PRICE_STARS;
    await answerPreCheckoutQuery(botToken, q.id, ok);
    return NextResponse.json({ ok: true });
  }

  const sp = update.message?.successful_payment;
  if (sp?.invoice_payload) {
    if (sp.currency === "XTR" && sp.total_amount === FORECAST_PRICE_STARS) {
      await markSessionPaid(sp.invoice_payload);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
