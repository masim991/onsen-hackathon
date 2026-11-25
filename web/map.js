// 도도부현 선택 지도(한국어·일본어·영어 공용). 문구는 UI.rail, 현 이름은 prefName(). site.js의 form·render·FAC를 사용한다.
(() => {
  const target = document.getElementById('prefMap');
  const status = document.getElementById('mapStatus');
  const R = UI.rail;
  if (!target || typeof L === 'undefined' || typeof JAPAN_PREFECTURES === 'undefined') {
    if (status) status.textContent = R.mapFail;
    return;
  }
  const names = Object.keys(DATA_I18N.prefs); // 지도 도형 id(1~47) 순서의 일본어 현 이름
  const nameOfShape = (shape) => names[Number(shape.feature.properties.id) - 1];
  const selectPref = jp => {
    if (![...form.elements.pref.options].some(option => option.value === jp)) {
      form.elements.pref.add(new Option(prefName(jp), jp));
    }
    quick({ pref: jp });
    form.elements.pref.dispatchEvent(new Event('input', { bubbles: true }));
  };
  try {
    const map = L.map(target, { scrollWheelZoom: false, zoomControl: false }).setView([36.3, 137.4], 4);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
      minZoom: 2, maxZoom: 18, attribution: `<a href="https://maps.gsi.go.jp/development/" target="_blank" rel="noopener">地理院タイル</a> · ${R.mapAttr}`
    }).addTo(map);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'map-reset';
    reset.textContent = R.mapAll;
    status.after(reset);
    const info = (jp) => {
      const records = FAC.filter(f => f.pref === jp);
      return R.mapInfo(prefName(jp), records.length, records.filter(f => f.kind === 'ryokan').length);
    };
    const layer = L.geoJSON(JAPAN_PREFECTURES, {
      style: { color: '#837b68', weight: 1, fillColor: '#b0b8a5', fillOpacity: .23 },
      onEachFeature(feature, shape) {
        const jp = names[Number(feature.properties.id) - 1];
        if (!jp) return;
        shape.bindTooltip(info(jp), { sticky: true });
        shape.on('click', () => {
          selectPref(jp);
          update();
          map.fitBounds(shape.getBounds(), { maxZoom: 7, padding: [12, 12], animate: false });
        });
      }
    }).addTo(map);
    function update() {
      let selectedJp = '';
      layer.eachLayer(shape => {
        const selected = nameOfShape(shape) === form.elements.pref.value;
        if (selected) selectedJp = nameOfShape(shape);
        shape.setStyle({ fillOpacity: selected ? .65 : .23, fillColor: selected ? '#3e4a3d' : '#b0b8a5', weight: selected ? 2 : 1 });
      });
      status.textContent = selectedJp ? info(selectedJp) : R.mapPick;
    }
    reset.addEventListener('click', () => {
      form.elements.pref.value = '';
      form.elements.region.value = '';
      render();
      update();
      map.setView([36.3, 137.4], 4, {animate:false});
    });
    form.elements.pref.addEventListener('input', update);
    form.addEventListener('reset', () => setTimeout(() => { update(); map.setView([36.3, 137.4], 4, {animate:false}); }));
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-chip="pref"], [data-clear]')) setTimeout(update);
    });
    update();
    form.querySelector('details').addEventListener('toggle', () => setTimeout(() => map.invalidateSize(), 100));
    setTimeout(() => map.invalidateSize(), 200);
  } catch {
    status.textContent = R.mapFail;
  }
})();
