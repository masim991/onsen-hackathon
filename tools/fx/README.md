# JPY exchange-rate tracker

Writes `web/data/fx.json` (JPY -> KRW, USD). Node 24, no dependencies, no keys.

## Honesty about "real time"
Free public sources update hourly (open.er-api.com, about daily) or only once per day
(frankfurter.dev, fawazahmed0 give a date, not a time). Polling faster than every few
minutes does not give fresher data. Each source's own update time is recorded as `asOf`
(date-only sources are treated as 00:00 UTC of that date). `status` is `stale` when the
newest agreeing source update is older than 36 hours, or when the previous value was kept.

## Run
```
node tools/fx/fx-tracker.mjs                      # one run; exit 1 only if nothing publishable
node tools/fx/fx-tracker.mjs --watch              # every 300 s
node tools/fx/fx-tracker.mjs --watch --interval 600   # min 60; Ctrl+C stops cleanly
node tools/fx/fx-tracker.mjs --selftest           # validation logic, prints PASS/FAIL
```
Windows Task Scheduler (hourly):
`schtasks /Create /SC HOURLY /TN OnsenFx /TR "node C:\path\to\repo\tools\fx\fx-tracker.mjs"`
cron: `0 * * * * cd /path/to/repo && node tools/fx/fx-tracker.mjs >> fx.log 2>&1`

## Validation
Sources: open.er-api.com, api.frankfurter.dev, cdn.jsdelivr.net (fawazahmed0 currency-api).
Range check: KRW per JPY 3-15, USD per JPY 0.003-0.02 (rejects NaN/0/negative).
A source deviating more than 1.5% from the median of the others (either currency) is rejected.
At least 2 agreeing sources are needed; the published value is their median.
Otherwise the previous good value is kept with `status: "stale"` (no previous file: failure).
Only the 3 hosts are allowed, 10 s timeout, 200 KB cap, redirects only within the same whitelist, UA `OnsenHackathonFx/1.0`.

## fx.json
```
{ "base":"JPY",
  "rates":{"KRW":8.44,"USD":0.0063},
  "asOf":"ISO time of newest agreeing source update",
  "fetchedAt":"ISO time of this run",
  "sources":[{"name","ok","asOf","rates":{"KRW","USD"}|null,"error"?}],
  "status":"ok (3 agree) | degraded (2 agree) | stale",
  "history":[{"t":"ISO","KRW":..,"USD":..}]  // last 48; a sample is added when the value changes or 30+ min passed
}
```
