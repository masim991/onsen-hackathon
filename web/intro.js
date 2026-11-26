(() => {
  'use strict';
  try {
    if (sessionStorage.getItem('onsen-map-return') === '1') {
      sessionStorage.removeItem('onsen-map-return');
      document.documentElement.dataset.mapReturn = '1';
      return;
    }
  } catch {}
  const query = new URLSearchParams(location.search);
  const hasDestination = location.hash || ['q', 'rg', 'pref', 'area', 'kind', 'nointro'].some(key => query.has(key));
  if (hasDestination) return;
  const lang = (document.documentElement.lang || 'ko').slice(0, 2);
  location.replace(`ryokan-intro/index.html?lang=${encodeURIComponent(lang)}`);
})();
