# Celestial Companions Reports

A small static website that holds the progress reports and planning documents
for **Celestial Companions**, a memorial companion service for pets. The
companion itself (the 3D player) lives in a separate repository.

This repository contains documents only.

## Contents

| Page | What it is |
|---|---|
| `/` | Index of all reports, newest first |
| `/blueprint/` | Draft system plan: how the system fits together, how an order moves, making one companion, what exists today, order of work, questions, and a technical appendix |

## Hosting

Plain HTML with no build step, so it deploys as-is to any static host. On
Vercel, choose the "Other" framework preset and leave the build command and
output directory empty. The blueprint page loads the Mermaid diagram library
from a CDN, so it needs an internet connection to draw its diagrams.

## Comments (Supabase)

The blueprint has an answer box under each question and a comments box at the end.
They save to a small Supabase database, so Ms Kay can reply from the page and you
can read and answer everything in one place.

One-time setup:

1. Create a Supabase project (choose a UK or EU region such as London).
2. Open the SQL editor, paste in `supabase/schema.sql` and run it. (It is safe to run again.)
3. In Project Settings > API, copy the Project URL and the `anon public` key (or the newer
   `publishable` key) into `assets/comments-config.js`. The anon key is meant to be public. Never put the
   `service_role` key in this repository.
4. Push to GitHub and Vercel redeploys.

Each page labels its comments with its own key (`data-report` on the script tag; this
site uses `ccom-blueprint`), so one Supabase project can hold comments for several
report sites. Filter by the `report` column in the Table Editor. Use a separate project
from any app database.

Each reader gets one answer per question and one comment at the end. After she saves, the
input is replaced by what she wrote; the pen icon (or a double-click) turns it back into an
input so she can change it. The row is updated, and `updated_at` shows when it was last edited.

Reading and replying: open Table Editor > `reports_site_comments`. Every answer and
comment is a row. To reply, type into that row's `reply` cell; the reply appears
under her comment on the page the next time she opens it.

How it stays private: nobody can read or write the table directly. Each browser makes
up a private random id, and the page can only save and fetch comments under that id, through
two database functions. So Ms Kay sees her own comments (and your
replies) on the device she wrote them on, and no one else's. If she switches device
she will not see her earlier comments there, though you still will.

Until the two values are filled in, the boxes still show but are greyed out and marked
"Preview only: saving is not switched on yet."

## Inbox (reading and replying)

`/inbox/` is a private page for reading every answer and comment and replying to them,
instead of working in the Supabase table. It is not linked from the reports site and asks
for a passphrase.

One-time setup, after `supabase/schema.sql` has been run:

1. In the Supabase SQL editor, run `supabase/owner-inbox.sql`. It only adds new things.
2. Make a long random passphrase, for example with
   `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`,
   and keep it in a password manager.
3. In the SQL editor, run the one statement shown in the comment at the top of
   `owner-inbox.sql`, with your passphrase in place of the placeholder. Do not save the real
   passphrase into the file.
4. Push, then open `/inbox/` and type the passphrase.

Replies you type there are saved to the `reply` column and appear under her answer the next
time she opens the page. There is no email alert yet, so the inbox has to be opened to see
new comments.

## Adding a report

1. Copy an existing folder (for example `blueprint/`) and rename it.
2. Edit its `index.html`.
3. Add a card for it to the root `index.html`.
