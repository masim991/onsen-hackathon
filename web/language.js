(() => {
  const header = document.querySelector('header.top');
  if (!header) return;
  const language = document.documentElement.lang.slice(0, 2);
  const labels = {ko: ['언어', '엔화 환율', '불러오지 못했습니다'], ja: ['言語', '円換算', '取得できませんでした'], en: ['Language', 'JPY exchange rate', 'Rate unavailable']};
  const [label, rateLabel, unavailable] = labels[language] || labels.en;
  const tools = document.createElement('div');
  tools.className = 'header-tools';
  const group = document.createElement('label');
  group.className = 'language-switch';
  group.innerHTML = `<span>${label}</span><select aria-label="${label}"><option value="index.html" lang="ko">한국어</option><option value="ja.html" lang="ja">日本語</option><option value="en.html" lang="en">English</option></select>`;
  const select = group.querySelector('select');
  select.value = language === 'ko' ? 'index.html' : language === 'ja' ? 'ja.html' : 'en.html';
  select.addEventListener('change', () => { window.location.href = select.value; });
  tools.append(group);
  const existing = document.getElementById('fx');
  if (existing) tools.append(existing);
  else {
    const rate = document.createElement('p');
    rate.className = 'fx'; rate.setAttribute('aria-live', 'polite');
    rate.innerHTML = `<span>${rateLabel}</span><small>${unavailable}</small>`;
    tools.append(rate);
    (async () => {
      for (const [url, provider] of [['https://open.er-api.com/v6/latest/JPY', 'ExchangeRate-API'], ['https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW', 'Frankfurter']]) {
        try {
          const response = await fetch(url); if (!response.ok) continue;
          const data = await response.json(), value = data.rates?.KRW;
          if (!(value > 0)) continue;
          const date = provider === 'Frankfurter' ? data.date : new Date(data.time_last_update_utc).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          rate.innerHTML = `<span>${rateLabel}</span><b>¥100 = ₩${(100 * value).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', {maximumFractionDigits: 1})}</b><small>${date} · ${provider}</small>`;
          return;
        } catch {}
      }
    })();
  }
  header.append(tools);
  document.querySelector('.cover-cta')?.addEventListener('click', () => { const panel = document.querySelector('#filters details, #filterPanel'); if (panel) panel.open = true; });
})();
