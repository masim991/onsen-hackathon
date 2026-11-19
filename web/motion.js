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
    const reveal = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (!reduced.matches && !document.hidden) entry.target.animate(
          [{opacity:.65, filter:'blur(4px)', transform:'translateY(12px)'}, {opacity:1, filter:'blur(0)', transform:'translateY(0)'}],
          {duration:700, easing:'ease-out'}
        );
      }
    }, {threshold:.12});
    document.querySelectorAll('.results, .listing').forEach(section => reveal.observe(section));
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) { photoAnimation?.cancel(); countAnimation?.cancel(); }
  });
})();
