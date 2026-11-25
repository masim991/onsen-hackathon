# 온천 한눈에 (温泉ひとめぐり / Onsen at a Glance)

일본의 온천 숙소와 당일 입욕 시설을 한국어·일본어·영어로 탐색하고 비교한 뒤 공식 사이트에서 자세한 정보를 확인하는 정적 웹사이트입니다. 예약이나 결제는 받지 않습니다.

**공개 사이트:** https://masim991.github.io/onsen-hackathon/
**상태:** 개발 중. 가격·사진·영업 정보가 없는 시설은 추정값 대신 미확인 상태로 표시합니다.

## 현재 구현된 경험

- **료칸 입장:** 정면의 미닫이문을 열고 다다미방 좌탁으로 들어가는 도입 화면. 단풍·조명·카메라 이동을 겹쳐 공간감을 표현합니다. `?nointro`로 건너뛸 수 있습니다.
- **지도 탐색:** 좌탁 위 종이가 펼쳐지는 연출 뒤 일본 지방과 도도부현을 선택합니다. 현에 마우스를 올리면 지도가 반응하고, 선택하면 해당 지역의 시설 수와 사진 배너가 나타납니다. 지도는 `map-explore.html`에 있으며 Leaflet과 일본 현 경계 데이터를 사용합니다.
- **온천 검색:** 지역·숙박/당일 입욕·가격·온천 특성 필터, 이름 검색, 가격순 정렬, 즐겨찾기와 여러 시설 비교. 상세 화면에는 공식 사이트, 확인된 가격의 기준·확인일·출처, 공지가 표시됩니다.
- **다국어·접근성:** 한국어(`index.html`), 일본어(`ja.html`), 영어(`en.html`). 모바일 레이아웃, 키보드 조작, 포커스 복귀, 다크 모드와 `prefers-reduced-motion`을 지원합니다.
- **데이터 폴백:** Supabase 읽기에 실패하면 생성일이 표시되는 공개 카탈로그 스냅샷을 사용하고, 그것도 실패하면 번들에 포함된 공개 시설 데이터를 사용합니다.
- **운영자 화면:** `/admin/monitor.html`에서 로그인 후 감시 현황, 작업 대기열, 공지, 변경 이력, 가격 반영, 이미지와 승인 대상을 확인합니다. 이미지 탭과 승인 탭에서 사진 미리보기를 볼 수 있습니다.

화면의 지도·문 열림·종이 펼침은 브라우저의 이미지, CSS 애니메이션 및 지도 상호작용으로 구현했습니다. 실제 3D 메시 장면은 사용하지 않습니다.

## 데이터와 운영

```text
공식 사이트 ──▶ GitHub Actions 감시 워커 ──▶ Supabase(PostgreSQL, Auth, RLS)
                                                 │ REST 공개 읽기
GitHub Pages(web/) ──▶ 방문자 브라우저 ◀────────────┘
                       └─ DB 장애 시 번들된 공개 스냅샷 사용
```

- [감시 워크플로](.github/workflows/monitor.yml)는 정기 실행과 수동 실행을 지원합니다. 공식 사이트의 공지·가격·영업시간·사진 후보를 수집하며, 서비스 키가 등록되지 않으면 실행을 건너뜁니다.
- 가격과 영업시간의 감시 결과는 원본 시설 필드를 덮어쓰지 않고 `record.monitor`에 보관합니다. 확인된 변경은 정책에 따라 반영하고 이력·되돌리기를 관리합니다. 가격 변동은 DB의 이력과 추이 뷰에 기록됩니다.
- 시설의 휴업·영업시간·가격 관련 공지 중 날짜와 공식 출처 등 조건을 만족하는 것은 키 없는 규칙 기반 한국어 요약으로 자동 공개할 수 있습니다. 그 밖의 공지는 관리자 화면에서 요약·검토·공개할 수 있습니다.
- 사진 분류는 기본적으로 키 없는 규칙 기반 방식입니다. **분류 결과나 `verified` 표기만으로 재게시 허가가 증명되지는 않습니다.** 공개 전 출처와 이용 조건을 확인하고, 관리자 화면에서 공개 상태를 관리합니다. 사진·지도 자료의 출처는 사이트의 자료 출처 페이지에 표시합니다.
- 브라우저에는 Supabase 공개 읽기 키만 사용합니다. 관리자 쓰기는 인증과 RLS로 제한하며, 서비스 키는 GitHub Secrets에서만 사용합니다.

자세한 운영 절차와 데이터 구조는 [모니터링 문서](tools/monitor/README.md), [배포 운영 문서](tools/monitor/ROLLOUT.md), [웹 코드 안내](web/README.md)를 참고하세요.

## 기술 구성

| 영역 | 사용 기술 |
| --- | --- |
| 웹 화면 | HTML, CSS, 순수 JavaScript (번들러 없음) |
| 지도 | 로컬 Leaflet, 일본 현 경계 데이터, 국토지리원 지도 타일 |
| 데이터·인증 | Supabase PostgreSQL, REST API, Auth, RLS |
| 수집·생성 도구 | Node.js 24 ESM, SQL |
| 배포·자동화 | GitHub Pages, GitHub Actions |
| 선택적 호스팅 설정 | `vercel.json`의 보안·캐시 헤더 |

```text
web/                         GitHub Pages 배포 대상
  index.html, ja.html, en.html  언어별 시작 페이지
  intro.js, experience.css     료칸 진입 연출
  map-explore.html/js          지방·현 선택 및 온천 배너
  site.js, db-loader.js        시설 UI와 DB/스냅샷 읽기
  admin/monitor.html/js        운영자 화면과 이미지 미리보기
  data/, images/, vendor/      데이터·사진·지도 라이브러리
tools/
  monitor/                     감시 워커, SQL 마이그레이션, 운영 문서
  seo/gen.mjs                  canonical·다국어 링크·사이트맵 생성
  security/check.mjs           보안·라이선스 점검
  export-public-snapshot.mjs   공개 데이터 폴백 생성
.github/workflows/
  pages.yml                    main 푸시 시 GitHub Pages 배포
  monitor.yml                  감시 워커 정기·수동 실행
```

## 로컬 실행과 점검

Node.js 24가 필요합니다. 저장소 루트에서:

```powershell
cd web
npx serve -l 5188 -c serve.json
```

`http://localhost:5188/`에서 도입 화면을 확인할 수 있습니다. 곧바로 검색 화면을 보려면 `http://localhost:5188/?nointro`를 엽니다. 관리자 화면은 `/admin/monitor.html`이며 관리자 계정이 필요합니다.

저장소 루트에서 검사를 실행합니다.

```powershell
node tools/security/check.mjs
node tools/monitor/worker.mjs --selftest
```

## GitHub Pages 배포

`main`에 푸시하면 [Pages 워크플로](.github/workflows/pages.yml)가 `web/`을 배포합니다. 워크플로는 `SITE_URL=https://masim991.github.io/onsen-hackathon`으로 SEO 메타데이터와 사이트맵을 생성합니다. 도메인을 바꾸면 워크플로의 `SITE_URL`과 저장소의 Pages 설정을 함께 수정해야 합니다.

GitHub Pages는 정적 파일을 배포합니다. `vercel.json`과 `web/serve.json`의 HTTP 보안·캐시 헤더는 Pages에 적용되지 않습니다. HTML의 메타 CSP는 별도로 포함되어 있습니다. 서버 측 헤더가 필요하면 이를 지원하는 호스팅을 사용해야 합니다.

## 알려진 한계와 다음 작업

- 숙박비·당일 입욕 요금·사진이 확인되지 않은 시설이 있습니다. 정보의 출처와 확인일을 계속 보강해야 합니다.
- 시설별 독립 상세 페이지는 아직 없습니다.
- 사진의 공개 여부와 재게시 권한은 별개입니다. 허가 범위가 불분명한 자료는 출처를 재확인해야 합니다.
- 정적 호스팅의 관리자 기능은 Supabase 연결과 관리자 계정에 의존합니다.

보안 정책은 [SECURITY.md](SECURITY.md), 사진·지도 자료의 출처는 [자료 출처 페이지](web/sources.html)에 있습니다.
