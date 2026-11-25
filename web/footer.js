// 하단 배너: 밤의 온천. 별빛이 은은하게 반짝이고 온천수의 김이 피어오른다. 약관·개인정보·출처·문의를 이 배너에 모았다.
(() => {
  const root = document.querySelector('footer');
  if (!root) return;
  const lang = (document.documentElement.lang || 'ko').slice(0, 2);
  const L = {
    ko: {
      tag: '밤의 온천, 피어오르는 김 속에서 천천히 쉬어 가세요.', nav: '둘러보기', info: '안내', find: '온천 찾기', top: '맨 위로',
      sources: '자료 출처', terms: '이용약관', privacy: '개인정보 처리방침', contact: '문의',
      note: '온천 한눈에는 정보 서비스입니다. 예약·결제는 각 시설이나 예약 사이트에서 진행합니다.',
      sub: '일본 온천 안내',
    },
    ja: {
      tag: '夜の湯けむりの中で、ゆっくりお休みください。', nav: '探す', info: 'ご案内', find: '温泉を探す', top: 'ページの先頭へ',
      sources: '情報・写真の出典', terms: '利用規約', privacy: 'プライバシーポリシー', contact: 'お問い合わせ',
      note: '温泉ひとめぐりは施設紹介サイトです。予約・決済は各施設や予約サイトで行います。',
      sub: '日本の温泉案内',
    },
    en: {
      tag: 'A night onsen. Rest slowly in the rising steam.', nav: 'Explore', info: 'Information', find: 'Find an onsen', top: 'Back to top',
      sources: 'Information and photo credits', terms: 'Terms of use', privacy: 'Privacy policy', contact: 'Contact',
      note: 'Onsen at a Glance is an information service. Reservations and payments are handled by the property or booking provider.',
      sub: 'Japan onsen guide',
    },
  }[lang];
  if (!L) return;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sfx = lang === 'ko' ? '' : '-' + lang; // legal/terms.html, legal/terms-ja.html, legal/terms-en.html
  root.className = 'night';
  root.innerHTML = `<canvas aria-hidden="true"></canvas>
<div class="night-in">
  <div class="night-brand"><i>湯</i><div><b>${lang === 'en' ? 'Onsen at a Glance' : lang === 'ja' ? '温泉ひとめぐり' : '온천 한눈에'}</b><p>${esc(L.tag)}</p></div></div>
  <nav class="night-nav" aria-label="footer">
    <div><h2>${esc(L.nav)}</h2><a href="#results">${esc(L.find)}</a><button type="button" data-top>${esc(L.top)}</button></div>
    <div><h2>${esc(L.info)}</h2><a href="sources.html?lang=${lang}">${esc(L.sources)}</a>
      <a href="legal/terms${sfx}.html">${esc(L.terms)}</a><a href="legal/privacy${sfx}.html">${esc(L.privacy)}</a><a href="legal/contact${sfx}.html">${esc(L.contact)}</a></div>
  </nav>
  <p class="night-note">${esc(L.note)}</p>
  <p class="night-copy">© 2026 · ${esc(L.sub)}</p>
</div>`;

  root.addEventListener('click', e => {
    if (e.target.closest('[data-top]')) scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  // ── 밤하늘 캔버스: 별빛 + 산 그림자 + 수면 + 피어오르는 김 (흑백에 가까운 푸른 회색)
  const cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let W = 0, H = 0, dpr = 1, stars = [], puffs = [], raf = 0, visible = false, t0 = performance.now();
  const rnd = (a, b) => a + Math.random() * (b - a);
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(W * H / 5200);
    stars = Array.from({ length: n }, () => ({ x: rnd(0, W), y: rnd(0, H * 0.62), r: rnd(0.4, 1.4), f: rnd(0.4, 1.6), p: rnd(0, 6.28), a: rnd(0.35, 0.95) }));
    puffs = Array.from({ length: Math.round(W / 55) + 8 }, () => newPuff(true));
    draw(performance.now());
  }
  const waterY = () => H * 0.78;
  function newPuff(initial) {
    return { x: rnd(-0.05, 1.05) * W, y: initial ? rnd(waterY() - H * 0.7, waterY()) : waterY() + rnd(0, 20), r: rnd(34, 90), vy: rnd(10, 26), sway: rnd(8, 26), sp: rnd(0.25, 0.7), ph: rnd(0, 6.28), a: rnd(0.07, 0.16) };
  }
  function ridge(y0, amp, seed, color) {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y0 - amp * (Math.sin(x * 0.004 + seed) * 0.6 + Math.sin(x * 0.011 + seed * 2) * 0.3 + 0.5));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  function draw(now) {
    const t = (now - t0) / 1000, wy = waterY();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05080d'); g.addColorStop(0.6, '#0b121b'); g.addColorStop(1, '#0e1620');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {  // 별: 느리게 깜빡인다
      const a = s.a * (0.55 + 0.45 * Math.sin(t * s.f + s.p));
      ctx.globalAlpha = a; ctx.fillStyle = '#e8eef7'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ridge(wy - H * 0.04, H * 0.22, 1.3, '#0a1018');
    ridge(wy + 4, H * 0.12, 4.1, '#070c13');
    // 수면: 별빛이 어른어른 비친다
    const wg = ctx.createLinearGradient(0, wy, 0, H); wg.addColorStop(0, '#16212d'); wg.addColorStop(1, '#0a1119');
    ctx.fillStyle = wg; ctx.fillRect(0, wy, W, H - wy);
    for (const s of stars) {
      if (s.r < 0.9) continue;
      const ry = wy + (wy - s.y) * 0.18 + 6;
      if (ry > H) continue;
      ctx.globalAlpha = s.a * 0.22 * (0.6 + 0.4 * Math.sin(t * 1.3 + s.p));
      ctx.fillStyle = '#cfd9e6'; ctx.fillRect(s.x + Math.sin(t * 0.9 + s.p) * 3, ry, s.r * 5, 1);
    }
    ctx.globalAlpha = 1;
    for (const p of puffs) {  // 김: 천천히 오르며 좌우로 일렁이고 위로 갈수록 옅어진다
      if (!reduced.matches) { p.y -= p.vy * 0.016; if (p.y < wy - H * 0.75) Object.assign(p, newPuff(false)); }
      const life = Math.max(0, Math.min(1, (wy - p.y) / (H * 0.7)));
      const x = p.x + Math.sin(t * p.sp + p.ph) * p.sway, r = p.r * (0.7 + life * 0.9);
      const a = p.a * Math.sin(Math.min(1, life * 1.25) * Math.PI) * 1.1 + 0.008;
      const rg = ctx.createRadialGradient(x, p.y, 0, x, p.y, r);
      rg.addColorStop(0, `rgba(214,224,236,${a})`); rg.addColorStop(1, 'rgba(214,224,236,0)');
      ctx.fillStyle = rg; ctx.fillRect(x - r, p.y - r, r * 2, r * 2);
    }
  }
  function loop(now) { if (!visible) return; draw(now); raf = requestAnimationFrame(loop); }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting; cancelAnimationFrame(raf);
    if (visible && !reduced.matches) raf = requestAnimationFrame(loop); else if (visible) draw(performance.now());
  }).observe(root);
  let rz; new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(size, 120); }).observe(root);
  size();
})();
