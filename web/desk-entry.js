try {
  if (/AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg/.test(navigator.userAgent)) {
    document.documentElement.classList.add('webkit-map');
  }
  if (sessionStorage.getItem('onsen-desk-entry') === '1' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('desk-entry');
  }
} catch {}
