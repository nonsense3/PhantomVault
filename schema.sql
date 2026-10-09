-- =============================================================================
-- PhantomVault AI: Supabase Postgres Schema with Row Level Security (RLS)
-- PRD Section 12: Data Model
-- =============================================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view and update their own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- 2. Traps Table
create table if not exists public.traps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade not null,
  name text not null,
  template text not null check (template in ('forward_scam', 'fake_login', 'invoice_shield', 'social_contact')),
  slug text unique not null,
  persona text not null check (persona in ('gullible_senior', 'angry_executive', 'distracted_freelancer')),
  gullibility integer default 65 check (gullibility between 0 and 100),
  status text default 'active' check (status in ('active', 'paused')),
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.traps enable row level security;

create policy "Owners can manage their traps"
  on public.traps for all
  using (auth.uid() = owner_id);

-- Allow public read of active traps for serving decoy pages without auth
create policy "Public can inspect active traps by slug"
  on public.traps for select
  using (status = 'active');

-- 3. Incidents Table
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  trap_id uuid references public.traps on delete cascade not null,
  owner_id uuid references auth.users on delete cascade not null,
  source_ip text,
  geo jsonb,
  user_agent text,
  started_at timestamptz default now(),
  last_activity_at timestamptz default now(),
  status text default 'active' check (status in ('active', 'idle', 'ended')),
  scam_type text,
  threat_level text check (threat_level in ('Low', 'Medium', 'High')),
  time_wasted_seconds integer default 0,
  summary text,
  created_at timestamptz default now()
);

alter table public.incidents enable row level security;

create policy "Owners can view and manage their incidents"
  on public.incidents for all
  using (auth.uid() = owner_id);

-- 4. Messages Table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents on delete cascade not null,
  owner_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('attacker', 'ai', 'system')),
  content text not null,
  kind text default 'text' check (kind in ('text', 'form_submit', 'fake_data')),
  action text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Owners can view messages"
  on public.messages for all
  using (auth.uid() = owner_id);

-- 5. Indicators of Compromise (IoCs) Table
create table if not exists public.iocs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents on delete cascade not null,
  owner_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('ip', 'email', 'phone', 'url', 'domain', 'wallet', 'bank')),
  value text not null,
  confidence numeric(4,2) default 0.90,
  first_seen timestamptz default now(),
  last_seen timestamptz default now(),
  occurrences integer default 1,
  created_at timestamptz default now(),
  unique(owner_id, type, value)
);

alter table public.iocs enable row level security;

create policy "Owners can view and manage their IoCs"
  on public.iocs for all
  using (auth.uid() = owner_id);

-- 6. Analyses Table
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade not null,
  input_type text not null check (input_type in ('image', 'text', 'url')),
  storage_path text,
  result jsonb not null,
  converted_trap_id uuid references public.traps on delete set null,
  created_at timestamptz default now()
);

alter table public.analyses enable row level security;

create policy "Owners can manage their analyses"
  on public.analyses for all
  using (auth.uid() = owner_id);

-- 7. Storage Bucket for Screenshot Uploads
insert into storage.buckets (id, name, public)
values ('scam-uploads', 'scam-uploads', false)
on conflict do nothing;

create policy "Users can upload their own scam screenshots"
  on storage.objects for insert
  with check (bucket_id = 'scam-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read their own scam screenshots"
  on storage.objects for select
  using (bucket_id = 'scam-uploads' and auth.uid()::text = (storage.foldername(name))[1]);
