// Public, reusable photos for facilities whose cards had a price but no image.
// An area image is never presented as a photograph of the named facility.
const commons = (path, title, author, license, file) => ({
  path: `images/${file}`, title, author, license,
  source: `https://commons.wikimedia.org/wiki/File:${path}`,
  terms: license === 'Public domain' ? '' : `https://creativecommons.org/licenses/${license.startsWith('CC BY-SA') ? 'by-sa' : 'by'}/${license.match(/[\d.]+$/)?.[0] || '4.0'}/`,
  resized: true,
});
const find47 = (slug, title, captionKo, author, file) => ({
  path: `images/find47-${file}.jpg`, title, captionKo, author, license: 'CC BY 4.0',
  source: `https://find47.jp/ja/i/${slug}`, terms: 'https://creativecommons.org/licenses/by/4.0/',
  resized: false,
});

export const assets = {
  tsurunoyu: {...commons('Tsurunoyu_onsen_rotenburo.JPG', '쓰루노유 노천탕', 'Markmark28', 'CC BY-SA 3.0', 'commons-8e32179004be364d.jpg'), kind: 'facility'},
  kurokawa: {...commons('Kurokawa_Onsen_-%E6%B8%A9%E6%B3%89%E8%A1%97.jpg', '구로카와 온천가', 'hiroooooki', 'CC BY 2.0', 'commons-added-15027269.jpg'), kind: 'area'},
  tsukioka: {...commons('Tsukioka_Onsen_Tsukiakari_May2020.jpg', '쓰키오카 온천 쓰키아카리 정원', 'Drph17', 'CC BY 4.0', 'commons-tsukioka-tsukiakari-2020.jpg'), kind: 'area'},
  kirishima: {...find47('ziBFU', '初冬の霧島神宮', '초겨울 기리시마 신궁', 'katsuyoshi-imagama', 'kirishima'), kind: 'area'},
  yumoto: {...commons('Hakone_yumoto_onsen_2.jpg', '하코네유모토 온천가', 'Quercus acuta', 'CC BY-SA 4.0', 'commons-added-58130210.jpg'), kind: 'area'},
  suimeikan: {...commons('%E3%80%90%E6%97%A5%E6%9C%AC%E4%B8%8B%E5%91%82%E4%BD%8F%E5%AE%BF%E3%80%91%E6%B0%B4%E6%98%8E%E9%A4%A8_(32552317990).jpg', '스이메이칸 로비', 'fullfen666', 'CC BY-SA 2.0', 'commons-gero-suimeikan.jpg'), kind: 'facility'},
  yuasis: {...commons('Yuwa_Onsen_Yuasis.jpg', '유와 온천 유아시스 외관', '掬茶', 'CC BY-SA 4.0', 'commons-yuwa-yuasis.jpg'), kind: 'facility'},
  goshogake: {...commons('Gosyogake_Onsen_Genkan.jpg', '고쇼가케 온천 입구', 'らんで', 'CC BY-SA 4.0', 'commons-goshogake-entrance.jpg'), kind: 'facility'},
  beppu: {...commons('View_of_Beppu_20170217.jpg', '벳푸 온천가 전경', 'Suicasmo', 'CC BY-SA 4.0', 'commons-added-91078634.jpg'), kind: 'area'},
  kannawa: {...commons('2020-02-24_Kannawa_Onsen_%E9%89%84%E8%BC%AA%E6%B8%A9%E6%B3%89%E5%85%A8%E6%99%AF_DSCF8631.jpg', '벳푸 간나와 온천가', '松岡明芳', 'CC BY-SA 4.0', 'commons-added-93478351.jpg'), kind: 'area'},
  futsukaichi: {...commons('Sagita_River_in_Futsukaichi_Onsen.jpg', '후쓰카이치 온천가 사기타강', 'STA3816', 'CC BY-SA 4.0', 'commons-futsukaichi-sagita-river.jpg'), kind: 'area'},
  niyodo: {...find47('HDwIN', '川霧', '니요도강의 물안개', 'K_Oda', 'niyodo'), kind: 'area'},
  yuzawa: {...commons('Entrance_to_Echigo-Yuzawa_Onsen.JPG', '에치고유자와 온천 입구', 'Abasaa', 'Public domain', 'commons-echigo-yuzawa-entrance.jpg'), kind: 'area'},
  ureshino: {...commons('Ureshino_Onsen_Hondori_20230610_01.jpg', '우레시노 온천가 혼도리', 'Peka', 'CC BY-SA 4.0', 'commons-added-134862714.jpg'), kind: 'area'},
  iya: {...find47('WWNtR', '祖谷の吊り橋（徳島県祖谷渓）', '이야 계곡의 흔들다리', 'Kensuke_Nakaya', 'iya'), kind: 'area'},
  daitokan: {...commons('AMMS_Hotels_Kusatsu-Onsen_Daitokan.JPG', '구사쓰 온천 다이토칸 외관', 'Abasaa', 'Public domain', 'commons-8ca88c57c6263892.jpg'), kind: 'facility'},
  yamamotokan: {...commons('Kusatsu_Onsen_Yamamotokan.JPG', '구사쓰 온천 야마모토칸 외관', 'Abasaa', 'Public domain', 'commons-5cb7a8f592a700f3.jpg'), kind: 'facility'},
  naraya: {...commons('Kusatsu_Onsen_Naraya.JPG', '구사쓰 온천 나라야 외관', 'Abasaa', 'Public domain', 'commons-c139767e2c96d32d.jpg'), kind: 'facility'},
  yunokuchi: {...commons('Yumoto_Sanso_Yunokuchi_Spa.jpg', '유모토 산소 유노쿠치 온천 외관', 'Miyuki Meinaka', 'CC BY-SA 4.0', 'commons-ace7f43dea084bfa.jpg'), kind: 'facility'},
};

export const coverage = [
  ['110','tsurunoyu'], ['1348','kurokawa'], ['add-bijin','tsukioka'],
  ['ryokan-nov13-7','kirishima'], ['ryokan-nov13-8','kirishima'],
  ['manus-tenzan','yumoto'], ['official-20261119-suimeikan-gero','suimeikan'],
  ['official-akita-AK','yuasis'], ['official-akita-goshogake','goshogake'],
  ['official-beppu-18community_community','beppu'],
  ['official-beppu-detail1','beppu'], ['official-beppu-detail12','kannawa'],
  ['official-beppu-detail16','beppu'], ['official-beppu-detail3','beppu'],
  ['official-beppu-detail6','kannawa'], ['official-beppu-detail7','beppu'],
  ['official-beppu-keirinonsen','beppu'], ['official-beppu-kiyosen','kannawa'],
  ['official-fukuoka-ogiya-ryokan','futsukaichi'],
  ['official-kochi-kochi-konoka','niyodo'],
  ['official-niigata-yuzawa-kashiwaya-annex','yuzawa'],
  ['official-saga-yuzennoyado-toukai','ureshino'],
  ['official-tokushima-mannaka','iya'],
  ['official-gunma-kusatsu-k0027','daitokan'],
  ['official-gunma-kusatsu-k0087','yamamotokan'],
  ['official-gunma-kusatsu-k0052','naraya'],
  ['official-mie-kumano-yunokuchi','yunokuchi'],
];
