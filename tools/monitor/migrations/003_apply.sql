-- 003_apply.sql: additive. Apply APPROVED facility_changes to record->'monitor' (price|hours) and allow reverting them.
-- onsen_* original fields are never touched; the only write is record->'monitor'->{price|hours} + updated_at (the public 60 s poll picks it up).
-- Flow: pending_review -> approved (admin) -> applied (worker) -> revert_requested (admin) -> reverted (worker). rejected = admin or worker (invalid data).

alter table public.facility_changes drop constraint if exists facility_changes_status_check;
alter table public.facility_changes add constraint facility_changes_status_check
  check (status in ('auto_applied','pending_review','approved','rejected','applied','revert_requested','reverted'));

alter table public.facility_changes
  add column if not exists applied_at timestamptz,
  add column if not exists applied_value jsonb,   -- exactly what was written under record->'monitor'->field
  add column if not exists applied_prev jsonb,    -- the value that was there before (null = key did not exist); revert restores it
  add column if not exists reverted_at timestamptz,
  add column if not exists apply_note text;       -- worker reason (rejected as invalid, etc.)

-- Admins (authenticated) keep UPDATE on (status, reviewed_by) only (grant from 001). New columns are SELECT-only for them, nothing for anon.
-- Policy: which rows an admin may touch and which statuses they may set; the trigger below limits the transitions.
drop policy if exists "admin review" on public.facility_changes;
create policy "admin review" on public.facility_changes for update to authenticated
  using ((select public.is_admin()) and status in ('pending_review','approved','applied'))
  with check ((select public.is_admin()) and reviewed_by = (select auth.uid()) and status in ('approved','rejected','revert_requested'));

create or replace function public.facility_changes_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- service role / SQL editor have no auth.uid(): unrestricted (the worker functions below set the other transitions)
  if (select auth.uid()) is not null and new.status is distinct from old.status and not (
       (old.status = 'pending_review' and new.status in ('approved','rejected'))
    or (old.status = 'approved' and new.status = 'rejected')
    or (old.status = 'applied' and new.status = 'revert_requested')) then
    raise exception 'status change % -> % is not allowed', old.status, new.status;
  end if;
  return new;
end $$;
revoke all on function public.facility_changes_guard() from public, anon, authenticated;
drop trigger if exists facility_changes_guard on public.facility_changes;
create trigger facility_changes_guard before update on public.facility_changes
  for each row execute function public.facility_changes_guard();

-- Apply one approved change. Race-safe (row lock) and idempotent (second call = 'already_applied', no write).
-- p_val is the value the worker has already validated; change_id/applied_at are added here.
create or replace function public.monitor_apply_change(p_id bigint, p_val jsonb) returns text
language plpgsql set search_path = '' as $$
declare c public.facility_changes%rowtype; prev jsonb; v jsonb;
begin
  select * into c from public.facility_changes where id = p_id for update;
  if not found then return 'not_found'; end if;
  if c.status = 'applied' then return 'already_applied'; end if;
  if c.status <> 'approved' then return 'skipped:' || c.status; end if;
  if c.field not in ('price','hours') then return 'skipped:field'; end if;
  if jsonb_typeof(p_val) is distinct from 'object' then raise exception 'value must be an object'; end if;
  select f.record->'monitor'->c.field into prev from public.onsen_facilities f where f.id = c.facility_id for update;
  if not found then return 'no_facility'; end if;
  v := p_val || jsonb_build_object('change_id', c.id, 'applied_at', now());
  update public.onsen_facilities
     set record = jsonb_set(coalesce(record, '{}'::jsonb), '{monitor}', coalesce(record->'monitor', '{}'::jsonb) || jsonb_build_object(c.field, v), true),
         updated_at = now()
   where id = c.facility_id;
  update public.facility_changes set status = 'applied', applied_at = now(), applied_value = v, applied_prev = prev, apply_note = null where id = c.id;
  return 'applied';
end $$;

-- Worker found the approved value invalid: never applied, marked rejected with the reason.
create or replace function public.monitor_reject_change(p_id bigint, p_reason text) returns text
language plpgsql set search_path = '' as $$
declare n int;
begin
  update public.facility_changes set status = 'rejected', apply_note = left(p_reason, 200) where id = p_id and status = 'approved';
  get diagnostics n = row_count;
  return case when n = 1 then 'rejected' else 'skipped' end;
end $$;

-- Revert: restore the previous record->'monitor'->field (removed if there was none), status 'reverted', history stays in this row.
-- Only the change that currently owns the key can be reverted ('superseded' otherwise: revert the newer one first).
create or replace function public.monitor_revert_change(p_id bigint) returns text
language plpgsql set search_path = '' as $$
declare c public.facility_changes%rowtype; cur text; m jsonb;
begin
  select * into c from public.facility_changes where id = p_id for update;
  if not found then return 'not_found'; end if;
  if c.status = 'reverted' then return 'already_reverted'; end if;
  if c.status not in ('applied','revert_requested') or c.applied_at is null then return 'skipped:' || c.status; end if;
  select f.record->'monitor'->c.field->>'change_id', f.record->'monitor' into cur, m from public.onsen_facilities f where f.id = c.facility_id for update;
  if not found then return 'no_facility'; end if;
  if cur is distinct from c.id::text then return 'superseded'; end if;
  m := case when c.applied_prev is null then m - c.field else m || jsonb_build_object(c.field, c.applied_prev) end;
  update public.onsen_facilities
     set record = case when m = '{}'::jsonb then record - 'monitor' else jsonb_set(record, '{monitor}', m, true) end, updated_at = now()
   where id = c.facility_id;
  update public.facility_changes set status = 'reverted', reverted_at = now() where id = c.id;
  return 'reverted';
end $$;

revoke all on function public.monitor_apply_change(bigint, jsonb), public.monitor_reject_change(bigint, text), public.monitor_revert_change(bigint)
  from public, anon, authenticated;
grant execute on function public.monitor_apply_change(bigint, jsonb), public.monitor_reject_change(bigint, text), public.monitor_revert_change(bigint) to service_role;
