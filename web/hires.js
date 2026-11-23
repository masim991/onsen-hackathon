// 상단 배너 사진을 위키미디어 원본의 1280px 판으로 바꿔 보여 준다. 불러오기에 실패하면 로컬 사진을 그대로 쓴다.
// 사진 출처·저작자 표기는 기존 크레딧(#heroCredit)을 그대로 유지한다.
(() => {
  if (typeof LOCAL_PHOTOS === 'undefined') return;
  const toKey = new Map(Object.entries(LOCAL_PHOTOS).map(([key, path]) => [path, key]));
  const cache = new Map(); // key → 고화질 URL | null(실패)
  // 1280px 판만 쓴다: upload.wikimedia.org 가 바로 내려주는 표준 크기이고, 1920px 은 가끔 429 로 막혀 CSP 밖 thumb.wikimedia.org 로 넘어가 콘솔 오류가 났다.
  const WIDTH = 1280;
  const hiUrl = key => {
    if (!/^[0-9a-f]\/[0-9a-f]{2}\/[^/]+$/.test(key)) return null;
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${key}/${WIDTH}px-${key.split('/')[2]}`;
  };
  const load = key => {
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    const url = hiUrl(key);
    if (!url) { cache.set(key, null); return Promise.resolve(null); }
    return new Promise(resolve => {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => { cache.set(key, url); resolve(url); };
      img.onerror = () => { cache.set(key, null); resolve(null); };
      img.src = url;
    });
  };
  const localOf = text => (text.match(/images\/[\w.\-]+/) || [])[0];

  const heroImg = document.querySelector('#heroImg');
  if (heroImg) {
    heroImg.fetchPriority = 'high'; heroImg.decoding = 'async';
    const upgrade = async () => {
      const local = localOf(heroImg.getAttribute('src') || '');
      const key = local && toKey.get(local);
      if (!key) return;
      const url = await load(key);
      if (url && localOf(heroImg.getAttribute('src') || '') === local) heroImg.src = url;
    };
    new MutationObserver(upgrade).observe(heroImg, { attributes: true, attributeFilter: ['src'] });
    upgrade();
  }

  const intro = document.querySelector('.intro');
  if (intro && !heroImg) {
    const upgrade = async () => {
      const bg = intro.style.backgroundImage;
      const local = localOf(bg);
      const key = local && toKey.get(local);
      if (!key) return;
      const url = await load(key);
      if (url && localOf(intro.style.backgroundImage) === local) intro.style.backgroundImage = intro.style.backgroundImage.replace(local, url);
    };
    new MutationObserver(upgrade).observe(intro, { attributes: true, attributeFilter: ['style'] });
    upgrade();
  }
})();
