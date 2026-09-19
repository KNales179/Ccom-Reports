-- Comments and answers on the Celestial Companions reports.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).

create table if not exists public.report_comments (
  id           uuid primary key default gen_random_uuid(),
  report       text not null default 'blueprint' check (report ~ '^[a-z0-9-]{1,40}$'),
  question_key text check (question_key is null or question_key ~ '^[a-z0-9-]{1,40}$'),
  author_name  text check (author_name is null or char_length(author_name) <= 80),
  body         text not null check (char_length(btrim(body)) between 1 and 4000),
  reader_token uuid not null,
  created_at   timestamptz not null default now(),
  reply        text check (reply is null or char_length(reply) <= 4000),
  replied_at   timestamptz
);

create index if not exists report_comments_report_created_idx on public.report_comments (report, created_at);
create index if not exists report_comments_token_idx on public.report_comments (reader_token);

alter table public.report_comments enable row level security;

-- Readers of the report (the public "anon" role) can add a comment, and nothing else.
-- They cannot read the table, change a comment, delete one, or write a reply.
revoke all on public.report_comments from anon, authenticated;
grant insert on public.report_comments to anon;

drop policy if exists "readers can add comments" on public.report_comments;
create policy "readers can add comments" on public.report_comments
  for insert to anon
  with check (reply is null and replied_at is null);

-- A reader gets back only their own comments, and our replies to them, by presenting the
-- private token their browser made up. Nobody can list other people's comments.
create or replace function public.get_my_comments(p_token uuid, p_report text default 'blueprint')
returns table (
  id           uuid,
  question_key text,
  author_name  text,
  body         text,
  created_at   timestamptz,
  reply        text,
  replied_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.question_key, c.author_name, c.body, c.created_at, c.reply, c.replied_at
  from public.report_comments c
  where c.reader_token = p_token
    and c.report = p_report
  order by c.created_at;
$$;

revoke all on function public.get_my_comments(uuid, text) from public;
grant execute on function public.get_my_comments(uuid, text) to anon;

-- To reply, edit the "reply" cell of a comment in the Table Editor. The time is stamped for you.
create or replace function public.stamp_reply()
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

drop trigger if exists report_comments_stamp_reply on public.report_comments;
create trigger report_comments_stamp_reply
  before update on public.report_comments
  for each row execute function public.stamp_reply();
