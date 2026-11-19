(() => {
  const project = 'https://frncsllpkxrsgxyqsfwd.supabase.co';
  const key = 'sb_publishable_7rJJBUzpz-WimUPB6eSOZg_cz4K_fGW';
  const lang = document.documentElement.lang.slice(0, 2);
  const scripts = lang === 'ko' ? ['app.js','map.js','language.js','motion.js'] : lang === 'ja' ? ['ja.js','map-ja.js','language.js','motion.js'] : ['en.js','language.js','motion.js'];
  const stateKey = 'onsen-catalog-refresh-state';
  async function readRows(table, order) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const response = await fetch(`${project}/rest/v1/${table}?select=*&order=${order}&offset=${offset}&limit=1000`, {headers:{apikey:key, Authorization:`Bearer ${key}`}, signal:AbortSignal.timeout(8000)});
      if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('Invalid catalog response');
      rows.push(...batch);
      if (batch.length < 1000) return rows;
    }
  }
  async function readCatalog() {
    const rows = await readRows('onsen_facilities', 'id.asc');
    if (!rows.length) throw new Error('Empty catalog');
    let photos = null;
    try { photos = await readRows('onsen_photos', 'facility_id.asc,sort_order.asc,image_key.asc'); }
    catch (error) { console.warn('Photo catalog unavailable; using local photos.', error); }
    return {rows, photos};
  }
  function applyCatalog({rows, photos}) {
    const publishedIds = new Set(rows.map(row => String(row.id)));
    for (let i=RAW.length-1; i>=0; i--) if (!publishedIds.has(String(RAW[i].id))) RAW.splice(i,1);
    const local = new Map(RAW.map(r => [String(r.id), r]));
    for (const row of rows) {
      let r = local.get(row.id);
      const values = {...row.record, n:row.name_ko, jp:row.name_ja, pref:row.prefecture, a:row.area, kind:row.facility_kind || 'unknown', hp:row.official_url, srcUrl:row.source_url, checked:row.source_checked};
      if (r) Object.assign(r, values);
      else { r={id:row.id, src:'official', b:'', im:'', ...values}; RAW.push(r); local.set(row.id,r); }
      const extra=EXTRA[row.id] || (row.record?.extra ? (EXTRA[row.id]={}) : undefined);
      if (extra && row.record?.dayPChecked && row.record.dayPChecked > (extra.checked || '') && /^[\d,]+$/.test(row.record.dayP || '')) extra.dayPrice=Number(row.record.dayP.replace(/,/g,''));
      if (extra && row.record?.extra && typeof row.record.extra === 'object') Object.assign(extra,row.record.extra);
    }
    if (photos !== null) {
      for (const r of local.values()) { r.im=''; IM_FIX[r.id]=''; }
      const groups = new Map();
      const safeValue = value => typeof value === 'string' ? !/[<>"']/.test(value) : !value || typeof value !== 'object' || Object.values(value).every(safeValue);
      for (const p of photos) {
        if (!local.has(p.facility_id) || !p.image_key || !p.image_path || ![p.image_key,p.image_path,p.caption,p.author,p.license,p.metadata].every(safeValue)) continue;
        if (!/^images\/[\w.\-/]+$/.test(p.image_path) && !/^https:\/\/[^\s]+$/.test(p.image_path)) continue;
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
  function saveView() {
    const form=document.querySelector('#filters, #search');
    const controls=form ? [...form.querySelectorAll('input,select')].map(el=>({value:el.value,checked:el.checked})) : [];
    const panel=form?.querySelector('details') || document.querySelector('#filterPanel');
    try { sessionStorage.setItem(stateKey,JSON.stringify({lang,controls,open:panel?.open,sort:document.querySelector('#sort')?.value,fav:document.querySelector('#favToggle')?.getAttribute('aria-pressed')==='true',scroll:scrollY})); } catch {}
  }
  function restoreView() {
    let state; try {state=JSON.parse(sessionStorage.getItem(stateKey));sessionStorage.removeItem(stateKey)} catch {return}
    if (!state || state.lang!==lang) return;
    const form=document.querySelector('#filters, #search'); if (!form) return;
    const controls=[...form.querySelectorAll('input,select')];
    state.controls?.forEach((v,i)=>{if(controls[i]){controls[i].value=v.value;if('checked' in controls[i])controls[i].checked=v.checked}});
    const pref=form.querySelector('#prefSel, #pref'); const area=form.querySelector('#regionSel, #area'); const selectedArea=area?.value;
    pref?.dispatchEvent(new Event('input',{bubbles:true})); if(area) area.value=selectedArea||'';
    form.dispatchEvent(new Event('input',{bubbles:true}));
    const sort=document.querySelector('#sort'); if(sort && state.sort!=null){sort.value=state.sort;sort.dispatchEvent(new Event('change',{bubbles:true}));}
    const panel=form.querySelector('details') || document.querySelector('#filterPanel'); if(panel && state.open!=null)panel.open=state.open;
    if(state.fav)document.querySelector('#favToggle')?.click();
    window.scrollTo(0,state.scroll||0);
  }
  function loadScript(src) { return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s);}); }
  (async () => {
    let signature=null;
    try { const data=await readCatalog();applyCatalog(data);if(data.photos!==null)signature=JSON.stringify(data); }
    catch (error) { document.documentElement.dataset.catalog = 'local'; console.warn('Supabase catalog unavailable; using local data.',error); }
    for (const src of scripts) await loadScript(src);
    restoreView();
    /* 자동 갱신 중지: 사이트를 다시 열거나 새로고침하면 최신 DB를 읽습니다.
    setInterval(async()=>{
      if(document.hidden || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '') || document.querySelector('#list details[open]') || document.activeElement?.closest('#list, #detail'))return;
      try {const latest=await readCatalog();if(latest.photos===null)return;const next=JSON.stringify(latest);if(signature!==next){applyCatalog(latest);window.refreshOnsenCatalog?.();signature=next;} }
      catch(error){console.warn('Catalog refresh deferred.',error)}
    },60000);
    */
  })().catch(error=>console.error('Application failed to load',error));
})();
