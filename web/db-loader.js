(() => {
  const project = 'https://frncsllpkxrsgxyqsfwd.supabase.co';
  const key = 'sb_publishable_7rJJBUzpz-WimUPB6eSOZg_cz4K_fGW';
  const lang = document.documentElement.lang.slice(0, 2);
  const scripts = ['site.js?v=20270103','map.js?v=20270103','language.js?v=20270103','stack-list.js?v=20270103','hires.js?v=20270103','footer.js?v=20270103','motion.js?v=20270103'];
  // 보안: DB 값은 innerHTML로 렌더링되므로 수신 시점에 HTML 이스케이프 + URL 스킴(http/https) 검증
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean = v => typeof v === 'string' ? esc(v) : Array.isArray(v) ? v.map(clean) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v;
  const safeUrl = v => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? esc(u.href) : ''; } catch { return ''; } };
  async function readRows(table, order, filter = '') {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const response = await fetch(`${project}/rest/v1/${table}?select=*&order=${order}${filter}&offset=${offset}&limit=1000`, {headers:{apikey:key, Authorization:`Bearer ${key}`}, signal:AbortSignal.timeout(8000)});
      if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('Invalid catalog response');
      rows.push(...batch);
      if (batch.length < 1000) return rows;
    }
  }
  // 승인(published)된 공지만: RLS가 익명에게는 그 행만 보여 준다. 값은 받는 즉시 이스케이프·URL 검증한다.
  const NOTICE_Q = 'facility_notices?select=id,facility_id,title,notice_date,summary_ko,source_url,detected_at&published=eq.true&summary_ko=not.is.null&order=detected_at.desc&limit=500';
  const rest = async (path) => {
    const response = await fetch(`${project}/rest/v1/${path}`, {headers:{apikey:key, Authorization:`Bearer ${key}`}, cache:'no-store', signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error(`${path.split('?')[0]}: HTTP ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body)) throw new Error('Invalid response');
    return body;
  };
  const readNotices = () => rest(NOTICE_Q);
  function setNotices(rows) {
    const map = new Map();
    for (const n of rows || []) {
      if (typeof n.facility_id !== 'string' || typeof n.summary_ko !== 'string' || !n.summary_ko.trim()) continue;
      if (!map.has(n.facility_id)) map.set(n.facility_id, []);
      map.get(n.facility_id).push({title:esc(n.title), summary:esc(n.summary_ko), url:safeUrl(n.source_url), date:/^d{4}-d{2}-d{2}$/.test(n.notice_date || '') ? n.notice_date : ''});
    }
    window.ONSEN_NOTICES = map;
  }
  async function readCatalog() {
    // 시설과 사진은 서로 독립이라 동시에 받는다. 사진만 실패하면 로컬 사진을 쓴다.
    const [rows, photos, notices] = await Promise.all([
      readRows('onsen_facilities', 'id.asc', '&unlisted=eq.false').catch(() => readRows('onsen_facilities', 'id.asc')), // 숨김 열이 없는 옛 DB에서도 동작
      readRows('onsen_photos', 'facility_id.asc,sort_order.asc,image_key.asc').catch(error => { console.warn('Photo catalog unavailable; using local photos.', error); return null; }),
      readNotices().catch(() => null) // 공지는 덤: 실패해도 화면은 그대로
    ]);
    if (!rows.length) throw new Error('Empty catalog');
    return {rows, photos, notices};
  }
  function applyCatalog({rows, photos, notices}, partial) {
    if (notices) setNotices(notices);
    const publishedIds = new Set(rows.map(row => String(row.id)));
    if (!partial) for (let i=RAW.length-1; i>=0; i--) if (!publishedIds.has(String(RAW[i].id))) RAW.splice(i,1);
    const local = new Map(RAW.map(r => [String(r.id), r]));
    for (const row of rows) {
      let r = local.get(row.id);
      const values = {...clean(row.record), monitor:clean(row.record?.monitor ?? null) /* 되돌림으로 키가 사라지면 이전 값도 지운다 */, n:esc(row.name_ko), jp:esc(row.name_ja), pref:esc(row.prefecture), a:esc(row.area), kind:esc(row.facility_kind || 'unknown'), hp:safeUrl(row.official_url), srcUrl:safeUrl(row.source_url), checked:esc(row.source_checked)};
      if (r) Object.assign(r, values);
      else { r={id:row.id, src:'official', b:'', im:'', ...values}; RAW.push(r); local.set(row.id,r); }
      const extra=EXTRA[row.id] || (row.record?.extra ? (EXTRA[row.id]={}) : undefined);
      if (extra && row.record?.dayPChecked && row.record.dayPChecked > (extra.checked || '') && /^[\d,]+$/.test(row.record.dayP || '')) extra.dayPrice=Number(row.record.dayP.replace(/,/g,''));
      if (extra && row.record?.extra && typeof row.record.extra === 'object') Object.assign(extra,clean(row.record.extra));
    }
    if (photos !== null) {
      for (const r of local.values()) { r.im=''; IM_FIX[r.id]=''; }
      const groups = new Map();
      const safeValue = value => typeof value === 'string' ? !/[<>"']/.test(value) : !value || typeof value !== 'object' || Object.values(value).every(safeValue);
      for (const p of photos) {
        if (!local.has(p.facility_id) || !p.image_key || !p.image_path || ![p.image_key,p.image_path,p.caption,p.author,p.license,p.metadata].every(safeValue)) continue;
        if (!/^images\/[\w.\-/]+$/.test(p.image_path) && !/^https:\/\/(upload|commons)\.wikimedia\.org\/[^\s]+$/.test(p.image_path)) continue; // 보안: CSP가 허용하는 이미지 호스트만 받는다
        const meta=p.metadata || {};
        if (meta.source && !/^https?:\/\/[^\s]+$/.test(meta.source)) continue;
        if (meta.terms && !/^https?:\/\/[^\s]+$/.test(meta.terms)) continue;
        if (!groups.has(p.facility_id)) groups.set(p.facility_id,[]);
        groups.get(p.facility_id).push(p);
      }
      for (const [id, group] of groups) {
        const photoKey=`db:${id}`;
        PHOTOS[photoKey]={cap:group[0].caption, shots:group.map(p=>{LOCAL_PHOTOS[p.image_key]=p.image_path;return [p.image_key,p.author||'',p.license||'',{...p.metadata,caption:p.caption}]})};
        local.get(id).im=photoKey;
      }
    }
    document.documentElement.dataset.catalog = 'supabase';
  }
  // 같은 출처의 보조 JSON(이름 교정·시설별 덮어쓰기·공식 사이트 가격)은 DB 응답과 동시에 받고, 실패해도 없는 것으로 친다.
  const jget = p => fetch(p, {cache:'no-cache', signal:AbortSignal.timeout(8000)}).then(r => r.ok ? r.json() : null).catch(() => null);
  const AUX = Promise.all(['names-fix','overrides','prices','price-stats'].map(n => jget('data/'+n+'.json')));
  const okId = id => /^[\w-]{1,80}$/.test(id);
  // DB가 이름을 덮어쓴 뒤에 적용한다: 한국어 이름만 id로 교정(names-fix), 시설별 덮어쓰기(overrides: hp:null 이면 공식 사이트 주소를 비운다).
  function applyAux([names, over, prices, stats]) {
    const byId = new Map(RAW.map(r => [String(r.id), r]));
    for (const [id, v] of Object.entries(names || {})) if (okId(id) && byId.has(id) && typeof v?.n === 'string' && v.n) byId.get(id).n = esc(v.n);
    for (const [id, v] of Object.entries(over || {})) if (okId(id) && byId.has(id) && v && v.hp === null) byId.get(id).hp = '';
    window.ONSEN_PRICES = {items: prices?.items || {}, stats: stats?.byPref || {}};
  }
  // 변경 감지: Realtime(웹소켓)은 wss 호스트 + 클라이언트 라이브러리가 필요해 CSP/무의존 원칙과 맞지 않아, 열린 동안 60초마다 가벼운 REST 두 건만 확인한다.
  // 시각이 바뀐 경우에만 바뀐 행을 다시 받아 제자리에서 다시 그린다. shortcut: 최신 공지 1건만 비교하므로 오래된 공지의 승인 취소는 새로고침 때 반영, Realtime은 나중에.
  const PROBE_N = 'facility_notices?select=id,detected_at&published=eq.true&order=detected_at.desc&limit=1';
  const PROBE_F = 'onsen_facilities?select=id,updated_at&unlisted=eq.false&order=updated_at.desc&limit=1';
  const seen = {n: undefined, f: undefined};
  async function poll() {
    if (document.hidden || seen.busy) return;
    seen.busy = true;
    try {
      const [pn, pf] = await Promise.all([rest(PROBE_N).catch(() => null), rest(PROBE_F).catch(() => null)]);
      let changed = false;
      if (pn) {
        const v = pn[0] ? `${pn[0].id}@${pn[0].detected_at}` : '';
        if (seen.n === undefined) seen.n = v;
        else if (v !== seen.n) { seen.n = v; setNotices(await readNotices()); changed = true; }
      }
      if (pf && pf[0] && typeof pf[0].updated_at === 'string') {
        const v = pf[0].updated_at;
        if (seen.f === undefined) seen.f = v;
        else if (v !== seen.f) {
          const rows = await rest(`onsen_facilities?select=*&unlisted=eq.false&updated_at=gt.${encodeURIComponent(seen.f)}&order=updated_at.asc&limit=1000`);
          seen.f = v;
          if (rows.length) { applyCatalog({rows, photos:null}, true); changed = true; }
        }
      } else if (pf && seen.f === undefined) seen.f = '';
      if (changed && window.onsenRefresh) window.onsenRefresh();
    } catch (error) { console.warn('Change check failed.', error); }
    finally { seen.busy = false; }
  }
  function startPolling() {
    poll(); // 기준값을 잡는다(처음엔 다시 그리지 않는다)
    setInterval(poll, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  }
  // async=false: 내려받기는 동시에, 실행은 넣은 순서대로(앞 스크립트의 전역 값을 뒤 스크립트가 쓴다).
  function loadScript(src) { return new Promise((resolve,reject)=>{const s=document.createElement('script');s.async=false;s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s);}); }
  (async () => {
    // 일본어·영어 시설 설명 번역표(한국어는 불필요)는 DB 응답을 기다리는 동안 같이 받는다(번역표는 RAW와 무관).
    const locale = lang !== 'ko' ? loadScript(`locale-${lang === 'ja' ? 'ja' : 'en'}-data.js?v=20270103`) : Promise.resolve();
    try { const data=await readCatalog();applyCatalog(data); }
    catch (error) {
      document.documentElement.dataset.catalog = 'local'; console.warn('Supabase catalog unavailable; using local data.',error);
      // 폴백에서도 숨긴(unlisted) 시설은 보이지 않게: 공개 id 목록에 있는 번들 기록만 남긴다(목록을 못 받으면 그대로 둔다)
      try { await loadScript('listed-ids.js?v=20270103'); const ok = new Set(window.LISTED_IDS.map(String)); for (let i=RAW.length-1; i>=0; i--) if (!ok.has(String(RAW[i].id))) RAW.splice(i,1); } catch {}
    }
    applyAux(await AUX);
    await locale;
    await Promise.all(scripts.map(loadScript));
    startPolling();
  })().catch(error=>console.error('Application failed to load',error));
})();
