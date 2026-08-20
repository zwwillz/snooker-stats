# 147数据局 domain

This directory contains the public read models, data loaders, live-data adapters, ranking and analytics views used by the independent website.

Data flow: dedicated Supabase -> server-side public read models -> optional WST live overlay -> `/api/snooker/v1/*` -> responsive UI.

`schema.sql` documents the base domain schema. Deployable incremental changes and the privileged API source are versioned under `supabase/`.
