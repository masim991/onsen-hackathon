# 모니터 확대 단계 계획

| 단계 | 시설 수 | 대상(target) 수 | 상태 |
|---|---|---|---|
| 0 | 30 | 90 | 완료 (첫 Actions 실행 60건 전부 ok) |
| 1 | 100 | 300 | 시드 적용됨, 다음 정기 실행부터 처리 |
| 2 | 250 | 750 | 1단계 검증 후 |
| 3 | 486 (공개 시설 중 공식 URL 있는 전부) | 약 1,450 | 2단계 검증 후 |

실행당 claim 한도는 `--limit 120` (워크플로 `monitor.yml`). 단계가 커지면 한 번에 다 못 돌 수 있다(30분마다 120건, 25분 제한). notice 360분 / price_hours 1440분 / photo 10080분 주기라 단계 3은 하루 약 1,000건 이상이므로 `--limit`과 cron 간격을 같이 본다.

## 다음 단계로 넘어가기 전 확인 (/admin/monitor, 최소 이틀치 정기 실행 후)
- 실패율: 오류 로그 탭 + SQL 1. failed 비율 5% 미만, 원인이 특정 도메인 한두 곳이면 그 시설만 비활성화.
- blocked(robots/403/SSRF) 비율: 20% 넘으면 그 시설은 비활성화. 정상 동작(재시도 없이 skipped)이다.
- 공지 오탐률: 새 공지를 20건 이상 직접 열어 보고 오래된 글/무관한 글 비율이 30% 넘으면 중단하고 휴리스틱 수정.
- 변경(가격/시간) 오탐률: pending_review를 검토해 반려 비율 확인. `AUTO_APPLY`(저장소 Variable, off|strict|on, 기본 strict)로 자동 반영 범위를 조절한다. 오탐이 보이면 `off`로 내리고, 관리 화면 변경 이력 맨 위 '최근 7일 자동 반영'에서 틀린 값을 되돌리기 요청(또는 `--revert <id>`). 공지 자동 공개는 `AUTO_PUBLISH_NOTICES=on`(요약용 `ANTHROPIC_API_KEY` 필요)일 때만, 오탐이 확인된 뒤에 켠다.
- 처리량: 실행 1회에 due가 limit 이상 쌓이면(SQL 2의 due 수) limit 상향 또는 cron 단축.
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
1. 선정 기준: 공개(`unlisted=false`) + 공식 URL이 `watchUrl` 통과 + 아직 대상 아님 + 협회/관광/지자체 관광 도메인과 여러 시설이 공유하는 도메인 제외 + 현 단계에서 지역(도도부현) 라운드로빈, 가격 있는 시설(`web/data/prices.json`, assoc 아님) 우선 포함.
2. 후보 id 목록을 정한 뒤 SQL 생성: `node tools/monitor/worker.mjs --seed --sink sql --ids id1,id2,...` (로컬 `out/state.json`이 DB와 같은 상태여야 함; `out/NNN-seed.sql` 생성).
3. 생성된 SQL을 Supabase에서 한 트랜잭션으로 적용 (`on conflict (facility_id, kind, url) do nothing`, `next_check_at = now()`라 다음 실행에서 처리됨).
4. 검증:
```sql
select count(*) t, count(distinct t.facility_id) f, count(*) filter (where t.enabled) en,
  count(*) filter (where f.unlisted) hidden, count(*) filter (where f.id is null) orphan
from monitor_targets t left join onsen_facilities f on f.id = t.facility_id;
```
기대: t = 시설 수 x 3, hidden = 0, orphan = 0.
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
