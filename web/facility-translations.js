(() => {
  const labels = {
    ja: {heading:'施設ごとの案内', checked:'確認日', source:'出典', pending:'この項目の翻訳は準備中です。公式情報をご確認ください。', fields:{stayPriceNote:'宿泊料金の条件',temp:'源泉温度',dayH:'日帰り入浴の時間',card:'カード決済',shuttle:'送迎',over:'施設からの案内',closed:'休館日',stayP:'宿泊料金',mixed:'男女別・混浴',dayNote:'日帰り入浴の注意事項',towel:'タオル',pay:'支払い',dayHours:'日帰り入浴の時間',dayUse:'日帰り入浴の案内',towels:'タオル',access:'アクセス・送迎',more:'その他の案内',payment:'支払い',notice:'営業状況',privateBath:'貸切風呂'}},
    en: {heading:'Property-specific information', checked:'Checked', source:'Source', pending:'Translation is pending. Please check the official information.', fields:{stayPriceNote:'Overnight rate conditions',temp:'Source temperature',dayH:'Day-use hours',card:'Card payment',shuttle:'Shuttle',over:'Property information',closed:'Closures',stayP:'Overnight rates',mixed:'Gender arrangements and mixed bathing',dayNote:'Day-use notes',towel:'Towels',pay:'Payment',dayHours:'Day-use hours',dayUse:'Day-use information',towels:'Towels',access:'Access and shuttle',more:'More information',payment:'Payment',notice:'Operating status',privateBath:'Private bath'}}
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function translate(text, dictionary, language) {
    if (typeof text !== 'string' || !text.trim()) return '';
    if (!/[가-힣]/.test(text)) return text;
    return Object.prototype.hasOwnProperty.call(dictionary, text) ? dictionary[text] : '';
  }
  function render(r, x, dictionary, language) {
    const conf = labels[language], items = [], rawFields = ['stayPriceNote','temp','dayH','card','shuttle','over','closed','stayP','mixed','dayNote','towel','pay'];
    const extraFields = ['dayHours','dayUse','closed','towels','access','more','dayNote','payment','notice','privateBath'];
    const add = (field, value, url, checked) => {
      const text = translate(value, dictionary, language);
      if (!text) return;
      let link = '';
      try { const u = new URL(url); if (u.protocol === 'https:' || u.protocol === 'http:') link = ` <a href="${esc(u.href)}" target="_blank" rel="noopener">${conf.source}</a>`; } catch {}
      items.push(`<div><dt>${esc(conf.fields[field])}</dt><dd>${esc(text)}${checked ? ` <small>(${conf.checked}: ${esc(checked)})</small>` : ''}${link}</dd></div>`);
    };
    for (const field of rawFields) {
      const value = r[field];
      if (typeof value !== 'string' || !/[가-힣]/.test(value)) continue;
      if (field === 'dayH' && x.dayHours !== undefined) continue;
      if (field === 'closed' && x.closed) continue;
      if (field === 'dayNote' && x.dayNote) continue;
      add(field,value,'',r.checked);
    }
    for (const field of extraFields) {
      const value = x[field];
      if (typeof value === 'string') { if (/[가-힣]/.test(value) || (field === 'dayHours' && /^[\d\s:〜～~.,/—–-]+$/.test(value))) add(field,value,'',x.checked); }
      else if (Array.isArray(value)) {
        const pairs = Array.isArray(value[0]) ? value : [value];
        for (const pair of pairs) if (Array.isArray(pair) && typeof pair[0] === 'string') add(field,pair[0],pair[1],x.checked);
      }
    }
    return items.length ? `<section class="locale-property-notes"><h4>${conf.heading}</h4><dl>${items.join('')}</dl></section>` : '';
  }
  window.facilityTranslation = {translate, render};
})();
