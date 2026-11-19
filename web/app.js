// 온천 한눈에: 화면 동작. 자료는 data.js(RAW, PHOTOS)와 extra.js(EXTRA)에 있습니다.
// 판정 값: 'y' 확인됨(있음), 'n' 확인됨(없음), 'u' 미확인. 미확인은 조건에 맞는 것으로 치지 않습니다.

const CHECKED = '2026-11-12';
const PREF = {
  '茨城県': ['이바라키현', '간토'], '埼玉県': ['사이타마현', '간토'], '千葉県': ['지바현', '간토'], '東京都': ['도쿄도', '간토'],
  '石川県': ['이시카와현', '호쿠리쿠·고신에쓰'], '福井県': ['후쿠이현', '호쿠리쿠·고신에쓰'], '静岡県': ['시즈오카현', '도카이'], '愛知県': ['아이치현', '도카이'],
  '三重県': ['미에현', '간사이'], '滋賀県': ['시가현', '간사이'], '奈良県': ['나라현', '간사이'], '広島県': ['히로시마현', '주고쿠'], '山口県': ['야마구치현', '주고쿠'],
  '徳島県': ['도쿠시마현', '시코쿠'], '香川県': ['가가와현', '시코쿠'], '福岡県': ['후쿠오카현', '규슈'], '長崎県': ['나가사키현', '규슈'], '宮崎県': ['미야자키현', '규슈'], '鹿児島県': ['가고시마현', '규슈'], '沖縄県': ['오키나와현', '오키나와'],
  '山梨県': ['야마나시현', '호쿠리쿠·고신에쓰'], '京都府': ['교토부', '간사이'], '大阪府': ['오사카부', '간사이'], '鳥取県': ['돗토리현', '주고쿠'], '岡山県': ['오카야마현', '주고쿠'], '佐賀県': ['사가현', '규슈'], '高知県': ['고치현', '시코쿠'], '富山県': ['도야마현', '호쿠리쿠·고신에쓰'],
  '岩手県': ['이와테현', '도호쿠'], '宮城県': ['미야기현', '도호쿠'], '山形県': ['야마가타현', '도호쿠'], '福島県': ['후쿠시마현', '도호쿠'],
  '長野県': ['나가노현', '호쿠리쿠·고신에쓰'], '新潟県': ['니가타현', '호쿠리쿠·고신에쓰'], '岐阜県': ['기후현', '도카이'], '島根県': ['시마네현', '주고쿠'], '和歌山県': ['와카야마현', '간사이'],
  '北海道': ['홋카이도', '홋카이도'], '青森県': ['아오모리현', '도호쿠'], '秋田県': ['아키타현', '도호쿠'],
  '群馬県': ['군마현', '간토'], '栃木県': ['도치기현', '간토'], '神奈川県': ['가나가와현', '간토'],
  '兵庫県': ['효고현', '간사이'], '愛媛県': ['에히메현', '시코쿠'], '大分県': ['오이타현', '규슈'], '熊本県': ['구마모토현', '규슈'],
};
const QUAL = { '単純温泉': '단순온천', '塩化物泉': '염화물천', '硫黄泉': '유황천', '炭酸水素塩泉': '탄산수소염천', '硫酸塩泉': '황산염천', '含鉄泉': '함철천', '酸性泉': '산성천', '放射能泉': '방사능천', '含よう素泉': '함요오드천' };
const COLOR = { '無色透明': '무색 투명', '白色': '유백색', '乳白色': '유백색', '無色微濁': '무색, 약간 탁함', '黄褐色': '황갈색', '赤褐色': '적갈색', '褐色': '갈색', '黒色': '흑색', '緑色': '녹색' };
const PLACE = { '山麓、山間': '산기슭·산간', '川辺、河畔、渓谷': '강변·계곡', '平地、盆地、田園': '평지·전원', '温泉街': '온천 마을', '市街地': '시내', '高台、高原、丘陵': '고원·언덕', '湖畔、池端': '호숫가' };

const yn = (v) => !v ? 'u' : /^(可|有|あり)$/.test(v) ? 'y' : /^(不可|否|無|なし)$/.test(v) ? 'n' : 'y';
const cnt = (v) => v === '' || v == null ? 'u' : v === '0' ? 'n' : 'y';
const num = (v) => /^\d+$/.test(v || '') ? +v : null;
const list = (v, map) => (v || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => map[s] || s);

const makeFacility = (r) => {
  const [pref, region] = PREF[r.pref];
  const official = r.src === 'official';
  const x = EXTRA[String(r.id)] || {};
  const dayPrice = /^[\d,]+$/.test(r.dayP || '') ? +r.dayP.replace(/,/g, '') : null;
  const hasRooms = r.rooms && r.rooms !== '0室';
  const img = r.im || IM_FIX[r.id] || '';
  return {
    x,
    kind: r.kind || 'unknown', id: String(r.id), name: r.n, jp: r.jp, area: r.a, pref, region, blurb: r.b, img, shots: (PHOTOS[img]?.shots || []).filter((shot) => LOCAL_PHOTOS[shot[0]]), hp: r.hp,
    official, srcUrl: official ? r.srcUrl : SPA(r.id), srcName: official ? (r.srcName || '시설 공식 사이트') : '일본온천협회 시설 검색', checked: r.checked || CHECKED,
    day: x.dayStatus || yn(r.day), dayPrice: x.dayPrice === undefined ? dayPrice : x.dayPrice, dayHours: (x.dayHours === undefined ? (r.dayH || '').replace(/～/g, '~') : x.dayHours), dayNote: x.dayNote || r.dayNote,
    stay: x.stayStatus || (r.stay ? yn(r.stay) : hasRooms ? 'y' : 'u'), rooms: /\d/.test(r.rooms || '') ? r.rooms.replace('室', '실') : null, stayP: r.stayP, stayPrice: Number.isFinite(r.stayPricePerPerson) && r.stayPricePerPerson > 0 ? r.stayPricePerPerson : null, stayPriceNote: r.stayPriceNote || '',
    open: x.openStatus || cnt(r.open), openN: x.openStatus ? null : num(r.open), priv: x.privStatus || cnt(r.priv), privN: x.privStatus ? null : num(r.priv), room: x.roomCount ? 'y' : cnt(r.room), roomN: x.roomCount || num(r.room),
    flow: yn(r.flow), quality: list(r.q, QUAL), colors: list(r.color, COLOR), temp: r.temp || null, place: PLACE[r.place] || null,
    solo: yn(r.solo), sudo: yn(r.sudo), card: yn(r.card), cardText: r.card, shuttle: yn(r.shuttle), shuttleText: r.shuttle,
    park: yn(r.park), ci: r.ci, co: r.co, closed: r.closed, towel: r.towel, mixed: r.mixed, pay: r.pay, over: r.over,
  };
};
const FAC = RAW.map(makeFacility);

const LABEL = { day: '당일 이용', stay: '숙박', open: '노천탕', priv: '대절탕', room: '객실 노천탕', flow: '원천 방류', solo: '1인 숙박', sudo: '식사 없이 숙박', card: '카드 결제', shuttle: '송영', park: '주차장' };
const NO_LIMIT = 101000; // 예산 슬라이더의 오른쪽 끝 = 제한 없음
const $ = (s) => document.querySelector(s);
const form = $('#filters');
const ic = (id) => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const unk = '<span class="unk">미확인</span>';
const wide = matchMedia('(min-width: 1180px)');
const where = (f) => `${f.region === f.pref ? '' : f.region + ' '}${f.pref} ${f.area}`;
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return '출처'; } };
const srcA = (u) => u ? ` <a class="s" href="${u}" target="_blank" rel="noopener">${host(u)}</a>` : '';
const photoSource = (shot) => `https://commons.wikimedia.org/wiki/File:${shot[0].split('/').pop()}`;
const photoCredit = (shot) => {
  if (shot[3]?.source) return `${shot[3].kind === 'area' ? '온천지 풍경 · ' : ''}${shot[3].credit}${shot[3].resized ? ' · 크기 조정' : ''}${shot[3].kagoshimaPromotion ? ' · 가고시마 관광 홍보 목적' : ''} · <a href="${shot[3].source}" target="_blank" rel="noopener">사진 출처</a>${shot[3].terms ? ` · <a href="${shot[3].terms}" target="_blank" rel="noopener">이용 조건</a>` : ''}`;
  const m = shot[2].match(/^CC BY(-SA)? ([\d.]+)( JP)?$/);
  const licence = m ? `https://creativecommons.org/licenses/by${m[1] ? '-sa' : ''}/${m[2]}/${m[3] ? 'jp/' : ''}` : null;
  return `${shot[1]} · 크기 조정 · <a href="${photoSource(shot)}" target="_blank" rel="noopener">사진 원본</a> · ${licence ? `<a href="${licence}" target="_blank" rel="noopener">${shot[2]}</a>` : shot[2]} · Wikimedia Commons`;
};

// 환율: 엔화 자료를 원화로 바꿔 보여 줍니다. 값을 못 받으면 엔화 그대로 둡니다.
const fx = { rate: null, when: null };
const yen = (n) => '¥' + n.toLocaleString('ko-KR');
const won = (n) => '₩' + (Math.round(n * fx.rate / 10) * 10).toLocaleString('ko-KR');
const money = (n) => fx.rate ? `<b>약 ${won(n)}</b><i>${yen(n)}</i>` : `<b>${yen(n)}</b>`;
const moneyText = (n) => fx.rate ? `약 ${won(n)}` : yen(n);
// 문장 속 "¥1,000"에 원화 환산을 덧붙입니다.
const wonize = (s) => !fx.rate || !s ? s : s.replace(/¥\s?([\d,]+)/g, (m, d) => `${m}(약 ${won(+d.replace(/,/g, ''))})`);
const sv = (pair, fallback) => pair && pair[0] ? wonize(pair[0]) + srcA(pair[1]) : fallback;

async function loadFx() {
  try {
    const c = JSON.parse(sessionStorage.getItem('onsen-fx') || 'null');
    if (c && Date.now() - c.at < 3600e3) return Object.assign(fx, c);
  } catch {}
  const sources = [
    ['https://open.er-api.com/v6/latest/JPY', (j) => [j.rates.KRW, new Date(j.time_last_update_utc), 'ExchangeRate-API']],
    ['https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW', (j) => [j.rates.KRW, new Date(j.date), 'Frankfurter 일별 기준']],
  ];
  for (const [url, pick] of sources) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const [rate, d, provider] = pick(await response.json());
      if (!(rate > 0) || !Number.isFinite(d.getTime())) continue;
      const when = provider === 'ExchangeRate-API' ? d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
      Object.assign(fx, { rate, when, at: Date.now(), provider });
      try { sessionStorage.setItem('onsen-fx', JSON.stringify(fx)); } catch {}
      return;
    } catch {}
  }
}
function showFx() {
  $('#fx').innerHTML = fx.rate
    ? `<span>엔화 환율</span><b>100엔 = ${(fx.rate * 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원</b><small>${fx.when} 기준 · ${fx.provider || "참고 환율"}</small>`
    : '<span>엔화 환율</span><small>불러오지 못해 엔화로 표시합니다</small>';
}

let favs = new Set();
try { favs = new Set(JSON.parse(localStorage.getItem('onsen-favs') || '[]')); } catch {}
const state = { sel: null, shot: 0, favOnly: false };

// 조건 입력란 채우기
function fillFilters() {
  const regions = [...new Set(FAC.map((f) => f.region))];
  if ($('#regionChips')) $('#regionChips').innerHTML = `<button type="button" class="map-all" data-rg="" aria-pressed="true">전체 지역</button>` + regions.map((rg) => `<button type="button" class="map-${['홋카이도','도호쿠','간토','호쿠리쿠·고신에쓰','도카이','간사이','주고쿠','시코쿠','규슈','오키나와'].indexOf(rg)}" data-rg="${rg}" aria-pressed="false">${rg}</button>`).join('');
  $('#prefSel').innerHTML = '<option value="">도도부현 전체</option>' + regions.map((rg) => `<optgroup label="${rg}">${[...new Set(FAC.filter((f) => f.region === rg).map((f) => f.pref))].map((p) => `<option value="${p}">${p}</option>`).join('')}</optgroup>`).join('');
  $('#regionSel').innerHTML = '<option value="">온천지 전체</option>' + regions.map((rg) =>
    `<optgroup label="${rg}">${[...new Set(FAC.filter((f) => f.region === rg).map((f) => f.area))].map((a) => `<option value="a:${a}">${a}</option>`).join('')}</optgroup>`).join('');
  const quals = [...new Set(FAC.flatMap((f) => f.quality))].map((q) => [q, FAC.filter((f) => f.quality.includes(q)).length]).sort((a, b) => b[1] - a[1]);
  $('#qualityBox').innerHTML = quals.map(([q, n], i) => `<label class="rowopt${i >= 5 ? ' extra' : ''}"><input type="checkbox" name="quality" value="${q}"><span class="t">${q}</span><span class="n">${n}</span></label>`).join('')
    + (quals.length > 5 ? `<button type="button" class="more-btn" data-more aria-expanded="false">성분 ${quals.length - 5}가지 더 보기</button>` : '');
  document.querySelectorAll('[data-n]').forEach((el) => { el.textContent = FAC.filter((f) => f[el.dataset.n] === 'y').length; });

}
fillFilters();
window.refreshOnsenCatalog = () => {
  const selected = [...form.querySelectorAll("input, select")].map(el => ({name:el.name, value:el.value, checked:el.checked, type:el.type}));
  FAC.splice(0, FAC.length, ...RAW.map(makeFacility));
  fillFilters();
  [...form.querySelectorAll("input, select")].forEach(el => { const prior = selected.find(v => v.name === el.name && (el.type !== "checkbox" && el.type !== "radio" || v.value === el.value)); if (prior) { if (el.type === "checkbox" || el.type === "radio") el.checked = prior.checked; else el.value = prior.value; } });
  render();
};

function criteria() {
  const d = new FormData(form);
  const max = +d.get('dayMax') || NO_LIMIT;
  return { kind: d.get('kind') || 'ryokan', rg: state.rg || '', pref: d.get('pref') || '', area: (d.get('region') || '').slice(2), flags: d.getAll('f'), quality: d.getAll('quality'), dayMax: max >= NO_LIMIT ? 0 : max };
}

function judge(f, c) {
  const out = c.flags.map((k) => [LABEL[k], f[k]]);
  if (c.quality.length) out.push(['온천수 성분', !f.quality.length ? 'u' : c.quality.some((q) => f.quality.includes(q)) ? 'y' : 'n']);
  if (c.dayMax) out.push(['1박 1인 숙박료', f.stay === 'n' ? 'n' : f.stayPrice == null ? 'u' : f.stayPrice <= c.dayMax ? 'y' : 'n']);
  return out;
}

const tags = (f) => [
  f.stay === 'y' && '숙박', f.day === 'y' && '당일 이용', f.open === 'y' && '노천탕', f.priv === 'y' && '대절탕', f.room === 'y' && '객실 노천탕',
].filter(Boolean).map((t) => `<li>${t}</li>`).join('') +
  [...f.quality.slice(0, 2), f.flow === 'y' && '원천 방류'].filter(Boolean).map((t) => `<li class="water">${t}</li>`).join('');

const noPhoto = (cls) => `<div class="${cls} nophoto"><svg class="ic" aria-hidden="true"><use href="#i-onsen"/></svg><span>사진 없음</span></div>`;
const heart = (f, withText) => `<button type="button" class="fav${withText ? ' txt' : ''}" data-fav="${f.id}" aria-pressed="${favs.has(f.id)}" aria-label="${f.name} 찜하기">${ic('heart')}${withText ? '<span>찜하기</span>' : ''}</button>`;

function card(f, unknowns) {
  const sel = state.sel === f.id;
  return `
  <article class="card${sel ? ' sel' : ''}" data-id="${f.id}">
    <div class="ph">${f.shots.length ? `<img class="pic" data-photo-kind="${f.shots[0][3]?.kind || 'area'}" src="${shotUrl(f.shots[0], 330)}" alt="${f.shots[0][3]?.caption || PHOTOS[f.img].cap}" loading="lazy">${f.shots.length > 1 ? `<span class="pcount">${ic('photo')}${f.shots.length}</span>` : ''}<small class="card-credit" hidden>${photoCredit(f.shots[0])}</small>` : noPhoto('pic')}</div>
    <div class="body">
      <h3><button type="button" class="pick" aria-expanded="${sel}" data-pick="${f.id}">${f.name}</button></h3>
      <p class="loc">${ic('pin')}${where(f)}</p>
      <p class="blurb">${f.blurb}</p>
      ${f.x.notice ? `<p class="why">운영 상태 확인 필요</p>` : ''}
      <ul class="tags">${tags(f)}</ul>
    </div>
    <div class="side">
      ${heart(f)}
      ${f.stayPrice != null && f.stay !== 'n' ? `<p class="price"><small>숙박 1박 · 어른 1인</small>${money(f.stayPrice)}${f.stayPriceNote ? `<small>조건은 상세에서 확인</small>` : ''}</p>` : ''}
    </div>
  </article>
  ${sel && !wide.matches ? `<div class="detail inline">${detailHtml(f)}</div>` : ''}`;
}

const v3 = (v, y = '있음', n = '없음') => v === 'y' ? y : v === 'n' ? n : unk;
const t = (v) => v ? wonize(v) : unk;
const row = (k, v) => !v || v === unk ? '' : `<div><dt>${k}</dt><dd>${v}</dd></div>`;

function gallery(f) {
  if (!f.shots.length) {
    const photoPages = {
      'ryokan-research-4': ['https://abe-ryokan.jp/', '료칸 공식 사이트에서 사진 보기'],
      'ryokan-research-6': ['https://www.seiryuso.net/sub03/', '료칸 공식 사진첩 보기'],
      'ryokan-nov13-2': ['https://www.asobo-saga.jp/stays/detail/764e9e61-69b6-40ba-b296-b9173cce74de', '사가현 공식 관광 사이트에서 사진 보기'],
      'ryokan-nov13-8': ['https://www.kagoshima-kankou.com/houjin/photo/2397', '가고시마 관광연맹에서 사진 보기']
    };
    const page = photoPages[f.id];
    return `<figure class="gal">${noPhoto('big')}${page ? `<figcaption><a href="${page[0]}" target="_blank" rel="noopener">${page[1]}</a></figcaption>` : ''}</figure>`;
  }
  const i = Math.min(state.shot, f.shots.length - 1), s = f.shots[i], many = f.shots.length > 1;
  return `
  <figure class="gal" data-gal="${f.id}">
    <div class="stage">
      <img class="big" data-photo-kind="${s[3]?.kind || 'area'}" src="${shotUrl(s, 960)}" alt="${s[3]?.caption || PHOTOS[f.img].cap}">
      ${many ? `<button type="button" class="nav prev" data-shot="prev" aria-label="이전 사진">${ic('left')}</button>
      <button type="button" class="nav next" data-shot="next" aria-label="다음 사진">${ic('right')}</button>
      <span class="counter" aria-live="polite">${i + 1} / ${f.shots.length}</span>` : ''}
    </div>
    ${many ? `<div class="thumbs">${f.shots.map((x, n) => `<button type="button" data-shot="${n}" aria-label="사진 ${n + 1}" aria-current="${n === i}">${n + 1}</button>`).join('')}</div>` : ''}
    <figcaption>사진: <span class="photo-caption">${s[3]?.caption || PHOTOS[f.img].cap}</span>. <span class="by" hidden>${photoCredit(s)}</span></figcaption>
  </figure>`;
}

function detailHtml(f) {
  const x = f.x;
  const sites = (x.hideBooking ? [] : [['Booking.com', ...(x.booking || [])], ['Trip.com', ...(x.trip || [])], ['자란넷', x.jalan], ['라쿠텐 트래블', x.rakuten]]).filter(([, url]) => url);
  const bath = [f.open === 'y' && `노천탕${f.openN ? ' ' + f.openN + '곳' : ''}`, f.priv === 'y' && `대절탕${f.privN ? ' ' + f.privN + '곳' : ''}`, f.room === 'y' && `객실 노천탕${f.roomN ? ' ' + f.roomN + '실' : ''}`].filter(Boolean);
  return `
  ${gallery(f)}
  <div class="d-head">
    <div><h3>${f.name}</h3><p class="jp" lang="ja">${f.jp}</p></div>
    ${heart(f, true)}
  </div>
  <p class="loc">${ic('pin')}${where(f)}${f.place ? ` · ${f.place}` : ''}</p>
  <p class="blurb">${f.blurb}</p>
  ${x.notice ? `<p class="notice">${sv(x.notice)} <small>(${x.checked} 확인)</small></p>` : ''}

  <dl class="facts">
    ${f.day === 'y' || f.stay === 'y' ? `<div>${ic('cal')}<dt>이용 방식</dt><dd>${[f.day === 'y' && '당일 이용', f.stay === 'y' && '숙박'].filter(Boolean).join(' · ')}</dd></div>` : ''}
    ${bath.length || f.open === 'n' ? `<div>${ic('onsen')}<dt>탕의 형태</dt><dd>${bath.length ? bath.join(' · ') : '노천탕 없음'}</dd></div>` : ''}
    ${f.quality.length || f.flow === 'y' ? `<div>${ic('drop')}<dt>온천수</dt><dd>${[...f.quality, f.flow === 'y' && '원천 방류'].filter(Boolean).join(' · ')}</dd></div>` : ''}
    ${f.stay === 'n' || f.rooms || f.solo === 'y' ? `<div>${ic('bed')}<dt>숙소 조건</dt><dd>${f.stay === 'n' ? '숙박 없음' : [f.rooms && `객실 ${f.rooms}`, f.solo === 'y' && '1인 숙박 가능'].filter(Boolean).join(' · ')}</dd></div>` : ''}
  </dl>

  <div class="pricebox">
    ${f.stayPrice != null && f.stay !== 'n' ? `<div><b>숙박 · 1박 1인</b><small>날짜·인원·상품에 따라 변동</small></div><strong>${money(f.stayPrice)}</strong>` : ''}
    ${f.stayPriceNote ? `<p>${f.stayPriceNote} · ${f.checked} 확인${srcA(f.srcUrl)}</p>` : ''}
    ${f.day === 'n' || f.dayPrice != null || f.dayHours ? `<div class="stay"><b>당일 입욕</b><small>${f.day === 'n' ? '받지 않음' : [f.dayPrice != null && yen(f.dayPrice), f.dayHours].filter(Boolean).join(' · ')}</small></div>` : ''}
    ${f.dayNote ? `<p>${wonize(f.dayNote)}</p>` : ''}
    ${f.stay !== 'n' && f.stayP ? `<div class="stay"><b>숙박</b><small>${wonize(f.stayP)}</small></div>` : ''}
    ${fx.rate && f.dayPrice != null ? `<p class="fxnote">원화는 ${fx.when} 환율(100엔 = ${(fx.rate * 100).toFixed(1)}원)로 환산한 값입니다. 현지에서는 엔화로 냅니다.</p>` : ''}
  </div>

  <div class="cta">
    ${x.hideBooking ? `<a class="btn" href="${x.notice[1]}" target="_blank" rel="noopener">${ic('out')}운영 상태 확인<span class="vh"> (새 창)</span></a>` : `<a class="btn" href="${f.hp}" target="_blank" rel="noopener">${ic('out')}공식 사이트로 이동<span class="vh"> (새 창)</span></a>`}
    <a class="btn line" href="#pay">${ic('card')}결제 방법 안내</a>
  </div>
  ${sites.length ? `<div class="sites"><b>다른 예약 사이트에서 보기</b><ul>${sites.map(([name, url, score, count]) =>
    `<li><a href="${url}" target="_blank" rel="noopener">${name}${ic('out')}<span class="vh"> (새 창)</span></a>${score ? `<small>평점 ${score}${count ? `, 후기 ${Number(count).toLocaleString('ko-KR')}건` : ''}</small>` : ''}</li>`).join('')}</ul>
    <p>요금과 빈 객실은 날짜에 따라 달라 각 사이트에서 확인합니다.${sites.some((s) => s[2]) ? ` 평점은 ${CHECKED}에 본 값입니다.` : ''}</p></div>` : ''}

  <h4>꼭 확인할 것</h4>
  <dl class="check">
    ${row('당일 입욕 시간', f.day === 'n' ? '당일 입욕 받지 않음' : t(f.dayHours))}
    ${x.privateBath ? row('대절탕 예약·요금', sv(x.privateBath)) : ''}
    ${x.dayUse ? row(`당일 이용 안내${x.checked ? ` (${x.checked} 확인)` : ''}`, sv(x.dayUse)) : ''}
    ${row('휴관 안내', sv(x.closed, t(f.closed)))}
    ${row('남녀 구분·혼욕', sv(x.mixed, t(f.mixed)))}
    ${row('결제 수단', sv(x.payment, f.pay || (f.card === 'y' ? `카드 가능${f.cardText && /[A-Za-z가-힣]/.test(f.cardText) ? ` (${f.cardText})` : ''}` : unk)))}
    ${row('가는 길·송영', sv(x.access, f.shuttle === 'y' ? (/[가-힣]/.test(f.shuttleText) ? f.shuttleText : '송영 있음') : unk))}
  </dl>
  <h4>취향에 따라 볼 것</h4>
  <dl class="check">
    ${row('수건·세면도구', sv(x.towels, t(f.towel)))}
    ${row('노천탕', f.open === 'u' ? unk : f.open === 'n' ? '없음' : f.openN ? `${f.openN}곳` : '있음')}
    ${row('대절탕', f.priv === 'u' ? unk : f.priv === 'n' ? '없음' : f.privN ? `${f.privN}곳` : '있음')}
    ${row('객실 노천탕', f.room === 'u' ? unk : f.room === 'n' ? '없음' : f.roomN ? `${f.roomN}실` : '있음')}
    ${row('원천 방류', v3(f.flow, '방류', '방류 아님'))}
    ${row('물 색상', f.colors.length ? f.colors.join(', ') : unk)}
    ${row('원천 온도', f.temp ? `${f.temp} <small>탕 온도와 다름</small>` : unk)}
    ${row('가온·가수·순환', unk)}
    ${f.stay !== 'n' ? row('1인 숙박', v3(f.solo, '가능', '불가')) + row('식사 없이 숙박', v3(f.sudo, '가능', '불가')) + row('침구', unk) + row('체크인·체크아웃', f.ci ? `${f.ci} / ${f.co}` : unk) : ''}
    ${row('주차장', v3(f.park))}
  </dl>
  ${x.more?.length ? `<h4>알아 두면 좋은 것</h4><ul class="more">${x.more.map(([text, url]) => `<li>${wonize(text)}${srcA(url)}</li>`).join('')}</ul>` : ''}
  ${f.over ? `<p class="over">${wonize(f.over)}</p>` : ''}
  <p><a href="sources.html?lang=ko#facility-${encodeURIComponent(f.id)}">자료 출처와 이용 조건</a></p>`;
}

function chips(c) {
  const items = [];
  if (c.rg) items.push(['rg', c.rg + ' 전체']);
  if (c.pref) items.push(['pref', c.pref]);
  if (c.area) items.push(['region', c.area]);
  c.flags.forEach((k) => items.push([`f:${k}`, LABEL[k]]));
  c.quality.forEach((q) => items.push([`quality:${q}`, q]));
  if (c.dayMax) items.push(['dayMax', `1박 1인 ${moneyText(c.dayMax)} 이하`]);
  if (state.favOnly) items.push(['fav', '찜한 시설만']);
  $('#chips').innerHTML = items.map(([k, label]) => `<li><button type="button" data-chip="${k}" aria-label="${label} 조건 지우기">${label}${ic('x')}</button></li>`).join('');
  return items.length;
}

function render() {
  const c = criteria();
  const pool = FAC.filter((f) => (c.kind === 'all' || f.kind === c.kind) && (!c.rg || f.region === c.rg) && (!c.pref || f.pref === c.pref) && (!c.area || f.area === c.area) && (!state.favOnly || favs.has(f.id)));
  const hit = [], maybe = [];
  for (const f of pool) {
    const j = judge(f, c);
    if (j.some(([, v]) => v !== 'y')) continue;
    const u = j.filter(([, v]) => v === 'u').map(([k]) => k);
    (u.length ? maybe : hit).push([f, u]);
  }
  const key = $('#sort').value;
  const by = key === 'price' ? ([a], [b]) => (a.stayPrice ?? Infinity) - (b.stayPrice ?? Infinity) : key === 'open' ? ([a], [b]) => (b.openN ?? -1) - (a.openN ?? -1) : null;
  if (by) { hit.sort(by); maybe.sort(by); }

  const shown = [...hit, ...maybe].map(([f]) => f);
  const before = state.sel;
  if (wide.matches && !shown.some((f) => f.id === state.sel)) state.sel = shown[0]?.id ?? null;
  if (!shown.some((f) => f.id === state.sel)) state.sel = wide.matches ? state.sel : null;
  if (state.sel !== before) state.shot = 0;

  $('#count').textContent = hit.length;
  $('#favCount').textContent = favs.size;
  $('#favToggle').setAttribute('aria-pressed', state.favOnly);
  const active = chips(c);
  $('#activeCount').textContent = active ? active : '';
  $('#railHint').textContent = active ? `조건 ${active}개 적용, ${hit.length}곳이 맞습니다` : `시설 ${FAC.length}곳에서 고릅니다`;
  document.querySelectorAll('#regionChips button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.rg === (c.rg || '')));
  document.querySelectorAll('#prefSel optgroup').forEach((g) => { g.hidden = g.disabled = !!c.rg && g.label !== c.rg; });
  document.querySelectorAll('#regionSel option[value]').forEach((o) => { if (o.value) o.hidden = o.disabled = !!c.pref && !FAC.some((f) => f.pref === c.pref && f.area === o.value.slice(2)); });
  document.querySelectorAll('#regionSel optgroup').forEach((g) => { g.hidden = g.disabled = !!c.rg && g.label !== c.rg; });
  const dm = +form.elements.dayMax.value;
  $('#budgetOut').innerHTML = dm >= NO_LIMIT ? '제한 없음' : `최대 ${moneyText(dm)}${fx.rate ? ` <small>${yen(dm)}</small>` : ''}`;
  form.elements.dayMax.style.setProperty('--fill', ((dm - 5000) / (NO_LIMIT - 5000) * 100) + '%');

  let html = hit.map(([f, u]) => card(f, u)).join('');
  if (!shown.length) html = `<div class="empty"><strong>${state.favOnly && !favs.size ? '아직 찜한 시설이 없습니다.' : '이 조건에 맞는 시설이 없습니다.'}</strong>
    <p>${state.favOnly && !favs.size ? '시설 카드의 하트를 누르면 여기에 모입니다.' : '조건을 하나씩 풀어 보거나 다른 지역을 골라 보세요.'}</p>
    <button type="button" class="btn line" data-clear>조건 모두 지우기</button></div>`;
  $('#list').innerHTML = html;

  const f = FAC.find((x) => x.id === state.sel);
  $('#detail').innerHTML = wide.matches && f ? detailHtml(f) : '';
  $('#detail').hidden = !(wide.matches && f);
  document.querySelectorAll('.detail dl.check').forEach(dl => { if (!dl.querySelector('div')) { dl.hidden = true; if (dl.previousElementSibling?.tagName === 'H4') dl.previousElementSibling.hidden = true; } });
}

function clearAll() { form.reset(); }

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
  gal.querySelector('.photo-caption').textContent = s[3]?.caption || PHOTOS[f.img].cap;
  picture.alt = s[3]?.caption || PHOTOS[f.img].cap;
  gal.querySelectorAll('.thumbs button').forEach((b, i) => b.setAttribute('aria-current', i === state.shot));
  gal.querySelector('.thumbs [aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// 외부 사진 요청이 실패하면 빈 화면 대신 안내를 보여줍니다.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.id === 'heroImg') { img.hidden = true; $('#heroCredit').textContent = '사진을 불러오지 못했습니다.'; return; }
  if (img.closest('.thumbs')) { img.style.visibility = 'hidden'; return; }
  if (!img.matches('.pic, .big')) return;
  img.hidden = true;
  const message = document.createElement('div');
  message.className = `image-failure ${img.classList.contains('big') ? 'big' : 'pic'}`;
  message.textContent = '사진을 불러오지 못했습니다';
  img.after(message);
}, true);

document.addEventListener('click', (e) => {
  const shot = e.target.closest('[data-shot]');
  if (shot) return showShot(shot.closest('.gal'), shot.dataset.shot);
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    const id = fav.dataset.fav;
    favs.has(id) ? favs.delete(id) : favs.add(id);
    try { localStorage.setItem('onsen-favs', JSON.stringify([...favs])); } catch {}
    render();
    document.querySelector(`.card [data-fav="${id}"]`)?.focus();
    return;
  }
  const rg = e.target.closest('[data-rg]');
  if (rg) { state.rg = rg.dataset.rg; form.elements.pref.value = ''; form.elements.region.value = ''; render(); return; }
  const more = e.target.closest('[data-more]');
  if (more) { const open = more.getAttribute('aria-expanded') !== 'true'; more.setAttribute('aria-expanded', open); $('#qualityBox').classList.toggle('all', open); more.textContent = open ? '접기' : more.textContent.replace('접기', ''); if (!open) more.textContent = `성분 ${document.querySelectorAll('#qualityBox .extra').length}가지 더 보기`; return; }
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    const [k, v] = chip.dataset.chip.split(':');
    if (k === 'fav') state.favOnly = false;
    else if (k === 'rg') state.rg = '';
    else if (k === 'pref') { form.elements.pref.value = ''; form.elements.region.value = ''; }
    else if (k === 'region') form.elements.region.value = '';
    else if (k === 'dayMax') form.elements.dayMax.value = NO_LIMIT;
    else { form.querySelector(`input[name="${k}"][value="${v}"]`).checked = false; if (k === 'f' && v === 'stay') form.elements.kind.value = 'all'; }
    render();
    return;
  }
  if (e.target.closest('[data-clear]')) return clearAll();
  if (e.target.closest('#favToggle')) { state.favOnly = !state.favOnly; render(); return; }
  if (e.target.closest('a')) return;
  const cardEl = e.target.closest('.card');
  if (cardEl) {
    const id = cardEl.dataset.id;
    state.sel = !wide.matches && state.sel === id ? null : id;
    state.shot = 0;
    render();
    document.querySelector(`[data-pick="${id}"]`)?.focus({ preventScroll: wide.matches });
  }
});

form.elements.pref.addEventListener('input', () => { form.elements.region.value = ''; });
form.addEventListener('input', (e) => { if (e.target.name === 'f' && e.target.value === 'stay' && !e.target.checked) form.elements.kind.value = 'all'; render(); });
form.addEventListener('reset', () => { state.favOnly = false; state.rg = ''; $('#sort').value = ''; setTimeout(() => { form.elements.kind.value = 'all'; form.querySelector('input[name="f"][value="stay"]').checked = false; render(); }); });
$('#sort').addEventListener('change', render);
wide.addEventListener('change', render);
if (matchMedia('(max-width: 900px)').matches) form.querySelector('details').open = false;

showFx();
render();
loadFx().then(() => { showFx(); render(); });

// 저작자와 이용 조건을 확인한 사진만 순환합니다.
const heroSlides = [PHOTOS.takaragawa, PHOTOS.noboribetsu, PHOTOS.tokachi];
let heroIndex = 0;
let heroPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
// 다른 사진으로 바꿀 때만 잠깐 숨겼다가 불러온 뒤 서서히 보입니다.
const heroImg = $('#heroImg');
heroImg.addEventListener('load', () => heroImg.classList.remove('swap'));
heroImg.addEventListener('error', () => heroImg.classList.remove('swap'));
function showHero() {
  const slide = heroSlides[heroIndex];
  const next = shotUrl(slide.shots[0], 960);
  heroImg.hidden = false;
  if (heroImg.getAttribute('src') !== next) {
    heroImg.classList.add('swap');
    heroImg.src = next;
    if (heroImg.complete && heroImg.naturalWidth) requestAnimationFrame(() => heroImg.classList.remove('swap'));
  }
  $('#heroCredit').innerHTML = `사진: ${slide.cap}. ${photoCredit(slide.shots[0])}`;
  $('#heroPause').textContent = heroPaused ? '재생' : '일시정지';
  $('#heroPause').setAttribute('aria-label', heroPaused ? '사진 자동 전환 재생' : '사진 자동 전환 일시정지');
}
$('#heroPrev').addEventListener('click', () => { heroIndex = (heroIndex + heroSlides.length - 1) % heroSlides.length; showHero(); });
$('#heroNext').addEventListener('click', () => { heroIndex = (heroIndex + 1) % heroSlides.length; showHero(); });
$('#heroPause').addEventListener('click', () => { heroPaused = !heroPaused; showHero(); });
showHero();
setInterval(() => { if (!heroPaused && !document.hidden && !document.querySelector('.hero').contains(document.activeElement)) { heroIndex = (heroIndex + 1) % heroSlides.length; showHero(); } }, 8000);
