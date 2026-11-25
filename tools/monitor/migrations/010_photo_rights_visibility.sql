-- Publicly reachable image URLs do not grant republication rights.
-- Keep previously sourced/credited photos visible, but hold the 15 imported
-- photo_assets copies that have only an official-site source URL as evidence.
alter table public.onsen_photos
  add column if not exists published boolean not null default false;

update public.onsen_photos
set published = true
where license <> '시설 공식 사이트 사진 (출처 링크 참조)'
  and not published;

drop policy if exists "Public photo credits are readable" on public.onsen_photos;
create policy "Public photo credits are readable" on public.onsen_photos
  for select to anon, authenticated
  using (
    published
    and exists (
      select 1 from public.onsen_facilities f
      where f.id = onsen_photos.facility_id
    )
  );
