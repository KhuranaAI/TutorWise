-- Bolo! cloud save. Paste into Supabase → SQL Editor → New query → Run.
-- Progress is stored under a private save code. The table itself is locked (row level security
-- with no policies); the app can only call the two functions below.

create table if not exists public.bolo_saves (
  code       text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.bolo_saves enable row level security;

create or replace function public.bolo_save(p_code text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if p_code !~ '^[A-Z0-9-]{10,40}$' then raise exception 'invalid save code'; end if;
  if pg_column_size(p_data) > 200000 then raise exception 'save too large'; end if;
  insert into public.bolo_saves (code, data, updated_at) values (p_code, p_data, t)
  on conflict (code) do update set data = excluded.data, updated_at = t;
  return t;
end $$;

create or replace function public.bolo_load(p_code text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('data', data, 'updated_at', updated_at)
  from public.bolo_saves where code = p_code;
$$;

revoke all on function public.bolo_save(text, jsonb) from public;
revoke all on function public.bolo_load(text) from public;
grant execute on function public.bolo_save(text, jsonb) to anon;
grant execute on function public.bolo_load(text) to anon;
