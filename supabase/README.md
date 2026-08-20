# Supabase source of truth

This directory contains the reproducible database and Edge Function assets for
the independent 147数据局 project.

## What is versioned

- migrations/: the 58 SQL migrations recovered from the production project,
  followed by reviewed independent-project migrations.
- functions/: active Edge Functions whose deployed source was recovered from
  the production project.
- retired-functions/: disabled production endpoints retained for audit only.
- config.toml: per-function JWT verification settings.

No production match data, visit logs, administrator records, sessions, API
secrets, or service-role credentials are stored in this repository.

## Recovery workflow

Install the current Supabase CLI and a Docker-compatible runtime, then run:

~~~bash
supabase start
supabase db reset
~~~

For a new hosted project, link only the new empty project and preview before
applying anything:

~~~bash
supabase link --project-ref <new-project-ref>
supabase db push --dry-run
supabase db push
supabase functions deploy
~~~

Never run supabase db reset --linked against production.

After schema changes, regenerate the checked-in public types:

~~~bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
~~~

All future database changes must begin as a new file under
supabase/migrations/ and be reviewed before deployment. Do not make untracked
production schema changes through the Dashboard SQL editor.

## Production deployment checklist

1. Take or verify a current Supabase backup.
2. Run `supabase db push --dry-run` and review the exact migration list.
3. Deploy database migrations before application code that depends on them.
4. Run the Supabase security and performance advisors.
5. Verify the homepage, player detail RPC, Sync Center, visit logging, and the
   three production cron jobs.

The `20260820192152` hardening migration is data-preserving. It removes the
unused `pg_net` extension, changes browser table privileges to read-only,
adds explicit deny policies to service-only tables, and indexes both manual
queue foreign keys. If an unknown integration is later found to require
`pg_net`, restore it with `create extension pg_net;` after reviewing that
integration.
