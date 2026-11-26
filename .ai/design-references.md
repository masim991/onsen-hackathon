# 디자인 레퍼런스 정리 (온천 한눈에) — Claude 작성, Codex가 이어서 검증·구현

출처 목록: "스튜디오 눈길"의 레퍼런스 15선 아티팩트(claude.ai/artifact/2uYVCvfgstreazj8aMqrmA). 아래 평가는 소개 글 + 웹 검색 결과 기반이며 **각 사이트를 직접 열어 본 것은 아니다**(검증 칸은 Codex 몫).

## 현재 사이트의 성격 (맞춰야 할 기준)
밤의 료칸(짙은 와인색·등불·종이 질감), 일본어 세리프(Klee One)+한글 Gowun Dodum+손글씨 Gaegu, 3개 국어. 서비스 화면이 중심(카드·필터·지도·상세 서랍·가격 비교). 신뢰가 핵심: 공식 값만, 출처·확인일 표기.

## 최적 레퍼런스 (적용 순서)
| 순위 | 사이트 | 우리 화면에 적용 | 근거/주의 |
|---|---|---|---|
| 1 | Awwwards (awwwards.com) | 입장 연출, 지도→현 선택, 카드 호버 모션 | 검색에서 ryokan 사례로 Hanamurasaki(awwwards.com/sites/hanamurasaki, 와비사비 표현)가 확인됨. "ryokan/onsen/hotel" 태그로 직접 검색해 보기 |
| 2 | Siteinspire | 전체 톤·여백·글자 위계(차분한 일본풍) | 스타일/주제 필터로 "hospitality, japan" 계열 확인 |
| 3 | Land-book | 카드 목록·필터 칩·서랍형 상세의 구조 비교 | 업종·스타일 필터. 이번 검색에서는 직접 사례를 못 찾음 → Codex가 확인 |
| 4 | Fonts In Use | 일본어 명조/세리프 조합 점검 | Yu Mincho 사용 페이지(fontsinuse.com/typefaces/86641/yu-mincho) 확인. 무료 대안으로 Zen Old Mincho(오픈 라이선스). Klee 사례는 못 찾음 |
| 5 | Mobbin | 모바일 검색·필터·목록·상세·지도 흐름 | 일부만 무료. 대신 ScreensDesign 흐름(finding-places, booking-accommodation)으로 대체 가능 |
| 6 | Cosmos / Savee | 와인색·등불·종이 질감 무드보드, 사진 톤 통일 | 한 장에서 유사 무드를 따라 탐색 |
| 7 | Dribbble | 가격 배지·칩·카드의 작은 UI 디테일 | 호텔 검색/지도 컬렉션 다수 |
| 8 | Lapa Ninja | 소개·안내 페이지 섹션 순서 | 서비스 화면 중심이라 우선순위 낮음 |
| 낮음 | The Dieline, BP&O, The Brand Identity | 로고·인장(落款) 방향 | 패키지/브랜딩 중심, UI 개선과 간접 |
| 낮음 | It's Nice That, Behance, Designspiration | 영감용 | 개선 항목과 직접 연결 약함 |

## 근거 있는 UI 개선 포인트 (검색으로 확인된 것만)
- 지도/목록 분할: 지도에서 좁힌 결과가 목록으로 돌아갔을 때 유지되어야 한다(Baymard 연구). → 현 선택 후 목록 상태 유지 확인.
- 목록은 카드 + 가로 필터 줄 + 떠 있는 "지도" 버튼이 모바일의 일반형(Expedia/Vrbo 흐름, ScreensDesign). → 현재 모바일 헤더/필터를 하단 시트 방식과 비교.
- 카드는 compact/expanded 두 가지로 표준화하고 필터는 칩+바텀시트(휴가 렌탈 UI 가이드). → 사진 카드와 사진 없는 카드의 가격 영역을 통일.
- 참고가 문구는 "시설 요금이 아님"이 한눈에 보이는 별도 배지(점선 테두리 등)로.

## Codex에게 맡기는 일 (순서대로, 각 항목 검증 결과를 이 파일 아래에 5줄 이내로 추가)
1. Awwwards·Siteinspire·Land-book에서 ryokan/onsen/japan hospitality 사례 각 3개 이상 실제로 열어 스크린샷(데스크톱·모바일)과 쓴 글꼴·색·모션을 기록.
2. 우리 사이트(web/)와 나란히 비교해 "카드 가격 영역 통일", "참고가 배지", "모바일 필터 바텀시트" 3가지에 대한 구체 변경안을 CSS 토큰(theme.css 기준) 수준으로 제안. 기존 CONFIG·디자인 토큰은 임의로 깨지 않는다.
3. 제안 중 위험이 낮은 것부터 구현하고 Chromium/WebKit·모바일·reduced-motion 스크린샷 검증. 60fps 실측은 실기기에서만 가능하니 "미측정"으로 남긴다.

## 2026-11-26 인트로 레퍼런스 직접 확인 (Codex)
- [FŪDO](https://jesse-ellie.com/contents/fudo/): 1440×900 실화면과 스크롤 650/1300/1950px 확인. 첫 화면은 지역 사진 격자+거대 한자, 이후 검은 여백·문장·해안 윤곽으로 순서를 전환한다.
- [Doors](https://doors-io.vercel.app/?ref=threejsresources): 로딩 뒤 중앙의 발광 문, 바닥의 빛, 아주 큰 타이포가 겹친다. 문 자체는 포트폴리오 포털이며 우리의 옆으로 미는 쇼지와 동작 구조는 다르다.
- [Hanamurasaki](https://www.hana-mura.com/): 여백이 큰 흰 화면 한가운데 어두운 실사 사진을 크게 놓는다. 재질감과 호텔 맥락은 우리 절차적 씬보다 훨씬 강하다.
- [Ameen Abdullah](https://ameen-abdullah.dev/): WebGL 입자 로더와 효과 실험을 확인했다. 로딩 화면 뒤 본 콘텐츠는 이 테스트 환경에서 확인하지 못했다.
- 결론: 첫 구현의 플랫한 목재·종이 재질과 임의 지형 그림은 레퍼런스 수준에 못 미친다. 사진 복제 대신 프로젝트의 기존 생성 자산 및 절제된 재질·조명·카메라 연출을 활용한다.
