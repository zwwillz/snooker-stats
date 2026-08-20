create table if not exists public.snooker_visit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text not null,
  ip_address text,
  path text not null,
  page_label text not null default '',
  event_label text not null default '',
  region text not null default '未知',
  device text not null default '未知',
  referrer text not null default '',
  user_agent text not null default ''
);

create index if not exists snooker_visit_logs_created_at_idx
  on public.snooker_visit_logs (created_at desc);
create index if not exists snooker_visit_logs_visitor_created_idx
  on public.snooker_visit_logs (visitor_id, created_at desc);
create index if not exists snooker_visit_logs_ip_created_idx
  on public.snooker_visit_logs (ip_address, created_at desc)
  where ip_address is not null;

alter table public.snooker_visit_logs enable row level security;
revoke all on table public.snooker_visit_logs from anon, authenticated;

create or replace function public.snooker_visit_list(
  p_from timestamptz,
  p_to timestamptz,
  p_query text default '',
  p_limit integer default 101,
  p_offset integer default 0
)
returns table (
  id uuid,
  "createdAt" timestamptz,
  "visitorId" text,
  "ipAddress" text,
  path text,
  "pageLabel" text,
  "eventLabel" text,
  region text,
  device text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    logs.id,
    logs.created_at as "createdAt",
    logs.visitor_id as "visitorId",
    logs.ip_address as "ipAddress",
    logs.path,
    logs.page_label as "pageLabel",
    logs.event_label as "eventLabel",
    logs.region,
    logs.device
  from public.snooker_visit_logs logs
  where logs.created_at >= p_from
    and logs.created_at < p_to
    and logs.path not like '/snooker/site-monitor%'
    and logs.path not like '/snooker/data-ops%'
    and (
      coalesce(trim(p_query), '') = ''
      or lower(concat_ws(
        ' ',
        logs.visitor_id,
        logs.ip_address,
        logs.path,
        logs.page_label,
        logs.event_label,
        logs.region,
        logs.device
      )) like '%' || lower(trim(p_query)) || '%'
    )
  order by logs.created_at desc, logs.id desc
  limit least(greatest(p_limit, 1), 101)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.snooker_visit_list(timestamptz, timestamptz, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.snooker_visit_list(timestamptz, timestamptz, text, integer, integer)
  to service_role;
