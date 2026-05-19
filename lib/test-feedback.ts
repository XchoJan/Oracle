import { supabaseEnv, supabaseFetch } from "@/lib/supabase-rest";

export type FeedbackRating = "like" | "dislike";

export type SaveFeedbackInput = {
  rating: FeedbackRating;
  reviewText?: string;
  telegramUserId?: number;
};

const MAX_REVIEW_LENGTH = 2000;

export function normalizeReviewText(text: string | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_REVIEW_LENGTH);
}

export async function saveTestFeedback(input: SaveFeedbackInput): Promise<{ id: string }> {
  const reviewText = normalizeReviewText(input.reviewText);

  if (!supabaseEnv()) {
    console.warn("[test_feedback] Supabase not configured, feedback not persisted:", input.rating);
    return { id: "local" };
  }

  const res = await supabaseFetch("/rest/v1/test_feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      rating: input.rating,
      review_text: reviewText,
      telegram_user_id: input.telegramUserId ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Supabase insert failed: ${res.status}`);
  }

  const rows = (await res.json()) as Array<{ id: string }>;
  const id = rows[0]?.id;
  if (!id) {
    throw new Error("Пустой ответ при сохранении отзыва");
  }
  return { id };
}

/** Количество оценок «Полезно» (rating = like) в test_feedback. */
export async function getFeedbackLikesCount(): Promise<number> {
  if (!supabaseEnv()) {
    return 0;
  }

  const res = await supabaseFetch(
    "/rest/v1/test_feedback?rating=eq.like&select=id",
    {
      method: "HEAD",
      headers: { Prefer: "count=exact" },
    },
  );

  if (!res.ok) {
    console.warn("[test_feedback] likes count failed:", res.status);
    return 0;
  }

  const range = res.headers.get("content-range");
  if (!range) return 0;
  const total = range.split("/")[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}
