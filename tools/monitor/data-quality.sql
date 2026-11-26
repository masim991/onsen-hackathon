-- data-quality.sql (R5 A3): READ-ONLY helper queries. Run in the Supabase SQL editor. Nothing here changes facility data.
-- DB price fields are stayPricePerPerson, monitor.price.minYen, and dayP. room is an in-room bath count, not a price. web/data/prices.json is a separate file, so
-- "no price here" does not always mean the site shows none; cross-check candidates with tools/prices before acting.

-- Q1: duplicate official URLs among public (listed) facilities (same host+path, ignoring scheme / www / trailing slash)
with n as (
  select id, name_ko, prefecture,
         regexp_replace(lower(regexp_replace(official_url, '^https?://(www\.)?', '')), '/+$', '') as key
  from public.onsen_facilities where not unlisted and official_url is not null and official_url <> ''
)
select key, count(*) as n, array_agg(id order by id) as ids, array_agg(name_ko order by id) as names
from n group by key having count(*) > 1 order by n desc, key;

-- Q2: candidates missing prices: public, has an official URL, neither stay nor day-use price recorded.
-- Order: prefectures with the most priceless facilities first (gives the monitor / price-finder a hit list); monitor targets shown for context.
with p as (
  select f.id, f.name_ko, f.prefecture, f.official_url,
         ((f.record->>'stayPricePerPerson') ~ '^[0-9]+$' or (f.record->'monitor'->'price'->>'minYen') ~ '^[0-9]+$') as has_stay,
         (nullif(f.record->>'dayP','') is not null and f.record->>'dayP' not in ('0','null')) as has_day
  from public.onsen_facilities f where not f.unlisted and f.official_url is not null and f.official_url <> ''
), pc as (select prefecture, count(*) filter (where not has_stay and not has_day) as missing_in_pref from p group by 1)
select p.id, p.name_ko, p.prefecture, p.official_url, pc.missing_in_pref,
       (select count(*) from public.monitor_targets t where t.facility_id = p.id and t.enabled) as active_targets,
       (select max(t.last_checked_at) from public.monitor_targets t where t.facility_id = p.id and t.kind = 'price_hours') as price_last_checked
from p join pc using (prefecture)
where not p.has_stay and not p.has_day
order by pc.missing_in_pref desc, p.prefecture, p.id;

-- Q3: counts (population for ROLLOUT): public facilities, with official URL, with some price, URL-but-no-price, not yet monitored
select count(*) as listed_with_url,
       count(*) filter (where official_url <> '') as with_url,
       count(*) filter (where (record->>'stayPricePerPerson') ~ '^[0-9]+$' or (record->'monitor'->'price'->>'minYen') ~ '^[0-9]+$' or nullif(record->>'dayP','') is not null) as with_price_in_db,
       count(*) filter (where official_url <> '' and not exists (select 1 from public.monitor_targets t where t.facility_id = f.id)) as url_not_monitored
from public.onsen_facilities f where not unlisted and official_url is not null;

-- Q4: facilities with an official URL that are listed but have a monitor target disabled/failing (for the expansion gate)
select t.facility_id, t.kind, t.enabled, t.last_status, t.fail_count
from public.monitor_targets t join public.onsen_facilities f on f.id = t.facility_id
where not f.unlisted and (t.fail_count >= 3 or (not t.enabled and t.kind <> 'photo')) order by t.fail_count desc limit 100;
