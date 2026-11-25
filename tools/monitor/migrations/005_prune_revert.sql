-- 005: (a) monitor_revert_change also reverts worker auto_applied rows (they carry no change_id: ownership = same quote as the row's evidence);
--      (b) monitor_prune retention: logs/snapshots/failed jobs older than `days` (default 30; snapshots keep the latest 3 per target), finished ok/skipped jobs older than 14 days.
--      facility_notices / photo_assets / facility_changes are review items and are never pruned. (c) index for the jobs retention scan.
create index if not exists monitor_jobs_finished_idx on public.monitor_jobs (finished_at);

create or replace function public.monitor_revert_change(p_id bigint) returns text
language plpgsql set search_path = '' as $$
declare c public.facility_changes%rowtype; cur text; m jsonb; q text;
begin
  select * into c from public.facility_changes where id = p_id for update;
  if not found then return 'not_found'; end if;
  if c.status = 'reverted' then return 'already_reverted'; end if;
  if c.status not in ('applied','revert_requested','auto_applied') or (c.status <> 'auto_applied' and c.applied_at is null) then return 'skipped:' || c.status; end if;
  select f.record->'monitor'->c.field->>'change_id', f.record->'monitor'->c.field->>'quote', f.record->'monitor' into cur, q, m from public.onsen_facilities f where f.id = c.facility_id for update;
  if not found then return 'no_facility'; end if;
  if c.status = 'auto_applied' then
    if cur is not null or q is distinct from c.evidence then return 'superseded'; end if;
  elsif cur is distinct from c.id::text then return 'superseded'; end if;
  m := case when c.applied_prev is null then m - c.field else m || jsonb_build_object(c.field, c.applied_prev) end;
  update public.onsen_facilities
     set record = case when m = '{}'::jsonb then record - 'monitor' else jsonb_set(record, '{monitor}', m, true) end, updated_at = now()
   where id = c.facility_id;
  update public.facility_changes set status = 'reverted', reverted_at = now() where id = c.id;
  return 'reverted';
end $$;

create or replace function public.monitor_prune(days int default 30) returns jsonb
language plpgsql set search_path = '' as $$
declare l int; s int; j int;
begin
  delete from public.monitor_logs where ts < now() - make_interval(days => days);
  get diagnostics l = row_count;
  delete from public.monitor_snapshots where ctid in (
    select ctid from (select ctid, fetched_at, row_number() over (partition by target_id order by fetched_at desc) rn from public.monitor_snapshots) x
    where rn > 3 and fetched_at < now() - make_interval(days => days));
  get diagnostics s = row_count;
  delete from public.monitor_jobs where (status in ('ok','skipped') and finished_at < now() - interval '14 days')
    or (status = 'failed' and finished_at < now() - make_interval(days => days));
  get diagnostics j = row_count;
  return jsonb_build_object('logs', l, 'snapshots', s, 'jobs', j);
end $$;
revoke all on function public.monitor_prune(int), public.monitor_revert_change(bigint) from public, anon, authenticated;
grant execute on function public.monitor_prune(int), public.monitor_revert_change(bigint) to service_role;
