// 다크 모드: <head>에서 동기 실행해 첫 화면부터 맞는 테마로 그린다(인라인 스크립트는 CSP가 막는다).
// 기본은 기기 설정(prefers-color-scheme), 사용자가 고른 값은 localStorage('onsen-theme')에 저장한다.
(() => {
  const root = document.documentElement, KEY = 'onsen-theme', DARK_BAR = '#12191a';
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const saved = () => { try { const v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : null; } catch { return null; } };
  const bar = document.querySelector('meta[name="theme-color"]'), lightBar = bar && bar.content;
  const apply = (t) => { root.dataset.theme = t; if (bar) bar.content = t === 'dark' ? DARK_BAR : lightBar; document.querySelectorAll('.theme-btn').forEach((b) => b.setAttribute('aria-pressed', t === 'dark')); };
  apply(saved() || (mq.matches ? 'dark' : 'light'));
  mq.addEventListener('change', () => { if (!saved()) apply(mq.matches ? 'dark' : 'light'); }); // 직접 고르기 전에는 기기 설정을 따른다
  const svg = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  // 머리글의 언어 선택 바로 왼쪽에 두는 버튼. label 은 각 언어 사전의 문구.
  window.onsenTheme = {
    button(label) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'theme-btn'; b.title = label; b.setAttribute('aria-label', label);
      b.setAttribute('aria-pressed', root.dataset.theme === 'dark');
      b.innerHTML = svg('<path class="i-moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>') + svg('<circle class="i-sun" cx="12" cy="12" r="4"/><path class="i-sun" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>');
      b.addEventListener('click', () => { const t = root.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(KEY, t); } catch {} apply(t); });
      return b;
    },
  };
})();
