-- room counts guest-room baths. The coverage view must count only real stay prices.
create or replace view public.monitor_coverage_by_pref with (security_invoker = true) as
select f.prefecture,
       count(*) as facilities,
       count(*) filter (where (f.record->>'stayPricePerPerson') ~ '^[0-9]+$' or (f.record->'monitor'->'price'->>'minYen') ~ '^[0-9]+$') as stay_price,
       count(*) filter (where coalesce(nullif(f.record->>'dayP',''),'0') not in ('0','null')) as day_price,
       count(*) filter (where exists (select 1 from public.onsen_photos p where p.facility_id = f.id)) as with_photo,
       count(*) filter (where exists (select 1 from public.facility_notices n where n.facility_id = f.id and n.published)) as with_notice,
       count(*) filter (where exists (select 1 from public.monitor_targets t where t.facility_id = f.id and t.enabled)) as monitored
from public.onsen_facilities f
where not f.unlisted
group by f.prefecture;
