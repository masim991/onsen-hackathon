# 온천 한눈에 (温泉ひとめぐり / Onsen at a Glance)

일본 온천 숙소·당일 온천을 **찾고, 비교하고, 공식 사이트로 이동**하는 3개 국어(한국어·일본어·영어) 정보 사이트입니다.
예약 대행이 아니라 "정확한 정보를 보고 본 예약처로 가는 길"을 만드는 것이 목표입니다.

> 상태: 개발 중(해커톤 프로젝트에서 출발). 가격·사진 등 일부 정보는 아직 비어 있고, 비어 있는 값은 추측하지 않고 "미공개/확인되지 않음"으로 표시합니다.

## 주요 기능
- **탐색:** 도도부현 지도(Leaflet)·검색·필터(지역, 숙박/당일, 예산, 온천 특성), 가격순 정렬, 찜.
- **비교:** 여러 시설을 비교 창(`<dialog>`)에서 표로 비교. 모든 시설이 "확인되지 않음"인 행은 한 줄로 접힘.
- **가격 표시 규칙:** 숙박 요금과 당일 입욕 요금을 분리해 표시하고, 확인일·기준·출처를 함께 보여줍니다. 엔화는 실시간 환율로 원화/달러 환산(열 때 갱신, 이후 1시간마다).
- **공식 사이트 바로가기:** 모든 카드에서 한 번에 공식 사이트로 이동. 결제는 사이트에서 받지 않습니다.
- **3개 국어:** `index.html`(ko) · `ja.html` · `en.html`, 공용 렌더러와 번역 사전.
- **다크 모드, 모바일 우선 레이아웃, 접근성(서랍 포커스·키보드·`prefers-reduced-motion`).**
- **운영자용 모니터링(`/admin/monitor`):** 공식 사이트의 공지·가격·영업시간 변화를 자동 감시하고, 변경 이력·공지·사진 승인을 관리자 화면에서 처리.

## 사용한 언어와 프로그램

| 구분 | 사용한 것 | 용도 |
|---|---|---|
| 웹 프런트엔드 | **HTML5, CSS3, JavaScript(순수 JS, 프레임워크·번들러 없음)** | 정적 사이트. 빌드 단계 없이 `web/` 폴더를 그대로 배포 |
| 서버·도구 | **Node.js 24 (ESM, `.mjs`)** | 모니터링 워커, 가격·사진·환율·이름 정리 스크립트, 보안 점검, SEO 생성기 |
| 데이터베이스 | **PostgreSQL (Supabase)**, SQL | 시설·사진·공지·변경 이력·감시 대상 저장, 접근 제한(RLS) |
| 백엔드 서비스 | **Supabase** (Postgres, REST API, Auth, RLS) | 공개 카탈로그 읽기 + 관리자 전용 쓰기 |
| 호스팅 | **Vercel** 정적 호스팅 설정(`vercel.json`) | 보안 헤더(CSP 등), 캐시 규칙 |
| 자동화 | **GitHub Actions** (YAML), 외부 cron(워크플로 호출) | 30~60분 주기 모니터링 실행 |
| 지도 | **Leaflet** (`web/vendor`에 포함), 국토지리원(GSI) 타일 | 도도부현 선택 지도 |
| 사진 | Wikimedia Commons(라이선스 확인분), 로컬 이미지 | 저작자·라이선스 표기와 함께 사용 |
| 글꼴 | Google Fonts: Gowun Dodum, Klee One, Gaegu | 한국어·일본어·손글씨 표제 |
| 환율 | open.er-api.com, frankfurter.dev 등 공개 API(중앙값) | 엔 → 원/달러 환산 |
| 로컬 개발 | `npx serve`, 브라우저 개발자도구 | 빌드 없이 `web/` 서빙 |
| AI 개발 도구 | Claude Code(코드 작성·검토·전문가 토론) | 개발 보조. 서비스 런타임에는 AI API 키가 필요하지 않음 |

## 구조

```
web/                    정적 사이트(배포 대상)
  index.html ja.html en.html   언어별 진입 페이지
  site.js                      공용 렌더러(카드·필터·서랍·비교·가격 표시)
  i18n.js, i18n-data.js, locale-*.js, facility-translations.js   번역
  db-loader.js                 Supabase 읽기, 폴백(내장 데이터), 60초 변경 확인
  data.js, photo-assets.js, listed-ids.js, data/*.json   내장/폴백 데이터
  map.js, vendor/              지도(Leaflet, 일본 도도부현 경계)
  theme.css, onchun.css, stack.css, dark.css, ...   스타일
  admin/                       관리자 화면(로그인 필요, 검색엔진 차단)
  legal/                       약관·개인정보·문의 페이지(3개 국어)
tools/
  monitor/    감시 워커(worker.mjs), DB 마이그레이션, 운영 문서
  prices/ photos/ names/ fx/ geocode/   데이터 수집·정리
  security/   배포 전 보안 점검(check.mjs)
  seo/        canonical·sitemap·robots 생성기
  debate/     설계 토론 기록(전문가 검토 보고서)
.github/workflows/monitor.yml   모니터링 실행
vercel.json                     보안 헤더·캐시
```

## 데이터 흐름

```
공식 사이트 ──(robots 준수, 호스트당 1.1초 간격)──▶ 모니터링 워커(GitHub Actions)
                                                   │ 변경 감지·분류·규칙 기반 사진 분류
                                                   ▼
                                  Supabase(monitor_*, facility_changes, 공지, 사진)
                                                   │  RLS: 공개 읽기 / 관리자·서비스 전용 쓰기
        방문자 브라우저 ◀── REST(읽기 전용 공개 키) ◀──┘
              │ 실패 시 내장 데이터로 폴백
              ▼
        카드·비교·필터 (원본 값 우선, 감시 값은 별도 필드로만 보관)
```

- 감시 값은 `record.monitor` 아래에만 저장하고 원본 필드를 덮어쓰지 않습니다. 확실한 값은 설정(`AUTO_APPLY`)에 따라 자동 반영되며 되돌릴 수 있습니다.
- 공지는 비공개로 저장되고 관리자가 한국어 요약을 확인해 공개합니다.
- 사진은 라이선스가 확인된 출처만 공개 후보가 되고, 로고는 항상 관리자 승인 대기입니다.

## 로컬에서 실행

```powershell
cd web
npx serve -l 5188 -c serve.json
```

브라우저에서 `http://localhost:5188/?nointro` (도입 화면 생략). 일본어/영어는 `/ja`, `/en`.

배포 전 점검:

```powershell
node tools/security/check.mjs
node tools/monitor/worker.mjs --selftest
```

## 보안과 신뢰 원칙
- 엄격한 CSP, 데이터 값 이스케이프·URL 검증, 모든 DB 테이블 RLS, 공개 키만 브라우저에 포함.
- 서비스 키·API 키는 저장소에 두지 않고 GitHub Secrets로만 사용합니다.
- 가격·사진·공지는 출처와 확인일을 함께 표시하고, 확인되지 않은 값은 비워 둡니다.
- 자세한 내용: [SECURITY.md](SECURITY.md), [web/README.md](web/README.md), [tools/monitor/README.md](tools/monitor/README.md).

## 아직 하지 않았거나 계획 중인 것
- 시설별 개별 페이지(검색 노출용). 가격·사진·라이선스가 확인된 시설이 충분히 쌓인 뒤 재검토.
- 가격·당일 입욕 정보 보강(현재 공개 시설 중 가격이 있는 곳이 일부).
- 배포 도메인 확정 후 canonical·sitemap 생성(`tools/seo/gen.mjs`), JSON-LD 구조화 데이터 활성화.
- 모니터링 대상 확대(처리량이 안정된 뒤 단계적으로).
- 사진 보강(Wikimedia Commons 라이선스 확인분 순차 반영).

## 라이선스와 출처
- 사진은 각 파일의 저작자·라이선스를 `web/photo-assets.js`와 사이트의 출처 페이지에 표기합니다.
- Leaflet은 BSD-2-Clause이며 라이선스 파일이 `web/vendor/`에 있습니다.
- 시설 정보의 저작권은 각 시설과 원 출처에 있고, 이 저장소는 링크와 요약 정보를 다룹니다.
