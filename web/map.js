(() => {
  const target = document.getElementById('prefMap');
  const status = document.getElementById('mapStatus');
  if (!target || typeof L === 'undefined' || typeof JAPAN_PREFECTURES === 'undefined') {
    if (status) status.textContent = '지도를 표시할 수 없습니다. 아래 목록에서 도도부현을 선택하세요.';
    return;
  }
  const names = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  try {
    const map = L.map(target, { scrollWheelZoom: false, zoomControl: false }).setView([36.3, 137.4], 4);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
      minZoom: 2, maxZoom: 18, attribution: '<a href="https://maps.gsi.go.jp/development/" target="_blank" rel="noopener">地理院タイル</a> · 경계: <a href="https://github.com/dataofjapan/land" target="_blank" rel="noopener">지구지도 일본</a>'
    }).addTo(map);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'map-reset';
    reset.textContent = '일본 전체 보기';
    status.after(reset);
    const info = (item) => {
      const records = FAC.filter(f => f.pref === item[0]);
      return `${item[0]} · 등록 시설 ${records.length}곳 · 확인된 료칸 ${records.filter(f => f.kind === 'ryokan').length}곳`;
    };
    const layer = L.geoJSON(JAPAN_PREFECTURES, {
      style: { color: '#837b68', weight: 1, fillColor: '#b0b8a5', fillOpacity: .23 },
      onEachFeature(feature, shape) {
        const item = PREF[names[Number(feature.properties.id) - 1]];
        if (!item) return;
        shape.bindTooltip(info(item), { sticky: true });
        shape.on('click', () => {
          state.rg = '';
          form.elements.pref.value = item[0];
          form.elements.region.value = '';
          render();
          update();
          map.fitBounds(shape.getBounds(), { maxZoom: 7, padding: [12, 12], animate: false });
        });
      }
    }).addTo(map);
    function update() {
      let selectedItem = null;
      layer.eachLayer(shape => {
        const item = PREF[names[Number(shape.feature.properties.id) - 1]];
        const selected = item && form.elements.pref.value === item[0];
        if (selected) selectedItem = item;
        shape.setStyle({ fillOpacity: selected ? .65 : .23, fillColor: selected ? '#3e4a3d' : '#b0b8a5', weight: selected ? 2 : 1 });
      });
      status.textContent = selectedItem ? info(selectedItem) : '현을 선택하면 등록 시설 수를 볼 수 있습니다. + / −로 지도를 확대·축소하세요.';
    }
    reset.addEventListener('click', () => {
      state.rg = '';
      form.elements.pref.value = '';
      form.elements.region.value = '';
      render();
      update();
      map.setView([36.3, 137.4], 4, {animate:false});
    });
    form.elements.pref.addEventListener('input', update);
    form.addEventListener('reset', () => setTimeout(() => { update(); map.setView([36.3, 137.4], 4, {animate:false}); }));
    document.getElementById('regionChips')?.addEventListener('click', () => setTimeout(update));
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-chip="pref"], [data-clear]')) setTimeout(update);
    });
    update();
    form.querySelector('details').addEventListener('toggle', () => setTimeout(() => map.invalidateSize(), 100));
    setTimeout(() => map.invalidateSize(), 200);
  } catch {
    status.textContent = '지도를 표시할 수 없습니다. 아래 목록에서 도도부현을 선택하세요.';
  }
})();
