(() => {
  'use strict';
  let storedLang = '';
  try { storedLang = sessionStorage.getItem('onsen-map-language') || ''; } catch {}
  const requestedLang = new URLSearchParams(location.search).get('lang');
  const lang = ['ko', 'ja', 'en'].includes(requestedLang) ? requestedLang : (['ko', 'ja', 'en'].includes(storedLang) ? storedLang : 'ko');
  document.documentElement.lang = lang;
  const tr = {
    ko: { title: '어느 지방으로 떠날까요?', hint: '지도를 움직여 지방을 선택하세요', step: '일본 온천 여행', region: '현을 선택하세요', back: '전국 지도', close: '사이트로 돌아가기', enter: '선택', failure: '지도를 불러오지 못했습니다. 사이트로 돌아가 주세요.' },
    ja: { title: 'どの地方へ行きますか？', hint: '地図を動かして地方を選んでください', step: '日本の温泉めぐり', region: '都道府県を選んでください', back: '全国地図', close: 'サイトに戻る', enter: '選択', failure: '地図を読み込めませんでした。サイトに戻ってください。' },
    en: { title: 'Where will you go?', hint: 'Move the map and choose a region', step: 'Explore Japan’s onsen', region: 'Choose a prefecture', back: 'All Japan', close: 'Return to the site', enter: 'Select', failure: 'The map could not load. Please return to the site.' }
  }[lang];
  const destinations = { ko: 'index.html', ja: 'ja.html', en: 'en.html' };
  const close = document.getElementById('map-close'), back = document.getElementById('map-back');
  const banner = document.getElementById('onsen-banner');
  const bannerClose = banner.querySelector('.banner-close');
  const bannerLink = document.getElementById('banner-link');
  const bannerPanel = banner.querySelector('.banner-panel');
  const bannerPhoto = document.createElement('img');
  bannerPhoto.className = 'banner-photo'; bannerPhoto.alt = ''; bannerPhoto.decoding = 'async';
  bannerPanel.prepend(bannerPhoto);
  const bannerPhotoNote = document.getElementById('banner-photo-note');
  const heading = document.getElementById('map-heading'), hint = document.getElementById('map-hint'), step = document.getElementById('map-step'), status = document.getElementById('map-status');
  const picker = document.getElementById('map-picker-select'), pickerLabel = document.getElementById('map-picker-label');
  close.href = destinations[lang]; close.setAttribute('aria-label', tr.close); back.setAttribute('aria-label', tr.back); back.title = tr.back;
  document.title = tr.title;
  if (typeof L === 'undefined' || typeof JAPAN_PREFECTURES === 'undefined' || typeof DATA_I18N === 'undefined') { heading.textContent = tr.failure; document.documentElement.classList.add('desk-entry-ready'); return; }
  const groups = [
    { names: ['홋카이도','北海道','Hokkaido'], ids:[1], at:[43.3,142.2] },
    { names: ['도호쿠','東北','Tohoku'], ids:[2,3,4,5,6,7], at:[39.7,140.8] },
    { names: ['간토','関東','Kanto'], ids:[8,9,10,11,12,13,14], at:[36.1,139.6] },
    { names: ['주부','中部','Chubu'], ids:[15,16,17,18,19,20,21,22,23], at:[36.4,137.1] },
    { names: ['긴키','近畿','Kinki'], ids:[24,25,26,27,28,29,30], at:[34.0,136.1] },
    { names: ['주고쿠','中国','Chugoku'], ids:[31,32,33,34,35], at:[35.0,132.4] },
    { names: ['시코쿠','四国','Shikoku'], ids:[36,37,38,39], at:[33.6,133.8] },
    { names: ['규슈 · 오키나와','九州・沖縄','Kyushu · Okinawa'], ids:[40,41,42,43,44,45,46,47], at:[31.3,130.2] }
  ];
  const idx = {ko:0,ja:1,en:2}[lang], names = Object.keys(DATA_I18N.prefs), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const map = L.map('explore-map', { zoomControl:false, attributionControl:false, scrollWheelZoom:true, zoomSnap:.1, minZoom:3, maxZoom:9, worldCopyJump:false, fadeAnimation:false, zoomAnimation:false });
  const mapHost=document.getElementById('explore-map');
  L.control.zoom({position:matchMedia('(max-width: 700px)').matches?'topright':'bottomright'}).addTo(map);
  // 현 경계의 로컬 지리 데이터로 화면을 그려 외부 타일 로딩 없이 탐색한다.
  const features = L.featureGroup().addTo(map), labels = L.layerGroup().addTo(map);
  // Decorative engraving, not elevation data. Pattern scales with the geographic SVG.
  function installEngraving() {
    const svg = document.querySelector('#explore-map .leaflet-overlay-pane svg');
    if (!svg || svg.querySelector('#land-engraving')) return;
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    defs.innerHTML = `<pattern id="land-engraving" width="180" height="150" patternUnits="userSpaceOnUse"><rect width="180" height="150" fill="#4a4034"/><g fill="none" stroke="#d8c6a3" stroke-width=".55" opacity=".30"><path d="M-30 32C15-25 65 62 108 17S187 10 210 45M-30 43C15-14 65 73 108 28S187 21 210 56M-30 54C15-3 65 84 108 39S187 32 210 67M-30 65C15 8 65 95 108 50S187 43 210 78M-30 100C20 155 58 77 106 111S175 165 210 103M-30 111C20 166 58 88 106 122S175 176 210 114M-30 122C20 177 58 99 106 133S175 187 210 125"/></g></pattern>`;
    svg.prepend(defs);
  }
  let foldOnEntry = false;
  try {
    if (sessionStorage.getItem('onsen-desk-entry') === '1') {
      sessionStorage.removeItem('onsen-desk-entry');
      foldOnEntry = !reduced.matches;
      document.body.classList.add('desk-arrival');
      setTimeout(() => document.body.classList.remove('desk-arrival'), 2800);
    }
  } catch {}
  const regionWord = document.createElement('div');
  regionWord.className = 'region-word'; regionWord.setAttribute('aria-hidden','true');
  const journey = document.createElement('div'); journey.className = 'journey-caption'; journey.setAttribute('aria-hidden','true');
  document.body.append(regionWord, journey);
  const steam=document.createElement('div');steam.className='map-steam';steam.setAttribute('aria-hidden','true');document.body.append(steam);
  const regionRail=document.createElement('nav');regionRail.className='region-rail';regionRail.setAttribute('aria-label',{ko:'지역과 현 목록',ja:'地方と都道府県の一覧',en:'Regions and prefectures'}[lang]);document.body.append(regionRail);
  document.addEventListener('visibilitychange',()=>document.body.classList.toggle('page-hidden',document.hidden));
  let active = null, layers = [];
  const fullBounds = L.latLngBounds([[29.9,129],[41.7,142.8]]);
  const options = {paddingTopLeft:[14,14], paddingBottomRight:[14,14], maxZoom:9, animate:!reduced.matches, duration:1.15};
  function fitHome(animate=false){
    const fitOptions={...options,paddingTopLeft:innerWidth<=700?[18,10]:[6,6],paddingBottomRight:[6,6],maxZoom:6.5,animate,duration:.62};
    if(innerWidth>700&&document.body.classList.contains('atlas-lifted')){
      const zoom=Math.min(6.5,map.getBoundsZoom(fullBounds,false,L.point(12,12))+.12);
      const center=map.unproject(map.project(fullBounds.getCenter(),zoom).subtract(L.point(155,0)),zoom);
      if(animate)map.flyTo(center,zoom,{animate:true,duration:.62});else map.setView(center,zoom,{animate:false});
      return;
    }
    if(animate)map.flyToBounds(fullBounds,fitOptions);
    else map.fitBounds(fullBounds,fitOptions);
    if(innerWidth<=700)return;
    if(document.body.classList.contains('atlas-lifted'))return;
    if(animate)map.once('moveend',()=>map.setZoom(Math.min(6.5,map.getZoom()+.1),{animate:true}));
    else map.setZoom(Math.min(6.5,map.getZoom()+.1),{animate:false});
  }
  let liftTimer=0;
  function liftAtlas(animate=true){
    if(document.body.classList.contains('atlas-lifted'))return;
    const host=document.getElementById('explore-map'), controls=document.querySelector('.map-picker');
    if(animate){document.body.classList.add('atlas-lifting');host.inert=true;controls.inert=true;regionRail.inert=true;}
    document.body.classList.add('atlas-lifted');
    const unlock=()=>{document.body.classList.remove('atlas-lifting');host.inert=false;controls.inert=false;regionRail.inert=false;};
    const settle=()=>{
      clearTimeout(liftTimer);map.invalidateSize({animate:false});
      if(animate&&!active){let done=false;const complete=()=>{if(done)return;done=true;map.off('moveend',complete);clearTimeout(liftTimer);unlock();};map.once('moveend',complete);fitHome(true);liftTimer=setTimeout(complete,850);}
      else {if(!active)fitHome(false);unlock();}
    };
    if(animate)liftTimer=setTimeout(settle,1100);else requestAnimationFrame(settle);
  }
  const regionFor = id => groups.find(group => group.ids.includes(id));
  const prefName = jp => lang === 'ja' ? jp : (DATA_I18N.prefs[jp]?.[lang === 'ko' ? 1 : 2] || jp);
  let leaving = false, selectionTimer = 0, selectedPref = '';
  const countNumber = document.getElementById('banner-count-number');
  const countLabel = document.getElementById('banner-count-label');
  countNumber.parentElement.setAttribute('aria-live','polite');
  const countWord = {ko:'곳의 등록 온천',ja:'件の掲載温泉',en:'listed onsens'}[lang];
  function setBannerPhoto(pref, fallbackNote) {
    const entry = window.PREF_BANNER_PHOTOS?.[pref];
    const local = entry?.imagePath && /^images\/[\w.\-/]+$/.test(entry.imagePath) ? entry.imagePath : '';
    let remote = '';
    try { const u = new URL(entry?.imageUrl || ''); if (u.protocol === 'https:' && ['commons.wikimedia.org','upload.wikimedia.org'].includes(u.hostname)) remote = u.href; } catch {}
    const source = (() => { try { const u = new URL(entry?.source || ''); return u.protocol === 'https:' && u.hostname === 'commons.wikimedia.org' ? u.href : ''; } catch { return ''; } })();
    const licenseUrl = (() => { try { const u = new URL(entry?.licenseUrl || ''); return u.protocol === 'https:' && (u.hostname === 'creativecommons.org' || u.hostname === 'commons.wikimedia.org') ? u.href : ''; } catch { return ''; } })();
    const photo = entry?.hero === true && source && (local || remote) ? entry : null;
    const showAtmosphere = () => { bannerPanel.classList.remove('has-banner-photo','has-banner-postcard'); bannerPhoto.removeAttribute('src'); bannerPhoto.alt = ''; bannerPhotoNote.textContent = fallbackNote; };
    if (!photo) { showAtmosphere(); return; }
    const name = lang === 'ja' ? photo.nameJa : lang === 'en' ? (photo.nameEn || photo.nameJa) : (photo.nameKo || photo.nameJa);
    bannerPhoto.alt = `${name || pref} · ${lang === 'en' ? 'facility photograph' : lang === 'ja' ? '施設写真' : '시설 사진'}`;
    bannerPanel.classList.add('has-banner-photo');
    bannerPhotoNote.replaceChildren(document.createTextNode(`${name || pref} · ${photo.author} · `));
    if (licenseUrl) { const license = document.createElement('a'); license.href = licenseUrl; license.target = '_blank'; license.rel = 'noopener'; license.textContent = photo.license; bannerPhotoNote.append(license); }
    else bannerPhotoNote.append(document.createTextNode(photo.license));
    if (photo.resized) bannerPhotoNote.append(document.createTextNode(` · ${{ko:'축소·크기 조정',ja:'縮小・サイズ調整',en:'Resized'}[lang]}`));
    bannerPhotoNote.append(document.createTextNode(' · '));
    const link = document.createElement('a'); link.href = source; link.target = '_blank'; link.rel = 'noopener'; link.textContent = {ko:'사진 출처',ja:'写真の出典',en:'Photo source'}[lang]; bannerPhotoNote.append(link);
    bannerPhoto.onerror = () => { bannerPhoto.onerror = null; showAtmosphere(); };
    bannerPhoto.src = local || remote;
  }
  function showCount(n, failed=false){
    countNumber.textContent=Number.isFinite(n)?n.toLocaleString(lang==='ko'?'ko-KR':lang==='ja'?'ja-JP':'en-US'):'—';
    countLabel.textContent=Number.isFinite(n)?countWord:failed?{ko:'등록 수를 확인할 수 없습니다',ja:'掲載件数を確認できません',en:'Count unavailable'}[lang]:{ko:'등록 수 확인 중',ja:'掲載件数を確認中',en:'Checking listed onsens'}[lang];
  }
  async function refreshCount(pref){
    showCount(null);
    try{
      const key='sb_publishable_7rJJBUzpz-WimUPB6eSOZg_cz4K_fGW';
      const url=`https://frncsllpkxrsgxyqsfwd.supabase.co/rest/v1/onsen_facilities?select=id&prefecture=eq.${encodeURIComponent(pref)}&unlisted=eq.false&limit=1`;
      const res=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'count=exact'},signal:AbortSignal.timeout(4500)});
      if(!res.ok)throw Error('Catalog unavailable');
      const count=Number(res.headers.get('content-range')?.split('/').pop());
      if(!Number.isFinite(count))throw Error('Count unavailable');
      if(leaving&&selectedPref===pref)showCount(count);
    }catch{if(leaving&&selectedPref===pref)showCount(null,true);}
  }
  function leave(pref) {
    if (leaving) return;
    leaving = true; selectedPref = pref;
    const label = prefName(pref);
    const copy = {
      ko:['다음 목적지','','이 현에 등록된 숙소와 당일 온천을 살펴보세요.','온천 목록 보기','여행 분위기를 담은 연출 이미지'],
      ja:['次の行き先','','この県に掲載された宿と日帰り温泉を見る。','温泉一覧を見る','旅の雰囲気を表すイメージ'],
      en:['Your next stop','','Explore listed ryokan and day-use baths in this prefecture.','Explore onsens','Atmospheric image, not a specific facility']
    }[lang];
    document.getElementById('banner-kicker').textContent=copy[0];
    document.getElementById('banner-title').textContent=label;
    document.getElementById('banner-description').textContent=copy[2];
    setBannerPhoto(pref,copy[4]);
    refreshCount(pref);
    bannerLink.textContent=copy[3];
    bannerLink.onclick=event=>{event.preventDefault();navigate(pref);};
    document.body.classList.add('map-choosing');
    steam.classList.remove('is-on');void steam.offsetWidth;steam.classList.add('is-on');
    status.textContent=label + (lang==='ko'?' 선택됨':'');
    const selected=layers.find(item=>names[Number(item.feature.properties.id)-1]===pref);
    if(selected){selected.layer.eachLayer(shape=>shape.setStyle({fillColor:'#b5663e',color:'#f7e2bd',weight:2.3,fillOpacity:1}));}
    if(!reduced.matches&&selected){
      const bounds=mainlandBounds([selected]);
      if(bounds.isValid())map.flyToBounds(bounds,{...options,animate:true,duration:.78,maxZoom:8});
    }
    const reveal=()=>{
      if(!leaving)return;
      banner.hidden=false;
      document.getElementById('explore-map').inert=true;
      document.querySelector('.map-top').inert=true;
      document.querySelector('.map-picker').inert=true;
      regionRail.inert=true;
      requestAnimationFrame(()=>banner.classList.add('is-visible'));
      bannerClose.focus({preventScroll:true});
    };
    if(reduced.matches)reveal();else selectionTimer=setTimeout(reveal,850);
  }
  function dismissBanner(){clearTimeout(selectionTimer);banner.classList.remove('is-visible');banner.hidden=true;leaving=false;document.body.classList.remove('map-choosing');steam.classList.remove('is-on');document.getElementById('explore-map').inert=false;document.querySelector('.map-top').inert=false;document.querySelector('.map-picker').inert=false;regionRail.inert=false;draw();if(active)map.fitBounds(mainlandBounds(),{...options,animate:!reduced.matches,duration:.65});back.focus({preventScroll:true});}
  bannerClose.addEventListener('click',dismissBanner);
  banner.addEventListener('click',event=>{if(event.target===banner)dismissBanner();});
  banner.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dismissBanner();}else if(event.key==='Tab'){const first=bannerClose,last=bannerPhotoNote.querySelector('a')||bannerLink;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  function navigate(pref) {
    const url = new URL(destinations[lang], location.href);
    url.searchParams.set('pref',pref); url.searchParams.set('kind','all');
    try { sessionStorage.setItem('onsen-map-return','1'); sessionStorage.setItem('onsen-carry', JSON.stringify({qs:url.searchParams.toString(),hash:'',t:Date.now()})); } catch {}
    location.href = url.href;
  }
  function marker(latlng, label, onClick, type) {
    const el = document.createElement('button'); el.type='button'; el.className='map-place '+type; el.textContent=label; el.setAttribute('aria-label', label + ' · ' + tr.enter);
    L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el);
    el.addEventListener('click', onClick);
    const icon=L.divIcon({className:'map-label-wrap', html:el, iconSize:[1,1], iconAnchor:[0,0]});
    return L.marker(latlng,{icon,keyboard:false,interactive:true}).addTo(labels);
  }
  function prefCenter(feature) {
    const polys=feature.geometry.type==='Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    let best=null, area=-1;
    polys.forEach(poly=>{ const ring=poly[0], box=L.latLngBounds(ring.map(p=>[p[1],p[0]])); const size=(box.getNorth()-box.getSouth())*(box.getEast()-box.getWest()); if(size>area){area=size;best=box.getCenter();} });
    return best;
  }
  function baseStyle(selected) { return {color:'#d8c6a3', weight:selected?1.15:.8, opacity:.8, fillColor:'url(#land-engraving)', fillOpacity:1}; }
  function mainlandBounds(items = layers) {
    const bounds = L.latLngBounds([]);
    for (const {feature} of items) {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      let largest = null, largestArea = -1;
      for (const polygon of polygons) {
        const box = L.latLngBounds(polygon[0].map(([lon, lat]) => [lat, lon]));
        const area = (box.getNorth()-box.getSouth())*(box.getEast()-box.getWest());
        if (area > largestArea) { largest = box; largestArea = area; }
      }
      if (largest) bounds.extend(largest);
    }
    return bounds;
  }
  function draw() {
    features.clearLayers(); labels.clearLayers(); layers=[];
    const visible = JAPAN_PREFECTURES.features.filter(f => active ? active.ids.includes(Number(f.properties.id)) : Number(f.properties.id) !== 1);
    visible.forEach(feature => {
      const id=Number(feature.properties.id), jp=names[id-1], group=regionFor(id); if(!jp || !group)return;
      const layer=L.geoJSON(feature,{className:'land-tile',style:()=>baseStyle(!!active),onEachFeature(_f, shape){
        shape.on('mouseover',()=>{shape.setStyle({fillColor:'#8b6249',fillOpacity:1,weight:2.3});status.textContent=active?prefName(jp):group.names[idx];});
        shape.on('mouseout',()=>{ if (!leaving) shape.setStyle(baseStyle(!!active)); });
        shape.on('click',()=>active ? leave(jp) : selectRegion(group));
      }}).addTo(features);
      layers.push({feature,layer});
      if(active) marker(prefCenter(feature),prefName(jp),()=>leave(jp),'pref-label');
    });
    installEngraving();
    if(!active) groups.slice(1).forEach(group => marker(group.at,group.names[idx],()=>selectRegion(group),'region-label'));
    heading.textContent=active?active.names[idx]:tr.title; hint.textContent=active?tr.region:tr.hint; step.textContent=tr.step;
    regionWord.textContent=active?active.names[1]:'日本';
    journey.textContent=active?active.names[2]:'HOKKAIDO — KYUSHU';
    document.body.classList.toggle('region-selected',!!active);
    back.hidden=!active; status.textContent=active?`${active.names[idx]} · ${tr.region}`:tr.title;
    pickerLabel.textContent={ko:'목록에서 고르기',ja:'一覧から選ぶ',en:'Choose from a list'}[lang];
    picker.replaceChildren(new Option(active?tr.region:tr.title,''));
    if(active){for(const feature of visible){const jp=names[Number(feature.properties.id)-1];if(jp)picker.add(new Option(prefName(jp),jp));}}
    else {for(const group of groups)picker.add(new Option(group.names[idx],group.names[1]));}
    const railHeading=document.createElement('p');railHeading.className='region-rail-heading';railHeading.textContent=active?{ko:'현을 고르세요',ja:'県を選ぶ',en:'CHOOSE A PREFECTURE'}[lang]:{ko:'여덟 지방의 온천',ja:'八地方の温泉',en:'EIGHT REGIONS'}[lang];
    const railList=document.createElement('div');railList.className='region-rail-list';
    if(active){for(const feature of visible){const jp=names[Number(feature.properties.id)-1];if(!jp)continue;const button=document.createElement('button');button.type='button';button.textContent=prefName(jp);button.addEventListener('click',()=>leave(jp));railList.append(button);}}
    else for(const group of groups){const button=document.createElement('button');button.type='button';button.textContent=group.names[idx];button.addEventListener('click',()=>selectRegion(group));railList.append(button);}
    regionRail.replaceChildren(railHeading,railList);
  }
  picker.addEventListener('change',()=>{const value=picker.value;if(!value)return;if(active)leave(value);else{const group=groups.find(item=>item.names[1]===value);if(group)selectRegion(group);}picker.value='';});
  const inset = document.createElement('button');
  inset.type = 'button'; inset.className = 'hokkaido-inset';
  inset.setAttribute('aria-label', groups[0].names[idx] + ' · ' + tr.enter);
  const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
  icon.setAttribute('viewBox','0 0 200 140'); icon.setAttribute('aria-hidden','true');
  const shape = JAPAN_PREFECTURES.features.find(feature => Number(feature.properties.id) === 1);
  const allPolygons = shape.geometry.type === 'Polygon' ? [shape.geometry.coordinates] : shape.geometry.coordinates;
  // 작은 미니맵은 가장 큰 섬의 윤곽을 크게 보여 주며 실제 지도 선택 범위는 유지한다.
  const polygons = [allPolygons.reduce((best, poly) => {
    const area = ring => { const x=ring.map(p=>p[0]), y=ring.map(p=>p[1]); return (Math.max(...x)-Math.min(...x))*(Math.max(...y)-Math.min(...y)); };
    return area(poly[0]) > area(best[0]) ? poly : best;
  })];
  const points = polygons.flatMap(poly => poly[0]);
  const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(184/(maxX-minX), 120/(maxY-minY));
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d', polygons.map(poly => poly[0].map(([x,y],i) => `${i?'L':'M'}${(8+(x-minX)*scale).toFixed(1)} ${(130-(y-minY)*scale).toFixed(1)}`).join(' ')+'Z').join(' '));
  icon.append(path); inset.append(icon, document.createTextNode(groups[0].names[idx]));
  document.body.append(inset);
  inset.addEventListener('click', () => selectRegion(groups[0]));
  let moving = false;
  function selectRegion(group) {
    if (moving || leaving) return;
    const candidates = JAPAN_PREFECTURES.features.filter(f => group.ids.includes(Number(f.properties.id))).map(feature => ({feature}));
    const bounds = mainlandBounds(candidates);
    if (!bounds.isValid()) return;
    moving = true;
    document.body.classList.add('map-moving');
    if (!reduced.matches) for (const {feature,layer} of layers) {
      if (group.ids.includes(Number(feature.properties.id))) continue;
      layer.eachLayer(shape => shape.getElement()?.classList.add('tile-dim'));
    }
    let fallbackTimer;
    const finish = () => {
      if (!moving) return;
      moving = false;
      clearTimeout(fallbackTimer);
      map.off('moveend', finish);
      active = group; inset.hidden = true; draw();
      document.body.classList.remove('map-moving');
      document.body.classList.remove('map-arrived');
      void document.body.offsetWidth;
      document.body.classList.add('map-arrived');
      back.focus({preventScroll:true});
    };
    if (reduced.matches) { map.fitBounds(bounds,{...options,animate:false}); finish(); }
    else {
      map.once('moveend', finish);
      map.flyToBounds(bounds,{...options,animate:true,duration:1.15});
      fallbackTimer = setTimeout(finish, 1500);
    }
  }
  back.addEventListener('click',()=>{
    if (moving || leaving) return;
    active=null; inset.hidden=false; document.body.classList.remove('map-arrived'); draw();
    fitHome(!reduced.matches);
  });
  // 브라우저 뒤로 가기로 복원되면 이전 선택 잠금과 잔상을 해제한다.
  addEventListener('pageshow', event => {
    if (!event.persisted || !leaving) return;
    leaving = false;
    document.querySelectorAll('.pref-footprint').forEach(node => node.remove());
    draw();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && leaving){event.preventDefault();dismissBanner();}else if(event.key==='Escape' && active){event.preventDefault();back.click();}});
  draw(); fitHome(false);
  function foldArt() {
    const {x:w,y:h}=map.getSize();
    const ring=points=>points.map(([lon,lat],i)=>{const p=map.latLngToContainerPoint([lat,lon]);return `${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;}).join('')+'Z';
    const paths=JAPAN_PREFECTURES.features.filter(f=>Number(f.properties.id)!==1).map(f=>{
      const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
      return polys.map(poly=>`<path d="${poly.map(ring).join('')}"/>`).join('');
    }).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g fill="#4a4034" stroke="#d8c6a3" stroke-width=".8" stroke-linejoin="round" fill-rule="evenodd">${paths}</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  if (foldOnEntry) {
    const paper = document.createElement('div');
    paper.className = 'atlas-fold'; paper.setAttribute('aria-hidden','true');paper.style.setProperty('--atlas-art',foldArt());
    let parent = paper;
    for (let i=0;i<4;i++) {
      const leaf=document.createElement('span'); leaf.className='atlas-leaf';
      leaf.style.setProperty('--leaf',i);
      leaf.style.setProperty('--closed',i%2 ? '-174deg' : '174deg');
      leaf.style.setProperty('--delay',`${.14+(i-1)*.45}s`);
      parent.append(leaf); parent=leaf;
    }
    const host=document.getElementById('explore-map');
    host.append(paper);
    document.body.classList.add('map-unfolding');
    host.inert=true;
    document.documentElement.classList.add('desk-entry-ready');
    let done=false, fallback;
    const finish=()=>{if(done)return;done=true;clearTimeout(fallback);document.removeEventListener('keydown',skipFold,true);document.removeEventListener('pointerdown',finish,true);paper.remove();document.body.classList.remove('map-unfolding');liftAtlas(true);};
    const skipFold=event=>{if(['Escape','Enter',' '].includes(event.key)){event.preventDefault();finish();}};
    paper.addEventListener('animationend',event=>{if(event.target===paper&&event.animationName==='fold-clear')finish();});
    document.addEventListener('pointerdown',finish,{once:true,capture:true});
    document.addEventListener('keydown',skipFold,true);
    fallback=setTimeout(finish,2800);
  } else liftAtlas(false);
  let lightFrame=0,lightPoint=null;
  mapHost.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||reduced.matches||document.body.classList.contains('map-choosing')||document.body.classList.contains('map-unfolding'))return;
    lightPoint=[event.clientX,event.clientY];
    if(lightFrame)return;
    lightFrame=requestAnimationFrame(()=>{lightFrame=0;if(!lightPoint)return;const box=mapHost.getBoundingClientRect();mapHost.style.setProperty('--light-x',`${lightPoint[0]-box.left}px`);mapHost.style.setProperty('--light-y',`${lightPoint[1]-box.top}px`);document.body.classList.add('map-light-on');});
  });
  mapHost.addEventListener('pointerleave',()=>document.body.classList.remove('map-light-on'));
  document.addEventListener('pointerdown',event=>{
    if(reduced.matches||document.body.classList.contains('map-unfolding')||document.body.classList.contains('map-choosing'))return;
    if(!event.target.closest?.('path.land-tile,.map-place,.hokkaido-inset'))return;
    const box=mapHost.getBoundingClientRect();const ripple=document.createElement('span');ripple.className='map-ripple';ripple.style.left=`${event.clientX-box.left}px`;ripple.style.top=`${event.clientY-box.top}px`;ripple.setAttribute('aria-hidden','true');mapHost.append(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});setTimeout(()=>ripple.remove(),900);
  },true);
  map.whenReady(installEngraving);
  // WebKit may initialize Leaflet before the fixed paper has its final CSS size.
  addEventListener('load',()=>{
    map.invalidateSize({animate:false});
    if(!active)fitHome(false);
    const paper=mapHost.querySelector('.atlas-fold');
    if(paper)paper.style.setProperty('--atlas-art',foldArt());
  },{once:true});
  map.on('resize', () => { if(document.body.classList.contains('atlas-lifting'))return;const bounds = active ? mainlandBounds() : fullBounds; if (bounds.isValid()) active?map.fitBounds(bounds,{...options,animate:false,maxZoom:9}):fitHome(false); });
})();
