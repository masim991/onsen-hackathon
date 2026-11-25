-- R6: price trend history. One row per observed change of record->monitor->price (any path: worker auto-apply, admin approval, one-off review, revert).
-- Filled by a trigger on onsen_facilities, so GitHub Actions / cron need no code change. Read-only for the public (prices are already public).
-- Revert: drop trigger onsen_price_history_trg on public.onsen_facilities; drop function public.onsen_price_history(); drop view public.price_trend; drop table public.price_history;
create table if not exists public.price_history (
  id bigint generated always as identity primary key,
  facility_id text not null references public.onsen_facilities(id) on delete cascade,
  kind text,                         -- per-person-2meals | per-person-1meal | per-person-room-only | per-person | ...
  min_yen integer not null check (min_yen between 500 and 1000000),
  observed_at date not null,         -- the official page's check date (record.monitor.price.checked) or the write date
  source_url text,
  quote text check (char_length(quote) <= 200),
  change_id bigint,
  recorded_at timestamptz not null default now(),
  unique (facility_id, kind, min_yen, observed_at)
);
create index if not exists price_history_fac_idx on public.price_history (facility_id, observed_at desc);
alter table public.price_history enable row level security;
drop policy if exists "public read price history" on public.price_history;
create policy "public read price history" on public.price_history for select to anon, authenticated
  using (exists (select 1 from public.onsen_facilities f where f.id = facility_id and not f.unlisted));
grant select on public.price_history to anon, authenticated;

create or replace function public.onsen_price_history() returns trigger language plpgsql security definer set search_path = '' as $$
declare p jsonb := new.record->'monitor'->'price'; o jsonb := case when tg_op = 'UPDATE' then old.record->'monitor'->'price' else null end;
begin
  if p is not null and p is distinct from o and (p->>'minYen') ~ '^[0-9]+$' then
    insert into public.price_history (facility_id, kind, min_yen, observed_at, source_url, quote, change_id)
    values (new.id, p->>'kind', (p->>'minYen')::int,
            coalesce(case when (p->>'checked') ~ '^\d{4}-\d{2}-\d{2}$' then (p->>'checked')::date end, current_date),
            p->>'source_url', left(p->>'quote', 200), case when (p->>'change_id') ~ '^[0-9]+$' then (p->>'change_id')::bigint end)
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists onsen_price_history_trg on public.onsen_facilities;
create trigger onsen_price_history_trg after insert or update of record on public.onsen_facilities
  for each row execute function public.onsen_price_history();

-- latest vs previous observation per facility (+ kind): the trend the site / admin can read
create or replace view public.price_trend with (security_invoker = true) as
select h.facility_id, h.kind,
       (array_agg(h.min_yen order by h.observed_at desc, h.id desc))[1] as latest_yen,
       (array_agg(h.min_yen order by h.observed_at desc, h.id desc))[2] as previous_yen,
       max(h.observed_at) as latest_at,
       count(*) as observations,
       case when count(*) > 1 then round(100.0 * ((array_agg(h.min_yen order by h.observed_at desc, h.id desc))[1] - (array_agg(h.min_yen order by h.observed_at desc, h.id desc))[2]) / nullif((array_agg(h.min_yen order by h.observed_at desc, h.id desc))[2], 0), 1) end as change_pct
from public.price_history h group by h.facility_id, h.kind;
grant select on public.price_trend to anon, authenticated;

-- backfill from the prices already applied
insert into public.price_history (facility_id, kind, min_yen, observed_at, source_url, quote, change_id)
select f.id, f.record->'monitor'->'price'->>'kind', (f.record->'monitor'->'price'->>'minYen')::int,
       coalesce(case when (f.record->'monitor'->'price'->>'checked') ~ '^\d{4}-\d{2}-\d{2}$' then (f.record->'monitor'->'price'->>'checked')::date end, f.updated_at::date),
       f.record->'monitor'->'price'->>'source_url', left(f.record->'monitor'->'price'->>'quote', 200),
       case when (f.record->'monitor'->'price'->>'change_id') ~ '^[0-9]+$' then (f.record->'monitor'->'price'->>'change_id')::bigint end
from public.onsen_facilities f
where (f.record->'monitor'->'price'->>'minYen') ~ '^[0-9]+$'
on conflict do nothing;
