-- 004: 소프트 숨김. 행은 지우지 않고 unlisted=true 이면 공개(익명/로그인) 읽기에서만 빠진다.
-- 관리자(is_admin)와 service_role(RLS 우회)은 전부 본다. 되돌리기: tools/cleanup/unhide.sql
alter table public.onsen_facilities add column if not exists unlisted boolean not null default false;

drop policy if exists "Public catalog is readable" on public.onsen_facilities;
create policy "Public catalog is readable" on public.onsen_facilities
  for select to anon, authenticated using (not unlisted);
drop policy if exists "admin select" on public.onsen_facilities;
create policy "admin select" on public.onsen_facilities
  for select to authenticated using ((select public.is_admin()));

-- 숨긴 시설의 사진 행도 공개하지 않는다(onsen_facilities RLS를 그대로 따른다).
drop policy if exists "Public photo credits are readable" on public.onsen_photos;
create policy "Public photo credits are readable" on public.onsen_photos
  for select to anon, authenticated
  using (exists (select 1 from public.onsen_facilities f where f.id = onsen_photos.facility_id));
