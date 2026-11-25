// 안내 페이지(water*, guide*) 공통 틀: 메인과 같은 헤더·커버 배너·목차를 만든다. 하단은 footer.js, 접힘 동작은 cover.js 가 맡는다.
// 문구는 <html lang> 에 맞춘 아래 사전에서 가져오고, 페이지 본문은 각 HTML 에 있다. 로드 순서: page.js → cover.js → footer.js
(() => {
  const lang = (document.documentElement.lang || 'ko').slice(0, 2), kind = document.body.dataset.page;
  const L = {
    ko: {
      brand: '온천 한눈에', tag: '일본 온천 숙소·당일 온천 찾기', home: 'index.html', homeAria: '온천 한눈에 홈', navAria: '주요 메뉴', lang: '언어', theme: '다크 모드', toc: '목차', results: 'index.html#results',
      nav: [['온천 찾기', 'index.html#results'], ['온천수 안내', 'water.html'], ['료칸 숙박 안내', 'guide.html#ryokan'], ['가기 전 확인할 것', 'guide.html#guide'], ['결제 방법 안내', 'index.html#pay']],
      cover: {
        water: { eyebrow: '泉質のはなし', title: '온천수 안내', sub: '처음 보는 온천수, 쉽게 알아보기' },
        guide: { eyebrow: 'TRAVEL NOTES', title: '온천 여행을 준비하며', sub: '예약하기 전과 방문하기 전에 필요한 항목을 확인하세요.' },
      },
      cap: { water: '노보리베쓰 온천 풍경', guide: '구로카와 온천 풍경' }, photo: '사진: ', resized: ' · 크기 조정', original: '사진 원본',
    },
    ja: {
      brand: '温泉ひとめぐり', tag: '日本の温泉旅館を探す', home: 'ja.html', homeAria: '温泉ひとめぐり ホーム', navAria: 'メインメニュー', lang: '言語', theme: 'ダークモード', toc: '目次', results: 'ja.html#results',
      nav: [['温泉を求めて', 'ja.html#results'], ['泉質について', 'water-ja.html'], ['宿泊前の確認', 'guide-ja.html#guide'], ['温泉に行く前に', 'guide-ja.html#onsen'], ['支払い', 'ja.html#pay']],
      cover: {
        water: { eyebrow: '泉質のはなし', title: '泉質について', sub: '泉質は温泉の分析結果による分類です。' },
        guide: { eyebrow: 'TRAVEL NOTES', title: '温泉旅行の準備', sub: '宿を選ぶときと、温泉に行く前に確認したい項目です。' },
      },
      cap: { water: '登別温泉の風景', guide: '黒川温泉の風景' }, photo: '写真：', resized: ' · サイズ変更', original: '原本',
    },
    en: {
      brand: 'Onsen at a Glance', tag: 'Discover hot spring stays in Japan', home: 'en.html', homeAria: 'Onsen at a Glance home', navAria: 'Main navigation', lang: 'Language', theme: 'Dark mode', toc: 'On this page', results: 'en.html#results',
      nav: [['Find a stay', 'en.html#results'], ['Water guide', 'water-en.html'], ['Ryokan guide', 'guide-en.html#ryokan'], ['Before bathing', 'guide-en.html#guide'], ['Payments', 'en.html#pay']],
      cover: {
        water: { eyebrow: '泉質のはなし', title: 'Understanding hot spring water', sub: 'Hot springs are classified by their temperature and dissolved substances.' },
        guide: { eyebrow: 'TRAVEL NOTES', title: 'Planning an onsen trip', sub: 'What to check before you book a ryokan and before you visit an onsen.' },
      },
      cap: { water: 'Noboribetsu hot spring landscape', guide: 'Kurokawa hot spring landscape' }, photo: 'Photo: ', resized: ' · resized', original: 'original',
    },
  }[lang];
  // 사진: 저작자·라이선스는 Wikimedia Commons 원본 페이지 기준(메인 히어로와 같은 표기)
  const P = {
    water: { src: 'images/noboribetsu.jpg', file: 'Noboribetsu_hot_spring_jigokudani_20130503.jpg', by: 'メルビル', lic: 'CC BY-SA 3.0', licUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', resized: true },
    guide: { src: 'images/commons-added-15027269.jpg', file: 'Kurokawa_Onsen_-%E6%B8%A9%E6%B3%89%E8%A1%97.jpg', by: 'hiroooooki', lic: 'CC BY 2.0', licUrl: 'https://creativecommons.org/licenses/by/2.0/', resized: false },
  }[kind];
  if (!L || !P) return;
  const C = L.cover[kind], suffix = { ko: '', ja: '-ja', en: '-en' };
  const langs = [['ko', '한국어'], ['ja', '日本語'], ['en', 'English']];
  const el = (tag, cls, html) => Object.assign(document.createElement(tag), { className: cls || '', innerHTML: html || '' });
  const mark = '<svg class="ic mark" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15a8 4.5 0 0 0 16 0M8.5 11c-1.4-2 1.4-3 0-5M12 11c-1.4-2 1.4-3 0-5M15.5 11c-1.4-2 1.4-3 0-5"/></svg>';
  const page = h => h.split('#')[0].replace(/\.html$/, ''), here = location.pathname.split('/').pop().replace(/\.html$/, '');

  const header = el('header', 'top', `
  <a class="brand" href="${L.home}" aria-label="${L.homeAria}">${mark}<span class="brand-txt"><strong>${L.brand}</strong><small>${L.tag}</small></span></a>
  <nav aria-label="${L.navAria}">${L.nav.map(([t, h]) => `<a href="${h}"${page(h) === here && (kind === 'water' || h.includes('#' + (lang === 'ja' ? 'guide' : 'ryokan'))) ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <div class="header-tools"><div class="hd-row"><label class="language-switch"><span>${L.lang}</span><select aria-label="${L.lang}">${langs.map(([c, n]) => `<option value="${kind}${suffix[c]}.html" lang="${c}"${c === lang ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div></div>`);
  header.querySelector('.hd-row').prepend(window.onsenTheme.button(L.theme));
  header.querySelector('select').addEventListener('change', e => { location.href = e.target.value; });

  const photo = `${L.photo}${L.cap[kind]}. ${P.by}${P.resized ? L.resized : ''} · <a href="https://commons.wikimedia.org/wiki/File:${P.file}" target="_blank" rel="noopener">${L.original}</a> · <a href="${P.licUrl}" target="_blank" rel="noopener">${P.lic}</a> · Wikimedia Commons`;
  const hero = el('section', 'hero', `
  <img src="${P.src}" alt="" width="960" height="540" fetchpriority="high">
  <div class="hero-txt"><p class="eyebrow">${C.eyebrow}</p><h1>${C.title}</h1><p class="sub">${C.sub}</p></div>
  <small class="credit">${photo}</small>`);
  hero.setAttribute('aria-label', C.title);
  document.body.prepend(header, hero);

  // 목차: 본문의 h2[id] 로 만든다(넓은 화면은 옆에 고정, 좁은 화면은 가로 칩)
  const secs = [...document.querySelectorAll('.pg-body h2[id]')];
  const pg = document.querySelector('.pg');
  if (pg && secs.length > 1) {
    const toc = el('nav', 'pg-toc', `<p class="pg-toc-h">${L.toc}</p><ol></ol>`);
    toc.setAttribute('aria-label', L.toc);
    const ol = toc.querySelector('ol');
    secs.forEach(h => { const li = document.createElement('li'), a = document.createElement('a'); a.setAttribute('href', '#' + h.id); a.textContent = h.textContent; li.append(a); ol.append(li); });
    pg.prepend(toc);
    const links = new Map(secs.map(h => [h.parentElement, toc.querySelector(`a[href="#${h.id}"]`)]));
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => a.removeAttribute('aria-current'));
        links.get(e.target).setAttribute('aria-current', 'location');
      }), { rootMargin: '-25% 0px -65% 0px' });
      links.forEach((_, s) => spy.observe(s));
    }
  }

  // 등장 효과: motion.css 의 .rv/.in 규칙을 그대로 쓴다(동작 줄이기 설정에서는 그 규칙이 적용되지 않는다)
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.style.setProperty('--d', (e.target.dataset.i || 0) * 60 + 'ms');
      e.target.classList.add('in');
      io.unobserve(e.target);
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.pg-body > section, .pg-card, .pg-key, .pg-dl > div').forEach(n => {
      n.dataset.i = Math.min([...n.parentElement.children].indexOf(n), 5);
      n.classList.add('rv');
      io.observe(n);
    });
  }

  // footer.js 의 "온천 찾기" 링크(#results)는 이 페이지에 없으므로 메인 검색으로 연결한다
  addEventListener('DOMContentLoaded', () => document.querySelectorAll('footer.night a[href="#results"]').forEach(a => { a.href = L.results; }));
})();
