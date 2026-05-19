-- Таблица для сессий оплаты (Supabase SQL). Выполните в SQL Editor, если используете Supabase в продакшене.

create table if not exists public.forecast_sessions (
  id text primary key,
  test_id text not null default 'paid_map24',
  telegram_user_id bigint not null,
  answers jsonb not null,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- Если таблица уже была без test_id:
-- alter table public.forecast_sessions add column if not exists test_id text not null default 'paid_map24';

create index if not exists forecast_sessions_telegram_user_id_idx
  on public.forecast_sessions (telegram_user_id);

alter table public.forecast_sessions enable row level security;

-- Сервисный ключ обходит RLS; для anon не выдавайте политики на эту таблицу.
