-- TRUNCATE does not fire INSERT/UPDATE/DELETE triggers.
create trigger onsen_facilities_catalog_revision_truncate
  after truncate on public.onsen_facilities
  for each statement execute function public.bump_onsen_catalog_revision();
create trigger onsen_photos_catalog_revision_truncate
  after truncate on public.onsen_photos
  for each statement execute function public.bump_onsen_catalog_revision();
create trigger facility_notices_catalog_revision_truncate
  after truncate on public.facility_notices
  for each statement execute function public.bump_onsen_catalog_revision();
