-- One public, read-only revision lets open pages notice changes to facilities,
-- photos, and notices without downloading the full catalog every minute.
create table if not exists public.onsen_catalog_revision (
  id boolean primary key default true check (id),
  revision bigint not null default 0,
  changed_at timestamptz not null default now()
);
insert into public.onsen_catalog_revision (id) values (true) on conflict (id) do nothing;
alter table public.onsen_catalog_revision enable row level security;
revoke all on public.onsen_catalog_revision from public, anon, authenticated;
grant select on public.onsen_catalog_revision to anon, authenticated;
create policy "Published catalog revision is readable" on public.onsen_catalog_revision
  for select to anon, authenticated using (true);

create or replace function public.bump_onsen_catalog_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.onsen_catalog_revision
  set revision = revision + 1, changed_at = clock_timestamp()
  where id = true;
  return null;
end $$;
revoke all on function public.bump_onsen_catalog_revision() from public, anon, authenticated;

create trigger onsen_facilities_catalog_revision
  after insert or update or delete on public.onsen_facilities
  for each statement execute function public.bump_onsen_catalog_revision();
create trigger onsen_photos_catalog_revision
  after insert or update or delete on public.onsen_photos
  for each statement execute function public.bump_onsen_catalog_revision();
create trigger facility_notices_catalog_revision
  after insert or update or delete on public.facility_notices
  for each statement execute function public.bump_onsen_catalog_revision();
