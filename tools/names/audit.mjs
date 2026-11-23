// 시설 이름 점검: node tools/names/audit.mjs [--no-write]
// 입력: tools/catalog.json (n=한국어, jp=일본어), web/i18n-data.js(D.roman=영어), web/data.js 등 로컬 RAW.
// 출력: 콘솔 요약, tools/names/audit-result.json(전체 플래그), web/data/names-fix.json(확실한 수정만; 사이트에는 연결하지 않음).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = !process.argv.includes('--no-write');

const cat = JSON.parse(rd('tools/catalog.json'));
const ctx = vm.createContext({});
vm.runInContext(rd('web/i18n-data.js') + ';this.D=DATA_I18N;', ctx);
const roman = ctx.D.roman || {};

// 로컬 RAW(번들 데이터)와 카탈로그 비교용
let local = [];
try {
  const c2 = vm.createContext({});
  for (const f of ['data', 'additional', 'survey', 'ryokan-research', 'ryokan-types'])
    vm.runInContext(rd(`web/${f}.js`).replace(/^const /gm, 'var '), c2);
  local = c2.RAW || [];
} catch (e) { console.warn('local RAW load failed:', e.message); }

const HAN = /[가-힣]/, KANJI = /[一-鿿々〆]/, KANA = /[぀-ヿｦ-ﾟ]/;
const CJK = new RegExp(KANJI.source + '|' + KANA.source);

// 확실한 어휘 읽기(표준 한국어 표기). 자동 수정에는 이 표만 쓴다.
const CERTAIN = [['温泉', '온천'], ['旅館', '료칸'], ['ホテル', '호텔'], ['リゾート', '리조트']];
// 한국어 이름에 잘못 들어간 읽기 -> 표준 (jp 쪽 근거가 있을 때만 수정)
const WRONG = [
  { re: /여관/g, to: '료칸', need: /旅館/, name: 'hanja-reading-ryokan' }, // 旅館의 한자음
  { re: /온센/g, to: '온천', need: /温泉/, name: 'onsen-reading' },
  { re: /호테루/g, to: '호텔', need: /ホテル/, name: 'hotel-kana-reading' },
  { re: /료깡|료캉|로칸/g, to: '료칸', need: /旅館/, name: 'ryokan-misspell' },
];

const issues = new Map();
const fix = {};
const count = {};
const flag = (id, k, w, msg) => {
  count[k] = (count[k] || 0) + 1;
  if (!issues.has(id)) issues.set(id, []);
  issues.get(id).push({ k, w, msg });
};
const setFix = (id, f, src) => {
  const prev = fix[id];
  fix[id] = { ...(prev || {}), ...f, src: prev?.src && !prev.src.includes(src) ? prev.src + '+' + src : src };
};
const norm = (s) => String(s).normalize('NFKC').replace(/[\s　​-‍﻿]+/g, ' ').trim();
const loose = (s) => norm(s).replace(/ /g, '');
const wsOnly = (s) => String(s).replace(/[\s　​-‍﻿]+/g, ' ').trim();

for (const r of cat) {
  const id = String(r.id), n = r.n ?? '', jp = r.jp ?? '';
  if (!String(n).trim()) flag(id, 'empty_n', 10, 'n 비어 있음');
  if (!String(jp).trim()) flag(id, 'empty_jp', 10, 'jp 비어 있음');
  if (n && jp && n === jp) flag(id, 'n_equals_jp', 6, '한국어 이름이 일본어 원문과 같음');
  if (n && CJK.test(n)) flag(id, 'cjk_in_n', 7, `n에 한자/가나 남음: ${n}`);
  if (n && HAN.test(n) && CJK.test(n)) flag(id, 'mixed_script_n', 5, `한글+한자/가나 혼용: ${n}`);
  if (jp && HAN.test(jp)) flag(id, 'hangul_in_jp', 8, `jp에 한글: ${jp}`);
  if (n && /[ㄱ-ㅎㅏ-ㅣ]/.test(n)) flag(id, 'stray_jamo', 5, `낱자모: ${n}`);

  // 공백만 정리(전각 영숫자는 이름의 일부일 수 있어 건드리지 않는다)
  if ((n && n !== wsOnly(n)) || (jp && jp !== wsOnly(jp))) {
    flag(id, 'whitespace', 2, '앞뒤/중복/전각 공백 정리 필요');
    const f = {};
    if (n && n !== wsOnly(n)) f.n = wsOnly(n);
    if (jp && jp !== wsOnly(jp)) f.jp = wsOnly(jp);
    setFix(id, f, 'rule:whitespace');
  }

  for (const w of WRONG) {
    w.re.lastIndex = 0;
    if (n && w.need.test(jp) && w.re.test(n)) {
      w.re.lastIndex = 0;
      flag(id, w.name, 6, `잘못된 읽기 '${n.match(w.re)[0]}' -> '${w.to}'`);
      setFix(id, { n: n.replace(w.re, w.to) }, 'rule:' + w.name);
    }
  }

  // 한자/가나가 남은 n: 확실한 어휘만으로 완전히 치환될 때만 수정
  if (n && CJK.test(n)) {
    let t = n;
    for (const [a, b] of CERTAIN) t = t.split(a).join(b);
    t = wsOnly(t);
    if (!CJK.test(t) && t !== n && HAN.test(t)) setFix(id, { n: t }, 'rule:certain-vocab');
  }

  // 접미사 일관성
  if (/温泉$/.test(jp) && n && !/온천$/.test(n) && !CJK.test(n)) flag(id, 'suffix_onsen_missing', 3, `jp ...温泉 인데 n에 '온천' 없음: ${n}`);
  if (/온천$/.test(n) && jp && !/温泉|泉$|湯$/.test(jp)) flag(id, 'suffix_onsen_extra', 2, `n ...온천 인데 jp에 温泉 없음: ${jp}`);
  if (/旅館$/.test(jp) && n && !/료칸$/.test(n) && !CJK.test(n)) flag(id, 'suffix_ryokan_missing', 3, `jp ...旅館 인데 n에 '료칸' 없음: ${n}`);
  if (/ホテル$/.test(jp) && n && !/호텔$/.test(n) && !CJK.test(n)) flag(id, 'suffix_hotel_missing', 3, `jp ...ホテル 인데 n에 '호텔' 없음: ${n}`);

  // 영어(표시되는 영어 이름 = D.roman[id])
  const en = roman[id];
  if (en !== undefined) {
    if (!String(en).trim()) flag(id, 'en_empty', 6, 'en 비어 있음');
    else {
      if (/[^\x20-\x7eÀ-ſ]/.test(en)) flag(id, 'en_nonlatin', 4, `en에 비라틴 문자: ${en}`);
      if (/^[a-z]/.test(en)) flag(id, 'en_lowercase_start', 3, `en 소문자 시작: ${en}`);
      if (/\s{2,}|^\s|\s$/.test(en)) { flag(id, 'en_whitespace', 2, 'en 공백 이상'); setFix(id, { en: en.replace(/\s+/g, ' ').trim() }, 'rule:en-whitespace'); }
      if (/\b(\w+)\s+\1\b/i.test(en)) flag(id, 'en_repeated_word', 4, `en 단어 반복: ${en}`);
      if (en === en.toUpperCase() && /[A-Z]{4,}/.test(en)) flag(id, 'en_allcaps', 2, `en 전부 대문자: ${en}`);
    }
  }
}
count.en_missing = cat.filter((r) => !(String(r.id) in roman)).length;

// 중복
const groups = (key) => {
  const m = new Map();
  for (const r of cat) { const k = loose(r[key] ?? ''); if (k) { if (!m.has(k)) m.set(k, []); m.get(k).push(String(r.id)); } }
  return [...m].filter(([, v]) => v.length > 1);
};
for (const [k, ids] of groups('jp')) ids.forEach((id) => flag(id, 'dup_jp', 4, `같은 jp(${k}) 다른 id: ${ids.join(', ')}`));
for (const [k, ids] of groups('n')) {
  const jps = new Set(ids.map((i) => loose(cat.find((r) => String(r.id) === i).jp ?? '')));
  if (jps.size > 1) ids.forEach((id) => flag(id, 'dup_n_diff_jp', 5, `같은 n(${k})인데 jp 다름: ${ids.join(', ')}`));
}
const idc = {};
cat.forEach((r) => { idc[r.id] = (idc[r.id] || 0) + 1; });
Object.entries(idc).filter(([, v]) => v > 1).forEach(([id]) => flag(id, 'dup_id', 9, 'id 중복'));

// 로컬 번들 데이터와 DB 불일치
const cmap = new Map(cat.map((r) => [String(r.id), r]));
let localOnly = 0, localDiff = 0;
for (const l of local) {
  const c = cmap.get(String(l.id));
  if (!c) { localOnly++; continue; }
  if ((l.n && l.n !== c.n) || (l.jp && l.jp !== c.jp)) { localDiff++; flag(String(l.id), 'local_vs_catalog', 3, `로컬(${l.n}|${l.jp}) != DB(${c.n}|${c.jp})`); }
}

// '○○ 온천' vs '○○온천' 표기 혼재
const spaced = cat.filter((r) => /\S 온천$/.test(r.n ?? '')), attached = cat.filter((r) => /[^\s]온천$/.test(r.n ?? ''));
count.style_onsen_spaced_total = spaced.length;
count.style_onsen_attached_total = attached.length;
if (spaced.length && attached.length) {
  const minor = spaced.length < attached.length ? spaced : attached;
  minor.forEach((r) => flag(String(r.id), 'style_onsen_spacing', 1, `'온천' 띄어쓰기 소수 표기: ${r.n}`));
}

const rows = [...issues].map(([id, list]) => {
  const r = cmap.get(id) || {};
  return { id, n: r.n, jp: r.jp, en: roman[id], score: list.reduce((a, b) => a + b.w, 0), flags: list.map((x) => x.k), msgs: list.map((x) => x.msg), fix: fix[id] };
}).sort((a, b) => b.score - a.score);

console.log(`catalog ${cat.length} | local RAW ${local.length} (catalog에 없음 ${localOnly}, n/jp 다름 ${localDiff}) | roman(en) ${Object.keys(roman).length}`);
console.log('flag counts:', JSON.stringify(Object.fromEntries(Object.entries(count).sort((a, b) => b[1] - a[1]))));
console.log(`flagged ids ${rows.length}, certain fixes ${Object.keys(fix).length}`);
console.log('\n--- 30 worst ---');
rows.slice(0, 30).forEach((r, i) => console.log(`${i + 1}. [${r.id}] ${r.n} | ${r.jp} | score ${r.score} | ${r.flags.join(',')}${r.fix ? ' | FIX ' + JSON.stringify(r.fix) : ''}`));
if (write) {
  fs.writeFileSync(path.join(root, 'tools/names/audit-result.json'), JSON.stringify({ counts: count, rows }, null, 1));
  fs.writeFileSync(path.join(root, 'web/data/names-fix.json'), JSON.stringify(fix, null, 1));
  console.log('\nwrote tools/names/audit-result.json, web/data/names-fix.json');
}
