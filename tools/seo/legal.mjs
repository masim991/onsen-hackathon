#!/usr/bin/env node
// web/legal/*.html (terms/privacy/contact x ko/ja/en) 생성기. 본문은 이 파일이 원본이다. 실행: node tools/seo/legal.mjs
// 실제 문의 이메일은 넣지 않는다(오너가 정한 뒤 contact 문구를 고친다: web/README.md 참고).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'legal');
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://upload.wikimedia.org https://commons.wikimedia.org https://cyberjapandata.gsi.go.jp; connect-src 'self' https://frncsllpkxrsgxyqsfwd.supabase.co https://open.er-api.com https://api.frankfurter.dev https://cdn.jsdelivr.net; object-src 'none'; base-uri 'self'; form-action 'self'";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const T = {
  ko: {
    name: '온천 한눈에', home: '← 온천 찾기로', sources: '자료 출처', nav: { terms: '이용약관', privacy: '개인정보 처리방침', contact: '문의' }, updated: '최종 수정: 2026년 11월',
    terms: ['이용약관', [
      ['서비스', '온천 한눈에는 일본 온천 시설의 정보를 모아 보여 주는 정보 서비스입니다. 예약과 결제는 각 시설 또는 예약 사이트에서 이루어지며, 이 사이트는 예약·결제를 대행하지 않습니다.'],
      ['요금과 정보의 정확성', '요금, 운영 시간, 휴업일, 시설 정보는 예고 없이 바뀔 수 있습니다. 표시된 요금은 확인 시점 기준의 참고 값이며, 환산 금액은 환율에 따라 달라지는 “약”의 값입니다. 실제 결제는 엔화로 이루어지고 세금·입탕세·서비스료·인원·시즌에 따라 달라질 수 있습니다. 방문하거나 예약하기 전에 반드시 공식 사이트에서 확인해 주세요. 요금이 표시되지 않은 시설은 확인된 정보가 없다는 뜻입니다.'],
      ['사진과 저작물', '사진은 각 저작자와 라이선스 조건(예: CC BY-SA 등)을 따릅니다. 사진은 해당 시설의 현재 모습과 다를 수 있으며, 저작자와 이용 조건은 자료 출처 페이지에서 확인할 수 있습니다.'],
      ['외부 링크와 광고·제휴 표시', '시설 공식 사이트 등 외부 링크가 있으며, 외부 사이트의 내용과 서비스는 해당 운영자의 책임입니다. 현재 이 사이트의 링크에는 제휴(어필리에이트) 수수료나 광고 대가가 붙어 있지 않습니다. 앞으로 제휴 링크를 도입하면 해당 링크에 그 사실을 분명히 표시합니다.'],
      ['책임의 제한', '이 사이트의 정보를 이용해 생긴 손해에 대해, 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.'],
      ['약관의 변경', '약관은 필요에 따라 바뀔 수 있으며, 바뀐 내용은 이 페이지에 게시합니다.']]],
    privacy: ['개인정보 처리방침', [
      ['수집하는 정보', '회원가입과 로그인이 없으며, 이름·이메일 같은 개인정보를 수집하지 않습니다. 이용자 기록을 서버에 저장하지도 않습니다.'],
      ['브라우저에 저장되는 값', '찜 목록, 화면 모드(밝게/어둡게), 첫 화면(인트로) 표시 여부는 이용자 기기의 브라우저에만 저장됩니다. 브라우저 저장소를 지우면 사라집니다.'],
      ['외부 서비스 접속', '화면을 표시하기 위해 이용자의 브라우저가 Supabase(시설 목록), Wikimedia Commons(사진), Google Fonts와 jsDelivr(글꼴), ExchangeRate-API와 Frankfurter(환율), 일본 국토지리원(지도)에 직접 접속합니다. 이때 IP 주소 등 접속 정보가 각 서비스에 전달될 수 있으며, 이는 각 서비스의 방침을 따릅니다.'],
      ['호스팅', '이 사이트는 Vercel을 통해 제공되며, 호스팅 사업자가 접속 로그를 일정 기간 보관할 수 있습니다.']]],
    contact: ['문의', [
      ['연락처', '문의 창구(문의 양식)를 준비하고 있습니다. 준비가 끝나면 이 페이지에 안내합니다.'],
      ['정보 정정 요청', '시설 정보나 사진에 오류가 있을 때, 자료 출처 페이지의 공식 출처와 함께 알려 주실 수 있는 창구를 준비하고 있습니다.']]],
    descs: { terms: '온천 한눈에 이용약관: 요금·사진·외부 링크에 관한 안내와 면책', privacy: '온천 한눈에 개인정보 처리방침: 수집하는 정보와 외부 서비스 접속', contact: '온천 한눈에 문의 안내' },
  },
  ja: {
    name: '温泉ひとめぐり', home: '← 温泉を探す', sources: '情報・写真の出典', nav: { terms: '利用規約', privacy: 'プライバシーポリシー', contact: 'お問い合わせ' }, updated: '最終更新: 2026年11月',
    terms: ['利用規約', [
      ['サービス', '温泉ひとめぐりは、日本の温泉施設の情報をまとめて紹介する情報サイトです。予約・決済は各施設または予約サイトで行われ、本サイトは予約や決済を代行しません。'],
      ['料金と情報の正確性', '料金・営業時間・休業日・施設情報は予告なく変更されることがあります。表示する料金は確認時点の参考値で、換算額は為替により変わる「約」の値です。実際のお支払いは日本円で、税・入湯税・サービス料・人数・時期により異なる場合があります。訪問・予約の前に必ず公式サイトでご確認ください。料金が表示されていない施設は、確認できた情報がないことを意味します。'],
      ['写真・著作物', '写真は各著作者とライセンスの条件(CC BY-SA など)に従います。写真は施設の現在の様子と異なる場合があります。著作者と利用条件は出典ページでご確認いただけます。'],
      ['外部リンクと広告・提携の表示', '施設の公式サイトなど外部へのリンクがあり、外部サイトの内容とサービスは各運営者の責任です。現在、本サイトのリンクにアフィリエイト手数料や広告の対価は付いていません。今後提携リンクを導入する場合は、そのリンクに明示します。'],
      ['免責', '本サイトの情報を利用して生じた損害について、故意または重大な過失がない限り責任を負いません。'],
      ['規約の変更', '規約は必要に応じて変更することがあります。変更内容はこのページに掲載します。']]],
    privacy: ['プライバシーポリシー', [
      ['収集する情報', '会員登録やログインはなく、氏名・メールアドレスなどの個人情報は収集しません。利用者の記録をサーバーに保存することもありません。'],
      ['ブラウザに保存される値', 'お気に入り、表示モード(ライト/ダーク)、最初の画面(イントロ)の表示状況は、利用者の端末のブラウザにのみ保存されます。ブラウザの保存データを消すと削除されます。'],
      ['外部サービスへの接続', '画面表示のため、ブラウザは Supabase(施設一覧)、Wikimedia Commons(写真)、Google Fonts と jsDelivr(フォント)、ExchangeRate-API と Frankfurter(為替)、国土地理院(地図)へ直接接続します。その際 IP アドレスなどの接続情報が各サービスに送られることがあり、各サービスの方針に従います。'],
      ['ホスティング', '本サイトは Vercel を通じて提供されており、ホスティング事業者がアクセスログを一定期間保管することがあります。']]],
    contact: ['お問い合わせ', [
      ['連絡先', 'お問い合わせ窓口(フォーム)を準備しています。準備ができ次第、このページでご案内します。'],
      ['情報の訂正', '施設情報や写真に誤りがある場合に、出典ページの公式の出典を添えてお知らせいただける窓口を準備しています。']]],
    descs: { terms: '温泉ひとめぐりの利用規約: 料金・写真・外部リンクに関する案内と免責', privacy: '温泉ひとめぐりのプライバシーポリシー: 収集する情報と外部サービスへの接続', contact: '温泉ひとめぐりのお問い合わせ案内' },
  },
  en: {
    name: 'Onsen at a Glance', home: '← Find an onsen', sources: 'Information and photo credits', nav: { terms: 'Terms of use', privacy: 'Privacy policy', contact: 'Contact' }, updated: 'Last updated: November 2026',
    terms: ['Terms of use', [
      ['Service', 'Onsen at a Glance collects and presents information about hot spring properties in Japan. Reservations and payments are handled by each property or booking provider; this site does not take bookings or payments.'],
      ['Prices and accuracy', 'Rates, opening hours, closing days and facilities can change without notice. Prices shown are reference values as of the date checked, and converted amounts are approximate and move with exchange rates. You pay in Japanese yen, and the final amount can differ with tax, bathing tax, service charges, party size and season. Check the official site before you visit or book. A property with no price shown simply has no verified price.'],
      ['Photos and content', 'Photos follow each author’s license terms (for example CC BY-SA). A photo may not show the property as it looks today. Authors and terms are listed on the credits page.'],
      ['External links and advertising', 'Links to external sites such as official property sites are provided; the content and services of those sites are the responsibility of their operators. At present, links on this site carry no affiliate commission or paid placement. If affiliate links are introduced later, they will be clearly marked as such.'],
      ['Liability', 'Except in cases of intent or gross negligence, we are not liable for loss arising from use of this information.'],
      ['Changes', 'These terms may change. Updates are posted on this page.']]],
    privacy: ['Privacy policy', [
      ['What we collect', 'There is no sign-up or login, and we do not collect personal information such as names or email addresses. We do not store visitor records on a server.'],
      ['Stored in your browser', 'Your favorites, light/dark mode and whether you have seen the opening screen are stored only in your own browser. Clearing the browser’s site data removes them.'],
      ['Third-party connections', 'To show the page, your browser connects directly to Supabase (listings), Wikimedia Commons (photos), Google Fonts and jsDelivr (fonts), ExchangeRate-API and Frankfurter (exchange rates) and the Geospatial Information Authority of Japan (maps). Your IP address and similar connection data may be sent to those services, which follow their own policies.'],
      ['Hosting', 'This site is served through Vercel, and the hosting provider may keep access logs for a period of time.']]],
    contact: ['Contact', [
      ['How to reach us', 'A contact channel (form) is being prepared. It will be announced on this page when it is ready.'],
      ['Corrections', 'We are preparing a way to send corrections for a listing or photo together with the official source from the credits page.']]],
    descs: { terms: 'Onsen at a Glance terms of use: notes on prices, photos and external links', privacy: 'Onsen at a Glance privacy policy: what we collect and third-party connections', contact: 'How to contact Onsen at a Glance' },
  },
};
const suffix = { ko: '', ja: '-ja', en: '-en' };
const home = { ko: '../index.html', ja: '../ja.html', en: '../en.html' };
const langName = { ko: '한국어', ja: '日本語', en: 'English' };
const STYLE = `:root{color-scheme:light dark;--bg:#f6f3ec;--fg:#1d2a2c;--mut:#4d5c5e;--ln:#d8d2c4;--ac:#0f5f66}
@media(prefers-color-scheme:dark){:root{--bg:#0e1620;--fg:#e3eaf2;--mut:#aab7c5;--ln:#2a3846;--ac:#8fd0d6}}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.8 system-ui,"Noto Sans KR","Noto Sans JP",sans-serif}
header,main,footer{max-width:760px;margin:0 auto;padding:0 20px}header{display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;padding-top:20px;padding-bottom:12px;border-bottom:1px solid var(--ln)}
a{color:var(--ac);text-underline-offset:4px}h1{font-size:30px;line-height:1.3;margin:32px 0 4px}h2{font-size:20px;margin:28px 0 4px}p{margin:0}.up{color:var(--mut);font-size:15px}
nav a{margin-right:16px}footer{padding-top:28px;padding-bottom:48px;margin-top:36px;border-top:1px solid var(--ln);color:var(--mut);font-size:15px}`;

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const lang of ['ko', 'ja', 'en']) {
  const t = T[lang];
  for (const key of ['terms', 'privacy', 'contact']) {
    const [title, secs] = t[key];
    const others = ['terms', 'privacy', 'contact'].filter(k => k !== key).map(k => `<a href="${k}${suffix[lang]}.html">${esc(t.nav[k])}</a>`).join('');
    const langs = ['ko', 'ja', 'en'].filter(l => l !== lang).map(l => `<a hreflang="${l}" href="${key}${suffix[l]}.html">${langName[l]}</a>`).join('');
    const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | ${esc(t.name)}</title>
<meta name="description" content="${esc(t.descs[key])}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#14272a">
<style>${STYLE}</style>
</head>
<body>
<header><a href="${home[lang]}">${esc(t.home)}</a><nav aria-label="Language">${langs}</nav></header>
<main>
<h1>${esc(title)}</h1>
<p class="up">${esc(t.updated)}</p>
${secs.map(([h, p]) => `<h2>${esc(h)}</h2>\n<p>${esc(p)}</p>`).join('\n')}
</main>
<footer><nav aria-label="Legal">${others}<a href="../sources.html?lang=${lang}">${esc(t.sources)}</a></nav></footer>
</body>
</html>
`;
    fs.writeFileSync(path.join(OUT, `${key}${suffix[lang]}.html`), html);
    n++;
  }
}
console.log(`legal: wrote ${n} pages to web/legal/`);
