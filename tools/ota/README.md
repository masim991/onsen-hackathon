# 예약 사이트(OTA) 참고가: Rakuten Travel

시설 공식 요금과 **섞지 않는** 별도 표(`ota_prices`)에만 저장한다. 공식 요금(`record.monitor.price`)을 덮어쓰지 않고, 사이트 표시는 아직 연결하지 않았다.

## 사용자가 해야 할 일 (계정 생성은 대신할 수 없음)
1. https://webservice.rakuten.co.jp/ 에서 무료 개발자 등록 후 **애플리케이션 ID**를 받는다. (공식 문서가 열리지 않던 시점에 작성했으므로 엔드포인트·필드명이 바뀌었다면 `RAKUTEN_ENDPOINT`로 바꾼다.)
2. 약관 원문을 읽고 확인한다: 크레딧 표기 문구, 가격 저장·캐시 허용 범위, 제휴(어필리에이트) 표시 의무. 이 사이트의 이용약관은 현재 "제휴 수수료 없음"으로 적혀 있다(`web/legal/terms*.html`).
3. GitHub 저장소 > Settings > Secrets > `RAKUTEN_APP_ID` 등록. (등록 전에는 워크플로 단계가 건너뛴다.)

## 동작
- 숙박 가능 + 공식 요금 없음 시설을 아직 확인하지 않은 순서로 실행당 40곳, 초당 1회 이하로 조회한다.
- 같은 도도부현 + 이름 정규화 후 상호 포함일 때만 일치로 본다. 일치하면 `hotelMinCharge`(최저요금), 시설 URL을 저장한다. 최저요금이 1인 기준인지 객실 기준인지는 공식 문서로 확인해야 한다(미확인). 확인 전에는 사이트에 금액으로 표시하지 않는다.
- 키/한도 오류(401/403/429)가 나면 그 실행은 중단한다.
- 로컬 검사: `node tools/ota/rakuten.mjs --selftest`. 시험 실행: `RAKUTEN_APP_ID=... SUPABASE_SERVICE_ROLE_KEY=... node tools/ota/rakuten.mjs --dry --limit 5`.
