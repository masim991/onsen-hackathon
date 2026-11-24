# R5 백엔드/데이터/SRE 감사

## 1) 점수: 5.5 / 10
보안과 데이터 모델은 7점대로 단단하다. 운영 신뢰성은 3점대다. 모니터링 파이프라인은 지금 "만들어졌지만 돌지 않는" 상태다. 설계는 과하게 정교하고 실제 처리량은 부족하다.

## 2) 문제 Top 8

1. **스케줄러가 사실상 죽어 있다 (치명).**
   - `monitor.yml:4`는 30분마다 cron인데, `monitor_jobs`의 실행 시각은 23일 08시(267건), 23일 22시(102건), 24일 06시(98건) 세 번뿐이다. 약 22시간에 3회다.
   - `price_hours` 100개 중 98개가 기한 초과다. 가장 오래된 due는 08:31 UTC다. 기준 시각은 쿼리 시점이며, 이 시각 이후 실행이 없었다.
   - 하루 약 300건이 한계다. 목표인 "공지 6시간, 가격 24시간" SLA는 이미 깨졌다.
   - 로컬 Task Scheduler 러너는 직전 커밋(45c442c)에서 삭제됐다. 즉 GitHub 하나에 단일 의존한다.
   - GitHub는 무료 공개 저장소의 schedule을 지연시키거나 건너뛴다. 60일간 저장소 활동이 없으면 schedule이 자동 비활성화된다. 이 위험도 문서에 없다.
2. **확대 계획의 숫자가 틀렸다.**
   - ROLLOUT.md:8은 "공개+공식URL 486곳, 약 1,450 target"이라고 쓴다. 실제 공개 시설 중 official_url이 있는 곳은 **319곳**이다(공개 486곳 중 167곳은 URL이 없다).
   - 319곳이면 target이 약 957개다. 일일 작업량은 notice 4회/일, price 1회/일로 약 1,500건이다.
   - 현재 속도(하루 약 300건)로는 단계 3이 불가능하다. 단계 2(750 target)도 불가능하다. `--limit 120`이 걸려 있어도 실제 실행이 하루 3번이면 의미가 없다.
3. **공지 파이프라인의 최종 산출물이 0이다.**
   - `facility_notices` 98건이 전부 `published=false`다. 키가 없어 `summary_ko`는 비어 있고 승인은 수동이다.
   - 사용자에게 보이는 공지가 0건이다. 한 달 뒤에는 백로그만 쌓인다.
   - 사람이 병목인데 notice는 6시간마다 재수집한다. 수집 빈도를 줄이는 것이 맞다.
4. **공개 데이터 품질이 낮다.**
   - 공개 486곳 중 `dayP`(당일치기 가격)가 없는 곳이 384곳(79%)이다.
   - 공식 URL이 없는 곳이 167곳(34%), 사진이 없는 곳이 163곳(34%)이다.
   - `record.monitor`(모니터가 반영한 값)가 있는 시설은 2곳이다. 모니터링이 사용자 가치로 바뀐 사례가 2건이다.
   - `photo_assets` 281행 중 공개된 것은 2행이다. 219행은 `unchecked` 상태로, 분류기가 20장/실행으로 막혀 따라가지 못한다.
   - 중복 official_url이 4건 있다.
5. **photo 파이프라인이 낭비다.**
   - 281행이 쌓이는 동안 라이선스 검증된 공개분은 2행이다. 그 사진은 CSP `img-src`(`vercel.json:9`)에 허용되지 않은 호스트일 가능성이 높다. CSP는 wikimedia와 gsi만 허용한다.
   - 즉 공식 사이트 이미지는 구조적으로 표시할 수 없다. 이미 내려받는 5MB 이미지 sha256 수집과 `check_failed`, `image_failed` 경고 26건은 대역폭과 Actions 시간 낭비다.
6. **공개 저장소 + 하드코딩 키 + 문서에 프로젝트 ID.**
   - `db-loader.js:3`의 `sb_publishable_...`은 설계상 공개 키라 괜찮다. 의존하는 것은 RLS뿐이다.
   - 확인 결과 RLS는 전 테이블 ON이고 anon 쓰기 권한은 0이다. `onsen_facilities`는 `NOT unlisted`로 서버 측에서 강제한다(좋다). 그러나 service role이 GitHub secret이므로 PR/포크 워크플로 변경이 유출 경로다. 아래 8)에서 다루는 환경 보호가 없다.
   - 어드바이저 경고는 `onsen_source_candidates`(3,512행, RLS 켜짐/정책 0, 의도된 잠금이나 문서 없음)와 leaked password protection 꺼짐 두 건이다.
   - 이 조합은 `workflow_dispatch`가 쓰기 권한자에게만 열려 있다는 가정에 의존한다 [assumed].
7. **관측성/알림이 없다.**
   - 스케줄이 멈춰도 알림이 없다. 위 1)의 18시간 정지를 사람이 발견해야 했다.
   - 실패해도 워크플로는 성공으로 끝난다. heartbeat도, "마지막 성공 실행 > N시간이면 경보"도 없다.
   - `monitor_logs`에는 201건의 `info/new`가 쌓인다. 유용한 신호 대비 소음이 크다.
8. **백업과 롤백이 없다.**
   - 스키마는 repo의 수동 SQL 7개(001~007)이고, `supabase/migrations`로 관리되지 않는다. 적용 이력은 `list_migrations`로 따로 확인해야 한다. 적용 순서와 드리프트 검증이 없다.
   - `onsen_facilities.record`(jsonb 통짜)는 `monitor_apply_record`가 부분 갱신한다. 시설 데이터 스냅샷 백업 절차가 없다(되돌림은 `applied_prev`에 의존).
   - `monitor_targets`에 `facility_id`, `next_check_at` 인덱스는 있다. 현재 규모(300행)에서 인덱스 문제는 없다. 2,729행 `onsen_facilities`에는 인덱스 2개뿐인데, 클라이언트가 전체를 1,000행씩 페이지네이션으로 받으므로 정렬은 PK로 충분하다. 공개 배포 시 CDN 캐시가 없다는 점이 더 문제다.

## 3) 잘한 점 (3개)
- **RLS/권한 설계가 정석적이다.** 전 테이블 RLS ON, anon 쓰기 0, 서비스 전용 함수의 `revoke ... from public, anon, authenticated`, 상태 전이 트리거(`facility_changes_guard`, `photo_assets_guard`)를 갖췄다. 이는 쿼리로 확인했다.
- **SSRF/안전 fetch와 변경 안전장치.** `SKIP LOCKED` claim, 20분 크래시 복구, dedupe_key, `applied_prev`로 되돌림, 가격 0.5~2배 가드, 로그 비밀 마스킹을 갖췄다.
- **클라이언트 방어.** DB 값을 받는 즉시 이스케이프하고 URL 스킴을 검증하며, 강한 CSP(`script-src 'self'`)를 쓴다. 로드 실패 시 로컬 데이터로 폴백한다.

## 4) FIX PLAN

| # | 변경 | 파일/마이그레이션 | 노력 | 위험 |
|---|---|---|---|---|
| 1 | **외부 cron으로 `workflow_dispatch` 호출**: cron-job.org(무료) 또는 Cloudflare Workers Cron이 30분마다 `POST /actions/workflows/monitor.yml/dispatches`를 호출한다. 토큰은 fine-grained PAT(Actions 쓰기, 이 저장소 한정)로 외부 서비스에만 둔다. 대안은 Supabase `pg_cron + pg_net`이 같은 REST를 부르는 방식이다. GitHub 스로틀을 우회한다. schedule은 백업으로 남긴다. | 외부 설정, `monitor.yml` 변경 없음 | S | PAT 유출(만료 90일, 권한 최소화로 대응) |
| 2 | **실행당 처리량 상향**: 현재 `--limit 120`은 25분 타임아웃과 호스트별 1.1초 간격 제약이다. `conc 6`을 유지하되 `--limit 400`, `timeout-minutes 40`으로 올리고 deadline(예: 30분)에서 자체 종료한다. 3회/일만 돌아도 하루 약 1,000건이 된다. | `monitor.yml`, `worker.mjs` 약간 | S | 25분 초과 시 중단 → 20분 재클레임으로 복구됨 |
| 3 | **ROLLOUT 숫자 정정과 단계 재설계**: 모수는 319곳이다. 단계 2는 250곳, 단계 3은 319곳으로 하고, 처리량 검증(#1,#2 이후 연속 48시간 overdue < 5%)을 게이트로 둔다. notice 주기는 360분에서 1440분으로 늘리고, 승인 가능한 시설만 우선한다. | `ROLLOUT.md`, 대상 update SQL | S | 낮음 |
| 4 | **notice 병목 제거**: 키가 없으므로 요약 없이 원문 발췌 + 날짜 + "공식 공지 보기" 링크만 공개하는 `summary` 없는 승인 경로를 추가한다(관리자 일괄 승인). 또는 notice 수집 자체를 중단하고 가격/시간에 집중한다. 결정이 필요하다. | `migrations/008`, 관리 화면 | M | 오탐 공지 노출. 휴리스틱 정밀도 검증 필요 |
| 5 | **데이터 품질 우선순위**: 공개 시설을 `dayP` 보유, URL 보유, 사진 보유 점수로 정렬해 모니터링과 보강을 점수 상위 시설에 먼저 한다. URL이 없는 167곳은 `onsen_source_candidates`(3,512행)에서 후보 승격 파이프라인을 만든다. 중복 URL 4건은 정리한다. | 신규 SQL 뷰, 스크립트 | M | 후보 URL 오매칭 |
| 6 | **photo 단계 축소**: CSP로 표시할 수 없는 호스트의 사진은 수집을 중단한다. 하나를 선택한다. (a) `photo` target을 `enabled=false`로 일괄 비활성화(롤백 가능). (b) 이미지 프록시/호스팅을 정식 설계한다. 지금은 (a)가 맞다. | SQL `update monitor_targets set enabled=false where kind='photo'` | S | 낮음 |
| 7 | **heartbeat와 알림**: 워크플로 마지막 단계에서 `monitor_logs`에 `heartbeat`를 쓴다. 외부(UptimeRobot 무료, healthchecks.io)가 `max(finished_at)`가 90분보다 오래되면 메일/Discord로 알린다. 실패 시 `if: failure()`로 이슈를 생성한다. info 로그(`new`)는 저장하지 않는다. | `monitor.yml`, `worker.mjs` | S | 낮음 |
| 8 | **시크릿/저장소 하드닝**: GitHub Environment `production` + Required reviewers를 `SUPABASE_SERVICE_ROLE_KEY`에 걸고, 워크플로 `permissions: contents: read`를 명시한다. `uses:`는 SHA로 고정하고, fork PR 워크플로를 승인 필수로 한다. Supabase 대시보드에서 leaked password protection을 켠다. `onsen_source_candidates`에 "정책 없음 = 의도적 잠금"이라고 주석한다. | `monitor.yml`, 저장소 설정 | S | 낮음 |
| 9 | **마이그레이션/백업**: SQL을 `supabase/migrations/`로 옮겨 CLI로 적용하고, 주 1회 `pg_dump`(또는 Supabase 일일 백업 확인) 후 `onsen_facilities` JSON 스냅샷을 비공개 스토리지에 둔다. | 신규 디렉터리, 설정 | M | 이력 정합성 |

## 5) 바꾸지 말 것
- RLS 정책, 서비스 전용 함수 권한, 상태 전이 트리거. 감사 결과가 깨끗하다.
- `record.monitor`에만 쓰고 원본 필드는 건드리지 않는 정책. 되돌림 구조가 이것에 의존한다.
- 클라이언트 이스케이프, URL 검증, CSP. 키가 공개되는 구조를 지탱하는 유일한 방어선이다.
- SSRF/robots 정책과 호스트당 1.1초 간격. 속도를 위해 풀지 않는다. 처리량은 `limit`과 호출 빈도로 푼다.
- 로컬 Task Scheduler 부활: 소유자 PC 의존이라 취약하다. 외부 cron(#1)이 낫다.
- 지금 Anthropic 유료 요약을 붙이는 일. 문제는 돈이 아니라 스케줄과 승인 병목이다.
