// 온천 한눈에: 화면 동작(한국어·일본어·영어 공용). 자료는 data.js(RAW, PHOTOS)와 extra.js(EXTRA), 문구는 i18n.js(UI), 자료 텍스트 변환표는 i18n-data.js.
// 판정 값: 'y' 확인됨(있음), 'n' 확인됨(없음), 'u' 미확인. 미확인은 조건에 맞는 것으로 치지 않습니다.
// 보안: DB 값은 db-loader.js가 수신 시점에 이스케이프하므로 여기서는 다시 이스케이프하지 않는다(이중 이스케이프 방지). 번역 사전·변환표는 정적 자료다.

const CHECKED = '2026-11-12';
const D = DATA_I18N;
const regionName = (i) => D.regions[i]?.[{ ko: 0, ja: 1, en: 2 }[LANG]] || '';
const prefName = (jp) => LANG === 'ja' ? jp : (D.prefs[jp]?.[LANG === 'ko' ? 1 : 2] || jp);
const AREA = {}; // 온천지(한국어 표기) → 레코드가 직접 가진 현지 표기(area_ja / area_en)
const areaName = (a) => LANG === 'ko' ? a : AREA[a] || (LANG === 'ja' ? D.areaJa[a] : D.areaEn[a] || areaRoman(a)) || a;
const nameOf = (table, key) => LANG === 'ja' ? key : (table[key]?.[LANG] || key);

// 한국어 자유 문장(extra.js·data.js 본문)을 현재 언어로. 번역이 없으면 ''(그 항목은 숨김). ko는 그대로.
const DICT = LANG === 'ja' ? (typeof JA_TRANSLATIONS === 'undefined' ? {} : JA_TRANSLATIONS) : LANG === 'en' ? (typeof EN_TRANSLATIONS === 'undefined' ? {} : EN_TRANSLATIONS) : null;
const tr = (s) => !s || !DICT ? s : facilityTranslation.translate(s, DICT, LANG);

const yn = (v) => !v ? 'u' : /^(可|有|あり)$/.test(v) ? 'y' : /^(不可|否|無|なし)$/.test(v) ? 'n' : 'y';
const cnt = (v) => v === '' || v == null ? 'u' : v === '0' ? 'n' : 'y';
const num = (v) => /^\d+$/.test(v || '') ? +v : null;
const list = (v, table) => (v || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => nameOf(table, s));
const priceNote = (r) => LANG === 'ko' ? (r.stayPriceNote || '') : (D.priceNotes[LANG][r.id] || tr(r.stayPriceNote) || '');

// 검색: 전각·반각, 대소문자를 구분하지 않는다. DB 값은 이스케이프되어 있으므로 비교용으로만 되돌린다.
const norm = (s) => String(s ?? '').normalize('NFKC').toLowerCase();
const unesc = (s) => String(s ?? '').replace(/&(amp|lt|gt|quot|#39);/g, (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[k]));
const escQ = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 온천 온도: 숫자만 추려 언어에 맞게 보여 준다(자료의 한국어 설명은 상세 표에서만).
const tempShort = (s) => {
  if (!s) return null;
  const m = String(s).match(/約?\d+(?:\.\d+)?(?:~\d+(?:\.\d+)?)?℃/g);
  return m ? m.map((v) => v.replace(/^約/, UI.det.tile.approx)).join(', ') : null;
};

// 공식 사이트 가격(data/prices.json). DB 가격이 없을 때만 쓰며(단위를 섞지 않는다), 90일 넘으면 "오래된 가격" 표시, 360일 넘으면 숨긴다.
const OP = typeof ONSEN_PRICES === 'undefined' ? { items: {}, stats: {} } : ONSEN_PRICES;
const BASIS_KEY = { '1泊2食': 'm2', '1泊朝食/夕食付': 'm1', '素泊まり': 'room', '1名1泊(食事条件不明)': 'unk' };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
function officialPrice(id, hp) {
  const it = OP.items[id], basis = BASIS_KEY[it?.basis], age = (Date.now() - Date.parse(it?.checked)) / 864e5;
  if (!basis || !(it.from > 0) || it.unit !== 'JPY/person/night' || !/^https?:\/\//.test(it.src || '') || !(age >= -1 && age <= 360)) return null;
  const d = hostOf(it.src), h = hostOf(hp || '');
  const own = d && (d === h || d.endsWith('.' + h) || h.endsWith('.' + d));
  return { from: it.from, basis, src: it.src, checked: it.checked, old: age > 90, assoc: !!it.assoc || (!!h && !own), domain: d };
}
// 모니터링 값(record.monitor.price|hours, 워커가 승인된 변경만 기록). 같은 정직 규칙: 시설 자신의 공식 사이트(https)만, 90일 넘으면 '오래된', 360일 넘으면 숨김. 값은 db-loader가 이스케이프한 뒤라 숫자·형식을 다시 검사한다.
const MON_BASIS = { 'per-person-2meals': 'm2', 'per-person-1meal': 'm1', 'per-person-room-only': 'room', 'per-person': 'unk' };
function monitorBase(m, hp) {
  const src = unesc(m?.source_url), age = (Date.now() - Date.parse(m?.checked)) / 864e5, d = /^https:\/\//.test(src) ? hostOf(src) : '', h = hostOf(hp || '');
  if (!d || !h || !(d === h || d.endsWith('.' + h) || h.endsWith('.' + d)) || !(age >= -1 && age <= 360)) return null;
  return { src, checked: m.checked, old: age > 90, domain: d };
}
function monitorPrice(r) {
  const m = r.monitor?.price, b = monitorBase(m, r.hp);
  if (!b || !Number.isInteger(m.minYen) || m.minYen < 1000 || m.minYen > 500000 || m.unit === 'room/night' || m.kind === 'room') return null; // 1실 가격은 1인 가격으로 보여 주지 않는다
  return { from: m.minYen, basis: MON_BASIS[m.kind] && m.unit === 'person/night' ? MON_BASIS[m.kind] : 'nb', ...b, assoc: false, mon: true };
}
function monitorHours(r) {
  const m = r.monitor?.hours, b = monitorBase(m, r.hp), ok = (x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
  if (!b || !ok(m.open) || !ok(m.close) || m.open >= m.close) return null;
  return { text: `${m.open}~${m.close}`, label: m.label === 'dayuse' ? 'day' : m.label === 'business' ? 'biz' : 'unk', ...b };
}
// 가격 후보 둘 중 확인일이 더 새로운 쪽(같으면 모니터링). 원본 DB 가격이 있으면 호출하지 않는다.
const pickOff = (r) => { const a = monitorPrice(r), b = officialPrice(String(r.id), r.hp); return a && (!b || Date.parse(a.checked) >= Date.parse(b.checked)) ? a : b; };
const makeFacility = (r) => {
  const region = (D.prefs[r.pref] || [-1])[0];
  const official = r.src === 'official';
  const x = EXTRA[String(r.id)] || {};
  const dayPriceMatch = String(r.dayP || '').match(/^([\d,]+)(?:\s*[~〜～-]\s*[\d,]+)?$/);
  const dayPrice = dayPriceMatch ? +dayPriceMatch[1].replace(/,/g, '') : null;
  const dbStay = Number.isFinite(r.stayPricePerPerson) && r.stayPricePerPerson > 0 ? r.stayPricePerPerson : null;
  const off = dbStay == null ? pickOff(r) : null;
  const hasRooms = r.rooms && r.rooms !== '0室';
  const img = r.im || IM_FIX[r.id] || '';
  const roman = D.roman[r.id] || r.name_en;
  return {
    x,
    kind: r.kind || 'unknown', id: String(r.id),
    name: LANG === 'ko' ? r.n : LANG === 'ja' ? (r.jp || UI.unk) : (roman || r.jp || UI.unk),
    alt: LANG === 'ko' ? r.jp : LANG === 'en' && roman ? r.jp : '', // 이름 아래 작은 일본어 표기
    area: r.a, areaName: areaName(r.a), address: r.address, pref: r.pref, prefName: prefName(r.pref), region, regionName: regionName(region),
    blurb: tr(r.b), img, shots: (PHOTOS[img]?.shots || []).filter((shot) => LOCAL_PHOTOS[shot[0]]), hp: r.hp,
    official, srcUrl: official ? r.srcUrl : SPA(r.id), checked: r.checked || CHECKED,
    monHours: monitorHours(r), day: x.dayStatus || yn(r.day), dayPrice: x.dayPrice === undefined ? dayPrice : x.dayPrice, dayPriceRange: x.dayPrice === undefined && /[~〜～-]/.test(r.dayP || ''), dayHours: tr(x.dayHours === undefined ? (r.dayH || '').replace(/～/g, '~') : x.dayHours), dayNote: tr(x.dayNote || r.dayNote),
    stay: x.stayStatus || (r.stay ? yn(r.stay) : hasRooms ? 'y' : 'u'), rooms: /\d/.test(r.rooms || '') ? r.rooms.match(/\d+/)[0] : null, stayP: tr(r.stayP), stayPrice: dbStay ?? off?.from ?? null, off, stayPriceNote: priceNote(r),
    open: x.openStatus || cnt(r.open), openN: x.openStatus ? null : num(r.open), priv: x.privStatus || cnt(r.priv), privN: x.privStatus ? null : num(r.priv), room: x.roomCount ? 'y' : cnt(r.room), roomN: x.roomCount || num(r.room),
    flow: yn(r.flow), qualityKeys: (r.q || '').split(',').map((s) => s.trim()).filter(Boolean), quality: list(r.q, D.qual), colors: list(r.color, D.color), temp: r.temp || null, place: r.place ? (LANG === 'ja' ? r.place : D.place[r.place]?.[LANG] || null) : null,
    solo: yn(r.solo), sudo: yn(r.sudo), card: yn(r.card), cardText: r.card, shuttle: yn(r.shuttle), shuttleText: r.shuttle,
    tempS: tempShort(r.temp),
    hay: norm([r.n, r.jp, r.name_en, roman, r.a, r.area_ja, r.area_en, D.areaJa[r.a], D.areaEn[r.a], r.pref, D.prefs[r.pref]?.[1], D.prefs[r.pref]?.[2], (D.regions[region] || []).join(' ')].map(unesc).join(' ')),
    park: yn(r.park), ci: r.ci, co: r.co, closed: tr(r.closed), towel: tr(r.towel), mixed: tr(r.mixed), pay: tr(r.pay), over: tr(r.over),
  };
};
const buildFac = () => { RAW.forEach((r) => { if (r.a && r['area_' + LANG]) AREA[r.a] = r['area_' + LANG]; }); return RAW.map(makeFacility); };
const FAC = buildFac();
// 시설 요금이 없는 숙박 카드에 보여 주는 "지역 참고가": 같은 도도부현(3곳 이상) → 같은 지방(3곳 이상) → 전국의 확인된 숙박 요금 중앙값.
// 시설 자신의 요금처럼 보이지 않게 문구로 분리하고(UI.refStay), 정렬·예산 필터·비교표에는 쓰지 않는다. 조건(식사 포함 여부 등)은 시설마다 다르다.
let refCache = null;
const medianOf = (a) => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
function refStay(f) {
  if (f.stay === 'n' || f.stayPrice != null || !UI.refStay) return null;
  if (!refCache || refCache.n !== FAC.length || refCache.sig !== FAC.filter((x) => x.stayPrice != null).length) {
    const priced = FAC.filter((x) => x.stay !== 'n' && x.stayPrice != null);
    const by = (key) => { const m = new Map(); priced.forEach((x) => { if (!m.has(x[key])) m.set(x[key], []); m.get(x[key]).push(x.stayPrice); }); return m; };
    refCache = { n: FAC.length, sig: priced.length, pref: by('pref'), region: by('region'), all: priced.map((x) => x.stayPrice) };
  }
  const p = refCache.pref.get(f.pref), r = refCache.region.get(f.region);
  const [pool, scope] = p && p.length >= 3 ? [p, 'pref'] : r && r.length >= 3 ? [r, 'region'] : [refCache.all, 'all'];
  return pool.length >= 3 ? { yen: Math.round(medianOf(pool) / 100) * 100, n: pool.length, scope } : null;
}
const refText = (f) => { const x = refStay(f); return x ? UI.refStay(fx.rate ? conv(x.yen) : yen(x.yen), x.n, x.scope) : ''; };
const refLine = (f) => { const t = refText(f); return t ? `<p class="price ref"><small>${t}</small></p>` : ''; };

const LABEL = UI.label;
const NO_LIMIT = 101000; // 예산 슬라이더의 오른쪽 끝 = 제한 없음
const $ = (s) => document.querySelector(s);
const form = $('#filters');
const ic = (id) => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const unk = `<span class="unk">${UI.unk}</span>`;
const where = (f) => [f.regionName !== f.prefName && f.regionName, f.prefName, f.areaName].filter(Boolean).join(UI.sep);
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return UI.source; } };
const srcA = (u) => u ? ` <a class="s" href="${u}" target="_blank" rel="noopener">${host(u)}</a>` : '';
const photoSource = (shot) => `https://commons.wikimedia.org/wiki/File:${shot[0].split('/').pop()}`;
const photoCredit = (shot) => {
  const C = UI.credit;
  if (shot[3]?.source) return `${shot[3].kind === 'area' ? C.area : ''}${shot[3].credit}${shot[3].resized ? C.resized : ''}${shot[3].kagoshimaPromotion ? C.kagoshima : ''} · <a href="${shot[3].source}" target="_blank" rel="noopener">${C.source}</a>${shot[3].terms ? ` · <a href="${shot[3].terms}" target="_blank" rel="noopener">${C.terms}</a>` : ''}`;
  const m = shot[2].match(/^CC BY(-SA)? ([\d.]+)( JP)?$/);
  const licence = m ? `https://creativecommons.org/licenses/by${m[1] ? '-sa' : ''}/${m[2]}/${m[3] ? 'jp/' : ''}` : null;
  const name = shot[2] === '퍼블릭 도메인' ? C.pd : shot[2];
  return `${shot[1]}${C.resized} · <a href="${photoSource(shot)}" target="_blank" rel="noopener">${C.original}</a> · ${licence ? `<a href="${licence}" target="_blank" rel="noopener">${name}</a>` : name} · Wikimedia Commons`;
};
// 사진 설명: ko는 자료의 한국어 설명, ja·en은 시설/온천지 기준으로 만든 문장
const photoAlt = (f, shot) => LANG === 'ko' ? (shot[3]?.caption || PHOTOS[f.img].cap) : shot[3]?.kind === 'facility' ? UI.alt.facility(f.name) : shot[3]?.kind === 'area' ? UI.alt.area(f.prefName) : LANG === 'ja' ? '温泉の写真' : 'Onsen photograph';
const coverageLabel = (shot) => {
  const m = shot[3];
  if (!m?.coverage) return '';
  const area = m.kind === 'area';
  const label = LANG === 'ja' ? (area ? '地域の風景 · 施設の写真ではありません' : '施設写真') : LANG === 'en' ? (area ? 'Regional view · not this facility' : 'Facility photo') : (area ? '지역 사진 · 시설 사진 아님' : '시설 사진');
  return `<span class="coverage-label">${label}</span>`;
};
const coverageCredit = (shot) => {
  const m = shot[3];
  if (!m?.coverage) return '';
  const title = LANG === 'ko' || !m.source.includes('commons.wikimedia.org/wiki/File:') ? m.title : decodeURIComponent(m.source.split('/').pop()).replaceAll('_', ' ');
  return `<div class="coverage-credit"><a href="${m.source}" target="_blank" rel="noopener">${title} © ${shot[1]}</a>${m.terms ? ` · <a href="${m.terms}" target="_blank" rel="noopener">${shot[2]}</a>` : ` · ${shot[2]}`}</div>`;
};

// 환율: 엔화 자료를 원화(ko)·달러(en)로 바꿔 보여 줍니다. 일본어는 엔화만. 값을 못 받으면 엔화 그대로 둡니다.
const fx = { rate: null, when: null, stale: false, status: null };
const yen = (n) => '¥' + n.toLocaleString(UI.loc);
const conv = (n) => UI.conv$(n, fx.rate);
const money = (n, up = '') => fx.rate ? `<b>${UI.approx(conv(n))}${up}</b><i>${yen(n)}${up}</i>` : `<b>${yen(n)}${up}</b>`;
const moneyText = (n, up = '') => (fx.rate ? UI.approx(conv(n)) : yen(n)) + up;
const stayMoney = (f) => money(f.stayPrice, f.off ? '〜' : '');
const dayMoney = (f) => money(f.dayPrice, f.dayPriceRange ? '〜' : '');
const basisText = (f) => f.off ? UI.px.basis[f.off.basis] : '';
const oldTag = (f) => f.off?.old ? ` <em class="old">${UI.px.old}</em>` : '';
const offSrcLink = (f) => `<a href="${escQ(f.off.src)}" target="_blank" rel="noopener noreferrer">${f.off.assoc ? UI.px.srcAssoc(escQ(f.off.domain)) : f.off.mon ? UI.px.srcMon : UI.px.srcOfficial}<span class="vh">${UI.newWin}</span></a>`;
const monHoursHtml = (f) => { const h = f.monHours; return `${h.text} · ${UI.price.checked(h.checked)} · <a href="${escQ(h.src)}" target="_blank" rel="noopener noreferrer">${UI.px.srcMonShort}<span class="vh">${UI.newWin}</span></a>${h.old ? ` <em class="old">${UI.px.old}</em>` : ''}`; };
// 문장 속 "¥1,000"에 환산을 덧붙입니다.
const wonize = (s) => !fx.rate || !s ? s : s.replace(/¥\s?([\d,]*\d)/g, (m, d) => `${m}${UI.convTail(conv(+d.replace(/,/g, '')))}`);
const sv = (pair, fallback) => { const s = pair && pair[0] && tr(pair[0]); return s ? wonize(s) + srcA(pair[1]) : fallback; };

// 서로 독립인 JSON 세 개(환율·공식 사이트 점검·좌표)는 동시에 받는다. 값 검증은 아래에서 각각 한다.
const jget = (p) => p.then((r) => (r.ok ? r.json() : null)).catch(() => null);
const DATA_JSON = Promise.all([
  jget(fetch('data/source-status.json', { cache: 'no-cache' })),
  jget(fetch('data/coords.json', { cache: 'no-cache' })),
]);

// data/fx.json 검증(순수 함수): 발행(fetchedAt) 후 36시간이 지났거나 값이 이상하면 쓰지 않는다. 추적 프로그램이 stale 이라 하거나 기준일이 5일 넘게 오래됐으면 stale 표시.
const FX_MAX_AGE = 36 * 3600e3, FX_OLD = 5 * 864e5;
function fxPick(j, code, now) {
  const rate = j?.rates?.[code], asOf = new Date(j?.asOf), got = Date.parse(j?.fetchedAt);
  const [lo, hi] = code === 'KRW' ? [3, 15] : [0.003, 0.02];
  if (!(rate >= lo && rate <= hi) || !Number.isFinite(asOf.getTime()) || !Number.isFinite(got)) return null;
  if (now - got > FX_MAX_AGE || got - now > 3600e3 || !['ok', 'degraded', 'stale'].includes(j.status)) return null;
  return { rate, asOf, status: j.status, stale: j.status === 'stale' || now - asOf.getTime() > FX_OLD };
}
// 접속할 때마다 실시간 출처 3곳(tools/fx/fx-tracker.mjs 와 같은 곳)에서 지금 환율을 받아 중앙값을 쓴다. 방문 간 저장값은 기본값으로 쓰지 않는다.
const FX_LIVE = [
  ['https://open.er-api.com/v6/latest/JPY', (j) => [j.rates[UI.fx], new Date(j.time_last_update_utc)]],
  [`https://api.frankfurter.dev/v1/latest?base=JPY&symbols=${UI.fx}`, (j) => [j.rates[UI.fx], new Date(j.date)]],
  ['https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json', (j) => [j.jpy[UI.fx.toLowerCase()], new Date(j.date)]],
];
const fxRange = () => UI.fx === 'KRW' ? [3, 15] : [0.003, 0.02];
const fxClock = (t) => new Date(t).toLocaleTimeString(UI.loc, { timeZone: UI.tz, hour: '2-digit', minute: '2-digit', hour12: false });
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
let fxFetchedAt = 0; // 마지막으로 새로 받은 시각(ms)
async function loadFx() {
  if (!UI.fx) return;
  const LS = 'onsen-fx-last-' + UI.fx, [lo, hi] = fxRange();
  const got = (await Promise.allSettled(FX_LIVE.map(async ([url, pick]) => {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw 0;
    const [rate, d] = pick(await r.json());
    if (!(rate >= lo && rate <= hi) || !Number.isFinite(d.getTime())) throw 0;
    return { rate, d };
  }))).filter((x) => x.status === 'fulfilled').map((x) => x.value);
  if (got.length) {
    const rate = median(got.map((g) => g.rate)), newest = Math.max(...got.map((g) => g.d.getTime())), now = Date.now();
    Object.assign(fx, { rate, when: fxClock(now), at: now, provider: got.length > 1 ? UI.fxTracker('ok', got.length) : UI.fxRef, status: 'live', stale: now - newest > FX_OLD });
    fxFetchedAt = now;
    try { localStorage.setItem(LS, JSON.stringify({ rate, at: now })); } catch {}
    return;
  }
  // 2순위: 같은 출처의 추적 프로그램 발행본(data/fx.json).
  try {
    const j = await jget(fetch('data/fx.json', { cache: 'no-store' }));
    const p = fxPick(j, UI.fx, Date.now());
    if (p) {
      const n = Array.isArray(j.sources) ? j.sources.filter((s) => s.ok).length : 0;
      Object.assign(fx, { rate: p.rate, when: UI.dateD(p.asOf), at: Date.now(), provider: UI.fxTracker(j.status, n), status: p.status, stale: true });
      return;
    }
  } catch {}
  // 마지막 수단: 지난 방문 때 저장한 값(항상 오래된 값으로 표시). 이미 화면에 값이 있으면 그대로 둔다.
  if (fx.rate) { fx.stale = true; return; }
  try {
    const c = JSON.parse(localStorage.getItem(LS) || 'null');
    if (c && c.rate >= lo && c.rate <= hi) Object.assign(fx, { rate: c.rate, when: UI.dateD(new Date(c.at)), at: c.at, provider: UI.fxRef, status: 'stale', stale: true });
  } catch {}
}
const fxOldTag = () => fx.stale && UI.fxOld ? ` ${UI.fxOld}` : '';
function showFx() {
  const el = $('#fx');
  if (el) el.innerHTML = fx.rate
    ? `<span>${UI.fxLabel}</span>${UI.fxLine(fx.rate)}<small>${UI.fxAsOf(fx.when)} · ${fx.provider || UI.fxRef}${fxOldTag()}</small>`
    : `<span>${UI.fxLabel}</span><small>${UI.fxFail}</small>`;
  const foot = $('#fxFoot');
  if (foot && el) foot.innerHTML = el.innerHTML;
  const hero = $('#fxHero'); // 검색창 아래 환율 줄
  if (hero) hero.innerHTML = el ? el.innerHTML : '';
}

let favs = new Set();
try { favs = new Set(JSON.parse(localStorage.getItem('onsen-favs') || '[]')); } catch {}
// 찜 알림: 안내 문구만 textContent 로 넣는다(스크린리더에는 aria-live 로 읽힌다).
const toastEl = document.createElement('div');
toastEl.id = 'favToast'; toastEl.className = 'fav-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
document.body.append(toastEl);
let toastTimer;
function toast(msg) {
  toastEl.classList.remove('on');
  toastEl.textContent = '';
  clearTimeout(toastTimer);
  requestAnimationFrame(() => { toastEl.textContent = msg; toastEl.classList.add('on'); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2600); });
}
const state = { wide: false, sel: null, shot: 0, favOnly: false, photo: false, priced: false, rg: null, q: '', link: null };

const AREA_REP = new Map();
const areaKey = (a) => { const n = norm(areaName(a)).replace(/[\s\-·・]/g, ''); return n.replace(/(온천|温泉|onsen)$/, '') || n; };
const areaOpt = (a) => 'a:' + (AREA_REP.get(areaKey(a)) || a);
// 조건 입력란 채우기
function fillFilters() {
  const R = UI.rail;
  const regions = [...new Set(FAC.map((f) => f.region))];
  const group = (rg, items) => `<optgroup label="${regionName(rg)}">${items}</optgroup>`;
  $('#prefSel').innerHTML = `<option value="">${R.prefAll}</option>` + regions.map((rg) => group(rg, [...new Set(FAC.filter((f) => f.region === rg).map((f) => f.pref))].map((p) => `<option value="${p}">${prefName(p)}</option>`).join(''))).join('');
  // 같은 온천지의 표기 차이(구로카와 / 구로카와온천 / 구로카와 온천)는 옵션 하나로 합친다. 옵션 값은 그 묶음의 첫 온천지.
  FAC.forEach((f) => { const k = areaKey(f.area); if (!AREA_REP.has(k)) AREA_REP.set(k, f.area); });
  $('#regionSel').innerHTML = `<option value="">${R.areaAll}</option>` + regions.map((rg) =>
    group(rg, [...new Set(FAC.filter((f) => f.region === rg).map((f) => AREA_REP.get(areaKey(f.area))))].map((a) => `<option value="a:${a}">${areaName(a)}</option>`).join(''))).join('');
  const quals = [...new Set(FAC.flatMap((f) => f.quality))].map((q) => [q, FAC.filter((f) => f.quality.includes(q)).length]).sort((a, b) => b[1] - a[1]);
  $('#qualityBox').innerHTML = quals.map(([q, n], i) => `<label class="rowopt${i >= 5 ? ' extra' : ''}"><input type="checkbox" name="quality" value="${q}"><span class="t">${q}</span><span class="n">${n}</span></label>`).join('')
    + (quals.length > 5 ? `<button type="button" class="more-btn" data-more aria-expanded="false">${R.more(quals.length - 5)}</button>` : '');
  document.querySelectorAll('#hsRegion option[value]').forEach((o) => { if (o.value !== '' && !FAC.some((f) => f.region === +o.value)) o.remove(); }); // 등록 시설이 없는 지역(예: 오키나와)은 뺀다
  document.querySelectorAll('[data-n]').forEach((el) => { el.textContent = FAC.filter((f) => f[el.dataset.n] === 'y').length; });
}
// 첫 화면: 지역별 등록 시설 수(전체 등록 기준)와 등록 시설이 많은 온천지
let quickAreas = [];
function fillHome() {
  const H = UI.home, count = new Map();
  FAC.forEach((f) => count.set(f.region, (count.get(f.region) || 0) + 1));
  const max = Math.max(1, ...count.values());
  $('#regionGrid').innerHTML = D.regions.map((_, i) => count.get(i) ? `<li><button type="button" data-rg="${i}" aria-label="${H.regionAria(regionName(i), count.get(i))}"><b>${regionName(i)}</b><span class="rn">${H.regionN(count.get(i).toLocaleString(UI.loc))}</span><i style="width:${(count.get(i) / max * 100).toFixed(1)}%"></i></button></li>` : '').join('');
  const byArea = new Map();
  FAC.forEach((f) => byArea.set(f.area, (byArea.get(f.area) || 0) + 1));
  quickAreas = [...byArea].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a]) => a);
  $('#hsChips').innerHTML = quickAreas.map((a, i) => `<li><button type="button" data-qa="${i}" aria-label="${H.chipAria(areaName(a))}">${areaName(a)}</button></li>`).join('');
}
favs = new Set([...favs].filter((id) => FAC.some((f) => f.id === id))); // 숨김·삭제된 시설의 찜은 화면에서만 뺀다(저장값은 그대로)
fillFilters();
fillHome();
function criteria() {
  const d = new FormData(form);
  const max = +d.get('dayMax') || NO_LIMIT;
  const q = state.q.trim();
  return { rg: state.rg, q, qt: norm(q).split(/\s+/).filter(Boolean), kind: d.get('kind') || 'ryokan', pref: d.get('pref') || '', area: (d.get('region') || '').slice(2), flags: d.getAll('f'), quality: d.getAll('quality'), dayMax: max >= NO_LIMIT ? 0 : max, unp: d.get('unp') != null };
}

// 조건별 판정('y'/'n'/'u')을 모은다. 모두 'y'인 시설만 결과에 든다.
// 가격 조건은 따로 판정한다: 가격을 모르는 시설은 기본으로 결과에 남기고(c.unp), 끄면 제외한다. 숙박이 없다고 확인된 시설만 가격 조건에서 빠진다.
function judge(f, c) {
  const out = c.flags.map((k) => f[k]);
  if (c.quality.length) out.push(!f.quality.length ? 'u' : c.quality.some((q) => f.quality.includes(q)) ? 'y' : 'n');
  return out;
}
const priceOk = (f, c) => !c.dayMax || (f.stay === 'n' ? false : f.stayPrice == null ? c.unp : f.stayPrice <= c.dayMax);
const hasPrice = (f) => f.stayPrice != null || f.dayPrice != null; // '가격 있는 곳만' 칩은 숙박·당일 중 하나라도 있으면 센다. 가격 슬라이더·정렬은 숙박 가격만 쓴다.
const dayShown = (f) => f.day !== 'n' && f.dayPrice != null; // 당일 입욕 가격은 숙박 가격과 섞지 않고 따로 라벨을 붙여 보인다
const stayNp = (f) => f.stay !== 'n' && f.stayPrice == null && dayShown(f); // 숙박 가격만 비고 당일 가격이 있으면 '가격 미공개' 대신 '숙박 요금 미공개'

// 온천수 종류 이름 → 온천수 안내 페이지의 앵커(없는 종류는 글자만)
const WATER_SLUG = { '単純温泉': 'w-simple', '二酸化炭素泉': 'w-co2', '塩化物泉': 'w-chloride', '炭酸水素塩泉': 'w-bicarbonate', '硫酸塩泉': 'w-sulfate', '含鉄泉': 'w-iron', '硫黄泉': 'w-sulfur', '酸性泉': 'w-acidic', '放射能泉': 'w-radioactive', '含よう素泉': 'w-iodine' };
const waterLink = (key, label) => WATER_SLUG[key] ? `<a class="wt" href="${UI.href.water}#${WATER_SLUG[key]}" target="_blank" rel="noopener">${label}<span class="vh">${UI.newWin}</span></a>` : label;
const qualityLinks = (f, n) => f.quality.slice(0, n).map((label, i) => waterLink(f.qualityKeys[i], label));

const tags = (f) => [
  f.open === 'y' && LABEL.open, f.priv === 'y' && LABEL.priv, f.room === 'y' && LABEL.room,
].filter(Boolean).map((t) => `<li>${t}</li>`).join('') +
  [f.flow === 'y' && LABEL.flow].filter(Boolean).map((t) => `<li class="water">${t}</li>`).join('');

// 카드 배지: 이용 방식(숙박·당일 입욕). 둘 다 모르면 시설 유형을 보여 준다.
const badges = (f) => {
  const b = [f.stay === 'y' && `<span class="bdg stay">${LABEL.stay}</span>`, f.day === 'y' && `<span class="bdg day">${LABEL.day}</span>`].filter(Boolean);
  if (!b.length) b.push(`<span class="bdg nc">${UI.det.kind[f.kind] || UI.det.kind.unknown}</span>`);
  return `<p class="badges">${b.join('')}</p>`;
};
const factsLine = (f) => {
  const text = [qualityLinks(f, 2).join(' · '), f.tempS].filter(Boolean).join(' · ');
  return text ? `<p class="fline">${ic('drop')}<span>${text}</span></p>` : '';
};

// 공식 사이트 주소(운영 확인용으로 바꿔 둔 시설·http 아닌 값은 제외)
const officialHref = (f) => !f.x.hideBooking && /^https?:\/\//.test(f.hp || '') ? f.hp : '';
const officialLink = (f, cls) => officialHref(f) ? `<a class="${cls}" href="${officialHref(f)}" target="_blank" rel="noopener noreferrer">${ic('out')}${UI.det.official}<span class="vh">${UI.newWin}</span></a>` : '';
const heart = (f, withText) => `<button type="button" class="fav${withText ? ' txt' : ''}" data-fav="${f.id}" aria-pressed="${favs.has(f.id)}" aria-label="${UI.favAria(f.name)}" title="${UI.favAria(f.name)}">${ic('heart')}${withText ? `<span>${UI.fav}</span>` : ''}</button>`;

// 사진이 없는 시설: 같은 4열 격자 안의 낮은 카드(이름순 유지). 한 줄에는 아는 값만 보이고, "미확인" 안내는 목록 위에 한 번(#npNote)과 서랍에 있다.
// 도도부현 칩: ko·ja는 현/부/도/県/府/都를 뗀 이름(홋카이도·北海道는 그대로), en은 47곳 안에서 겹치지 않는 가장 짧은 3글자 이상 앞부분.
const PREF_SHORT = (() => {
  const full = Object.keys(D.prefs).map((jp) => [jp, unesc(prefName(jp))]);
  if (LANG !== 'en') return Object.fromEntries(full.map(([jp, n]) => [jp, /^(홋카이도|北海道)$/.test(n) ? n : n.replace(/[현부도県府都]$/, '')]));
  const up = full.map(([jp, n]) => [jp, n.toUpperCase().replace(/[^A-Z]/g, '')]);
  return Object.fromEntries(up.map(([jp, n]) => { let l = 3; while (l < n.length && up.some(([o, m]) => o !== jp && m.startsWith(n.slice(0, l)))) l++; return [jp, n.slice(0, l)]; }));
})();
const prefChip = (f) => escQ(PREF_SHORT[f.pref] || Array.from(unesc(f.prefName)).slice(0, 3).join(''));
const CARD_FACTS = {
  ko: ['숙박 요금', '당일 입욕료', '입욕 가능 시간', '미확인'],
  ja: ['宿泊料金', '日帰り入浴料', '入浴時間', '未確認'],
  en: ['Stay price', 'Day-bath fee', 'Bath hours', 'Unconfirmed']
}[LANG];
function cardFacts(f) {
  const [stay, dayFee, hours, unknown] = CARD_FACTS;
  const unknownValue = `<span class="card-fact-unknown">${unknown}</span>`;
  const mon = f.monHours?.label === 'day' ? f.monHours : null;
  const evidence = (source, label) => source
    ? `<small>${UI.price.checked(source.checked)} · <a href="${escQ(source.src)}" target="_blank" rel="noopener noreferrer">${label}<span class="vh">${UI.newWin}</span></a>${source.old ? ` · ${UI.px.old}` : ''}</small>` : '';
  const item = (label, value, detail = '') => `<div><dt>${label}</dt><dd>${value}${detail}</dd></div>`;
  const stayValue = f.stayPrice == null ? unknownValue : stayMoney(f);
  const dayValue = dayShown(f) ? dayMoney(f) : unknownValue;
  const hoursValue = f.dayHours || mon?.text || unknownValue;
  let stayDetail = '';
  if (f.off) stayDetail = `<small>${basisText(f)}</small>` + evidence(f.off, f.off.assoc ? UI.px.srcAssocShort : UI.px.srcOfficial);
  else if (f.stayPrice != null) stayDetail = `<small>${UI.stayBasis}</small>`;
  else {
    const reference = refText(f);
    if (reference) stayDetail = `<small>${reference}</small>`;
  }
  if (f.stay === 'n' && f.day === 'n') return '';
  return `<dl class="card-facts">
    ${f.stay !== 'n' ? item(stay, stayValue, stayDetail) : ''}
    ${f.day !== 'n' ? item(dayFee, dayValue) + item(hours, hoursValue, !f.dayHours ? evidence(mon, UI.px.srcOfficial) : '') : ''}
  </dl>`;
}
function compactCard(f) {
  const sel = state.sel === f.id;
  const known = [f.stayPrice != null && f.stay !== 'n' && `${UI.stayShort} ${moneyText(f.stayPrice, f.off ? '〜' : '')} (${f.off ? basisText(f) : UI.stayBasis})`, dayShown(f) ? `${UI.dayPriceLabel} ${moneyText(f.dayPrice, f.dayPriceRange ? '〜' : '')}` : f.day === 'y' && UI.dayNoPrice, stayNp(f) && UI.noStayPrice, refText(f), UI.det.checkedOn(f.checked)].filter(Boolean).join(' · ');
  return `
  <article class="card nophoto-card${sel ? ' sel' : ''}" data-id="${f.id}">
    <span class="np-chip" aria-hidden="true">${ic('onsen')}<b>${prefChip(f)}</b></span>
    <div class="body">
      <h3><button type="button" class="pick" aria-expanded="${sel}" data-pick="${f.id}">${f.name}</button></h3>
      <p class="loc">${f.areaName}</p>
      <p class="np-line">${known}</p>
      ${cardFacts(f)}
      ${officialLink(f, 'card-off')}
    </div>
    <div class="side">${heart(f)}</div>
  </article>`;
}
function card(f) {
  if (!f.shots.length) return compactCard(f);
  const sel = state.sel === f.id;
  return `
  <article class="card${sel ? ' sel' : ''}" data-id="${f.id}">
    <div class="ph"><img class="pic" data-photo-kind="${f.shots[0][3]?.kind || 'unknown'}" src="${shotUrl(f.shots[0], 500)}" width="500" height="375" alt="${photoAlt(f, f.shots[0])}" loading="lazy" decoding="async">${f.shots.length > 1 ? `<span class="pcount">${ic('photo')}${f.shots.length}</span>` : ''}${coverageLabel(f.shots[0])}<small class="card-credit" hidden>${photoCredit(f.shots[0])}</small></div>${coverageCredit(f.shots[0])}
    <div class="body">
      ${badges(f)}
      <h3><button type="button" class="pick" aria-expanded="${sel}" data-pick="${f.id}">${f.name}</button></h3>
      <p class="loc">${ic('pin')}${where(f)}</p>
      ${factsLine(f)}
      ${f.blurb ? `<p class="blurb">${f.blurb}</p>` : ''}
      ${f.x.notice ? `<p class="why">${UI.notice}</p>` : ''}
      <ul class="tags">${tags(f)}</ul>
      ${cardFacts(f)}
      ${officialLink(f, 'card-off') ? officialLink(f, 'card-off') + `<small class="off-note">${UI.px.book}</small>` : ''}
    </div>
    <div class="side">
      ${heart(f)}
      <div class="prices">${f.stayPrice != null && f.stay !== 'n' ? `<p class="price"><small>${f.off ? basisText(f) : UI.priceSmall}</small>${stayMoney(f)}${f.off ? (f.off.old ? `<small class="old">${UI.px.old}</small>` : '') : f.stayPriceNote ? `<small>${UI.seeDetail}</small>` : ''}</p>` : f.stay !== 'n' ? `<p class="price noprice"><small>${stayNp(f) ? UI.noStayPrice : UI.noPrice}</small></p>${refLine(f)}` : ''}${dayShown(f) ? `<p class="price day"><small>${UI.dayPriceLabel}</small>${dayMoney(f)}</p>` : ''}</div>
    </div>
  </article>`;
}

const v3 = (v, y = UI.has, n = UI.hasNot) => v === 'y' ? y : v === 'n' ? n : unk;
const t = (v) => { const s = v && tr(v); return s ? wonize(s) : unk; };
const row = (k, v) => !v || v === unk ? '' : `<div><dt>${k}</dt><dd>${v}</dd></div>`;
// 개수 표기: 개수를 모르면 이름만
const withN = (label, n, fmt) => n ? UI.withCnt(label, fmt(n)) : label;

const bathInfo = (f) => [[f.open, f.openN, UI.cnt, LABEL.open], [f.priv, f.privN, UI.cnt, LABEL.priv], [f.room, f.roomN, UI.roomCnt, LABEL.room]]
  .map(([v, n, fmt, label]) => v === 'y' ? withN(label, n, fmt) : v === 'n' ? `${label} ${UI.hasNot}` : '').filter(Boolean);

// 비교 창: 찜한 시설 2~4곳을 표로 나란히. 빈 값은 "확인되지 않음", 최저가 표시는 확인된 값끼리만(값이 2개 이상이고 서로 다를 때).
// 값은 db-loader가 이미 이스케이프했고 주소는 officialHref·http(s) 검사를 거친다. <dialog> 라서 포커스 가둠·Esc·포커스 복귀는 브라우저가 한다.
const CMP_MAX = 4;
const cmpDlg = document.createElement('dialog');
cmpDlg.id = 'cmp'; cmpDlg.className = 'cmp'; cmpDlg.setAttribute('aria-labelledby', 'cmpTitle');
document.body.append(cmpDlg);
let cmpSel = [];
function cmpRender(focusId) {
  const C = UI.cmp, T = UI.det, TL = T.tile, nc = `<span class="nc">${T.nc}</span>`;
  const all = [...favs].map((id) => FAC.find((f) => f.id === id)).filter(Boolean);
  if (all.length < 2) return cmpDlg.close();
  cmpSel = cmpSel.filter((id) => favs.has(id));
  const fs = all.filter((f) => cmpSel.includes(f.id));
  const price = { stay: (f) => f.stay === 'n' ? null : f.stayPrice, day: (f) => f.day === 'n' ? null : f.dayPrice };
  const priceRow = (k, none) => {
    // 최저 표시는 확인된 값끼리, 같은 기준(식사 조건)일 때만
    const pf = fs.filter((f) => price[k](f) != null), v = pf.map(price[k]), lo = new Set(pf.map((f) => f.off?.basis)).size < 2 && v.length > 1 && Math.min(...v) < Math.max(...v) ? Math.min(...v) : null;
    return (f) => f[k] === 'n' ? none : (price[k](f) == null ? (k === 'stay' && stayNp(f) ? `<span class="nc">${TL.stayNp}</span>` : nc) : (k === 'stay' ? stayMoney(f) : dayMoney(f)) + (price[k](f) === lo ? ` <em class="low">${C.low}</em>` : '') + (k === 'stay' && f.off ? `<small>${basisText(f)}</small><small>${f.off.assoc ? UI.px.srcAssocShort : f.off.mon ? UI.px.srcMonShort : UI.px.srcOfficial}</small>${f.off.old ? `<small class="old">${UI.px.old}</small>` : ''}` : '')) + (k === 'day' && f.day !== 'n' && f.dayHours ? `<small>${f.dayHours}</small>` : '');
  };
  const source = (f) => /^https?:\/\//.test(f.srcUrl || '') ? (f.srcUrl === officialHref(f) ? C.same : `<a href="${f.srcUrl}" target="_blank" rel="noopener noreferrer">${T.sourcePage}<span class="vh">${UI.newWin}</span></a>`) : nc;
  const rows = [
    [C.area, where],
    [TL.stay, priceRow('stay', TL.noStay)],
    [TL.day, priceRow('day', TL.noDay)],
    [TL.water, (f) => [qualityLinks(f, 99).join(' · '), f.tempS && TL.temp(f.tempS)].filter(Boolean).join('<br>') || nc],
    [TL.bath, (f) => bathInfo(f).join('<br>') || nc],
    [T.official, (f) => officialLink(f, 'btn') || nc],
    [T.sourcePage, source],
    [C.checked, (f) => T.checkedOn(f.x.checked || f.checked)],
  ];
  // 모든 열이 '확인되지 않음'인 행은 표에서 빼고 마지막에 한 줄로 합친다
  const cells = rows.map(([label, fn]) => [label, fs.map(fn)]);
  const empty = cells.filter(([, c]) => c.length && c.every((h) => h === nc)).map(([l]) => l);
  const body = cells.filter(([l]) => !empty.includes(l)).map(([label, c]) => `<tr><th scope="row">${label}</th>${c.map((h) => `<td>${h}</td>`).join('')}</tr>`).join('');
  const head = (f) => `<th scope="col">${f.shots.length ? `<img src="${shotUrl(f.shots[0], 500)}" width="500" height="375" alt="" loading="lazy">` : `<span class="cmp-chip" aria-hidden="true">${prefChip(f)}</span>`}<b>${f.name}</b><button type="button" class="cmp-rm" data-cmp-rm="${f.id}" aria-label="${UI.px.rmAria(f.name)}">${UI.px.rm}</button></th>`;
  cmpDlg.innerHTML = `
    <div class="cmp-top"><h2 id="cmpTitle">${C.title}</h2><button type="button" class="cmp-x" data-cmp-close aria-label="${UI.close}">×</button></div>
    <p class="cmp-note">${C.note}</p>
    ${fs.length >= 2 ? `<p class="cmp-note cmp-comp"><b>${UI.px.comp(fs.filter((f) => price.stay(f) != null || price.day(f) != null).length, fs.filter((f) => f.quality.length).length, fs.length)}</b> · ${UI.px.book}</p>` : ''}
    ${all.length > CMP_MAX ? `<fieldset class="cmp-pick"><legend>${C.pick(CMP_MAX)}</legend>${all.map((f) => { const on = cmpSel.includes(f.id); return `<label><input type="checkbox" value="${f.id}"${on ? ' checked' : ''}${!on && fs.length >= CMP_MAX ? ' disabled' : ''}><span>${f.name}</span></label>`; }).join('')}</fieldset>` : ''}
    ${fs.length < 2 ? `<p class="cmp-note" role="status">${C.need}</p>` : `<div class="cmp-wrap" role="region" aria-labelledby="cmpTitle" tabindex="0"><table><thead><tr><th scope="col"><span class="vh">${C.title}</span></th>${fs.map(head).join('')}</tr></thead>
      <tbody>${body}${empty.length ? `<tr class="cmp-unconf"><th scope="row">${C.unconf}</th><td colspan="${fs.length}">${empty.join(' · ')}: ${nc}</td></tr>` : ''}</tbody></table></div>
      ${fs.some((f) => price.stay(f) != null || price.day(f) != null) ? `<p class="cmp-note">${fx.rate ? UI.fxNote(fx.when, UI.fxRateText(fx.rate)) + fxOldTag() + ' · ' : ''}${UI.priceDisclaimer}</p>` : ''}`}`;
  if (focusId) cmpDlg.querySelector(`input[value="${focusId}"]`)?.focus();
}
$('#cmpBtn').addEventListener('click', () => { if (favs.size < 2) return toast(UI.cmp.need); cmpSel = [...favs].slice(0, CMP_MAX); cmpRender(); if (!cmpDlg.open && favs.size > 1) cmpDlg.showModal(); });
cmpDlg.addEventListener('click', (e) => {
  const rm = e.target.closest('[data-cmp-rm]');
  if (rm) { favs.delete(rm.dataset.cmpRm); try { localStorage.setItem('onsen-favs', JSON.stringify([...favs])); } catch {} render(); return; }
  if (e.target === cmpDlg || e.target.closest('[data-cmp-close]')) cmpDlg.close(); });
cmpDlg.addEventListener('change', (e) => { const id = e.target.value; cmpSel = e.target.checked ? [...cmpSel, id] : cmpSel.filter((x) => x !== id); cmpRender(id); });

function gallery(f) {
  if (!f.shots.length) {
    const photoPages = {
      'ryokan-research-4': ['https://abe-ryokan.jp/', UI.photoPages[0]],
      'ryokan-research-6': ['https://www.seiryuso.net/sub03/', UI.photoPages[1]],
      'ryokan-nov13-2': ['https://www.asobo-saga.jp/stays/detail/764e9e61-69b6-40ba-b296-b9173cce74de', UI.photoPages[2]],
      'ryokan-nov13-8': ['https://www.kagoshima-kankou.com/houjin/photo/2397', UI.photoPages[3]]
    };
    const page = photoPages[f.id];
    return `<figure class="gal gal-none"><p class="nophoto">${ic('onsen')}<span>${UI.noPhoto}</span></p>${page ? `<figcaption><a href="${page[0]}" target="_blank" rel="noopener">${page[1]}</a></figcaption>` : ''}</figure>`;
  }
  const i = Math.min(state.shot, f.shots.length - 1), s = f.shots[i], many = f.shots.length > 1;
  return `
  <figure class="gal" data-gal="${f.id}">
    <div class="stage">
      <img class="big" data-photo-kind="${s[3]?.kind || 'unknown'}" src="${shotUrl(s, 960)}" width="960" height="540" alt="${photoAlt(f, s)}" decoding="async">
      ${many ? `<button type="button" class="nav prev" data-shot="prev" aria-label="${UI.prevPhoto}">${ic('left')}</button>
      <button type="button" class="nav next" data-shot="next" aria-label="${UI.nextPhoto}">${ic('right')}</button>
      <span class="counter" aria-live="polite">${i + 1} / ${f.shots.length}</span>` : ''}
    </div>
    ${many ? `<div class="thumbs">${f.shots.map((x, n) => `<button type="button" data-shot="${n}" aria-label="${UI.photoN(n + 1)}" aria-current="${n === i}">${n + 1}</button>`).join('')}</div>` : ''}
    <figcaption>${UI.photoLine(`<span class="photo-caption">${photoAlt(f, s)}</span>`)}<span class="by" hidden>${photoCredit(s)}</span></figcaption>
  </figure>`;
}

// 상세 서랍: 이동 경로 → 머리글(배지·이름·위치) → 바로가기 → 사진 → 핵심 4칸 → 소개 → 시설 정보 표 → 읽는 방법 → 확인 6가지 → 질문 → 같은 지역 → 출처·오류 신고.
// 값이 없는 칸은 "확인되지 않음"으로 두고 추정해서 채우지 않는다.
// 지도 링크: 시설 단위 좌표가 있으면 좌표로, 아니면 이름 문자열 검색으로만 연다(좌표가 대략적이면 정확한 위치처럼 보이게 하지 않는다).
const mapLinkList = (f, T) => {
  const c = COORDS[f.id];
  if (c?.precision === 'facility' && Number.isFinite(c.lat) && Number.isFinite(c.lon)) {
    const ll = encodeURIComponent(`${c.lat.toFixed(6)},${c.lon.toFixed(6)}`);
    return [[T.mapOpen, `https://www.google.com/maps/search/?api=1&query=${ll}`], [T.mapDir, `https://www.google.com/maps/dir/?api=1&destination=${ll}`]];
  }
  return [[T.mapOpen, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([f.alt || f.name, f.address || f.pref].map(unesc).join(' '))}`]];
};
const collator = new Intl.Collator({ ko: 'ko', ja: 'ja', en: 'en' }[LANG], { numeric: true, sensitivity: 'base' });
// 승인된 공식 공지(db-loader가 받을 때 이스케이프·URL 검증을 마친 값). 없으면 빈 문자열이라 화면이 그대로다.
function noticeHtml(f) {
  const list = (window.ONSEN_NOTICES && window.ONSEN_NOTICES.get(f.id)) || [], N = UI.offNotice;
  if (!list.length) return '';
  return `<section class="d-notice"><h4>${N.t}</h4><ul>${list.slice(0, 3).map((n) => `<li><b lang="ja">${n.title || ''}</b>${n.date ? `<time datetime="${n.date}">${n.date}</time>` : ''}<p lang="ko">${n.summary}</p>${n.url ? `<a href="${n.url}" target="_blank" rel="noopener">${N.src}<span class="vh">${UI.newWin}</span></a>` : ''}</li>`).join('')}</ul><p class="dn-note">${N.note}</p></section>`;
}
function detailHtml(f) {
  const x = f.x, R = UI.row, P = UI.price, T = UI.det, TL = T.tile;
  const nc = `<span class="nc">${T.nc}</span>`;
  const sites = (x.hideBooking ? [] : [['Booking.com', ...(x.booking || [])], ['Trip.com', ...(x.trip || [])], [UI.sites.jalan, x.jalan], [UI.sites.rakuten, x.rakuten]]).filter(([, url]) => url);
  const more = (x.more || []).map(([text, url]) => tr(text) ? `<li>${wonize(tr(text))}${srcA(url)}</li>` : '').join('');
  const cardText = f.cardText && /[A-Za-z가-힣]/.test(f.cardText) ? tr(f.cardText) : '';
  const shuttleText = /[가-힣]/.test(f.shuttleText || '') ? tr(f.shuttleText) : '';
  const notice = x.notice && sv(x.notice, '');
  const checkedDay = x.checked || f.checked;
  const temp = LANG === 'ko' ? f.temp : f.tempS;

  // 핵심 4칸
  const bathLines = bathInfo(f);
  const tiles = [
    [TL.stay, f.stay === 'n' ? `<span class="tv-t">${TL.noStay}</span>` : f.stayPrice != null ? stayMoney(f) : stayNp(f) ? `<span class="nc">${TL.stayNp}</span>` : nc, f.stay !== 'n' && f.stayPrice != null ? (f.off ? basisText(f) : TL.stayUnit) : ''],
    [TL.day, f.day === 'n' ? `<span class="tv-t">${TL.noDay}</span>` : f.dayPrice != null ? dayMoney(f) : nc, f.day === 'n' ? '' : f.dayHours || ''],
    [TL.water, f.quality.length ? `<span class="tv-t">${qualityLinks(f, 99).join(' · ')}</span>` : nc, temp ? TL.temp(temp) : `${R.temp} ${T.nc}`],
    [TL.bath, bathLines.length ? `<span class="tv-t">${bathLines.map((l) => `<span>${l}</span>`).join('')}</span>` : nc, ''],
  ];
  // 네 칸이 모두 미확인이면 한 줄로 합친다(일부만 비었으면 칸마다 "확인되지 않음"을 그대로 둔다).
  const allUnconfirmed = f.stay !== 'n' && f.stayPrice == null && f.day !== 'n' && f.dayPrice == null && !f.quality.length && !temp && !bathLines.length;
  const ps = OP.stats[f.pref], refAvg = ps && ps.n >= 5 && [ps.median, ps.min, ps.max].every(Number.isFinite) ? `<p class="ref-avg">${UI.px.avg(f.prefName, yen(ps.median), ps.n, yen(ps.min), yen(ps.max))}</p>` : '';
  const tileHtml = tiles.map(([k, v, sub]) => `<li class="tile"><span class="tk">${k}</span><span class="tv">${v}</span>${sub ? `<span class="ts">${sub}</span>` : ''}</li>`).join('');
  const tnotes = [
    f.off && f.stay !== 'n' ? `${basisText(f)} · ${P.checked(f.off.checked)} · ${offSrcLink(f)}${oldTag(f)}` : '',
    f.stayPriceNote && f.stay !== 'n' ? `${f.stayPriceNote} · ${P.checked(f.checked)}${srcA(f.srcUrl)}` : '',
    f.dayNote ? wonize(f.dayNote) : '',
    f.stay !== 'n' && f.stayP ? `${LABEL.stay}: ${wonize(f.stayP)}` : '',
    fx.rate && (f.dayPrice != null || f.stayPrice != null) ? UI.fxNote(fx.when, UI.fxRateText(fx.rate)) + fxOldTag() : '',
    f.dayPrice != null || f.stayPrice != null ? UI.priceDisclaimer : '', // 가격은 참고용 한 줄(카드마다 반복하지 않는다)
  ].filter(Boolean).map((n) => `<li>${n}</li>`).join('');

  // 시설 정보 표: 값이 있는 줄만
  const rows = [
    f.address ? row(R.address, `<span lang="ja">${f.address}</span>`) : '',
    row(R.dayHours, f.day === 'n' ? R.noDayTake : t(f.dayHours)),
    f.monHours && (f.day !== 'n' || f.monHours.label === 'biz') ? row(UI.px.monH[f.monHours.label], monHoursHtml(f)) : '', // 원본 시간은 그대로 두고, 모니터링 시간은 출처·확인일과 함께 별도 줄
    x.privateBath ? row(R.privateBath, sv(x.privateBath)) : '',
    x.dayUse ? row(R.dayUse(x.checked), sv(x.dayUse)) : '',
    row(R.closed, sv(x.closed, t(f.closed))),
    row(R.mixed, sv(x.mixed, t(f.mixed))),
    row(R.payment, sv(x.payment, f.pay || (f.card === 'y' ? `${R.cardOk}${cardText ? ` (${cardText})` : ''}` : unk))),
    row(R.access, sv(x.access, f.shuttle === 'y' ? (shuttleText || R.shuttle) : unk)),
    row(R.towels, sv(x.towels, t(f.towel))),
    row(R.open, f.open === 'u' ? unk : f.open === 'n' ? UI.hasNot : f.openN ? UI.cnt(f.openN) : UI.has),
    row(R.priv, f.priv === 'u' ? unk : f.priv === 'n' ? UI.hasNot : f.privN ? UI.cnt(f.privN) : UI.has),
    row(R.room, f.room === 'u' ? unk : f.room === 'n' ? UI.hasNot : f.roomN ? UI.roomCnt(f.roomN) : UI.has),
    row(R.flow, v3(f.flow, R.flowYes, R.flowNo)),
    row(R.color, f.colors.length ? f.colors.join(', ') : unk),
    row(R.temp, temp ? `${temp} <small>${R.tempNote}</small>` : unk),
    f.stay !== 'n' ? row(R.solo, v3(f.solo, UI.can, UI.cannot)) + row(R.sudo, v3(f.sudo, UI.can, UI.cannot)) + row(R.ci, f.ci ? `${f.ci} / ${f.co}` : unk) : '',
    row(R.park, v3(f.park)),
  ].join('');

  // 같은 지역의 다른 시설(없으면 같은 도도부현)
  let peers = FAC.filter((o) => o.id !== f.id && o.area === f.area), samePref = false;
  if (!peers.length) { peers = FAC.filter((o) => o.id !== f.id && o.pref === f.pref); samePref = true; }
  peers = peers.sort((a, b) => collator.compare(a.name, b.name)).slice(0, 6);

  const chipsHead = [
    f.kind !== 'unknown' && T.kind[f.kind] && `<li>${T.kind[f.kind]}</li>`,
    f.stay === 'y' && `<li class="stay">${LABEL.stay}</li>`, f.day === 'y' && `<li class="day">${LABEL.day}</li>`,
    x.notice && `<li class="warn">${UI.notice}</li>`, `<li class="date">${T.checkedOn(checkedDay)}</li>`,
  ].filter(Boolean).join('');
  const hpHref = x.hideBooking ? x.notice?.[1] : f.hp;
  // 가격이 하나도 없으면 공식·예약 사이트 링크를 위쪽(바로가기 바로 아래)으로 올린다.
  const noPrice = f.stayPrice == null && f.dayPrice == null;
  const sitesHtml = sites.length ? `<div class="sites"><b>${UI.sites.title}</b><ul>${sites.map(([name, url, score, count]) =>
    `<li><a href="${url}" target="_blank" rel="noopener">${name}${ic('out')}<span class="vh">${UI.newWin}</span></a>${score ? `<small>${UI.sites.rating(score, count ? Number(count).toLocaleString(UI.loc) : '')}</small>` : ''}</li>`).join('')}</ul>
    <p>${UI.sites.note}${sites.some((s) => s[2]) ? UI.sites.ratingNote(CHECKED) : ''}</p></div>` : '';
  const mapLinks = mapLinkList(f, T).map(([label, url]) => `<a class="btn line" href="${url}" target="_blank" rel="noopener">${ic('out')}${label}<span class="vh">${UI.newWin}</span></a>`).join('');
  return `
  <nav class="crumbs" aria-label="${T.crumbAria}"><ol>
    <li><a href="#" data-act="home">${T.home}</a></li>
    ${f.region >= 0 ? `<li><a href="#results" data-act="rg" data-rg="${f.region}">${f.regionName}</a></li>` : ''}
    ${f.regionName !== f.prefName ? `<li><a href="#results" data-act="pref" data-pref="${f.pref}">${f.prefName}</a></li>` : ''}
  </ol></nav>
  <ul class="d-badges">${chipsHead}</ul>
  <div class="d-head">
    <div><h3>${f.name}</h3>${f.alt ? `<p class="jp" lang="ja">${f.alt}</p>` : ''}</div>
    ${heart(f, true)}
  </div>
  <p class="loc">${ic('pin')}${where(f)}${f.place ? ` · ${f.place}` : ''}</p>
  <div class="cta">
    ${hpHref ? `<a class="btn" href="${hpHref}" target="_blank" rel="noopener">${ic('out')}${x.hideBooking ? UI.btn.check : T.official}<span class="vh">${UI.newWin}</span></a>${x.hideBooking ? '' : `<small class="off-note">${UI.px.book}</small>`}` : ''}
    ${f.srcUrl && f.srcUrl !== hpHref ? `<a class="btn line" href="${f.srcUrl}" target="_blank" rel="noopener">${ic('book')}${T.sourcePage}<span class="vh">${UI.newWin}</span></a>` : ''}
  </div>
  ${noticeHtml(f)}
  ${noPrice ? sitesHtml : ''}
  ${gallery(f)}
  ${allUnconfirmed ? `<p class="tiles-none">${T.allUnconf(checkedDay)}</p>` : `<ul class="tiles">${tileHtml}</ul>`}
  ${tnotes ? `<ul class="tnotes">${tnotes}</ul>` : ''}
  ${refAvg}
  ${notice ? `<p class="notice">${notice} <small>${P.checkedParen(x.checked)}</small></p>` : ''}
  ${f.blurb ? `<h4>${T.intro}</h4><p class="blurb">${f.blurb}</p>` : ''}
  ${rows ? `<h4>${T.table}</h4><dl class="check d-table">${rows}</dl>` : ''}
  ${more ? `<h4>${UI.know}</h4><ul class="more">${more}</ul>` : ''}
  ${f.over ? `<p class="over">${wonize(f.over)}</p>` : ''}
  ${noPrice ? '' : sitesHtml}
  <section class="d-map"><h4>${T.mapTitle}</h4><div class="d-mapbox" data-pref="${f.pref}" role="img" aria-label="${T.mapAria.pref(f.prefName)}"></div><p class="d-maphint">${T.mapHint}</p><div class="d-maplinks">${mapLinks}</div></section>
  <section class="d-read"><h4>${T.readTitle}</h4><ul>${T.read.map((s) => `<li>${s}</li>`).join('')}</ul></section>
  <section class="d-six"><h4>${T.sixTitle}</h4><p class="six-more"><a href="${UI.href.guideBefore}" target="_blank" rel="noopener">${T.sixMore}<span class="vh">${UI.newWin}</span></a></p><ol>${T.six.map(([b, s]) => `<li><b>${b}</b><span>${s}</span></li>`).join('')}</ol></section>
  <section class="d-faq"><h4>${T.faqTitle}</h4><dl>${T.faq.map(([q, a]) => `<div><dt>${q}</dt><dd>${a}</dd></div>`).join('')}</dl></section>
  ${peers.length ? `<section class="d-same"><h4>${samePref ? T.samePrefTitle : T.sameTitle}</h4><ul>${peers.map((o) => `<li><a href="#" data-open="${o.id}"><b>${o.name}</b><small>${samePref ? o.areaName : where(o)}</small></a></li>`).join('')}</ul></section>` : ''}
  <div class="d-src"><h4>${T.srcTitle}</h4>
    ${srcStatusHtml(f)}
    <p>${T.srcLine(f.checked)}${srcA(f.srcUrl)} · <a href="sources.html?lang=${LANG}#facility-${encodeURIComponent(f.id)}">${UI.sourcesLink}</a></p>
    <p><button type="button" class="btn line rep" data-act="report">${T.report}</button> <small>${T.reportHint}</small></p>
  </div>`;
}

// 상세 위치 지도: 자료에 좌표가 없어 도도부현 도형을 강조해 보여 준다(국토지리원 타일). 정확한 위치는 지도 검색 링크로 안내.
// 공식 사이트 점검 상태(tools/tracker 가 발행하는 data/source-status.json). 상태·날짜만 담기며 값은 형식 검증 후에만 쓴다.
const SRC = {};
// 시설 좌표(tools/geocode 가 발행하는 data/coords.json). precision 이 facility 면 정확한 핀, area 면 온천지 중심의 대략 범위, 그 외에는 도도부현 도형만.
const COORDS = {};
DATA_JSON.then(([status, coords]) => {
  for (const [id, v] of Object.entries(status?.items || {})) {
    if (/^[\w-]{1,80}$/.test(id) && ['ok', 'changed', 'unreachable', 'blocked'].includes(v?.state) && /^\d{4}-\d{2}-\d{2}$/.test(v.checked || '')) SRC[id] = { state: v.state, checked: v.checked };
  }
  for (const [id, v] of Object.entries(coords?.items || {})) {
    const { lat, lon, precision } = v || {};
    if (/^[\w-]{1,80}$/.test(id) && Number.isFinite(lat) && Number.isFinite(lon) && lat >= 20 && lat <= 46 && lon >= 122 && lon <= 154 && ['facility', 'area'].includes(precision)) COORDS[id] = { lat, lon, precision };
  }
  if (state.sel) render(); // 서랍이 먼저 열려 있었다면 점검 상태·좌표를 넣어 다시 그린다
});
// 공식 사이트 점검 상태(tools/tracker 가 발행하는 data/source-status.json): 공개 화면에는 확인일과 상태만 보인다(휴업·요금·영업시간 키워드 표시는 검토 전까지 공개하지 않는다).
function srcStatusHtml(f) {
  const s = SRC[f.id], T = UI.src;
  if (!s || !T) return '';
  return `<p class="d-srcst d-srcst-${s.state}"><b>${T.label}</b> · ${s.checked} · ${T[s.state]}</p>`;
}
let detailMap = null;
// 위치 정확도 3단계: facility(시설 핀) / area(온천지 주변의 대략적 원) / 그 외(도도부현 도형만). 시설 단계 아래에서는 정확해 보이는 핀을 그리지 않는다.
function initDetailMap() {
  const box = document.querySelector('#detail .d-mapbox');
  if (!box || typeof L === 'undefined' || typeof JAPAN_PREFECTURES === 'undefined') return box?.closest('.d-map')?.remove();
  const id = Object.keys(DATA_I18N.prefs).indexOf(box.dataset.pref) + 1;
  const feature = JAPAN_PREFECTURES.features.find((s) => Number(s.properties.id) === id);
  if (!feature) return box.closest('.d-map').remove();
  const T = UI.det, f = FAC.find((x) => x.id === state.sel);
  // 터치 기기에서는 한 손가락 드래그를 끄고(서랍 스크롤 우선) 두 손가락으로만 움직인다.
  detailMap = L.map(box, { scrollWheelZoom: false, attributionControl: true, dragging: !L.Browser.mobile });
  detailMap.setView([36.3, 137.4], 5, { animate: false }); // 벡터 도형을 올리기 전에 시점을 먼저 정해야 한다(숨겨진 서랍 안에서 생성되므로)
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', { minZoom: 2, maxZoom: 18, attribution: '<a href="https://maps.gsi.go.jp/development/" target="_blank" rel="noopener">地理院タイル</a>' }).addTo(detailMap);
  const shape = L.geoJSON(feature, { style: { color: '#1d4a50', weight: 2, fillColor: '#2a5f66', fillOpacity: .25 } }).addTo(detailMap);
  const c = COORDS[state.sel];
  const hint = box.closest('.d-map').querySelector('.d-maphint');
  let bounds = null;
  if (c) detailMap.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
  if (c?.precision === 'facility') {
    L.circleMarker([c.lat, c.lon], { radius: 10, color: '#fff', weight: 3, fillColor: '#b98a14', fillOpacity: 1 }).addTo(detailMap);
    if (hint) hint.textContent = T.mapExact;
    box.setAttribute('aria-label', T.mapAria.facility(unesc(f?.name || '')));
  } else if (c) {
    const ring = L.circle([c.lat, c.lon], { radius: 3000, color: '#1d4a50', weight: 2, dashArray: '6 6', fillColor: '#2a5f66', fillOpacity: .12 }).addTo(detailMap);
    ring.bindTooltip(T.mapAreaLabel(f?.areaName || ''), { permanent: true, direction: 'center', className: 'area-label' });
    bounds = ring.getBounds();
    if (hint) hint.textContent = T.mapArea;
    box.setAttribute('aria-label', T.mapAria.area(unesc(f?.areaName || '')));
  } else box.setAttribute('aria-label', T.mapAria.pref(unesc(f?.prefName || '')));
  if (hint && L.Browser.mobile) hint.textContent += ' ' + T.mapTouch;
  const fit = () => (bounds ? detailMap.fitBounds(bounds, { padding: [12, 12], animate: false }) : c ? detailMap.setView([c.lat, c.lon], 15, { animate: false }) : detailMap.fitBounds(shape.getBounds(), { padding: [14, 14], animate: false }));
  fit();
  setTimeout(() => { if (detailMap) { detailMap.invalidateSize(); fit(); } }, 350);
}

function chips(c) {
  const items = [];
  if (c.q) items.push(['q', UI.home.searchChip(escQ(c.q))]);
  const wide = state.wide && c.q && c.kind === 'all' && !c.flags.includes('stay'); // 검색어 때문에 숙박·유형 조건을 푼 상태: 숫자에는 넣지 않고 안내만
  if (wide) items.push(['wide', UI.chip.wide, UI.chip.wideClear]);
  if (c.rg != null) items.push(['rg', regionName(c.rg)]);
  if (c.pref) items.push(['pref', prefName(c.pref)]);
  if (c.area) items.push(['region', areaName(c.area)]);
  c.flags.forEach((k) => items.push([`f:${k}`, LABEL[k]]));
  c.quality.forEach((q) => items.push([`quality:${q}`, q]));
  if (c.dayMax) items.push(['dayMax', UI.chip.price(moneyText(c.dayMax))]);
  if (c.dayMax && !c.unp) items.push(['unp', UI.chip.noUnp]);
  if (state.photo) items.push(['photo', UI.chip.photo]);
  if (state.priced) items.push(['priced', UI.chip.priced]);
  if (state.favOnly) items.push(['fav', UI.chip.fav]);
  $('#chips').innerHTML = items.map(([k, label, aria]) => `<li><button type="button" data-chip="${k}" aria-label="${aria || UI.chip.clear(label)}">${label}${k === 'wide' ? '' : ic('x')}</button></li>`).join('');
  return items.length - (wide ? 1 : 0);
}

let lastSel = null;
// 현재 주소(?q·rg·pref·area·kind, #facility-id)를 조건과 맞춘다. 언어를 바꿔도 같은 조건이 이어진다. 이름 외의 다른 주소 매개변수와 #results 같은 앵커는 건드리지 않는다.
const URL_KEYS = ['q', 'rg', 'pref', 'area', 'kind'];
function writeUrl(c) {
  try {
    const qs = new URLSearchParams(location.search);
    URL_KEYS.forEach((k) => qs.delete(k));
    if (c.q) qs.set('q', c.q);
    if (c.rg != null) qs.set('rg', c.rg);
    if (c.pref) qs.set('pref', c.pref);
    if (c.area) qs.set('area', c.area);
    if (c.kind !== 'ryokan') qs.set('kind', c.kind);
    const hash = state.sel ? '#facility-' + state.sel : /^#facility-/.test(location.hash) ? '' : location.hash;
    const next = location.pathname + (qs.toString() ? '?' + qs.toString().replace(/\bnointro=(&|$)/, 'nointro$1') : '') + hash;
    if (next !== location.pathname + location.search + location.hash) history.replaceState(null, '', next);
  } catch {}
}
function restoreFromUrl() {
  let params = new URLSearchParams(location.search), hash = location.hash;
  let any = false;
  // 일부 서버는 index.html → / 같은 정리 주소로 옮기며 ?뒤를 버린다. 그때를 위해 language.js가 sessionStorage 에 잠깐 남긴 값을 쓴다(15초 안, 같은 형식 검사).
  try {
    const c = JSON.parse(sessionStorage.getItem('onsen-carry') || 'null');
    sessionStorage.removeItem('onsen-carry');
    if (!URL_KEYS.some((k) => params.has(k))) {
      if (c && Date.now() - c.t < 15000 && typeof c.qs === 'string' && typeof c.hash === 'string') { params = new URLSearchParams(c.qs); if (!/^#facility-/.test(hash)) hash = c.hash; }
    }
  } catch {}
  const q = (params.get('q') || '').replace(/\p{Cc}/gu, '').trim().slice(0, 60);
  if (q) { state.q = q; any = true; }
  const rg = params.get('rg');
  if (/^\d{1,2}$/.test(rg || '') && D.regions[+rg]) { state.rg = +rg; any = true; }
  const pref = params.get('pref');
  if (pref && Object.hasOwn(D.prefs, pref)) { if (![...form.elements.pref.options].some(o => o.value === pref)) form.elements.pref.add(new Option(prefName(pref), pref)); form.elements.pref.value = pref; any = true; }
  const area = params.get('area');
  if (area && FAC.some((f) => f.area === area)) { form.elements.region.value = areaOpt(area); any = true; }
  const kind = params.get('kind');
  if (['ryokan', 'hotel', 'all'].includes(kind)) { form.elements.kind.value = kind; if (kind === 'all') form.querySelector('input[name="f"][value="stay"]').checked = false; any = true; }
  else if (q) { form.elements.kind.value = 'all'; form.querySelector('input[name="f"][value="stay"]').checked = false; state.wide = true; } // 이름 검색이 기본 '숙박·료칸' 조건 때문에 당일 시설을 조용히 숨기지 않게
  const m = /^#facility-([\w-]{1,80})$/.exec(hash);
  if (m && FAC.some((f) => f.id === m[1])) { state.sel = state.link = m[1]; any = true; }
  syncHero();
  return any;
}

// 결과 집합: 지역·검색어·찜 조건으로 먼저 거른 뒤(pool), 가격을 제외한 조건에 맞는 것(fit), 가격 조건까지 맞는 것(hit)
const matches = (f, c) => judge(f, c).every((v) => v === 'y') && priceOk(f, c);
const regionCountFrames = new WeakMap();
function updateRegionGrid(c) {
  const counts = new Map();
  const withoutLocation = { ...c, rg: null, pref: '', area: '' };
  for (const f of FAC) {
    if (c.kind !== 'all' && f.kind !== c.kind) continue;
    if (c.qt.length && !c.qt.every((w) => f.hay.includes(w))) continue;
    if (state.favOnly && !favs.has(f.id)) continue;
    if (state.photo && !f.shots.length) continue;
    if (state.priced && !hasPrice(f)) continue;
    if (!matches(f, withoutLocation)) continue;
    counts.set(f.region, (counts.get(f.region) || 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  for (const button of document.querySelectorAll('#regionGrid [data-rg]')) {
    const region = +button.dataset.rg, n = counts.get(region) || 0;
    const number = button.querySelector('.rn'), previous = +(number.dataset.count ?? n);
    cancelAnimationFrame(regionCountFrames.get(number));
    number.dataset.count = n;
    button.setAttribute('aria-label', UI.home.regionAria(regionName(region), n));
    button.setAttribute('aria-pressed', state.rg === region ? 'true' : 'false');
    button.querySelector('i').style.width = `${(n / max * 100).toFixed(1)}%`;
    const print = value => { number.textContent = UI.home.regionN(value.toLocaleString(UI.loc)); };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !number.dataset.liveReady || previous === n) { print(n); number.dataset.liveReady = '1'; continue; }
    const start = performance.now(), duration = 320;
    const tick = now => { const p = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - p, 3); print(Math.round(previous + (n - previous) * eased)); if (p < 1) regionCountFrames.set(number, requestAnimationFrame(tick)); };
    regionCountFrames.set(number, requestAnimationFrame(tick));
  }
}
// 직전 조건 상태로 되돌리기(결과 0건일 때 "마지막 조건 해제")
const fields = () => [...form.elements].filter((e) => e.name);
const snapKey = () => JSON.stringify([fields().map((e) => e.type === 'checkbox' ? e.checked : e.value), state.favOnly, state.photo, state.priced, state.rg, state.q]);
let curSnap = null, prevSnap = null;
function restore(s) {
  const [vals, favOnly, photo, priced, rg, q] = JSON.parse(s);
  fields().forEach((e, i) => { if (e.type === 'checkbox') e.checked = vals[i]; else e.value = vals[i]; });
  Object.assign(state, { favOnly, photo, priced, rg, q });
  syncHero();
  render();
}
function render() {
  const snap = snapKey();
  if (snap !== curSnap) { prevSnap = curSnap; curSnap = snap; }
  const c = criteria();
  const scope = FAC.filter((f) => (c.kind === 'all' || f.kind === c.kind) && (c.rg == null || f.region === c.rg) && (!c.pref || f.pref === c.pref) && (!c.area || areaKey(f.area) === areaKey(c.area)) && (!c.qt.length || c.qt.every((w) => f.hay.includes(w))) && (!state.favOnly || favs.has(f.id)));
  const pool = scope.filter((f) => (!state.photo || f.shots.length) && (!state.priced || hasPrice(f)));
  const fit = pool.filter((f) => judge(f, c).every((v) => v === 'y'));
  const hit = c.dayMax ? fit.filter((f) => priceOk(f, c)) : fit;
  updateRegionGrid(c);
  // 이용 방식·조건 칸의 숫자: 지금 결과 집합에서 그 조건을 켰을 때 남는 곳 수(전체 결과보다 커질 수 없다)
  document.querySelectorAll('[data-n]').forEach((el) => {
    const k = el.dataset.n, flags = c.flags.includes(k) ? c.flags : [...c.flags, k];
    const n = pool.filter((f) => matches(f, { ...c, flags })).length;
    el.textContent = n;
    const box = el.closest('label'); // 건수 0이고 켜지 않은 조건은 숨긴다
    if (box) box.hidden = !n && !c.flags.includes(k);
  });
  const cover = $('#priceCover');
  cover.hidden = !c.dayMax;
  if (c.dayMax) {
    const can = fit.filter((f) => f.stay !== 'n');
    const priced = can.filter((f) => f.stayPrice != null).length;
    const none = !priced, un = can.length - priced, canFilter = !none && !state.priced && un > 0;
    // 가격이 확인된 곳이 하나도 없으면 '확인 0곳' 숫자 대신 이유를 말하고, 미확인 포함 칸은 이미 포함 중일 때 숨긴다(제외 중이면 되돌릴 수 있게 둔다)
    $('#priceCoverLine').textContent = none ? UI.rail.coverNone(un.toLocaleString(UI.loc)) : UI.rail.cover(priced.toLocaleString(UI.loc), un.toLocaleString(UI.loc), c.unp);
    form.elements.unp.closest('label').hidden = none && c.unp;
    const po = $('#priceCoverOnly');
    po.hidden = !canFilter; po.textContent = UI.rail.pricedBtn(priced.toLocaleString(UI.loc));
  }
  $('#fxIndic').textContent = fx.rate ? UI.rail.fxIndic : '';
  const photoBtn = $('#photoOnly'), priceBtn = $('#priceOnly');
  photoBtn.setAttribute('aria-pressed', state.photo);
  priceBtn.setAttribute('aria-pressed', state.priced);
  photoBtn.textContent = UI.rail.photoOnly(scope.filter((f) => f.shots.length).length.toLocaleString(UI.loc));
  priceBtn.textContent = UI.rail.priceOnly(scope.filter(hasPrice).length.toLocaleString(UI.loc));
  $('#npNote').hidden = !hit.some((f) => !f.shots.length);
  $('#seeResults').textContent = UI.rail.show(hit.length.toLocaleString(UI.loc));
  const key = $('#sort').value;
  if (key === 'price') hit.sort((a, b) => (a.stayPrice ?? Infinity) - (b.stayPrice ?? Infinity));
  else if (key === 'open') hit.sort((a, b) => (b.openN ?? -1) - (a.openN ?? -1));

  const before = state.sel;
  if (state.sel !== state.link && !hit.some((f) => f.id === state.sel)) state.sel = null;
  if (state.sel !== before) state.shot = 0;

  $('#count').textContent = hit.length;
  const desc = [c.q && `“${c.q}”`, c.rg != null && regionName(c.rg), c.pref && prefName(c.pref), c.area && areaName(c.area)].filter(Boolean).join(' · ');
  $('#resultSummary').textContent = UI.home.summary(hit.length, desc);
  $('#favCount').textContent = favs.size;
  $('#cmpBtn').hidden = favs.size < 1; $('#cmpBtn').setAttribute('aria-disabled', favs.size < 2); $('#cmpBtn').textContent = favs.size < 2 ? `${UI.cmp.btn(favs.size)} · ${UI.px.why}` : UI.cmp.btn(favs.size);
  if (cmpDlg.open) cmpRender(); // 환율이 늦게 도착해도 열린 표가 맞게 바뀐다
  $('#favToggle').setAttribute('aria-pressed', state.favOnly);
  const top = $('#favTop'); // 휴대폰에서 고정 머리글에 보이는 찜 버튼(language.js가 만든다)
  if (top) { top.setAttribute('aria-pressed', state.favOnly); top.setAttribute('aria-label', UI.favTop(favs.size)); $('#favTopCount').textContent = favs.size; }
  const active = chips(c);
  $('#activeCount').textContent = active ? active : '';
  $('#railHint').textContent = active ? UI.rail.hint(active, hit.length) : UI.rail.hintAll(FAC.length);
  document.querySelectorAll('#regionSel option[value]').forEach((o) => { if (o.value) o.hidden = o.disabled = !!c.pref && !FAC.some((f) => f.pref === c.pref && areaKey(f.area) === areaKey(o.value.slice(2))); });
  const dm = +form.elements.dayMax.value;
  $('#budgetOut').innerHTML = dm >= NO_LIMIT ? UI.rail.noLimit : UI.rail.upTo(moneyText(dm)) + (fx.rate ? ` <small>${yen(dm)}</small>` : '');
  form.elements.dayMax.style.setProperty('--fill', ((dm - 5000) / (NO_LIMIT - 5000) * 100) + '%');

  const E = UI.empty, noFav = state.favOnly && !favs.size, favOut = state.favOnly && favs.size && !hit.length;
  $('#list').innerHTML = hit.length ? hit.map(card).join('') : `<div class="empty"><strong>${noFav ? E.noFav : E.none}</strong>
    <p>${noFav ? E.favHow : favOut ? E.favOut(favs.size) : E.tryLoose}</p>
    ${prevSnap && !noFav ? `<button type="button" class="btn" data-undo>${E.undo}</button> ` : ''}${c.q ? `<button type="button" class="btn line" data-chip="q">${UI.px.clearQ}</button> ` : ''}<button type="button" class="btn line" data-clear>${E.clear}</button></div>`;

  const f = FAC.find((x) => x.id === state.sel);
  try { detailMap?.remove(); } catch {} // 상세 HTML을 바꾸기 전에 이전 지도를 먼저 정리한다
  detailMap = null;
  $('#detail').innerHTML = f ? detailHtml(f) : '';
  initDetailMap();
  $('#detail').hidden = !f;
  if (state.sel !== lastSel) { lastSel = state.sel; $('#detail').scrollTop = 0; }
  writeUrl(c);
  document.querySelectorAll('.detail dl.check').forEach(dl => { if (!dl.querySelector('div')) { dl.hidden = true; if (dl.previousElementSibling?.tagName === 'H4') dl.previousElementSibling.hidden = true; } });
}

function clearAll() { form.reset(); }

// 첫 화면 검색·지역 카드·온천지 칩: 왼쪽 조건과 같은 상태를 쓴다. 숙박·유형 조건은 풀어 등록 시설 전체에서 찾는다.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function syncHero() { $('#hsRegion').value = state.rg ?? ''; $('#hsText').value = state.q; }
function quick({ rg = null, pref = '', area = '', q = '' } = {}) {
  form.elements.kind.value = 'all';
  form.querySelectorAll('input[name="f"], input[name="quality"]').forEach((el) => { el.checked = false; });
  form.elements.dayMax.value = NO_LIMIT;
  state.favOnly = false; state.photo = state.priced = false; form.elements.unp.checked = true; state.rg = rg; state.q = q; state.sel = null; state.wide = !!q;
  form.elements.pref.value = pref;
  form.elements.region.value = area ? areaOpt(area) : '';
  syncHero();
  render();
  // 목록 정렬 모듈이 다시 그린 뒤에 부드럽게 이동한다
  setTimeout(() => { $('#results').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' }); $('#results').focus({ preventScroll: true }); }, 60);
}
$('#heroSearch').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#hsRegion').value;
  quick({ rg: v === '' ? null : +v, q: $('#hsText').value.trim() });
});

// 사진 넘기기: 상세를 다시 그리지 않고 사진 영역만 바꿉니다.
function showShot(gal, to) {
  const f = FAC.find((x) => x.id === gal.dataset.gal);
  const n = f.shots.length;
  state.shot = to === 'prev' ? (state.shot + n - 1) % n : to === 'next' ? (state.shot + 1) % n : +to;
  const s = f.shots[state.shot];
  const picture = gal.querySelector('.big');
  picture.hidden = false;
  gal.querySelector('.image-failure')?.remove();
  picture.src = shotUrl(s, 960);
  picture.dataset.photoKind = s[3]?.kind || 'area';
  gal.querySelector('.counter').textContent = `${state.shot + 1} / ${n}`;
  gal.querySelector('.by').innerHTML = photoCredit(s);
  gal.querySelector('.photo-caption').textContent = photoAlt(f, s);
  picture.alt = photoAlt(f, s);
  gal.querySelectorAll('.thumbs button').forEach((b, i) => b.setAttribute('aria-current', i === state.shot));
  gal.querySelector('.thumbs [aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// 외부 사진 요청이 실패하면 빈 화면 대신 안내를 보여줍니다.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.id === 'heroImg') { img.hidden = true; $('#heroCredit').textContent = UI.hero.failed; return; }
  if (img.closest('.thumbs')) { img.style.visibility = 'hidden'; return; }
  if (!img.matches('.pic, .big')) return;
  img.hidden = true;
  const message = document.createElement('div');
  message.className = `image-failure ${img.classList.contains('big') ? 'big' : 'pic'}`;
  message.textContent = UI.hero.failed.replace(/[.。]$/, '');
  img.after(message);
}, true);

document.addEventListener('click', (e) => {
  const shot = e.target.closest('[data-shot]');
  if (shot) return showShot(shot.closest('.gal'), shot.dataset.shot);
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    const id = fav.dataset.fav;
    const added = !favs.has(id);
    added ? favs.add(id) : favs.delete(id);
    try { localStorage.setItem('onsen-favs', JSON.stringify([...favs])); } catch {}
    render();
    document.querySelector(`.card [data-fav="${id}"]`)?.focus();
    toast(UI.favToast(favs.size, added));
    return;
  }
  const more = e.target.closest('[data-more]');
  if (more) {
    const open = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', open);
    $('#qualityBox').classList.toggle('all', open);
    more.textContent = open ? UI.rail.less : UI.rail.more(document.querySelectorAll('#qualityBox .extra').length);
    return;
  }
  const rgBtn = e.target.closest('#regionGrid [data-rg]');
  if (rgBtn) {
    const rg = +rgBtn.dataset.rg;
    state.rg = state.rg === rg ? null : rg;
    form.elements.pref.value = '';
    form.elements.region.value = '';
    syncHero(); render();
    setTimeout(() => { $('#results').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' }); $('#results').focus({ preventScroll: true }); }, 60);
    return;
  }
  const qa = e.target.closest('#hsChips [data-qa]');
  if (qa) return quick({ area: quickAreas[+qa.dataset.qa] });
  const act = e.target.closest('#detail [data-act]');
  if (act) {
    e.preventDefault();
    const a = act.dataset.act;
    if (a === 'report') { const b = document.querySelector('[data-doc="contact"]'); if (b) b.click(); else document.querySelector('footer')?.scrollIntoView(); return; }
    state.sel = null;
    if (a === 'home') { render(); scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' }); }
    else if (a === 'rg') quick({ rg: +act.dataset.rg });
    else if (a === 'pref') quick({ pref: act.dataset.pref });
    return;
  }
  const open = e.target.closest('#detail [data-open]');
  if (open) { e.preventDefault(); state.sel = state.link = open.dataset.open; state.shot = 0; render(); $('#detail').focus({ preventScroll: true }); return; }
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    const [k, v] = chip.dataset.chip.split(':');
    if (k === 'fav') state.favOnly = false;
    else if (k === 'photo') state.photo = false;
    else if (k === 'priced') state.priced = false;
    else if (k === 'wide') { state.wide = false; form.elements.kind.value = 'ryokan'; form.querySelector('input[name="f"][value="stay"]').checked = true; }
    else if (k === 'unp') form.elements.unp.checked = true;
    else if (k === 'rg') { state.rg = null; syncHero(); }
    else if (k === 'q') { state.q = ''; syncHero(); }
    else if (k === 'pref') { form.elements.pref.value = ''; form.elements.region.value = ''; }
    else if (k === 'region') form.elements.region.value = '';
    else if (k === 'dayMax') form.elements.dayMax.value = NO_LIMIT;
    else { form.querySelector(`input[name="${k}"][value="${v}"]`).checked = false; if (k === 'f' && v === 'stay') form.elements.kind.value = 'all'; }
    render();
    return;
  }
  if (e.target.closest('[data-clear]')) return clearAll();
  if (e.target.closest('#favToggle, #favTop')) { state.favOnly = !state.favOnly; render(); return; }
  if (e.target.closest('#photoOnly')) { state.photo = !state.photo; render(); return; }
  if (e.target.closest('#priceOnly, [data-priced-only]')) { state.priced = !state.priced; render(); return; }
  if (e.target.closest('#seeResults')) { form.querySelector('details').open = false; $('#results').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' }); return; }
  if (e.target.closest('[data-undo]')) return restore(prevSnap);
  if (e.target.closest('a')) return;
  const cardEl = e.target.closest('.card');
  if (cardEl) {
    const id = cardEl.dataset.id;
    state.sel = id;
    state.link = null;
    state.shot = 0;
    render();
    // 목록이 다시 만들어진 뒤(stack-list가 카드를 재배치한 다음)에 서랍 제목으로 포커스를 옮긴다. 닫을 때 돌아올 곳은 stack-list.js가 id로 찾는다.
    setTimeout(() => { const h = !$('#detail').hidden && $('#detail h3'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } });
  }
});

form.elements.pref.addEventListener('input', () => { form.elements.region.value = ''; state.rg = null; syncHero(); });
form.addEventListener('input', (e) => { if (e.target.name === 'kind' || (e.target.name === 'f' && e.target.value === 'stay')) state.wide = false; if (e.target.name === 'f' && e.target.value === 'stay' && !e.target.checked) form.elements.kind.value = 'all'; render(); });
form.addEventListener('reset', () => { state.wide = false; state.favOnly = false; state.photo = state.priced = false; state.rg = null; state.q = ''; syncHero(); $('#sort').value = ''; setTimeout(() => { form.elements.kind.value = 'all'; form.querySelector('input[name="f"][value="stay"]').checked = false; render(); }); });
$('#sort').addEventListener('change', render);
if (matchMedia('(max-width: 900px)').matches) form.querySelector('details').open = false;

const restored = restoreFromUrl();
showFx();
render();
if (restored) setTimeout(() => { $('#results').scrollIntoView({ behavior: 'auto', block: 'start' }); }, 80);
loadFx().then(() => { showFx(); render(); });
// 열려 있는 동안 60분마다(탭이 보일 때), 그리고 오래 숨겨졌다가 다시 보일 때 60분이 지났으면 새로 받아 화면을 갱신한다.
const FX_EVERY = 3600e3;
async function refreshFx() {
  if (!UI.fx) return;
  await loadFx();
  showFx(); render();
}
setInterval(() => { if (!document.hidden) refreshFx(); }, FX_EVERY);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - fxFetchedAt > FX_EVERY) refreshFx(); });

// 입장 장면과 같은 계절·빛으로 첫 탐색 화면을 잇는다. 특정 시설 사진으로 소개하지 않는다.
const heroSlides = [{local:'images/onsen-bath-v2.webp'}];
let heroIndex = 0;
let heroPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
// 다른 사진으로 바꿀 때만 잠깐 숨겼다가 불러온 뒤 서서히 보입니다.
const heroImg = $('#heroImg');
heroImg.addEventListener('load', () => heroImg.classList.remove('swap'));
heroImg.addEventListener('error', () => heroImg.classList.remove('swap'));
function showHero() {
  const slide = heroSlides[heroIndex];
  const next = slide.local || shotUrl(slide.shots[0], 960);
  heroImg.hidden = false;
  if (heroImg.getAttribute('src') !== next) {
    heroImg.classList.add('swap');
    heroImg.src = next;
    if (heroImg.complete && heroImg.naturalWidth) requestAnimationFrame(() => heroImg.classList.remove('swap'));
  }
  if (slide.local) $('#heroCredit').textContent = {ko:'여행 분위기를 담은 연출 이미지',ja:'旅の雰囲気を表すイメージ',en:'Atmospheric image, not a specific facility'}[LANG];
  else $('#heroCredit').innerHTML = UI.photoLine(UI.hero.caps ? UI.hero.caps[heroIndex] : slide.cap) + photoCredit(slide.shots[0]);
  $('#heroCredit').hidden = false;
  $('#heroPause').textContent = heroPaused ? UI.hero.play : UI.hero.pause;
  $('#heroPause').setAttribute('aria-label', heroPaused ? UI.hero.playAria : UI.hero.pauseAria);
}
document.querySelector('.hero-controls').hidden = heroSlides.length < 2;
$('#heroPrev').addEventListener('click', () => { heroIndex = (heroIndex + heroSlides.length - 1) % heroSlides.length; showHero(); });
$('#heroNext').addEventListener('click', () => { heroIndex = (heroIndex + 1) % heroSlides.length; showHero(); });
$('#heroPause').addEventListener('click', () => { heroPaused = !heroPaused; showHero(); });
showHero();
if (heroSlides.length > 1) setInterval(() => { if (!heroPaused && !document.hidden && !document.querySelector('.hero').contains(document.activeElement)) { heroIndex = (heroIndex + 1) % heroSlides.length; showHero(); } }, 8000);

// db-loader가 60초 점검에서 바뀐 행을 받으면 호출한다. 시설 목록을 제자리에서 다시 만들고, 열린 서랍의 스크롤·필터·페이지는 그대로 둔다.
window.onsenRefresh = () => {
  const d = $('#detail'), top = d.scrollTop, y = scrollY;
  FAC.splice(0, FAC.length, ...buildFac());
  if (state.sel && !FAC.some(f => f.id === state.sel)) {
    state.sel = state.link = '';
    const note = $('#catalog-state');
    note.textContent = {ko:'보고 있던 시설은 현재 공개 목록에서 제외되었습니다.',ja:'表示中の施設は現在公開一覧にありません。',en:'The facility you were viewing is no longer in the public catalog.'}[LANG];
    note.hidden = false;
  }
  render();
  d.scrollTop = top; if (scrollY !== y) scrollTo(scrollX, y);
};
