// 첫 방문(세션당 1회) 인트로. 버튼·Esc로 닫힘. 헤드에서 동기 실행해 본문이 먼저 번쩍이지 않게 한다.
(() => {
  const KEY = 'onsen-intro-seen', TTL = 14 * 864e5; // 14일에 한 번만
  // localStorage(시각 기록) 우선, 막혀 있으면 sessionStorage(세션당 1회)
  const store = (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch { try { return sessionStorage; } catch { return null; } } })();
  try { const t = store && Number(store.getItem(KEY)); if ((t && Date.now() - t < TTL) || location.hash || /[?&]nointro/.test(location.search)) return; } catch {}
  const lang = (document.documentElement.lang || 'ko').slice(0, 2);
  const T = {
    ko: { l1: '쉼이 필요한 순간,', l2: '따뜻한 곳으로.', p: '지역과 탕의 취향에 맞춰 일본 온천 숙소를 찾아드립니다.', p2: ' 공식 출처를 확인한 정보만 담았습니다.', cta: '온천 찾아보기', note: '출처 확인 · 개인정보 수집 없음' },
    ja: { l1: '湯けむりの向こうへ、', l2: '心ほどける宿を。', p: 'エリアと湯の好みに合わせて、日本の温泉宿を探せます。', p2: ' 公式の出典を確認した情報だけを掲載しています。', cta: '温泉を探す', note: '出典確認済み · 個人情報は収集しません' },
    en: { l1: 'When you need to rest,', l2: 'head somewhere warm.', p: 'Find Japanese onsen stays by region and bath style.', p2: ' Every listing is checked against official sources.', cta: 'Find my onsen', note: 'Sources checked · No personal data collected' },
  }[lang];
  if (!T) return;
  const nav = [['ko', 'index.html', '한국어'], ['ja', 'ja.html', '日本語'], ['en', 'en.html', 'English']]
    .map(([k, h, n]) => `<a href="${h}"${k === lang ? ' aria-current="page"' : ''} hreflang="${k}">${n}</a>`).join('');
  const root = document.createElement('div');
  root.id = 'intro';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', document.title);
  root.innerHTML = `<div class="in-bg" style="background-image:url(images/noboribetsu.jpg)"></div><div class="in-shade"></div><span class="in-steam"></span><span class="in-steam in-steam-2"></span>
<header><b class="in-brand"><i>湯</i>${{ ko: '온천 한눈에', ja: '温泉ひとめぐり', en: 'Onsen at a Glance' }[lang]}</b><nav class="glass" aria-label="language">${nav}</nav></header>
<h1><span>${T.l1}</span><span class="dim">${T.l2}</span></h1>
<div class="in-bottom"><p>${T.p}<span>${T.p2}</span></p><button type="button" class="in-cta">${T.cta}</button><small><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>${T.note}</small></div>`;
  document.documentElement.append(root);
  document.documentElement.classList.add('intro-open');
  const bg = root.querySelector('.in-bg');
  // 큰 사진으로 교체(실패하면 로컬 사진 유지)
  const hi = new Image();
  hi.onload = () => { bg.style.backgroundImage = `url(${hi.src})`; };
  hi.src = `https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Noboribetsu_hot_spring_jigokudani_20130503.jpg/1280px-Noboribetsu_hot_spring_jigokudani_20130503.jpg`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const tick = () => { cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06; bg.style.transform = `translate3d(${cx}px,${cy}px,0) scale(1.08)`; raf = requestAnimationFrame(tick); };
  const move = e => { tx = (e.clientX / innerWidth - 0.5) * 40; ty = (e.clientY / innerHeight - 0.5) * 40; };
  if (!reduced) { addEventListener('mousemove', move, { passive: true }); raf = requestAnimationFrame(tick); }
  const btn = root.querySelector('.in-cta');
  const key = e => { if (e.key === 'Escape') close(); };
  function close() {
    try { store && store.setItem(KEY, String(Date.now())); } catch {}
    removeEventListener('mousemove', move); cancelAnimationFrame(raf); removeEventListener('keydown', key);
    document.documentElement.classList.remove('intro-open');
    const done = () => root.remove();
    if (reduced) return done();
    root.classList.add('out'); root.addEventListener('transitionend', done, { once: true }); setTimeout(done, 1200);
  }
  btn.addEventListener('click', close);
  addEventListener('keydown', key);
  requestAnimationFrame(() => { root.classList.add('on'); btn.focus({ preventScroll: true }); });
})();
