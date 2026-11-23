// 후보 선정 + 라이선스/크기 검사 -> plan.json, rest.json
import fs from 'fs';
const d = JSON.parse(fs.readFileSync('commons.json', 'utf8'));
const names = JSON.parse(fs.readFileSync('names.json', 'utf8'));
const strip = s => (s || '').replace(/<[^>]+>/g, '').replace(/&lt;.*$/, '').replace(/\s+/g, ' ').trim();
// 분류에서 사람이 고른 파일(제목 일부)
const catPick = {
  'add-gozanoyu': '251129 Goza-no-yu.jpg',
  'official-kanagawa-hakone-gora-kansuiro': 'Kansuiro.jpg',
  'official-gunma-ikaho-06': 'Kishigon Ryokan.JPG',
  'official-gunma-ikaho-08': 'Ikaho Onsen Chigira Jinsentei.jpg',
  'official-kanagawa-hakone-hakone-suishoen': '(4119899571)',
  'official-hyogo-arima-kinnoyu': 'Kinnoyu01s1920.jpg',
  'official-gunma-shibukawa-bath-1': 'Ikaho open air bath.JPG',
  'manus-arima-ginnoyu': 'Ginnoyu01s1920.jpg',
  'official-wakayama-yunomine-public': 'Unomineonsenkousyuyokuzyou.jpg',
  ...(fs.existsSync('catpick2.json') ? JSON.parse(fs.readFileSync('catpick2.json', 'utf8')) : {}),
};
const skipFile = {
  'official-gunma-kusatsu-k0011': '파일명 Ekinariya를 益成屋 읽기로 추정한 매칭(시트 기재)',
  'official-aomori-tsuta': '6080x1600 파노라마라 카드 비율에 안 맞음',
  'manus-yamamizuki': '2100x300 가로 배너 사진, 카드에 부적합',
  'official-shizuoka-shuzenji-kikuya': '폭 640px(800 미만) + 외관 아닌 복도 사진',
  'official-kumamoto-yamaga-sakurayu': '2012년 재건 전 옛 건물일 수 있음(시트 기재)',
  'official-kumamoto-aso-seifuso': '출처 불명(Yahoo 블로그 사진을 업로더가 CC로 올림, 기계판독 출처 없음) + 青風荘/清風荘 표기 차이',
  'official-tochigi-yunishigawa-kamiyashiki-taira-no-takafusa': '시트 특이사항 애매함(파일명 Takafusa Hotel)',
  'official-kagoshima-kuei-unagi-onsen': '시트 특이사항 애매함(鰻温泉 전체 사진)',
  'official-nara-nara-dorogawa-center': '시트 특이사항 애매함(센터 건물인지 불명)',
};
const skipCat = {
  'o2': '분류가 공원(Sainokawara Park)이라 노천탕 사진이 아님',
  'official-kanagawa-hakone-hakone-kowakien-tenyu': '시트 애매함 + 분류에 내부 사진 1장뿐',
  'official-kanagawa-hakone-kin-no-take': '분류에 파일 0장',
  'official-gunma-ikaho-12': '분류가 이카호 온천 전체(森秋旅館 전용 아님)',
  'official-hyogo-kinosaki-sotoyu-satonoyu': '분류에 さとの湯 사진 없음(고노유 사진 1장)',
  'official-tochigi-kinugawa-kinugawa-onsen-asaya': '시트 특이사항 애매함(호텔)',
  'official-wakayama-katsuura-nakanoshima': '시트 특이사항 애매함(옛 이름 호텔)',
  'official-yamagata-ginzan-showakan': '분류 사진이 긴잔 온천 전경뿐(昭和館 특정 불가)',
  'official-n-hanaya': '시트 특이사항 애매함(분류명 Hanaya Hotel)',
  'official-wakayama-kumano-kawayu-kosetsu': '분류 사진이 川湯 일반 풍경, 공중욕장 특정 불가',
  'official-kochi-kochi-sansuien': '시트 특이사항 애매함(호텔식)',
  'official-hokkaido-HK12976': '시트 특이사항 애매함(건물 사진 없음)',
  'official-oita-kokonoe-hokkein': '시트 특이사항 애매함(山荘 vs 高原テラス)',
  'official-miyazaki-hinokage-hinokage-onsen-eki': '시트 특이사항 애매함(옛 역 건물)',
};
const rows = JSON.parse(fs.readFileSync('../srcs.json', 'utf8')).srcs['xlsx.B (1).xlsx/찾은 사진'].filter(r => r['상태'] === '찾음');
const OK = l => /^(CC0|Public domain|CC BY(-SA)? [\d.]+)$/.test(l || '');
const plan = [], rejLic = [], rejSize = [], human = [];
for (const r of rows) {
  const id = r.ID, v = d[id], H = reason => human.push({ id, name: r['시설명'], page: r['사진 파일 페이지'], reason });
  if (!v) { H('Commons 파일/분류 페이지가 아님(' + (/nii\.ac\.jp/.test(r['사진 파일 페이지']) ? '문화유산온라인' : '갤러리 등') + ')'); continue; }
  let page;
  if (v.kind === 'file') { if (skipFile[id]) { H(skipFile[id]); continue; } page = v.page; }
  else {
    if (!catPick[id]) { H(skipCat[id] || '분류에서 고를 사진 미정'); continue; }
    page = v.pages.find(p => p.title.includes(catPick[id]));
    if (!page) { H('분류 선택 파일 못 찾음'); continue; }
  }
  const i = page.imageinfo?.[0], m = i.extmetadata || {}, lic = m.LicenseShortName?.value;
  const rec = {
    id, name: r['시설명'], nameKo: names[id] || r['시설명'], title: page.title.replace(/^File:/, ''), from: v.kind,
    key: i.url.split('?')[0].replace('https://upload.wikimedia.org/wikipedia/commons/', ''), url: i.url.split('?')[0],
    w: i.width, h: i.height, mime: i.mime, license: lic, licenseUrl: m.LicenseUrl?.value || '', artist: strip(m.Artist?.value), credit: strip(m.Credit?.value),
    pageUrl: 'https://commons.wikimedia.org/wiki/File:' + i.url.split('?')[0].split('/').pop(),
  };
  if (!OK(lic)) { rejLic.push({ ...rec, reason: '라이선스 ' + lic }); continue; }
  if (!/^image\/(jpeg|png)$/.test(i.mime) || i.width < 800) { rejSize.push({ ...rec, reason: `${i.mime} ${i.width}px` }); continue; }
  plan.push(rec);
}
fs.writeFileSync('plan.json', JSON.stringify(plan, null, 1));
fs.writeFileSync('rest.json', JSON.stringify({ human, rejLic, rejSize }, null, 1));
console.log('plan', plan.length, 'human', human.length, 'rejLic', rejLic.length, 'rejSize', rejSize.length);
console.log(plan.filter(p => p.from === 'cat').map(p => p.id + ' ' + p.title + ' ' + p.license));
