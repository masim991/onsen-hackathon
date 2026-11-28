# Official source tracker

Watches each facility's official pages (official site, source page, notice/closure/day-use links) and
flags pages that changed, disappeared, or mention closures/price/hours changes. It only produces
review data. It never edits facility data.

Needs Node 18+ (no dependencies).

## Run

```
node tools/tracker/source-tracker.mjs --selftest                 # offline tests, prints PASS/FAIL
node tools/tracker/source-tracker.mjs --priority --limit 40      # facilities with notice/closed/hideBooking + ryokan-research
node tools/tracker/source-tracker.mjs --ids 14,113               # specific facilities
node tools/tracker/source-tracker.mjs --sample 10                # 10 random non-priority facilities
node tools/tracker/source-tracker.mjs --max-age-days 7 --concurrency 4   # defaults; full run
node tools/tracker/source-tracker.mjs --catalog rows.json        # extra records (array of {id,n,hp,srcUrl,src,research_urls,additional_source_url,extra})
```

Facilities are read from `web/*.js` (same script order as `index.html`). The bundled files hold ~92
records; the 2,729-record catalog lives in the database, so export it to JSON and pass `--catalog`
to cover everything.

URLs checked within `--max-age-days` are skipped, so reruns are incremental. A URL that failed once is retried next run.

## Schedule

Daily `--priority`, weekly the rest (incremental: URLs checked within `--max-age-days` are skipped).

- Windows Task Scheduler:
  - daily: `schtasks /create /sc daily /st 04:00 /tn OnsenTrackerPriority /tr "node C:path	ools	rackersource-tracker.mjs --priority"`
  - weekly: `schtasks /create /sc weekly /d SUN /st 03:00 /tn OnsenTrackerFull /tr "node C:path	ools	rackersource-tracker.mjs --catalog C:path	oolscatalog.json"`
- cron: `0 4 * * * cd /path/to/repo && node tools/tracker/source-tracker.mjs --priority` and `0 3 * * 0 cd /path/to/repo && node tools/tracker/source-tracker.mjs --catalog tools/catalog.json`

A full run takes roughly 20-60 minutes. State and the public file are saved every 50 URLs, so an interrupted run loses little.
After each run read `tools/tracker/summary.txt` (one line: closure items awaiting review and how many are new, newly unreachable, oldest checked date, counts per state).

## Review and dismiss

`node tools/tracker/source-tracker.mjs --review <id> [--until YYYY-MM-DD]` records the current page hash of that facility in `tools/tracker/reviewed.json` (array of `{id,url,hash,until?}`). Its queue items are hidden until the page hash changes again (or `until` passes).

Test options: `--state <file> --out <file>` redirect every output (queue, md, summary, reviewed.json get that state file name as prefix) so tests never touch the real files.

## Outputs

| File | Audience | Content |
|---|---|---|
| `web/data/source-status.json` | public | per facility id exactly `{checked, state, changedAt}`; `state` is ok/changed/unreachable/blocked. No flags, no scraped text. The site shows `blocked` as "cannot be checked automatically". |
| `tools/tracker/review-queue.json` / `.md` | maintainers only | keyword flags (closure/price/hours), what changed, short snippets (<=140 chars, max 5), suggested action |
| `tools/tracker/state.json` | maintainers only | per-URL hash, title, status, snippets. Do not publish. |

Do not deploy `tools/`. Only `web/data/source-status.json` belongs on the site.

## Reading the queue

- `closure-keyword`: closure wording (臨時休業, 休館, 閉館, 廃業, closed...) counted only inside a notice area (near お知らせ/NEWS/重要/information headings, or in a dated list item). Bare 休止 and regular-closing wording (定休日, 休館日) are ignored. Flags stay in the maintainer queue only; they are never published until reviewed.
- `price-keyword`, `hours-keyword`: price revision or hours change wording. Hours need a change word, since most pages mention opening hours.
- `content changed`: normalized text hash differs (dates, clock times, counters, copyright years are ignored). Often cosmetic.
- `changed` state lasts 14 days after the change, then returns to `ok`.
- `unreachable` is published only after 2 consecutive failures (or if the URL never worked). `blocked` (robots.txt, HTTP 401/403, non-HTML, refused URL, TLS/certificate errors) is never shown as unreachable; the last successful check date stays in state (`lastOk`) and the queue. HTTP 429 (rate limit) and 5xx are treated as `unreachable` so they are retried with backoff instead of pinning the target.
- Snippets are untrusted third-party text. Verify on the official page, then edit data by hand.

## Ethics and limits

- Obeys robots.txt (per host, including Crawl-delay up to 30 s). Disallowed pages are skipped, not worked around.
- User-Agent `OnsenHackathonSourceTracker/1.0`; one request at a time per host, >= 2 s apart; max 4 concurrent overall; 20 s timeout (one in-request retry, robots.txt 10 s); 2.5 MB body cap (a larger body is used truncated, not failed); `Accept` ends with `*/*` (some sites answer 406 otherwise); HTML only; max 3 redirects, each re-validated. An `http://` source that cannot connect is retried once over https on the same host, DNS gets one retry on transient resolver errors and IPv4 addresses come first.
- SSRF guard: http/https only, ports 80/443 only, no credentials in URLs, DNS result checked at connect time and private/loopback/link-local/metadata ranges refused.
- Pages are never rendered or executed; raw HTML is never stored; control characters are stripped.
- JavaScript-only pages and sites that block bots cannot be watched. This is a hint for humans, not proof a facility is open or closed.
