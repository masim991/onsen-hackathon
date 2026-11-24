# R5 SEO/신뢰/법적 리스크 평가

## 1) 점수: 발견성 2/10, 신뢰 5/10 (종합 3.5)
시설 486곳이 전부 JS가 그린 한 장짜리 앱 안에 있다. 검색엔진에 노출되는 URL은 3개(ko/ja/en 홈)뿐이고, 시설 단위 페이지가 없다. 지금 상태로는 "온천 이름 + 요금" 같은 롱테일 검색에서 유입이 거의 0일 것이다. 신뢰 쪽은 면책과 출처 표기는 꽤 하는데 공개 창구가 비어 있다.

## 2) 문제 Top 8 (심각도 순)
1. **시설별 URL이 없다.** 딥링크는 `#facility-ID`(site.js:637)와 쿼리뿐이다. 해시는 색인되지 않고 `index.html`은 `<body>`에 script만 있다(index.html:25-40). Googlebot이 JS를 실행해도 DB(Supabase) 비동기 렌더라 본문이 비어 보일 수 있다. 영향: 유입 상한이 사실상 홈 3페이지. 위험: 높음.
2. **robots.txt, sitemap.xml이 없다**(web/ 목록 확인). vercel.json에 rewrites도 없다. 영향: 크롤 신호 전무. 위험: 중.
3. **canonical과 hreflang이 상대경로이고 절대 URL이 아니다**(index.html:14-15 `href="index.html"`). Google은 hreflang/canonical에 절대 URL을 요구한다. 지금 상태면 무시될 가능성이 크다. ja/en의 x-default 짝도 잘못 물릴 수 있다. 위험: 중상.
4. **OG/Twitter 메타, JSON-LD 전무**(grep 0건). 공유 카드가 비고, 리치 결과 자격이 없다. 시설 단위가 없으니 LodgingBusiness/Place 스키마를 붙일 곳도 없다. 한국어 홈 title/description도 짧고 일반적이다. 위험: 중.
5. **연락처가 "정식 공개 전이라 준비 중"이다**(footer.js:15). 푸터에는 "해커톤 기획 초안"(footer.js:11)이 남아 있다. 일본 특정상거래법 표기 대상은 아니지만, 정정·삭제 요청 창구가 없으면 사진 저작자와 시설의 권리 침해 통지를 받을 곳이 없다. 이는 사진 라이선스 리스크와 직결된다. 약관, 개인정보, 문의가 URL 없이 모달 버튼이라 검색엔진, 광고 심사, 링크 공유에 모두 불리하다. 위험: 높음.
6. **사진 라이선스 증빙이 부분적이다.** `photo-assets.js`는 로컬 파일 매핑뿐이고(상단 주석: Commons 원본별 확인), 라이선스 값은 `shot[2]` 문자열 정규식에 의존한다(site.js:108). 매칭 안 되는 값은 링크 없는 텍스트가 된다. `shot[3].credit` 경로(시설 자체 사진, 지자체 사진)는 허락/약관 증빙이 코드에서 보이지 않는다. CC BY-SA 사진은 2차 가공(리사이즈)에 같은 조건 표기가 필요하고, "원본 링크 + 라이선스 링크 + 저작자"가 서랍에서만 보인다. 카드/OG 이미지에는 표기가 없다. 위험: 중상 (게다가 1번 때문에 이미지 검색 노출은 막힘). `<link rel=preload>`로 Wikimedia 핫링크를 쓰는 것(index.html:16)은 Wikimedia 이용 정책상 대량 트래픽에서 차단될 수 있다.
7. **가격 신선도 표시는 있으나 면책이 약하다.** 가격에 확인일과 출처 링크, 90일 초과 "오래된 가격" 처리(README)는 좋다. 그러나 약관의 면책은 "참고용" 한 줄이고(footer.js:13), 환율 환산 가격에 "환산액은 참고, 결제는 엔화" 표시가 있는지 확인되지 않았다. 관광협회 출처 `assoc`는 평균에서 빠지지만 목록에는 개별가로 나간다(prices.json). 일본 쪽 리스크: 표시가 경품표시법상 "광고"로 읽힐 수 있는 건 예약 링크 수익화를 시작할 때부터다. 위험: 중.
8. **번역 품질과 개인정보 문구.** ja 타이틀이 "温泉を求めて"(ja.html:7)로 ko/en과 의미가 다르고, en의 "Onsen at a Glance"는 브랜드 로마자 표기가 일관되지 않다. 개인정보 처리방침은 외부 전송(Supabase, Google Fonts, jsDelivr, 환율 API)을 열거해 투명성은 괜찮다(footer.js:14). 다만 한국어 PIPA의 국외이전 고지, 일본 APPI 외국 제3자 제공 고지 형식은 갖추지 못했다. 단, 개인정보를 수집하지 않으므로 위험은 낮음. 제휴 링크가 생기면 광고 표기가 필수다. 지금 Booking/Trip/Jalan/Rakuten 링크(site.js:446)는 `rel="noopener"`뿐이고 `sponsored`가 없다. 제휴 ID를 붙이는 순간 위반이다.

## 3) 잘한 것
- 보안 헤더와 CSP, 외부 링크 `noopener noreferrer`, admin noindex 분리.
- 가격에 확인일, 출처, 공식 사이트 한정, 오래된 가격 숨김 규칙이 있고 데이터가 정직하다(unlisted 처리로 사진/가격 없는 2,243건을 숨긴 판단도 맞다).
- 사진 서랍에 저작자/원본/라이선스 링크 표기가 있고, 로컬 사본이 있어 Commons 변경에 견딘다.

## 4) FIX PLAN
| # | 변경 | 파일 | 노력 | 위험 |
|---|---|---|---|---|
| 1 | 빌드 스크립트(Node)로 시설별 정적 HTML 생성: `/ko/f/{id}.html` 등. title, description, 가격/확인일/출처, 사진+표기, JSON-LD를 서버 쪽에 박고, 클라이언트 앱은 그대로 두고 "지도에서 보기" 링크만 연결. 우선 사진+가격 있는 상위 100곳부터 | `tools/` 새 스크립트, `vercel.json` outputDirectory | L | 중(DB와 값 불일치 주의: 같은 소스에서 생성) |
| 2 | robots.txt(`Disallow: /admin/`, Sitemap 줄), sitemap.xml(hreflang 포함, 시설 페이지 포함) | `web/robots.txt`, `web/sitemap.xml` | S | 낮음 |
| 3 | canonical/hreflang 절대 URL화(도메인 확정 후), x-default 재검토 | 3개 html + guide/water 6개 | S | 낮음 |
| 4 | OG/Twitter 메타, 홈 3개 title/description 언어별 다듬기, WebSite/Organization JSON-LD | 3개 html | S | 낮음 |
| 5 | 연락처 실제 이메일 게시(공개 전에 반드시), "해커톤 기획 초안" 제거, terms/privacy/contact를 독립 URL 페이지로 분리하고 푸터에 링크 | `footer.js`, 새 html 3~9개 | M | 낮음 |
| 6 | 사진 레코드마다 {저자, 라이선스, 원본URL} 필수 필드화, 누락 검사를 `tools/security/check.mjs`에 추가, `shot[3]` 계열은 허락 근거 메모 보관. preload의 핫링크는 로컬 사본으로 교체 | `photo-assets.js`, `tools/photos`, index.html:16 | M | 중(누락 사진은 숨기는 쪽으로) |
| 7 | 가격 옆에 "요금은 변동, 출처 확인일 기준, 엔화 결제" 한 줄 상시 표시, 환산액은 "약" 표기, 약관 면책 구체화(ja/en 포함) | `i18n.js`, `site.js`, `footer.js` | S | 낮음 |
| 8 | 제휴 도입 시: 해당 링크에 `rel="sponsored noopener"`, 근처에 "광고/제휴 링크" 표기, 개인정보 방침에 쿠키/국외이전 항목 추가. ja title은 "温泉ひとめぐり" 계열로 의미 통일 | `site.js:446`, `footer.js`, ja.html | S | 낮음 |

우선순위: 5 -> 2,3,4 -> 7 -> 6 -> 1 -> 8(제휴 시작 전). 5번 없이 공개하면 안 된다.

## 5) 바꾸지 말 것
- 가격 안전 규칙(공식 사이트 한정, 90일/360일 숨김, 숙박 vs 당일 분리)과 unlisted 처리. 이게 신뢰의 핵심이다.
- CSP/보안 헤더와 admin noindex. SEO 때문에 완화하지 말 것.
- 기존 SPA 앱 자체(site.js)를 SSR 프레임워크로 갈아엎지 말 것. 정적 시설 페이지를 곁들이는 쪽이 싸고 안전하다.
- 가격 데이터를 시설 페이지에 "추정/평균"으로 부풀려 넣지 말 것(thin/오해 소지 콘텐츠).

가정 [assumed]: 배포 도메인 미확정, 특정상거래법/경품표시법/PIPA/APPI 해석은 법률 자문이 아니다. 브라우저 실측은 하지 않고 소스 정독으로만 판단했다.
