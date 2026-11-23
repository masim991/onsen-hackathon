// 고정 헤더 높이를 CSS 변수(--hdr-h)로 알려 주고, 스크롤 구동 애니메이션을 지원할 때만 cover-on 을 켠다.
(() => {
  const html = document.documentElement, top = document.querySelector('header.top');
  if (!top || !(window.CSS && CSS.supports('animation-timeline: scroll()')) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const set = () => html.style.setProperty('--hdr-h', Math.round(top.getBoundingClientRect().height) + 'px');
  html.classList.add('cover-on');
  set();
  new ResizeObserver(set).observe(top);
})();
