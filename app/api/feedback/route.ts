import { NextRequest, NextResponse } from "next/server";
import { saveTestFeedback, type FeedbackRating } from "@/lib/test-feedback";

export const dynamic = "force-dynamic";

function isRating(v: unknown): v is FeedbackRating {
  return v === "like" || v === "dislike";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const rating = rec.rating;
  const reviewText = typeof rec.reviewText === "string" ? rec.reviewText : undefined;
  const telegramUserId =
    typeof rec.telegramUserId === "number" && Number.isFinite(rec.telegramUserId)
      ? rec.telegramUserId
      : undefined;

  if (!isRating(rating)) {
    return NextResponse.json(
      { error: 'Укажите rating: "like" или "dislike"' },
      { status: 400 },
    );
  }

  try {
    const { id } = await saveTestFeedback({ rating, reviewText, telegramUserId });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Не удалось сохранить отзыв";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
