create extension if not exists pgcrypto;

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

alter table public.site_content enable row level security;
alter table public.achievements enable row level security;
alter table public.portfolio_items enable row level security;

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content for select
using (true);

drop policy if exists "Admin can write site content" on public.site_content;
create policy "Admin can write site content"
on public.site_content for all
using ((auth.jwt() ->> 'email') = 'papious777@gmail.com')
with check ((auth.jwt() ->> 'email') = 'papious777@gmail.com');

drop policy if exists "Public can read achievements" on public.achievements;
create policy "Public can read achievements"
on public.achievements for select
using (true);

drop policy if exists "Admin can write achievements" on public.achievements;
create policy "Admin can write achievements"
on public.achievements for all
using ((auth.jwt() ->> 'email') = 'papious777@gmail.com')
with check ((auth.jwt() ->> 'email') = 'papious777@gmail.com');

drop policy if exists "Public can read portfolio items" on public.portfolio_items;
create policy "Public can read portfolio items"
on public.portfolio_items for select
using (true);

drop policy if exists "Admin can write portfolio items" on public.portfolio_items;
create policy "Admin can write portfolio items"
on public.portfolio_items for all
using ((auth.jwt() ->> 'email') = 'papious777@gmail.com')
with check ((auth.jwt() ->> 'email') = 'papious777@gmail.com');

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
  and (auth.jwt() ->> 'email') = 'papious777@gmail.com'
);

drop policy if exists "Admin can update portfolio media" on storage.objects;
create policy "Admin can update portfolio media"
on storage.objects for update
using (
  bucket_id = 'portfolio-media'
  and (auth.jwt() ->> 'email') = 'papious777@gmail.com'
)
with check (
  bucket_id = 'portfolio-media'
  and (auth.jwt() ->> 'email') = 'papious777@gmail.com'
);

drop policy if exists "Admin can delete portfolio media" on storage.objects;
create policy "Admin can delete portfolio media"
on storage.objects for delete
using (
  bucket_id = 'portfolio-media'
  and (auth.jwt() ->> 'email') = 'papious777@gmail.com'
);
