// Wikimedia Commons 원본별 저자와 라이선스 확인 후 저장한 사진.
Object.assign(LOCAL_PHOTOS, {
  "4/4d/Dorou_spa_Okuyamaryokan_roten.jpg": "images/commons-added-10449455.jpg",
  "4/42/Kurokawa_Onsen_-%E6%B8%A9%E6%B3%89%E8%A1%97.jpg": "images/commons-added-15027269.jpg",
  "a/a9/Minakami_hotsprong_Matunoi.JPG": "images/commons-added-22801213.jpg",
  "b/bc/Kowakubi_Onsen_Shohoen.jpg": "images/commons-added-74798863.jpg",
  "b/b0/Spa_Sandogoya%2C_Nasushiobara%2C_Tochigi.jpg": "images/commons-added-22854189.jpg",
  "a/a1/Lake_Kinrin_with_Morning_fog.jpg": "images/commons-added-46236711.jpg",
  "9/95/%E8%B0%B7%E5%B7%9D%E6%B8%A9%E6%B3%89_-_panoramio.jpg": "images/commons-added-52724230.jpg",
  "a/ad/Tonosawa_onsen_-_Hakone.jpg": "images/commons-added-53733599.jpg",
  "f/f0/%E8%8D%89%E6%B4%A5%E3%83%BB%E8%A5%BF%E3%81%AE%E6%B2%B3%E5%8E%9F%E5%85%AC%E5%9C%92_-_panoramio.jpg": "images/commons-added-56482245.jpg",
  "1/10/Hakone_yumoto_onsen_2.jpg": "images/commons-added-58130210.jpg",
  "5/57/Dogo_Onsen_Honkan_%28Main_building%29%2C_%E9%81%93%E5%BE%8C%E6%B8%A9%E6%B3%89_%E6%9C%AC%E9%A4%A8_-_panoramio.jpg": "images/commons-added-58591342.jpg",
  "d/de/View_of_Beppu_20170217.jpg": "images/commons-added-91078634.jpg",
  "c/cd/2020-02-24_Kannawa_Onsen_%E9%89%84%E8%BC%AA%E6%B8%A9%E6%B3%89%E5%85%A8%E6%99%AF_DSCF8631.jpg": "images/commons-added-93478351.jpg",
  "b/b5/%E6%9C%89%E9%A6%AC%E6%B8%A9%E6%B3%89_06.JPG": "images/commons-added-107593136.jpg",
  "3/30/Hataori_Onsen_Town.jpg": "images/commons-added-161082135.jpg",
  "1/10/Noboribetsu_hot_spring_jigokudani_20130503.jpg": "images/noboribetsu.jpg",
  "4/45/Noboribetsu_hot_spring_resort01.JPG": "images/commons-868e0a4d75b2b9ab.jpg",
  "a/af/Oyunuma_Pond%2C_Noboribetsu_Onsen%2C_Hokkaido%2C_April_2023_01.jpg": "images/commons-672da45592dc8152.jpg",
  "e/ed/Mt._Oakan_from_Akanko_spa.JPG": "images/commons-f0bdefdcdcd53440.jpg",
  "7/7c/Akanko_Onsen_20140809.jpg": "images/commons-96a068c4d6055c41.jpg",
  "3/3c/Bokke_%28Akanko_Onsen%29_02.JPG": "images/commons-d66550aba524c651.jpg",
  "1/14/Akanko_Onsen-gai.JPG": "images/commons-3c60b745ab346030.jpg",
  "4/41/Kamihoroso_roten.JPG": "images/tokachi.jpg",
  "8/84/Tokachidake-bogakudai_%E5%8D%81%E5%8B%9D%E5%B2%B3%E6%9C%9B%E5%B2%B3IMG_1192.jpg": "images/commons-e3b7437917002156.jpg",
  "5/5d/Tokachidake_Onsen.JPG": "images/commons-2f969e9bfb5e8161.jpg",
  "9/99/Goshiki_spa_roten.JPG": "images/commons-dfa801ad7c21fa1e.jpg",
  "d/dd/%E4%BA%94%E8%89%B2%EF%BC%88Goshiki%29_-_panoramio.jpg": "images/commons-d3cd3e380bf109db.jpg",
  "a/ac/Goshiki_spa_town.JPG": "images/commons-1412266a66eb0786.jpg",
  "c/ca/Tsurunoyu_onsen_rotenburo.JPG": "images/commons-8e32179004be364d.jpg",
  "2/2d/Oyasu-ky%C5%8D%2C_19_May_2013%2C_02.jpg": "images/commons-7fa2c8bb2ff5fcb0.jpg",
  "b/b5/Gunma_hot_springs_2017.jpg": "images/gunma.jpg",
  "f/fe/%E9%85%B8%E3%83%B6%E6%B9%AF%E6%B8%A9%E6%B3%89_Sukayu_onsen_%28Hot_Spring%29_-_panoramio.jpg": "images/commons-25ef84e78d149db3.jpg"
});

// 원본을 그대로 보관한 지역 사진: 원본 페이지에 저작자와 라이선스 전문을 연결합니다.
PHOTOS.doroyu.shots[0][3] = { source: 'https://commons.wikimedia.org/wiki/File:Dorou_spa_Okuyamaryokan_roten.jpg', credit: 'Soica2001 · Public domain', kind: 'area' };
PHOTOS.kurokawa.shots[0][3] = { source: 'https://commons.wikimedia.org/wiki/File:Kurokawa_Onsen_-%E6%B8%A9%E6%B3%89%E8%A1%97.jpg', credit: 'hiroooooki · CC BY 2.0', kind: 'area' };
PHOTOS.minakami.shots[0][3] = { source: 'https://commons.wikimedia.org/wiki/File:Minakami_hotsprong_Matunoi.JPG', credit: 'NY066 · CC BY-SA 3.0', kind: 'area' };

// Commons metadata verified; these local copies were resized for display.
for (const key of ['kowakubi', 'sando', 'yufuin', 'tanigawa', 'tonosawa', 'kusatsu', 'yumoto', 'dogo', 'beppu', 'kannawa', 'arima', 'shiobara']) {
  const shot = PHOTOS[key].shots.find(item => LOCAL_PHOTOS[item[0]]);
  if (shot) shot[3] = { source: `https://commons.wikimedia.org/wiki/File:${shot[0].split('/').pop()}`, credit: `${shot[1]} · ${shot[2]}`, kind: 'area', resized: true };
}
// 같은 온천지의 사진으로, 시설 자체의 사진은 아닙니다.
Object.assign(IM_FIX, {
  'add-gozanoyu': 'kusatsu',
  'add-tsubaki': 'dogo',
  'add-takegawara': 'beppu',
  'ryokan-research-10': 'kurokawa'
});

// 미사사 온천가와 야마나카 온천의 지역 풍경이며 료칸 자체의 사진은 아닙니다.
PHOTOS.misasaArea = { cap: '미사사 온천가와 미토쿠강 풍경', shots: [['b/b6/Misasa_onsen_kawaranoyu_202106.jpg', '三塚', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Misasa_onsen_kawaranoyu_202106.jpg', credit: '三塚 · CC BY-SA 4.0', kind: 'area', resized: true }]] };
PHOTOS.yamanakaArea = { cap: '야마나카 온천의 야마나카자', shots: [['9/92/Yamanaka_Onsen.JPG', 'Kakidai', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Yamanaka_Onsen.JPG', credit: 'Kakidai · CC BY-SA 4.0', kind: 'area', resized: true }]] };
LOCAL_PHOTOS['b/b6/Misasa_onsen_kawaranoyu_202106.jpg'] = 'images/commons-added-112366415.jpg';
LOCAL_PHOTOS['9/92/Yamanaka_Onsen.JPG'] = 'images/commons-added-36934958.jpg';
IM_FIX['ryokan-research-6'] = 'misasaArea';
IM_FIX['ryokan-nov13-5'] = 'yamanakaArea';

// 동일 온천지의 풍경. 시설 사진으로 오인하지 않도록 지역 사진으로 표시합니다.
PHOTOS.ureshinoArea = { cap: '우레시노 온천가 혼도리 거리', shots: [['c/c4/Ureshino_Onsen_Hondori_20230610_01.jpg', 'Peka', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Ureshino_Onsen_Hondori_20230610_01.jpg', credit: 'Peka · CC BY-SA 4.0', kind: 'area', resized: true }]] };
PHOTOS.hijioriArea = { cap: '히지오리 온천가 풍경', shots: [['5/5a/Hijiori_onsen_1.jpg', 'Totti', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Hijiori_onsen_1.jpg', credit: 'Totti · CC BY-SA 4.0', kind: 'area', resized: true }]] };
PHOTOS.asamaArea = { cap: '아사마 온천가 풍경', shots: [['d/da/%E6%B5%85%E9%96%93%E6%B8%A9%E6%B3%89%E8%A1%97_-_panoramio.jpg', 'mapplefan8', 'CC BY-SA 3.0', { source: 'https://commons.wikimedia.org/wiki/File:%E6%B5%85%E9%96%93%E6%B8%A9%E6%B3%89%E8%A1%97_-_panoramio.jpg', credit: 'mapplefan8 · CC BY-SA 3.0', kind: 'area', resized: true }]] };
PHOTOS.besshoArea = { cap: '벳쇼 온천 풍경', shots: [['c/c0/Bessho_Onsen_01.JPG', 'Abasaa', 'Public domain', { source: 'https://commons.wikimedia.org/wiki/File:Bessho_Onsen_01.JPG', credit: 'Abasaa · Public domain', kind: 'area', resized: true }]] };
PHOTOS.matsushiroArea = { cap: '마쓰시로 온천 마쓰시로소', shots: [['6/6e/Matsushiro_Onsen_Kokuminshukusha_Matsushirosou.jpg', 'Qurren', 'CC BY-SA 3.0', { source: 'https://commons.wikimedia.org/wiki/File:Matsushiro_Onsen_Kokuminshukusha_Matsushirosou.jpg', credit: 'Qurren · CC BY-SA 3.0', kind: 'area', resized: true }]] };
Object.assign(LOCAL_PHOTOS, {
  'c/c4/Ureshino_Onsen_Hondori_20230610_01.jpg': 'images/commons-added-134862714.jpg',
  '5/5a/Hijiori_onsen_1.jpg': 'images/commons-added-159361798.jpg',
  'd/da/%E6%B5%85%E9%96%93%E6%B8%A9%E6%B3%89%E8%A1%97_-_panoramio.jpg': 'images/commons-added-54388999.jpg',
  'c/c0/Bessho_Onsen_01.JPG': 'images/commons-added-37270702.jpg',
  '6/6e/Matsushiro_Onsen_Kokuminshukusha_Matsushirosou.jpg': 'images/commons-added-54708946.jpg'
});
Object.assign(IM_FIX, {
  'ryokan-nov13-1': 'ureshinoArea', 'ryokan-nov13-2': 'ureshinoArea', 'ryokan-nov13-3': 'ureshinoArea', 'ryokan-nov13-4': 'ureshinoArea', 'survey-22': 'ureshinoArea',
  'ryokan-research-8': 'hijioriArea', 'ryokan-research-2': 'asamaArea', 'ryokan-research-7': 'besshoArea', 'survey-1': 'matsushiroArea'
});

PHOTOS.takeoArea = { cap: '다케오 온천의 모토유와 신관', shots: [['7/75/Takeo_Onsen_Motoyu_and_Shinkan.jpg', 'STA3816', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Takeo_Onsen_Motoyu_and_Shinkan.jpg', credit: 'STA3816 · CC BY-SA 4.0', kind: 'area', resized: true }]] };
PHOTOS.tamatsukuriArea = { cap: '다마쓰쿠리 온천가 전경', shots: [['4/45/Tamatsukuri_Onsen_Panoramic_view.JPG', 'Mti', 'CC BY-SA 3.0', { source: 'https://commons.wikimedia.org/wiki/File:Tamatsukuri_Onsen_Panoramic_view.JPG', credit: 'Mti · CC BY-SA 3.0', kind: 'area', resized: true }]] };
PHOTOS.shirahamaArea = { cap: '시라하마 온천 풍경', shots: [['6/6b/131221_Shirahama_Onsen_Shirahama_Wakayama_pref_Japan01s3.jpg', '663highland', 'CC BY 2.5', { source: 'https://commons.wikimedia.org/wiki/File:131221_Shirahama_Onsen_Shirahama_Wakayama_pref_Japan01s3.jpg', credit: '663highland · CC BY 2.5', kind: 'area', resized: true }]] };
PHOTOS.toguraArea = { cap: '도구라카미야마다 온천과 지쿠마강', shots: [['6/60/Togura_Kamiyamada_Onsen.jpg', 'Apple2000', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Togura_Kamiyamada_Onsen.jpg', credit: 'Apple2000 · CC BY-SA 4.0', kind: 'area', resized: true }]] };
PHOTOS.zaoArea = { cap: '자오 온천 입구', shots: [['4/43/Zaou.jpg', 'Soica2001', 'Public domain', { source: 'https://commons.wikimedia.org/wiki/File:Zaou.jpg', credit: 'Soica2001 · Public domain', kind: 'area', resized: true }]] };
PHOTOS.narukoTakinoyu = { cap: '나루코 온천 다키노유', shots: [['1/1e/Naruko_TakiNoYu_Large.JPG', 'Jpatokal', 'CC BY-SA 3.0', { source: 'https://commons.wikimedia.org/wiki/File:Naruko_TakiNoYu_Large.JPG', credit: 'Jpatokal · CC BY-SA 3.0', kind: 'facility', resized: true }]] };
Object.assign(LOCAL_PHOTOS, {
  '7/75/Takeo_Onsen_Motoyu_and_Shinkan.jpg': 'images/commons-added-45217769.jpg',
  '4/45/Tamatsukuri_Onsen_Panoramic_view.JPG': 'images/commons-added-30436662.jpg',
  '6/6b/131221_Shirahama_Onsen_Shirahama_Wakayama_pref_Japan01s3.jpg': 'images/commons-added-30451173.jpg',
  '6/60/Togura_Kamiyamada_Onsen.jpg': 'images/commons-added-44385171.jpg',
  '4/43/Zaou.jpg': 'images/commons-added-10420586.jpg',
  '1/1e/Naruko_TakiNoYu_Large.JPG': 'images/commons-added-23236890.jpg'
});
Object.assign(IM_FIX, {
  'survey-25': 'takeoArea', 'survey-26': 'takeoArea', 'survey-27': 'takeoArea',
  'add-tama-yuuyu': 'tamatsukuriArea', 'ryokan-research-11': 'tamatsukuriArea',
  'add-sakinoyu': 'shirahamaArea', 'ryokan-research-13': 'shirahamaArea',
  'ryokan-research-9': 'toguraArea', 'add-zao-roten': 'zaoArea', 'add-takinoyu': 'narukoTakinoyu'
});
PHOTOS.sabakoyuFacility = { cap: '이이자카 온천 사바코유 외관', shots: [['a/ab/Exterior_Shot_of_Sabakoyu_Onsen.jpg', 'Brian Adler', 'Public domain', { source: 'https://commons.wikimedia.org/wiki/File:Exterior_Shot_of_Sabakoyu_Onsen.jpg', credit: 'Brian Adler · Public domain', kind: 'facility' }]] };
LOCAL_PHOTOS['a/ab/Exterior_Shot_of_Sabakoyu_Onsen.jpg'] = 'images/commons-added-2254003.jpg';
IM_FIX['add-sabako'] = 'sabakoyuFacility';

// Wikimedia Commons 원본과 라이선스를 확인한 사진. 지역 사진은 시설과 구분해 표시합니다.
PHOTOS.katakurakanFacility = { cap: '가미스와 片倉館 외관', shots: [['7/77/130606_Katakurakan_Kamisuwa_Onsen_Japan01s.jpg', '663highland', 'CC BY 2.5', { source: 'https://commons.wikimedia.org/wiki/File:130606_Katakurakan_Kamisuwa_Onsen_Japan01s.jpg', credit: '663highland · CC BY 2.5', kind: 'facility', resized: true }]] };
PHOTOS.kuramaArea = { cap: '구라마 온천 풍경', shots: [['c/c0/%E3%81%8F%E3%82%89%E3%81%BE%E6%B8%A9%E6%B3%89_-_panoramio.jpg', 'YOSHIFUMI OGISO', 'CC BY-SA 3.0', { source: 'https://commons.wikimedia.org/wiki/File:%E3%81%8F%E3%82%89%E3%81%BE%E6%B8%A9%E6%B3%89_-_panoramio.jpg', credit: 'YOSHIFUMI OGISO · CC BY-SA 3.0', kind: 'area', resized: true }]] };
PHOTOS.yunogoArea = { cap: '유노고 온천가의 사기유 공원', shots: [['5/56/%E3%81%86%E3%82%81%E3%81%BC%E3%81%97%E5%85%AC%E5%9C%92.jpg', 'Masikyo', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:%E3%81%86%E3%82%81%E3%81%BC%E3%81%97%E5%85%AC%E5%9C%92.jpg', credit: 'Masikyo · CC BY-SA 4.0', kind: 'area', resized: true }]] };
LOCAL_PHOTOS['7/77/130606_Katakurakan_Kamisuwa_Onsen_Japan01s.jpg'] = 'images/commons-added-26595632.jpg';
LOCAL_PHOTOS['c/c0/%E3%81%8F%E3%82%89%E3%81%BE%E6%B8%A9%E6%B3%89_-_panoramio.jpg'] = 'images/commons-added-52789685.jpg';
LOCAL_PHOTOS['5/56/%E3%81%86%E3%82%81%E3%81%BC%E3%81%97%E5%85%AC%E5%9C%92.jpg'] = 'images/commons-added-119582708.jpg';
IM_FIX['add-katakura'] = 'katakurakanFacility';
IM_FIX['survey-18'] = 'kuramaArea';
IM_FIX['survey-21'] = 'yunogoArea';
PHOTOS.kinosakiIchinoyu = { cap: '기노사키 온천 이치노유 외관', shots: [['c/c7/Kinosaki_hotspring_ichinoyu.jpg', 'Miya.m', 'CC BY-SA 3.0', { source: 'https://commons.wikimedia.org/wiki/File:Kinosaki_hotspring_ichinoyu.jpg', credit: 'Miya.m · CC BY-SA 3.0', kind: 'facility' }]] };
LOCAL_PHOTOS['c/c7/Kinosaki_hotspring_ichinoyu.jpg'] = 'images/commons-added-274977.jpg';
IM_FIX['add-ichinoyu'] = 'kinosakiIchinoyu';

// 촬영 대상 시설명이 Commons 설명과 일치하는 공개 라이선스 사진.
PHOTOS.hottarakashiFacility = { cap: '홋타라카시 온천 앗치노유 입구', shots: [['c/c1/Hottarakashi_atti_01.JPG', 'Asacyan', 'CC BY-SA 3.0', { source: 'https://commons.wikimedia.org/wiki/File:Hottarakashi_atti_01.JPG', credit: 'Asacyan · CC BY-SA 3.0', kind: 'facility', resized: true }]] };
PHOTOS.yamashiroFacility = { cap: '야마시로 온천 총탕', shots: [['8/8d/Soyu_Yamashiro_ac_%281%29.jpg', 'Asturio Cantabrio', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Soyu_Yamashiro_ac_(1).jpg', credit: 'Asturio Cantabrio · CC BY-SA 4.0', kind: 'facility', resized: true }]] };
PHOTOS.nagatoFacility = { cap: '나가토유모토 온천 온토', shots: [['3/36/Yumoto-ontoh.jpg', 'Bsx', 'Public domain', { source: 'https://commons.wikimedia.org/wiki/File:Yumoto-ontoh.jpg', credit: 'Bsx · Public domain', kind: 'facility', resized: true }]] };
PHOTOS.geroFacility = { cap: '게로 온천 시라사기노유', shots: [['1/19/Shirasagi-no-yu_in_Gero_city_ac.jpg', 'Asturio Cantabrio', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Shirasagi-no-yu_in_Gero_city_ac.jpg', credit: 'Asturio Cantabrio · CC BY-SA 4.0', kind: 'facility', resized: true }]] };
PHOTOS.yunokuchiFacility = { cap: '유노쿠치 온천', shots: [['f/f1/Yumoto_Sanso_Yunokuchi_Spa.jpg', 'Miyuki Meinaka', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Yumoto_Sanso_Yunokuchi_Spa.jpg', credit: 'Miyuki Meinaka · CC BY-SA 4.0', kind: 'facility', resized: true }]] };
PHOTOS.jindaijiFacility = { cap: '진다이지 온천 유모리노사토', shots: [['2/2b/Jindaiji_Onsen_Yumori-no-sato.JPG', 'Abasaa', 'Public domain', { source: 'https://commons.wikimedia.org/wiki/File:Jindaiji_Onsen_Yumori-no-sato.JPG', credit: 'Abasaa · Public domain', kind: 'facility', resized: true }]] };
Object.assign(LOCAL_PHOTOS, {
  'c/c1/Hottarakashi_atti_01.JPG': 'images/commons-added-26174271.jpg',
  '8/8d/Soyu_Yamashiro_ac_%281%29.jpg': 'images/commons-added-135644110.jpg',
  '3/36/Yumoto-ontoh.jpg': 'images/commons-added-130706214.jpg',
  '1/19/Shirasagi-no-yu_in_Gero_city_ac.jpg': 'images/commons-added-75505096.jpg',
  'f/f1/Yumoto_Sanso_Yunokuchi_Spa.jpg': 'images/commons-added-73539988.jpg',
  '2/2b/Jindaiji_Onsen_Yumori-no-sato.JPG': 'images/commons-added-146443333.jpg'
});
Object.assign(IM_FIX, {
  'survey-10': 'hottarakashiFacility', 'pref2026-5': 'yamashiroFacility', 'pref2026-13': 'nagatoFacility',
  'add-shirasagi': 'geroFacility', 'pref2026-9': 'yunokuchiFacility', 'pref2026-4': 'jindaijiFacility'
});

// 가고시마현 관광연맹의 국제 포토 갤러리: 시설 실사진, 원본 그대로 저장.
// 가고시마 관광 홍보 목적으로만 사용하며 사진 옆에 ©おりはし旅館을 표시합니다.
// 이 사진 자체의 상품화·대여는 금지되며 개별 사용 규정은 아래 링크를 따릅니다.
PHOTOS.orihashi2428 = {
  cap: '오리하시 료칸의 노천탕',
  shots: [[
    'official/orihashi-kagoshima-2428.jpg', '©おりはし旅館', '관광 홍보 목적 이용',
    { source: 'https://www.kagoshima-kankou.com/kr/photo/2428', credit: '©おりはし旅館', terms: 'https://www.kagoshima-kankou.com/kr/photo/2428', kind: 'facility', kagoshimaPromotion: true }
  ]]
};
LOCAL_PHOTOS['official/orihashi-kagoshima-2428.jpg'] = 'images/orihashi-kagoshima-2428.jpg';
IM_FIX['ryokan-nov13-7'] = 'orihashi2428';

// 가고시마 관광 홍보 목적에 한해 제공되는 원본 사진입니다.
PHOTOS.koshikano2394 = {
  cap: '고시카노 온천의 사우나와 냉탕',
  shots: [[
    'official/koshikano-kagoshima-2394.jpg', '鹿児島県観光連盟', '가고시마 관광 홍보 목적 이용',
    { source: 'https://www.kagoshima-kankou.com/kr/photo/2394', credit: '鹿児島県観光連盟', terms: 'https://www.kagoshima-kankou.com/kr/photo/2394', kind: 'facility', kagoshimaPromotion: true }
  ]]
};
LOCAL_PHOTOS['official/koshikano-kagoshima-2394.jpg'] = 'images/koshikano-kagoshima-2394.jpg';
IM_FIX['ryokan-nov13-8'] = 'koshikano2394';

// 촬영자와 CC BY-SA 원문을 확인한 사진. 사나게 사진은 온천 표지판으로 시설 내부가 아닙니다.
PHOTOS.osawaToujiya2026 = { cap: '오사와 온천 도지야 외관', shots: [['1/11/Osawa_Onsen_Toujiya.jpg', '掬茶', 'CC BY-SA 4.0', { source: 'https://commons.wikimedia.org/wiki/File:Osawa_Onsen_Toujiya.jpg', credit: '掬茶 · CC BY-SA 4.0', kind: 'facility', resized: true }]] };
PHOTOS.sanageSign = { cap: '사나게 온천 표지판', shots: [['1/14/%E7%8C%BF%E6%8A%95%E6%B8%A9%E6%B3%89_-_panoramio.jpg', 'YOSHIFUMI OGISO', 'CC BY-SA 3.0', { source: 'https://commons.wikimedia.org/wiki/File:%E7%8C%BF%E6%8A%95%E6%B8%A9%E6%B3%89_-_panoramio.jpg', credit: 'YOSHIFUMI OGISO · CC BY-SA 3.0', kind: 'area', resized: true }]] };
LOCAL_PHOTOS['1/11/Osawa_Onsen_Toujiya.jpg'] = 'images/commons-osawa-20261119.jpg';
LOCAL_PHOTOS['1/14/%E7%8C%BF%E6%8A%95%E6%B8%A9%E6%B3%89_-_panoramio.jpg'] = 'images/commons-sanage-20261119.jpg';
IM_FIX['add-oosawa'] = 'osawaToujiya2026';
IM_FIX['pref2026-8'] = 'sanageSign';

