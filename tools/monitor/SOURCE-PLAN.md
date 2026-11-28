# 온천·료칸 공개 검증 자료

2026-11-28 조사. DB 2,729개 시설을 검증 대상으로 두고 공식 URL이 있는 비공개 시설 927개부터 검토한다. 시설 등록, 온천 이용 허가, 최근 운영 상태를 별도 근거로 확인한다.

| 출처 | 적용 범위 |
| --- | --- |
| [관광청 등록 료칸](https://www.mlit.go.jp/kankocho/content/002025314.pdf), [등록 호텔](https://www.mlit.go.jp/kankocho/content/002025313.pdf), [등록 변경 공시](https://www.mlit.go.jp/kankocho/seisaku_seido/kokusaikankohotel/index.html) | 2026-11-02 기준 료칸 1,357건과 호텔 925건. 등록 번호, 이름, 주소, 전화, 기재된 URL로 동일 시설과 운영자 사이트 후보를 확인한다. 등록 말소는 재검토 신호다. |
| [오사카시 온천 이용 허가](https://www.city.osaka.lg.jp/kenko/page/0000487687.html), [오사카부](https://www.pref.osaka.lg.jp/o100090/kankyoeisei/onsen/onsenriyou.html), [하마마쓰시](https://www.city.hamamatsu.shizuoka.jp/odpf/opendata/v1.html?x=onsenriyoukyoka), [아이치현](https://www.pref.aichi.jp/soshiki/shizen/onsen.html), [후쿠오카현](https://www.pref.fukuoka.lg.jp/contents/onsenriyou.html) | 온천 이용 허가를 확인한다. 관할과 자료 기준일을 기록한다. 오사카시의 2026년 3월 말 CSV는 66행, CC BY 4.0이다. 오사카부 자료에서 빠진 지정시·중핵시는 각 시청 자료를 확인한다. |
| [오사카시 여관업 허가](https://www.city.osaka.lg.jp/kenko/page/0000382418.html), [e-Gov 검색 API](https://data.e-gov.go.jp/data/ja/api_guide), [디지털청 데이터 표준](https://www.digital.go.jp/resources/data_dataset) | 여관업 허가와 분류를 확인하고, 지자체별 원본을 찾거나 필드 이름을 맞추는 데 쓴다. 온천 이용 허가는 위의 별도 목록을 확인한다. |
| 시설 또는 지자체 운영자 원문. 예시 [벳푸시 다케가와라 온천](https://www.city.beppu.oita.jp/sisetu/shieionsen/detail4.html), [벳푸시 입욕료 개정표](https://www.city.beppu.oita.jp/doc/sangyou/onsen/ryokin_kaitei.pdf), [환경성 온천법 안내](https://www.env.go.jp/nature/onsen/outline/index.html) | 운영 상태·휴업·입욕 시간·시설별 요금과 온천 분석표의 근거로 쓴다. 다케가와라 사례처럼 일반욕과 모래찜질의 가격·영업시간·최종 접수를 각각 기록한다. 같은 운영자라도 다른 지점의 분석표를 합치지 않는다. |
| [라쿠텐 트래블 숙소 검색](https://webservice.rakuten.co.jp/documentation/keyword-hotel-search), [공실 검색](https://webservice.rakuten.co.jp/documentation/vacant-hotel-search), [이용 조건](https://webservice.rakuten.co.jp/guide/rule) | 시설 번호, 주소와 이름을 보조 대조한다. App ID와 Access Key가 필요하다. 검색 최저가는 객실 1실·1박의 OTA 참고가로 분리한다. 프로젝트의 실인증과 저장·표시 범위 확인을 마친 뒤 사용한다. |
| [Jalan 공식 공지](https://www.jalan.net/jw/jwp0000/jww0001.do), [Booking.com Demand API](https://developers.booking.com/demand/docs/getting-started/prerequisites), [Expedia Rapid](https://developers.expediagroup.com/rapid/lodging?locale=en_US) | Jalan은 온천·공실 API 문서를 제공하지만 2020-02-25 신규 계정 접수를 종료했다. Booking.com과 Expedia는 제휴 요건을 확인해야 하므로 1차 수집 경로에서 제외한다. |
| [Wikimedia Commons 파일별 이용 안내](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en), [크레딧 및 메타데이터](https://commons.wikimedia.org/wiki/Commons:Credit_line) | 실제 시설과 사진이 일치하고 이용 조건이 확인된 사진만 후보로 넣는다. 원본, 촬영자, 라이선스, 편집 여부를 기록한다. 운영자 사진은 허용 범위가 확인된 경우에 사용한다. |

## 검토 기록과 배치 순서

1. 기존 프로젝트의 오사카시·하마마쓰시 허가 후보와 과거 관광청 후보를 참고한다. 2018년 관광청 후보는 최신 명단과 대조하며, 목록의 등록 건수를 프로젝트 매칭 건수로 사용하지 않는다.
2. 기존 시설 ID를 유지한다. 시설명과 주소를 우선 대조하고 등록 번호·전화·운영자 URL로 보강한다. 주소 충돌, 지점 구분, 이전·개명·폐업은 관리자에게 넘긴다.
3. 모니터 검토 후보에는 항목별 원문 URL, 제공기관, 자료 기준일·조회일, 근거, 매칭 상태를 기록한다. 행정 자료의 허가는 운영자가 확인한 현재 영업 상태와 별도로 다룬다. 공지에는 적용일과 종료일, 가격에는 숙박·입욕 구분과 단위를 기록한다. 사진은 공개 승인 후 사이트 카탈로그에 연결한다.
4. 조회·스냅샷 확장과 승인 사진 연결 검증 후 20곳을 시범 점검한다. 독립적으로 시설 정체성과 현재 운영이 확인된 곳만 공개한다. 사진·가격·성분이 확인되지 않으면 해당 항목을 미확인으로 둔다. 시범 배치에서 일치·검토·보류율과 소요 시간을 재고 이후 공식 URL이 있는 927곳으로 확대한다.

### 배치 공개 기준

- 시설 이름과 전체 주소를 대조하고, 운영자 URL·등록번호·전화번호 중 추가 식별 근거를 확인한다. 홍보 자료만 있거나 온천수 제공 중단, 휴업, 중복, 주소 충돌이 있으면 비공개 상태에서 검토한다.
- 공개하지 않은 후보를 새로 적재할 때는 `unlisted=true`를 명시한다. 심사 메모와 보류 사유는 공개 카탈로그에 쓰지 않는다. 공개 행에는 사이트에 필요한 정보와 공개 가능한 출처만 기록한다.
- 배치별 승인 ID와 기존 공개 상태를 기록한다. 공개 직전 해당 ID와 기존 URL이 검토 시점과 일치하는지 확인한다. 반영 후 익명 카탈로그에서 시설 수와 ID, 보류 시설의 미노출, 사이트 화면을 확인한다.
- 잘못 공개한 시설은 ID 단위로 다시 숨긴다. 해당 시설이 정적 스냅샷에 들어갔다면 스냅샷도 갱신하고 배포된 파일에서 제외됐는지 확인한다.
