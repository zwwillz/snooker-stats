create policy service_role_manage_event_series_rules
on snooker_internal.event_series_rules
for all
to service_role
using (true)
with check (true);
