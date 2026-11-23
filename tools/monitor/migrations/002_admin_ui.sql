-- 002_admin_ui.sql: additive. Admin page support + change pickup. Existing onsen_* tables are NOT altered.

-- 1) facility_changes: admins need an "approved" state (approve != auto-applied by the worker).
alter table public.facility_changes drop constraint if exists facility_changes_status_check;
alter table public.facility_changes add constraint facility_changes_status_check
  check (status in ('auto_applied','pending_review','approved','rejected'));

-- 2) reviewer must be the caller (no attributing a review to someone else).
drop policy if exists "admin review" on public.facility_changes;
create policy "admin review" on public.facility_changes for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and reviewed_by = (select auth.uid()));

-- 3) the public page polls onsen_facilities.updated_at; worker writes must bump it.
create or replace function public.monitor_apply_record(p_fid text, p_key text, p_val jsonb) returns int
language plpgsql set search_path = '' as $$
declare n int;
begin
  if p_key not in ('price','hours') then raise exception 'key not allowed'; end if;
  update public.onsen_facilities
     set record = jsonb_set(coalesce(record, '{}'::jsonb), '{monitor}',
                            coalesce(record->'monitor', '{}'::jsonb) || jsonb_build_object(p_key, p_val), true),
         updated_at = now()
   where id = p_fid;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.monitor_apply_record(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.monitor_apply_record(text, text, jsonb) to service_role;
