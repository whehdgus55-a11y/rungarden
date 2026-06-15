create extension if not exists pgcrypto;

create table if not exists public.run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_name text not null default '바질',
  distance_km numeric(6, 2) not null check (distance_km > 0 and distance_km <= 100),
  duration_min integer check (duration_min is null or (duration_min > 0 and duration_min <= 600)),
  memo text check (memo is null or char_length(memo) <= 160),
  created_at timestamptz not null default now()
);

alter table public.run_logs
add column if not exists plant_name text not null default '바질';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'run_logs_plant_name_check'
  ) then
    alter table public.run_logs
    add constraint run_logs_plant_name_check
    check (plant_name in ('바질', '방울토마토', '상추', '딸기'));
  end if;
end;
$$;

create table if not exists public.user_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_name text not null check (plant_name in ('바질', '방울토마토', '상추', '딸기')),
  growth_percent numeric(5, 2) not null default 0 check (growth_percent >= 0 and growth_percent <= 100),
  harvest_count integer not null default 0 check (harvest_count >= 0),
  harvested_distance_km numeric(8, 2) not null default 0 check (harvested_distance_km >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_plants
add column if not exists harvest_count integer not null default 0,
add column if not exists harvested_distance_km numeric(8, 2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_plants_harvest_count_check'
  ) then
    alter table public.user_plants
    add constraint user_plants_harvest_count_check
    check (harvest_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_plants_harvested_distance_km_check'
  ) then
    alter table public.user_plants
    add constraint user_plants_harvested_distance_km_check
    check (harvested_distance_km >= 0);
  end if;
end;
$$;

alter table public.user_plants
drop constraint if exists user_plants_user_id_key;

create unique index if not exists user_plants_user_id_plant_name_key
on public.user_plants (user_id, plant_name);

create index if not exists run_logs_user_id_created_at_idx on public.run_logs (user_id, created_at desc);
create index if not exists run_logs_user_id_plant_name_created_at_idx on public.run_logs (user_id, plant_name, created_at desc);
create index if not exists user_plants_user_id_idx on public.user_plants (user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_plants_touch_updated_at on public.user_plants;
create trigger user_plants_touch_updated_at
before update on public.user_plants
for each row
execute function public.touch_updated_at();

alter table public.run_logs enable row level security;
alter table public.user_plants enable row level security;

drop policy if exists "Users can view own run logs" on public.run_logs;
create policy "Users can view own run logs"
on public.run_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own run logs" on public.run_logs;
create policy "Users can insert own run logs"
on public.run_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own run logs" on public.run_logs;
create policy "Users can update own run logs"
on public.run_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own run logs" on public.run_logs;
create policy "Users can delete own run logs"
on public.run_logs
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own plants" on public.user_plants;
create policy "Users can view own plants"
on public.user_plants
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own plants" on public.user_plants;
create policy "Users can insert own plants"
on public.user_plants
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own plants" on public.user_plants;
create policy "Users can update own plants"
on public.user_plants
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own plants" on public.user_plants;
create policy "Users can delete own plants"
on public.user_plants
for delete
to authenticated
using (auth.uid() = user_id);
