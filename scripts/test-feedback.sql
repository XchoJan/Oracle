-- Отзывы после прохождения теста (лайк / дизлайк + текст).
-- Выполните в Supabase → SQL Editor (один раз).

create table if not exists public.test_feedback (
  id uuid primary key default gen_random_uuid(),
  rating text not null check (rating in ('like', 'dislike')),
  review_text text,
  telegram_user_id bigint,
  created_at timestamptz not null default now(),
  constraint review_text_length check (
    review_text is null or char_length(review_text) <= 2000
  )
);

create index if not exists test_feedback_created_at_idx
  on public.test_feedback (created_at desc);

create index if not exists test_feedback_rating_idx
  on public.test_feedback (rating);

alter table public.test_feedback enable row level security;

-- Запись только с сервера (service_role). Anon-доступ не нужен.
