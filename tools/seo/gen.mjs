#!/usr/bin/env node
// SEO 생성기: 도메인을 한 곳(SITE_URL 환경변수)에서만 정하고, 아래를 다시 쓴다.
//   web/index.html, web/ja.html, web/en.html 의 <!-- seo:head --> 블록(title, description, canonical, hreflang, OG, Twitter, JSON-LD)
//   같은 파일의 <!-- seo:noscript --> 블록(JS 없이 보이는 안내)
//   web/sitemap.xml, web/robots.txt
// 사용:  SITE_URL=https://실제도메인 node tools/seo/gen.mjs        (PowerShell: $env:SITE_URL='https://...'; node tools/seo/gen.mjs)
// SITE_URL 이 없으면 "미설정" 모드: 절대 URL이 필요한 태그(canonical/hreflang/og:url/og:image)는 넣지 않고,
//   sitemap.xml 은 예약 도메인(.invalid) 자리표시자로 만든다. 이 상태로 배포해도 검색엔진에 잘못된 도메인을 알리지 않는다.
// 실제 도메인은 오너가 정한다(코드에 도메인을 만들어 넣지 않는다). 빌드 단계가 없으므로 결과 파일은 커밋해서 배포한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'web');
const PLACEHOLDER = 'https://SITE_URL_NOT_SET.invalid';
const raw = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
if (raw && !/^https:\/\/[a-z0-9.-]+(:\d+)?(\/[\w./-]*)?$/i.test(raw)) { console.error(`SITE_URL must look like https://example.com (got "${raw}")`); process.exit(1); }
const SET = !!raw;
// JSON-LD 는 inline <script> 라 현재 tools/security/check.mjs(f-csp)가 실패로 본다. check.mjs 에서 type=application/ld+json 을 예외로 허용한 뒤 SEO_JSONLD=1 로 켠다(README 참고).
const JSONLD = process.env.SEO_JSONLD === '1';
const BASE = SET ? raw : PLACEHOLDER;
if (!SET) console.warn('WARNING: SITE_URL not set. canonical/hreflang/og:url/og:image are omitted and sitemap.xml uses a placeholder host. Set SITE_URL before the real launch.');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PAGES = { ko: 'index.html', ja: 'ja.html', en: 'en.html' };
const PATHS = { ko: '/', ja: '/ja.html', en: '/en.html' }; // 홈은 도메인 루트로 통일
const OG_IMAGE = '/images/gunma.jpg'; // 로컬 사진(저작자·라이선스는 자료 출처 페이지에 표기)
const OG_LOCALE = { ko: 'ko_KR', ja: 'ja_JP', en: 'en_US' };
const C = {
  ko: {
    name: '온천 한눈에', title: '온천 한눈에 | 일본 온천 숙소·당일 온천 찾기',
    desc: '일본 온천 숙소와 당일 온천을 지역, 탕, 온천수, 예산으로 비교해 찾는 안내 사이트',
    alt: '일본 온천 풍경 사진',
    ns: ['온천 한눈에', '일본 온천 숙소와 당일 온천을 지역, 탕, 온천수, 예산으로 비교해 찾는 안내 사이트입니다.', '시설 목록과 지도, 비교 기능은 JavaScript가 켜져 있어야 표시됩니다. JavaScript를 켜 주세요. 아래 안내 페이지는 그대로 볼 수 있습니다.', ['guide.html', '온천 여행 가이드'], ['water.html', '온천수 종류 안내'], ['sources.html?lang=ko', '자료 출처와 이용 조건'], ['legal/terms.html', '이용약관'], ['legal/privacy.html', '개인정보 처리방침'], ['legal/contact.html', '문의'], '언어']
  },
  ja: {
    name: '温泉ひとめぐり', title: '温泉ひとめぐり | 日本の温泉旅館・日帰り温泉を探す',
    desc: '日本の温泉旅館・日帰り温泉を、地域・お風呂・泉質・予算から探せる案内サイト',
    alt: '日本の温泉風景の写真',
    ns: ['温泉ひとめぐり', '日本の温泉旅館・日帰り温泉を、地域・お風呂・泉質・予算から探せる案内サイトです。', '施設一覧・地図・比較機能の表示には JavaScript が必要です。JavaScript を有効にしてください。下のご案内ページはそのままご覧いただけます。', ['guide-ja.html', '温泉旅行ガイド'], ['water-ja.html', '泉質のご案内'], ['sources.html?lang=ja', '情報・写真の出典'], ['legal/terms-ja.html', '利用規約'], ['legal/privacy-ja.html', 'プライバシーポリシー'], ['legal/contact-ja.html', 'お問い合わせ'], '言語']
  },
  en: {
    name: 'Onsen at a Glance', title: 'Onsen at a Glance | Find your onsen stay',
    desc: 'Find Japanese onsen ryokan and day-use hot springs by region, bath type, spring water and budget',
    alt: 'Photo of a Japanese hot spring scene',
    ns: ['Onsen at a Glance', 'A guide for finding Japanese onsen ryokan and day-use hot springs by region, bath type, spring water and budget.', 'The property list, map and comparison tools need JavaScript. Please turn JavaScript on. The guide pages below work without it.', ['guide-en.html', 'Onsen travel guide'], ['water-en.html', 'Spring water types'], ['sources.html?lang=en', 'Information and photo credits'], ['legal/terms-en.html', 'Terms of use'], ['legal/privacy-en.html', 'Privacy policy'], ['legal/contact-en.html', 'Contact'], 'Language']
  },
};
const url = p => BASE + p;

function headBlock(lang) {
  const c = C[lang];
  const L = [];
  L.push(`<title>${esc(c.title)}</title>`, `<meta name="description" content="${esc(c.desc)}">`);
  if (SET) {
    L.push(`<link rel="canonical" href="${esc(url(PATHS[lang]))}">`);
    for (const l of ['ko', 'ja', 'en']) L.push(`<link rel="alternate" hreflang="${l}" href="${esc(url(PATHS[l]))}">`);
    L.push(`<link rel="alternate" hreflang="x-default" href="${esc(url(PATHS.ko))}">`);
  }
  L.push(`<meta property="og:type" content="website">`, `<meta property="og:site_name" content="${esc(c.name)}">`, `<meta property="og:title" content="${esc(c.title)}">`, `<meta property="og:description" content="${esc(c.desc)}">`, `<meta property="og:locale" content="${OG_LOCALE[lang]}">`);
  for (const l of ['ko', 'ja', 'en']) if (l !== lang) L.push(`<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`);
  L.push(`<meta name="twitter:card" content="${SET ? 'summary_large_image' : 'summary'}">`, `<meta name="twitter:title" content="${esc(c.title)}">`, `<meta name="twitter:description" content="${esc(c.desc)}">`);
  if (SET) L.push(`<meta property="og:url" content="${esc(url(PATHS[lang]))}">`, `<meta property="og:image" content="${esc(url(OG_IMAGE))}">`, `<meta property="og:image:alt" content="${esc(c.alt)}">`, `<meta name="twitter:image" content="${esc(url(OG_IMAGE))}">`);
  const ld = { '@context': 'https://schema.org', '@type': 'WebSite', name: c.name, description: c.desc, inLanguage: lang };
  if (SET) ld.url = url(PATHS[lang]);
  if (JSONLD) L.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  return `<!-- seo:head:begin (generated by tools/seo/gen.mjs; do not edit by hand) -->\n${L.join('\n')}\n<!-- seo:head:end -->`;
}

function noscriptBlock(lang) {
  const [h, p, js, g, w, s, t, pr, ct, langLabel] = C[lang].ns;
  const a = ([href, text]) => `<a href="${esc(href)}">${esc(text)}</a>`;
  const langs = [['index.html', '한국어'], ['ja.html', '日本語'], ['en.html', 'English']].filter(([f]) => f !== PAGES[lang]).map(a).join(' · ');
  return `<!-- seo:noscript:begin (generated by tools/seo/gen.mjs; do not edit by hand) -->
<noscript>
<main style="max-width:720px;margin:0 auto;padding:32px 20px;font:17px/1.8 system-ui,sans-serif">
<h1>${esc(h)}</h1>
<p>${esc(p)}</p>
<p>${esc(js)}</p>
<ul>
<li>${a(g)}</li>
<li>${a(w)}</li>
<li>${a(s)}</li>
<li>${a(t)} · ${a(pr)} · ${a(ct)}</li>
<li>${esc(langLabel)}: ${langs}</li>
</ul>
</main>
</noscript>
<!-- seo:noscript:end -->`;
}

function rewrite(file, lang) {
  const f = path.join(WEB, file);
  let s = fs.readFileSync(f, 'utf8');
  const hRe = /<!-- seo:head:begin[\s\S]*?<!-- seo:head:end -->/;
  const nRe = /<!-- seo:noscript:begin[\s\S]*?<!-- seo:noscript:end -->/;
  if (hRe.test(s)) s = s.replace(hRe, () => headBlock(lang));
  else {
    // 최초 1회: 기존 title/description/canonical/alternate 를 지우고 viewport 다음에 블록을 넣는다.
    s = s.replace(/<title>[\s\S]*?<\/title>\s*/i, '').replace(/<meta name="description"[^>]*>\s*/i, '').replace(/<link rel="canonical"[^>]*>\s*/i, '').replace(/(<link rel="alternate" hreflang=[^>]*>\s*)+/gi, '');
    if (!/<meta name="viewport"[^>]*>/.test(s)) throw new Error(`${file}: viewport meta not found`);
    s = s.replace(/(<meta name="viewport"[^>]*>)/, (m) => `${m}\n${headBlock(lang)}`);
  }
  if (nRe.test(s)) s = s.replace(nRe, () => noscriptBlock(lang));
  else s = s.replace(/<body>\s*/, m => `${m}${noscriptBlock(lang)}\n`);
  fs.writeFileSync(f, s);
}
for (const [lang, file] of Object.entries(PAGES)) rewrite(file, lang);

// sitemap: 홈 3개 + 가이드/온천수 안내 각 3개. 모든 언어판을 hreflang 으로 서로 묶는다.
const GROUPS = [
  { ko: '/', ja: '/ja.html', en: '/en.html' },
  { ko: '/guide.html', ja: '/guide-ja.html', en: '/guide-en.html' },
  { ko: '/water.html', ja: '/water-ja.html', en: '/water-en.html' },
];
const entries = [];
for (const g of GROUPS) for (const l of ['ko', 'ja', 'en']) {
  const alts = ['ko', 'ja', 'en'].map(x => `    <xhtml:link rel="alternate" hreflang="${x}" href="${esc(url(g[x]))}"/>`).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(url(g.ko))}"/>`).join('\n');
  entries.push(`  <url>\n    <loc>${esc(url(g[l]))}</loc>\n${alts}\n  </url>`);
}
fs.writeFileSync(path.join(WEB, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(WEB, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n${SET ? `\nSitemap: ${url('/sitemap.xml')}\n` : '\n# Sitemap: (SITE_URL not set; run tools/seo/gen.mjs with SITE_URL to add the Sitemap line)\n'}`);
console.log(`seo: ${SET ? 'SITE_URL=' + BASE : 'placeholder mode'}; rewrote ${Object.values(PAGES).join(', ')}, sitemap.xml, robots.txt`);
