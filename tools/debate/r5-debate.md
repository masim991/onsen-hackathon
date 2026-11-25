# R5 전문가 토론 (UX / 디자인 / 프런트 / 백엔드 / SEO·신뢰)

전제: 5개 보고서 기준. 보고서에 없는 것은 [assumed]. 현재 모니터링 약 300건/일, 필요 약 1,500건/일, 공개 486곳 중 가격 134곳(28%), 공식 URL 보유 319곳.

## Round 1: 타 전문가 발견 중 틀렸거나 과대평가·위험한 3개씩

**UX**
1. 디자인 #3 (15px `!important` 제거, L): 카드 밀도가 이미 높은데 위계를 위해 글자를 줄이면 모바일 가독성이 떨어진다. 56건 `!important` 정리는 회귀 위험 대비 사용자 이득이 불명확.
2. SEO #1 (시설별 페이지): 가격 28%뿐인 데이터로 시설 페이지를 만들면 "가격 미공개" 얇은 페이지가 대량 생긴다. 사용자 가치 낮음.
3. 프런트 #3 (JS 번들·폰트 교체, L): 체감 이득 대비 로드 순서 깨짐 위험. 사용자는 서랍 포커스·가격 라벨 오류를 먼저 겪는다.

**디자인**
1. UX #8 (모바일 필터 순서 변경·찜 필터 무시): 정체성인 sticky 스택 구조를 흔들 수 있고 중복 개념 정리가 먼저다.
2. 프런트 #3 (Klee One 제거): 일본어 인트로가 가장 에디토리얼이다. 폰트를 빼면 톤이 죽는다.
3. 백엔드 #2 (대용량 limit): 디자인 관점 무관이나, 사용자에게 보이는 결과(공지 0건, 사진 2행)로 이어지지 않는 인프라 확대는 우선순위가 낮다.

**프런트**
1. 디자인 #5 (지도 CSS filter): 타일 필터는 성능·접근성에 영향 작지만 다크 전용 필터 조합은 유지 비용. 서랍 지도 축소만 하면 충분.
2. SEO #1 (정적 페이지 생성기): "빌드 없음" 제약 위반. 생성 산출물이 DB와 어긋나면 가격 안전 규칙이 깨진다.
3. UX #2 (비교표 재설계): 모바일 2열 고정은 `<dialog>` 현행 구조를 건드린다. 빈 행 접기만이면 충분.

**백엔드**
1. SEO #1: 모니터 반영값(`record.monitor`)이 2곳뿐인데 정적 복사본은 즉시 낡는다. 데이터 동기화 부채.
2. 프런트 #1 (전체 이미지 일괄 재인코딩): 라이선스·출처(CC BY-SA 파생물 표기)를 깨뜨릴 수 있다. 로컬 사본이 Commons 대비 안전판이다.
3. UX #1 (가격 커버리지 확대를 UX 과제로): 해결은 UI가 아니라 모니터링 처리량이다. UI는 정직한 빈 상태만.

**SEO/신뢰**
1. 백엔드 #4 (notice 요약 없이 일괄 승인): 오탐 공지 노출은 신뢰·법적 리스크. 거부.
2. 프런트 #4 (hero 로컬 preload)는 찬성하나 #3 번들링은 SEO 이득이 없다. 과대평가.
3. 백엔드 #2 (limit 400, 한 번에 대량): robots·호스트 간격 정책(1.1초)과 충돌하면 차단 위험. 일 처리량은 빈도로 풀어야 한다.

## Round 2: 반박과 트레이드오프

- **디자인 vs UX(15px)**: 합의점은 "전면 제거"가 아니라 가격 한 줄만 17px 굵게+tabular-nums, 나머지는 14~15px 바닥 유지. 모바일 본문은 15px 미만 금지. 전면 정리(L)는 이번 세션 범위 밖으로 보류.
- **SEO vs 프런트/UX(시설 페이지)**: 현 데이터로 정적 시설 페이지 100곳은 얇은 콘텐츠 위험(가격 28%, 사진 34% 없음, unlisted 정책). SEO가 양보: 지금은 robots/sitemap(홈 3+가이드 6)/OG/canonical/noscript만. 재검토 조건은 "가격+사진+라이선스 확인 시설 100곳 이상". 이 조건은 모니터링이 돌아야 충족되므로 백엔드 #1이 SEO의 선행 조건.
- **백엔드 vs SEO(limit)**: 숫자로 보면 호스트당 1.1초 간격은 유지, 대상 319곳 호스트 대부분 distinct. 실행당 limit 120→250, 실행 빈도 외부 cron 60분마다(24회/일)면 용량 약 6,000건/일, 필요량 1,500의 4배. 대량 단발 대신 소량 빈번이 정중하고 안전. 백엔드가 limit 400 고집을 철회. 단 외부 cron은 PAT 필요(오너). 오너가 거부하면 GitHub schedule만 남아 ~300건/일이고 `limit 250`으로 최대 ~750건/일(하루 3회 기준 [assumed]).
- **프런트 vs 백엔드(이미지)**: 프런트가 수용: 파일명 유지, 해상도만 1280px 이하로 축소(메타·크레딧 데이터는 photo-assets.js 불변), 원본은 Commons에서 재취득 가능. koshikano(7.25MB)는 필수, 나머지 일괄은 500KB 초과분만.
- **SEO vs 백엔드(notice 승인)**: 일괄 승인 거부 유지. 대신 notice 주기 360→1440분, 공개 승인 보류. 백엔드 수용.
- **UX vs 프런트(비교표)**: 빈 행 접기만 채택, 모바일 2열 기본은 CSS만(스와이프로 3·4열). `<dialog>` 구조 불변.
- **UX 찜 필터**: 찜 필터는 지역·숙박 조건을 무시하는 대신 현 조건에서 0건이면 "다른 조건에 N곳" 안내. 비교 sticky 트레이는 CSS 변경이 커서 이번엔 안내문만.
- **photo 파이프라인**: 백엔드 안 (a) `photo` target `enabled=false`(UPDATE, 삭제 아님, 롤백 가능) 채택. CSP에 막힌 호스트 수집은 낭비(경고 26건, 공개 2/281).

## Round 3: 합의

모든 변경은 가격 규칙·CSP·이스케이프·unlisted 필터·공식 링크 우선을 유지. DB 삭제 없음. 가격 확보(백엔드)가 UX·SEO의 공통 병목이라 1순위.

## FINAL UPGRADE LIST (가치/노력 순, 14개)

| id | 제목 | 담당 | 변경 | 파일 | 노력 | 위험 | 회귀 테스트 | 충돌/의존 | 수행 |
|---|---|---|---|---|---|---|---|---|---|
| A1 | 모니터 처리량 복구 | 백엔드 | `--limit 250`, timeout 40분, deadline 자체 종료, notice 1440분, photo target disable(UPDATE), ROLLOUT 모수 319로 정정+48h overdue<5% 게이트, 가격 없는 인기 지역 우선 next_check | monitor.yml, worker.mjs, ROLLOUT.md, 신규 SQL 008 | M | 중 | worker dry-run, 20분 재클레임, 가격 0.5~2배 가드 | A2와 같은 파일 | AI(외부 cron은 오너) |
| B1 | 카드 가격/라벨 정정 | UX+디자인 | day 배지를 숙박가에서 분리, "예약은 공식" 반복 문구와 미공개 반복 푸터 제거, 가격 상시 면책 한 줄(환산은 "약", 결제는 엔화), 당일-only는 "이용 안내는 공식 사이트에서", 제휴 대비 `rel` 분기 | site.js(compactCard, 카드 템플릿), i18n.js | S | 낮음 | 숙박가+당일 혼재 카드, 가격 없음 카드, ko/en/ja 문자열, 가격 안전 규칙 | site.js를 B 패키지가 독점 | AI |
| D1 | 크롤 기본기 | SEO | robots.txt(admin Disallow), sitemap.xml(hreflang), canonical/hreflang 절대 URL, OG/Twitter, 홈 3개 title/description, noscript+정적 요약, 히어로 preload 로컬화 | index/ja/en.html, robots.txt, sitemap.xml | S | 낮음 | 3개 html 로드, 콘솔 에러 0, `check.mjs` | 도메인 확정 필요, ?v= 일괄 bump도 D가 담당 | AI(도메인 오너) |
| E1 | 이미지 용량 | 프런트 | koshikano 1200px 이하로 재인코딩, 500KB 초과 파일만 1280px q75, 파일명 유지 | images/* | S | 낮음 | 이미지 경로 404 없음, photo-assets.js 불변 확인 | 없음 | AI |
| B2 | 서랍 포커스/aria | 프런트 | 열 때 `detail.focus()`, 닫을 때 `.pick` 복귀, aria-expanded를 render 후 동기화 | stack-list.js, site.js(render 끝) | M | 중 | 키보드 열기/Esc/복귀, render 재호출 루프 없음 | B 패키지 내 순서 B1 다음 | AI |
| A2 | 하트비트·실패 알림 | 백엔드 | 마지막 단계 heartbeat 기록, `if: failure()` 이슈 생성, info/new 로그 미저장, `permissions: contents: read`, `uses:` SHA 고정 | monitor.yml, worker.mjs | S | 낮음 | 실패 주입 시 이슈, heartbeat 행 확인 | A1 뒤 | AI(외부 경보 계정 오너) |
| B3 | 필터 정직성 | UX | 예산 슬라이더: 지역 가격 0곳이면 비활성+안내, "가격 있는 곳만" 칩 승격, 건수 "확인 N/M", 이름 검색 0건이면 "당일 포함 N곳 보기", 찜 0건 안내 | site.js, i18n.js | M | 낮음 | 홋카이도 숙박, "Otakinoyu", 찜 0건 | B1 이후 | AI |
| D2 | 신뢰 창구 | SEO | "해커톤 기획 초안" 제거, terms/privacy/contact 독립 페이지, 푸터 링크, 약관 면책 구체화 | footer.js, 신규 html 3개, sitemap(D1) | M | 낮음 | 푸터 링크 3개 로드, CSP 위반 없음 | 실제 이메일은 오너 | AI+오너 |
| C1 | 무사진 카드 | 디자인 | 칩 대신 hinoki 면+도도부현 글자 문장 플레이스홀더, `align-self:stretch`, 제목 `word-break:keep-all` | onchun.css, stack.css | M | 중 | 라이트/다크, 375/1024, 사진 혼합 행 | C 패키지 | AI |
| C2 | 모바일 헤더 1줄 | 디자인 | 메뉴 가로 스크롤 칩+고정 높이 축소, 스크롤 후 불투명 | theme.css, style.css | M | 중 | 375px 첫 화면, 앵커 오프셋, 다크 | C1과 같은 패키지(theme.css) | AI |
| A3 | 데이터 품질 정리 | 백엔드 | 중복 URL 4건, URL 없는 167곳 후보 승격은 후보 뷰만 생성(자동 반영 없음) | 신규 SQL 뷰, tools/prices | M | 중 | 뷰 조회, 공개값 변경 없음 | A1 SQL과 같은 패키지 | AI |
| D3 | 로드 효율 | 프런트 | 초기 poll 제거, `document.hidden` 시 건너뜀, vercel.json js/css 300초 캐시 | db-loader.js, vercel.json | S | 낮음 | 로드 후 요청 수, 폴링 감지 | D1과 html 충돌 없음 | AI |
| B4 | 비교표 정리 | UX | 모두 "확인되지 않음"인 행 접기 | site.js(cmpRender) | S | 낮음 | 규슈 3곳 비교 | B 패키지 | AI |
| C3 | 위계·톤 소규모 | 디자인 | 가격 17px 굵게+tabular-nums, 지도 타일 톤다운(다크 별도), 서랍 지도 220px, 닫기 버튼 그림자, Gaegu는 h1만 | map.css, dark.css, theme.css(C2 뒤) | S | 낮음 | 다크 대비, 서랍 | C2 뒤 순차 | AI |

사진 라이선스 필수 필드 검사(SEO #6)는 E2로 `check.mjs`에 추가, 노력 S, 누락 시 사진 숨김 쪽으로 처리. (14개 상한 때문에 C3 이후 선택 항목, 담당 E 패키지, 파일 tools/security/check.mjs, tools/photos.)

## WORK PACKAGES (파일 비중복)

- **A 백엔드/모니터**: monitor.yml, worker.mjs, ROLLOUT.md, 신규 SQL, tools/prices. 항목 A1, A2, A3. 순서 A1 → A2 → A3.
- **B 앱 로직/문구**: site.js, i18n.js, stack-list.js. 항목 B1 → B3 → B2 → B4. 새 CSS가 필요하면 C에 요청 목록으로 전달(site.js 외 CSS 직접 수정 금지).
- **C 비주얼 CSS**: theme.css, style.css, onchun.css, stack.css, map.css, dark.css. 항목 C1, C2, C3 순서.
- **D 문서 헤드/SEO/배포**: index.html, ja.html, en.html, robots.txt, sitemap.xml, footer.js, 신규 정책 html, db-loader.js, vercel.json. 항목 D1, D3, D2. `?v=` bump는 마지막에 D가 일괄.
- **E 자산/검사**: images/*, tools/security/check.mjs, tools/photos. 항목 E1, E2.

병렬 가능: A, C, D, E는 완전 독립. B만 내부 순차.

## 기각/보류와 이유

- 시설별 정적 페이지(SEO #1): 보류. 가격 28%, 얇은 콘텐츠, unlisted, 빌드 없음, DB 불일치 위험. 조건 충족 시 재논의.
- `!important` 전면 제거와 타입 스케일 전환: 보류(L, 회귀 위험 높음).
- JS 번들링, Klee One 제거(프런트 #3): 보류. 로드 순서 의존, 일본어 톤 손상.
- notice 요약 없는 일괄 승인: 기각(오탐 공지 노출).
- 사진 프록시/호스팅 설계: 기각. CSP 완화 금지.
- 로컬 Task Scheduler 부활: 기각(PC 상시 켜짐 불가).
- 모바일 필터 순서 대재배치, 비교 sticky 트레이: 보류(구조 변경 큼).
- Supabase migrations 디렉터리 이전/pg_dump: 보류(백업은 오너가 대시보드 확인).
- Anthropic 요약: 불필요(키 없음).

## OWNER-ONLY

1. GitHub fine-grained PAT 발급 + 외부 cron(cron-job.org 또는 Cloudflare Workers Cron) 등록, workflow_dispatch 호출.
2. 외부 경보 계정(healthchecks.io/UptimeRobot) 및 수신 이메일.
3. GitHub Environment `production` 필수 승인자, fork PR 워크플로 승인 설정.
4. Supabase 대시보드: leaked password protection, 일일 백업 확인.
5. 배포 도메인 확정(canonical/sitemap/OG용).
6. 실제 문의 이메일 결정(정식 공개 전 필수).
7. 약관·개인정보·경품표시법·APPI/PIPA 법률 검토, 제휴 시작 시 표기 승인.
8. SQL 적용 승인(UPDATE만, 삭제 없음) 및 배포.
