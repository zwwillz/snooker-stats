update public.snooker_sync_policies set schedule_mode='manual',configurable=false,updated_at=now() where job_key='ranking_world_live';
update public.snooker_sync_task_state set next_run_at=null,updated_at=now() where job_key in ('rankings_all','ranking_world_live');
