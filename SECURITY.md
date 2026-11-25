# SECURITY (maintainers)

Static site (`web/`, no build) + Supabase read-only catalog + planned crawler/FX tools.
Scan before every release: `node tools/security/check.mjs` (exit 1 = blocker).

## 1. Threat model

| Threat | Where | Impact |
|---|---|---|
| XSS via record text | DB rows / `data.js` strings rendered with `innerHTML` | Script runs on our origin |
| Malicious URLs | `official_url`, `source_url`, photo URLs in rows | `javascript:` links, phishing, tracking pixels |
| Third-party hosts | fonts, map tiles, FX APIs, CDN | Compromised/hijacked host injects content or leaks IPs |
| Data poisoning | Anyone with a write path to Supabase (leaked key, bad import, crawler bug) | Wrong or hostile content shown to every visitor |
| Key exposure | Keys committed to repo, pasted in chat, bundled into JS | Full DB write/read of private tables |
| SSRF / abuse by crawler tools | `tools/` fetching URLs taken from rows or pages | Hits internal IPs/metadata, follows redirects, hammers small sites |
| Wrong-data harm | Stale prices, closed facilities, wrong coordinates | Traveller wasted trip or misses a closure |
| Clickjacking / MIME sniffing | Any page | UI redress, content-type confusion |

## 2. Existing controls

- **Ingestion sanitising** (`web/db-loader.js`): every string from Supabase passes `esc()` (HTML-escape, recursive via `clean`);
  every URL passes `safeUrl()` (only `http:`/`https:`, re-serialised then escaped). `sources.js` reads raw rows, so it has its own `esc`/`url` and escapes every interpolation (helpers named `safe*()` return escaped HTML; `check.mjs` treats it as STRICT).
- **Supabase RLS** (verified read-only on 2026-11-21 via MCP, nothing changed):
  - `onsen_facilities`: RLS on, one policy `SELECT` for `anon, authenticated`; anon has no INSERT/UPDATE/DELETE privilege.
  - `onsen_photos`: same (SELECT only).
  - `onsen_source_candidates`: RLS on, **no policies = deny-all** for anon/authenticated (advisor reports it as INFO; intentional).
  - Security advisor (re-checked 2026-11-21): no WARN/ERROR findings, only that INFO.
- **CSP + headers** (section 3). **No inline `<script>`** anywhere, so `script-src 'self'` holds without nonces.
- **Links**: external anchors use `rel="noopener"`; checked by `check.mjs` (b, c).
- **Repo scanner** `tools/security/check.mjs`: secrets, noopener, `javascript:` hrefs, unescaped HTML sinks,
  eval, CSP presence/strength and header parity, data-file schema, unlisted third-party hosts.

## 3. Content-Security-Policy

Delivered twice: `<meta http-equiv>` in every HTML page and real headers in `web/serve.json` (dev) and `vercel.json` (prod).
Meta cannot carry `frame-ancestors`, so only the header does. Source of truth: `tools/security/csp.txt` (meta, without frame-ancestors).
`check.mjs` fails if the meta and headers drift apart.

| Directive | Allowed | Why |
|---|---|---|
| `script-src` | `'self'` | Own JS and vendored Leaflet only. No `unsafe-inline`, no `unsafe-eval` |
| `style-src` | `'self' 'unsafe-inline'`, `fonts.googleapis.com`, `cdn.jsdelivr.net` | Google Fonts CSS, Pretendard CSS; inline `style=""` attributes are used by the UI |
| `font-src` | `'self' data:`, `fonts.gstatic.com`, `cdn.jsdelivr.net` | Font files |
| `img-src` | `'self' data: blob:`, `upload.wikimedia.org`, `commons.wikimedia.org`, `cyberjapandata.gsi.go.jp` | Hero photos (upload), catalog photos via `commons.wikimedia.org/wiki/Special:FilePath/...` redirects, GSI map tiles |
| `connect-src` | `'self'`, `frncsllpkxrsgxyqsfwd.supabase.co`, `open.er-api.com`, `api.frankfurter.dev`, `cdn.jsdelivr.net` | Catalog REST, two FX APIs, FX fallback JSON on jsDelivr, same-origin `data/*.json` |
| `object-src` / `base-uri` / `form-action` | `'none'` / `'self'` / `'self'` | No plugins, no `<base>` hijack, no off-site form posts |
| `frame-ancestors` (header only) | `'none'` | Anti-clickjacking |

Other headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` denying camera, microphone, geolocation, payment, usb, `Cross-Origin-Opener-Policy: same-origin`.
`upgrade-insecure-requests` is deliberately absent (breaks `http://localhost` dev). Add it to `vercel.json` only.
Google Maps is an outbound link only, so it is not in the CSP.

Deliberately **not** allowed: photo hosts other than Wikimedia. Seven catalog rows (`tabi-1.online`, `camel3.com`) point to
third-party hotlinked images and are blocked by CSP. Replace them with licensed Wikimedia/local images rather than widening `img-src`.
Adding a host: edit `csp.txt`, copy to all pages, `serve.json`, `vercel.json`, run `check.mjs`, justify the host in this table.

## 4. Secrets

- Only the **publishable** key (`sb_publishable_...`) may appear in the repo. It is public by design and safe only because of RLS.
- Never commit, paste in chat/issues, or ship to the browser: `service_role`, `sb_secret_...`, DB passwords, Vercel/GitHub tokens, private keys.
- Crawler/import tools read secrets from environment variables only (keep `.env` out of git), never from tracked files.
- `check.mjs` (a) fails on these patterns. If one is ever committed: treat as leaked, rotate first, clean history second.
- Never run migrations or writes with the browser key; writes go through a maintainer-run script with a server-side key.

## 5. Data-update review process

1. **Tools only flag, humans approve.** Crawlers write to `onsen_source_candidates` (deny-all to the public) or to `web/data/*.json`
   as *proposals*; they never write to `onsen_facilities`/`onsen_photos` and never to the live site directly.
2. Each proposal carries: record id, field, old value, new value, source URL, fetched-at, tool version.
3. A maintainer reviews the diff (price, open/closed, coordinates especially), then promotes it. Promotion is logged:
   who, when, record id, field, old, new, source (append-only `CHANGELOG`/migration note in the PR description).
4. Free text from crawled pages is never promoted verbatim: only typed fields (numbers, enums, whitelisted URLs).
5. Crawler rules: HTTPS only; allow-list of hosts per source; resolve DNS and refuse private/loopback/link-local IPs; limit redirects
   (max 3, re-check host each hop); timeout 10 s; response cap 2 MB; honour robots.txt; >=2 s between requests per host; descriptive User-Agent.
6. Wrong-data guard: show "as of" dates; coordinates must fall inside the Japan bbox and carry a precision label
   (`check.mjs` g); prices outside 0.2x-5x of the previous value, or a facility flipping to closed, require a second look.
7. `data/fx.json` rates must be numeric and in range; the page falls back to the live APIs if the file is stale.

## 5b. Data and UI surfaces added in the final upgrade

| Surface | Risk | Control |
|---|---|---|
| `web/data/coords.json` (geocode output) | Wrong or fake-precise location | Same-origin fetch; `check.mjs` g: lat/lon finite and inside the Japan bbox, `precision` in `{facility, area, prefecture}`. Never draw an exact-looking pin below the facility tier |
| `web/data/fx.json` | Stale or poisoned rate | Numeric, in range (g); ignored when `fetchedAt` is older than 36 h (live APIs take over); original yen price always shown beside the conversion |
| `web/data/source-status.json` | Misleading "closed" claims about a real business | `check.mjs` g: `state` in `{ok, changed, unreachable, blocked}`, `flags` in the 3 known keywords, ISO dates. **Public status policy** below |
| Google Maps link | Outbound only, built from validated numbers | `Number.isFinite` + range check, `encodeURIComponent`, `rel="noopener"`. Not in the CSP (navigation, not a resource) |
| OSM / GSI attribution | Licence obligation, not a security issue | Shown on every non-prefecture map view. Geocode data comes from OSM (ODbL); tiles from GSI (already in `img-src`) |
| `page.js`, `cover.js` | Build HTML from page headings / DOM text | Scanned by `check.mjs` d; `textContent` re-inserted as HTML is the one pattern to avoid (known WARN in `page.js` TOC: use `textContent` on a created node) |
| URL-state carry across the language switch | Reflected XSS / open redirect via `?q=`, `#id` | Allow-list parsing only: `lang` enum, region/pref/kind from known keys, ids `^[\w-]{1,80}$`. Rebuild links from parsed values, never copy raw `location`. `check.mjs` i fails when `location.search/hash` (or a variable from it) reaches an HTML sink unescaped |
| `fetch()` calls | Data sent to / read from unknown hosts | `check.mjs` j: every `fetch(` is same-origin or an `https://` host in `connect-src` |
| `tools/catalog.json` | Offline copy of the DB, could carry bad rows into tools/tests | Generated only by `tools/export-catalog.mjs` (publishable key, read-only). Export refuses to write if any field has `<`, `javascript:`, `data:` or a non-https URL |

**Public status policy** (tracker output is a proposal, not a verdict):
- The site may show only the check date and one of `ok` / `changed` / `unreachable` (two failures) / `blocked` (shown as "cannot be checked automatically").
- Closure, price and hours keyword flags are **not shown publicly** until a maintainer has reviewed them. The flags may exist in
  `source-status.json` for maintainers, but no UI text may say a facility is closed, changed prices or changed hours because of a flag.
- Unconfirmed wording and the check date stay visible; a missing price is never shown as 0 or hidden silently.

**Decision rule: no new image/embed host without a CSP edit + reason line.** To add any image, iframe, tile or script host:
edit `tools/security/csp.txt`, all HTML metas, `web/serve.json`, `vercel.json`, add the host and its reason to the table in section 3,
run `check.mjs`. Without all of these the host does not ship. Do not widen `img-src` to make a hotlinked photo appear.

**Known finding (2026-11-21)**: `export-catalog.mjs` reports 385 `http://` URLs in 367 rows (`hp`, `srcUrl`, `research_urls`).
No markup or `javascript:` found. They still open (db-loader allows http), but should be upgraded to https where the site supports it.

## 6. Incident checklist

1. **Contain**: if hostile content is live, set the offending rows to hidden/delete them in Supabase (or revert the deploy in Vercel). Do not wait for root cause.
2. **Key leak?** Rotate in Supabase dashboard (API keys), update env vars, redeploy. For `service_role`: also review the audit/log tabs.
3. **Scope**: `get_advisors` (security), check RLS policies still match section 2, review recent writes by `updated_at`.
4. **Fix at the source**: bad importer/crawler rule, missing `esc()`, missing validation. Add a `check.mjs` rule or test if it was detectable.
5. **Verify**: run `check.mjs`, load all three language pages with `?nointro`, confirm no CSP violations in the console.
6. **Record**: date, cause, impact, fix, follow-up in the PR/issue. Notify affected facilities or users if their data was wrong.

## 7. Release checklist

- [ ] `node tools/security/check.mjs` exits 0; every WARN reviewed (escaped helper = ok, otherwise fix)
- [ ] No new third-party host; if any, added to CSP + this document with a reason
- [ ] CSP meta in every new HTML page; headers unchanged in `serve.json` and `vercel.json`
- [ ] Supabase advisors clean; RLS unchanged (`onsen_*` anon read-only, candidates deny-all)
- [ ] `index`, `ja`, `en`, `sources` load with zero console CSP errors; map tiles, fonts, hero, catalog count, footer dialog, detail drawer work
- [ ] No keys other than the publishable one in `git diff`
- [ ] Data changes came from an approved, logged review (section 5)

## 한국어 요약

- 정적 사이트 + Supabase 읽기 전용 구조입니다. 위험: DB/레코드 문자열 XSS, 악성 URL, 외부 호스트, 데이터 변조, 키 노출, 크롤러 SSRF, 오래된 가격/휴업/잘못된 좌표.
- 이미 있는 방어: `db-loader.js`의 `esc()`/`safeUrl()` 수신 시점 정리, RLS(공개 테이블 SELECT만, `onsen_source_candidates`는 전면 차단), CSP + 보안 헤더, 인라인 스크립트 없음.
- 저장소에는 publishable 키만 둡니다. `service_role`/`sb_secret_`은 절대 금지, 노출 시 즉시 교체.
- 데이터 갱신: 도구는 표시(제안)만 하고 사람이 승인, 변경은 기록. 크롤러는 사설 IP 차단, 리다이렉트 제한, robots 준수.
- 배포 전 `node tools/security/check.mjs` 실행 (실패 시 1 반환), CSP에 새 호스트를 추가하면 이 문서에도 이유를 적습니다.

## 7. /admin/ (모니터 관리 화면)
- `web/admin/monitor.html|js|css`: 공개 사이트와 링크 없음, `<meta robots noindex,nofollow>` + `vercel.json`/`serve.json`의 `/admin/*` 헤더(`X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`). CSP는 공개 페이지와 동일(새 호스트 없음, 인라인 스크립트 없음). `check.mjs`가 admin 페이지의 CSP meta, noindex meta, admin 헤더 규칙, admin JS의 싱크/fetch를 검사한다(`tools/security/csp.txt` 변경 없음).
- 인증: Supabase Auth REST(이메일+비밀번호), 공개 키 + 사용자 JWT. 토큰은 메모리와 sessionStorage에만 두고 로그/URL에 쓰지 않는다. 화면 숨김은 보호가 아니다: 모든 보호는 RLS(`admins` 본인 행, `is_admin()`, 쓰기는 지정 컬럼만, `monitor_jobs` insert는 status=queued, `facility_changes` 검토자는 본인). migration 002가 `approved` 상태와 reviewed_by=본인 조건을 추가했다. migration 003: 관리자가 바꿀 수 있는 status는 `approved/rejected/revert_requested`뿐이고 전이는 트리거 `facility_changes_guard`가 제한한다(대기->승인/반려, 승인->반려, 반영됨->되돌리기 요청). 실제 반영/되돌림/무효 거부는 서비스 전용 함수(`monitor_apply_change|reject_change|revert_change`, anon/authenticated 실행 불가)만 하며, 워커가 값을 다시 검증한 뒤(가격 1,000~500,000엔, HH:MM, https 출처, 근거 필수) `record->'monitor'`에만 쓴다. 원본 필드는 불변, 이력(applied_prev/applied_value)은 행에 남는다.
- DB 값은 모두 textContent로만 그리고(innerHTML 없음) 링크는 http(s)만, 이미지 URL은 미리보기/핫링크 없이 텍스트 링크.
- 공개 공지: 승인된 행만 익명 SELECT, 받는 즉시 이스케이프/URL 검증(`db-loader.js`).

## 8. unlisted (soft hide)
`onsen_facilities.unlisted=true` rows are hidden from the public API by RLS (`using (not unlisted)` for anon/authenticated; `onsen_photos` follows via an EXISTS on the facility). Admins (`is_admin()`) and the service role still read everything. Hiding never deletes rows. To unhide, run `tools/cleanup/unhide.sql` (or set `unlisted=false` for specific ids). Migration: `tools/monitor/migrations/004_unlisted.sql`.
