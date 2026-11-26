// 기본 목록은 사진과 확인된 가격을 우선 표시하고, 이름순 선택 시 언어별 이름으로 정렬한다.
// 스택 효과는 CodyHouse "How to create stacking cards" 방식(sticky + 스크롤 진행도에 따른 scale)을 행에 적용한 것.
(() => {
  const list = document.querySelector('#list');
  if (!list) return;
  const lang = (document.documentElement.lang || 'ko').slice(0, 2);
  const PAGE = 20;
  const T = { ko: ['이전', '다음', '건', '페이지', '이동'], ja: ['前へ', '次へ', '件', 'ページ', '移動'], en: ['Prev', 'Next', '', 'Page', 'Go'] }[lang] || ['Prev', 'Next', '', 'Page', 'Go'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 700px)'); // 좁은 화면은 행 겹침(sticky)을 끈다(stack.css)
  const collator = new Intl.Collator({ ko: 'ko', ja: 'ja', en: 'en' }[lang] || 'en', { numeric: true, sensitivity: 'base' });

  // 일본어: 한자 이름은 읽는 법이 없으므로 한국어 표기(음독)를 오십음 행·단 번호로 바꿔 정렬 키로 쓴다.
  // shortcut: 한국어 표기 기반 추정이라 드문 읽기는 어긋날 수 있음, DB에 name_kana 열이 생기면 그 값으로 교체.
  const ROW = [1, 1, 4, 3, 3, 8, 6, 5, 5, 2, 2, -1, 2, 2, 3, 1, 3, 5, 5];  // 초성 → あ0 か1 さ2 た3 な4 は5 ま6 や7 ら8 わ9
  const VOW = { 0: 0, 1: 3, 2: 0, 3: 3, 4: 4, 5: 3, 6: 4, 7: 3, 8: 4, 9: 0, 10: 3, 11: 3, 12: 4, 13: 2, 14: 4, 15: 3, 16: 1, 17: 2, 18: 2, 19: 1, 20: 1 };
  const YA = new Set([2, 3, 6, 7, 12, 17]);
  const kanaKey = ko => {
    let key = '';
    for (const ch of ko || '') {
      const c = ch.charCodeAt(0) - 0xAC00;
      if (c < 0 || c > 11171) continue;
      const cho = Math.floor(c / 588), jung = Math.floor((c % 588) / 28);
      let row = ROW[cho];
      if (row === -1) row = jung === 9 ? 9 : YA.has(jung) ? 7 : 0;
      key += row + '' + (VOW[jung] ?? 0);
      if ([4, 16, 21].includes(c % 28)) key += 'a0'; // 받침 ㄴ·ㅁ·ㅇ = ん (오십음에서 가장 뒤)
    }
    return key;
  };
  const byId = new Map(); // id → RAW record (일본어 정렬용)
  const rawOf = id => {
    if (!byId.size && typeof RAW !== 'undefined') RAW.forEach(r => byId.set(String(r.id), r));
    return byId.get(String(id));
  };
  const nameOf = el => el.querySelector('h3')?.textContent.trim() || '';
  const sortKey = el => {
    if (lang === 'ja') { const r = rawOf(el.dataset.id); const k = kanaKey(r?.n); return k ? [k, r?.jp || ''] : ['~', nameOf(el)]; }
    return ['', nameOf(el)];
  };
  const compare = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : collator.compare(a[1], b[1]));
  const photoPriceRank = el => el.querySelector('.ph img') ? (el.querySelector('.prices .price:not(.noprice):not(.ref)') ? 0 : 1) : 2;

  let cards = [], sig = '', page = 1, cols = 4, lastY = 0;
  const pager = document.createElement('nav');
  pager.className = 'pager';
  pager.setAttribute('aria-label', T[3]);
  list.after(pager);

  const colsFor = w => (w >= 740 ? 4 : w >= 440 ? 2 : 1);

  function build() {
    list.classList.add('stacked');
    const start = (page - 1) * PAGE, slice = cards.slice(start, start + PAGE);
    list.querySelectorAll('.stack-row').forEach(r => r.remove());
    cols = colsFor(list.clientWidth || innerWidth);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < slice.length; i += cols) {
      const row = document.createElement('div');
      row.className = 'stack-row';
      row.style.setProperty('--i', frag.childElementCount);
      row.style.setProperty('--cols', cols);
      row.append(...slice.map(s => s.el).slice(i, i + cols));
      frag.append(row);
    }
    list.prepend(frag);
    list.querySelectorAll('.stack-row').forEach(fitPhotos);
    renderPager();
    stackFrame();
  }

  // 사진 칸을 사진 비율에 맞춘다: 같은 행에서 가장 큰 사진 높이(140~260px)로 칸을 잡고, 남는 부분은 같은 사진을 흐리게 깔아 채운다.
  // 시설 사진은 원본을 자르지 않고(contain) 그대로 보여 준다.
  function fitPhotos(row) {
    const imgs = [];
    for (const card of row.children) {
      let img = card.querySelector('.ph > img, .pic');
      if (!img) {
        const el = card.querySelector(':scope > img, :scope > .no-image');
        if (el) {
          const ph = document.createElement('div');
          ph.className = 'ph';
          el.before(ph);
          ph.append(el);
          if (el.tagName === 'IMG') img = el;
        }
      }
      if (img) {
        imgs.push(img);
        const url = img.currentSrc || img.src;
        if (url) img.parentElement.style.setProperty('--bg', 'url(' + JSON.stringify(url) + ')');
        if (!img.complete) img.addEventListener('load', () => fitRow(row, imgs), { once: true });
      }
    }
    fitRow(row, imgs);
  }
  function fitRow(row, imgs) {
    const w = row.firstElementChild?.clientWidth || 240;
    imgs.forEach(i => { const u = i.currentSrc || i.src; if (u) i.parentElement.style.setProperty('--bg', 'url(' + JSON.stringify(u) + ')'); });
    const hs = imgs.filter(i => i.naturalWidth).map(i => (w * i.naturalHeight) / i.naturalWidth);
    const h = hs.length ? Math.min(220, Math.max(130, Math.round(Math.max(...hs)))) : 170;
    row.style.setProperty('--ph-h', h + 'px');
  }

  function renderPager() {
    // 결과가 한 페이지(20건) 이하이면 페이지 이동 줄을 감춘다. 아래 건수 표시는 항상 걸러진 결과 전체 기준.
    const pages = Math.ceil(cards.length / PAGE);
    pager.hidden = cards.length <= PAGE;
    if (pager.hidden) { pager.textContent = ''; return; }
    const nums = new Set([1, pages]);
    for (let n = page - 2; n <= page + 2; n++) nums.add(n);
    let html = `<button type="button" data-p="${page - 1}" ${page === 1 ? 'disabled' : ''}>${T[0]}</button>`;
    let prev = 0;
    for (const n of [...nums].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b)) {
      if (n - prev > 1) html += '<span aria-hidden="true">…</span>';
      html += `<button type="button" data-p="${n}"${n === page ? ' aria-current="page"' : ''}>${n}</button>`;
      prev = n;
    }
    html += `<button type="button" data-p="${page + 1}" ${page === pages ? 'disabled' : ''}>${T[1]}</button>`;
    const from = (page - 1) * PAGE + 1, to = Math.min(page * PAGE, cards.length);
    html += `<form class="pager-jump"><label>${T[3]} <input type="number" inputmode="numeric" min="1" max="${pages}" value="${page}" aria-label="${T[3]} (1–${pages})"> / ${pages}</label><button type="submit">${T[4]}</button></form>`;
    pager.innerHTML = html + `<small>${from}–${to} / ${cards.length.toLocaleString(lang)}${T[2]}</small>`;
  }
  pager.addEventListener('submit', e => {
    e.preventDefault();
    const n = Math.min(Math.ceil(cards.length / PAGE), Math.max(1, Math.round(+e.target.querySelector('input').value) || page));
    if (n !== page) { page = n; build(); }
    list.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  });

  pager.addEventListener('click', e => {
    const b = e.target.closest('button[data-p]');
    if (!b || b.disabled) return;
    page = +b.dataset.p;
    build();
    list.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  });

  const mo = new MutationObserver(arrange);
  function arrange() {
    const fresh = [...list.children].filter(el => el.matches('.card, .listing'));
    if (!fresh.length) { if (!list.querySelector('.stack-row')) { pager.hidden = true; pager.textContent = ''; cards = []; sig = ''; } return; }
    mo.disconnect();
    // 앱이 목록 전체를 다시 그린 직후 focus()가 23만px 아래로 스크롤시키므로, 그 전의 위치(lastY)로 되돌린다(찜 클릭 시 맨 아래로 튀던 문제).
    const y = cards.length ? lastY : scrollY;
    const mode = document.querySelector('#sort')?.value || '';
    const sorted = mode === '' || mode === 'name';
    // 같은 순서로 다시 그려진 경우(찜 토글 등)에는 현재 페이지를 유지하고, 결과 집합이 바뀌면 1페이지로.
    cards = fresh.map(el => ({ el, key: sortKey(el) }));
    if (sorted) cards.sort((a, b) => (mode === '' ? photoPriceRank(a.el) - photoPriceRank(b.el) : 0) || compare(a.key, b.key));
    const next = cards.map(c => c.el.dataset.id).sort().join(',') + '|' + mode;
    if (next !== sig) { page = 1; sig = next; }
    cards.forEach(c => c.el.remove()); // 현재 페이지 밖의 카드는 DOM에서 빼 둔다(메모리에만 보관)
    build();
    // 무조건 호출: focus()가 시작한 부드러운 스크롤(smooth)을 이 호출이 취소한다.
    if (y > 0) scrollTo({ top: y, behavior: 'instant' });
    mo.observe(list, { childList: true });
  }

  // 스택 효과: 다음 행이 올라와 겹치는 정도(p)만큼 이전 행을 살짝 줄인다. 올릴 때는 같은 값이 거꾸로 돌아간다.
  let ticking = false;
  function stackFrame() {
    ticking = false;
    const rows = [...list.querySelectorAll('.stack-row')];
    rows.forEach((row, i) => {
      const next = rows[i + 1];
      if (!next || reduced.matches || narrow.matches) { row.style.transform = ''; return; }
      const h = row.offsetHeight, gap = parseFloat(getComputedStyle(row).marginBottom) || 0, peek = 14;
      const d = next.getBoundingClientRect().top - row.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (h + gap - d) / (h + gap - peek)));
      row.style.transform = p > 0.001 ? `scale(${(1 - 0.05 * p).toFixed(4)})` : '';
    });
  }
  addEventListener('scroll', () => { lastY = scrollY; if (!ticking) { ticking = true; requestAnimationFrame(stackFrame); } }, { passive: true });
  let rz;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { if (cards.length && colsFor(list.clientWidth) !== cols) build(); }, 150); }).observe(list);

  // 상세 서랍: 닫기 버튼·Esc·바깥 클릭. (site.js의 state/render 사용)
  const detail = document.querySelector('#detail');
  if (detail && typeof state !== 'undefined') {
    // 닫기 버튼·Esc로 닫으면 포커스를 연 카드(id로 다시 찾는다. render가 목록을 새로 만들기 때문)로 돌려 보낸다. 바깥 클릭은 클릭한 곳을 그대로 둔다.
    const close = (restore) => { const id = state.sel; state.sel = null; render(); if (restore && id) setTimeout(() => document.querySelector(`.card [data-pick="${id}"]`)?.focus({ preventScroll: true })); };
    const syncDrawer = () => {
      document.documentElement.classList.toggle('drawer-open', !detail.hidden);
      if (!detail.hidden && !detail.querySelector('.detail-close')) detail.insertAdjacentHTML('afterbegin', `<button type="button" class="detail-close" aria-label="${typeof UI === 'undefined' ? '닫기' : UI.close}">×</button>`);
    };
    new MutationObserver(syncDrawer).observe(detail, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    syncDrawer(); // 주소의 #facility-… 로 처음부터 열려 있는 경우도 닫기 버튼을 넣는다
    detail.addEventListener('click', e => e.target.closest('.detail-close') && close(true));
    addEventListener('keydown', e => e.key === 'Escape' && !detail.hidden && !document.querySelector('dialog[open]') && close(true));
    // 클릭으로 상세·목록이 다시 그려지면 e.target이 DOM에서 빠지므로, 클릭 시작 시점의 경로(composedPath)로 판단한다.
    document.addEventListener('click', e => { if (!detail.hidden && !e.composedPath().some(n => n.matches && n.matches('#detail, .card, [data-doc], dialog'))) close(); });
  }
  arrange();
  mo.observe(list, { childList: true });
})();
