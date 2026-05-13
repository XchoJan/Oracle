-- Таблица для сессий оплаты (Supabase SQL). Выполните в SQL Editor, если используете Supabase в продакшене.

create table if not exists public.forecast_sessions (
  id text primary key,
  telegram_user_id bigint not null,
  answers jsonb not null,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists forecast_sessions_telegram_user_id_idx
  on public.forecast_sessions (telegram_user_id);

alter table public.forecast_sessions enable row level security;

-- Сервисный ключ обходит RLS; для anon не выдавайте политики на эту таблицу.
