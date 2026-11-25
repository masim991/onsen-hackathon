# R5 프런트엔드 감사 (성능/접근성/CSP)

측정: `npx serve -c serve.json` 로컬, 내장 브라우저(ko ?nointro, en.html), 데스크톱 뷰포트. 네트워크 스로틀 없음 -> 절대값은 낙관적. 소스는 수정하지 않음.

## 1) 점수: 5.5 / 10
보안(CSP·이스케이프)과 CLS는 괜찮다. 그러나 이미지 용량 관리, 포커스 관리, SEO 메타, 요청 수는 "빌드 없음"을 핑계로 방치된 수준이다.

## 2) 문제 Top 8
1. **7.25MB 원본 사진이 카드 썸네일로 로드됨.** `images/koshikano-kagoshima-2394.jpg` 4032px, 7,253,158B. 첫 화면 20번째 이내 카드에서 314px로 표시(`photo-assets.js:153-161`, 로컬 images 합계 28.5MB). 첫 로드 이미지 전송 7.4MB 중 이 한 장이 97%. 모바일 데이터/LCP 후속 이미지 지연의 주범. 같은 폴더 다른 파일도 최대 538KB로 `width=500` 대비 과대.
2. **상세 서랍 포커스 관리 없음.** `.pick` 클릭 후 `document.activeElement`=BODY, `aria-expanded`는 계속 `false`(`site.js:313,328`은 렌더 시점 값인데 render()가 목록을 통째로 다시 그려 버튼이 파괴됨). Esc로 닫아도 포커스는 BODY. `#detail`은 `aside tabindex=-1`(`i18n.js:418`)인데 열릴 때 focus() 호출이 없다(`stack-list.js:176-187`는 닫기 버튼만 삽입). 키보드·스크린리더 사용자는 서랍이 열렸는지 알 수 없다. WCAG 2.4.3 / 4.1.2 위반. (`<dialog>` 비교창 `site.js:355`은 네이티브라 문제 없음.)
3. **요청 74개 / 직렬 체인.** JS 24개(디코드 804KB, 전송 274KB), CSS 13개(144KB), 외부 폰트 CSS 1개(224KB, `index.html:17`; Klee One 일본어 서브셋 수백 `@font-face`가 `document.fonts`에 300+ 항목). 체인: 9개 defer 스크립트 -> db-loader(506ms에 fetch) -> site.js(767ms) -> 7개 순차 스크립트. 기본 데이터(`data.js`+`extra`+`additional`+`survey`+`ryokan-*`+`photo-assets` ~110KB)는 DB 성공 시 대부분 덮어쓰이는데도 매번 받는다. long task 5건(최대 246ms, 815-1446ms 구간).
4. **빈 셸 + noscript 없음.** `index.html` body는 스크립트 태그뿐, `<noscript>` 0건, 본문 전부 JS 렌더. 첫 의미 있는 콘텐츠는 DB 응답(~700ms) 이후. 크롤러/JS 실패 시 빈 화면. LCP 항목은 외부 위키미디어 핫링크 히어로(`index.html:15` preload, 380KB) -> 우리 통제 밖(가용성/속도/핫링크 정책).
5. **SEO/메타 결함.** `canonical`이 상대경로 `href="index.html"`(`index.html:14`, 무효). og:/twitter 메타 0건, sitemap.xml·robots.txt 없음. hreflang도 상대경로(절대 URL 필요).
6. **캐시 전략 불일치.** `vercel.json`은 js/css에 `?v=` 쿼리를 붙이면서도 html과 json만 300초 규칙이 있고, js/css는 규칙이 없거나(Vercel 기본 must-revalidate) 로컬 serve.json은 `no-cache`. 해시 파일명 없이 `?v=20270103`을 14개 html/js에 수동 일괄 교체하는 구조 = 하나라도 빠뜨리면 구/신 JS 혼합. `data.js` 등 일부는 `?v=`조차 없음(`index.html:25-31`).
7. **60초 폴링 설계 결함.** `db-loader.js:127-128` 로드 직후(1429ms) 곧바로 poll 2건 실행(전체 로드 직후라 불필요), 탭이 숨겨져도 `setInterval`은 계속 돈다(백그라운드 요청 낭비; visibility 확인 없음). 1,000행 페이징 `select=*` 전체 컬럼 245KB(gzip) 수신.
8. **접근성 잔여.** 타겟 크기 24px 미만 29개(예: 푸터류 `A` 22px 높이, `.card-off` 24px; `.pick`은 29px). 사진 출처 `.credit`이 `hidden`(`style.css:688`)이면 CC-BY 표기가 화면에서 사라질 수 있음 [assumed: 상세 서랍에서만 노출되는지 미확인]. 아이콘 글자 "湯" 대비 1.17(장식이면 aria-hidden 확인). 카드 제외 `aria-live` 영역 3개 이상 동시 존재(`i18n.js:329,352,413`)로 스크린리더 소음.

(CLS: 로컬 측정 0.019 / 0.008로 양호. `prefers-reduced-motion` 13개 파일에서 대응. 콘솔 에러 0건.)

## 3) 좋은 점
- CSP가 엄격(`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`)하고 DB 값은 수신 즉시 이스케이프+URL 스킴 검증(`db-loader.js:7-10`).
- `<dialog>`·`:focus-visible` 토큰·`lang` 속성·카드 이미지 `width/height/alt/loading=lazy/decoding=async`, `prefers-reduced-motion` 전반 적용.
- 폴링 변경 감지를 가벼운 2요청(최신 1행)으로 설계, 실패 시 로컬 폴백.

## 4) FIX PLAN
| # | 변경 | 파일 | 노력 | 회귀위험 |
|---|---|---|---|---|
| 1 | koshikano를 1200px 이하/<=250KB WebP로 재인코딩, `images/` 전체를 최대 1280px q75로 일괄 축소(sharp/squoosh 일회성 스크립트) | images/*, photo-assets.js | S | 낮음(파일명 유지 시 0) |
| 2 | 서랍 열림 시 `detail.focus()`(tabindex=-1 이미 있음), 열기 버튼 id 저장 후 닫을 때 해당 `.pick`으로 focus 복귀, `aria-expanded`를 render 후 동기화 | stack-list.js(syncDrawer), site.js(render 끝) | M | 중(render 재호출 루프 주의) |
| 3 | 일본어 폰트는 Klee One 제거 또는 `text=` 서브셋/자체 호스팅 woff2 1~2개, `font-display:swap` 유지; 핵심 JS 9개를 번들 1~2개로 연결(빌드 대신 `cat` 스크립트), data.js류는 폴백 시에만 동적 로드 | index/ja/en.html, db-loader.js, tools | L | 높음(로드 순서 의존, README 순서 준수) |
| 4 | `<noscript>` 안내 + 정적 h1/요약, 히어로는 로컬 `images/gunma.jpg`(224KB)로 preload해 외부 의존 제거 | *.html | S/M | 낮음 |
| 5 | canonical/hreflang 절대 URL, og:title/description/image, sitemap.xml, robots.txt | *.html, web/ | S | 낮음 |
| 6 | vercel.json에 `/(.*)\.(js|css)` `max-age=300,must-revalidate` 또는 `?v` 자동화(배포 스크립트가 sed로 한 번에 치환), `data.js`류에도 `?v` | vercel.json, html | S | 낮음 |
| 7 | 초기 poll 제거(첫 setInterval만), `document.hidden`이면 건너뜀, 목록은 필요한 컬럼만 select | db-loader.js | S | 낮음 |
| 8 | 보조 링크 `min-height:24px`+패딩, 장식 아이콘 aria-hidden, 사진 크레딧 항상 노출 위치 확인 | style.css/onchun.css | S | 낮음 |

## 5) 바꾸지 말 것
- CSP 정책과 DB 응답 이스케이프(`clean`/`safeUrl`)는 건드리지 말 것. `style-src 'unsafe-inline'`은 인라인 `--bg` 스타일 때문이므로 제거하려면 별도 작업.
- `<dialog>` 비교창, 카드 이미지의 lazy/width/height 속성, `unlisted=eq.false` 필터와 `listed-ids.js` 폴백 로직.
- html/db-loader `?v=` 일괄 교체 규칙은 자동화 전까지 유지(README 절차).
