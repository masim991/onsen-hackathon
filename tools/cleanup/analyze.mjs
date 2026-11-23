// Compute N (no photo incl. pending plan.json candidates, no price). Read-only on snapshot + local files.
// usage: node analyze.mjs [--after]  (--after also excludes new price (prices.json) and photo-candidates.json)
import fs from 'node:fs';
const R=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return d}};
const fac=R('db-snapshot/onsen_facilities.json',[]), ph=R('db-snapshot/onsen_photos.json',[]);
const plan=R('../photos/plan.json',[]), prices=R('../../web/data/prices.json',{items:{}}).items||{};
const newPh=R('photo-candidates.json',{items:{}}).items||{};
const keyFac={};for(const p of ph)(keyFac[p.image_key]??=new Set()).add(p.facility_id);
const ownPhoto=new Set(ph.filter(p=>(p.metadata?.image_role==='facility'||p.metadata?.kind==='facility')&&keyFac[p.image_key].size===1).map(p=>p.facility_id));
const planIds=new Set(plan.map(p=>p.id));
export const stayOf=r=>{const s=r.stay; return s?(/^(可|有|あり)$/.test(s)?'y':/^(不可|否|無|なし)$/.test(s)?'n':'y'):(r.rooms&&r.rooms!=='0室'?'y':'u')};
export function priceReason(x){
  const r=x.record||{};const out=[];
  if(+r.stayPricePerPerson>0)out.push('stayPricePerPerson');
  for(const k of Object.keys(r))if(/^stayPrice/.test(k)&&r[k]!==''&&r[k]!=null&&k!=='stayPricePerPerson')out.push(k);
  if(prices[x.id])out.push('prices.json');
  if(r.monitor?.price)out.push('monitor.price');
  if(/\d/.test(String(r.dayP||'')))out.push('dayP');
  return out;
}
const rows=fac.map(x=>({x,own:ownPhoto.has(x.id),plan:planIds.has(x.id),pr:priceReason(x),newPh:!!newPh[x.id]}));
const N=rows.filter(o=>!o.own&&!o.plan&&!o.pr.length);
const out=new Set(process.argv.includes('--after')?N.filter(o=>!o.newPh).map(o=>o.x.id):N.map(o=>o.x.id));
const c=(a,fn)=>{const m={};for(const x of a){const k=fn(x);m[k]=(m[k]||0)+1}return Object.fromEntries(Object.entries(m).sort((a,b)=>b[1]-a[1]))};
const sel=N.filter(o=>out.has(o.x.id));
const dflt=o=>(o.x.facility_kind||'unknown')==='ryokan'&&stayOf(o.x.record)!=='n';
console.log(JSON.stringify({total:fac.length,ownPhoto:ownPhoto.size,planPending:planIds.size,hasPrice:rows.filter(o=>o.pr.length).length,N:N.length,size:sel.length,
 kind:c(sel,o=>o.x.facility_kind||'unknown'),stay:c(sel,o=>stayOf(o.x.record)),hp:c(sel,o=>o.x.official_url?'hp':'no_hp'),
 dflt_all:rows.filter(dflt).length,dflt_in_set:sel.filter(dflt).length,pref:c(sel,o=>o.x.prefecture)},null,1));
if(process.argv.includes('--dump'))fs.writeFileSync('N.json',JSON.stringify(sel.map(o=>({id:o.x.id,name_ja:o.x.name_ja,name_ko:o.x.name_ko,area:o.x.area,prefecture:o.x.prefecture,kind:o.x.facility_kind||'unknown',stay:stayOf(o.x.record),hp:o.x.official_url||null}))));
