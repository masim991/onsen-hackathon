# 사진·가격 모두 없는 시설 정리 후보 보고서 (2026-11-23)

DB 변경 없음(SELECT/REST 읽기만). 스냅샷: tools/cleanup/db-snapshot/*.json

## 1. 숫자 요약
- 전체 시설 2729
- 사진 없음 AND 가격 없음 (N): **2252** (전체의 83%)
- 추가 조사 후 새 가격: 0건 / 새 사진 후보: 3건 (Commons 조사 150/2252건 완료)
- 조사 후 N': **2249** (이 중 Commons 미조사 2102건 포함)

## 2. N 구성 (조사 전)
- kind: ryokan 991, hotel 514, day_onsen 336, unknown 275, public_bath 136
- 숙박(stay): y 1443, u 643, n 166 (y=可, n=不可/否, u=미상)
- 공식 URL: 없음 1316, 있음 936
- 도도부현 상위: 長野県 154, 北海道 122, 群馬県 121, 大分県 118, 栃木県 97, 静岡県 88, 兵庫県 80, 熊本県 77, 鹿児島県 76, 福島県 71

## 3. N' 구성 (조사 후)
- kind: ryokan 988, hotel 514, day_onsen 336, unknown 275, public_bath 136
- 숙박: y 1440, u 643, n 166
- 공식 URL: 없음 1316, 있음 933
- 도도부현: 長野県 154, 北海道 122, 群馬県 121, 大分県 118, 栃木県 97, 静岡県 88, 兵庫県 80, 熊本県 77, 鹿児島県 76, 福島県 69, 和歌山県 69, 神奈川県 68, 新潟県 67, 鳥取県 67, 山口県 63, 岩手県 62, 山形県 61, 石川県 54, 宮城県 50, 青森県 48, 岐阜県 46, 島根県 40, 山梨県 38, 宮崎県 34, 福井県 32, 長崎県 32, 徳島県 32, 広島県 31, 香川県 31, 三重県 31, 奈良県 31, 福岡県 29, 高知県 29, 京都府 27, 茨城県 25, 岡山県 24, 秋田県 23, 佐賀県 21, 愛知県 14, 富山県 14, 沖縄県 12, 千葉県 11, 大阪府 10, 東京都 8, 滋賀県 6, 埼玉県 4, 愛媛県 3

## 4. 사이트 기본 목록 영향 (kind=ryokan, stay 不可 아님)
- 기본 목록 전체: 1146건 (stay=可만: 1,015)
- N'에 속해 사라질 것: **987건** (stay=可 기준 863건)

## 5. 삭제 시 참조/연쇄 (N' 기준)
FK ON DELETE CASCADE: facility_changes, facility_notices, monitor_jobs, monitor_targets, onsen_photos, photo_assets. onsen_source_candidates는 FK 없음(data JSON 안의 id만 남아 고아가 됨).
| 테이블 | N' 중 참조 시설 수 |
|---|---|
| monitor_targets | 6 |
| photo_assets | 6 |
| facility_changes | 1 |
| facility_notices | 1 |
| source_candidates_merged_backup_keep_id | 13 |
| source_candidates_photo_rights_facility_id | 0 |
- 모니터링 중(monitor_targets)인 N' 시설은 삭제 금지 권장: 가격을 곧 수집할 수 있고 photo_assets/공지도 같이 사라진다.
- onsen_photos는 N 정의상 없음(공유/지역 사진만 있는 시설은 있을 수 있음 → 삭제 시 함께 지워짐).

## 6. 권장 제거 방법
1. onsen_facilities(+참조 6개 테이블) 전체를 JSON으로 백업(이미 읽기 전용 스냅샷 존재, 삭제 직전 재생성).
2. 하드 삭제 대신 소프트 숨김: onsen_facilities에 boolean unlisted(기본 false) 추가, N' id만 true, db-loader 쿼리에 unlisted=eq.false 조건. 되돌리기 쉽고 CASCADE 없음.
3. 하드 삭제가 꼭 필요하면: 백업 -> 아카이브 테이블 복사 -> 삭제, 참조 시설(위 표)은 제외.
4. 제거 후 기본 목록 건수·지도·검색 확인, ?v= 올리기.

## 7. 2차 조사 상태 (미완료 부분 명시)
- 가격: N 중 공식 URL 936건. 기존 조사 800건 정상(후보 없음 포함), 실패 80건(접속불가 65, robots 13, blocked 2), 미실행 56건(stay 不可라 price-finder 대상 제외). 접속불가 65건 재시도 -> 1건만 접속, 새 가격 후보 0건. robots/blocked 15건은 규칙상 재시도 안 함. apply.mjs 미실행(반영할 high 후보 없음), prices.json 변경 없음(백업 backup/).
- 사진: Commons API(1.5초 간격, 429 백오프) 응답이 느려 분당 약 6건. ryokan 우선으로 150/2252건만 조사하고 중단. 새 후보 3건(photo-candidates.json; 大和屋本店 3파일은 식료품점 사진일 수 있어 눈으로 확인 필요). 이어서: node tools/cleanup/commons-search.mjs (cache 이어서 실행, 약 5시간).
- 따라서 N' 2,249건 중 사진 미조사 2,102건. 일본어 시설명 정확 일치만 인정하므로 로마자 파일명(예: Kusatsu_Onsen_Osakaya)은 못 찾는다 -> 재현율 낮음.
- 집계에서 빠진 것: web/extra.js 등 로컬 오버라이드 가격(EXTRA dayPrice), 기본 목록 정의 차이(1,015는 stay=可, 코드 기준은 不可 제외 1,146).
