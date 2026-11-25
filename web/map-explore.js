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
  const heading = document.getElementById('map-heading'), hint = document.getElementById('map-hint'), step = document.getElementById('map-step'), status = document.getElementById('map-status');
  close.href = destinations[lang]; close.setAttribute('aria-label', tr.close); back.setAttribute('aria-label', tr.back); back.title = tr.back;
  document.title = tr.title;
  if (typeof L === 'undefined' || typeof JAPAN_PREFECTURES === 'undefined' || typeof DATA_I18N === 'undefined') { heading.textContent = tr.failure; return; }
  const groups = [
    { names: ['홋카이도','北海道','Hokkaido'], ids:[1], at:[43.3,142.2] },
    { names: ['도호쿠','東北','Tohoku'], ids:[2,3,4,5,6,7], at:[39.7,140.8] },
    { names: ['간토','関東','Kanto'], ids:[8,9,10,11,12,13,14], at:[36.3,142.2] },
    { names: ['주부','中部','Chubu'], ids:[15,16,17,18,19,20,21,22,23], at:[36.4,137.1] },
    { names: ['긴키','近畿','Kinki'], ids:[24,25,26,27,28,29,30], at:[34.0,136.1] },
    { names: ['주고쿠','中国','Chugoku'], ids:[31,32,33,34,35], at:[35.0,132.4] },
    { names: ['시코쿠','四国','Shikoku'], ids:[36,37,38,39], at:[32.0,135.0] },
    { names: ['규슈 · 오키나와','九州・沖縄','Kyushu · Okinawa'], ids:[40,41,42,43,44,45,46,47], at:[30.0,130.2] }
  ];
  const idx = {ko:0,ja:1,en:2}[lang], names = Object.keys(DATA_I18N.prefs), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const map = L.map('explore-map', { zoomControl:false, attributionControl:true, scrollWheelZoom:true, zoomSnap:.25, minZoom:3, maxZoom:9, worldCopyJump:false, fadeAnimation:false, zoomAnimation:false });
  L.control.zoom({position:'bottomright'}).addTo(map);
  map.attributionControl.addAttribution('<a href="https://github.com/dataofjapan/land" target="_blank" rel="noopener">Global Map Japan / dataofjapan</a>');
  // 현 경계의 로컬 지리 데이터로 화면을 그려 외부 타일 로딩 없이 탐색한다.
  const features = L.featureGroup().addTo(map), labels = L.layerGroup().addTo(map);
  let active = null, layers = [];
  const fullBounds = L.latLngBounds([[30.4,129],[41.7,142.8]]);
  const options = {paddingTopLeft:[30,110], paddingBottomRight:[30,110], maxZoom:9, animate:!reduced.matches, duration:1.15};
  const regionFor = id => groups.find(group => group.ids.includes(id));
  const prefName = jp => lang === 'ja' ? jp : (DATA_I18N.prefs[jp]?.[lang === 'ko' ? 1 : 2] || jp);
  let leaving = false;
  function leave(pref) {
    if (leaving) return;
    leaving = true;
    const selected = layers.find(item => names[Number(item.feature.properties.id)-1] === pref);
    if (!reduced.matches && selected) {
      selected.layer.eachLayer(shape => {
        const face = shape.getElement();
        if (!face) return;
        // 선택한 섬의 기존 실루엣을 아래에 남겨 떠오르는 깊이를 만든다.
        shape.bringToFront();
        const footprint = face.cloneNode(false);
        footprint.removeAttribute('id');
        footprint.setAttribute('class', 'pref-footprint');
        footprint.setAttribute('pointer-events', 'none');
        face.parentNode.insertBefore(footprint, face);
        shape.setStyle({fillColor:'#f1d59c', color:'#fff7df', weight:3});
        face.classList.add('pref-raised');
      });
      status.textContent = prefName(pref);
      setTimeout(() => navigate(pref), 800);
    } else navigate(pref);
  }
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
  function baseStyle(selected) { return {color:'#e2ebd1', weight:selected?1.8:1.1, opacity:.95, fillColor:selected?'#8fb294':'#9bb99c', fillOpacity:1}; }
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
      const layer=L.geoJSON(feature,{style:()=>baseStyle(!!active),onEachFeature(_f, shape){
        shape.on('mouseover',()=>{shape.setStyle({fillColor:'#e8c487',fillOpacity:1,weight:2.3});status.textContent=active?prefName(jp):group.names[idx];});
        shape.on('mouseout',()=>{ if (!leaving) shape.setStyle(baseStyle(!!active)); });
        shape.on('click',()=>active ? leave(jp) : selectRegion(group));
      }}).addTo(features);
      layers.push({feature,layer});
      if(active) marker(prefCenter(feature),prefName(jp),()=>leave(jp),'pref-label');
    });
    if(!active) groups.slice(1).forEach(group => marker(group.at,group.names[idx],()=>selectRegion(group),'region-label'));
    heading.textContent=active?active.names[idx]:tr.title; hint.textContent=active?tr.region:tr.hint; step.textContent=tr.step;
    back.hidden=!active; status.textContent=active?`${active.names[idx]} · ${tr.region}`:tr.title;
  }
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
      map.flyToBounds(bounds,{...options,animate:true,duration:.85});
      fallbackTimer = setTimeout(finish, 1500);
    }
  }
  back.addEventListener('click',()=>{
    if (moving || leaving) return;
    active=null; inset.hidden=false; document.body.classList.remove('map-arrived'); draw();
    map.fitBounds(fullBounds,{...options,maxZoom:6.5,animate:!reduced.matches});
  });
  // 브라우저 뒤로 가기로 복원되면 이전 선택 잠금과 잔상을 해제한다.
  addEventListener('pageshow', event => {
    if (!event.persisted || !leaving) return;
    leaving = false;
    document.querySelectorAll('.pref-footprint').forEach(node => node.remove());
    draw();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && active){event.preventDefault();back.click();}});
  draw(); map.fitBounds(fullBounds,{...options,animate:false,maxZoom:6.5});
  map.on('resize', () => { const bounds = active ? mainlandBounds() : fullBounds; if (bounds.isValid()) map.fitBounds(bounds, {...options, animate:false, maxZoom:active?9:6.5}); });
})();
