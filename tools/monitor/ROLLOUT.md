# 모니터 확대 단계 계획

모수 정정(2026-11-24 DB 실측): 공개(unlisted=false) 시설은 486곳이지만 **공식 URL이 있는 시설은 319곳**이고, 이전 문서의 "486곳 / 약 1,450 대상"은 틀렸다. 대상 수는 319 x 3종 = 약 957건이다. 사진(photo) 대상은 R5에서 비활성화했으므로(migrations/008_throughput.sql) 실제 점검 대상은 시설당 notice + price_hours 2종이다(319곳이면 약 638건, 하루 약 638건 점검 필요).

| 단계 | 시설 수 | 대상(target) 수 | 상태 |
|---|---|---|---|
| 0 | 30 | 90 | 완료 (첫 Actions 실행 60건 전부 ok) |
| 1 | 100 | 300 | 적용됨(현재 DB 100곳, photo 100건은 비활성) |
| 2 | 250 | 750 | 아래 게이트 통과 후 |
| 3 | 319 (공개 + 공식 URL 보유 전부, 상한) | 약 957 (photo 제외 약 638) | 2단계 검증 후 |

## 처리량 (정정)
- GitHub `schedule`은 실제로 하루 약 2회만 돈다(30분 cron을 지켜 주지 않음). 실행당 `--limit 250`, 하루 2회면 약 500건/일 상한이고 실측은 약 300건/일 수준이다. 필요량(319곳, photo 제외 약 638건/일, notice는 1440분 주기)에는 모자란다.
- 외부 cron이 60분마다 `workflow_dispatch`를 호출하면(오너 작업, USER-TODO 8번) 24회/일 x 250건 = 약 6,000건/일 용량이라 충분하다. 호스트 예의(호스트당 1.1초 간격, robots.txt)는 그대로이고, 대량 단발이 아니라 소량 자주로 푼다.
- 워크플로: `--limit 250 --deadline-min 30`, `timeout-minutes: 40`. 새 라운드는 30분 뒤에는 시작하지 않는다.
- 주기: notice 1440분(기존 360), price_hours 1440분, photo 10080분(대상 비활성). 대상별 `interval_minutes`도 같은 값으로 갱신했다.

## 2단계(250곳) 확대 게이트 = 처리량 (실행 횟수가 아님)
확대는 "며칠 돌렸다"가 아니라 처리량이 따라올 때만 한다. 모두 만족해야 한다.
1. 연속 48시간 동안 /admin/monitor의 '점검 대기(기한 지남)' 비율이 전체 활성 대상의 5% 미만(SQL 2의 overdue / 활성 대상).
2. 하트비트 배너가 48시간 동안 빨간색이 아니다(마지막 정상 실행이 3시간 이내를 유지).
3. 실행 1회 소요가 15분 이하(하트비트 meta.duration_s).
4. 외부 cron이 등록되지 않았다면(schedule만 ~2회/일) 2단계로 가지 않는다. 100곳 x 2종 = 200건/일 이상은 이미 한계에 가깝다.
5. 아래 실패율/blocked/오탐 조건도 만족.

## 다음 단계로 넘어가기 전 확인 (/admin/monitor, 최소 이틀치 정기 실행 후)
- 실패율: 오류 로그 탭 + SQL 1. failed 비율 5% 미만, 원인이 특정 도메인 한두 곳이면 그 시설만 비활성화.
- blocked(robots/403/SSRF) 비율: 20% 넘으면 그 시설은 비활성화. 정상 동작(재시도 없이 skipped)이다.
- 공지 오탐률: 새 공지를 20건 이상 직접 열어 보고 오래된 글/무관한 글 비율이 30% 넘으면 중단하고 휴리스틱 수정.
- 변경(가격/시간) 오탐률: pending_review를 검토해 반려 비율 확인. `AUTO_APPLY`(저장소 Variable, off|strict|on, 기본 strict)로 자동 반영 범위를 조절한다. 오탐이 보이면 `off`로 내리고, 관리 화면 변경 이력 맨 위 '최근 7일 자동 반영'에서 틀린 값을 되돌리기 요청(또는 `--revert <id>`). 공지 자동 공개는 `AUTO_PUBLISH_NOTICES=on`(요약용 `ANTHROPIC_API_KEY` 필요)일 때만, 오탐이 확인된 뒤에 켠다.
- 처리량: 실행 1회에 due가 limit 이상 쌓이면(SQL 2의 due 수) cron 단축(limit은 250 유지, 더 올리지 않는다).
- 실행 소요 시간이 15분을 넘으면 단계 확대 금지.

## SQL 1: 최근 24시간 결과
```sql
select kind, status, count(*) from monitor_jobs
where worker <> 'sql-test' and finished_at > now() - interval '24 hours' group by 1,2 order by 1,2;
select result, error_cause, count(*) from monitor_logs
where ts > now() - interval '24 hours' and level <> 'info' group by 1,2 order by 3 desc;
select status, count(*) from facility_changes group by 1;
```
## SQL 2: 밀린 양
```sql
select count(*) due from monitor_targets where enabled and next_check_at <= now();
```

## 다음 단계로 진행
1. 선정 기준(공식 URL 보유 319곳 안에서만 고른다. 후보 쿼리는 data-quality.sql Q2, 가격 없는 지역이 많은 곳 우선): 공개(`unlisted=false`) + 공식 URL이 `watchUrl` 통과 + 아직 대상 아님 + 협회/관광/지자체 관광 도메인과 여러 시설이 공유하는 도메인 제외 + 현 단계에서 지역(도도부현) 라운드로빈, 가격 있는 시설(`web/data/prices.json`, assoc 아님) 우선 포함.
2. 후보 id 목록을 정한 뒤 SQL 생성: `node tools/monitor/worker.mjs --seed --sink sql --ids id1,id2,...` (로컬 `out/state.json`이 DB와 같은 상태여야 함; `out/NNN-seed.sql` 생성).
3. 생성된 SQL을 Supabase에서 한 트랜잭션으로 적용 (`on conflict (facility_id, kind, url) do nothing`, `next_check_at = now()`라 다음 실행에서 처리됨).
4. 검증:
```sql
select count(*) t, count(distinct t.facility_id) f, count(*) filter (where t.enabled) en,
  count(*) filter (where f.unlisted) hidden, count(*) filter (where f.id is null) orphan
from monitor_targets t left join onsen_facilities f on f.id = t.facility_id;
```
기대: t = 시설 수 x 3 (photo 대상은 만들어지지만 enabled=false로 되돌린다: `update monitor_targets set enabled=false where kind='photo'`), hidden = 0, orphan = 0.
5. 필요하면 `monitor.yml`의 `--limit` 조정 후 커밋.

## 롤백 (삭제하지 않고 비활성화)
```sql
-- 특정 시설
update monitor_targets set enabled = false where facility_id in ('id1','id2');
-- 특정 단계(예: 1단계에서 추가한 70곳) : 추가 시각 기준이 없으므로 id 범위로
update monitor_targets set enabled = false where id > 90;
-- 특정 종류만
update monitor_targets set enabled = false where kind = 'photo';
-- 전부 중지: 워크플로 비활성화(GitHub Actions) 또는
update monitor_targets set enabled = false;
```
재개는 `enabled = true`로 되돌리고 `next_check_at = now()`로 맞춘다. 반영된 값이 잘못됐으면 `node tools/monitor/worker.mjs --revert <change_id>` (또는 관리 화면에서 되돌리기 요청). 기존 notice/change 기록은 지우지 않는다.

## R5 A1 되돌리기 (migrations/008_throughput.sql 에도 있음)
```sql
update public.monitor_targets set interval_minutes = 360 where kind = 'notice' and interval_minutes = 1440;
update public.monitor_targets set enabled = true, next_check_at = now() where kind = 'photo' and not enabled;
```

## R6 전체 확대 + 완성도 규칙 (2026-11-25)
- 공개(unlisted=false) 시설 486곳 중 공식 URL이 있는 315곳 전부를 감시한다(notice + price_hours). 사진 대상은 **공개 사진(onsen_photos)이 없는 시설만** 켠다(주 1회). 사진이 이미 있는 시설은 끄고, 새로 생긴 시설은 같은 규칙으로 시드한다.
- 시설별 필수는 **숙박비**, 선택은 당일 입욕 요금, 사진, 최신 공지다. 지역별 현황은 `select * from monitor_coverage_by_pref order by facilities desc;` (migrations/009_coverage.sql, 되돌리기: `drop view public.monitor_coverage_by_pref;`).
- 값이 자동으로 들어오는 경로(Actions + 외부 cron, 매시 19분): 가격/시간은 `AUTO_APPLY=strict`(공식 도메인·근거 문장·0.5~2배 범위, 다음 점검에서 같은 값이면 확정), 공지는 `AUTO_PUBLISH_NOTICES=on`(규칙 요약 + 날짜가 안 끝난 공지만), 사진은 후보로만 저장하고 라이선스 확인(verified/owned/commons)된 것만 공개한다.
- 접근 원칙: robots.txt 준수, 호스트당 1.1초 간격, 차단/403/429는 재시도 없이 건너뜀. 봇 차단 우회는 하지 않는다. 막힌 시설은 `blocked:*`로 남고 제휴 API·시설 문의·공개 데이터로 채운다.
- 한 번 실행 상한 `--limit 250`: 새 대상 때문에 due가 250을 넘으면 몇 시간에 걸쳐 소화된다(overdue 5% 기준은 확대 직후 48시간은 예외).
- **가격 추이(R6, migrations/010_price_history.sql):** `onsen_facilities.record.monitor.price`가 바뀔 때마다 트리거가 `price_history`에 한 줄을 남긴다(작업기·관리자 승인·일회성 검토·되돌리기 모두 같은 경로라 Actions/cron 수정 불필요). `select * from price_trend;`로 시설별 최신/직전 금액과 변동률(%)을 본다. 같은 값은 중복으로 쌓이지 않는다(시설, 종류, 금액, 확인일 유일).
