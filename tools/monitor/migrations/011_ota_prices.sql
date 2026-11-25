-- R6: OTA reference prices, kept in their own table so they can never be shown as the facility's official price.
-- Written only by the service role (tools/ota/rakuten.mjs). Public may read matched rows of public facilities.
-- Revert: drop table public.ota_prices;
create table if not exists public.ota_prices (
  facility_id text not null references public.onsen_facilities(id) on delete cascade,
  ota text not null check (ota in ('rakuten')),
  status text not null check (status in ('matched','nomatch')),
  min_yen integer check (min_yen between 1000 and 1000000),
  hotel_no text,
  matched_name text check (char_length(matched_name) <= 120),
  info_url text check (info_url is null or info_url ~ '^https://'),
  checked_at timestamptz not null default now(),
  primary key (facility_id, ota)
);
alter table public.ota_prices enable row level security;
drop policy if exists "public read matched ota prices" on public.ota_prices;
create policy "public read matched ota prices" on public.ota_prices for select to anon, authenticated
  using (status = 'matched' and exists (select 1 from public.onsen_facilities f where f.id = facility_id and not f.unlisted));
grant select on public.ota_prices to anon, authenticated;
