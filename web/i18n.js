// 화면 문구 사전(ko·ja·en)과 본문 뼈대. index.html·ja.html·en.html은 <html lang>만 다르고, 본문은 여기서 같은 틀로 만든다.
// 자료(시설 이름·온천지·설명) 변환표는 i18n-data.js, 동작은 site.js. 함수 값은 숫자·이름을 끼워 넣는 문구다.
const LANG = ['ko', 'ja', 'en'].includes((document.documentElement.lang || '').slice(0, 2)) ? document.documentElement.lang.slice(0, 2) : 'en';

const I18N = {
  ko: {
    loc: 'ko-KR', tz: 'Asia/Seoul', fx: 'KRW',
    skip: '검색 결과로 건너뛰기', brandHome: '온천 한눈에 홈', brand: '온천 한눈에', tagline: '일본 온천 숙소·당일 온천 한곳에서 찾기',
    navAria: '주요 메뉴',
    nav: { find: '온천 찾기', water: '온천수 안내', ryokan: '료칸 숙박 안내', guide: '가기 전 확인할 것', pay: '결제 방법 안내', fav: '찜한 시설' },
    href: { water: 'water.html', ryokan: 'guide.html#ryokan', guide: 'guide.html#guide', guideBefore: 'guide.html#guide-before' },
    hero: {
      aria: '소개', tate: '김 오르는 온천 숙소로', eyebrow: '일본의 온천, 한눈에 비교하고 찾으세요', sub: '지역, 탕, 온천수, 숙소 조건, 예산까지.<br>마음에 드는 일본의 온천을 천천히 만나보세요.',
      cta: '온천 찾아보기', controls: '온천 사진 넘기기', prev: '이전 사진', next: '다음 사진', pause: '일시정지', play: '재생',
      pauseAria: '사진 자동 전환 일시정지', playAria: '사진 자동 전환 재생', caps: null, failed: '사진을 불러오지 못했습니다.',
    },
    rail: {
      aria: '조건으로 온천 찾기', title: '조건으로 온천 찾기', clear: '모두 지우기',
      map: '지역 지도', mapHelp: '지도에서 도도부현을 선택하세요. 아래 목록으로도 선택할 수 있습니다.', mapAria: '일본 도도부현 선택 지도', mapLoading: '지도를 불러오는 중입니다.',
      mapFail: '지도를 표시할 수 없습니다. 아래 목록에서 도도부현을 선택하세요.', mapPick: '현을 선택하면 등록 시설 수를 볼 수 있습니다. + / −로 지도를 확대·축소하세요.', mapAll: '일본 전체 보기',
      mapInfo: (pref, n, ryokan) => `${pref} · 등록 시설 ${n}곳 · 확인된 료칸 ${ryokan}곳`,
      mapAttr: '경계: <a href="https://github.com/dataofjapan/land" target="_blank" rel="noopener">지구지도 일본</a>',
      prefAria: '도도부현', areaAria: '온천지', prefAll: '도도부현 전체', areaAll: '온천지 전체',
      kind: '숙소 유형', kindLabel: '종류', ryokan: '료칸', hotel: '호텔', all: '전체 시설 (유형 미확인 포함)',
      kindHelp: '공식 자료에서 유형을 확인한 시설만 료칸·호텔로 표시합니다. 숙박 조건을 해제하면 전체 시설로 전환됩니다.',
      use: '이용 방식', unit: '곳', bath: '탕의 형태', water: '온천수', quality: '성분', stayCond: '숙소 조건', conv: '편의',
      budget: '예산', budgetSub: '1박 · 어른 1인', noLimit: '제한 없음', budgetAria: '1박 1인 숙박료 상한', low: '낮게',
      budgetHelp: '확인 당시 기준가입니다. 가격을 알 수 없는 시설도 기본으로 함께 보여 줍니다.',
      unp: '가격 미확인 시설도 포함', cover: (n, m, inc) => `가격 확인 ${n}곳 / 미공개 ${m}곳 ${inc ? '포함' : '제외'}`, coverNone: (m) => `이 조건에는 가격이 확인된 시설이 없어 예산으로 거를 수 없습니다 (가격 미공개 ${m}곳).`, pricedBtn: (n) => `가격 확인된 곳만 보기 (${n}곳)`, fxIndic: '원화 금액은 참고용 환율로 환산한 값입니다. 현지에서는 엔화로 냅니다.', photoOnly: (n) => `사진 있는 곳 ${n}`, priceOnly: (n) => `가격 있는 곳 ${n}`, show: (n) => `${n}곳 보기`,
      hint: (n, hit) => `조건 ${n}개 적용, ${hit}곳이 맞습니다`, hintAll: (total) => `시설 ${total}곳에서 고릅니다`,
      upTo: (text) => `최대 ${text}`, more: (n) => `성분 ${n}가지 더 보기`, less: '접기',
    },
    label: { day: '당일 이용', stay: '숙박', open: '노천탕', priv: '대절탕', room: '객실 노천탕', flow: '원천 방류', solo: '1인 숙박 가능', sudo: '식사 없이 숙박 가능', card: '카드 결제', shuttle: '송영', park: '주차장' },
    results: { before: '검색 결과 ', after: '건', chips: '적용한 조건', sort: '정렬', byName: '가나다 순', byPrice: '숙박 요금 낮은 순', byOpen: '노천탕 많은 순', detail: '시설 상세' },
    chip: { clear: (label) => `${label} 조건 지우기`, price: (text) => `1박 1인 ${text} 이하`, fav: '찜한 시설만', photo: '사진 있는 곳만', priced: '가격 있는 곳만', noUnp: '가격 미확인 시설 제외', wide: '검색 중: 숙박·유형 조건 해제', wideClear: '숙박 가능·료칸 조건 다시 적용' },
    home: {
      searchAria: '온천 검색', regionLabel: '지역', regionAll: '전국', textLabel: '시설명·온천지 검색', ph: '시설명, 온천지, 도도부현', btn: '검색',
      chips: '등록 시설이 많은 온천지', chipAria: (name) => `${name} 온천지로 찾기`, regionsTitle: '지역으로 찾기', regionsLead: '지역을 고르면 그곳에 등록된 시설을 모두 보여 드립니다.',
      regionN: (n) => `${n}곳`, regionAria: (name, n) => `${name}, 등록 시설 ${n}곳 보기`, regionsAria: '지역 목록', trustAria: '이용 안내',
      trust: [['공개 자료 기반', '시설 정보는 공식 사이트와 공개 자료에서 모았습니다.'], ['추정하지 않습니다', '확인하지 못한 값은 “미확인”으로 표시합니다.'], ['방문 전 확인', '요금·시간·운영 상태는 바뀔 수 있으니 시설에 직접 확인하세요.']],
      summary: (n, desc) => `${desc ? `${desc} 조건으로 ` : ''}${n}곳을 찾았습니다.`, searchChip: (q) => `검색어 “${q}”`,
    },
    det: {
      crumbAria: '현재 위치', home: '홈', nc: '확인되지 않음',
      kind: { ryokan: '료칸', hotel: '호텔', public_bath: '공동 온천', day_onsen: '당일 온천', unknown: '유형 미확인' },
      checkedOn: (d) => `${d} 확인`, official: '공식 사이트', sourcePage: '출처 페이지', galAria: '사진',
      tile: { stay: '숙박 요금', stayUnit: '1박 · 어른 1인', day: '당일 입욕', water: '온천수 · 온도', bath: '탕', noStay: '숙박 없음', stayNp: '미공개', noDay: '당일 입욕 없음', temp: (t) => `원천 ${t}`, approx: '약 ' },
      intro: '소개', table: '시설 정보', area: '소재지·온천지', card: '카드 결제', shuttle: '송영',
      readTitle: '이 정보를 읽는 방법',
      read: ['비어 있는 항목은 추정하지 않고 “확인되지 않음”으로 표시합니다.', '등록된 값은 시설을 서로 비교하기 위한 참고 자료입니다. 실제 이용 조건과 다를 수 있습니다.', '요금·시간·운영 상태는 바뀔 수 있으니 확인한 날짜를 함께 보세요.', '공식 사이트가 아닌 공개 자료의 값은 갱신 시점이 적혀 있지 않아 현재와 다를 수 있습니다.'],
      sixTitle: '방문 전 확인할 6가지',
      six: [['영업 여부와 휴관일', '방문하는 날에 문을 여는지 공식 사이트나 전화로 확인하세요.'], ['요금과 입욕 시간', '표시된 값은 확인한 날짜 기준입니다. 마지막 입장 시간도 함께 확인하세요.'], ['당일 입욕 가능 여부', '숙박객 전용인 날이나 시간대가 있을 수 있습니다.'], ['결제 수단', '현금만 받는 곳도 있으니 엔화 현금을 준비하세요.'], ['가는 길과 송영', '막차 시간과 송영 예약 여부를 확인하세요.'], ['이용 규칙', '문신, 수건, 혼욕, 입욕 방법은 시설마다 다릅니다.']],
      mapTitle: '위치', mapHint: '등록된 자료에 좌표가 없어 도도부현 단위로 표시합니다. 정확한 위치는 아래 지도 검색에서 확인하세요.', mapOpen: '지도에서 시설 검색', mapExact: '시설 이름으로 찾은 위치입니다(OpenStreetMap 기준). 실제 출입구와 다를 수 있으니 방문 전 시설에 확인하세요.', mapArea: '온천지 중심의 대략적인 위치입니다. 시설의 정확한 위치가 아닙니다.',
      faqTitle: '자주 묻는 질문',
      faq: [['표시된 요금은 지금도 같은가요?', '확인한 날짜 시점의 값이며 날짜·인원·상품에 따라 달라집니다. 예약하기 전에 공식 사이트에서 다시 확인하세요.'], ['표시된 온도는 탕의 온도인가요?', '아닙니다. 등록된 값은 원천(샘에서 나오는 물)의 온도입니다. 실제 욕조의 물은 식히거나 물을 섞어 온도가 다를 수 있습니다.'], ['온천수 종류로 건강에 미치는 효과를 알 수 있나요?', '알 수 없습니다. 성분 분류는 물의 성질을 비교하는 정보이며 효과를 보장하지 않습니다. 몸 상태가 걱정되면 의사와 상담하고 시설의 주의 사항을 따르세요.']],
      sameTitle: '같은 온천지의 다른 시설', samePrefTitle: '같은 도도부현의 다른 시설',
      srcTitle: '출처', srcLine: (d) => `자료 확인일 ${d}`, report: '오류 신고', reportHint: '정보가 다르면 알려 주세요.',
      sixMore: '가기 전 확인할 것 자세히 보기', allUnconf: (d) => `요금·온천수·입욕 정보 미확인 · ${d} 확인`,
      mapDir: '길찾기', mapAreaLabel: (a) => `${a} 주변(대략)`, mapTouch: '두 손가락으로 지도를 움직이세요.',
      mapAria: { facility: (n) => `${n} 위치 지도, 시설 단위 위치`, area: (n) => `${n} 주변 지도, 온천지 단위의 대략적인 범위`, pref: (n) => `${n} 지도, 도도부현 단위` },
    },
    empty: { none: '이 조건에 맞는 시설이 없습니다.', noFav: '아직 찜한 시설이 없습니다.', tryLoose: '조건을 하나씩 풀어 보거나 다른 지역을 골라 보세요.', favHow: '시설 카드의 하트를 누르면 여기에 모입니다.', favOut: (n) => `찜한 ${n}곳이 현재 조건에 맞지 않습니다. 조건을 지우면 보입니다.`, clear: '조건 모두 지우기', undo: '마지막 조건 해제' },
    cmp: { btn: (n) => `비교하기 (${n})`, title: '찜한 시설 비교', note: '찜한 시설의 등록된 값을 나란히 놓았습니다. 빈 칸은 확인되지 않은 값이며, 최저 표시는 확인된 값끼리만 비교합니다. 요금과 운영 상태는 공식 사이트에서 다시 확인하세요.', pick: (n) => `비교할 시설 고르기 (최대 ${n}곳)`, need: '비교하려면 2곳 이상 고르세요.', low: '확인된 값 중 최저', area: '지역', checked: '확인일', same: '공식 사이트와 같음', unconf: '확인되지 않은 항목' },
    pay: {
      title: '결제 방법 안내', lead: '온천 한눈에는 결제를 받지 않습니다. 시설 공식 사이트나 예약처로 이동해 예약하고 결제합니다.',
      items: ['사전 카드 결제와 현장 결제 가능 여부는 예약처와 상품마다 다릅니다.', '결제 시점과 취소 조건은 예약 직전 화면에서 다시 확인합니다.', '당일 입욕은 현장에서 엔화 현금으로 내는 곳이 많습니다.', '화면의 원화 금액은 그날 고시 환율로 환산한 참고 값입니다. 실제 결제 금액은 카드사와 환전 시점에 따라 달라집니다.'],
    },
    footer: '온천 한눈에, 해커톤 기획 초안 (2026년 11월) · ', sources: '자료 출처와 이용 조건',
    // 카드·상세
    px: { basis: { m2: '1인 1박 2식 기준', m1: '1인 1박 식사 1회 포함 기준', room: '1인 1박 숙박만(식사 제외) 기준', unk: '1인 1박 · 식사 조건 불명', nb: '기준 미표시' }, old: '오래된 가격', srcOfficial: '출처: 공식 사이트', srcMon: '출처: 공식 사이트(모니터링)', srcMonShort: '공식 사이트(모니터링)', monH: { day: '공식 사이트(모니터링) 당일 입욕 시간', biz: '공식 사이트(모니터링) 영업시간(당일 입욕 시간과 다를 수 있음)', unk: '공식 사이트(모니터링) 시간(구분 미표시)' }, srcAssoc: (d) => `출처: 관광협회 사이트 (${d})`, srcAssocShort: '관광협회 사이트 기준',
      avg: (p, m, n, lo, hi) => `참고: ${p} 1인 1박 2식 확인 가격 중앙값 ${m} (확인 ${n}곳, 범위 ${lo}~${hi}) · 이 시설의 요금 아님`, book: '예약은 공식 사이트에서', clearQ: '검색어 지우기',
      comp: (p, w, m) => `비교 가능: 요금 ${p}/${m}곳, 온천수 ${w}/${m}곳`, rm: '빼기', rmAria: (n) => `${n} 비교에서 빼기`, why: '2곳 이상 담으면 비교할 수 있어요' },
    unk: '미확인', noPhoto: '사진 미등록', fav: '비교용 담기', favAria: (name) => `${name} 비교용으로 담기`, close: '닫기', source: '출처', newWin: ' (새 창)',
    offNotice: {t: '공식 공지', note: '자동으로 정리한 요약입니다 · 정확한 내용은 공식 페이지에서 확인하세요', src: '원문 보기'}, notice: '운영 상태 확인 필요', priceSmall: '숙박 1박 · 어른 1인', stayShort: '숙박', stayBasis: '1박 1인', dayNoPrice: '당일 입욕 요금 미공개', priceDisclaimer: '가격은 참고용입니다. 예약 전 공식 사이트에서 확인하세요.', seeDetail: '조건은 상세에서 확인', noPrice: '가격 미공개 · 공식 사이트에서 확인', noStayPrice: '숙박 요금 미공개', dayPriceLabel: '당일 입욕',
    np: { note: '사진이 없는 시설은 아는 정보만 간단히 보여 드립니다. 요금·온천수 등 표시되지 않은 항목은 미확인이며, 시설을 열면 확인됩니다.' },
    favToast: (n, added) => added ? `찜했습니다 · 찜한 시설 ${n}곳` : `찜을 해제했습니다 · 찜한 시설 ${n}곳`, favTop: (n) => `찜한 시설 ${n}곳 보기`,
    has: '있음', hasNot: '없음', can: '가능', cannot: '불가', stayNone: '숙박 없음', noOpen: '노천탕 없음',
    cnt: (n) => `${n}곳`, roomCnt: (n) => `${n}실`, withCnt: (label, text) => `${label} ${text}`, roomsOf: (n) => `객실 ${n}실`,
    photoPages: ['료칸 공식 사이트에서 사진 보기', '료칸 공식 사진첩 보기', '사가현 공식 관광 사이트에서 사진 보기', '가고시마 관광연맹에서 사진 보기'],
    prevPhoto: '이전 사진', nextPhoto: '다음 사진', photoN: (n) => `사진 ${n}`, photoLine: (cap) => `사진: ${cap}. `, sep: ' ',
    credit: { area: '온천지 풍경 · ', resized: ' · 크기 조정', kagoshima: ' · 가고시마 관광 홍보 목적', source: '사진 출처', terms: '이용 조건', original: '사진 원본', pd: '퍼블릭 도메인' },
    alt: { facility: (name) => `${name} 사진`, area: (pref) => `${pref} 온천지 사진` },
    facts: { how: '이용 방식', bath: '탕의 형태', water: '온천수', stay: '숙소 조건' },
    price: { stay: '숙박 · 1박 1인', vary: '날짜·인원·상품에 따라 변동', day: '당일 입욕', noDay: '받지 않음', checked: (d) => `${d} 확인`, checkedParen: (d) => `(${d} 확인)` },
    fxNote: (when, rateText) => `원화는 ${when} 환율(${rateText})로 환산한 값입니다. 현지에서는 엔화로 냅니다.`,
    btn: { check: '운영 상태 확인', official: '공식 사이트로 이동', pay: '결제 방법 안내' },
    sites: { title: '다른 예약 사이트에서 보기', jalan: '자란넷', rakuten: '라쿠텐 트래블', rating: (s, c) => `평점 ${s}${c ? `, 후기 ${c}건` : ''}`, note: '요금과 빈 객실은 날짜에 따라 달라 각 사이트에서 확인합니다.', ratingNote: (d) => ` 평점은 ${d}에 본 값입니다.` },
    must: '꼭 확인할 것', prefer: '취향에 따라 볼 것', know: '알아 두면 좋은 것',
    row: {
      dayHours: '당일 입욕 시간', noDayTake: '당일 입욕 받지 않음', privateBath: '대절탕 예약·요금', dayUse: (d) => `당일 이용 안내${d ? ` (${d} 확인)` : ''}`, closed: '휴관 안내', mixed: '남녀 구분·혼욕',
      payment: '결제 수단', cardOk: '카드 가능', access: '가는 길·송영', shuttle: '송영 있음', towels: '수건·세면도구', open: '노천탕', priv: '대절탕', room: '객실 노천탕',
      flow: '원천 방류', flowYes: '방류', flowNo: '방류 아님', color: '물 색상', temp: '원천 온도', tempNote: '탕 온도와 다름', solo: '1인 숙박', sudo: '식사 없이 숙박', ci: '체크인·체크아웃', park: '주차장',
    },
    sourcesLink: '자료 출처와 이용 조건',
    fxLabel: '엔화 환율', fxLine: (rate) => `<b>100엔 = ${(rate * 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원</b>`, fxRateText: (rate) => `100엔 = ${(rate * 100).toFixed(1)}원`,
    fxAsOf: (when) => `${when} 기준`, fxDaily: 'Frankfurter 일별 기준', fxTracker: (st, n) => `${n}개 출처 교차 확인${st === 'stale' ? ' · 오래된 값' : ''}`, src: {"label":"공식 사이트 점검","ok":"접속 정상","changed":"페이지 내용이 최근 바뀌었습니다. 공식 사이트에서 최신 안내를 확인하세요.","unreachable":"접속되지 않습니다. 운영 여부를 시설에 확인하세요.","blocked":"자동 점검 불가"}, fxRef: '참고 환율', theme: '다크 모드', fxFail: '불러오지 못해 엔화로 표시합니다', fxOld: '(오래된 환율)',
    dateD: (d) => `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`, approx: (text) => `약 ${text}`,
    conv$: (n, rate) => '₩' + (Math.round(n * rate / 10) * 10).toLocaleString('ko-KR'), convTail: (text) => `(약 ${text})`,
  },

  ja: {
    loc: 'ja-JP', tz: 'Asia/Tokyo', fx: null,
    skip: '検索結果へ', brandHome: '温泉ひとめぐり ホーム', brand: '温泉ひとめぐり', tagline: '日本の温泉旅館を探す',
    navAria: 'メインメニュー',
    nav: { find: '温泉を求めて', water: '泉質について', ryokan: '宿泊前の確認', guide: '温泉に行く前に', pay: '支払い', fav: 'お気に入り' },
    href: { water: 'water-ja.html', ryokan: 'guide-ja.html#guide', guide: 'guide-ja.html#onsen', guideBefore: 'guide-ja.html#guide-before' },
    hero: {
      aria: '紹介', tate: '湯けむりの宿へ', eyebrow: 'お気に入りの湯宿を見つけよう。', sub: '地域、お風呂、泉質、宿の条件、予算まで。<br>お気に入りの日本の温泉を、ゆっくり探してみてください。',
      cta: '条件から探す', controls: '温泉写真の切り替え', prev: '前の写真', next: '次の写真', pause: '一時停止', play: '再生',
      pauseAria: '写真の自動切り替えを一時停止', playAria: '写真の自動切り替えを再開', caps: ['群馬の温泉宿', '登別温泉の風景', '十勝岳温泉の風景'], failed: '写真を読み込めませんでした。',
    },
    rail: {
      aria: '条件で温泉を探す', title: '条件で絞り込む', clear: '条件をクリア',
      map: '地域マップ', mapHelp: '地図から都道府県を選べます。下のリストからも選べます。', mapAria: '都道府県を選ぶ地図', mapLoading: '地図を読み込んでいます。',
      mapFail: '地図を表示できません。下の一覧から選んでください。', mapPick: '都道府県を選ぶと登録施設数を表示します。+ / − で地図を拡大・縮小できます。', mapAll: '日本全体を見る',
      mapInfo: (pref, n, ryokan) => `${pref} · 登録施設 ${n}件 · 旅館 ${ryokan}件`,
      mapAttr: '境界：<a href="https://github.com/dataofjapan/land" target="_blank" rel="noopener">地球地図日本</a>',
      prefAria: '都道府県', areaAria: '温泉地', prefAll: 'すべての都道府県', areaAll: 'すべての温泉地',
      kind: '宿の種類', kindLabel: '種類', ryokan: '旅館', hotel: 'ホテル', all: 'すべての施設（種類未確認を含む）',
      kindHelp: '公式資料で種類を確認できた施設のみ旅館・ホテルとして表示します。「宿泊」のチェックを外すと、すべての施設を表示します。',
      use: '利用方法', unit: '件', bath: 'お風呂', water: '泉質・湯使い', quality: '泉質', stayCond: '宿泊条件', conv: '設備',
      budget: '予算', budgetSub: '1名1泊', noLimit: '上限なし', budgetAria: '1名1泊の料金の上限', low: '低め',
      budgetHelp: '確認時の参考料金です。料金が分からない施設も、初期設定ではあわせて表示します。',
      unp: '料金未確認の施設も含める', cover: (n, m, inc) => `価格確認済み ${n}件 / 未公開 ${m}件${inc ? 'を含む' : 'を除く'}`, coverNone: (m) => `この条件では料金を確認できた施設がないため、予算で絞り込めません（料金未公開 ${m}件）。`, pricedBtn: (n) => `料金確認済みのみ表示 (${n}件)`, fxIndic: '', photoOnly: (n) => `写真あり ${n}`, priceOnly: (n) => `料金あり ${n}`, show: (n) => `${n}件を見る`,
      hint: (n, hit) => `${n}件の条件を適用中、${hit}件が該当します`, hintAll: (total) => `${total}件の施設から選べます`,
      upTo: (text) => `${text}以下`, more: (n) => `泉質をあと${n}種類表示`, less: '閉じる',
    },
    label: { day: '日帰り入浴', stay: '宿泊', open: '露天風呂', priv: '貸切風呂', room: '露天風呂付き客室', flow: '源泉かけ流し', solo: '1人で宿泊できる', sudo: '素泊まりできる', card: 'カード決済', shuttle: '送迎', park: '駐車場' },
    results: { before: '検索結果 ', after: '件', chips: '適用中の条件', sort: '並び順', byName: '五十音順', byPrice: '宿泊料金が安い順', byOpen: '露天風呂が多い順', detail: '施設の詳細' },
    chip: { clear: (label) => `${label}の条件を解除`, price: (text) => `1名1泊 ${text}以下`, fav: 'お気に入りのみ', photo: '写真ありのみ', priced: '料金ありのみ', noUnp: '料金未確認を除外', wide: '検索中: 宿泊・タイプ条件を解除中', wideClear: '宿泊可・旅館の条件を再適用' },
    home: {
      searchAria: '温泉を検索', regionLabel: '地域', regionAll: '全国', textLabel: '施設名・温泉地で検索', ph: '施設名、温泉地、都道府県', btn: '検索',
      chips: '登録施設が多い温泉地', chipAria: (name) => `${name}で探す`, regionsTitle: '地域から探す', regionsLead: '地域を選ぶと、登録されている施設をすべて表示します。',
      regionN: (n) => `${n}件`, regionAria: (name, n) => `${name}、登録施設${n}件を見る`, regionsAria: '地域の一覧', trustAria: 'ご利用にあたって',
      trust: [['公開資料にもとづく', '施設情報は公式サイトなどの公開資料から集めています。'], ['推測しません', '確認できなかった項目は「未確認」と表示します。'], ['訪問前に確認', '料金・時間・営業状況は変わることがあります。施設へ直接ご確認ください。']],
      summary: (n, desc) => `${desc ? `${desc}の条件で ` : ''}${n}件が見つかりました。`, searchChip: (q) => `キーワード「${q}」`,
    },
    det: {
      crumbAria: '現在地', home: 'ホーム', nc: '未確認',
      kind: { ryokan: '旅館', hotel: 'ホテル', public_bath: '共同浴場', day_onsen: '日帰り温泉', unknown: '種類未確認' },
      checkedOn: (d) => `${d}確認`, official: '公式サイト', sourcePage: '出典ページ', galAria: '写真',
      tile: { stay: '宿泊料金', stayUnit: '1名1泊', day: '日帰り入浴', water: '泉質・温度', bath: 'お風呂', noStay: '宿泊なし', stayNp: '未公開', noDay: '日帰り入浴なし', temp: (t) => `源泉 ${t}`, approx: '約' },
      intro: '紹介', table: '施設情報', area: '所在地・温泉地', card: 'カード決済', shuttle: '送迎',
      readTitle: 'この情報の読み方',
      read: ['空欄の項目は推測せず「未確認」と表示します。', '登録している値は、施設を比べるための参考情報です。実際の利用条件と異なることがあります。', '料金・時間・営業状況は変わることがあるため、確認日もあわせてご覧ください。', '公式サイト以外の公開資料の値は、更新時期が記載されていないため現在と異なる場合があります。'],
      sixTitle: '訪問前に確認したい6つのこと',
      six: [['営業日と休館日', '訪問日に営業しているか、公式サイトや電話で確認しましょう。'], ['料金と入浴時間', '表示の値は確認日時点のものです。最終受付時間もあわせて確認しましょう。'], ['日帰り入浴の可否', '宿泊者専用の日や時間帯がある場合があります。'], ['支払い方法', '現金のみの施設もあるため、日本円の現金を用意しましょう。'], ['アクセスと送迎', '最終バスの時間や、送迎の予約が必要かを確認しましょう。'], ['利用ルール', 'タトゥー、タオル、混浴、入浴の作法は施設ごとに異なります。']],
      mapTitle: '所在地', mapHint: '登録データに座標がないため、都道府県単位で表示しています。正確な場所は下の地図検索でご確認ください。', mapOpen: '地図で施設を検索', mapExact: '施設名で見つけた位置です(OpenStreetMap基準)。実際の入口と異なる場合があるため、訪問前に施設へご確認ください。', mapArea: '温泉地の中心のおおよその位置です。施設の正確な位置ではありません。',
      faqTitle: 'よくある質問',
      faq: [['表示されている料金は今も同じですか？', '確認日時点の値で、日付・人数・プランによって変わります。予約前に公式サイトで再度ご確認ください。'], ['表示されている温度は浴槽の温度ですか？', 'いいえ。登録している値は源泉の温度です。浴槽のお湯は、冷ましたり加水したりして温度が異なることがあります。'], ['泉質から健康への効果はわかりますか？', 'わかりません。泉質の分類はお湯の性質を比べるための情報で、効果を保証するものではありません。体調が心配な方は医師に相談し、施設の注意事項に従ってください。']],
      sameTitle: '同じ温泉地のほかの施設', samePrefTitle: '同じ都道府県のほかの施設',
      srcTitle: '出典', srcLine: (d) => `資料の確認日 ${d}`, report: '誤りを報告', reportHint: '情報が違う場合はお知らせください。',
      sixMore: '訪問前の確認事項をくわしく見る', allUnconf: (d) => `料金・泉質・入浴情報は未確認 · ${d}確認`,
      mapDir: '経路を見る', mapAreaLabel: (a) => `${a}周辺（おおよそ）`, mapTouch: '2本指で地図を動かせます。',
      mapAria: { facility: (n) => `${n}の位置の地図（施設単位）`, area: (n) => `${n}周辺の地図（温泉地単位のおおよその範囲）`, pref: (n) => `${n}の地図（都道府県単位）` },
    },
    empty: { none: '条件に合う施設が見つかりませんでした。', noFav: 'お気に入りの施設はまだありません。', tryLoose: '条件を変えてお試しください。', favHow: '施設カードのハートを押すと、ここに集まります。', favOut: (n) => `お気に入り ${n}件が現在の条件に合いません。条件を解除すると表示されます。`, clear: '条件をすべてクリア', undo: '直前の条件を解除' },
    cmp: { btn: (n) => `比較する (${n})`, title: 'お気に入りの比較', note: 'お気に入りの施設に登録されている情報を並べています。空欄は未確認の項目で、最安の表示は確認できた値どうしでのみ比べています。料金や営業状況は公式サイトで改めてご確認ください。', pick: (n) => `比較する施設を選ぶ（最大${n}件）`, need: '比較するには2件以上選んでください。', low: '確認済みの中で最安', area: 'エリア', checked: '確認日', same: '公式サイトと同じ', unconf: '未確認の項目' },
    pay: {
      title: '支払いについて', lead: 'このサイトでは予約・決済を受け付けていません。施設の公式サイトや予約サイトで手続きしてください。',
      items: ['事前カード決済・現地決済の可否は予約先とプランにより異なります。', '支払時期とキャンセル条件を予約前に確認してください。', '日帰り入浴は現金が必要な施設もあります。', '表示している料金は確認時の参考料金です。実際の支払額は予約先やプランによって変わります。'],
    },
    footer: '温泉ひとめぐりは施設紹介サイトです。予約・決済は各施設や予約サイトで行います。 · ', sources: '情報・写真の出典',
    px: { basis: { m2: '1名1泊2食付', m1: '1名1泊 食事1回付', room: '1名1泊 素泊まり', unk: '1名1泊 · 食事条件不明', nb: '基準の表示なし' }, old: '古い料金', srcOfficial: '出典: 公式サイト', srcMon: '出典: 公式サイト（モニタリング）', srcMonShort: '公式サイト（モニタリング）', monH: { day: '公式サイト（モニタリング）日帰り入浴の時間', biz: '公式サイト（モニタリング）営業時間（日帰り入浴の時間と異なる場合あり）', unk: '公式サイト（モニタリング）時間（区分の表示なし）' }, srcAssoc: (d) => `出典: 観光協会サイト（${d}）`, srcAssocShort: '観光協会サイト掲載',
      avg: (p, m, n, lo, hi) => `参考: ${p}の1名1泊2食 確認済み料金の中央値 ${m}（確認${n}件、範囲 ${lo}〜${hi}）· この施設の料金ではありません`, book: '予約は公式サイトで', clearQ: '検索ワードを消す',
      comp: (p, w, m) => `比較できる項目: 料金 ${p}/${m}件、泉質 ${w}/${m}件`, rm: '外す', rmAria: (n) => `${n}を比較から外す`, why: '2件以上保存すると比較できます' },
    unk: '未確認', noPhoto: '写真未登録', fav: '比較用に保存', favAria: (name) => `${name}を比較用に保存`, close: '閉じる', source: '出典', newWin: '（新しいウィンドウ）',
    offNotice: {t: '公式のお知らせ', note: '自動で要約しています · 正確な内容は公式ページでご確認ください', src: '元のページを見る'}, notice: '営業状況の確認が必要です', priceSmall: '宿泊 1泊・大人1名', stayShort: '宿泊', stayBasis: '1泊1名', dayNoPrice: '日帰り入浴 料金未公開', priceDisclaimer: '料金は参考情報です。ご予約前に公式サイトでご確認ください。', seeDetail: '条件は詳細で確認', noPrice: '料金は未公開 · 公式サイトで確認', noStayPrice: '宿泊料金 未公開', dayPriceLabel: '日帰り入浴',
    np: { note: '写真のない施設は、分かっている情報だけを簡単に表示しています。料金・泉質など表示のない項目は未確認で、施設を開くと確認できます。' },
    favToast: (n, added) => added ? `お気に入りに追加 · 全${n}件` : `お気に入りを解除 · 全${n}件`, favTop: (n) => `お気に入り ${n}件を見る`,
    has: 'あり', hasNot: 'なし', can: '可能', cannot: '不可', stayNone: '宿泊なし', noOpen: '露天風呂なし',
    cnt: (n) => `${n}か所`, roomCnt: (n) => `${n}室`, withCnt: (label, text) => `${label} ${text}`, roomsOf: (n) => `客室 ${n}室`,
    photoPages: ['旅館公式サイトで写真を見る', '旅館公式フォトギャラリーを見る', '佐賀県公式観光サイトで写真を見る', '鹿児島観光連盟で写真を見る'],
    prevPhoto: '前の写真', nextPhoto: '次の写真', photoN: (n) => `写真 ${n}`, photoLine: (cap) => `写真：${cap}。`, sep: ' ',
    credit: { area: '温泉地の風景 · ', resized: ' · サイズ変更', kagoshima: ' · 鹿児島観光PR目的', source: '写真の出典', terms: '利用条件', original: '原本', pd: 'パブリックドメイン' },
    alt: { facility: (name) => `${name}の写真`, area: (pref) => `${pref}の温泉地の写真` },
    facts: { how: '利用方法', bath: 'お風呂', water: '泉質', stay: '宿泊条件' },
    price: { stay: '宿泊 · 1名1泊', vary: '日付・人数・プランによって変動', day: '日帰り入浴', noDay: '受け付けていません', checked: (d) => `${d}確認`, checkedParen: (d) => `（${d}確認）` },
    fxNote: () => '',
    btn: { check: '営業状況を確認', official: '施設公式サイトへ', pay: '支払いについて' },
    sites: { title: 'ほかの予約サイトで見る', jalan: 'じゃらん', rakuten: '楽天トラベル', rating: (s, c) => `評価 ${s}${c ? `、口コミ ${c}件` : ''}`, note: '料金と空室は日付によって変わるため、各サイトでご確認ください。', ratingNote: (d) => ` 評価は${d}時点の値です。` },
    must: '必ず確認したいこと', prefer: '好みに応じて確認すること', know: '知っておくと役立つこと',
    row: {
      dayHours: '日帰り入浴の時間', noDayTake: '日帰り入浴は受け付けていません', privateBath: '貸切風呂の予約・料金', dayUse: (d) => `日帰り利用の案内${d ? `（${d}確認）` : ''}`, closed: '休館日', mixed: '男女別・混浴',
      payment: '支払い方法', cardOk: 'カード利用可', access: 'アクセス・送迎', shuttle: '送迎あり', towels: 'タオル・アメニティ', open: '露天風呂', priv: '貸切風呂', room: '露天風呂付き客室',
      flow: '源泉かけ流し', flowYes: 'かけ流し', flowNo: 'かけ流しではない', color: 'お湯の色', temp: '源泉温度', tempNote: '浴槽の湯温とは異なります', solo: '1人宿泊', sudo: '素泊まり', ci: 'チェックイン／アウト', park: '駐車場',
    },
    sourcesLink: '情報・写真の出典',
    fxLabel: '', fxLine: () => '', fxRateText: () => '',
    fxAsOf: () => '', fxDaily: '', fxTracker: () => '', src: {"label":"公式サイトの確認","ok":"接続は正常です","changed":"ページの内容が最近変わりました。公式サイトで最新の案内をご確認ください。","unreachable":"接続できません。営業状況は施設にご確認ください。","blocked":"自動確認不可"}, fxRef: '', theme: 'ダークモード', fxFail: '', fxOld: '',
    dateD: () => '', approx: (text) => text,
    conv$: () => '', convTail: () => '',
  },

  en: {
    loc: 'en-US', tz: 'Asia/Tokyo', fx: 'USD',
    skip: 'Skip to results', brandHome: 'Onsen at a Glance home', brand: 'Onsen at a Glance', tagline: 'Discover hot spring stays in Japan',
    navAria: 'Main navigation',
    nav: { find: 'Find a stay', water: 'Water guide', ryokan: 'Ryokan guide', guide: 'Before bathing', pay: 'Payments', fav: 'Favorites' },
    href: { water: 'water-en.html', ryokan: 'guide-en.html#ryokan', guide: 'guide-en.html#guide', guideBefore: 'guide-en.html#guide-before' },
    hero: {
      aria: 'Introduction', tate: 'To inns in the steam', eyebrow: 'Compare Japan’s hot springs at a glance', sub: 'Region, baths, spring water, stay conditions and budget.<br>Take your time finding a Japanese hot spring you love.',
      cta: 'Explore the collection', controls: 'Slideshow controls', prev: 'Previous photo', next: 'Next photo', pause: 'Pause', play: 'Play',
      pauseAria: 'Pause slideshow', playAria: 'Play slideshow', caps: ['A ryokan in Gunma (winter)', 'Noboribetsu hot spring landscape', 'Mount Tokachi hot spring landscape'], failed: 'The photo could not be loaded.',
    },
    rail: {
      aria: 'Find an onsen by conditions', title: 'Refine your search', clear: 'Clear all',
      map: 'Region map', mapHelp: 'Choose a prefecture on the map or from the list below.', mapAria: 'Map of Japan’s prefectures', mapLoading: 'Loading map…',
      mapFail: 'The map is unavailable. Choose a prefecture from the list below.', mapPick: 'Select a prefecture to see the number of listed properties. Use + / − to zoom.', mapAll: 'View all Japan',
      mapInfo: (pref, n, ryokan) => `${pref} · ${n} listed properties · ${ryokan} verified ryokan`,
      mapAttr: 'Boundaries: <a href="https://github.com/dataofjapan/land" target="_blank" rel="noopener">Global Map Japan</a>',
      prefAria: 'Prefecture', areaAria: 'Hot spring area', prefAll: 'All prefectures', areaAll: 'All hot spring areas',
      kind: 'Property type', kindLabel: 'Type', ryokan: 'Ryokan', hotel: 'Hotels', all: 'All properties (including unverified types)',
      kindHelp: 'Only properties whose type is confirmed from official sources are shown as ryokan or hotels. Clearing Overnight stay shows all properties.',
      use: 'Visit type', unit: '', bath: 'Baths', water: 'Spring water', quality: 'Water type', stayCond: 'Stay preferences', conv: 'Conveniences',
      budget: 'Budget', budgetSub: 'per adult per night', noLimit: 'No limit', budgetAria: 'Maximum nightly rate per adult', low: 'Lower',
      budgetHelp: 'Indicative rates at the time of checking. Properties without a known rate are included by default.',
      unp: 'Include properties with no price', cover: (n, m, inc) => `${n} with a price / ${m} undisclosed ${inc ? 'included' : 'excluded'}`, coverNone: (m) => `No property here has a confirmed price, so the budget cannot narrow results (${m} undisclosed).`, pricedBtn: (n) => `Show only confirmed prices (${n})`, fxIndic: 'Dollar amounts are indicative rates. You pay in yen locally.', photoOnly: (n) => `With photo ${n}`, priceOnly: (n) => `With price ${n}`, show: (n) => `Show ${n}`,
      hint: (n, hit) => `${n} filter${n === 1 ? '' : 's'} applied, ${hit} match${hit === 1 ? 'es' : ''}`, hintAll: (total) => `Choose from ${total} properties`,
      upTo: (text) => `Up to ${text}`, more: (n) => `Show ${n} more water types`, less: 'Show fewer',
    },
    label: { day: 'Day use', stay: 'Overnight stay', open: 'Open-air bath', priv: 'Private bath', room: 'In-room open-air bath', flow: 'Free-flowing spring water', solo: 'Solo stay', sudo: 'Room only, no meals', card: 'Card payment', shuttle: 'Shuttle', park: 'Parking' },
    results: { before: 'Search results: ', after: '', chips: 'Active filters', sort: 'Sort', byName: 'A–Z', byPrice: 'Lowest overnight rate', byOpen: 'Most open-air baths', detail: 'Property details' },
    chip: { clear: (label) => `Remove filter: ${label}`, price: (text) => `Up to ${text} per night`, fav: 'Favorites only', photo: 'With photo only', priced: 'With price only', noUnp: 'Unpriced excluded', wide: 'Searching: stay/type filters off', wideClear: 'Reapply stay and ryokan filters' },
    home: {
      searchAria: 'Search hot springs', regionLabel: 'Region', regionAll: 'All Japan', textLabel: 'Search by name or area', ph: 'Name, hot spring area or prefecture', btn: 'Search',
      chips: 'Areas with the most listings', chipAria: (name) => `Search ${name}`, regionsTitle: 'Browse by region', regionsLead: 'Choose a region to see every property listed there.',
      regionN: (n) => `${n} listed`, regionAria: (name, n) => `${name}: view ${n} listed properties`, regionsAria: 'Regions', trustAria: 'Before you use this site',
      trust: [['Based on public sources', 'Property details come from official sites and public records.'], ['Nothing is guessed', 'Anything we could not confirm is shown as “Not confirmed”.'], ['Check before you go', 'Rates, hours and operating status can change. Confirm with the property.']],
      summary: (n, desc) => `${n} propert${n === 1 ? 'y' : 'ies'} found${desc ? ` for ${desc}` : ''}.`, searchChip: (q) => `Keyword “${q}”`,
    },
    det: {
      crumbAria: 'You are here', home: 'Home', nc: 'Not confirmed',
      kind: { ryokan: 'Ryokan', hotel: 'Hotel', public_bath: 'Public bath', day_onsen: 'Day-use onsen', unknown: 'Type not confirmed' },
      checkedOn: (d) => `Checked ${d}`, official: 'Official site', sourcePage: 'Source page', galAria: 'Photos',
      tile: { stay: 'Overnight rate', stayUnit: 'per adult, per night', day: 'Day-use bathing', water: 'Water type and temperature', bath: 'Baths', noStay: 'No overnight stays', stayNp: 'Not published', noDay: 'No day use', temp: (t) => `Source ${t}`, approx: '~' },
      intro: 'About', table: 'Property details', area: 'Area', card: 'Card payment', shuttle: 'Shuttle',
      readTitle: 'How to read this information',
      read: ['Empty fields are shown as “Not confirmed” and are never estimated.', 'Registered values are for comparing properties. Actual conditions may differ.', 'Rates, hours and operating status can change, so look at the checked date too.', 'Values from public records other than the official site carry no update date and may be out of date.'],
      sixTitle: 'Six things to confirm before you visit',
      six: [['Opening days and closures', 'Check the official site or call to confirm the property is open on your date.'], ['Rates and bathing hours', 'Values shown are as of the checked date. Also check the last admission time.'], ['Day-use availability', 'Some days or hours may be reserved for overnight guests.'], ['Payment methods', 'Some places accept cash only, so bring yen in cash.'], ['Access and shuttle', 'Check the last bus time and whether the shuttle needs a reservation.'], ['House rules', 'Tattoo policy, towels, mixed bathing and bathing etiquette vary by property.']],
      mapTitle: 'Location', mapHint: 'The registered data has no coordinates, so only the prefecture is shown. Use the map search below to find the exact place.', mapOpen: 'Search this property on the map', mapExact: 'Location found by the property name (OpenStreetMap). It may differ from the actual entrance; confirm with the property before you go.', mapArea: 'Approximate center of the hot spring area, not the exact location of the property.',
      faqTitle: 'Frequently asked questions',
      faq: [['Is the listed rate still current?', 'It is the value as of the checked date and changes with date, party size and plan. Confirm on the official site before booking.'], ['Is the listed temperature the bath temperature?', 'No. The registered value is the temperature of the source spring. Water in the bath may be cooled or diluted and can differ.'], ['Can the water type tell me about health effects?', 'No. Water-type categories only help compare the character of the water and do not promise any effect. If you have a health concern, ask a doctor and follow the property’s guidance.']],
      sameTitle: 'Other properties in the same area', samePrefTitle: 'Other properties in the same prefecture',
      srcTitle: 'Sources', srcLine: (d) => `Data checked ${d}`, report: 'Report an error', reportHint: 'Tell us if something here is wrong.',
      sixMore: 'More on what to check before you go', allUnconf: (d) => `Rates, water type and bath details not confirmed · checked ${d}`,
      mapDir: 'Directions', mapAreaLabel: (a) => `Around ${a} (approximate)`, mapTouch: 'Use two fingers to move the map.',
      mapAria: { facility: (n) => `Map of ${n}, facility-level location`, area: (n) => `Map around ${n}, approximate hot spring area only`, pref: (n) => `Map of ${n}, prefecture level` },
    },
    empty: { none: 'No properties match your search.', noFav: 'No favorites yet.', tryLoose: 'Try changing your filters.', favHow: 'Tap the heart on a property card to collect it here.', favOut: (n) => `${n} favorite(s) don't match the current filters. Clear filters to see them.`, clear: 'Clear all filters', undo: 'Undo last filter' },
    cmp: { btn: (n) => `Compare (${n})`, title: 'Compare favorites', note: 'Registered details of your favorites, side by side. Empty cells are not confirmed, and the lowest-price mark compares confirmed values only. Please recheck prices and operating status on the official site.', pick: (n) => `Choose properties to compare (up to ${n})`, need: 'Choose at least 2 to compare.', low: 'Lowest confirmed', area: 'Area', checked: 'Checked', same: 'Same as official site', unconf: 'Not confirmed' },
    pay: {
      title: 'Payment information', lead: 'We do not take payments. Book directly with the property or booking provider.',
      items: ['Check whether your plan requires advance card payment or allows payment at the property.', 'Review payment timing and cancellation terms before confirming.', 'Some day-use facilities accept cash only.', 'Currency conversion is indicative. Your card issuer and payment date determine the final amount.'],
    },
    footer: 'Onsen at a Glance is an information service. Reservations and payments are handled by the property or booking provider. · ', sources: 'Information and photo credits',
    px: { basis: { m2: 'per person, 1 night, 2 meals', m1: 'per person, 1 night, 1 meal', room: 'per person, 1 night, room only', unk: 'per person, 1 night, meals unspecified', nb: 'basis not stated' }, old: 'Old price', srcOfficial: 'Source: official site', srcMon: 'Source: official site (monitoring)', srcMonShort: 'Official site (monitoring)', monH: { day: 'Day-use hours, official site (monitoring)', biz: 'Business hours, official site (monitoring; may differ from day-use hours)', unk: 'Hours, official site (monitoring; type not stated)' }, srcAssoc: (d) => `Source: tourism association site (${d})`, srcAssocShort: 'Tourism association site',
      avg: (p, m, n, lo, hi) => `Reference: median of confirmed per-person, 2-meal prices in ${p}: ${m} (${n} properties, range ${lo}–${hi}). Not this property's rate.`, book: 'Book on the official site', clearQ: 'Clear search',
      comp: (p, w, m) => `Comparable: price ${p}/${m}, water ${w}/${m}`, rm: 'Remove', rmAria: (n) => `Remove ${n} from compare`, why: 'Save 2 or more to compare' },
    unk: 'Not confirmed', noPhoto: 'No photo on file', fav: 'Save to compare', favAria: (name) => `Save ${name} to compare`, close: 'Close', source: 'source', newWin: ' (opens in a new window)',
    offNotice: {t: 'Official notice', note: 'Summarised automatically · check the official page for details', src: 'View original'}, notice: 'Please confirm operating status before visiting.', priceSmall: 'Overnight · per adult', stayShort: 'Stay', stayBasis: '1 night, per adult', dayNoPrice: 'Day-use price not published', priceDisclaimer: 'Prices are for reference. Please confirm on the official site before booking.', seeDetail: 'See details for conditions', noPrice: 'Price not published · check the official site', noStayPrice: 'Stay price not published', dayPriceLabel: 'Day-use',
    np: { note: 'Properties without a photo show only what is known. Items not shown, such as rates or water type, are not confirmed; open a property to see.' },
    favToast: (n, added) => added ? `Saved · ${n} favorite${n === 1 ? '' : 's'}` : `Removed · ${n} favorite${n === 1 ? '' : 's'}`, favTop: (n) => `Show ${n} favorite${n === 1 ? '' : 's'}`,
    has: 'Available', hasNot: 'Not available', can: 'Available', cannot: 'Not available', stayNone: 'No overnight stays', noOpen: 'No open-air bath',
    cnt: (n) => `${n}`, roomCnt: (n) => `${n}`, withCnt: (label, text) => `${label} (${text})`, roomsOf: (n) => `${n} rooms`,
    photoPages: ['View photos on the ryokan website', 'View the ryokan’s photo gallery', 'View photos on the Saga tourism site', 'View photos on the Kagoshima tourism site'],
    prevPhoto: 'Previous photo', nextPhoto: 'Next photo', photoN: (n) => `Photo ${n}`, photoLine: (cap) => `Photo: ${cap}. `, sep: ' · ',
    credit: { area: 'Hot spring area · ', resized: ' · resized', kagoshima: ' · Kagoshima tourism promotion only', source: 'Photo source', terms: 'Terms', original: 'original', pd: 'Public domain' },
    alt: { facility: (name) => `${name} photo`, area: (pref) => `Hot spring area in ${pref}` },
    facts: { how: 'Visit type', bath: 'Baths', water: 'Spring water', stay: 'Stay' },
    price: { stay: 'Overnight · per adult', vary: 'Varies by date, guests and plan', day: 'Day-use bathing', noDay: 'Not accepted', checked: (d) => `checked ${d}`, checkedParen: (d) => `(checked ${d})` },
    fxNote: (when, rateText) => `US dollar amounts are converted at the ${when} rate (${rateText}). You pay in yen locally.`,
    btn: { check: 'Check operating status', official: 'Visit property website', pay: 'Payment guide' },
    sites: { title: 'See on other booking sites', jalan: 'Jalan', rakuten: 'Rakuten Travel', rating: (s, c) => `Rating ${s}${c ? `, ${c} reviews` : ''}`, note: 'Rates and availability vary by date, so check each site.', ratingNote: (d) => ` Ratings were seen on ${d}.` },
    must: 'Check before you go', prefer: 'Depending on your preferences', know: 'Good to know',
    row: {
      dayHours: 'Day-use hours', noDayTake: 'Day-use bathing not accepted', privateBath: 'Private bath booking and rates', dayUse: (d) => `Day-use information${d ? ` (checked ${d})` : ''}`, closed: 'Closures', mixed: 'Gender arrangements and mixed bathing',
      payment: 'Payment methods', cardOk: 'Cards accepted', access: 'Access and shuttle', shuttle: 'Shuttle available', towels: 'Towels and amenities', open: 'Open-air bath', priv: 'Private bath', room: 'In-room open-air bath',
      flow: 'Free-flowing water', flowYes: 'Free-flowing', flowNo: 'Not free-flowing', color: 'Water color', temp: 'Source temperature', tempNote: 'differs from bath temperature', solo: 'Solo stay', sudo: 'Room only', ci: 'Check-in / check-out', park: 'Parking',
    },
    sourcesLink: 'Information and photo credits',
    fxLabel: 'USD / JPY', fxLine: (rate) => `<b>US$1 = ¥${(1 / rate).toLocaleString('en-US', { maximumFractionDigits: 1 })}</b>`, fxRateText: (rate) => `US$1 = ¥${(1 / rate).toFixed(1)}`,
    fxAsOf: (when) => `as of ${when}`, fxDaily: 'Frankfurter daily rate', fxTracker: (st, n) => `${n} sources cross-checked${st === 'stale' ? ' · stale' : ''}`, src: {"label":"Official site check","ok":"Reachable","changed":"The page content changed recently. Check the official site for the latest notice.","unreachable":"The site could not be reached. Confirm operating status with the property.","blocked":"Automated check unavailable"}, fxRef: 'indicative rate', theme: 'Dark mode', fxFail: 'Rate unavailable; showing yen', fxOld: '(old rate)',
    dateD: (d) => d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }), approx: (text) => `≈ ${text}`,
    conv$: (n, rate) => { const v = n * rate; return 'US$' + (v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US')); }, convTail: (text) => ` (≈ ${text})`,
  },
};
const UI = I18N[LANG];

// 본문 뼈대. 세 언어가 같은 마크업을 쓰고 문구·링크만 사전에서 가져온다.
document.body.insertAdjacentHTML('afterbegin', (() => {
  const U = UI, R = U.rail, H = U.home, ic = (id) => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const flag = (k) => `<label class="rowopt"><input type="checkbox" name="f" value="${k}"><span class="t">${U.label[k]}</span><span class="n" data-n="${k}"></span></label>`;
  const pill = (k) => `<label class="pill"><input type="checkbox" name="f" value="${k}"><span>${U.label[k]} <i data-n="${k}"></i></span></label>`;
  const tog = (k, on) => `<label class="tog"><input type="checkbox" name="f" value="${k}"${on ? ' checked' : ''}><span><b>${U.label[k]}</b><small><i data-n="${k}"></i>${R.unit}</small></span></label>`;
  return `<a class="skip" href="#results">${U.skip}</a>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="i-onsen" viewBox="0 0 24 24"><path d="M4 15a8 4.5 0 0 0 16 0M8.5 11c-1.4-2 1.4-3 0-5M12 11c-1.4-2 1.4-3 0-5M15.5 11c-1.4-2 1.4-3 0-5"/></symbol>
    <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/></symbol>
    <symbol id="i-cal" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></symbol>
    <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0c0-4.2 6-10.5 6-10.5z"/></symbol>
    <symbol id="i-bed" viewBox="0 0 24 24"><path d="M3.5 18.5v-11M3.5 15.5h17v3M20.5 15.5v-3a2.5 2.5 0 0 0-2.5-2.5h-7v5.5"/><circle cx="7.3" cy="11.7" r="1.7"/></symbol>
    <symbol id="i-yen" viewBox="0 0 24 24"><path d="M7 4.5l5 7.5 5-7.5M12 12v7.5M8 13h8M8 16.2h8"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
    <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/></symbol>
    <symbol id="i-out" viewBox="0 0 24 24"><path d="M13.5 4.5h6v6M19.5 4.5l-8.5 8.5M17.5 13.5v5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h5"/></symbol>
    <symbol id="i-card" viewBox="0 0 24 24"><rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="M3.5 10h17M7 14.5h3.5"/></symbol>
    <symbol id="i-filter" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></symbol>
    <symbol id="i-x" viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></symbol>
    <symbol id="i-book" viewBox="0 0 24 24"><path d="M12 6.5c-2-1.300-4.700-1.500-7.500-1v13c2.800-.5 5.500-.3 7.500 1 2-1.300 4.700-1.500 7.500-1v-13c-2.800-.5-5.500-.3-7.500 1zM12 6.500v13"/></symbol>
    <symbol id="i-left" viewBox="0 0 24 24"><path d="M14.5 5.500L8 12l6.500 6.500"/></symbol>
    <symbol id="i-right" viewBox="0 0 24 24"><path d="M9.500 5.500L16 12l-6.500 6.500"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/></symbol>
    <symbol id="i-photo" viewBox="0 0 24 24"><rect x="3.500" y="5.500" width="17" height="13" rx="1.500"/><circle cx="9" cy="10.500" r="1.600"/><path d="M4 17l5-4.500 3.500 3 3-2.500 5 4"/></symbol>
  </defs>
</svg>
<header class="top">
  <a class="brand" href="#" aria-label="${U.brandHome}">${ic('onsen').replace('class="ic"', 'class="ic mark"')}<span class="brand-txt"><strong>${U.brand}</strong><small>${U.tagline}</small></span></a>
  <nav aria-label="${U.navAria}">
    <a href="#results" aria-current="page">${ic('onsen')}${U.nav.find}</a>
    <a href="${U.href.water}">${U.nav.water}</a>
    <a href="${U.href.ryokan}">${U.nav.ryokan}</a>
    <a href="${U.href.guide}">${ic('book')}${U.nav.guide}</a>
    <a href="#pay">${ic('card')}${U.nav.pay}</a>
    <button type="button" id="favToggle" aria-pressed="false">${ic('heart')}${U.nav.fav} <span id="favCount">0</span></button>
  </nav>
  ${U.fx ? '<p id="fx" class="fx" aria-live="polite"></p>' : ''}
</header>

<section class="hero" aria-label="${U.hero.aria}">
  <img id="heroImg" src="images/gunma.jpg" alt="" width="960" height="540">
  <div class="hero-txt">
    <p class="eyebrow">${U.hero.eyebrow}</p>
    <h1>${U.brand}</h1>
    <p class="sub">${U.hero.sub}</p>
    <a class="cover-cta" href="#filters">${U.hero.cta} <span aria-hidden="true">↓</span></a>
  </div>
  <p class="hero-tate" lang="${LANG}" aria-hidden="true">${U.hero.tate}</p>
  <div class="hero-controls" role="group" aria-label="${U.hero.controls}"><button type="button" id="heroPrev" aria-label="${U.hero.prev}">‹</button><button type="button" id="heroPause">${U.hero.pause}</button><button type="button" id="heroNext" aria-label="${U.hero.next}">›</button></div>
  <small id="heroCredit" class="credit" hidden></small>
</section>

<section class="finder" aria-label="${H.searchAria}">
  <form id="heroSearch" class="hs" role="search" autocomplete="off">
    <label class="hs-region"><span class="vh">${H.regionLabel}</span><select id="hsRegion"><option value="">${H.regionAll}</option>${DATA_I18N.regions.map((r, i) => `<option value="${i}">${r[{ ko: 0, ja: 1, en: 2 }[LANG]]}</option>`).join('')}</select></label>
    <label class="hs-text"><span class="vh">${H.textLabel}</span><input id="hsText" type="search" maxlength="60" placeholder="${H.ph}" enterkeyhint="search"></label>
    <button type="submit" class="hs-go">${ic('search')}<span>${H.btn}</span></button>
  </form>
  <div class="hs-chips"><span id="hsChipsLabel">${H.chips}</span><ul id="hsChips" aria-labelledby="hsChipsLabel"></ul></div>
  ${U.fx ? '<p id="fxHero" class="hs-fx" aria-live="polite"></p>' : ''}
</section>

<section id="regions" class="regions" aria-labelledby="regions-h">
  <h2 id="regions-h">${H.regionsTitle}</h2>
  <p class="lead">${H.regionsLead}</p>
  <ul id="regionGrid" class="rg-grid" aria-label="${H.regionsAria}"></ul>
  <ul class="trust" aria-label="${H.trustAria}">${H.trust.map(([b, t]) => `<li><b>${b}</b><span>${t}</span></li>`).join('')}</ul>
</section>

<div class="shell">
  <form id="filters" class="rail" aria-label="${R.aria}">
    <details open>
      <summary>${ic('filter')}${R.title}<span id="activeCount" class="badge"></span></summary>
      <div class="rail-top"><p id="railHint"></p><button type="reset" class="link">${R.clear}</button></div>
      <section class="fbox">
        <h3>${ic('pin')}${R.map}</h3><p class="map-help">${R.mapHelp}</p><div class="map-panel"><div id="prefMap" aria-label="${R.mapAria}"></div><p id="mapStatus" class="map-help" role="status">${R.mapLoading}</p></div>
        <select name="pref" aria-label="${R.prefAria}" id="prefSel"></select>
        <select name="region" aria-label="${R.areaAria}" id="regionSel"></select>
      </section>
      <section class="fbox">
        <h3>${ic('cal')}${R.kind}</h3><label for="kindSel">${R.kindLabel}</label><select id="kindSel" name="kind"><option value="ryokan">${R.ryokan}</option><option value="hotel">${R.hotel}</option><option value="all">${R.all}</option></select><p class="map-help">${R.kindHelp}</p><h3>${R.use}</h3>
        <div class="tog2">${tog('day')}${tog('stay', true)}</div>
      </section>
      <section class="fbox">
        <h3>${ic('onsen')}${R.bath}</h3>
        <div class="pills">${pill('open')}${pill('priv')}${pill('room')}</div>
      </section>
      <section class="fbox">
        <h3>${ic('drop')}${R.water}</h3>
        <label class="rowopt lead"><input type="checkbox" name="f" value="flow"><span class="t">${U.label.flow}</span><span class="n" data-n="flow"></span></label>
        <p class="sub-h">${R.quality}</p>
        <div id="qualityBox"></div>
      </section>
      <section class="fbox">
        <h3>${ic('bed')}${R.stayCond}</h3>${flag('solo')}${flag('sudo')}
      </section>
      <section class="fbox">
        <h3>${ic('check')}${R.conv}</h3>${flag('card')}${flag('shuttle')}${flag('park')}
      </section>
      <section class="fbox">
        <h3>${ic('yen')}${R.budget} <small>${R.budgetSub}</small></h3>
        <output id="budgetOut" for="dayMax">${R.noLimit}</output>
        <input type="range" id="dayMax" name="dayMax" min="5000" max="101000" step="1000" value="101000" aria-label="${R.budgetAria}">
        <div class="ends"><span>${R.low}</span><span>${R.noLimit}</span></div><p class="map-help">${R.budgetHelp}</p>
        <div id="priceCover" class="price-cover" hidden><p id="priceCoverLine" class="map-help"></p><button type="button" class="link" id="priceCoverOnly" data-priced-only hidden></button><label class="rowopt"><input type="checkbox" id="inclUnp" name="unp" value="1" checked><span class="t">${R.unp}</span></label></div>
        <p id="fxIndic" class="map-help"></p>
      </section>
    </details>
    <button type="button" id="seeResults" class="see-results"></button>
  </form>

  <main>
    <section id="results" class="results" aria-labelledby="results-h" tabindex="-1">
      <div class="bar">
        <h2 id="results-h">${U.results.before}<span id="count">…</span>${U.results.after}</h2>
        <ul id="chips" class="chips" aria-label="${U.results.chips}"></ul>
        <label class="sort"><span class="vh">${U.results.sort}</span>
          <select id="sort"><option value="">${U.results.byName}</option><option value="price">${U.results.byPrice}</option><option value="open">${U.results.byOpen}</option></select>
        </label>
      </div>
      <p id="resultSummary" class="rsum" role="status" aria-live="polite"></p>
      <p id="npNote" class="np-note" hidden>${U.np.note}</p>
      <p class="rich-row"><button type="button" class="link" id="cmpBtn" aria-haspopup="dialog" hidden></button><button type="button" class="link" id="photoOnly" aria-pressed="false"></button><button type="button" class="link" id="priceOnly" aria-pressed="false"></button></p>
      <div class="cols">
        <div id="list" class="list"></div>
        <aside id="detail" class="detail" tabindex="-1" aria-label="${U.results.detail}"></aside>
      </div>
    </section>

    <section id="pay" class="guide" data-no="其の三" aria-labelledby="pay-h">
      <h2 id="pay-h">${U.pay.title}</h2>
      <p class="lead">${U.pay.lead}</p>
      <ul class="plain">${U.pay.items.map((t) => `<li>${t}</li>`).join('')}</ul>
    </section>
  </main>
</div>

${U.fx ? '<p id="fxFoot" class="fx-foot"></p>' : ''}<footer class="bottom">${U.footer}<a href="sources.html?lang=${LANG}">${U.sources}</a></footer>`;
})());
