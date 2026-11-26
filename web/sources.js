(() => {
  const lang=['ko','ja','en'].includes(new URLSearchParams(location.search).get('lang')) ? new URLSearchParams(location.search).get('lang') : 'ko';
  const texts={
    ko:{title:'자료 출처와 이용 조건',back:'← 온천 찾기로',home:'온천 한눈에',lead:'시설 정보와 화면에 사용된 사진의 출처를 확인할 수 있습니다.',policyTitle:'정보와 사진에 관하여',policy:'시설별 정보는 시설 운영자, 일본온천협회 및 지자체 등의 공개 자료를 바탕으로 정리했습니다. 운영 시간과 요금은 달라질 수 있으므로 방문 전 공식 안내를 확인해 주세요.',general:'사진의 저작권과 이용 조건은 원본마다 다릅니다. 아래 원본과 이용 조건을 확인해 주세요. 온천지 풍경 사진은 개별 시설의 모습이 아닐 수 있습니다.',hero:'첫 화면 사진',facilities:'시설별 출처',search:'시설명 또는 지역으로 찾기',loading:'출처를 불러오는 중입니다.',fail:'DB에 연결할 수 없어 로컬 자료의 출처를 표시합니다. 최신 자료는 다시 접속해 확인해 주세요.',source:'시설 정보 원문',official:'시설 공식 사이트',checked:'확인일',photo:'사진',author:'촬영자',license:'이용 조건',original:'사진 원본',terms:'이용 조건 원문',modified:'크기 조정',area:'온천지 풍경',facility:'시설 사진',total:n=>`${n}곳`,none:'검색 결과가 없습니다.',foot:'예약과 결제는 각 시설 또는 예약처에서 진행합니다.',heroNames:['군마 온천 숙소 풍경','노보리베쓰 온천 풍경','도카치다케 온천 풍경']},
    ja:{title:'情報・写真の出典と利用条件',back:'← 温泉を探す',home:'温泉ひとめぐり',lead:'施設情報と、このサイトで使用している写真の出典をご案内します。',policyTitle:'情報と写真について',policy:'施設情報は、施設の公式サイト、日本温泉協会、自治体などの公開情報をもとに掲載しています。営業時間や料金は変更されることがありますので、お出かけ前に公式情報をご確認ください。',general:'写真の著作権と利用条件は原本ごとに異なります。以下の原本と利用条件をご確認ください。温泉地の風景写真は、個別の施設を撮影したものとは限りません。',hero:'トップページの写真',facilities:'施設ごとの出典',search:'施設名・地域で探す',loading:'出典を読み込んでいます。',fail:'データベースに接続できないため、ローカル資料の出典を表示しています。最新情報は再接続してご確認ください。',source:'施設情報の出典',official:'施設公式サイト',checked:'確認日',photo:'写真',author:'撮影者',license:'利用条件',original:'写真の原本',terms:'利用条件の原文',modified:'サイズ変更',area:'温泉地の風景',facility:'施設の写真',total:n=>`${n}施設`,none:'該当する施設はありません。',foot:'予約・決済は施設または予約サイトで行います。',heroNames:['群馬の温泉宿の風景','登別温泉の風景','十勝岳温泉の風景']},
    en:{title:'Information sources and photo credits',back:'← Find an onsen',home:'Onsen at a Glance',lead:'Sources for property information and photographs used on this site.',policyTitle:'About our information and photos',policy:'Property details are compiled from public information provided by operators, the Japan Spa Association, local governments and others. Hours and prices can change; please check official information before visiting.',general:'Copyright and usage terms vary by image. Please consult the original and its terms below. An area photograph may not show the individual property.',hero:'Homepage photographs',facilities:'Sources by property',search:'Search by property or area',loading:'Loading sources…',fail:'The database is unavailable. Sources for the local fallback catalog are shown; reconnect for current records.',source:'Information source',official:'Official property website',checked:'Checked',photo:'Photo',author:'Photographer',license:'License or terms',original:'Original image',terms:'Usage terms',modified:'Resized',area:'Hot spring area',facility:'Property photograph',total:n=>`${n} ${n===1?'property':'properties'}`,none:'No matching properties.',foot:'Reservations and payments are handled by the property or booking provider.',heroNames:['Gunma hot spring inn','Noboribetsu hot spring area','Tokachidake hot spring area']}
  };
  const t=texts[lang],$=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Convention: helpers named safe*() return already-escaped HTML (every value passes esc()/url()).
  const url=v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};
  const safeLink=(v,label)=>url(v)?`<a href="${esc(url(v))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';
  document.documentElement.lang=lang;document.querySelector('header nav')?.before(window.onsenTheme.button({ko:'다크 모드',ja:'ダークモード',en:'Dark mode'}[lang]));document.title=t.title;$('title').textContent=t.title;$('lead').textContent=t.lead;$('policyTitle').textContent=t.policyTitle;$('policy').textContent=t.policy;$('general').textContent=t.general;$('heroTitle').textContent=t.hero;$('facilitiesTitle').textContent=t.facilities;$('searchLabel').textContent=t.search;$('search').placeholder=t.search;$('status').textContent=t.loading;$('home').textContent=t.home;$('back').textContent=t.back;$('footer').textContent=t.foot;$('home').href=$('back').href={ko:'index.html',ja:'ja.html',en:'en.html'}[lang];
  const mapCredit={
    ko:['일본 지도와 지형 데이터','현 경계는 지구지도 일본의 자료를 dataofjapan/land가 변환한 파일을 사용합니다. 지도 동작에는 Leaflet을 사용합니다. 원본 이용 조건은 아래 링크에서 확인할 수 있습니다.'],
    ja:['日本地図と地形データ','都道府県の境界は、地球地図日本の資料を dataofjapan/land が変換したファイルです。地図の操作には Leaflet を使用しています。原本の利用条件は以下をご確認ください。'],
    en:['Japan map and geographic data','Prefecture boundaries come from Global Map Japan data converted by dataofjapan/land. Map interaction uses Leaflet. Review the original usage terms through the links below.']
  }[lang];
  $('mapCreditTitle').textContent=mapCredit[0];$('mapCreditText').textContent=mapCredit[1];
  function safeShotInfo(shot,caption){
    const [key,author,license,meta={}]=shot, original=meta.source||`https://commons.wikimedia.org/wiki/File:${key.split('/').pop()}`;
    const m=String(license||'').match(/^CC BY(-SA)? ([\d.]+)( JP)?$/), terms=meta.terms||(m?`https://creativecommons.org/licenses/by${m[1]?'-sa':''}/${m[2]}/${m[3]?'jp/':''}`:'');
    const licenceText=license==='퍼블릭 도메인'?({ko:'퍼블릭 도메인',ja:'パブリックドメイン',en:'Public domain'}[lang]):license;
    const displayCaption=lang!=='ko'&&/[가-힣]/.test(caption||'')?'':caption;
    const description=[displayCaption,meta.kind==='area'?t.area:meta.kind==='facility'?t.facility:'',author?`${t.author}: ${author}`:'',licenceText?`${t.license}: ${licenceText}`:'',meta.credit||'',meta.kagoshimaPromotion?({ko:'가고시마 관광 홍보 목적',ja:'鹿児島観光PR目的',en:'Kagoshima tourism promotion only'}[lang]):'',(!meta.source||meta.resized)?t.modified:''].filter(Boolean).join(' · ');
    return `<li>${esc(description)} <span class="source-links">${safeLink(original,t.original)}${terms?' · '+safeLink(terms,t.terms):''}</span></li>`;
  }
  $('heroSources').innerHTML=['takaragawa','noboribetsu','tokachi'].map((key,i)=>{const shot=PHOTOS[key]?.shots?.[0];return shot?`<div class="entry"><h3>${esc(t.heroNames[i])}</h3><ul>${safeShotInfo(shot,'')}</ul></div>`:''}).join('');
  $('bannerSourcesTitle').textContent={ko:'지도 배너의 시설 사진',ja:'地図バナーの施設写真',en:'Map banner property photographs'}[lang];
  for(const [pref,photo] of Object.entries(window.PREF_BANNER_PHOTOS||{})){
    const name=lang==='ja'?photo.nameJa:(lang==='en'?photo.nameEn||photo.nameJa:photo.nameKo)||photo.nameJa;
    const role={ko:'시설 사진',ja:'施設の写真',en:'Property photograph'}[lang];
    const entry=document.createElement('div');entry.className='entry';
    const h=document.createElement('h3');h.textContent=`${name} · ${pref}`;entry.append(h);
    const meta=document.createElement('p');meta.className='meta';meta.textContent=`${role} · ${t.author}: ${photo.author} · ${t.license}: ${photo.license} · ${t.modified}`;entry.append(meta);
    const links=document.createElement('p');links.className='source-links';
    for(const [href,label] of [[photo.source,t.original],[photo.licenseUrl,t.terms]]){
      const safe=url(href);if(!safe)continue;
      if(links.childNodes.length)links.append(document.createTextNode(' · '));
      const a=document.createElement('a');a.href=safe;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;links.append(a);
    }
    entry.append(links);$('bannerSources').append(entry);
  }
  const root='https://frncsllpkxrsgxyqsfwd.supabase.co', key='sb_publishable_7rJJBUzpz-WimUPB6eSOZg_cz4K_fGW';
  async function getAll(table,order){let rows=[];for(let offset=0;;offset+=1000){const res=await fetch(`${root}/rest/v1/${table}?select=*&order=${order}&offset=${offset}&limit=1000`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('Catalog unavailable');const batch=await res.json();rows.push(...batch);if(batch.length<1000)return rows;}}
  function safeRelated(r) {
    const found=new Set(), seen=new Set([url(r.source_url),url(r.official_url)]);
    const visit=value=>{if(typeof value==='string'){const u=url(value);if(u&&!seen.has(u)){found.add(u);seen.add(u);}}else if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')Object.values(value).forEach(visit);};
    visit(EXTRA[String(r.id)]);visit(r.record?.extra);visit(r.record?.dayPSource);
    return [...found].map(u=>safeLink(u,new URL(u).hostname.replace(/^www\./,''))).join(' · ');
  }
  function show(rows,photos,fallback){
    const grouped=new Map();
    for(const p of photos){
      if(['official/orihashi-kagoshima-2428.jpg','official/koshikano-kagoshima-2394.jpg'].includes(p.image_key))continue;
      const id=String(p.facility_id);
      if(!grouped.has(id))grouped.set(id,[]);
      grouped.get(id).push(p);
    }
    const labels={
      ko:{region:'지역 선택',all:'모든 지역',previous:'이전',next:'다음',page:(n,total)=>`${n} / ${total} 페이지`},
      ja:{region:'地域を選択',all:'すべての地域',previous:'前へ',next:'次へ',page:(n,total)=>`${n} / ${total} ページ`},
      en:{region:'Choose a region',all:'All regions',previous:'Previous',next:'Next',page:(n,total)=>`Page ${n} of ${total}`}
    }[lang];
    $('sourceRegionLabel').textContent=labels.region;
    $('sourceRegion').innerHTML=`<option value="">${labels.all}</option>`+DATA_I18N.regions.map((r,i)=>`<option value="${i}">${esc(r[{ko:0,ja:1,en:2}[lang]])}</option>`).join('');
    let page=1;
    const pageSize=10;
    const facilityHTML=r=>{
      const id=String(r.id),name=(lang==='ko'?r.name_ko:lang==='ja'?r.name_ja:r.name_en||r.name_ja)||r.name_ko||id;
      const list=grouped.get(id)||[];
      const area=(lang==='ja'?r.area_ja:lang==='en'?r.area_en:r.area)||((lang==='ko'||!/[가-힣]/.test(r.area||''))?r.area:'')||'';
      const related=safeRelated(r);
      return `<article class="entry" id="facility-${esc(id)}"><h3>${esc(name)}</h3><p class="meta">${esc(r.prefecture||'')} ${esc(area)}${r.source_checked?' · '+esc(t.checked)+': '+esc(r.source_checked):''}</p><p class="source-links">${safeLink(r.source_url,t.source)}${url(r.official_url)&&r.official_url!==r.source_url?' · '+safeLink(r.official_url,t.official):''}${related?' · '+related:''}</p>${list.length?`<ul>${list.map(p=>safeShotInfo([p.image_key,p.author,p.license,p.metadata||{}],p.caption)).join('')}</ul>`:''}</article>`;
    };
    const render=()=>{
      const q=$('search').value.toLocaleLowerCase().trim(),region=$('sourceRegion').value;
      const matching=rows.filter(r=>(region===''||String(DATA_I18N.prefs[r.prefecture]?.[0])===region)&&[r.name_ko,r.name_ja,r.name_en,r.area,r.prefecture].some(v=>String(v||'').toLocaleLowerCase().includes(q)));
      const pages=Math.max(1,Math.ceil(matching.length/pageSize));
      page=Math.min(Math.max(page,1),pages);
      $('status').textContent=(fallback?t.fail+' ':'')+(matching.length?t.total(matching.length):t.none);
      $('sources').innerHTML=matching.slice((page-1)*pageSize,page*pageSize).map(facilityHTML).join('');
      const button=(label,target,disabled,current=false)=>`<button type="button" data-page="${target}" ${disabled?'disabled':''} ${current?'aria-current="page"':''}>${esc(label)}</button>`;
      const start=Math.max(1,Math.min(page-2,pages-4)),end=Math.min(pages,start+4);
      let pager=button(labels.previous,page-1,page===1);
      for(let n=start;n<=end;n++)pager+=button(n,n,false,n===page);
      pager+=button(labels.next,page+1,page===pages);
      $('sourcePager').innerHTML=`<span>${esc(labels.page(page,pages))}</span><div>${pager}</div>`;
      $('sourcePager').hidden=matching.length<=pageSize;
    };
    $('search').addEventListener('input',()=>{page=1;render()});
    $('sourceRegion').addEventListener('change',()=>{page=1;render()});
    $('sourcePager').addEventListener('click',e=>{
      const button=e.target.closest('button[data-page]');if(!button||button.disabled)return;
      page=Number(button.dataset.page);render();$('facilitiesTitle').scrollIntoView({block:'start'});
    });
    if(location.hash){
      try{const id=decodeURIComponent(location.hash.slice(1)).replace(/^facility-/,'');const index=rows.findIndex(r=>String(r.id)===id);if(index>=0)page=Math.floor(index/pageSize)+1}catch{}
    }
    render();
    if(location.hash)requestAnimationFrame(()=>document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
  }
  (async()=>{try{const [fac,photos]=await Promise.all([getAll('onsen_facilities','id.asc'),getAll('onsen_photos','facility_id.asc,sort_order.asc,image_key.asc')]);show(fac.map(r=>({...r,name_en:r.record?.name_en,area_ja:r.record?.area_ja,area_en:r.record?.area_en})),photos,false)}catch(e){const fac=RAW.map(r=>({id:r.id,name_ko:r.n,name_ja:r.jp,name_en:r.name_en,prefecture:r.pref,area:r.a,official_url:r.hp,source_url:r.srcUrl||(r.src==='official'?r.hp:SPA(r.id)),source_checked:r.checked}));const photos=RAW.flatMap(r=>(PHOTOS[r.im||IM_FIX[r.id]]?.shots||[]).filter(s=>LOCAL_PHOTOS[s[0]]).map(s=>({facility_id:r.id,image_key:s[0],author:s[1],license:s[2],metadata:s[3]||{},caption:PHOTOS[r.im||IM_FIX[r.id]]?.cap})));show(fac,photos,true)}})();
})();
