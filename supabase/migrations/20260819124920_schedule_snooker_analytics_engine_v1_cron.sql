select cron.schedule(
  'snooker-analytics-current-refresh-v1',
  '*/15 * * * *',
  $$select snooker_internal.refresh_current_season_analytics();$$
);

select cron.schedule(
  'snooker-analytics-nightly-audit-v1',
  '17 3 * * *',
  $$select snooker_internal.analytics_audit(null);$$
);
