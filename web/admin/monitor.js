// 관리자 모니터 화면. 라이브러리 없음, innerHTML 없음(모든 값은 textContent), 보호는 전적으로 RLS가 한다.
(() => {
  'use strict';
  const project = 'https://frncsllpkxrsgxyqsfwd.supabase.co';
  const key = 'sb_publishable_7rJJBUzpz-WimUPB6eSOZg_cz4K_fGW'; // 공개용 키(db-loader.js 와 동일). 권한은 사용자 JWT + RLS.
  const SKEY = 'onsen-admin-session';
  const KINDS = ['notice', 'price_hours', 'photo'];
  const KIND_KO = {notice: '공지', price_hours: '가격·시간', photo: '사진'};
  const LABEL_KO = {onsen_bath: '온천탕', exterior: '외관·경관', room: '객실', food: '음식', logo: '로고', map_doc: '지도·문서', other: '기타'};
  const STATE_KO = {unchecked: '미분류', publish_ok: '공개 가능', hold_license: '라이선스 보류', logo_review: '로고 검토', logo_approved: '로고 승인됨', approved: '승인(공개)', rejected: '반려', not_published: '비공개 대상', check_failed: '분류 실패'};
  const $ = (id) => document.getElementById(id);

  // ---- DOM helpers (textContent only) ----
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'on') for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  }
  const safeHref = (v) => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
  const link = (url, text) => { const h = safeHref(url); return h ? el('a', {href: h, target: '_blank', rel: 'noopener noreferrer'}, text || url) : el('span', {}, text || url || '-'); };
  // DB 시각은 timestamptz(UTC). 브라우저 시간대와 무관하게 한국 시간으로 고정해 보여 준다.
  const KST = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  const when = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? `${KST.format(d)} KST` : '-'; };
  const rel = (v) => { const s = Math.round((Date.parse(v) - Date.now()) / 1000), a = Math.abs(s); if (a < 60) return '방금'; const [n, u] = a < 3600 ? [a / 60, '분'] : a < 86400 ? [a / 3600, '시간'] : [a / 86400, '일']; return `${Math.floor(n)}${u} ${s > 0 ? '뒤' : '전'}`; };
  const tag = (text, cls) => el('span', {class: 'tag ' + (cls || '')}, text);
  const msgBox = () => el('p', {class: 'msg', role: 'status'});
  const say = (box, text, cls) => { box.textContent = text; box.className = 'msg ' + (cls || ''); };
  function table(heads, rows) {
    return el('div', {class: 'tw'}, el('table', {}, el('thead', {}, el('tr', {}, heads.map((h) => el('th', {scope: 'col'}, h)))),
      el('tbody', {}, rows.length ? rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, c)))) : el('tr', {}, el('td', {colspan: heads.length}, '데이터가 없습니다.')))));
  }
  const field = (label, ctl) => el('label', {}, label, ctl);
  const opts = (list) => list.map(([v, t]) => el('option', {value: v}, t));
  const sel = (name, list) => el('select', {name}, opts(list));
  const clean = (s) => String(s || '').replace(/[,()*"\\%]/g, '').trim(); // PostgREST 필터 구분자 제거
  const okId = (s) => /^[\w-]{1,80}$/.test(s);

  // ---- session (memory + sessionStorage) ----
  let session = null;
  const save = () => { try { session ? sessionStorage.setItem(SKEY, JSON.stringify(session)) : sessionStorage.removeItem(SKEY); } catch { /* 저장 불가여도 메모리로 동작 */ } };
  const load = () => { try { const s = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); return s && s.access_token && s.refresh_token ? s : null; } catch { return null; } };
  function takeTokens(j) {
    if (!j || !j.access_token || !j.refresh_token || !j.user) throw new Error('로그인 응답이 올바르지 않습니다.');
    session = {access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: {id: j.user.id, email: j.user.email}};
    save();
  }
  async function authCall(path, body) {
    const r = await fetch(`${project}/auth/v1/${path}`, {method: 'POST', headers: {apikey: key, 'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(15000)});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || `인증 오류 (${r.status})`);
    return j;
  }
  const login = async (email, password) => takeTokens(await authCall('token?grant_type=password', {email, password}));
  let refreshing = null;
  function refresh() {
    refreshing ||= authCall('token?grant_type=refresh_token', {refresh_token: session.refresh_token}).then(takeTokens).finally(() => { refreshing = null; });
    return refreshing;
  }
  async function signOut() {
    const t = session && session.access_token;
    session = null; save();
    if (t) fetch(`${project}/auth/v1/logout`, {method: 'POST', headers: {apikey: key, Authorization: `Bearer ${t}`}}).catch(() => {});
  }

  // ---- PostgREST ----
  async function api(path, {method = 'GET', body, prefer, count} = {}) {
    if (!session) throw new Error('로그인이 필요합니다.');
    if (session.expires_at - 30 < Date.now() / 1000) await refresh();
    const go = () => fetch(`${project}/rest/v1/${path}`, {
      method, cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: {apikey: key, Authorization: `Bearer ${session.access_token}`, ...(body ? {'Content-Type': 'application/json'} : {}),
        ...(prefer || count ? {Prefer: [prefer, count && 'count=exact'].filter(Boolean).join(',')} : {})},
      body: body ? JSON.stringify(body) : undefined});
    let r = await go();
    if (r.status === 401) { await refresh(); r = await go(); }
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch { /* 본문 없음 */ }
    if (!r.ok) throw new Error(`${(data && data.message) || '요청 실패'} (${r.status})`);
    const total = Number((r.headers.get('Content-Range') || '').split('/')[1]);
    return {data, total: Number.isFinite(total) ? total : null};
  }
  async function all(path, max = 10) { // 1000건씩 이어 받는다
    const out = [];
    for (let i = 0; i < max; i++) {
      const {data} = await api(`${path}${path.includes('?') ? '&' : '?'}limit=1000&offset=${i * 1000}`);
      out.push(...data); if (data.length < 1000) break;
    }
    return out;
  }
  const countOf = async (path) => (await api(`${path}${path.includes('?') ? '&' : '?'}select=id&limit=1`, {count: true})).total ?? 0;

  // ---- 공통: 페이지 목록 ----
  const SIZE = 20;
  function pager(state, load) {
    const info = el('span', {}), prev = el('button', {type: 'button', class: 'btn'}, '이전'), next = el('button', {type: 'button', class: 'btn'}, '다음');
    prev.addEventListener('click', () => { state.page--; load(); });
    next.addEventListener('click', () => { state.page++; load(); });
    return {node: el('div', {class: 'pager'}, prev, info, next), update(total, n) {
      info.textContent = `${total == null ? '?' : total}건 중 ${state.page * SIZE + (n ? 1 : 0)}-${state.page * SIZE + n}`;
      prev.disabled = state.page === 0; next.disabled = total != null ? (state.page + 1) * SIZE >= total : n < SIZE;
    }};
  }
  // 목록 화면 골격: 필터 폼 + 목록 + 페이저. build(query)는 REST 경로, row(r)는 항목 노드.
  function listView({filters, path, row, empty}) {
    const state = {page: 0}, box = el('div', {}), status = msgBox(), form = el('form', {class: 'tools'}), pg = pager(state, () => run());
    const ctl = {};
    for (const [name, label, node] of filters) { ctl[name] = node; form.append(field(label, node)); }
    form.append(el('button', {type: 'submit', class: 'btn primary'}, '조회'));
    form.addEventListener('submit', (e) => { e.preventDefault(); state.page = 0; run(); });
    async function run() {
      say(status, '불러오는 중…');
      try {
        const v = Object.fromEntries(Object.entries(ctl).map(([k, n]) => [k, n.value]));
        const {data, total} = await api(`${path(v)}&limit=${SIZE}&offset=${state.page * SIZE}`, {count: true});
        box.replaceChildren(...(data.length ? data.map((r) => row(r, run)) : [el('p', {class: 'msg'}, empty || '데이터가 없습니다.')]));
        pg.update(total, data.length); say(status, '');
      } catch (e) { say(status, e.message, 'err'); }
    }
    const node = el('div', {}, form, status, box, pg.node);
    return {node, run};
  }
  async function patch(path, body, box) { // RLS가 막으면 0건이므로 representation 으로 확인한다
    try {
      const {data} = await api(path, {method: 'PATCH', body, prefer: 'return=representation'});
      if (!data || !data.length) throw new Error('변경되지 않았습니다(권한 또는 대상 없음).');
      say(box, '저장했습니다.', 'ok'); return data[0];
    } catch (e) { say(box, e.message, 'err'); return null; }
  }

  // ---- 탭: 현황 ----
  async function viewOverview() {
    const root = el('div', {}), status = msgBox();
    root.append(status);
    const addStats = (title, items) => root.append(el('h3', {}, title), el('div', {class: 'grid'}, items.map(([n, t]) => el('div', {class: 'stat'}, el('b', {}, n), el('span', {}, t)))));
    try {
      const [fac, targets, jq, jr, jf, jd, running] = await Promise.all([
        countOf('onsen_facilities'), all('monitor_targets?select=facility_id,kind,last_status,last_checked_at,next_check_at,enabled'),
        countOf('monitor_jobs?status=eq.queued'), countOf('monitor_jobs?status=eq.running'), countOf('monitor_jobs?status=eq.failed'), countOf('monitor_jobs?status=eq.ok'),
        api('monitor_jobs?select=worker,started_at&status=eq.running&order=started_at.desc&limit=5')]);
      const cls = (t) => !t.last_status ? 'wait' : t.last_status.startsWith('failed') ? 'failed' : t.last_status.startsWith('blocked') ? 'blocked' : 'ok';
      const c = {ok: 0, failed: 0, blocked: 0, wait: 0};
      targets.forEach((t) => c[cls(t)]++);
      // 시각은 문자열이 아닌 숫자로 비교한다(소수 자리 수가 달라 문자열 정렬이 틀릴 수 있음). 기한이 지난 대상(새로 등록되어 next=등록 시각인 것 포함)은 '다음'이 아니라 '대기'로 센다.
      const now = Date.now(), ms = (v) => Date.parse(v), on = targets.filter((t) => t.enabled && t.next_check_at);
      const overdue = on.filter((t) => ms(t.next_check_at) <= now), upcoming = on.filter((t) => ms(t.next_check_at) > now);
      const pick = (a, f, v) => a.length ? a.reduce((m, t) => f(ms(t[v]), ms(m[v])) ? t : m)[v] : null;
      const last = pick(targets.filter((t) => t.last_checked_at), (a, b) => a > b, 'last_checked_at'), next = pick(upcoming, (a, b) => a < b, 'next_check_at');
      addStats('전체', [[fac, '등록 시설'], [targets.length, '감시 대상'], [last ? when(last) : '점검 전', last ? `마지막 점검 (${rel(last)})` : '마지막 점검'],
        [next ? when(next) : '-', next ? `다음 점검 (${rel(next)})` : '다음 점검 예정 없음'], [`${overdue.length}건`, '점검 대기(기한 지남)']]);
      addStats('대상 종류', KINDS.map((k) => [targets.filter((t) => t.kind === k).length, KIND_KO[k]]));
      addStats('대상 상태', [[c.ok, '정상'], [c.failed, '실패'], [c.blocked, '차단(robots 등)'], [c.wait, '미점검']]);
      addStats('작업 큐', [[jq, '대기'], [jr, '실행 중'], [jf, '실패'], [jd, '완료']]);
      const w = [...new Set(running.data.map((r) => r.worker).filter(Boolean))];
      // 기한 지난 대상(오래된 순) → 앞으로 예정(빠른 순) → 중지됨. 실패·차단 대상의 다음 시각은 재시도 예정 시각이다.
      const nx = (t) => `${when(t.next_check_at)} (${ms(t.next_check_at) <= now ? '점검 대기(기한 지남) ' : ''}${rel(t.next_check_at)})`;
      const rows = [...targets].sort((a, b) => (!a.enabled - !b.enabled) || (ms(a.next_check_at || 0) - ms(b.next_check_at || 0))).slice(0, 40);
      root.append(el('h3', {}, `감시 대상 (다음 점검 순, 상위 ${rows.length}건)`), table(['시설 id', '종류', '상태', '마지막 점검', '다음 점검'],
        rows.map((t) => [t.facility_id, KIND_KO[t.kind] || t.kind, t.enabled ? (t.last_status || '점검 전') : '중지됨', t.last_checked_at ? `${when(t.last_checked_at)} (${rel(t.last_checked_at)})` : '점검 전', t.enabled && t.next_check_at ? nx(t) : '-'])));
      root.append(el('p', {class: 'msg'}, `실행 중 워커: ${w.length ? w.join(', ') : '없음'}`));
    } catch (e) { say(status, e.message, 'err'); }
    root.append(el('h3', {}, '지금 다시 점검'), recheckForm());
    return root;
  }
  function recheckForm() {
    const idIn = el('input', {name: 'fid', placeholder: '시설 id (예: official-akita-36630d4b)', maxlength: 80}), kindSel = sel('kind', [['', '전체 종류'], ...KINDS.map((k) => [k, KIND_KO[k]])]), box = msgBox();
    const form = el('form', {class: 'tools'}, field('시설 id', idIn), field('종류', kindSel), el('button', {type: 'submit', class: 'btn primary'}, '점검 요청'), box);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fid = idIn.value.trim();
      if (!okId(fid)) return say(box, '시설 id 형식이 올바르지 않습니다.', 'err');
      try {
        const {data} = await api(`monitor_targets?select=id,facility_id,kind&enabled=eq.true&facility_id=eq.${encodeURIComponent(fid)}${kindSel.value ? `&kind=eq.${kindSel.value}` : ''}`);
        if (!data.length) return say(box, '이 시설의 감시 대상이 없습니다.', 'err');
        await api('monitor_jobs', {method: 'POST', body: data.map((t) => ({target_id: t.id, facility_id: t.facility_id, kind: t.kind, status: 'queued'})), prefer: 'return=minimal'});
        say(box, `${data.length}건을 큐에 넣었습니다. 워커가 다음 실행 때 처리합니다.`, 'ok');
      } catch (err) { say(box, err.message, 'err'); }
    });
    return form;
  }

  // ---- 탭: 대기열 ----
  const stCls = (s) => s === 'failed' ? 'bad' : s === 'ok' ? 'good' : s === 'queued' || s === 'running' ? 'warn' : '';
  function viewJobs() {
    return listView({
      filters: [['status', '상태', sel('status', [['', '전체'], ...['queued', 'running', 'ok', 'failed', 'skipped'].map((s) => [s, s])])], ['fid', '시설 id', el('input', {maxlength: 80})]],
      path: (v) => `monitor_jobs?select=*&order=id.desc${v.status ? `&status=eq.${v.status}` : ''}${clean(v.fid) ? `&facility_id=ilike.*${encodeURIComponent(clean(v.fid))}*` : ''}`,
      row: (j, rerun) => {
        const box = msgBox(), b = j.status === 'failed' ? el('button', {type: 'button', class: 'btn', on: {click: async () => {
          try { await api('monitor_jobs', {method: 'POST', body: {target_id: j.target_id, facility_id: j.facility_id, kind: j.kind, status: 'queued'}, prefer: 'return=minimal'}); say(box, '새 작업을 넣었습니다.', 'ok'); } catch (e) { say(box, e.message, 'err'); }
        }}}, '다시 시도') : null;
        return el('div', {class: 'item'}, el('div', {}, tag(j.status, stCls(j.status)), ` #${j.id} · ${j.facility_id} · ${KIND_KO[j.kind] || j.kind}`),
          el('div', {class: 'meta'}, `시도 ${j.attempts} · 워커 ${j.worker || '-'} · 예정 ${when(j.run_after)} · 시작 ${when(j.started_at)} · 종료 ${when(j.finished_at)}`),
          j.error ? el('pre', {}, j.error) : null, el('div', {class: 'acts'}, b), box);
      }});
  }

  // ---- 탭: 공지 ----
  function viewNotices() {
    return listView({
      filters: [['pub', '공개 상태', sel('pub', [['', '전체'], ['false', '비공개'], ['true', '공개']])], ['fid', '시설 id', el('input', {maxlength: 80})]],
      path: (v) => `facility_notices?select=*&order=detected_at.desc${v.pub ? `&published=eq.${v.pub}` : ''}${clean(v.fid) ? `&facility_id=ilike.*${encodeURIComponent(clean(v.fid))}*` : ''}`,
      row: (n, rerun) => {
        const box = msgBox(), ta = el('textarea', {'aria-label': '한국어 요약'}); ta.value = n.summary_ko || '';
        const act = (label, cls, body, check) => el('button', {type: 'button', class: 'btn ' + cls, on: {click: async () => {
          if (check && !check()) return;
          const r = await patch(`facility_notices?id=eq.${n.id}`, body(), box); if (r) rerun();
        }}}, label);
        const need = () => ta.value.trim() ? true : (say(box, '요약이 비어 있으면 공개할 수 없습니다.', 'err'), false);
        return el('div', {class: 'item'}, el('div', {}, tag(n.published ? '공개' : '비공개', n.published ? 'good' : 'warn'), ` #${n.id} · ${n.facility_id} · ${n.notice_date || '날짜 없음'}`),
          el('div', {}, el('b', {}, n.title || '(제목 없음)')), el('div', {class: 'meta'}, '원문 발췌'), el('pre', {}, n.original_excerpt || ''),
          el('div', {class: 'meta'}, '원문: ', link(n.source_url), ` · 감지 ${when(n.detected_at)}`), field('한국어 요약(공개 화면에 표시됨)', ta),
          el('div', {class: 'acts'}, act('요약 저장', '', () => ({summary_ko: ta.value.trim() || null})), n.published ? act('비공개로', 'danger', () => ({published: false})) : act('승인하고 공개', 'primary', () => ({summary_ko: ta.value.trim(), published: true}), need)), box);
      }});
  }

  // ---- 탭: 변경 이력 ----
  const pretty = (v) => { try { return JSON.stringify(v, null, 1); } catch { return String(v); } };
  // 상태 흐름: 대기 → 승인 → 반영됨 → (되돌리기 요청) → 되돌림. 반려/자동 반영은 흐름 밖. 전이는 DB 트리거가 한 번 더 막는다(migration 003).
  const FLOW = [['pending_review', '대기'], ['approved', '승인'], ['applied', '반영됨'], ['revert_requested', '되돌리기 요청'], ['reverted', '되돌림']];
  const ST_KO = {rejected: '반려', auto_applied: '자동 반영', ...Object.fromEntries(FLOW)};
  const flowNode = (s) => {
    const i = FLOW.findIndex((f) => f[0] === s);
    return i < 0 ? el('div', {class: 'meta'}, `흐름: ${ST_KO[s] || s} (이 상태에서는 더 진행하지 않습니다)`)
      : el('div', {class: 'meta'}, '흐름: ', FLOW.map(([, t], n) => el('span', {}, n ? ' → ' : '', n === i ? el('b', {}, `[${t}]`) : t)));
  };
  // 최근 7일 자동 반영 목록(맨 위): 승인 없이 이미 반영된 값을 훑어보고 틀린 것만 되돌리기 요청. textContent만 사용(el 헬퍼).
  function recentAuto(rerun) {
    const box = el('div', {}), list = el('div', {}), msg = msgBox();
    box.append(el('h3', {}, '최근 7일 자동 반영'), el('p', {class: 'meta'}, '워커가 확신해서 이미 반영한 값입니다. 틀린 값만 되돌리기를 요청하세요(다음 워커 실행 때 복원, 이력은 남음).'), msg, list);
    (async () => {
      try {
        const {data} = await api(`facility_changes?select=*&status=eq.auto_applied&created_at=gte.${encodeURIComponent(new Date(Date.now() - 7 * 864e5).toISOString())}&order=created_at.desc&limit=100`);
        if (!data.length) return list.append(el('p', {class: 'meta'}, '없음'));
        for (const c of data) list.append(el('div', {class: 'item'}, el('div', {}, tag('자동 반영', 'good'), ` #${c.id} · ${c.facility_id} · ${c.field} · ${when(c.created_at)}`),
          el('div', {class: 'meta'}, '새 값'), el('pre', {}, pretty(c.new_value)), el('div', {class: 'meta'}, '근거 인용'), el('pre', {}, c.evidence || '-'), el('div', {class: 'meta'}, '출처: ', link(c.source_url)),
          el('div', {class: 'acts'}, el('button', {type: 'button', class: 'btn danger', on: {click: async () => { const r = await patch(`facility_changes?id=eq.${c.id}`, {status: 'revert_requested', reviewed_by: session.user.id}, msg); if (r) { rerun(); list.replaceChildren(); } }}}, '되돌리기 요청'))));
      } catch (e) { say(msg, e.message, 'err'); }
    })();
    return box;
  }
  function viewChanges() {
    const v = listView({
      filters: [['st', '상태', sel('st', [['pending_review', '검토 대기'], ['', '전체'], ['approved', '승인(반영 대기)'], ['applied', '반영됨'], ['revert_requested', '되돌리기 요청'], ['reverted', '되돌림'], ['auto_applied', '자동 반영'], ['rejected', '반려']])], ['fid', '시설 id', el('input', {maxlength: 80})]],
      path: (v) => `facility_changes?select=*&order=created_at.desc${v.st ? `&status=eq.${v.st}` : ''}${clean(v.fid) ? `&facility_id=ilike.*${encodeURIComponent(clean(v.fid))}*` : ''}`,
      row: (c, rerun) => {
        const box = msgBox(), review = (label, status, cls) => el('button', {type: 'button', class: 'btn ' + cls, on: {click: async () => {
          const r = await patch(`facility_changes?id=eq.${c.id}`, {status, reviewed_by: session.user.id}, box); if (r) rerun();
        }}}, label);
        const wait = ['pending_review', 'approved', 'revert_requested'].includes(c.status);
        return el('div', {class: 'item'}, el('div', {}, tag(ST_KO[c.status] || c.status, c.status === 'rejected' ? 'bad' : wait ? 'warn' : 'good'), ` #${c.id} · ${c.facility_id} · ${c.field} · ${when(c.created_at)}`),
          flowNode(c.status),
          el('div', {class: 'meta'}, '이전 값'), el('pre', {}, pretty(c.old_value)), el('div', {class: 'meta'}, '새 값'), el('pre', {}, pretty(c.new_value)),
          el('div', {class: 'meta'}, '근거 인용'), el('pre', {}, c.evidence || '-'), el('div', {class: 'meta'}, '출처: ', link(c.source_url)),
          c.applied_at ? el('div', {class: 'meta'}, `반영 ${when(c.applied_at)}${c.reverted_at ? ` · 되돌림 ${when(c.reverted_at)}` : ''}`) : null,
          c.apply_note ? el('div', {class: 'meta'}, `워커 메모(반려 사유): ${c.apply_note}`) : null,
          c.status === 'pending_review' ? el('div', {class: 'acts'}, review('승인 (반영 예약)', 'approved', 'primary'), review('반려', 'rejected', 'danger')) : null,
          c.status === 'pending_review' ? el('p', {class: 'meta'}, '승인하면 다음 워커 실행 때 시설 데이터에 반영됩니다. 반려하면 반영되지 않습니다.') : null,
          c.status === 'approved' ? el('div', {class: 'acts'}, review('승인 취소(반려)', 'rejected', 'danger')) : null,
          c.status === 'approved' ? el('p', {class: 'meta'}, '워커가 곧 반영합니다. 그 전이면 취소할 수 있습니다.') : null,
          ['applied', 'auto_applied'].includes(c.status) ? el('div', {class: 'acts'}, review('되돌리기 요청', 'revert_requested', 'danger')) : null,
          ['applied', 'auto_applied'].includes(c.status) ? el('p', {class: 'meta'}, '되돌리기를 요청하면 다음 워커 실행 때 이전 값으로 복원됩니다(이력은 남습니다).') : null,
          c.status === 'revert_requested' ? el('p', {class: 'meta'}, '워커가 다음 실행 때 되돌립니다.') : null, box);
      }});
    return {node: el('div', {}, recentAuto(v.run), el('p', {class: 'msg'}, '흐름: 대기 → 승인 → 반영됨(워커) → 되돌림. 승인하면 다음 워커 실행 때 시설 데이터(record.monitor)에 반영됩니다. 원본 필드는 바뀌지 않습니다.'), v.node), run: v.run};
  }

  // 이미 DB에 반영된 변경과 공개 공지를 한 화면에서 확인한다.
  async function viewApplied() {
    const root = el('div', {}), status = msgBox(), content = el('div', {});
    const refresh = el('button', {type: 'button', class: 'btn', on: {click: () => load()}}, '새로고침');
    root.append(el('h2', {}, 'DB 반영 내역'), el('p', {class: 'msg'}, '시설에 반영된 가격·시간과 공개된 공지를 최근 순으로 확인합니다. 웹 화면에는 다음 갱신 시 반영됩니다.'), refresh, status, content);
    async function load() {
      say(status, '불러오는 중…');
      try {
        const [changes, notices] = await Promise.all([
          api('facility_changes?select=id,facility_id,field,old_value,new_value,evidence,source_url,status,created_at,applied_at&status=in.(applied,auto_applied)&order=created_at.desc&limit=100'),
          api('facility_notices?select=id,facility_id,title,summary_ko,source_url,notice_date,detected_at&published=eq.true&order=detected_at.desc&limit=100')
        ]);
        const ids = [...new Set(changes.data.map(c => c.facility_id).filter(id => /^[\w-]{1,80}$/.test(id)))];
        const facilities = ids.length ? (await api(`onsen_facilities?select=id,record&id=in.(${ids.map(encodeURIComponent).join(',')})`)).data : [];
        const current = new Map(facilities.map(f => [f.id, f.record?.monitor || {}]));
        const matches = c => { const v = current.get(c.facility_id)?.[c.field]; return !!v && (c.status === 'applied' ? String(v.change_id) === String(c.id) : v.quote === c.evidence && v.source_url === c.source_url); };
        const rows = [
          ...changes.data.map(c => ({time:c.applied_at || c.created_at, kind:c.field === 'price' ? '가격' : '시간', state:matches(c) ? '현재 적용' : '이력 · 현재 값 다름', fid:c.facility_id, title:pretty(c.new_value), previous:c.old_value == null ? '' : pretty(c.old_value), evidence:c.evidence, url:c.source_url})),
          ...notices.data.map(n => ({time:n.detected_at, kind:'공지', fid:n.facility_id, title:n.title, evidence:n.summary_ko, url:n.source_url}))
        ].sort((a,b) => Date.parse(b.time) - Date.parse(a.time));
        content.replaceChildren(...(rows.length ? rows.map(r => el('article', {class:'item'},
          el('div', {}, tag(r.kind, 'good'), ' ', r.state ? tag(r.state, r.state === '현재 적용' ? 'good' : 'warn') : null, ' ', el('strong', {}, r.fid), ' · ', when(r.time)),
          el('p', {}, r.title || '-'), r.previous ? el('p', {class:'meta'}, '이전 값: ', r.previous) : null,
          el('p', {class:'meta'}, r.evidence || '근거 없음'), el('p', {class:'meta'}, '출처: ', link(r.url)))) : [el('p', {class:'msg'}, '반영된 내역이 없습니다.')]));
        say(status, `최근 가격·시간 ${changes.data.length}건, 공지 ${notices.data.length}건 (각 최대 100건)`);
      } catch (e) { say(status, e.message, 'err'); }
    }
    await load(); return root;
  }

  // ---- 탭: 이미지 ----
  function viewPhotos() {
    return listView({
      filters: [['lic', '라이선스', sel('lic', [['', '전체'], ['unverified', 'unverified'], ['verified', 'verified'], ['rejected', 'rejected']])], ['fid', '시설 id', el('input', {maxlength: 80})]],
      path: (v) => `photo_assets?select=*&order=discovered_at.desc${v.lic ? `&license_status=eq.${v.lic}` : ''}${clean(v.fid) ? `&facility_id=ilike.*${encodeURIComponent(clean(v.fid))}*` : ''}`,
      row: (p, rerun) => {
        const box = msgBox(), lic = sel('license_status', ['unverified', 'verified', 'rejected'].map((s) => [s, s])); lic.value = p.license_status;
        const go = (body) => async () => { const r = await patch(`photo_assets?id=eq.${p.id}`, body, box); if (r) rerun(); };
        // 라이선스가 verified 에서 벗어나면 공개도 같이 내린다(공개는 verified 일 때만 가능).
        const saveLic = el('button', {type: 'button', class: 'btn', on: {click: async () => go(lic.value === 'verified' ? {license_status: 'verified'} : {license_status: lic.value, published: false})()}}, '라이선스 저장');
        return el('div', {class: 'item'}, el('div', {}, tag(p.published ? '공개' : '비공개', p.published ? 'good' : 'warn'), ` #${p.id} · ${p.facility_id} · ${when(p.discovered_at)}`),
          el('div', {class: 'meta'}, '이미지 주소(미리보기 없음): ', link(p.image_url)), el('div', {class: 'meta'}, `sha256 ${p.sha256}`),
          p.ai_checked_at ? el('div', {class: 'meta'}, `AI 분류: ${LABEL_KO[p.ai_label] || p.ai_label || '-'} (${p.ai_confidence ?? '-'}) · 상태 ${STATE_KO[p.publish_state] || p.publish_state}`) : null,
          field('라이선스 상태', lic), el('div', {class: 'acts'}, saveLic,
            el('button', {type: 'button', class: 'btn primary', disabled: p.license_status !== 'verified', title: p.license_status !== 'verified' ? '라이선스 확인(verified) 후에만 공개할 수 있습니다' : '', on: {click: go({published: !p.published})}}, p.published ? '공개 해제' : '공개')), box);
      }});
  }

  // ---- 탭: AI 로그 ----
  const AI_KIND_KO = {notice_summary: '공지 요약', change_summary: '변경 요약', image_classify: '이미지 분류'};
  const AI_REV_KO = {unreviewed: '미검토', accepted: '승인', rejected: '반려', edited: '수정'};
  function viewAiLogs() {
    return listView({
      filters: [['kind', '종류', sel('kind', [['', '전체'], ...Object.entries(AI_KIND_KO)])], ['status', '상태', sel('status', [['', '전체'], ...['ok', 'error', 'skipped', 'mock'].map((s) => [s, s])])],
        ['rev', '검토', sel('rev', [['unreviewed', '미검토'], ['', '전체'], ['accepted', '승인'], ['rejected', '반려'], ['edited', '수정']])], ['fid', '시설 id', el('input', {maxlength: 80})]],
      path: (v) => 'ai_logs?select=*&order=created_at.desc' + (v.kind ? '&kind=eq.' + v.kind : '') + (v.status ? '&status=eq.' + v.status : '') + (v.rev ? '&review_status=eq.' + v.rev : '') + (clean(v.fid) ? '&facility_id=ilike.*' + encodeURIComponent(clean(v.fid)) + '*' : ''),
      empty: 'AI 로그가 없습니다. (키 없이도 사진 분류 결과는 규칙 분류(rules-v1)로 여기에 쌓입니다.)',
      row: (l, rerun) => {
        const box = msgBox(), o = l.output || {}, isSum = l.kind === 'notice_summary', reviewable = l.status === 'ok' || l.status === 'mock';
        const ta = isSum ? el('textarea', {'aria-label': '한국어 요약 수정', maxlength: 600}) : null; if (ta) ta.value = l.reviewed_summary_ko || o.summary_ko || '';
        const go = (status, cls, label) => el('button', {type: 'button', class: 'btn ' + cls, on: {click: async () => {
          if (status === 'edited' && !ta.value.trim()) return say(box, '수정할 요약을 입력하세요.', 'err');
          try { await api('rpc/ai_log_review', {method: 'POST', body: {p_id: l.id, p_status: status, p_summary: status === 'edited' ? ta.value.trim() : null}}); say(box, '저장했습니다.', 'ok'); rerun(); } catch (e) { say(box, e.message, 'err'); }
        }}}, label);
        const dg = l.input_digest || {};
        return el('div', {class: 'item'}, el('div', {}, tag(l.status, l.status === 'error' ? 'bad' : l.status === 'ok' ? 'good' : l.status === 'skipped' ? '' : 'warn'), ' ', tag(AI_KIND_KO[l.kind] || l.kind), ' ', tag(AI_REV_KO[l.review_status] || l.review_status, l.review_status === 'unreviewed' ? 'warn' : 'good'), ` #${l.id} · ${l.facility_id || '-'} · ${when(l.created_at)}`),
          el('div', {class: 'meta'}, `모델 ${l.model} · 토큰 입력 ${l.tokens_in} / 출력 ${l.tokens_out}${l.notice_id ? ` · 공지 #${l.notice_id}` : ''}${l.photo_id ? ` · 사진 #${l.photo_id}` : ''}${l.change_id ? ` · 변경 #${l.change_id}` : ''}`),
          el('div', {class: 'meta'}, '입력(해시 + 발췌, 전체 원문 아님)'), el('pre', {}, `${dg.excerpt || '-'}\nsha256 ${String(dg.sha256 || '').slice(0, 16)}…`),
          el('div', {class: 'meta'}, '출력'), el('pre', {}, isSum ? (o.summary_ko || '(요약 없음)') : `${(o.labels || []).map((x) => LABEL_KO[x] || x).join(', ') || '-'} · 신뢰도 ${o.confidence ?? '-'}${o.reason ? `\n${o.reason}` : ''}${o.publish_state ? `\n판정: ${STATE_KO[o.publish_state] || o.publish_state}` : ''}`),
          l.error ? el('pre', {}, l.error) : null,
          l.reviewed_at ? el('div', {class: 'meta'}, `검토 ${when(l.reviewed_at)}`) : null,
          ta ? field('한국어 요약 (수정하면 공지 요약(summary_ko)도 바뀝니다)', ta) : null,
          reviewable ? el('div', {class: 'acts'}, go('accepted', 'primary', '승인'), ta ? go('edited', '', '수정 저장') : null, go('rejected', 'danger', '반려')) : null,
          reviewable && isSum ? el('p', {class: 'meta'}, '반려하면 이 AI 요약을 공지에서 지우고 비공개로 돌립니다(공지 본문은 그대로).') : null,
          reviewable && !isSum ? el('p', {class: 'meta'}, '검토 표시만 남습니다. 사진 공개 여부는 "로고·사진 승인" 탭에서 정합니다.') : null, box);
      }});
  }

  // ---- 탭: 로고·사진 승인 ----
  // AI는 저작권을 판단하지 못한다. 라이선스 보류(hold_license)와 로고 검토(logo_review)만 모아 관리자가 승인/반려한다. 규칙은 DB 트리거(photo_assets_guard)가 한 번 더 막는다.
  function viewApprovals() {
    return listView({
      filters: [['st', '상태', sel('st', [['hold_license,logo_review', '전체 대기'], ['hold_license', '라이선스 보류'], ['logo_review', '로고 검토']])], ['fid', '시설 id', el('input', {maxlength: 80})]],
      path: (v) => 'photo_assets?select=*&order=discovered_at.desc&publish_state=in.(' + v.st + ')' + (clean(v.fid) ? '&facility_id=ilike.*' + encodeURIComponent(clean(v.fid)) + '*' : ''),
      empty: '승인 대기 중인 사진·로고가 없습니다.',
      row: (p, rerun) => {
        const box = msgBox(), logo = p.publish_state === 'logo_review';
        const act = (label, cls, body, ask) => el('button', {type: 'button', class: 'btn ' + cls, on: {click: async () => {
          if (ask && !window.confirm(ask)) return;
          const r = await patch(`photo_assets?id=eq.${p.id}`, body, box); if (r) rerun();
        }}}, label);
        return el('div', {class: 'item'}, el('div', {}, tag(STATE_KO[p.publish_state] || p.publish_state, 'warn'), ' ', tag(LABEL_KO[p.ai_label] || p.ai_label || '-'), ` #${p.id} · ${p.facility_id} · ${when(p.discovered_at)}`),
          el('div', {class: 'meta'}, `AI 신뢰도 ${p.ai_confidence ?? '-'} · ${p.ai_reason || '-'}`),
          el('div', {class: 'meta'}, `라이선스 ${p.license_status} · 출처 ${p.license_source || '미기록'}${p.license_note ? ` · ${p.license_note}` : ''}`),
          el('div', {class: 'meta'}, '이미지 주소(미리보기 없음, 열어서 확인): ', link(p.image_url)),
          el('p', {class: 'meta'}, logo ? '로고는 시설 공식 사이트 링크 옆 작은 식별용으로만 쓸 후보입니다. 승인해도 사진으로 공개되지는 않습니다.' : '공식/출처 불명 사진은 공개하지 않고 공식 페이지 링크만 둡니다. 사용 허락·라이선스를 직접 확인한 경우에만 승인하세요(승인 = verified + 공개).'),
          el('div', {class: 'acts'}, logo ? act('로고 사용 승인', 'primary', {publish_state: 'logo_approved'}, '이 로고를 식별용 후보로 승인합니다.') : act('라이선스 확인함 · 승인(공개)', 'primary', {license_status: 'verified', publish_state: 'approved', published: true}, '사용 허락/라이선스를 직접 확인했고 공개합니다. 계속할까요?'),
            act('반려', 'danger', {publish_state: 'rejected', published: false})), box);
      }});
  }

  // ---- 탭: 오류 로그 ----
  function viewLogs() {
    return listView({
      filters: [['fid', '시설 id', el('input', {maxlength: 80})], ['kind', '종류', sel('kind', [['', '전체'], ...KINDS.map((k) => [k, KIND_KO[k]])])], ['result', '결과', el('input', {maxlength: 40, placeholder: 'failed, skipped…'})],
        ['level', '수준', sel('level', [['', '전체'], ['info', 'info'], ['warn', 'warn'], ['error', 'error']])], ['q', '본문 검색', el('input', {maxlength: 60})]],
      path: (v) => `monitor_logs?select=*&order=ts.desc${clean(v.fid) ? `&facility_id=ilike.*${encodeURIComponent(clean(v.fid))}*` : ''}${v.kind ? `&job_kind=eq.${v.kind}` : ''}${clean(v.result) ? `&result=ilike.*${encodeURIComponent(clean(v.result))}*` : ''}${v.level ? `&level=eq.${v.level}` : ''}${clean(v.q) ? `&or=(error_cause.ilike.*${encodeURIComponent(clean(v.q))}*,result.ilike.*${encodeURIComponent(clean(v.q))}*)` : ''}`,
      row: (l) => el('div', {class: 'item'}, el('div', {}, tag(l.level, l.level === 'error' ? 'bad' : l.level === 'warn' ? 'warn' : ''), ` ${when(l.ts)} · ${l.facility_id || '-'} · ${l.job_kind || '-'} · ${l.result || '-'}`),
        l.error_cause ? el('pre', {}, l.error_cause) : null, l.meta ? el('div', {class: 'meta'}, pretty(l.meta)) : null)});
  }

  // ---- 탭: AI 사용량 ----
  async function viewAi() {
    const root = el('div', {}), status = msgBox(); root.append(status);
    try {
      const rows = await all('ai_usage?select=ts,model,input_tokens,output_tokens,est_cost_usd&order=ts.desc');
      const sum = (a, f) => a.reduce((s, r) => s + Number(f(r) || 0), 0), day = new Map();
      for (const r of rows) { const d = new Date(r.ts).toLocaleDateString('sv-SE'); const o = day.get(d) || {n: 0, i: 0, o: 0, c: 0}; o.n++; o.i += r.input_tokens || 0; o.o += r.output_tokens || 0; o.c += Number(r.est_cost_usd || 0); day.set(d, o); }
      root.append(el('div', {class: 'grid'}, [[rows.length, '호출 수'], [sum(rows, (r) => r.input_tokens).toLocaleString(), '입력 토큰'], [sum(rows, (r) => r.output_tokens).toLocaleString(), '출력 토큰'], ['$' + sum(rows, (r) => r.est_cost_usd).toFixed(4), '추정 비용']].map(([n, t]) => el('div', {class: 'stat'}, el('b', {}, n), el('span', {}, t)))),
        el('h3', {}, '일별'), table(['날짜', '호출', '입력 토큰', '출력 토큰', '추정 비용(USD)'], [...day].map(([d, o]) => [d, o.n, o.i.toLocaleString(), o.o.toLocaleString(), o.c.toFixed(4)])),
        el('p', {class: 'msg'}, rows.length ? '' : '아직 AI 사용 기록이 없습니다. 비용은 추정치입니다.'));
    } catch (e) { say(status, e.message, 'err'); }
    return root;
  }

  // ---- 탭 틀 ----
  const TABS = [['overview', '현황', viewOverview], ['jobs', '대기열', viewJobs], ['notices', '공지', viewNotices], ['changes', '변경 이력', viewChanges], ['applied', 'DB 반영 내역', viewApplied], ['photos', '이미지', viewPhotos], ['logs', '오류 로그', viewLogs], ['ai', 'AI 사용량', viewAi], ['ailogs', 'AI 로그', viewAiLogs], ['approvals', '로고·사진 승인', viewApprovals]];
  // 하트비트 배너(워커 실행 끝에 monitor_logs result='heartbeat'). 최신 하트비트가 실패이거나, 정상 하트비트가 3시간보다 오래되면 빨간 배너. 규칙은 tools/monitor/worker.mjs heartbeatState 와 같다.
  async function heartbeatBanner() {
    let b = $('hbBanner');
    if (!b) { b = el('div', {id: 'hbBanner', role: 'alert', hidden: true}); b.style.cssText = 'margin:0 0 12px;padding:10px 14px;border-radius:8px;font-weight:600;border:1px solid var(--bad);background:var(--bad-bg);color:var(--bad)'; $('panel').before(b); }
    try {
      const {data} = await api('monitor_logs?select=ts,level,meta&result=eq.heartbeat&order=ts.desc&limit=20');
      const hb = data || [], ok = (r) => r.level !== 'error' && !(r.meta && r.meta.ok === false), good = hb.find(ok);
      let msg = '';
      if (!hb.length) msg = '모니터 하트비트가 아직 없습니다. 워커가 한 번도 정상 종료하지 않았거나 실행되지 않았습니다.';
      else if (hb[0] !== good) msg = `마지막 모니터 실행이 실패했습니다 (${when(hb[0].ts)}, ${rel(hb[0].ts)}). GitHub Actions 로그를 확인하세요.`;
      else if (Date.now() - Date.parse(good.ts) > 3 * 3600000) msg = `모니터가 3시간 넘게 정상 실행되지 않았습니다. 마지막 성공 ${when(good.ts)} (${rel(good.ts)}). 외부 cron/Actions 상태를 확인하세요.`;
      b.textContent = msg; b.hidden = !msg;
    } catch { b.hidden = true; }
  }
  async function openTab(id) {
    heartbeatBanner();
    const [, , view] = TABS.find((t) => t[0] === id);
    document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === id));
    const panel = $('panel'); panel.replaceChildren(el('p', {class: 'msg'}, '불러오는 중…'));
    const node = await view();
    panel.replaceChildren(node.node || node);
    if (node.run) node.run();
  }
  function showApp() {
    $('who').textContent = session.user.email || ''; $('signout').hidden = false;
    $('tabs').replaceChildren(...TABS.map(([id, label]) => el('button', {type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': 'false', on: {click: () => openTab(id)}}, label)));
    $('app').hidden = false; openTab('overview');
  }
  function reset(which) {
    for (const id of ['login', 'denied', 'app', 'boot']) $(id).hidden = id !== which;
    $('signout').hidden = which !== 'app'; if (which !== 'app') { $('who').textContent = ''; $('panel').replaceChildren(); $('tabs').replaceChildren(); }
  }
  async function enter() { // 로그인 직후/복원 후: 관리자 행이 보이는지(본인 행만 SELECT 가능) 확인한다
    try {
      const {data} = await api(`admins?select=user_id&user_id=eq.${encodeURIComponent(session.user.id)}`);
      if (data.length === 1) { reset('app'); return showApp(); }
      await signOut(); reset('denied');
    } catch (e) { await signOut(); reset('login'); say($('loginMsg'), e.message, 'err'); }
  }
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button'); btn.disabled = true; say($('loginMsg'), '로그인 중…');
    try { await login(f.email.value.trim(), f.password.value); f.password.value = ''; say($('loginMsg'), ''); reset('boot'); await enter(); }
    catch (err) { say($('loginMsg'), err.message, 'err'); } finally { btn.disabled = false; }
  });
  $('signout').addEventListener('click', async () => { await signOut(); reset('login'); });
  session = load();
  if (session) enter(); else reset('login');
})();
