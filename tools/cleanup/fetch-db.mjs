// Read-only snapshot of public tables via REST (anon key from web/db-loader.js). Writes db-snapshot/*.json (backup).
import fs from 'node:fs';
const P='https://frncsllpkxrsgxyqsfwd.supabase.co', K='sb_publishable_7rJJBUzpz-WimUPB6eSOZg_cz4K_fGW';
fs.mkdirSync('db-snapshot',{recursive:true});
for (const [t,order] of [['onsen_facilities','id.asc'],['onsen_photos','facility_id.asc,sort_order.asc,image_key.asc'],['facility_notices','id.asc'],['monitor_targets','id.asc'],['photo_assets','id.asc'],['facility_changes','id.asc'],['onsen_source_candidates','id.asc']]) {
  const rows=[];
  for (let o=0;;o+=1000){
    const r=await fetch(`${P}/rest/v1/${t}?select=*&order=${order}&offset=${o}&limit=1000`,{headers:{apikey:K,Authorization:`Bearer ${K}`}});
    if(!r.ok){console.log(t,'HTTP',r.status,(await r.text()).slice(0,150));break;}
    const b=await r.json(); rows.push(...b); if(b.length<1000)break;
  }
  fs.writeFileSync(`db-snapshot/${t}.json`,JSON.stringify(rows)); console.log(t,rows.length);
}
