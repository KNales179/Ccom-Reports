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

## Adding a report

1. Copy an existing folder (for example `blueprint/`) and rename it.
2. Edit its `index.html`.
3. Add a card for it to the root `index.html`.
