# 라쿠텐 트래블 참고가

라쿠텐 트래블 결과는 `ota_prices`에 저장합니다. 이용자 화면의 시설 공식 요금은 기존 데이터에서 읽습니다.

1. [라쿠텐 웹서비스](https://webservice.rakuten.co.jp/)에서 App ID와 Access Key를 준비합니다.
2. [키워드 검색 API](https://webservice.rakuten.co.jp/documentation/keyword-hotel-search)의 정책에서 저장·갱신·표시 조건을 확인합니다.
3. GitHub 저장소의 Actions Secrets에 `RAKUTEN_APP_ID`와 `RAKUTEN_ACCESS_KEY`를 등록합니다. 기존 `SUPABASE_SERVICE_ROLE_KEY`는 쓰기에 필요합니다.
4. 환경변수로 인증값을 설정한 뒤 `node tools/ota/rakuten.mjs --probe "旅館壱の井"`로 한 곳을 조회합니다. 이 명령에는 Supabase 키가 필요 없고, 검색 결과 건수만 출력합니다.

워크플로는 조건에 맞는 시설을 조회하고, 도도부현과 정규화한 시설명이 일치하는 결과가 하나일 때만 참고가를 기록합니다. `hotelMinCharge`는 객실 1실·1박 기준의 최저가 참고값입니다. 인증 오류·호출 제한은 라쿠텐 단계의 실패로 표시합니다.

모의 응답 검사: `node tools/ota/rakuten.mjs --selftest`.
