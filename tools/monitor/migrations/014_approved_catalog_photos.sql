begin;

alter table public.onsen_photos
  add column if not exists monitor_asset_id bigint
    references public.photo_assets(id) on delete cascade;
create unique index if not exists onsen_photos_monitor_asset_id_uidx
  on public.onsen_photos (monitor_asset_id);

-- Older candidate status flags do not carry enough evidence to publish automatically.
create or replace function public.publish_monitor_photo(
  p_id bigint,
  p_facility_id text,
  p_asset_url text,
  p_sha256 text,
  p_image_path text,
  p_caption text,
  p_author text,
  p_license text,
  p_source_url text,
  p_permission_url text default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  asset public.photo_assets%rowtype;
  image_path text := btrim(coalesce(p_image_path, ''));
  caption text := btrim(coalesce(p_caption, ''));
  author text := btrim(coalesce(p_author, ''));
  source_url text := btrim(coalesce(p_source_url, ''));
  terms text;
  wikimedia boolean;
  https_pattern constant text := '^https://[A-Za-z0-9.-]+/[^[:space:]<>"'']+$';
begin
  -- The caller has no direct write access to the catalog, and this RPC is shared by authenticated sessions.
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception '관리자만 사진을 공개할 수 있습니다.' using errcode = '42501';
  end if;

  select * into asset from public.photo_assets where id = p_id for update;
  if not found or asset.facility_id is distinct from p_facility_id
    or asset.image_url is distinct from p_asset_url or asset.sha256 is distinct from p_sha256 then
    raise exception '사진 후보가 변경됐습니다. 새로 불러와 시설과 이미지를 다시 확인하세요.';
  end if;
  if asset.publish_state in ('logo_review', 'logo_approved', 'rejected', 'check_failed')
    or asset.ai_label in ('logo', 'map_doc') or asset.license_status = 'rejected' then
    raise exception '로고, 문서, 반려되거나 검사에 실패한 사진은 공개할 수 없습니다.';
  end if;
  if char_length(caption) not between 1 and 200 or char_length(author) not between 1 and 120
     or caption ~ '[[:cntrl:]<>"'']' or author ~ '[[:cntrl:]<>"'']'
     or source_url !~ https_pattern or char_length(source_url) > 450 then
    raise exception '사진 설명, 저작자와 HTTPS 원출처를 확인하세요.';
  end if;

  wikimedia := image_path ~* '^https://upload[.]wikimedia[.]org/wikipedia/commons/[0-9a-f]/[0-9a-f]{2}/[a-z0-9_%().!,~+-]+[.](jpg|jpeg|png|webp)$';
  if char_length(image_path) > 450 or not (
    (wikimedia and image_path = asset.image_url
      and source_url = 'https://commons.wikimedia.org/wiki/File:' || regexp_replace(image_path, '^.*/', ''))
    or (image_path ~* '^images/[a-z0-9_-]+(/[a-z0-9_-]+)*([.][a-z0-9_-]+)*[.](jpg|jpeg|png|webp)$')
  ) then
    raise exception '배포된 images/ 파일 또는 원출처와 일치하는 Wikimedia Commons 원본만 공개할 수 있습니다.';
  end if;

  terms := case p_license
    when 'CC BY 4.0' then 'https://creativecommons.org/licenses/by/4.0/'
    when 'CC BY-SA 4.0' then 'https://creativecommons.org/licenses/by-sa/4.0/'
    when 'CC BY 3.0' then 'https://creativecommons.org/licenses/by/3.0/'
    when 'CC BY-SA 3.0' then 'https://creativecommons.org/licenses/by-sa/3.0/'
    when 'CC BY 2.0' then 'https://creativecommons.org/licenses/by/2.0/'
    when 'CC BY-SA 2.0' then 'https://creativecommons.org/licenses/by-sa/2.0/'
    when 'CC0 1.0' then 'https://creativecommons.org/publicdomain/zero/1.0/'
    when 'Public domain' then 'https://creativecommons.org/publicdomain/mark/1.0/'
    when 'Permission granted' then btrim(coalesce(p_permission_url, ''))
    else null end;
  if terms is null or terms !~ https_pattern or char_length(terms) > 450
     or (p_license = 'Permission granted' and wikimedia) then
    raise exception '지원되는 라이선스 또는 재게시 허가를 확인할 수 있는 HTTPS 문서가 필요합니다.';
  end if;

  update public.photo_assets
     set license_status = 'verified', published = true,
         publish_state = case when asset.publish_state = 'hold_license' then 'approved' else asset.publish_state end
   where id = p_id;

  insert into public.onsen_photos
    (facility_id, image_key, image_path, caption, author, license, metadata, sort_order, monitor_asset_id)
  values
    (asset.facility_id, 'monitor/' || asset.id || '.jpg', image_path, caption, author, p_license,
     jsonb_build_object('kind', 'facility', 'source', source_url, 'terms', terms,
       'credit', author || ' · ' || p_license, 'monitor_approved', true), 50, asset.id)
  on conflict (monitor_asset_id) do update
     set image_path = excluded.image_path, caption = excluded.caption, author = excluded.author,
         license = excluded.license, metadata = excluded.metadata;
  return true;
end;
$$;
revoke all on function public.publish_monitor_photo(bigint,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.publish_monitor_photo(bigint,text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.withdraw_monitor_photo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- A photo may be revised by an importer after review. Remove the old public approval in that case.
  if not new.published or new.license_status <> 'verified'
    or new.publish_state in ('logo_review','logo_approved','rejected','check_failed')
    or new.ai_label in ('logo','map_doc')
    or (new.facility_id, new.image_url, new.sha256, new.license_source, new.license_note)
      is distinct from (old.facility_id, old.image_url, old.sha256, old.license_source, old.license_note) then
    if exists (select 1 from public.onsen_photos where monitor_asset_id = new.id) then
      delete from public.onsen_photos where monitor_asset_id = new.id;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.withdraw_monitor_photo() from public, anon, authenticated;
drop trigger if exists withdraw_monitor_photo on public.photo_assets;
create trigger withdraw_monitor_photo after update on public.photo_assets
  for each row execute function public.withdraw_monitor_photo();

commit;
