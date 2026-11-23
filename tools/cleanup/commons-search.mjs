// Commons API candidate finder for N. Search only (no image download, no DB writes). Resumable via commons-cache.json.
// 1 req / 1.5 s, exponential backoff on 429/503. usage: node commons-search.mjs [--limit N]
import fs from 'node:fs';
const R=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return d}};
const API='https://commons.wikimedia.org/w/api.php', UA='OnsenPhotoCandidateFinder/1.0 (read-only research; Commons API only)';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let last=0;
async function api(params){
  for(let a=0;a<6;a++){
    const w=last+1500-Date.now(); if(w>0)await sleep(w); last=Date.now();
    const r=await fetch(API+'?'+new URLSearchParams({format:'json',formatversion:'2',origin:'*',...params}),{headers:{'User-Agent':UA}}).catch(()=>null);
    if(r&&r.ok)return r.json();
    const ra=+(r?.headers.get('retry-after')||0);
    const st=r?.status||0; console.log('retry',st,a); await sleep(Math.max(ra*1000,5000*2**a));
  }
  throw new Error('api failed');
}
const OKLIC=/^(CC0|Public domain|PD[ -]|CC BY(-SA)? \d(\.\d)?)/i, BADLIC=/NC|ND|fair use/i;
const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const meta=p=>{const ii=p.imageinfo?.[0];if(!ii)return null;const m=ii.extmetadata||{};return{title:p.title,page:'https://commons.wikimedia.org/wiki/'+encodeURIComponent(p.title.replace(/ /g,'_')).replace(/%3A/,':').replace(/%2F/g,'/'),w:ii.width,h:ii.height,mime:ii.mime,license:strip(m.LicenseShortName?.value),artist:strip(m.Artist?.value).slice(0,80),desc:strip(m.ImageDescription?.value),cats:strip(m.Categories?.value),cl:(p.categories||[]).map(c=>c.title).join(' ')}};
const IP={prop:'imageinfo|categories',iiprop:'extmetadata|size|mime',iiextmetadatafilter:'LicenseShortName|Artist|ImageDescription|Categories',cllimit:'max'};
function accept(m,f){
  const hay=[m.title,m.desc,m.cats,m.cl].join(' ');
  if(!hay.includes(f.name_ja))return null;
  if(f.name_ja.length<5&&!(f.area_ja&&hay.includes(f.area_ja)))return {rej:'short name without area'};
  if(!/^image\/(jpeg|png)$/.test(m.mime)||m.w<800)return {rej:'size/mime'};
  if(BADLIC.test(m.license)||!OKLIC.test(m.license))return {rej:'licence '+m.license};
  return {ok:1};
}
async function one(f,used){
  const found=[],rej=[];
  const queries=[`"${f.name_ja}"`]; if(f.name_ja.length<5&&f.area_ja)queries.push(`"${f.name_ja}" ${f.area_ja}`);
  for(const q of queries){
    const j=await api({action:'query',generator:'search',gsrsearch:q,gsrnamespace:'6|14',gsrlimit:'10',...IP});
    const pages=j.query?.pages||[];
    const files=pages.filter(p=>p.ns===6), cats=pages.filter(p=>p.ns===14&&p.title.includes(f.name_ja));
    for(const c of cats.slice(0,2)){
      const k=await api({action:'query',generator:'categorymembers',gcmtitle:c.title,gcmtype:'file',gcmlimit:'5',...IP});
      files.push(...(k.query?.pages||[]).map(p=>({...p,viaCategory:c.title})));
    }
    for(const p of files){const m=meta(p);if(!m||used.has(m.title))continue;const a=accept(m,f);if(!a)continue;
      if(a.ok)found.push({file:m.title,pageUrl:m.page,w:m.w,h:m.h,license:m.license,artist:m.artist,via:p.viaCategory?'category':'search',viaCategory:p.viaCategory,query:q});else rej.push({file:m.title,reason:a.rej});}
    if(found.length)break;
  }
  const seen=new Set();return {found:found.filter(x=>!seen.has(x.file)&&seen.add(x.file)).slice(0,3),rej:rej.slice(0,3)};
}
const N=R('N.json',[]), recs=Object.fromEntries(R('db-snapshot/onsen_facilities.json',[]).map(x=>[x.id,x.record]));
const cache=R('commons-cache.json',{}), lim=+(process.argv[process.argv.indexOf('--limit')+1]||0);
const used=new Set(R('../photos/plan.json',[]).map(p=>'File:'+p.title.replace(/_/g,' ')));
for(const p of R('db-snapshot/onsen_photos.json',[])){const m=/Special:FilePath\/(.+)$/.exec(p.image_path||'');if(m)used.add('File:'+decodeURIComponent(m[1]).replace(/_/g,' '))}
const order={ryokan:0,hotel:1,day_onsen:2,public_bath:3,unknown:4};
const todo=N.filter(n=>!cache[n.id]&&n.name_ja).sort((a,b)=>order[a.kind]-order[b.kind]);
let i=0;
for(const n of lim?todo.slice(0,lim):todo){
  try{cache[n.id]=await one({name_ja:n.name_ja,area_ja:recs[n.id]?.area_ja},used);}catch(e){console.log('stop',n.id,e.message);break;}
  if(++i%25===0){fs.writeFileSync('commons-cache.json',JSON.stringify(cache));console.log(i+'/'+todo.length);}
}
fs.writeFileSync('commons-cache.json',JSON.stringify(cache));
const items=Object.fromEntries(Object.entries(cache).filter(([,v])=>v.found?.length).map(([k,v])=>[k,v.found]));
fs.writeFileSync('photo-candidates.json',JSON.stringify({generated:new Date().toISOString(),note:'Commons API candidates, NOT downloaded/inserted. Review before use.',items},null,1));
console.log('done',Object.keys(cache).length,'with candidates',Object.keys(items).length);
