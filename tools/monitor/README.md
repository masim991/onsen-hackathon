# 공식 사이트 모니터 (백그라운드, 사이트 UX 변경 없음)

시설 공식 사이트를 주기적으로 읽어 공지 / 가격·영업시간 / 사진 후보를 DB에 쌓는 워커. 의존성 없음(Node 24).
`source-tracker.mjs`(안전 fetch: SSRF 차단, robots, 리다이렉트 3회, 호스트당 1건·1.1초 간격)와 `price-finder.mjs`(엄격한 가격 패턴)를 import 해서 쓴다.

## 파일
- `migrations/001_monitor.sql` : 신규 9개 테이블 + RLS + 서비스용 함수(additive, idempotent). 기존 `onsen_*` 테이블은 건드리지 않는다.
- `migrations/002_admin_ui.sql`, `003_apply.sql` : 관리 화면 지원 / 승인된 변경 반영·되돌림(아래 Phase C).
- `worker.mjs` : 워커. `node tools/monitor/worker.mjs --selftest` (오프라인 검사, 정책 로직 포함)
- `seed-list.json` : 테스트용 고정 30개 시설. `out/` : sql 싱크 산출물(SQL 배치, 로컬 상태, 로그)
- `USER-TODO.md` : 소유자가 해야 할 일

## 명령
| 명령 | 설명 |
|---|---|
| `--seed [--n 30 \| --ids a,b]` | 공식 URL이 있는 시설에 notice(360분)/price_hours(1440분)/photo(10080분) 대상 생성 |
| `--run` | 기한 지난 대상을 큐에 넣고, 안전하게 claim(`FOR UPDATE SKIP LOCKED`)해서 처리. 재시도 3회, 지수 백오프(`--backoff-min 5`) |
| `--apply [--changes rows.json]` | 승인(approved)된 변경을 다시 검증해 `record.monitor`에 반영하고 `applied`로 표시, `revert_requested`는 되돌림. `--run`/`--recheck` 끝에서도 자동 실행. `--changes`는 sql 싱크용(`facility_changes` 행 JSON) |
| `--revert <change_id>` | 그 변경이 쓴 `record.monitor.<field>`를 이전 값으로 복원(없었으면 키 삭제), status `reverted` |
| `--recheck <id> [--kind k]` | 그 시설을 즉시 기한 도래로 만들고 `--run` |
| `--prune [--days 90]` | `monitor_prune` (오래된 로그/스냅샷/작업 삭제) |
| `--sink rest\|sql` | rest = PostgREST(`SUPABASE_SERVICE_ROLE_KEY`), sql = `out/NNN-*.sql` 로 SQL만 생성 |

## 동작 규칙
- 변경 감지: 페이지 해시(notice) / 추출 결과 해시(price_hours, photo). 같으면 `unchanged`(job은 ok, 새 행 없음).
- 공지: 날짜+お知らせ/休業/臨時 등 휴리스틱. 해시로 중복 제거. `summary_ko`는 `ANTHROPIC_API_KEY`가 있을 때만(claude-haiku-5-5, 출력 200토큰, `ai_usage`에 기록). 항상 `published=false`(관리자 승인 전 비공개).
- 가격: price-finder 엄격 패턴, 1박2식 우선·최저가. 시간: `日帰り入浴 HH:MM～HH:MM`만 high, 영업시간만이거나 값이 여러 개면 medium.
- 반영 정책: high + 인용문(quote) + 기존값의 0.2~5배 이내 -> `facility_changes(auto_applied)` + `record.monitor.price|hours`(새 키만, `monitor_apply_record` 함수). 그 외 -> `pending_review`만.
- 사진: og:image / 본문 img 최대 4장, 5MB 한도, sha256만 저장(`license_status='unverified'`, `published=false`). 이미지 파일은 저장·핫링크 안 함.
- 로그: JSON 한 줄(ts, level, facility_id, job_id, job_kind, result, error_cause) -> stdout + `out/monitor.log`(2MB 넘으면 `.1`로 회전) + `monitor_logs`. key/token/secret/password/authorization/JWT 패턴은 `[REDACTED]`.
- blocked(robots/403/SSRF)는 재시도 없이 `skipped`, 일시 오류(timeout/dns/5xx)는 재시도 후 `failed`.

## 알려진 한계
- sql 싱크는 테스트용: 로컬 상태(`out/state.json`)를 DB 대신 읽고, 시각은 적용 시점 `now()`, DB 로그는 warn/error만 저장(전체는 `out/monitor.log`). rest 싱크는 실제 DB를 읽으므로 로직은 같지만 서비스 키가 없어 이 환경에서는 실행하지 못했다.
- 날짜 없는 공지(休業 키워드 문장)는 오래된 글일 수 있다. 그래서 전부 비공개로 시작한다.

## Phase B (관리 화면, 공개 공지)
- `migrations/002_admin_ui.sql`(적용됨): `facility_changes.status`에 `approved` 추가, 검토 정책에 reviewed_by=본인 조건, `monitor_apply_record`가 `updated_at`을 올림(공개 페이지 60초 점검이 감지).
- 관리 화면 `web/admin/monitor.html`: 현황 / 대기열 / 공지 / 변경 이력 / 이미지 / 오류 로그 / AI 사용량. 다시 점검 = `monitor_jobs` insert(status=queued), 실패 작업 재시도 = 같은 대상으로 새 job. 승인은 반영 예약이며 값 반영은 워커 몫(Phase C).

## Phase C (승인된 변경 반영, migration 003)
- 흐름: `pending_review` -> `approved`(관리자) -> `applied`(워커) -> `revert_requested`(관리자) -> `reverted`(워커). `rejected`는 관리자 반려 또는 워커의 무효값 거부(`apply_note`에 사유). 자동 반영(`auto_applied`)은 기존 그대로.
- 정책: 원본 `onsen_*` 필드는 그대로. 쓰는 곳은 `record->'monitor'->price|hours` 뿐이며 값은 `{값..., source_url, checked, quote, change_id, applied_at}`. 반영 시 `updated_at`을 올려 공개 페이지의 60초 점검이 가져간다.
- DB 함수(서비스 전용, anon/authenticated 실행 불가): `monitor_apply_change(id, val)`(행 잠금 + status 확인 = 동시 실행에도 한 번만, 두 번째는 `already_applied`), `monitor_reject_change`, `monitor_revert_change`(그 변경이 현재 키의 주인일 때만, 아니면 `superseded` = 나중 변경부터 되돌려야 함). 이전 값은 `applied_prev`, 실제 쓴 값은 `applied_value`에 남아 이력이 보존된다. `dedupe_key` 의미는 그대로(같은 값은 다시 제안되지 않는다).
- 관리자 권한: RLS는 `pending_review/approved/applied` 행만 수정, 새 status는 `approved/rejected/revert_requested`만, `reviewed_by`는 본인. 트리거 `facility_changes_guard`가 전이를 한 번 더 제한(대기->승인/반려, 승인->반려, 반영됨->되돌리기 요청). 새 컬럼은 관리자도 읽기 전용.
- 워커 재검증(`validateChange`): 가격 정수 1,000~500,000엔(maxYen>=minYen, kind/unit 허용 목록, 1실 단위와 1인 kind 불일치 거부), 시간 `HH:MM` + open<close, source_url은 https, 근거 인용 필수(<=300자), 확인일은 미래 불가. 무효면 반영하지 않고 `rejected` + warn 로그(`result=invalid`, `error_cause`=원인). 로그: `result=applied|skipped|invalid|reverted`, 요약 `apply_summary`. 반영 중 오류면 상태를 그대로 두어 다음 실행에서 재시도.
- sql 싱크: DB를 읽을 수 없으므로 `--apply --sink sql --changes rows.json`(승인 행 JSON)으로 `select public.monitor_apply_change(...)` SQL만 `out/NNN-apply.sql`에 만든다. 서비스 키가 있으면 `--apply --sink rest`.

## unlisted(숨김) 시설
`onsen_facilities.unlisted=true` 행은 공개(anon) 읽기에서 빠진다. 워커는 service role이라 전부 보지만, 숨긴 시설에 모니터 대상을 만들 필요는 없다(현재 대상 시설은 모두 공개 상태). 자세한 내용은 `web/README.md`.
