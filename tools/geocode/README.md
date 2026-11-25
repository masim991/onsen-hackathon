# Hot-spring geocoder

Writes `web/data/coords.json` (one coordinate + precision tier per facility id).

    node tools/geocode/geocode.mjs [--limit N] [--ids a,b] [--only-missing] [--area-only] [--local]

- Facility list: the public Supabase catalog the site uses (2,729 rows, read-only); `--local` or an outage falls back to `web/*.js` RAW.
- Prints a progress line every 25 items and a summary. Saves coords.json + cache.json atomically every 25 items, so Ctrl-C and rerun is safe.
- `--only-missing` skips ids already in coords.json. Without it, items are recomputed, but every HTTP answer is cached in `cache.json`, so reruns (e.g. after tightening rules) cost no requests.
- Full run: ~2,729 items, roughly 2 hours at 1 request/s. Run it in the background.

## Tiers (never silently guessed)
| precision | source | rule |
|---|---|---|
| `facility` | osm | Nominatim hit for the Japanese name + prefecture; inside the prefecture polygon (2 km slack for simplified coasts); OSM class is lodging/bath/tourism/building; name matches (generic words and parentheses stripped, key >= 2 chars); ambiguous ties > 5 km apart are rejected; and the point must be within 40 km of the facility's hot-spring area point. |
| `area` | gsi / osm | Hot-spring area (area_ja) via GSI address search, else Nominatim place/boundary/station; inside the prefecture; name must contain the area; ambiguous same-name places in the prefecture (> 5 km apart) are skipped. Approximate: draw as an area marker, not an exact pin. |
| `prefecture` | pref | Centroid of the prefecture polygon. Not a real location: do not draw an exact pin. |

Entries also carry `query`, `osmType`, `matched` (name that was matched) and `checked`.

## Limits
- Only the Japanese facility/area name and the prefecture are sent. User-Agent `OnsenHackathonGeocoder/1.0`.
- Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/): max 1 request/s, identifying User-Agent, cache results, no bulk abuse. This tool is serial with a 1.1 s gap, 15 s timeout, exponential backoff on 429/5xx. Do not run several copies at once. Data (c) OpenStreetMap contributors (ODbL): credit it where pins are shown; GSI results come from the Geospatial Information Authority of Japan.
- Facilities unknown to OSM (many small ryokan) land in the `area` tier by design. Generic one-word names can still match another place with the same name inside the 40 km window, so treat `facility` as "verified-by-rules", not surveyed.
