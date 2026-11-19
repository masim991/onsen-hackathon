// 온천 한눈에: 추가 조사 자료 (시설 id별). 2026-11-12에 Aside 브라우저로 각 페이지를 열어 읽은 내용입니다.
// 형식: 항목 [내용, 출처]. booking [주소, 평점, 후기 수], trip [주소], jalan·rakuten 주소.
// 페이지에서 찾지 못한 항목은 넣지 않습니다(화면에 미확인으로 표시). 예약 사이트 주소는 시설 이름이 일치하는 것만 넣었습니다.
const BK = (slug, score, count) => ['https://www.booking.com/hotel/jp/' + slug + '.ko.html', score, count];
const TR = (path) => ['https://jp.trip.com/hotels/' + path + '/'];
const JL = (n) => 'https://www.jalan.net/yad' + n + '/';
const RK = (n) => `https://travel.rakuten.co.jp/HOTEL/${n}/${n}.html`;

const EXTRA = {
  14: {
    dayPrice: 2500, dayHours: '9:00~21:00 (최종 접수 18:00)', checked: '2026-11-13',
    dayUse: ['성인 ¥2,500, 수건·세금 포함. 9:00~18:00 접수, 21:00 퇴관', 'https://takimotokan.co.jp/ja/day_spa/'],
    closed: ['정기 휴일 없음. 2027년 4월 5일~15일은 점검 휴관', 'https://takimotokan.co.jp/ja/day_spa/'],
    towels: ['당일 입욕 요금에 목욕 수건과 수건이 포함됨', 'https://takimotokan.co.jp/ja/day_spa/'],
    access: ['JR 노보리베쓰역에서 노보리베쓰 온천행 버스', 'https://takimotokan.co.jp/ja/access/'],
    booking: BK('daiichi-takimotokan', 8.9, 3313), trip: TR('noboribetsu-hotel-detail-842622/dai-ichi-takimotokan'), jalan: JL(364904), rakuten: RK(30109),
  },
  646: {
    dayPrice: 2500, dayHours: '14:00~18:00 (최종 입장 15:00)', openStatus: 'y', privStatus: 'y', checked: '2026-11-13',
    dayUse: ['당일 입욕 성인 ¥2,500 (세금 포함), 일부 성수기 휴무. 시간대별 이용 가능한 대욕장이 다릅니다.', 'https://www.tsuruga.com/dayplan/'],
    privateBath: ['가족탕 예약 및 이용 가능 대상은 공식 안내 확인', 'https://www.tsuruga.com/faq/'],
    closed: ['당일 플랜은 성수기에 쉬는 날이 있음', 'https://www.tsuruga.com/dayplan/'],
    towels: ['당일 플랜에 수건 대여 포함', 'https://www.tsuruga.com/dayplan/'],
    access: ['유료 송영 버스 "아칸코 익스프레스" 운행 (2026년 10월 1일~2027년 3월 31일)', 'https://www.tsuruga.com/'],
    booking: BK('akan-yukyuno-sato-tsuruga', 8.6, 883), trip: TR('kushiro-hotel-detail-1098665/akan-yuku-no-sato-tsuruga'), rakuten: RK(40045),
  },
  1772: {
    checked: '2026-11-13', dayUse: ['8:00~19:00 (최종 접수 18:30), 성인 ¥1,000. 부정기 휴무', 'https://www.ryounkaku.jp/daytriponsen'],
    closed: ['부정기 휴무. 당일 입욕 최종 접수 18:30', 'https://www.ryounkaku.jp/daytriponsen'],
    towels: ['수건 판매 ¥250, 목욕 수건 대여 ¥300', 'https://www.ryounkaku.jp/daytriponsen'],
    payment: ['신용카드 사용 가능', 'https://www.ryounkaku.jp/%E3%82%88%E3%81%8F%E3%81%82%E3%82%8B%E3%81%94%E8%B3%AA%E5%95%8F'],
    access: ['JR 가미후라노역에서 마을버스로 40분', 'https://www.ryounkaku.jp/access'],
    trip: TR('kami-furano-hotel-detail-4976801/ryounkaku'), jalan: JL(399072), rakuten: RK(79494),
  },
  22: { dayPrice: null, dayHours: '', checked: '2026-11-13', dayUse: ['공식 표기를 내건 두 사이트의 계절별 시간이 달라 요금과 영업시간을 전화로 확인해 주세요. 기존 협회 요금은 표시하지 않습니다.', 'https://goshikionsen.com/price'], more: [['다른 시설 안내 사이트는 당일 성인 ¥800과 다른 겨울 운영 시간을 안내합니다. 동일 전화번호이나 최신 안내가 불명확합니다.', 'https://nisekogoshikionsen.com/room_price/']], trip: TR('niseko-hotel-detail-49457379/niseko-goshiki-onsen-ryokan'), jalan: JL(349293), rakuten: RK(69255) },
  110: {
    checked: '2026-11-13', dayUse: ['당일 입욕 성인 ¥700. 월요일은 청소로 휴무이며 공휴일이면 가까운 평일로 변경', 'https://www.tsurunoyu.com/FONDMENT/t-onsen.html'],
    towels: ['수건 판매 ¥200', 'https://www.tsurunoyu.com/FONDMENT/t-onsen.html'],
    access: ['송영차가 "아르파 고마쿠사" 버스 정류장까지 마중. 송영은 이 구간만 운행', 'https://www.tsurunoyu.com/FONDMENT/t-ko-tu.html'],
    trip: ['https://hk.trip.com/hotels/semboku-hotel-detail-23202085/tsurunoyu'],
  },
  113: {
    closed: ['2026년 11월 11일~14일 오전 10시까지 전관 휴관 공지', 'https://www.doroyu.com/'],
    access: ['송영 없음. JR 유자와역에서 대중교통 이용', 'https://www.doroyu.com/access/access.html'],
    trip: TR('yuzawa-hotel-detail-21830269/okuyama-ryokan'), jalan: JL(347284), rakuten: RK(141266),
  },
  1352: {
    dayStatus: 'u', dayPrice: null, dayHours: '', checked: '2026-11-13',
    dayUse: ['당일 입욕 가능 여부를 다시 확인해 주세요. 기존 안내와 협회 자료가 달라 요금·시간을 표시하지 않습니다.', 'https://motoyukurabu.jp/'],
    access: ['JR 유자와역에서 "오야스 온천행" 버스로 약 1시간, "모토유" 정류장에서 도보 1분', 'https://www.akita-tourism.com/member/content/193'],
    trip: TR('yuzawa-1-hotel-detail-17505191/motoyu-kurabu'), jalan: JL(369366), rakuten: RK(161215),
    more: [['식사는 1층 식당에서 함께 먹는 방식', 'https://motoyukurabu.jp/his.html']],
  },
  1615: {
    dayHours: '11:00~18:00 (최종 접수 17:00)', checked: '2026-11-13',
    dayUse: ['당일 입욕 성인 ¥650, 대절 노천탕은 숙박객 전용', 'https://syohoen.net/'],
    closed: ['당일 입욕은 연중무휴로 안내됨. 점검 휴관은 공식 사이트에 따로 공지', 'https://www.jalan.net/kankou/spt_05212cd2112034977/'],
    access: ['JR 미네요시카와역에서 차로 약 6분, 오마가리역에서 약 30분. 아키타 공항에서 차로 16분. 송영 있음', 'https://daisenkankou.com/near/shohoen'],
    booking: BK('syohoen', 7.3, 3), trip: TR('daisen-hotel-detail-2326924/syohoen'), jalan: JL(390270), rakuten: RK(106118),
    more: [['주차장 무료 20대', 'https://daisenkankou.com/near/shohoen'], ['객실에 수건, 목욕 수건, 유카타, 칫솔 비치', 'https://daisenkankou.com/near/shohoen']],
  },
  302: {
    checked: '2026-11-13', dayPrice: 1500, dayHours: '10:00~16:30 (최종 접수 16:00)',
    dayUse: ['당일 입욕은 다카라가와 산소에서 접수. 성인 ¥1,500, 이용 4시간, 전용 입욕복 포함', 'https://www.takaragawa.com/higaeri.html'],
    closed: ['노천탕과 정원은 연중무휴. 2026년 12월 7일~9일은 휴관', 'https://www.takaragawa.com/higaeri.html'],
    towels: ['목욕 수건 대여 ¥100, 수건 판매 ¥200', 'https://www.takaragawa.com/higaeri.html'],
    access: ['열차로 오는 숙박객은 무료 송영(예약 필요). 당일 입욕객 송영은 없음', 'https://www.takaragawa.com/kotu.html'],
    booking: BK('takaragawa-onsen-ousenkaku', 8.9, 2296), trip: TR('minakami-hotel-detail-704245/takaragawa-onsen-ousenkaku'), jalan: JL(312746), rakuten: RK(67818),
  },
  295: {
    dayStatus: 'y', dayPrice: 1150, dayHours: '7:00~10:00, 15:00~24:00 (최종 접수 22:00)', dayNote: '성인 평일 ¥1,150, 주말·공휴일 ¥1,400, 성수기 ¥1,600. 세금 포함', checked: '2026-11-13',
    dayUse: ['당일 입욕은 예약 불필요. 수건 대여 별도 ¥330, 혼잡 시 입장 제한 가능', 'https://www.ooedoonsen.jp/matsunoi/day_trip/'],
    trip: TR('minakami-hotel-detail-3172031/minakami-onsen-matsunoi'), jalan: JL(311528), rakuten: RK(9290),
    more: [['2026년 8월 7일 "오에도 온천 모노가타리 Premium 마쓰노이"로 재개업. 협회 자료는 이전 운영 때의 값일 수 있음', 'https://www.jalan.net/yad311528/']],
  },
  300: {
    payment: ['신용카드 결제 가능', 'https://www.ryokan-tanigawa.com/facility/'],
    access: ['조에쓰 신칸센 조모코겐역에서 노선버스 약 25분, 미나카미역에서 송영차 약 10분', 'https://www.ryokan-tanigawa.com/access/'],
    trip: TR('minakami-hotel-detail-705852/ryokan-tanigawa'), jalan: JL(318211), rakuten: RK(6999),
  },
  1388: {
    access: ['노선버스로 미나카미역까지 온 뒤 역에서 송영을 받거나 택시 이용', 'https://minakamisansou.co.jp/access.html'],
    booking: BK('minakamisansou', 9.1, 164), trip: TR('minakami-hotel-detail-1660592/minakamisansou'), jalan: JL(315612), rakuten: RK(134873),
  },
  241: {
    closed: ['매주 수요일 오후~목요일 오전 휴관', 'http://www.myogaya.com/'],
    towels: ['당일 입욕은 수건 지참', 'http://www.myogaya.com/onsen.stm'],
    trip: TR('nasushiobara-hotel-detail-1662517/myogaya-honkan'), jalan: JL(303687), rakuten: RK(20095),
  },
  247: {
    roomCount: 13, checked: '2026-11-13',
    more: [['공식 사이트에 노천탕이 딸린 객실 13실로 안내됩니다.', 'https://www.matsuya.org/']],
    closed: ['월별 휴관일을 공식 사이트에 공지', 'https://www.matsuya.org/'],
    trip: TR('nasushiobara-hotel-detail-1662431/shofuro-matsuya'), jalan: JL(342575), rakuten: RK(2634),
  },
  223: {
    closed: ['연 65~70일 휴관, 매년 약 2주의 장기 휴관이 있음', 'https://www.itamuro-daikokuya.com/recruit/'],
    access: ['송영 택시 편 운행', 'https://www.itamuro-daikokuya.com/access/'],
    booking: BK('itamuro-onsen-daikokuya', 9.1, 177), trip: TR('nasushiobara-hotel-detail-8499542/itamuro-onsen-daikokuya'), jalan: JL(302048), rakuten: RK(153309),
  },
  474: { dayStatus: 'u', stayStatus: 'u', dayPrice: null, dayHours: '', hideBooking: true, checked: '2026-11-13', notice: ['하코네 온천 여관협회는 휴업 중으로 표시합니다. 시설 공식 사이트는 확인되지 않아 예약 전 운영 여부를 확인해 주세요.', 'https://www.hakone-ryokan.or.jp/search/00496/'] },
  1581: {
    dayHours: '',
    closed: ['2027년 2월 21일~26일 법정 전기 점검으로 휴관', 'https://www.yumotofujiya.jp/'],
    checked: '2026-11-13',
    dayUse: ['점심 식사 포함 플랜의 입욕은 13:00~20:00, 수건 포함·재입장 불가. 대욕장만 이용 시 예약 불필요; 12월 30일~1월 3일 당일 입욕 휴업', 'https://www.yumotofujiya.jp/recommend/01.html'],
    towels: ['당일 입욕에 목욕 수건과 수건 포함', 'https://www.yumotofujiya.jp/recommend/01.html'],
    access: ['하코네 등산철도 하코네유모토역에서 도보 3분', 'https://www.yumotofujiya.jp/'],
    booking: BK('yumoto-fujiya', 8.9, 3164), trip: TR('hakone-hotel-detail-704279/yumoto-fujiya-hotel'), jalan: JL(328838), rakuten: RK(1729),
  },
  478: { trip: TR('hakone-hotel-detail-2890059/kansuiro-hakone'), jalan: JL(310837), rakuten: RK(31015) },
  483: { dayPrice: null, dayHours: '', checked: '2026-11-13', dayUse: ['입욕만 단독 이용은 불가하며 스파 시술 예약 조건이 있습니다. 금액과 예약 조건은 공식 안내를 확인해 주세요.', 'https://www.hakoneginyu.co.jp/user01/ginyuspa_menu.pdf?250901='], trip: TR('hakone-hotel-detail-1642045/hakone-ginyu'), rakuten: RK(38490) },
  1128: {
    dayPrice: null, dayHours: '', checked: '2026-11-13',
    privateBath: ['당일 대절탕 60분 ¥9,900, 90분 ¥13,200. 최대 4명, 입탕세 별도', 'https://goshoboh.com/spa/'],
    access: ['아리마온천역에서 연락하면 마중. 오후 6시까지는 주차장에서 숙소까지 송영', 'https://goshoboh.com/access/'],
    booking: BK('tosen-goshobo', 9.3, 857),
  },
  1131: {
    towels: ['수건 ¥400, 목욕 수건 대여 ¥300', 'https://www.kadonobou.com/'],
    access: ['고베전철 아리마온천역에서 5~7분. 역과 버스 정류장, 로프웨이역에서 차량 송영', 'https://www.kadonobou.com/access/'],
  },
  1129: {
    closed: ['휴관일은 공식 사이트에 공지', 'https://www.arima-gh.jp/'],
    towels: ['당일 입욕에 목욕 수건과 수건 제공', 'https://www.arima-gh.jp/etc/dayuse'],
    access: ['무료 송영 셔틀버스 8:00~21:00. 오사카역·교토역에서 고속버스로 40분 정도', 'https://www.arima-gh.jp/etc/access'],
    booking: BK('arima-grand', 9.2, 196),
    more: [['당일 요금에 소비세, 입탕세, 서비스료 포함. 연말연시·골든위크·오봉 기간은 휴일 요금', 'https://www.arima-gh.jp/etc/dayuse']],
  },
  1135: {
    dayPrice: null, dayHours: '11:00~14:30 (최종 접수 14:00)', checked: '2026-11-13',
    dayUse: ['공식 온천 페이지는 ¥1,300, FAQ는 ¥1,100으로 달라 요금을 확인해 주세요. 수건 포함, 목요일·연말연시와 휴관일 이용 불가', 'https://www.arima-gyoen.co.jp/spa/'],
    closed: ['당일 입욕은 목요일과 연말연시에 쉼. 그 밖의 휴관일은 공식 달력 참고', 'https://www.arima-gyoen.co.jp/spa/'],
    towels: ['대욕장에 샴푸, 린스, 바디워시, 드라이어 비치. 숙박객은 객실 수건을 가져감', 'https://www.arima-gyoen.co.jp/spa/'],
    access: ['산노미야역에서 JR 고속버스가 편리', 'https://www.arima-gyoen.co.jp/access/'],
    booking: BK('arima-gyoen', 8.8, 98),
  },
  1512: {
    dayPrice: 700, dayHours: '7:30~19:30 (최종 접수 19:00)', checked: '2026-11-13',
    dayNote: '증기탕 중학생 이상 ¥700. 2026년 10월 1일~2027년 1월 31일은 변경된 시간 적용',
    dayUse: ['2027년 1월 31일까지 7:30~19:30 (최종 접수 19:00). 이후 운영 시간은 공식 안내 확인', 'https://www.city.beppu.oita.jp/sisetu/shieionsen/detail11.html'],
    closed: ['휴업일은 벳푸시 온천 휴업일 달력에 공지', 'https://www.city.beppu.oita.jp/sisetu/shieionsen/detail11.html'],
    towels: ['목욕 수건 대여 있음', 'https://www.city.beppu.oita.jp/sisetu/shieionsen/detail11.html'],
    access: ['JR 벳푸역에서 간나와 방면으로 차로 약 15분', 'https://www.city.beppu.oita.jp/sisetu/shieionsen/detail11.html'],
  },
  1293: { towels: ['목욕 수건, 수건, 샴푸, 린스 비치', 'https://www.shiragiku.co.jp/onsen/'] },
  1412: { access: ['숙박객은 체크인·체크아웃 때 유후인역과 숙소 사이 무료 송영', 'https://www.saigakukan.co.jp/'] },
  1348: {
    access: ['하카타역에서 약 150분, 구마모토역에서 약 140분', 'https://www.yusai.com/access.html'],
    booking: BK('tang-xia-noxiang-ki-you-cai', 8.7, 644),
  },
  1347: {
    dayStatus: 'u', dayPrice: null, dayHours: '', checked: '2026-11-13',
    dayUse: ['현재 당일 입욕의 시간과 요금은 공식 사이트에 확인해 주세요. 숙박객 전용 대절탕은 50분 ¥2,500입니다.', 'https://hotel.senomoto.com/spa/'],
    booking: ['https://www.booking.com/hotel/jp/sanai-kogen.ko.html'], trip: ['https://hk.trip.com/hotels/minamioguni-hotel-detail-4625349/sanai-kogen-hotel'], jalan: JL(320148), rakuten: RK(37963),
    more: [['예약 사이트에는 "세노모토 고원 호텔(瀬の本高原ホテル)"이라는 이름으로 올라 있음', 'https://www.jalan.net/yad320148/']],
  },
  o1: { access: ['JR 마쓰야마역과 마쓰야마시역에서 가는 방법 안내', 'https://dogo.jp/access'] },
  o2: {
  },
  o3: {
    checked: '2026-11-13',
    dayUse: ['대욕장 평일 10:00~20:00 (최종 19:00), 토·휴일 10:00~21:00 (최종 20:00)', 'https://www.hakoneyuryo.jp/price/'],
    privateBath: ['120분 1실 평일 ¥10,400부터. 온라인 예약은 이용 1개월 전부터 전날 15시까지; 대욕장은 별도 요금', 'https://www.hakoneyuryo.jp/price/'],
    closed: ['점검 휴관: 2026년 12월 1일~3일. 방문 전 최신 공지 확인', 'https://www.hakoneyuryo.jp/price/'],
    access: ['하코네유모토역에서 무료 송영 버스로 3분', 'https://www.hakoneyuryo.jp/'],
  },
  o4: {
    towels: ['수건, 목욕 수건, 면도기, 칫솔 판매. 평일 한정 수건 포함 2관권도 있음', 'https://arimaspa-kingin.jp/kin-01.htm'],
    payment: ['캐시리스 결제 취급', 'https://arimaspa-kingin.jp/kin-01.htm'],
  },
  o5: {
    checked: '2026-11-13',
    dayUse: ['대욕장 성인 ¥1,160. 모래찜질은 대욕장과 함께 이용하며 별도 요금', 'https://www.hyotan-onsen.com/price/index.html'],
    privateBath: ['가족탕 60분 ¥2,400부터 (성인 3명 기준). 이용 1주 전부터 전화 예약 가능', 'https://www.hyotan-onsen.com/price/index.html'],
    closed: ['연중무휴. 다만 연 몇 차례 휴업일이 있어 전화 확인을 권함', 'https://www.hyotan-onsen.com/faq/index.html'],
    towels: ['수건 판매 ¥250, 목욕 수건 대여 ¥200. FAQ와 요금표 금액이 달라 방문 전 확인', 'https://www.hyotan-onsen.com/price/index.html'],
    access: ['벳푸 IC에서 10분, 벳푸역에서 버스로 25분', 'https://www.hyotan-onsen.com/'],
  },
  o6: {
    dayHours: '10:30~15:00 (최종 접수 14:00)', checked: '2026-11-13',
    dayUse: ['당일 입욕 성인 ¥1,000, 화요일 정기 휴무', 'https://taenoyu.com/bath/'],
    privateBath: ['당일 대절탕 11:00~15:00, 1시간 ¥3,300. 전화 예약', 'https://taenoyu.com/bath/'],
    payment: ['신용카드 VISA, MASTER, JCB, AMEX 사용 가능', 'https://taenoyu.com/stay/'],
    trip: ['https://www.trip.com/hotels/senboku-hotel-detail-22421896/nyuto-onsen-kyo-taenoyu'],
  },
  o7: {
    closed: ['2026년 휴관일은 11월 16일~18일', 'https://sukayu.jp/information1/'],
    towels: ['입욕권에 수건 포함. 12월 1일부터는 대여 목욕 수건과 가져가는 수건 포함', 'https://sukayu.jp/information2/'],
    access: ['무료 송영 버스 운행(약 60분). 아오모리~스카유 구간은 JR 버스가 연중 운행', 'https://sukayu.jp/access/'],
    trip: ['https://us.trip.com/hotels/aomori-hotel-detail-1652546/sukayu-onsen-ryokan'], jalan: JL(397533), rakuten: RK(41009),
  },
};

// 2차 조사(검색으로 찾은 예약 사이트 주소). 시설 이름이 일치하는 페이지만 넣었습니다.
Object.entries({
  1128: { trip: TR('kobe-hotel-detail-1489165/tocen-goshoboh-arima-kobe'), jalan: JL(382371), rakuten: RK(80572) },
  1131: { booking: BK('kadonobo'), jalan: JL(335884), rakuten: RK(7140) },
  1129: { trip: TR('kobe-hotel-detail-1646996/arima-grand-hotel'), jalan: JL(313952), rakuten: RK(25128) },
  1135: { trip: TR('kobe-hotel-detail-2643165/arima-gyoen'), jalan: JL(316077), rakuten: RK(1206) },
  1293: { booking: BK('shiragiku'), trip: TR('beppu-hotel-detail-706136/hotel-shiragiku'), jalan: JL(367692), rakuten: RK(12660) },
  1305: { trip: TR('yufu-hotel-detail-1652227/yufuin-tamanoyu-oita'), rakuten: RK(180079) },
  1412: { trip: TR('yufu-hotel-detail-706154/saigakukan'), jalan: JL(334081), rakuten: RK(20453) },
  1348: { jalan: JL(311270), rakuten: RK(31796) },
  1401: { booking: BK('ryokan-ichinoi'), trip: TR('minamioguni-hotel-detail-3289414/kurokawa-onsen-ryokan-ichinoi'), jalan: JL(321395), rakuten: RK(163005) },
  1399: { trip: TR('minamioguni-hotel-detail-6706850/kurokawa-so'), jalan: JL(313725), rakuten: RK(56843) },
  1347: { booking: BK('sanai-kogen'), trip: TR('minamioguni-hotel-detail-4625349/sanai-kogen-hotel') },
  o6: { trip: TR('senboku-hotel-detail-22421896/nyuto-onsen-kyo-taenoyu') },
  o7: { trip: TR('aomori-hotel-detail-1652546/sukayu-onsen-ryokan') },
}).forEach(([id, v]) => Object.assign(EXTRA[id] ||= {}, v));