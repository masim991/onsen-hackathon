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
      sub: '해커톤 기획 초안 (2026년 11월)', close: '닫기',
      doc: {
        terms: ['이용약관', ['서비스', '온천 한눈에는 일본 온천 시설의 정보를 모아 보여 주는 정보 서비스입니다. 예약과 결제는 각 시설 또는 예약 사이트에서 이루어집니다.'], ['정보의 정확성', '요금, 운영 상태, 시설 정보는 바뀔 수 있습니다. 방문하거나 예약하기 전에 반드시 공식 사이트에서 확인해 주세요. 이 사이트의 정보는 참고용입니다.'], ['사진과 저작물', '사진은 각 저작자와 라이선스 조건을 따릅니다. 저작자와 이용 조건은 자료 출처 페이지에서 확인할 수 있습니다.'], ['외부 링크', '외부 사이트의 내용과 서비스는 해당 운영자의 책임입니다.'], ['책임의 제한', '이 사이트의 정보를 이용해 생긴 손해에 대해, 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.'], ['약관의 변경', '약관은 필요에 따라 바뀔 수 있으며, 바뀐 내용은 이 페이지에 게시합니다.']],
        privacy: ['개인정보 처리방침', ['수집하는 정보', '회원가입과 로그인이 없으며, 이름·이메일 같은 개인정보를 수집하지 않습니다. 이용자 기록을 서버에 저장하지도 않습니다.'], ['브라우저에 저장되는 값', '찜 목록과 첫 화면(인트로) 표시 여부는 이용자 기기의 브라우저에만 저장됩니다. 브라우저 저장소를 지우면 사라집니다.'], ['외부 서비스 접속', '화면을 표시하기 위해 이용자의 브라우저가 Supabase(시설 목록), Wikimedia Commons(사진), Google Fonts와 jsDelivr(글꼴), ExchangeRate-API와 Frankfurter(환율), 일본 국토지리원(지도)에 직접 접속합니다. 이때 IP 주소 등 접속 정보가 각 서비스에 전달될 수 있으며, 이는 각 서비스의 방침을 따릅니다.']],
        contact: ['문의', ['연락처', '정식 공개 전이라 문의 창구를 준비하고 있습니다. 공개 시점에 이 페이지에 연락처를 게시합니다.'], ['정보 정정 요청', '시설 정보나 사진에 오류가 있으면, 자료 출처 페이지의 공식 출처를 함께 알려 주세요.']],
      },
    },
    ja: {
      tag: '夜の湯けむりの中で、ゆっくりお休みください。', nav: '探す', info: 'ご案内', find: '温泉を探す', top: 'ページの先頭へ',
      sources: '情報・写真の出典', terms: '利用規約', privacy: 'プライバシーポリシー', contact: 'お問い合わせ',
      note: '温泉ひとめぐりは施設紹介サイトです。予約・決済は各施設や予約サイトで行います。',
      sub: 'ハッカソン企画案(2026年11月)', close: '閉じる',
      doc: {
        terms: ['利用規約', ['サービス', '温泉ひとめぐりは、日本の温泉施設の情報をまとめて紹介する情報サイトです。予約・決済は各施設または予約サイトで行われます。'], ['情報の正確性', '料金・営業状況・施設情報は変更されることがあります。訪問・予約の前に必ず公式サイトでご確認ください。本サイトの情報は参考です。'], ['写真・著作物', '写真は各著作者とライセンスの条件に従います。著作者と利用条件は出典ページでご確認いただけます。'], ['外部リンク', '外部サイトの内容とサービスは、それぞれの運営者の責任です。'], ['免責', '本サイトの情報を利用して生じた損害について、故意または重大な過失がない限り責任を負いません。'], ['規約の変更', '規約は必要に応じて変更することがあります。変更内容はこのページに掲載します。']],
        privacy: ['プライバシーポリシー', ['収集する情報', '会員登録やログインはなく、氏名・メールアドレスなどの個人情報は収集しません。利用者の記録をサーバーに保存することもありません。'], ['ブラウザに保存される値', 'お気に入りと最初の画面(イントロ)の表示状況は、利用者の端末のブラウザにのみ保存されます。ブラウザの保存データを消すと削除されます。'], ['外部サービスへの接続', '画面表示のため、ブラウザは Supabase(施設一覧)、Wikimedia Commons(写真)、Google Fonts と jsDelivr(フォント)、ExchangeRate-API と Frankfurter(為替)、国土地理院(地図)へ直接接続します。その際 IP アドレスなどの接続情報が各サービスに送られることがあり、各サービスの方針に従います。']],
        contact: ['お問い合わせ', ['連絡先', '正式公開前のため、窓口を準備中です。公開時にこのページへ連絡先を掲載します。'], ['情報の訂正', '施設情報や写真に誤りがある場合は、出典ページの公式の出典を添えてお知らせください。']],
      },
    },
    en: {
      tag: 'A night onsen. Rest slowly in the rising steam.', nav: 'Explore', info: 'Information', find: 'Find an onsen', top: 'Back to top',
      sources: 'Information and photo credits', terms: 'Terms of use', privacy: 'Privacy policy', contact: 'Contact',
      note: 'Onsen at a Glance is an information service. Reservations and payments are handled by the property or booking provider.',
      sub: 'Hackathon concept draft (November 2026)', close: 'Close',
      doc: {
        terms: ['Terms of use', ['Service', 'Onsen at a Glance collects and presents information about hot spring properties in Japan. Reservations and payments are handled by each property or booking provider.'], ['Accuracy', 'Rates, opening status and facilities can change. Check the official site before you visit or book. The information here is a guide only.'], ['Photos and content', 'Photos follow each author’s license terms. Authors and terms are listed on the credits page.'], ['External links', 'The content and services of external sites are the responsibility of their operators.'], ['Liability', 'Except in cases of intent or gross negligence, we are not liable for loss arising from use of this information.'], ['Changes', 'These terms may change. Updates are posted on this page.']],
        privacy: ['Privacy policy', ['What we collect', 'There is no sign-up or login, and we do not collect personal information such as names or email addresses. We do not store visitor records on a server.'], ['Stored in your browser', 'Your favorites and whether you have seen the opening screen are stored only in your own browser. Clearing the browser’s site data removes them.'], ['Third-party connections', 'To show the page, your browser connects directly to Supabase (listings), Wikimedia Commons (photos), Google Fonts and jsDelivr (fonts), ExchangeRate-API and Frankfurter (exchange rates) and the Geospatial Information Authority of Japan (maps). Your IP address and similar connection data may be sent to those services, which follow their own policies.']],
        contact: ['Contact', ['How to reach us', 'The site is not yet public, so a contact channel is being prepared. A contact will be posted here at launch.'], ['Corrections', 'If a listing or photo is wrong, please send the official source from the credits page along with your note.']],
      },
    },
  }[lang];
  if (!L) return;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const docHtml = key => { const [title, ...secs] = L.doc[key]; return `<h2>${esc(title)}</h2>${secs.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join('')}<p class="lg-src"><a href="sources.html?lang=${lang}">${esc(L.sources)}</a></p>`; };

  root.className = 'night';
  root.innerHTML = `<canvas aria-hidden="true"></canvas>
<div class="night-in">
  <div class="night-brand"><i>湯</i><div><b>${lang === 'en' ? 'Onsen at a Glance' : lang === 'ja' ? '温泉ひとめぐり' : '온천 한눈에'}</b><p>${esc(L.tag)}</p></div></div>
  <nav class="night-nav" aria-label="footer">
    <div><h2>${esc(L.nav)}</h2><a href="#results">${esc(L.find)}</a><button type="button" data-top>${esc(L.top)}</button></div>
    <div><h2>${esc(L.info)}</h2><a href="sources.html?lang=${lang}">${esc(L.sources)}</a>
      <button type="button" data-doc="terms">${esc(L.terms)}</button><button type="button" data-doc="privacy">${esc(L.privacy)}</button><button type="button" data-doc="contact">${esc(L.contact)}</button></div>
  </nav>
  <p class="night-note">${esc(L.note)}</p>
  <p class="night-copy">© 2026 · ${esc(L.sub)}</p>
</div>
<dialog class="legal" aria-label="${esc(L.terms)}"><button type="button" class="lg-close" aria-label="${esc(L.close)}">×</button><div class="lg-body"></div></dialog>`;

  const dlg = root.querySelector('dialog'), body = root.querySelector('.lg-body');
  root.addEventListener('click', e => {
    const d = e.target.closest('[data-doc]');
    if (d) { body.innerHTML = docHtml(d.dataset.doc); dlg.showModal(); body.scrollTop = 0; return; }
    if (e.target.closest('[data-top]')) scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (e.target.closest('.lg-close') || e.target === dlg) dlg.close();
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
