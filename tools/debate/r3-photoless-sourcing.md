# R3 사진 없는 시설: 데이터 출처/합법성/보안 (발언자: 소싱·법무·보안)

## 1) 결론 한 줄
합법·무료·CSP 변경 없이 쓸 수 있는 길은 사실상 "Wikimedia Commons(P18/좌표 근접) -> 사람이 검수 -> 로컬 이미지로 복사(self-host)" 한 가지뿐이고 적중률은 낮다(표본 10곳 중 0곳). 나머지 시설은 사진을 지어내지 말고 "사진 없음" 중립 카드로 두는 것이 안전하다.

## 2) 표본 조회 결과 (실측, 2026-11-21, 저속 0.8초 간격, 일반 UA, 개인정보 없음)
- 사진 없는 시설은 data.js 기준 39곳 중 10곳(전체 coords.json은 1011건, 사진 없는 비율은 별도 집계 필요). 이 10곳의 좌표 정밀도: facility 4, area 6(온천지 중심점일 뿐 시설 위치 아님).
- Wikidata 이름 검색(ja): 10곳 중 1곳만 항목 존재(板室温泉大黒屋 Q24874084), 그 항목도 P18 없음. P18 적중 0/10.
- Commons geosearch(반경 200m, facility 정밀도 4곳만): 4곳 모두 0건. area 좌표로는 검색 자체가 무의미(엉뚱한 사진 위험).
- 공식 사이트 og:image: 응답 9곳 중 이미지 URL이 나온 곳 5곳(일부는 상대경로/로고성 ogp.png). 즉 "기술적으로는 구할 수 있음"이나 법적으로는 쓸 수 없음(아래). 1곳 타임아웃.
- robots.txt: 404가 3곳, 200이 6곳. robots는 크롤링 규칙일 뿐 저작권 허락이 아님.
- Commons 텍스트 검색 추가 시도는 429(rate limit)로 중단. 대량 실행 시 반드시 UA에 연락처, 직렬 처리, maxlag 사용.
- 한계: 표본이 작고 무작위가 아님(앞 10곳). "낮다"는 방향성만 믿고 수치는 신뢰하지 말 것.

## 3) 후보별 평가
| 후보 | 라이선스/표기 | 적중률(추정) | CSP/SECURITY.md | 비용 | 노력 |
|---|---|---|---|---|---|
| Commons P18/좌표/카테고리 | CC BY/BY-SA/PD 등 파일별 상이, 저작자+라이선스+링크 필수. 파일 페이지에서 사람이 확인 | 유명 시설 20~30%, 소규모 료칸 <5% (표본 0/10) | 변경 없음(이미 허용 호스트). 로컬 복사 시 호스트 불필요 | 0원 | M |
| 공식 사이트 og:image 핫링크 | 저작권은 시설/촬영자 소유. og:image는 SNS 공유용이지 재배포 허락 아님. 핫링크도 복제/공중송신 이슈, 일본 저작권법상 허락 없는 이용 불가 | 기술적 ~50% | img-src에 임의 호스트 다수 추가 필요 = SECURITY.md의 "Wikimedia 외 불허" 방침 위반, 거부 | 0원 | - |
| 공식 사이트 사진 허락 받아 사용 | 서면/메일 허락 + 표기 문구 기록. 가장 깨끗함 | 회신률 낮음(추정 10~20%) | 로컬 복사하면 변경 없음 | 시간 | L |
| 관광청/지자체/DMO 오픈데이터 | 관광청 사이트 콘텐츠는 PDL1.0(CC BY 호환) 기본이나 로고 등 제외, 출처표기 필수. 지자체 포토뱅크는 대개 "관광 홍보 목적/신청 필요/크레딧 필수"로 이용조건 제각각(이번 검색에서 개별 약관은 미확인) | 시설 단위는 낮고 온천지 대표컷 위주 | 로컬 복사 시 변경 없음 | 0원 | M~L |
| Google Places 사진 | Places 콘텐츠는 사전 수집/캐시/저장 금지(place ID만 예외), 사진은 작성자 표기 필수, 키/과금 필요 | 높음(70%+) | googleusercontent 호스트 + API 키 노출(connect-src) 필요. 저장 불가라 로컬 복사도 불가 = 우리 구조와 충돌 | 유료(사진 SKU) | M | 
| 사용자 제출 + 검수 | 제출자에게 라이선스 동의(CC BY 이상) 필수, 제3자 사진/초상권/EXIF 위치 위험 | 해커톤 규모에선 거의 0 | 업로드 엔드포인트 신설 = 공격면 증가(파일 검증, 용량, 악성 콘텐츠, 신고 절차) | 인프라+운영 | L |
- 판정: Commons만 즉시 채택. 허락제(메일)와 지자체 오픈데이터는 사람이 하는 보조 경로. og:image 핫링크, Google Places, 사용자 업로드는 이번 범위에서 거부.

## 4) 제안 파이프라인 (코드 수정 없이 tools/ 신규 스크립트만)
1. `tools/photos/find-commons.mjs`: 입력 `web/data/coords.json` + 시설 목록(사진 없는 id). 시설별로 (a) Wikidata `wbsearchentities`(ja) -> 후보 QID가 일본 소재이고 온천/숙박 계열(P31)이며 P625가 coords와 1km 이내일 때만 P18 채택, (b) coords.precision==='facility'인 경우만 Commons geosearch 200m. area/prefecture 정밀도는 건너뜀(엉뚱한 사진 방지). 이름 하나만 일치하면 채택하지 않는다.
2. 호출 규칙: 직렬, 1초 간격, maxlag=5, UA `onsen-compare/0.1 (연락처 URL)`, 429 시 지수 백오프, 결과 캐시 `tools/photos/cache/`.
3. 출력 `tools/photos/candidates.json`(검수 전) 항목 형식: `{ id, jp, source:"commons-p18|commons-geo", file:"File:...", pageUrl, thumbUrl, license:"CC BY-SA 4.0", author, attributionText, matchEvidence:{qid,distanceM}, status:"pending" }`.
4. 사람 검수 게이트: 검수자가 파일 페이지를 열어 (1) 실제 해당 시설인지 (2) 라이선스가 CC BY/BY-SA/CC0/PD인지(NC/ND/불명 제외) (3) 사람 얼굴/타 상표 과다 여부를 확인하고 `status:"approved"`와 `reviewedBy/reviewedAt`을 기입. approved만 다음 단계로.
5. `tools/photos/apply.mjs`: approved 항목을 `web/images/commons-added-<hash>.jpg`로 다운로드(리사이즈, EXIF 제거, 크기 상한), photo-assets.js 형식과 동일한 매핑과 출처/라이선스 문자열을 만들어 출력(직접 덮어쓰지 않고 diff로 제시). sources.html의 출처 목록에 저작자/라이선스가 노출되는지 확인.
6. 로컬 복사 방식이므로 CSP/db-loader의 호스트 화이트리스트는 그대로(변경 0줄). 기존 방침(SECURITY.md: 원격 핫링크보다 로컬/라이선스 Wikimedia)과 일치.
7. 별도 트랙: 공식 사이트 허락 메일 템플릿(`tools/photos/permission-template.md`)과 회신 로그 `permissions.json{id,grantedBy,date,terms,file}`; 서면 확인 전엔 사용 금지.

## 5) 사진이 없을 때의 안전한 대체
- 지어낸 사진, 같은 온천지의 다른 시설 사진, 스톡/AI 이미지 금지(오인 유발, "추정 데이터 금지" 정책과 충돌).
- 중립 플레이스홀더: 시설명 이니셜이 아닌 단색 카드 + "공식 사진 없음" 문구, `alt`는 시설명+"사진 없음". 사진 대신 "공식 사이트에서 사진 보기" 외부 링크(hp)를 제공(링크는 복제가 아니므로 합법, 이미 hp 필드 존재).
- 지도는 이미 허용된 GSI 타일 사용. facility 정밀도일 때만 위치 핀, area는 "온천지 대략 위치" 라벨.
- 온천지 단위 대표 사진은 "이 시설 사진이 아님" 캡션을 붙일 때만 허용(권장하지 않음).

## 6) 하지 말아야 할 것
- og:image/공식 사이트/Google 사진을 hotlink하거나 img-src에 호스트 추가. (SECURITY.md 4행 근거, 방침 위반)
- area/prefecture 좌표로 Commons 근접 검색하고 자동 채택. 이름만 같은 항목 자동 채택.
- 라이선스 불명/NC/ND 사진, 저작자 표기 누락, 검수 없는 자동 적용.
- 해커톤 기간에 사용자 업로드 기능 신설, Places API 키를 클라이언트에 노출.
- Wikimedia API에 병렬/무UA 호출(이번에 이미 429를 받음).
