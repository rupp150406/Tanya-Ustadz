-- ============================================================
-- PROJECT: TANYA USTADZ V3
-- FILE: setup.sql
-- DESC: Full schema, constraints, RLS, triggers, functions
-- ORDER: Run this file once on a fresh Supabase project
-- ============================================================


-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";


-- ============================================================
-- SECTION 2: TABLE — questions
-- ============================================================

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     text generated always as ('#TU-' || upper(substr(id::text, 33, 4))) stored,
  created_at    timestamptz not null default timezone('utc', now()),
  question      text not null,
  category      text,
  status        text not null default 'pending',
  answer        text,
  is_pinned     boolean not null default false,
  upvotes       int not null default 0,

  -- CHARACTER LIMITS
  constraint question_max_length check (char_length(question) <= 500),
  constraint answer_max_length   check (answer is null or char_length(answer) <= 2000),

  -- STATUS ENUM (STRICT — 4 values only)
  constraint valid_status check (
    status in ('pending', 'verified', 'rejected', 'answered')
  ),

  -- CATEGORY ENUM
  constraint valid_category check (
    category is null or category in (
      'Fikih',
      'Akhlak & Adab',
      'Keluarga',
      'Muamalah',
      'Umum'
    )
  )
);

-- Index: speed up public feed query
create index if not exists idx_questions_status
  on public.questions (status);

-- Index: speed up cron cleanup
create index if not exists idx_questions_cleanup
  on public.questions (is_pinned, created_at)
  where is_pinned = false;

-- Index: speed up search
create index if not exists idx_questions_search
  on public.questions using gin (
    to_tsvector('indonesian', question || ' ' || coalesce(category, ''))
  );


-- ============================================================
-- SECTION 3: TABLE — question_votes (ANTI-SPAM UPVOTE)
-- ============================================================

create table if not exists public.question_votes (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  fingerprint text not null,
  created_at  timestamptz not null default timezone('utc', now()),

  -- 1 fingerprint = 1 vote per question (enforced at DB level)
  constraint unique_vote unique (question_id, fingerprint)
);

-- Index: fast lookup when checking existing vote
create index if not exists idx_votes_fingerprint
  on public.question_votes (question_id, fingerprint);


-- ============================================================
-- SECTION 4: TABLE — profiles (Google OAuth users)
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  email      text,
  avatar_url text,
  role       text default null,

  constraint valid_role check (
    role is null or role in ('admin', 'ustadz')
  )
);


-- ============================================================
-- SECTION 5: TABLE — rate_limit_log (Gate password brute-force)
-- ============================================================

create table if not exists public.rate_limit_log (
  id         uuid primary key default gen_random_uuid(),
  ip         text not null,
  attempted_at timestamptz not null default timezone('utc', now())
);

-- Index: fast lookup for rate limit check
create index if not exists idx_rate_limit_ip
  on public.rate_limit_log (ip, attempted_at);

-- Auto-cleanup old logs (> 15 min) — done inside the API handler via delete


-- ============================================================
-- SECTION 6: FUNCTION — auto-sync upvotes count via trigger
-- ============================================================

create or replace function public.sync_upvote_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.questions
    set upvotes = upvotes + 1
    where id = NEW.question_id;

  elsif (TG_OP = 'DELETE') then
    update public.questions
    set upvotes = greatest(upvotes - 1, 0)
    where id = OLD.question_id;
  end if;

  return null;
end;
$$;

-- Trigger: fire after insert/delete on question_votes
create or replace trigger trg_sync_upvotes
  after insert or delete on public.question_votes
  for each row
  execute function public.sync_upvote_count();


-- ============================================================
-- SECTION 7: FUNCTION — auto-create profile on Google login
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing; -- safe re-run
  return new;
end;
$$;

-- Trigger: fire after new Google OAuth user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================
-- SECTION 8: ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.questions      enable row level security;
alter table public.question_votes enable row level security;
alter table public.profiles       enable row level security;
alter table public.rate_limit_log enable row level security;


-- ============================================================
-- SECTION 9: RLS POLICIES — questions
-- ============================================================

-- DROP existing policies before re-creating (safe re-run)
drop policy if exists "Public can read answered questions"  on public.questions;
drop policy if exists "Public can insert questions"         on public.questions;
drop policy if exists "Admin can verify or reject"          on public.questions;
drop policy if exists "Ustadz can answer"                   on public.questions;
drop policy if exists "Admin can delete"                    on public.questions;

-- 9A. SELECT: Public (Jemaah) — only answered questions
create policy "Public can read answered questions"
  on public.questions
  for select
  using (status = 'answered');

-- 9B. INSERT: Public (Jemaah) — anonymous, no auth needed
create policy "Public can insert questions"
  on public.questions
  for insert
  with check (true);

-- 9C. UPDATE: Admin — can ONLY change status to verified or rejected
--     Column-level: cannot touch 'answer' field
create policy "Admin can verify or reject"
  on public.questions
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
    and status not in ('answered')  -- cannot re-moderate answered questions
  )
  with check (
    status in ('verified', 'rejected')
    and answer is not distinct from (select answer from public.questions where id = questions.id)
    -- answer must remain unchanged (admin cannot write answers)
  );

-- 9D. UPDATE: Ustadz — can ONLY set answer + status = answered
--     Column-level: cannot change status to verified/rejected
create policy "Ustadz can answer"
  on public.questions
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'ustadz'
    )
    and status = 'verified'  -- can only answer verified questions
  )
  with check (
    status = 'answered'
    and answer is not null
    and char_length(answer) <= 2000
  );

-- 9E. DELETE: Admin only (soft enforced — cron handles auto-delete)
create policy "Admin can delete"
  on public.questions
  for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- 9F. Admin & Ustadz can read all statuses (not just answered)
drop policy if exists "Staff can read all questions" on public.questions;

create policy "Staff can read all questions"
  on public.questions
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'ustadz')
    )
  );


-- ============================================================
-- SECTION 10: RLS POLICIES — question_votes
-- ============================================================

drop policy if exists "Anyone can vote"             on public.question_votes;
drop policy if exists "Anyone can read vote counts" on public.question_votes;

-- Anyone can insert a vote (fingerprint uniqueness enforced by constraint)
create policy "Anyone can vote"
  on public.question_votes
  for insert
  with check (true);

-- Anyone can read vote records (to check if already voted)
create policy "Anyone can read vote counts"
  on public.question_votes
  for select
  using (true);


-- ============================================================
-- SECTION 11: RLS POLICIES — profiles
-- ============================================================

drop policy if exists "Users can read own profile"   on public.profiles;
drop policy if exists "Users can update own role"    on public.profiles;

-- User can only read their own profile
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- User can update their own role (only if currently null — first-time selection)
create policy "Users can update own role"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    role in ('admin', 'ustadz')
  );


-- ============================================================
-- SECTION 12: RLS POLICIES — rate_limit_log
-- ============================================================

drop policy if exists "Service role only for rate limit" on public.rate_limit_log;

-- Only service role (server API) can read/write rate limit logs
-- Client has no access
create policy "Service role only for rate limit"
  on public.rate_limit_log
  for all
  using (false)         -- no client access
  with check (false);


-- ============================================================
-- SECTION 13: REALTIME — enable publication for live updates
-- ============================================================

-- Enable realtime on questions table
alter publication supabase_realtime add table public.questions;


-- ============================================================
-- SECTION 14: ADMIN FUNCTION — get all questions (bypass RLS)
-- ============================================================
-- Called server-side only via service role key

create or replace function public.get_all_questions_for_staff()
returns setof public.questions
language sql
security definer
set search_path = public
as $$
  select * from public.questions order by created_at desc;
$$;


-- ============================================================
-- DONE
-- ============================================================
-- Run order:
-- 1. This file in Supabase SQL editor
-- 2. Deploy Edge Function (auto-delete cron)
-- 3. Set Realtime enabled for questions table in Supabase dashboard
-- ============================================================