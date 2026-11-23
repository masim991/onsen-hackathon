# 예약 사이트 가격 연동 조사 (OTA notes)

조사일 2026-11-21. 사이트 코드는 건드리지 않았고 계정/키도 만들지 않았다.

## 먼저 밝혀 둘 한계 (정직한 표기)
- 이번 조사에서 **Rakuten Web Service 공식 문서 페이지(webservice.rakuten.co.jp)는 두 번 모두 HTTP 503**으로 열리지 않았다. 아래 Rakuten 항목 중 "(미확인)"은 검색 결과 요약과 기억에 의존한 것이라 **가입 전에 공식 약관 원문으로 반드시 확인**해야 한다.
- Jalan(Recruit) API 상태는 검색에서 근거를 못 찾았다. "있다/없다"를 단정하지 않는다.
- Agoda, Booking.com은 공식 개발자 문서가 검색에 잡혀 요건을 확인했다. Trip.com 제휴 API는 근거를 못 찾았다(미확인).

## 결론 먼저
1. **페이지 스크래핑(크롤링)은 권장하지 않는다.** 각 OTA 약관이 자동 수집을 금지하는 것이 일반적이고, 차단/법적 리스크가 있으며, 가격은 날짜/인원 조건에 따라 달라 "최저가" 라고 쓰면 오인 소지가 크다. 서드파티 Apify류 "scraper API"도 같은 이유로 쓰지 않는다.
2. 합법 경로는 사실상 두 가지다: (a) **Rakuten Travel 공개 API**(무료 앱 ID 방식, 가장 현실적), (b) **OTA별 딥링크(검색 URL)만 거는 방식**(API 불필요, 가격 표시 없음).
3. Booking.com / Agoda / Trip.com API는 **제휴 계약 또는 승인(화이트리스트)이 필요**해서 개인/소규모 정적 사이트가 바로 쓰기 어렵다.
4. 권장 설계: **시설별로 `{fromPrice, ota, checkedAt, deepLink}`만 저장 + 출처 표기**. 불안하면 가격 없이 딥링크만.

## 서비스별 정리

| 서비스 | 합법 프로그램 경로 | 가져올 수 있는 데이터 | 요건 | 저장/표시 약관 | 한/일 시설명 검색 | 정적 사이트에 저장한 "from 가격" 표시 |
|---|---|---|---|---|---|---|
| **Rakuten Travel** (楽天ウェブサービス) | 있음. SimpleHotelSearch(hotelNo/좌표/지역), KeywordHotelSearch(키워드), VacantHotelSearch(날짜별 빈방/플랜) | 시설 기본정보에 **최저요금 `hotelMinCharge`**, 시설 URL, 플랜 목록 URL(아래 검색결과 요약은 간접 근거, 필드명은 공식 확인 필요). 빈방 검색은 날짜 지정 시 플랜별 요금 | 무료 개발자 등록 후 **앱 ID(applicationId)** (제휴 링크용 affiliateId는 선택). 2026년 이후 신규 엔드포인트/accessKey 방식으로 바뀌었을 가능성(미확인) | 크레딧 표기("Supported by Rakuten Developers" 취지, 비공식 출처 근거)와 약 1요청/초 제한이 있다는 정보(비공식). **캐시/저장 규정은 확인 못 함 -> 약관 원문 확인 필수** | KeywordHotelSearch로 일본어 시설명 키워드 가능(일본어 권장). 한글명은 비현실적, `jp` 값 사용 | 약관이 저장·재표시를 허용하는지 미확인. 허용 안 되면 "실시간 호출 또는 링크만". 허용되더라도 표기 필수 |
| **Jalan (Recruit)** | 근거 못 찾음. 과거 Recruit Web Service에 숙박 API가 있었으나 현재 제공 여부를 검색으로 확인 못 함(공개 중단 공지도 못 찾음) | - | - | - | - | 사용 불가로 간주. 딥링크만 |
| **Booking.com** | Demand API (Managed Affiliate Partner 전용). v3.1은 유지보수 모드, 3.2는 파일럿 파트너 한정 | 숙소 검색/가격/가용성 | **Managed Affiliate Partner 등록 + 계약, Partner Centre에서 API key와 X-Affiliate-Id** 발급(계정 매니저 경유) | 파트너 계약 조건 따름 | 도시/좌표/이름 검색 가능 | 계약 없이 불가. 개인 사이트 현실성 낮음 |
| **Agoda** | Affiliate/Search API(JSON), 파트너 한정 | 검색 가격 | 파트너 승인, **IP 화이트리스트** 필요(FAQ 취지) | 파트너 계약 | 도시/호텔 ID 위주(이름 검색은 제한적, 미확인) | 승인 전 불가 |
| **Trip.com** | 제휴 API 근거 못 찾음(미확인) | - | - | - | - | 딥링크만 |
| **Google Hotels** | 일반인용 가격 조회 API 없음. 가격 피드는 호텔/OTA 파트너가 Google에 공급하는 구조 | (공개 API 없음) | - | Google 결과 스크래핑은 약관 위반 소지 | 검색 URL로만 연결 | 가격 저장 불가. 링크만 |

## 추천 설계
**1순위 (안전, 지금 당장 가능): 딥링크만.** 시설별 OTA 링크 버튼(이미 사이트에는 `extra.js`의 `booking/trip/jalan/rakuten` URL 필드와 site.js 상세 서랍의 사이트 목록이 있다). 가격 문구 없이 "날짜를 정해 각 사이트에서 확인" 안내. 가격 오표시/약관 리스크 0.

**2순위 (Rakuten 약관이 허용할 때만): 최소 저장 모델.** 빌드 시점 또는 수동 스크립트로 Rakuten API를 호출해 시설당 아래만 `data/`에 저장한다.

```json
{ "id": "1128", "fromPrice": 12000, "currency": "JPY", "ota": "Rakuten Travel",
  "checkedAt": "2026-11-21", "deepLink": "https://travel.rakuten.co.jp/HOTEL/xxxxx/xxxxx.html",
  "basis": "1박 최저요금(날짜 조건 없음, 세금/인원은 상이)" }
```
- 화면 문구: "Rakuten Travel 기준 12,000엔~ (2026-11-21 확인). 실제 요금은 날짜/인원에 따라 다름" + 크레딧 표기 + 링크.
- `checkedAt`가 N일 지나면 가격을 숨기고 링크만 표시.
- 매칭은 시설명 문자열이 아니라 **hotelNo(시설 ID)를 한 번 사람이 확인해 고정**한다(같은 이름 다른 시설 오매칭 방지: `names/report.md`의 중복 이름 참조).
- 앱 ID는 서버/스크립트에만 두고 정적 사이트(클라이언트)에 넣지 않는다.

**하지 말 것:** HTML 스크래핑, 서드파티 scraper API, "최저가 보장" 표현, 여러 OTA 가격을 합쳐 "가장 싼 곳" 표시(조건 불일치).

## API 없이 만들 수 있는 딥링크 패턴
시설명은 일본어(`jp`)를 `encodeURIComponent`로 인코딩해서 쓴다. "안정성"은 URL 형식이 바뀔 위험 기준이다. **아래 패턴은 이번에 실제로 열어 검증하지 않았다.** 출시 전에 샘플 5건으로 직접 눌러 확인할 것.

| 목적 | URL 패턴 | 안정성 |
|---|---|---|
| Rakuten 시설 페이지(ID 알 때) | `https://travel.rakuten.co.jp/HOTEL/{hotelNo}/{hotelNo}.html` | **높음** (사이트 extra.js가 이미 이 형식 사용) |
| Jalan 시설 페이지(ID 알 때) | `https://www.jalan.net/yad{6자리ID}/` | **높음** (extra.js가 사용) |
| Booking 시설 페이지(slug 알 때) | `https://www.booking.com/hotel/jp/{slug}.ja.html` (언어 접미사 `.ko.html` `.en-gb.html`) | **높음** (extra.js가 `.ko.html` 사용) |
| Trip.com 시설 페이지 | `https://jp.trip.com/hotels/{경로}/` | 중간 (extra.js 사용, 경로는 시설별) |
| Booking 이름 검색 | `https://www.booking.com/searchresults.ja.html?ss={jp}&lang=ja` | 중간 (`ss` 파라미터는 널리 쓰이나 문서화 안 됨) |
| Google Hotels 검색 | `https://www.google.com/travel/hotels?q={jp}+宿泊&hl=ja&gl=jp&curr=JPY` | 중간 (`q` 사용 예는 서드파티 문서에서 확인, Google 공식 규격 아님) |
| Google 지도 검색(공식 URL 규격) | `https://www.google.com/maps/search/?api=1&query={jp}` | **높음** (Google Maps URLs 공식) |
| Rakuten 키워드 검색 | `https://travel.rakuten.co.jp/` 검색 URL은 형식을 확인 못 함 | 낮음 -> 권장 안 함, 시설 페이지 직링크 사용 |
| Jalan 키워드 검색 | 형식을 확인 못 함 | 낮음 -> 시설 ID 직링크 사용 |
| Agoda 검색 | 형식을 확인 못 함 | 낮음 |

원칙: **이름 검색 URL은 형식이 쉽게 바뀌므로, 가능하면 사람이 한 번 확인한 시설 페이지 직링크(ID/slug)를 저장**하고, 없는 시설에만 Google 지도/Booking 검색 링크를 폴백으로 쓴다. 제휴 링크(affiliate)를 쓸 경우 광고 표기 의무가 생긴다.

## 다음 단계 제안 (사람이 할 일)
1. Rakuten Web Service 약관/문서 원문 확인(저장·캐시·크레딧). 확인 전에는 가격 저장 금지.
2. 등록(앱 ID 발급)은 소유자가 직접.
3. 위 딥링크 패턴 샘플 검증.

## 출처
- Rakuten Web Service 문서 안내: https://webservice.rakuten.co.jp/document , https://webservice.rakuten.co.jp/documentation/keyword-hotel-search (이번 조사에서 본문은 503으로 못 읽음)
- Booking.com Demand API 전제조건: https://developers.booking.com/demand/docs/getting-started/prerequisites
- Agoda 개발자 문서: https://developer.agoda.com/demand/docs/json-search-api , FAQ https://developer.pps.agoda.com/docs/faq
- Google 호텔 링크 구조(파트너용): https://support.google.com/hotelprices/answer/9296693
