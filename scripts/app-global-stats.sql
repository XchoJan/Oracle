-- Глобальные счётчики: запуски приложения и завершённые тесты.
-- Выполните в Supabase → SQL Editor (один раз).

create table if not exists public.app_global_stats (
  id text primary key default 'main',
  launches bigint not null default 0 check (launches >= 0),
  completed_tests bigint not null default 0 check (completed_tests >= 0),
  updated_at timestamptz not null default now()
);

insert into public.app_global_stats (id, launches, completed_tests)
values ('main', 0, 0)
on conflict (id) do nothing;

-- Атомарное увеличение счётчика (вызывается из Next.js через REST RPC).
create or replace function public.increment_app_stat(p_field text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if p_field = 'launches' then
    update public.app_global_stats
    set launches = launches + 1, updated_at = now()
    where id = 'main';
  elsif p_field = 'completed_tests' then
    update public.app_global_stats
    set completed_tests = completed_tests + 1, updated_at = now()
    where id = 'main';
  else
    raise exception 'invalid field: %', p_field;
  end if;

  select json_build_object(
    'launches', launches,
    'completed_tests', completed_tests
  )
  into result
  from public.app_global_stats
  where id = 'main';

  return result;
end;
$$;

grant execute on function public.increment_app_stat(text) to service_role;

alter table public.app_global_stats enable row level security;

-- Чтение/запись только через service_role с сервера (anon не нужен).
