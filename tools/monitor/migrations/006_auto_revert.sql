-- 006: let admins request a revert of worker auto-applied changes (auto_applied -> revert_requested) and let the worker revert them.
-- Auto rows have applied_at = null and write no change_id: ownership of record->'monitor'->field is proven by the same quote as the row's evidence.
drop policy if exists "admin review" on public.facility_changes;
create policy "admin review" on public.facility_changes for update to authenticated
  using ((select public.is_admin()) and status in ('pending_review','approved','applied','auto_applied'))
  with check ((select public.is_admin()) and reviewed_by = (select auth.uid()) and status in ('approved','rejected','revert_requested'));

create or replace function public.facility_changes_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and new.status is distinct from old.status and not (
       (old.status = 'pending_review' and new.status in ('approved','rejected'))
    or (old.status = 'approved' and new.status = 'rejected')
    or (old.status in ('applied','auto_applied') and new.status = 'revert_requested')) then
    raise exception 'status change % -> % is not allowed', old.status, new.status;
  end if;
  return new;
end $$;

create or replace function public.monitor_revert_change(p_id bigint) returns text
language plpgsql set search_path = '' as $$
declare c public.facility_changes%rowtype; cur text; m jsonb; q text;
begin
  select * into c from public.facility_changes where id = p_id for update;
  if not found then return 'not_found'; end if;
  if c.status = 'reverted' then return 'already_reverted'; end if;
  if c.status not in ('applied','revert_requested','auto_applied') then return 'skipped:' || c.status; end if;
  select f.record->'monitor'->c.field->>'change_id', f.record->'monitor'->c.field->>'quote', f.record->'monitor' into cur, q, m from public.onsen_facilities f where f.id = c.facility_id for update;
  if not found then return 'no_facility'; end if;
  if c.applied_at is null then
    if cur is not null or q is distinct from c.evidence then return 'superseded'; end if;
  elsif cur is distinct from c.id::text then return 'superseded'; end if;
  m := case when c.applied_prev is null then m - c.field else m || jsonb_build_object(c.field, c.applied_prev) end;
  update public.onsen_facilities
     set record = case when m = '{}'::jsonb then record - 'monitor' else jsonb_set(record, '{monitor}', m, true) end, updated_at = now()
   where id = c.facility_id;
  update public.facility_changes set status = 'reverted', reverted_at = now() where id = c.id;
  return 'reverted';
end $$;
