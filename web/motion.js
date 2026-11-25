(() => {
  const hero = document.querySelector('.hero, .intro');
  const photo = document.querySelector('#heroImg') || hero;
  const count = document.querySelector('#count');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!hero || !photo || !count || !('animate' in hero)) return;

  const veil = document.createElement('span');
  veil.className = 'onsen-transition-veil';
  veil.setAttribute('aria-hidden', 'true');
  hero.append(veil);
  const mist = document.createElement('span');
  mist.className = 'onsen-entry-mist';
  mist.setAttribute('aria-hidden', 'true');
  hero.append(mist);
  let photoAnimation;
  let countAnimation;
  const attribute = photo === hero ? 'style' : 'src';
  let previous = photo.getAttribute(attribute);
  new MutationObserver(() => {
    const current = photo.getAttribute(attribute);
    if (current === previous) return;
    previous = current;
    if (reduced.matches || document.hidden) return;
    photoAnimation?.cancel();
    photoAnimation = veil.animate(
      [{ opacity: 0, transform: 'translateY(8%)' }, { opacity: 0.7, offset: 0.35 }, { opacity: 0, transform: 'translateY(-4%)' }],
      { duration: 1050, easing: 'ease-out' }
    );
  }).observe(photo, { attributes: true, attributeFilter: [attribute] });

  new MutationObserver(() => {
    if (reduced.matches || document.hidden) return;
    countAnimation?.cancel();
    countAnimation = count.animate(
      [{ color: '#376b67', transform: 'translateY(3px) scale(1.14)' }, { color: getComputedStyle(count).color, transform: 'none' }],
      { duration: 480, easing: 'ease-out' }
    );
  }).observe(count, { childList: true, characterData: true, subtree: true });
  if ('IntersectionObserver' in window) {
    let visible = true;
    const syncMotion = () => hero.classList.toggle('motion-paused', !visible || document.hidden);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncMotion(); }).observe(hero);
    document.addEventListener('visibilitychange', syncMotion);
    // 스크롤 내릴 때·올릴 때 모두 재생: 화면에 들어오면 in, 완전히 벗어나면 제거. 벗어난 방향으로 되돌아오는 방향이 정해짐.
    const REVEAL = '.guide, .fbox, .locale-property-notes, #results-h';
    const seen = new WeakSet();
    const reveal = new IntersectionObserver(entries => {
      let n = 0;
      for (const { target, isIntersecting, boundingClientRect } of entries) {
        if (isIntersecting) { target.style.setProperty('--d', Math.min(n++, 5) * 60 + 'ms'); target.classList.add('in'); }
        else if (target.classList.contains('in')) {
          target.style.setProperty('--d', '0ms');
          target.style.setProperty('--rv-y', boundingClientRect.top < 0 ? '-10px' : '10px');
          target.classList.remove('in');
        }
      }
    }, { rootMargin: '80px 0px -40px 0px' });
    const watch = root => root.querySelectorAll?.(REVEAL).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      if (!reduced.matches) el.classList.add('rv');
      reveal.observe(el);
    });
    watch(document);
    new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && (n.matches(REVEAL) && watch({ querySelectorAll: () => [n] }), watch(n))))).observe(document.body, { childList: true, subtree: true });
    // 초안의 수증기: 히어로 위로 천천히 번지는 안개 두 덩이
    for (const cls of ['steam', 'steam steam-2']) {
      const st = document.createElement('span');
      st.className = cls;
      st.setAttribute('aria-hidden', 'true');
      hero.append(st);
    }
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) { photoAnimation?.cancel(); countAnimation?.cancel(); }
  });
})();
