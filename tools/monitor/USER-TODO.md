# 소유자가 해야 할 일 (순서대로)

요약
- 코드/DB/보안 점검은 끝났고, 남은 일은 키·계정·실행 위치·배포 확인뿐입니다(아래 1~5번, 이 순서).
- 1~3번을 끝내야 모니터가 실제로 돌고 4~5번 확인이 가능합니다. 키는 채팅/커밋에 절대 붙여넣지 마세요.
- 6번(Commons 사진 52건)은 Wikimedia가 다운로드 차단(429)을 풀면 `tools/photos`에서 다시 실행하면 됩니다.
- 7번은 공개 전 결정 사항(테스트 데이터 정리, 숨김 해제 시 id 목록 재생성)입니다.
- 이 PC 점검 결과: 워커 selftest 통과, `tools/monitor/out`과 로그에 키/토큰 없음, `.github/workflows/monitor.yml` 문법 이상 없음.

## 1. 서비스 키 준비
- Supabase 대시보드 > 프로젝트 `frncsllpkxrsgxyqsfwd` > Project Settings > API Keys > secret 키(service role) 복사.
- (선택) Anthropic Console > API Keys 에서 키 생성. 없으면 공지 한국어 요약 없이 원문만 저장되고, 요약이 빈 공지는 직접 적어야 공개할 수 있습니다. 같은 키로 사진 AI 분류도 켜집니다(없으면 분류는 건너뛰고 AI 로그에 skipped 1건).
- 이 PC에서만 시험할 때: `$env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:ANTHROPIC_API_KEY="..."` (PowerShell 창을 닫으면 사라짐)

## 2. 관리자 계정 만들기
- Supabase 대시보드 > Authentication > Users > Add user > Create new user (이메일/비밀번호, Auto Confirm 체크).
- SQL Editor 에서 실행(이메일만 바꾸기):
  ```sql
  insert into public.admins (user_id)
  select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
  on conflict do nothing;
  ```

## 3. 실행 위치 선택 (둘 중 하나)
- A. GitHub Actions(권장, PC가 꺼져 있어도 동작): 저장소 Settings > Secrets and variables > Actions > New repository secret 로 `SUPABASE_SERVICE_ROLE_KEY`(필수), `ANTHROPIC_API_KEY`(선택, 없으면 빈 값으로 두어도 됨) 등록. `.github/workflows/monitor.yml` 이 준비돼 있으니 저장소에 push 하면 30분마다 `--run` 이 돕니다. Actions 탭 > `monitor` > Run workflow 로 수동 실행도 가능. 저장소 루트가 이 프로젝트 폴더여야 경로(`tools/monitor/worker.mjs`)가 맞습니다.
- B. Windows 작업 스케줄러(이 PC가 켜져 있을 때만 동작). PowerShell(관리자 아님)에서 한 번 실행:
  ```powershell
  [Environment]::SetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY","키","User")
  schtasks /Create /SC MINUTE /MO 30 /TN "OnsenMonitor" /TR "node \"<프로젝트 폴더 경로>\tools\monitor\worker.mjs\" --run --sink rest"
  ```
  환경변수는 설정 후 새로 연 창/로그인부터 적용됩니다. `node`가 PATH에 있어야 합니다(`node -v` 확인). 삭제: `schtasks /Delete /TN "OnsenMonitor" /F`

## 3-1. 자동 반영 설정 (선택, 코드 변경 없음)
- GitHub 저장소 Settings > Secrets and variables > Actions > Variables 탭 > New repository variable.
- `AUTO_APPLY` = `off`(전부 검토 대기) / `strict`(기본: 공식 도메인·엄격 패턴·이전값 0.5~2배 또는 연속 2회 확인만 자동 반영) / `on`(비권장). 값이 없으면 strict.
- `AUTO_PUBLISH_NOTICES` = `on` 이면 한국어 요약이 있고 최근/중요하며 잡음이 아닌 공지만 자동 공개(`ANTHROPIC_API_KEY` 필수). 기본 off.
- 자동 반영된 값은 관리 화면 > 변경 이력 맨 위 '최근 7일 자동 반영'에서 훑어보고 틀린 것만 되돌리기 요청.

## 3-2. AI 로그 / 사진 분류 (선택)
- 저장소 Settings > Secrets and variables > Actions > Secrets 에 `ANTHROPIC_API_KEY` 등록(채팅/커밋에 붙여넣지 마세요). 등록하면 다음 실행부터 공지 요약이 `ai_logs`에 쌓이고, 미분류 사진을 실행당 최대 20장 분류합니다. 장수는 Variables 의 `AI_MAX_IMAGES`(선택, 기본 20)로 조절.
- 관리 화면 'AI 로그' 탭에서 요약을 승인/반려/수정(수정하면 공지의 한국어 요약도 바뀜). 반려한 공지 요약은 공지에서 지워지고 비공개로 돌아갑니다.
- 공개 규칙: AI는 저작권을 판단하지 못합니다. 풍경/온천탕/객실/음식 사진은 신뢰도 0.8 이상이고 라이선스가 확인(verified, 또는 owned, 또는 Commons+라이선스 기록)된 것만 공개 대상이며, 공식 사이트/출처 불명 사진은 '라이선스 보류'로 남고 공식 페이지 링크만 둡니다. 로고는 자동 공개 없이 '로고 검토'로 남습니다. '로고·사진 승인' 탭에서 직접 확인한 것만 승인하세요(사진 승인 = verified + 공개).
- 공개 사이트는 바뀌지 않습니다. 승인된 로고를 시설 카드의 공식 링크 옆에 작게 보이려면 후속 작업(anon 읽기 정책 + 로더)이 필요합니다(README 'AI 로그 + 사진 분류' 마지막 항목).
- 테스트용 가짜 모드: `AI_MOCK=1 node tools/monitor/worker.mjs --classify --sink rest` (서비스 키 필요, AI 호출 없이 mock 로그만 쌓고 사진/공지는 바꾸지 않음).

## 4. 첫 실제 실행 (rest 싱크는 실서버로 돌려본 적이 없습니다)
- 키를 설정한 PowerShell 에서, 프로젝트 폴더로 이동 후:
  - (선택) 대상 넓히기: `node tools/monitor/worker.mjs --seed --sink rest --n 1246` (테스트 대상 30개는 이미 DB에 있음)
  - 실행: `node tools/monitor/worker.mjs --run --sink rest`
  - 확인(SQL Editor): `select result, count(*) from monitor_logs group by 1;`

## 5. 관리 화면 확인 (사이트 배포 후)
- `https://<사이트>/admin/monitor` > 로그인 > 7개 탭이 보이는지, '공지' 탭에서 승인/비공개가 되는지 확인. 요약(summary_ko)이 비어 있으면 공개할 수 없으니 직접 한국어 요약을 적고 승인.
- 개발자도구 > Network 에서 `/admin/monitor` 응답 헤더에 `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store` 확인.
- 변경 이력에서 승인 -> 워커 실행(`node tools/monitor/worker.mjs --apply --sink rest` 또는 `--run`) -> '반영됨' 확인 -> '되돌리기 요청' -> 워커 실행 -> '되돌림' 확인을 한 번 해보세요. 키가 없으면 승인해도 '승인' 상태로 대기합니다.
- 직접 되돌림: `node tools/monitor/worker.mjs --revert <변경 id> --sink rest`. 나중에 반영된 변경이 있으면 `superseded`로 거부되니 새 것부터 되돌리세요.
- 현재 DB의 '검토 대기' 변경 2건(실데이터)은 손대지 않았습니다. 승인할지는 직접 판단하세요.

## 6. Commons 사진 52건 가져오기 (보류 중, 소유자 승인은 이미 받음)
- 상태: 2026-11-23 재시도에서 첫 파일부터 429(5분 후에도 동일)라 0건 받고 중단. DB·사이트 변경 없음. 라이선스 52건은 API로 다시 확인해 모두 일치.
- 다시 할 때: 몇 시간~하루 뒤 `tools/photos/import-report.md` 순서 2~3. 즉 `tools/photos`에서 `node get.mjs`(2초 간격, 429면 5분 한 번 쉬고 계속되면 멈춤) -> `node gen.mjs`(INSERT SQL + photo-assets 추가분) -> SQL 실행 -> `?v=` 를 20270101 로 올리고(html + `db-loader.js` + `web/README.md`) `node tools/security/check.mjs`.
- 스이메이칸(水明館)·조라쿠엔(長楽園)·쓰보유(つぼ湯) 3건은 분류의 첫 파일을 임시로 골랐으니 이미지를 눈으로 확인하고, 시설이 분명히 보이지 않으면 뺍니다.

## 7. 공개 전에 정할 일
- 이 PC에 남은 모니터 테스트 데이터(monitor_* 대상 90개, 공지 19건, 사진 해시 90건)는 일부러 남겨 두었습니다. 지우려면 `delete from public.monitor_targets;`(자식 행 자동 삭제) 후 `facility_notices`/`photo_assets`/`facility_changes`/`monitor_logs` 를 비우세요.
- 숨긴 시설 2,243건(unlisted)은 삭제하지 않았습니다. 일부를 다시 보이게 하면(`update onsen_facilities set unlisted=false where id in (...)`, 전체 되돌리기는 `tools/cleanup/unhide.sql`) `web/listed-ids.js` 를 다시 만드세요(`web/README.md` 숨김 절). 안 만들어도 사이트는 정상이고 DB 장애 폴백에서만 빠집니다.
- 하지 않은 것(요청이 있을 때만): 공지 자동 공개(현재 전부 `published=false`), 사진 공개(`license_status='verified'` 승인 필요), 관리자 화면 실시간 반영(Realtime은 CSP에 wss 호스트 추가 필요).
