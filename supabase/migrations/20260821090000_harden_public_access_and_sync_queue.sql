-- Stage 2 production hardening for the independent SnookerStats project.
-- This migration is intentionally data-preserving and can be applied online.

-- pg_net was enabled experimentally but is not used by any application
-- function, trigger, webhook, or cron job. Synchronous upstream reads use the
-- separate http extension in the extensions schema.
drop extension if exists pg_net;

-- Public data is read-only. Earlier migrations enabled RLS read policies but
-- inherited broad table grants from the platform defaults.
do $hardening$
declare
  target record;
begin
  for target in
    select c.oid::regclass as relation_name,
           exists (
             select 1
             from pg_policy p
             where p.polrelid = c.oid
               and p.polname like 'public_read_%'
           ) as is_public_read
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname like 'snooker_%'
  loop
    execute format('revoke all on table %s from anon, authenticated', target.relation_name);
    if target.is_public_read then
      execute format('grant select on table %s to anon, authenticated', target.relation_name);
    end if;
  end loop;
end
$hardening$;

revoke all on all sequences in schema public from anon, authenticated;

-- Only the explicitly supported public player-detail RPC remains callable by
-- browser roles. Existing direct service_role grants are unaffected.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.snooker_player_detail_public(text) to anon, authenticated;

revoke all on schema snooker_internal from public, anon, authenticated;
revoke execute on all functions in schema snooker_internal from public, anon, authenticated;

-- These tables are deliberately service-only. Explicit false policies make
-- that intent auditable while service_role continues to bypass RLS.
create policy deny_client_snooker_ops_action_logs
  on public.snooker_ops_action_logs for all to anon, authenticated
  using (false) with check (false);
create policy deny_client_snooker_ops_admins
  on public.snooker_ops_admins for all to anon, authenticated
  using (false) with check (false);
create policy deny_client_snooker_ops_login_attempts
  on public.snooker_ops_login_attempts for all to anon, authenticated
  using (false) with check (false);
create policy deny_client_snooker_ops_sessions
  on public.snooker_ops_sessions for all to anon, authenticated
  using (false) with check (false);
create policy deny_client_snooker_sync_manual_queue
  on public.snooker_sync_manual_queue for all to anon, authenticated
  using (false) with check (false);
create policy deny_client_snooker_sync_task_state
  on public.snooker_sync_task_state for all to anon, authenticated
  using (false) with check (false);
create policy deny_client_snooker_visit_logs
  on public.snooker_visit_logs for all to anon, authenticated
  using (false) with check (false);

create index if not exists snooker_sync_manual_queue_job_key_idx
  on public.snooker_sync_manual_queue(job_key);
create index if not exists snooker_sync_manual_queue_requested_by_idx
  on public.snooker_sync_manual_queue(requested_by)
  where requested_by is not null;
