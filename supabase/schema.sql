-- Comments and answers on report pages. One project can serve several report sites: each page
-- labels its comments with its own report key (this site: ccom-blueprint), kept in the "report" column.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- It is safe to run again.

-- If you already ran an earlier version of this file that used the names report_comments,
-- get_my_comments, save_my_comment and stamp_reply, run these lines once first to remove them
-- (only test rows exist at that point). Then run the rest of this file.
--
--   drop table if exists public.report_comments cascade;
--   drop function if exists public.get_my_comments(uuid, text);
--   drop function if exists public.save_my_comment(uuid, text, text, text, text);
--   drop function if exists public.stamp_reply();
--

create table if not exists public.reports_site_comments (
  id           uuid primary key default gen_random_uuid(),
  report       text not null default 'blueprint' check (report ~ '^[a-z0-9-]{1,40}$'),
  question_key text check (question_key is null or question_key ~ '^[a-z0-9-]{1,40}$'),
  author_name  text check (author_name is null or char_length(author_name) <= 80),
  body         text not null check (char_length(btrim(body)) between 1 and 4000),
  reader_token uuid not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  reply        text check (reply is null or char_length(reply) <= 4000),
  replied_at   timestamptz
);

alter table public.reports_site_comments add column if not exists updated_at timestamptz;

create index if not exists reports_site_comments_report_created_idx on public.reports_site_comments (report, created_at);
create index if not exists reports_site_comments_token_idx on public.reports_site_comments (reader_token);

-- One answer per reader per question. Changing an answer edits that row instead of adding another.
create unique index if not exists reports_site_comments_one_per_reader
  on public.reports_site_comments (report, question_key, reader_token);

-- The public "anon" role gets no direct access to the table at all: it cannot read, add, change or
-- delete rows. Everything a reader can do goes through the two functions below.
alter table public.reports_site_comments enable row level security;
revoke all on public.reports_site_comments from anon, authenticated;
drop policy if exists "readers can add comments" on public.reports_site_comments;

-- A reader gets back only their own answers, and our replies to them, by presenting the private
-- token their browser made up. Nobody can list other people's comments.
drop function if exists public.get_my_site_comments(uuid, text);
create function public.get_my_site_comments(p_token uuid, p_report text default 'blueprint')
returns table (
  id           uuid,
  question_key text,
  author_name  text,
  body         text,
  created_at   timestamptz,
  updated_at   timestamptz,
  reply        text,
  replied_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.question_key, c.author_name, c.body, c.created_at, c.updated_at, c.reply, c.replied_at
  from public.reports_site_comments c
  where c.reader_token = p_token
    and c.report = p_report
  order by c.created_at;
$$;

-- Save an answer, or change the one already saved for that question. The table's own rules check
-- the lengths and the key format, and a reader can only ever touch rows carrying their own token.
drop function if exists public.save_my_site_comment(uuid, text, text, text, text);
create function public.save_my_site_comment(
  p_token  uuid,
  p_report text,
  p_key    text,
  p_body   text,
  p_name   text default null
)
returns table (
  id           uuid,
  question_key text,
  author_name  text,
  body         text,
  created_at   timestamptz,
  updated_at   timestamptz,
  reply        text,
  replied_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  insert into public.reports_site_comments as c (report, question_key, author_name, body, reader_token)
  values (p_report, p_key, nullif(btrim(p_name), ''), btrim(p_body), p_token)
  on conflict (report, question_key, reader_token)
  do update set body        = excluded.body,
                author_name = coalesce(excluded.author_name, c.author_name),
                updated_at  = now()
  returning c.id, c.question_key, c.author_name, c.body, c.created_at, c.updated_at, c.reply, c.replied_at;
$$;

revoke all on function public.get_my_site_comments(uuid, text) from public;
revoke all on function public.save_my_site_comment(uuid, text, text, text, text) from public;
grant execute on function public.get_my_site_comments(uuid, text) to anon;
grant execute on function public.save_my_site_comment(uuid, text, text, text, text) to anon;

-- To reply, edit the "reply" cell of a comment in the Table Editor. The time is stamped for you.
create or replace function public.stamp_site_reply()
returns trigger
language plpgsql
as $$
begin
  if new.reply is distinct from old.reply and new.reply is not null then
    new.replied_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists reports_site_comments_stamp_site_reply on public.reports_site_comments;
create trigger reports_site_comments_stamp_site_reply
  before update on public.reports_site_comments
  for each row execute function public.stamp_site_reply();
