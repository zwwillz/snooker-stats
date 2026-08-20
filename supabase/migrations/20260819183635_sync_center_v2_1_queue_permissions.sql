revoke all on function snooker_internal.enqueue_sync_task(text,uuid) from public,anon,authenticated;
revoke all on function snooker_internal.sync_manual_queue_worker() from public,anon,authenticated;
revoke all on function snooker_internal.sync_error_message(text) from public,anon,authenticated;
