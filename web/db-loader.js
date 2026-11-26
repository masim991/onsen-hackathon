(() => {
  const project = 'https://frncsllpkxrsgxyqsfwd.supabase.co';
  const key = 'sb_publishable_7rJJBUzpz-WimUPB6eSOZg_cz4K_fGW';
  const lang = document.documentElement.lang.slice(0, 2);
  const catalogState = document.getElementById('catalog-state');
  function showCatalogState(local, generated='') {
    if (!catalogState) return;
    catalogState.hidden = !local;
    if (local) {
      const date = generated && !Number.isNaN(Date.parse(generated)) ? new Date(generated).toLocaleDateString({ko:'ko-KR',ja:'ja-JP',en:'en-US'}[lang] || 'en-US') : '';
      catalogState.textContent = {ko:`저장된 자료${date ? ` (${date} 기준)` : ''}를 표시하고 있습니다. 연결이 복구되면 갱신됩니다.`,ja:`保存済みの資料${date ? `（${date}時点）` : ''}を表示中です。接続が戻ると更新します。`,en:`Showing saved data${date ? ` from ${date}` : ''}. It will update when the connection returns.`}[lang] || 'Showing saved data.';
    }
  }
  const scripts = ['site.js?v=20261126regions','language.js?v=20261126layout','stack-list.js?v=20261126layout','hires.js?v=20270105','footer.js?v=20270105','motion.js?v=20270105'];
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
  const readRevision = async () => {
    const rows = await rest('onsen_catalog_revision?select=revision&id=eq.true&limit=1');
    if (rows.length !== 1 || !Number.isSafeInteger(rows[0].revision)) throw new Error('Invalid catalog revision');
    return rows[0].revision;
  };
  function setNotices(rows) {
    const map = new Map();
    for (const n of rows || []) {
      if (typeof n.facility_id !== 'string' || typeof n.summary_ko !== 'string' || !n.summary_ko.trim()) continue;
      if (!map.has(n.facility_id)) map.set(n.facility_id, []);
      map.get(n.facility_id).push({title:esc(n.title), summary:esc(n.summary_ko), url:safeUrl(n.source_url), date:/^\d{4}-\d{2}-\d{2}$/.test(n.notice_date || '') ? n.notice_date : ''});
    }
    window.ONSEN_NOTICES = map;
  }
  async function readCatalog(strict=false) {
    // 변경 중간에 여러 테이블을 읽으면 서로 다른 버전이 섞일 수 있어 앞뒤 버전을 비교한다.
    for (let attempt=0; attempt<2; attempt++) {
      const before = await readRevision().catch(() => null);
      const [rows, photos, notices] = await Promise.all([
        readRows('onsen_facilities', 'id.asc', '&unlisted=eq.false'),
        readRows('onsen_photos', 'facility_id.asc,sort_order.asc,image_key.asc').catch(error => { console.warn('Photo catalog unavailable; using local photos.', error); return null; }),
        readNotices().catch(() => null)
      ]);
      if (!rows.length) throw new Error('Empty catalog');
      if (strict && (photos === null || notices === null)) throw new Error('Incomplete catalog refresh');
      const after = await readRevision().catch(() => null);
      if (before === after && after !== null) return {rows, photos, notices, revision:after};
      if (before === null && after === null) return {rows, photos, notices, revision:null};
      if (attempt === 1) return {rows, photos, notices, revision:null};
    }
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
      // 사용 신고 요건 확인 전 해당 이미지 두 장은 로컬 표시에서 보류한다. DB 원본은 보존한다.
      const pendingRights = new Set(['official/orihashi-kagoshima-2428.jpg','official/koshikano-kagoshima-2394.jpg']);
      for (const p of photos) {
        if (pendingRights.has(p.image_key)) continue;
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
    showCatalogState(false);
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
  // 시설·사진·공지의 모든 변경은 DB 트리거가 한 행의 revision에 반영한다.
  const seen = {revision: undefined};
  async function poll() {
    if (document.hidden || seen.busy) return;
    seen.busy = true;
    try {
      const revision = await readRevision();
      if (document.documentElement.dataset.catalog === 'local' || seen.revision === undefined || revision !== seen.revision) {
        if (document.documentElement.dataset.catalog !== 'local') {
          await new Promise(resolve => setTimeout(resolve, Math.random()*30000));
          if (document.hidden) return;
        }
        const catalog = await readCatalog(true);
        applyCatalog(catalog, false);
        applyAux(await AUX);
        seen.revision = catalog.revision === null ? undefined : catalog.revision;
        if (window.onsenRefresh) window.onsenRefresh();
      }
    } catch (error) { console.warn('Change check failed.', error); }
    finally { seen.busy = false; }
  }
  // 최초 응답의 버전을 기준으로 삼는다. 버전 조회가 실패했으면 다음 점검에서 전체를 갱신한다.
  function seedSeen({revision}) { if (Number.isSafeInteger(revision)) seen.revision = revision; }
  // 탭이 숨겨지면 타이머를 멈추고, 다시 보이면 즉시 한 번 확인한 뒤 60초 간격을 재개한다.
  let timer = 0;
  function startPolling() {
    const stop = () => { clearInterval(timer); timer = 0; };
    const run = () => { stop(); timer = setInterval(poll, 60000); };
    if (!document.hidden) run();
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else { poll(); run(); } });
  }
  // async=false: 내려받기는 동시에, 실행은 넣은 순서대로(앞 스크립트의 전역 값을 뒤 스크립트가 쓴다).
  function loadScript(src) { return new Promise((resolve,reject)=>{const s=document.createElement('script');s.async=false;s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s);}); }
  (async () => {
    // 일본어·영어 시설 설명 번역표(한국어는 불필요)는 DB 응답을 기다리는 동안 같이 받는다(번역표는 RAW와 무관).
    const locale = lang !== 'ko' ? loadScript(`locale-${lang === 'ja' ? 'ja' : 'en'}-data.js?v=20270105`) : Promise.resolve();
    try { const data=await readCatalog();applyCatalog(data);seedSeen(data); }
    catch (error) {
      document.documentElement.dataset.catalog = 'local'; console.warn('Supabase catalog unavailable; using local data.',error);
      const snapshot = await jget('data/catalog-snapshot.json');
      if (Array.isArray(snapshot?.rows) && snapshot.rows.length >= 400 && Array.isArray(snapshot.photos) && Array.isArray(snapshot.notices)) {
        applyCatalog(snapshot, false);
        document.documentElement.dataset.catalog = 'local';
        showCatalogState(true, snapshot.generated);
      } else {
        showCatalogState(true);
        // 저장된 공개 카탈로그마저 없을 때만 작은 번들 목록으로 돌아간다.
        try { await loadScript('listed-ids.js?v=20270105'); const ok = new Set(window.LISTED_IDS.map(String)); for (let i=RAW.length-1; i>=0; i--) if (!ok.has(String(RAW[i].id))) RAW.splice(i,1); } catch {}
      }
    }
    applyAux(await AUX);
    await locale;
    await Promise.all(scripts.map(loadScript));
    startPolling();
  })().catch(error=>console.error('Application failed to load',error));
})();
