-- Weather: each person's moods and journal notes, readable only by them.
-- Applied to the Supabase project "weather" (rshyjtdlvmhevrnwwupz, sa-east-1).

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mood text not null check (mood in ('depressed','sad','happy','neutral','anxious','overwhelmed','angry')),
  -- When the mood was tapped (the fading timer runs from here).
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  note text not null default '' check (length(note) <= 100000)
);

create index entries_user_created_idx on public.entries (user_id, created_at desc);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  hold_hours smallint not null default 4 check (hold_hours between 1 and 24),
  updated_at timestamptz not null default now()
);

alter table public.entries enable row level security;
alter table public.user_settings enable row level security;

create policy "Own entries: read" on public.entries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Own entries: add" on public.entries for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Own entries: change" on public.entries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own entries: delete" on public.entries for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Own settings: read" on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Own settings: add" on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Own settings: change" on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Nobody signed out gets anything.
revoke all on public.entries, public.user_settings from anon;
