create extension if not exists pgcrypto;

-- ============================================================
-- ADMIN IDENTITY (decoupled from email so changing the admin's
-- login email in Settings never locks them out of RLS-protected
-- writes)
-- ============================================================
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- ============================================================
-- CORE CONTENT TABLES
-- ============================================================
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  year integer,
  title text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('animation', 'digital', 'traditional')),
  title text not null default 'Untitled',
  description text not null default '',
  responsibilities text[] not null default '{}',
  media_url text,
  media_path text,
  media_type text check (media_type is null or media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Home page hero slideshow images
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Contact form submissions
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  message text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
alter table public.achievements enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.hero_slides enable row level security;
alter table public.contact_messages enable row level security;

-- ---- site_content ----
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content for select
using (true);

drop policy if exists "Admin can write site content" on public.site_content;
create policy "Admin can write site content"
on public.site_content for all
using (public.is_admin())
with check (public.is_admin());

-- ---- achievements ----
drop policy if exists "Public can read achievements" on public.achievements;
create policy "Public can read achievements"
on public.achievements for select
using (true);

drop policy if exists "Admin can write achievements" on public.achievements;
create policy "Admin can write achievements"
on public.achievements for all
using (public.is_admin())
with check (public.is_admin());

-- ---- portfolio_items ----
drop policy if exists "Public can read portfolio items" on public.portfolio_items;
create policy "Public can read portfolio items"
on public.portfolio_items for select
using (true);

drop policy if exists "Admin can write portfolio items" on public.portfolio_items;
create policy "Admin can write portfolio items"
on public.portfolio_items for all
using (public.is_admin())
with check (public.is_admin());

-- ---- hero_slides ----
drop policy if exists "Public can read hero slides" on public.hero_slides;
create policy "Public can read hero slides"
on public.hero_slides for select
using (true);

drop policy if exists "Admin can write hero slides" on public.hero_slides;
create policy "Admin can write hero slides"
on public.hero_slides for all
using (public.is_admin())
with check (public.is_admin());

-- ---- contact_messages ----
-- Anyone (including anonymous visitors) can submit a message, but only
-- the admin can read, update (mark read), or delete them.
drop policy if exists "Anyone can submit a message" on public.contact_messages;
create policy "Anyone can submit a message"
on public.contact_messages for insert
with check (true);

drop policy if exists "Admin can read messages" on public.contact_messages;
create policy "Admin can read messages"
on public.contact_messages for select
using (public.is_admin());

drop policy if exists "Admin can update messages" on public.contact_messages;
create policy "Admin can update messages"
on public.contact_messages for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can delete messages" on public.contact_messages;
create policy "Admin can delete messages"
on public.contact_messages for delete
using (public.is_admin());

-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can read portfolio media" on storage.objects;
create policy "Public can read portfolio media"
on storage.objects for select
using (bucket_id = 'portfolio-media');

drop policy if exists "Admin can upload portfolio media" on storage.objects;
create policy "Admin can upload portfolio media"
on storage.objects for insert
with check (
  bucket_id = 'portfolio-media'
  and public.is_admin()
);

drop policy if exists "Admin can update portfolio media" on storage.objects;
create policy "Admin can update portfolio media"
on storage.objects for update
using (
  bucket_id = 'portfolio-media'
  and public.is_admin()
)
with check (
  bucket_id = 'portfolio-media'
  and public.is_admin()
);

drop policy if exists "Admin can delete portfolio media" on storage.objects;
create policy "Admin can delete portfolio media"
on storage.objects for delete
using (
  bucket_id = 'portfolio-media'
  and public.is_admin()
);

-- ============================================================
-- ONE-TIME SETUP: register your admin user
-- ============================================================
-- Run this once after creating your admin login in
-- Authentication -> Users. It looks up that user by email and
-- marks them as admin. Safe to re-run.
insert into public.app_admins (user_id)
select id from auth.users where email = 'papious777@gmail.com'
on conflict (user_id) do nothing;
