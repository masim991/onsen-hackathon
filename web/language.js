(() => {
  const header = document.querySelector('header.top');
  if (!header) return;
  const language = document.documentElement.lang.slice(0, 2);
  const label = {ko: '언어', ja: '言語', en: 'Language'}[language] || 'Language';
  const tools = document.createElement('div');
  tools.className = 'header-tools';
  // 휴대폰용 찜 버튼: 메뉴가 가로로 스크롤되어 하트가 가려지므로 고정 머리글 첫 줄에 한 번 더 둔다(데스크톱에서는 CSS로 숨김). 동작은 site.js가 #favTop 클릭을 #favToggle 과 같이 처리한다.
  if (document.getElementById('favToggle')) {
    const top = document.createElement('button');
    top.type = 'button';
    top.id = 'favTop';
    top.className = 'fav-top';
    top.setAttribute('aria-pressed', 'false');
    top.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg><span id="favTopCount">0</span>';
    tools.append(top);
    if (typeof favs !== 'undefined' && typeof UI !== 'undefined') { top.querySelector('#favTopCount').textContent = favs.size; top.setAttribute('aria-label', UI.favTop(favs.size)); }
  }
  const group = document.createElement('label');
  group.className = 'language-switch';
  group.innerHTML = `<span>${label}</span><select aria-label="${label}"><option value="index.html" lang="ko">한국어</option><option value="ja.html" lang="ja">日本語</option><option value="en.html" lang="en">English</option></select>`;
  const select = group.querySelector('select');
  select.value = language === 'ko' ? 'index.html' : language === 'ja' ? 'ja.html' : 'en.html';
  // 언어를 바꿔도 검색어·지역·도도부현·온천지·유형과 열어 둔 시설이 이어지게 한다. 허용 목록에 있는 값만, 형식을 다시 검사해서 싣는다.
  const carry = () => {
    const src = new URLSearchParams(location.search), out = new URLSearchParams();
    const q = (src.get('q') || '').replace(/\p{Cc}/gu, '').trim().slice(0, 60);
    if (q) out.set('q', q);
    const rg = src.get('rg');
    if (/^\d{1,2}$/.test(rg || '')) out.set('rg', rg);
    const pref = src.get('pref');
    if (pref && typeof DATA_I18N !== 'undefined' && Object.hasOwn(DATA_I18N.prefs, pref)) out.set('pref', pref);
    const area = src.get('area');
    if (area && typeof FAC !== 'undefined' && FAC.some((f) => f.area === area)) out.set('area', area);
    const kind = src.get('kind');
    if (['ryokan', 'hotel', 'all'].includes(kind)) out.set('kind', kind);
    const hash = /^#facility-[\w-]{1,80}$/.test(location.hash) ? location.hash : '';
    return { qs: out.toString(), hash };
  };
  select.addEventListener('change', () => {
    const { qs, hash } = carry();
    try { sessionStorage.setItem('onsen-carry', JSON.stringify({ qs, hash, t: Date.now() })); } catch {}
    window.location.href = select.value + (qs ? '?' + qs : '') + hash;
  });
  // 다크 모드 버튼은 언어 선택 바로 왼쪽(theme-init.js 가 만든다)
  const row = document.createElement('div');
  row.className = 'hd-row';
  if (window.onsenTheme) row.append(window.onsenTheme.button(typeof UI !== 'undefined' ? UI.theme : 'Dark mode'));
  row.append(group);
  tools.append(row);
  const existing = document.getElementById('fx'); // 환율 표시는 site.js가 만든다(ja는 없음)
  if (existing) tools.append(existing);
  header.append(tools);
  document.querySelector('.cover-cta')?.addEventListener('click', () => { const panel = document.querySelector('#filters details, #filterPanel'); if (panel) panel.open = true; });
})();
