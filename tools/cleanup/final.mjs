// Builds delete-candidates.json + report.md from N.json, commons-cache.json, refs.json, price results. Read-only.
import fs from 'node:fs';
import {stayOf} from './analyze.mjs';
const R=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return d}};
const N=R('N.json',[]), cc=R('commons-cache.json',{}), refs=R('refs.json',{});
const fac=Object.fromEntries(R('db-snapshot/onsen_facilities.json',[]).map(x=>[x.id,x]));
const pBefore=R('backup/prices.before.json',{items:{}}).items, pNow=R('../../web/data/prices.json',{items:{}}).items;
const newPrice=new Set(Object.keys(pNow).filter(k=>!pBefore[k]));
const searched=n=>!!cc[n.id], newPhoto=n=>!!cc[n.id]?.found?.length;
const kept=N.filter(n=>newPrice.has(n.id)||newPhoto(n));
const Np=N.filter(n=>!newPrice.has(n.id)&&!newPhoto(n));
const refOf=id=>Object.entries(refs).filter(([,v])=>v.includes(id)).map(([k])=>k);
const c=(a,fn)=>{const m={};for(const x of a){const k=fn(x);m[k]=(m[k]||0)+1}return Object.fromEntries(Object.entries(m).sort((a,b)=>b[1]-a[1]))};
const dflt=n=>n.kind==='ryokan'&&n.stay!=='n', d1015=n=>n.kind==='ryokan'&&fac[n.id].record.stay==='可';
const out=Np.map(n=>({id:n.id,name_ja:n.name_ja,name_ko:n.name_ko,prefecture:n.prefecture,kind:n.kind,hp:n.hp,
  reason:`사진 없음(DB onsen_photos/plan.json 후보 없음) + 가격 없음; 재조사: 가격 ${n.hp?(n.stay==='n'?'미실행(숙박 불가)':'공식사이트 조사 결과 없음/접속 불가'):'공식 URL 없음'}, 사진 ${searched(n)?'Commons 검색 무결과':'Commons 미조사(중단)'}`,
  searched_commons:searched(n),stay:n.stay,referenced_by:refOf(n.id)}));
fs.writeFileSync('delete-candidates.json',JSON.stringify({generated:new Date().toISOString(),note:'후보 목록일 뿐 DB는 변경하지 않음. referenced_by가 있는 항목은 삭제 시 연쇄 삭제/참조 끊김.',count:out.length,items:out},null,1));
const sN=N.filter(searched).length;
const top=(o,k=12)=>Object.entries(o).slice(0,k).map(([a,b])=>`${a} ${b}`).join(', ');
const refTbl=Object.keys(refs).map(k=>`| ${k} | ${Np.filter(n=>refs[k].includes(n.id)).length} |`).join('\n');
const md=`# 사진·가격 모두 없는 시설 정리 후보 보고서 (${new Date().toISOString().slice(0,10)})

DB 변경 없음(SELECT/REST 읽기만). 스냅샷: tools/cleanup/db-snapshot/*.json

## 1. 숫자 요약
- 전체 시설 ${Object.keys(fac).length}
- 사진 없음 AND 가격 없음 (N): **${N.length}** (전체의 ${(N.length/Object.keys(fac).length*100).toFixed(0)}%)
- 추가 조사 후 새 가격: ${newPrice.size}건 / 새 사진 후보: ${kept.filter(newPhoto).length}건 (Commons 조사 ${sN}/${N.length}건 완료)
- 조사 후 N': **${Np.length}** (이 중 Commons 미조사 ${Np.filter(n=>!searched(n)).length}건 포함)

## 2. N 구성 (조사 전)
- kind: ${top(c(N,n=>n.kind))}
- 숙박(stay): ${top(c(N,n=>n.stay))} (y=可, n=不可/否, u=미상)
- 공식 URL: ${top(c(N,n=>n.hp?'있음':'없음'))}
- 도도부현 상위: ${top(c(N,n=>n.prefecture),10)}

## 3. N' 구성 (조사 후)
- kind: ${top(c(Np,n=>n.kind))}
- 숙박: ${top(c(Np,n=>n.stay))}
- 공식 URL: ${top(c(Np,n=>n.hp?'있음':'없음'))}
- 도도부현: ${top(c(Np,n=>n.prefecture),47)}

## 4. 사이트 기본 목록 영향 (kind=ryokan, stay 不可 아님)
- 기본 목록 전체: ${Object.values(fac).filter(x=>x.facility_kind==='ryokan'&&stayOf(x.record)!=='n').length}건 (stay=可만: 1,015)
- N'에 속해 사라질 것: **${Np.filter(dflt).length}건** (stay=可 기준 ${Np.filter(d1015).length}건)

## 5. 삭제 시 참조/연쇄 (N' 기준)
FK ON DELETE CASCADE: facility_changes, facility_notices, monitor_jobs, monitor_targets, onsen_photos, photo_assets. onsen_source_candidates는 FK 없음(data JSON 안의 id만 남아 고아가 됨).
| 테이블 | N' 중 참조 시설 수 |
|---|---|
${refTbl}
- 모니터링 중(monitor_targets)인 N' 시설은 삭제 금지 권장: 가격을 곧 수집할 수 있고 photo_assets/공지도 같이 사라진다.
- onsen_photos는 N 정의상 없음(공유/지역 사진만 있는 시설은 있을 수 있음 → 삭제 시 함께 지워짐).

## 6. 권장 제거 방법
1. onsen_facilities(+참조 6개 테이블) 전체를 JSON으로 백업(이미 읽기 전용 스냅샷 존재, 삭제 직전 재생성).
2. 하드 삭제 대신 소프트 숨김: onsen_facilities에 boolean unlisted(기본 false) 추가, N' id만 true, db-loader 쿼리에 unlisted=eq.false 조건. 되돌리기 쉽고 CASCADE 없음.
3. 하드 삭제가 꼭 필요하면: 백업 -> 아카이브 테이블 복사 -> 삭제, 참조 시설(위 표)은 제외.
4. 제거 후 기본 목록 건수·지도·검색 확인, ?v= 올리기.
`;
fs.writeFileSync('report.md',md);console.log(md);
