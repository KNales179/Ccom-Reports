-- Private inbox for reading and replying to the report comments.
--
-- ADDITIVE ONLY: this adds one small table and three functions. It does not change the comments
-- table, its functions, or anything the report pages already use.
-- Run it once in the Supabase SQL editor, after schema.sql has been run.
--
-- After running it, set your passphrase ONCE by running the statement below in the SQL editor,
-- with your own long random passphrase in place of the placeholder. Do not save the real
-- passphrase in this file, so it never reaches GitHub. Keep it in a password manager.
--
--   insert into public.reports_site_owner (secret_hash)
--   values (encode(sha256(convert_to('PASTE-YOUR-LONG-RANDOM-PASSPHRASE-HERE', 'utf8')), 'hex'))
--   on conflict (id) do update set secret_hash = excluded.secret_hash;
--
-- Until a passphrase is set, nobody can open the inbox.

create table if not exists public.reports_site_owner (
  id          boolean primary key default true check (id),
  secret_hash text not null
);

alter table public.reports_site_owner enable row level security;
revoke all on public.reports_site_owner from anon, authenticated;

-- Internal check used by the two functions below. Readers of the report pages cannot call it.
create or replace function public.owner_check_site_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reports_site_owner o
    where o.secret_hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'utf8')), 'hex')
  );
$$;

revoke all on function public.owner_check_site_secret(text) from public;

-- List every comment for one report, newest first. Needs the passphrase.
create or replace function public.owner_list_site_comments(p_secret text, p_report text)
returns table (
  id           uuid,
  report       text,
  question_key text,
  author_name  text,
  body         text,
  created_at   timestamptz,
  updated_at   timestamptz,
  reply        text,
  replied_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.owner_check_site_secret(p_secret) then
    perform pg_sleep(1);
    raise exception 'not allowed';
  end if;
  return query
    select c.id, c.report, c.question_key, c.author_name, c.body, c.created_at, c.updated_at, c.reply, c.replied_at
    from public.reports_site_comments c
    where c.report = p_report
    order by c.created_at desc;
end;
$$;

-- Write (or change) the reply to one comment. Needs the passphrase. The time is stamped for you.
create or replace function public.owner_reply_site_comment(p_secret text, p_id uuid, p_reply text)
returns table (
  id         uuid,
  reply      text,
  replied_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.owner_check_site_secret(p_secret) then
    perform pg_sleep(1);
    raise exception 'not allowed';
  end if;
  return query
    update public.reports_site_comments c
       set reply = nullif(btrim(p_reply), '')
     where c.id = p_id
    returning c.id, c.reply, c.replied_at;
end;
$$;

revoke all on function public.owner_list_site_comments(text, text) from public;
revoke all on function public.owner_reply_site_comment(text, uuid, text) from public;
grant execute on function public.owner_list_site_comments(text, text) to anon;
grant execute on function public.owner_reply_site_comment(text, uuid, text) to anon;
