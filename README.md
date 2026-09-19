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
2. Open the SQL editor, paste in `supabase/schema.sql` and run it.
3. In Project Settings > API, copy the Project URL and the `anon public` key into
   `assets/comments-config.js`. The anon key is meant to be public. Never put the
   `service_role` key in this repository.
4. Push to GitHub and Vercel redeploys.

Reading and replying: open Table Editor > `report_comments`. Every answer and
comment is a row. To reply, type into that row's `reply` cell; the reply appears
under her comment on the page the next time she opens it.

How it stays private: anyone with the link can add a comment, but nobody can read
the table directly. Each browser makes up a private random id, and the page can only
ask for comments saved with that id. So Ms Kay sees her own comments (and your
replies) on the device she wrote them on, and no one else's. If she switches device
she will not see her earlier comments there, though you still will.

Until the two values are filled in, the boxes still show but are greyed out and marked
"Preview only: saving is not switched on yet."

## Adding a report

1. Copy an existing folder (for example `blueprint/`) and rename it.
2. Edit its `index.html`.
3. Add a card for it to the root `index.html`.
