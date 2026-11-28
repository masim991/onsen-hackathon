# 공식 사이트 모니터 (백그라운드, 사이트 UX 변경 없음)

공개 범위 확대에 사용할 자료와 검토 기준은 [온천·료칸 공개 검증 자료](SOURCE-PLAN.md)를 참고한다.

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
| `--prune [--days 30]` | `monitor_prune`: 로그/실패 작업 `days`일 초과 삭제, 스냅샷은 대상당 최신 3개 유지(나머지는 `days`일 초과 시 삭제), 끝난 ok/skipped 작업 14일 초과 삭제. `facility_notices`/`photo_assets`/`facility_changes`는 검토 대상이라 지우지 않음. `--run`이 UTC 03:00~03:29에 하루 한 번 자동 실행 |
| `--classify` | 사진 분류 단계만 실행(`--run`도 끝에서 자동 실행). 키가 없으면 규칙 분류(`rules-v1`)로 동작, `AI_MOCK=1`이면 가짜 응답(DB의 사진/공지는 바뀌지 않음). rest 싱크 전용 |
| `--sink rest\|sql` | rest = PostgREST(`SUPABASE_SERVICE_ROLE_KEY`), sql = `out/NNN-*.sql` 로 SQL만 생성 |

## 동작 규칙
- 변경 감지: 페이지 해시(notice) / 추출 결과 해시(price_hours, photo). 같으면 `unchanged`(job은 ok, 새 행 없음).
- 공지: 날짜+お知らせ/休業/臨時 등 휴리스틱. 해시로 중복 제거. `summary_ko`는 선택 사항인 `ANTHROPIC_API_KEY`가 있을 때만 자동 생성(claude-haiku-5-5, 출력 200토큰, `ai_usage`에 기록). **키는 필요 없다**: 키가 없으면 요약이 빈 채로 저장되고, 관리자가 관리 화면 '공지' 탭에서 직접 적는다. 항상 `published=false`(관리자 승인 전 비공개).
- 가격: price-finder 엄격 패턴, 1박2식 우선·최저가. 시간: `日帰り入浴 HH:MM～HH:MM`만 high, 영업시간만이거나 값이 여러 개면 medium.
- 가격 추출: price-finder 패턴 + 문장 단위 필터(캠페인/조건 단어 `ご宿泊のすべて|以上であること|対象|キャンペーン|割引|クーポン|ポイント|助成|補助|旅行代金が|適用|条件`, 금액 뒤 `以上|以下|未満|超|まで` 문장은 버림). `に限り|限定` 가격은 medium(=검토 대기).
- 반영 정책 `AUTO_APPLY` = `off | strict(기본) | on` (환경변수; Actions에서는 저장소 Variable `AUTO_APPLY`, Settings > Secrets and variables > Actions > Variables):
  - off: 전부 `pending_review`.
  - strict: 아래를 모두 만족할 때만 `auto_applied`(+ `record.monitor.price|hours`, `monitor_apply_record`). 가격 = 시설 자기 공식 도메인(협회/공유 도메인 `assoc` 제외), 위 엄격 패턴 high + 인용문, https 출처, 이전 공식가(`record.monitor.price` 또는 `prices.json`)의 0.5~2배 이내(이전가가 없으면 서로 다른 두 실행에서 같은 값이 연속 확인되어야 함). 시간 = 日帰り入浴/入浴時間 라벨 high 값이 연속 두 번 확인될 때만. 그 외는 `pending_review`.
  - on: `validateChange`를 통과하고 high+인용문(가격은 0.2~5배 이내)이면 즉시 반영(예전 동작, 비권장).
  - 자동 반영도 old/new/evidence/source가 남고 되돌릴 수 있다(`--revert <id>` 또는 관리 화면 '최근 7일 자동 반영' 목록의 되돌리기 요청).
- 공지 자동 공개 `AUTO_PUBLISH_NOTICES` = `off(기본) | on`: on 이면 한국어 요약(자동 요약은 키가 있을 때만 생김. 키가 없으면 사람이 적은 요약)이 있고, 날짜가 최근 30일 이내이거나 休業/臨時/営業時間/料金 등 키워드가 있으며, 레스토랑/메뉴/이벤트/求人/ブログ 등 잡음 단어가 없을 때만 `published=true`. 나머지는 비공개로 남는다. 요약이 비어 있으면 아무것도 자동 공개되지 않는다(키 없는 운영에서는 사실상 항상 수동 승인).

- **규칙 기반 공지 요약(R6, 키 불필요):** `summarizeNoticeRules`가 원문에서 분류(휴관·휴업/점검·공사/영업시간 변경/요금 개정/영업 재개)와 날짜를 뽑아 고정 한국어 문장(끝에 `(자동 요약)`)을 만든다. 번역은 하지 않으므로 분류가 안 되는 공지는 요약이 비고 비공개로 남는다. `AUTO_PUBLISH_NOTICES=rules`(워크플로 기본값)이면 시설 단위 휴관/영업시간/요금/재개 공지이고 날짜가 아직 지나지 않았을 때만 자동 공개한다. 매 실행의 `summarizeBacklog`가 (1) 요약이 빈 비공개 공지에 요약을 채우고 (2) 기간이 끝난 규칙 공지를 다시 비공개로 돌린다. 사람이 쓴 요약은 SQL 조건(`summary_ko is null`, 자동 요약 꼬리표)으로 덮어쓰지 않는다. 끄려면 저장소 Variable `AUTO_PUBLISH_NOTICES=off`.
- 사진: og:image / 본문 img 최대 4장, 5MB 한도, sha256만 저장(`license_status='unverified'`, `published=false`). 이미지 파일은 저장·핫링크 안 함.
- 로그: warn/error와 요약(run_summary/apply_summary/enqueued/seeded/prune)만 `monitor_logs`에 저장하고, 작업별 info는 stdout/`out/monitor.log`에만 남긴다. JSON 한 줄(ts, level, facility_id, job_id, job_kind, result, error_cause) -> stdout + `out/monitor.log`(2MB 넘으면 `.1`로 회전) + `monitor_logs`. key/token/secret/password/authorization/JWT 패턴은 `[REDACTED]`.
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

## 키 없는 운영 (기본값, `ANTHROPIC_API_KEY` 불필요)
- 이 프로젝트는 Anthropic API 키 없이 운영한다(키는 유료). `ANTHROPIC_API_KEY`는 **선택**이며 등록하지 않아도 모든 기능이 동작한다. Actions에 빈 secret이 있어도 '키 없음'으로 취급.
- **공지 한국어 요약 = 수동.** 키가 없으면 `summary_ko`는 비고, `ai_logs`에도 행을 남기지 않는다. 관리자가 직접 쓴다: `/admin/monitor` 로그인 > '공지' 탭 > 공지 카드의 '한국어 요약' 칸에 원문(원문 링크 확인)을 보고 1~2문장 입력 > '요약 저장' 또는 '승인하고 공개'(요약이 비어 있으면 공개 불가). 'AI 로그' 탭은 자동 요약을 쓸 때만 승인/수정/반려용이다.
- **사진 분류 = 규칙 기반(`rules-v1`).** 키가 없으면 `classifyPhotos`가 이미지를 같은 안전장치(https+공개 호스트만, SSRF 검사, 5MB 상한, 매직 바이트 확인, 실행당 `AI_MAX_IMAGES` 상한)로 받아 아래 신호로 분류하고, 라벨/신뢰도/이유를 `photo_assets.ai_label/ai_confidence/ai_reason`에 저장, `ai_logs`에 `kind=image_classify, model=rules-v1, status=ok, tokens=0` 1행을 남긴다. 이유는 항상 `rule:`로 시작한다. 이미지는 저장하지 않는다.
  - 신호: ① 파일명/URL 경로/alt의 일본어·한국어·영어 키워드(logo/ロゴ, 料理/食事/夕食/会席, 露天風呂/大浴場/温泉, 客室/部屋, 外観/全景, map/地図/アクセス 등. ASCII는 단어 단위라 `bathroom`은 `room`/`bath`로 안 잡힘. `onsen`/`温泉`/`view` 같은 흔한 단어는 0.5점) ② 헤더만 읽은 가로·세로(png/jpeg/webp/gif/svg, 디코딩·의존성 없음), 비율, 매우 작은 크기 ③ 파일 형식(SVG, 투명 PNG) ④ 팔레트 색 수(<=16색 PNG/GIF)와 바이트/픽셀(평평한 그래픽).
  - 분류 순서: 로고(키워드 또는 SVG/작은 투명·소색 그래픽) > 지도·문서(키워드 또는 큰 소색 이미지) > 풍경/온천/객실/음식(키워드 필수, 크기·비율은 신뢰도만 올림) > `other`. 키워드가 없거나 동점·너무 작은 이미지는 `other`(신뢰도 0.3 이하).
  - 신뢰도는 보수적: 사진 라벨은 키워드 1점이면 0.35~0.5, 0.8은 "서로 다른 키워드 4점 이상이 2곳 이상(파일명+경로 또는 alt)에서 + 사진다운 크기/비율"일 때만. 그래서 대부분 `hold_license`로 가고, 로고는 항상 `logo_review`. 공개 규칙(`decidePublish`)은 AI 때와 완전히 같다(0.8 이상 + 라이선스 OK일 때만 `publish_ok`, `published`는 `license_status='verified'`일 때만).
  - `photo_assets`에는 alt 컬럼이 없어 지금은 파일명/경로만 쓴다(`classifyByRules`는 alt도 받을 수 있음). 컬럼 추가가 필요하면 별도 migration 후속 작업.
- 키가 있을 때(선택): 같은 규칙을 먼저 돌려 SVG나 신뢰도 0.7 이상 로고/지도는 유료 호출 없이 규칙 결과(`rules-v1`)로 확정하고, 나머지만 Claude에 보낸다.
- **나중 옵션(미구현)**: 무료 로컬 CLIP(zero-shot) 모델로 이미지 내용을 직접 분류. 장점은 키워드 없는 사진도 분류되는 것, 단점은 모델 수백 MB(Actions에서 `actions/cache`로 캐시 필요)와 느린 실행, 의존성(`onnxruntime`/`transformers.js`) 추가. 필요해질 때만 `classifyByRules` 앞단에 같은 라벨 체계로 끼우면 된다.

## AI 로그 + 사진 분류 (migration 007)
- `ai_logs`: AI 호출 1건 = 1행(kind `notice_summary|change_summary|image_classify`, 시설/공지/사진/변경 참조, model, `input_digest`(sha256 + 200자 발췌, 전체 원문/이미지 아님), `output`(summary_ko, confidence, labels, reason), status `ok|error|skipped|mock`, tokens, error(비밀 제거·300자), 검토 상태 `unreviewed|accepted|rejected|edited`). 읽기/검토는 관리자만(RLS `is_admin()`), 쓰기는 서비스 롤만(anon/authenticated insert 권한 없음). 검토는 `ai_log_review(id, status, summary)` (security invoker, 한 트랜잭션): edited 공지 요약은 `facility_notices.summary_ko`도 갱신, rejected 공지 요약은 그 요약이 그대로면 지우고 비공개로 되돌림. 기존 `ai_usage`(비용 집계)는 그대로 계속 기록.
- (키가 있을 때) 공지 요약 호출마다 `ai_logs` 기록. 키가 없으면 요약 호출도 로그도 없다. `change_summary`는 스키마에만 있고 아직 호출하지 않음(가격/시간 변경은 구조화 값이라 AI 요약이 필요 없음).
- 사진 분류(`classifyPhotos`, 위 '키 없는 운영' 참고; 아래는 키가 있을 때의 Claude 경로 + 공통 안전장치): `published=false`, `ai_checked_at is null`, 라이선스 rejected 아님인 `photo_assets`를 실행당 최대 `AI_MAX_IMAGES`(기본 20)장, 8분 이내, 연속 API 오류 3회면 중단. 이미지는 https + 공개 호스트만(`watchUrl` + `fetchSafe`: 사설/루프백/메타데이터 IP, 계정정보, 특수 포트, 리다이렉트 매 홉 재검증), 5MB 상한, content-type `image/*` + 매직 바이트 확인 후 base64로 Claude(claude-haiku-5-5)에 전달. 이미지/페이지 속 글자는 데이터일 뿐이며 응답은 엄격히 파싱(알 수 없는 라벨은 `other`, 신뢰도 0~1 클램프). 가져오기 실패/비이미지/파싱 불가는 `check_failed`로 표시해 매 실행 재시도하지 않고, API 일시 오류는 미분류로 남겨 다음 실행에서 재시도.
- 라벨: `onsen_bath|exterior|room|food|logo|map_doc|other`. 컬럼: `ai_label, ai_confidence, ai_reason, ai_checked_at, publish_state, license_source(official|unknown|commons|owned), license_note`.
- 공개 규칙(`decidePublish`, AI는 저작권을 판단하지 못함):
  | 라벨 | 조건 | publish_state |
  |---|---|---|
  | onsen_bath / exterior / room / food | 신뢰도 >= 0.8 **그리고** 라이선스 OK | `publish_ok` (+ `license_status='verified'`일 때만 `published=true`) |
  | 위와 같지만 | 신뢰도 < 0.8 또는 라이선스 OK 아님(공식/출처 불명) | `hold_license` (공개 안 함, 공식 페이지 링크만) |
  | logo | 항상 | `logo_review` (자동 공개 없음, 관리자 승인) |
  | map_doc / other | 항상 | `not_published` |
  라이선스 OK = `license_status='verified'` 또는 `license_source='owned'` 또는 `license_source='commons'` + `license_note`(라이선스 기록) 있음. `license_source`/`license_note`는 사람/가져오기 도구만 쓴다(워커가 채우지 않음). 이미 공개된 행은 워커가 건드리지 않는다. 공개 사이트 조건(anon: `published and license_status='verified'`)은 그대로라서 표시되는 것은 바뀌지 않는다.
- 관리자 승인(탭 '로고·사진 승인'): hold_license -> `approved`(라이선스 직접 확인, 한 번에 verified + published), logo_review -> `logo_approved`(공개 아님), 둘 다 반려 가능(`rejected`). 트리거 `photo_assets_guard`가 관리자의 전이(위 3가지만)와 'published는 verified일 때만'을 DB에서 강제한다. 서비스 롤은 제한 없음.
- 테스트: `--selftest`가 공개 규칙 표(라벨 x 라이선스 x 신뢰도), 규칙 분류기 예시 표(20건: 로고/지도/온천/음식/객실/외관/동점/깨진 바이트 등), 키 없는 파이프라인(rules-v1 로그, 유료 호출 0회), SSRF URL 거부, ai_logs 행 모양, 가져오기 안전성, 건수 상한, mock 모드를 오프라인(가짜 클라이언트)으로 검사. 실제 Anthropic API는 호출해 본 적 없다.
- 후속(미구현, 공개 페이지 변경 없음): 승인된 로고(`publish_state='logo_approved'`)를 공개 시설 카드의 공식 사이트 링크 옆에 작게 보여 주려면 anon이 그 행을 읽을 수 있어야 한다(현재 anon 정책은 published+verified만). 읽기 전용 view/정책(logo_approved의 image_url, facility_id만)을 추가한 뒤 `db-loader.js`에서 가져오는 작업이 필요하다.
