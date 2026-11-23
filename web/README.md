# 온천 한눈에 - 구조 안내

빌드 없는 정적 사이트. `npx serve -l 5188 -c serve.json web` 로 확인한다. 배포 헤더는 `../vercel.json`, 로컬 헤더는 `serve.json` (CSP는 모든 html의 meta, 두 json, `tools/security/csp.txt`가 같아야 하며 `node tools/security/check.mjs`가 검사).

## 파일 지도 (역할별)
- 셸 페이지: `index.html`(ko) `ja.html` `en.html` - 스크립트/CSS 목록만 있는 빈 껍데기. 본문은 JS가 그린다.
- 안내 페이지: `guide*.html` `water*.html` (`page.js` + `page.css`), `sources.html` (`sources.js` + `sources.css`)
- 데이터 층
  - `data.js`(RAW 시설), `extra.js` `additional.js` `survey.js` `ryokan-*.js` `photo-assets.js` `prefectures.js` : 로컬 기본 데이터(전역 변수)
  - `data/*.json` : 도구가 쓰는 산출물(coords, fx, source-status, prices, price-stats). 손으로 고치지 않는다. `prices.json`은 공식 사이트 "〜" 가격(`tools/prices/apply.mjs`가 `assoc` 표시 포함해 생성; 관광협회 등 시설 자체 사이트가 아닌 출처는 `assoc:true`로 표시·평균에서 제외), `price-stats.json`은 도도부현별 1박2식 중앙값(시설 자체 사이트 가격만, n>=5일 때만 서랍의 별도 참고 줄로 표시).
  - 손으로 편집하는 보조 JSON(db-loader가 DB 적용 직후 같은 출처에서 병렬로 받고, 실패해도 무시): `names-fix.json` {id:{n}} = 한국어 이름만 교정, `overrides.json` {id:{"hp":null}} = 해당 시설의 공식 사이트 주소를 비운다(탈취된 도메인 등. 예: 아키타 구로유 `official-akita-36630d4b`). Supabase는 건드리지 않는다.
  - `db-loader.js` : Supabase에서 시설/사진을 받아 RAW에 덮어쓴 뒤 렌더러 스크립트를 순서대로 로드. 실패하면 로컬 데이터 사용.
  - `locale-ja-data.js` `locale-en-data.js` : 시설 설명 번역표 (db-loader가 언어에 맞게 동적 로드)
- 문구: `i18n-data.js`(문구 사전) `i18n.js`(언어별 템플릿/문구) `facility-translations.js`(시설 번역 적용)
- 렌더러: `site.js`(필터, 검색, 카드, 상세 서랍, 즐겨찾기, 환율 표시) `stack-list.js`(목록 쌓기/페이저) `map.js`(Leaflet 지도) `hires.js`(고해상도 사진 교체)
- UI 레이어: `intro.js/css`(인트로, `?nointro`로 생략) `cover.js/css` `cover-upgrade.css`(히어로) `language.js/css`(언어 전환) `footer.js/css` `motion.js/css`(등장 효과)
- 스타일 순서(뒤가 앞을 덮는다): `style.css`(기본) -> `map.css` -> `language.css` -> `motion.css` -> `cover-upgrade.css` -> `intro.css` -> `theme.css` -> `onchun.css` -> `cover.css` -> `stack.css` -> `footer.css`. 안내 페이지는 `page.css`가 추가.
- `vendor/` : Leaflet, 일본 지도 데이터. `images/` : 로컬 사진.
- `../tools/` : `geocode`(좌표), `tracker`(출처 점검), `fx`(환율), `security/check.mjs`(보안 검사), `export-catalog.mjs`(DB 업로드용 카탈로그). `../_removed/` : 정리하며 뺀 파일(복구용).

## 로드 순서 (셸 페이지)
1. `<head>`: CSS 위 순서, `intro.js`
2. body(defer): data.js -> photo-assets -> extra -> additional -> survey -> prefectures -> ryokan-* -> leaflet -> i18n-data -> facility-translations -> i18n.js -> cover.js -> db-loader.js
3. db-loader: Supabase 카탈로그 적용(+ 번역표 병렬) -> `site.js` -> `map.js` -> `language.js` -> `stack-list.js` -> `hires.js` -> `footer.js` -> `motion.js` (순서대로 실행)

## 어디를 고치나
- 시설 정보/가격/사진: Supabase DB(`tools/export-catalog.mjs`로 올림). 로컬 기본값은 `data.js` 등.
- 화면 문구: `i18n.js` / `i18n-data.js`. 시설 설명 번역: `locale-*-data.js`
- 카드/상세/필터 동작: `site.js`. 목록 배치/페이지 넘김: `stack-list.js` + `stack.css`
- 색, 글꼴, 크기: `theme.css`(최종 토큰), 레이아웃 기본은 `style.css`
- 히어로/인트로: `cover*.css`, `intro.*`. 푸터: `footer.*`. 안내/온천수 페이지: `page.js` + `page.css`
- 캐시 갱신: html과 `db-loader.js`의 `?v=` 값을 한꺼번에 올린다 (현재 20270103: 점검 시각 KST·대기 표시, 언어 전환 빈 칸(html 스크롤 강제 제거), 당일 입욕 가격 분리 표시; 20270102: 공식 가격 64→50건 정정 반영). 새 파일: `theme-init.js`(head 동기 실행, 다크 모드 data-theme 적용·버튼 생성), `dark.css`(다크 토큰·밝은 하드코딩 색 덮어쓰기, 항상 마지막 CSS).

## 공식 공지 표시와 변경 반영 (db-loader.js + site.js)
- 승인된(`published`) `facility_notices`만 익명으로 읽힌다(RLS). 시설·사진과 병렬로 받고 실패해도 무시. 상세 서랍에만 '공식 공지' 구역이 그려지며(`noticeHtml`), 공지가 없으면 화면은 그대로다. 문구: `i18n.js`의 `offNotice`(ko/ja/en).
- 변경 반영은 Realtime 대신 **폴링**: 페이지가 열려 있는 동안 60초마다(그리고 탭이 다시 보일 때) `facility_notices`(최신 승인 공지 1건)와 `onsen_facilities`(최신 `updated_at` 1건) 두 가벼운 REST 요청만 보낸다. 시각이 바뀐 경우에만 바뀐 행을 다시 받아 `onsenRefresh()`로 제자리에서 다시 그린다(서랍 스크롤·필터·페이지 유지).
- 폴링을 고른 이유: Realtime은 `wss://` 호스트를 CSP connect-src에 추가하고 클라이언트 라이브러리(또는 직접 구현한 프로토콜)가 필요하다. 지금은 새 호스트·라이브러리 없이 CSP를 그대로 둔다. Realtime은 **나중에** 검토(필요 시 connect-src에 `wss://frncsllpkxrsgxyqsfwd.supabase.co` + 테이블 publication/RLS 설정).
- 알려진 한계: 공지는 최신 1건만 비교하므로 오래된 공지의 공개/비공개 전환은 새로고침 때 반영된다. 워커가 `record`를 바꿀 때는 `updated_at`을 올려야 한다(`monitor_apply_record`가 한다, migration 002).
- 모니터링 값 표시(`site.js` `monitorPrice/monitorHours`, migration 003이 쓴 `record.monitor.price|hours`): 원본 DB 가격(`stayPricePerPerson`)이 있으면 쓰지 않고, 없을 때만 `data/prices.json` 가격과 확인일이 더 새로운 쪽을 고른다. 시설 자신의 공식 사이트 https 출처만, 90일 초과 '오래된 가격', 360일 초과 숨김, 1실 단위 가격은 숨김, 식사 기준을 모르면 '기준 미표시'. 출처 문구는 '공식 사이트(모니터링) · 확인일'. 시간은 상세 서랍 '시설 정보'에 원본 시간과 별도 줄(확인일·출처 링크, 환율 없음)로만 표시. `record.monitor`가 없으면 화면은 그대로. `db-loader.js`는 되돌림으로 키가 사라지면 이전 값도 지운다.
- 관리자 화면 `admin/monitor.html`: 공개 사이트에서 링크하지 않고 noindex, 별도 CSS/JS. 로그인은 Supabase Auth REST, 세션은 메모리+sessionStorage. 권한은 전부 RLS(`admins`, `is_admin()`). 계정 만들기는 `../tools/monitor/USER-TODO.md`. 로컬: `npx serve -l 5188 -c serve.json` 후 `/admin/monitor`.

## 숨김(unlisted) 시설 (2026-11-23, migration `tools/monitor/migrations/004_unlisted.sql`)
- 사진·가격 모두 없던 시설 2,243건을 **삭제하지 않고** `onsen_facilities.unlisted=true`로 숨겼다(모니터링 참조 시설 6건은 제외). 공개 목록은 486건.
- 익명/로그인 사용자의 RLS는 `not unlisted`만 읽게 하고(`onsen_photos`도 따라감), 관리자(`is_admin()`)와 service role은 전부 읽는다. `db-loader.js`는 `unlisted=eq.false`를 추가로 건다(열이 없는 옛 DB면 조건 없이 재시도). DB 로드 성공 시 숨긴 시설의 번들(data.js) 기록은 RAW에서 제거된다. DB 실패로 로컬 폴백을 쓸 때는 `listed-ids.js`(공개 486건 id, 2026-11-23 시점)에 든 번들 기록만 남긴다. 숨김을 풀거나 시설을 더 숨기면 이 파일도 다시 만들어야 한다: `select id from onsen_facilities where not unlisted order by id`를 `window.LISTED_IDS=[...]`로 저장(오래돼도 폴백에서 덜 보일 뿐 숨긴 시설이 새지는 않는다).
- 목록 건수 참고: 도도부현을 주소로 열면 기본 조건 '숙박 가능'이 켜져 있어 전체 시설 수보다 적게 나온다(북해도 42곳 중 32). 조건을 해제하면 전체가 나온다(정상 동작).
- 다크 모드 히어로: 사진 위 글자는 `cover-upgrade.css`(투명 바탕·흰 글자)가 정한다. `dark.css`에서 `.hero-txt`에 바탕/글자색을 주면 사진 위에 어두운 상자가 생기니 주지 말 것.
- 되돌리기: `tools/cleanup/unhide.sql`(로컬 전용·저장소 미포함, 숨긴 id 목록으로 `unlisted=false`). 일부만: `update onsen_facilities set unlisted=false where id in (...)`. 백업: `tools/cleanup/backup/onsen_facilities-before-hide-20261123.json`.

## 가격 표시 규칙 (숙박 vs 당일 입욕)
- 숙박 가격(`stayPrice`)과 당일 입욕 가격(`dayPrice`)은 섞지 않는다. 카드·서랍·비교표 모두 당일 가격은 '당일 입욕 ¥N'(환율 규칙 동일)으로 따로 라벨을 붙이고, 숙박 가격만 없을 때는 일반 '가격 미공개' 대신 '숙박 요금 미공개'(`UI.noStayPrice`, 서랍·비교는 `tile.stayNp`)를 쓴다.
- '가격 있는 곳만' 칩(`hasPrice`)은 숙박·당일 중 하나라도 있으면 센다. 가격 슬라이더·'가격 미확인 포함'·가격순 정렬은 숙박 가격만 쓴다.
