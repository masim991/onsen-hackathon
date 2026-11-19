(() => {
  const names=['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  const select=document.querySelector('#pref'), status=document.querySelector('#mapStatus');
  try {
    const map=L.map('prefMap',{scrollWheelZoom:false,zoomControl:false}).setView([36.3,137.4],4);
    L.control.zoom({position:'topright'}).addTo(map);
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{minZoom:2,maxZoom:18,attribution:'<a href="https://maps.gsi.go.jp/development/">地理院タイル</a> · 境界：<a href="https://github.com/dataofjapan/land">地球地図日本</a>'}).addTo(map);
    const reset=document.createElement('button');reset.type='button';reset.className='map-reset';reset.textContent='日本全体を見る';status.after(reset);
    const info=name=>{const rows=RAW.filter(r=>r.pref===name);return `${name} · 登録施設 ${rows.length}件 · 旅館 ${rows.filter(r=>r.kind==='ryokan').length}件`;};
    const layer=L.geoJSON(JAPAN_PREFECTURES,{style:{color:'#837b68',weight:1,fillColor:'#b0b8a5',fillOpacity:.19},onEachFeature(f,shape){const name=names[Number(f.properties.id)-1];shape.bindTooltip(info(name),{sticky:true});shape.on('click',()=>{select.value=name;select.dispatchEvent(new Event('input',{bubbles:true}));status.textContent=info(name);map.fitBounds(shape.getBounds(),{maxZoom:7,padding:[12,12],animate:false});});}}).addTo(map);
    function update(){layer.eachLayer(s=>{const selected=names[Number(s.feature.properties.id)-1]===select.value;s.setStyle({fillOpacity:selected?.65:.19,fillColor:selected?'#3e4a3d':'#b0b8a5',weight:selected?2:1});});}
    select.addEventListener('input',()=>{update();status.textContent=select.value?info(select.value):'都道府県を選ぶと登録施設数を表示します。';});reset.addEventListener('click',()=>{select.value='';select.dispatchEvent(new Event('input',{bubbles:true}));map.setView([36.3,137.4],4,{animate:false});});document.querySelector('#search').addEventListener('reset',()=>setTimeout(()=>{update();status.textContent='都道府県を選ぶと登録施設数を表示します。';map.setView([36.3,137.4],4,{animate:false});}));status.textContent='都道府県を選ぶと登録施設数を表示します。';setTimeout(()=>map.invalidateSize(),200);
  } catch {status.textContent='地図を表示できません。下の一覧から選んでください。';}
})();
