# Debate round 2 digest (moderator)

USER-DECIDED FEATURES (do NOT propose removing; tuning only): photos at high quality on the top banner, handwriting-style fonts that are not excessive, stacking-row scroll effect, cover-to-fixed-header banner, night-onsen footer (stars + rising steam) with terms/privacy/contact, 5 rows x 4 columns per page with pager below, name-order sort (가나다/あいうえお/A-Z), onchun-style info UI, exact-pin map, FX tracker, source tracker, security process.

FINDINGS ADDED BY END-USER ROUND (verified by that agent):
- Only 9 of 1,015 default-list facilities have a stay price; price slider silently yields 0 in Kyushu/Hakone.
- Pager is stale: with 0-3 results it still shows "1-20 / 482" and pages 1 2 3 ... 25.
- Filter counts wrong: "day-use 1049 / stay 1754" exceed the 1,015 total and do not update by region.
- Favorites button sits off-screen (x=616) in the scrolling nav on 375px phones.
- Language switch wipes keyword/filters/drawer.
- Search counts differ by script (hakone 67 / 하코네 72 / 箱根 71).
- EN guide/water pages have no etiquette content (wash first, towel, tattoos, mixed bathing) -> first-timer fails.
- Drawer shows four "not confirmed" tiles for most facilities; 17 of 20 first-page cards have no photo.

PROPOSALS ON THE TABLE (id: proposer):
P1 Compact photo-less cards (56px chip instead of a 190px grey block) and/or sort data-rich cards first (UX, design, a11y). Conflict: alphabetical sort is user-decided.
P2 Price coverage honesty: when slider active show "N facilities with a price" + toggle to include unpriced; show price on cards (end user, FX).
P3 Bug fixes: hide pager when total <= page size and use filtered total; recompute filter counts (end user).
P4 Drawer: collapse 4 unconfirmed tiles into one "not confirmed" line, keep CTA on top (UX, design). Concern: trust cue (data).
P5 Cover/hero: shorten --cover-h (~60vh) so the search is above the fold; skip intro for return visits; avoid double hero (design, UX).
P6 Performance: hero 1280px thumb (instead of 1920) + fetchpriority, merge 3 Google Fonts requests, defer non-critical scripts, content-visibility on cards (a11y/perf). Concern: user asked for higher hero quality.
P7 Fonts: fewer families (Gowun Dodum body; Gaegu only for large titles; drop dead Nanum Brush rule) (design, perf).
P8 Mobile: all tap targets >=44px; favorites heart in the fixed top bar on phones with a toast (a11y, end user).
P9 Disable sticky stack-row shadow smudges on <=700px (design). Concern: user requested stacking effect.
P10 FX: ignore fx.json older than 36h and fall back to live; "old rate" marker; refresh every 30-60 min; indicative-rate note on cards/slider (FX).
P11 Location: Google link built from coordinates (+ directions / Apple Maps); honest area-tier label and radius; OSM/GSI attribution on every non-prefecture view; two-finger pan on touch; exact-location badge/filter; (later) list-wide map (location).
P12 Tracker: save every ~50 URLs, stricter closure detection, reviewed.json to dismiss items, separate "cannot check automatically" state, schedule daily/weekly; show status publicly as a date unless changed/unreachable-twice; closure flags only after maintainer review (data).
P13 Security: esc() in sources.js; check.mjs scans page.js/cover.js; export-catalog validation; no new image hosts (security).
P14 Content: link water chips / price tiles to guide anchors, CTA at the end of guides, add first-timer etiquette section + "first-timer friendly" tag, fill ja/en card blurbs (content, end user).
P15 Architecture: one i18n dictionary for footer/intro/page/stack/language strings; guide pages from one shell; Promise.all for independent fetches; drop ja.css; hreflang/canonical; consistent ?v= suffixes (architecture).
P16 Language switch carries query/filters/drawer id in the URL (end user, architecture).
P17 Guide hero needs a title over the photo; text >=13-14px everywhere; theme-color meta (design).

THREE BIGGEST CONFLICTS TO RESOLVE:
C1 Empty cards / not-confirmed tiles (P1, P4) vs honesty cues + alphabetical sort.
C2 Performance & font cuts (P6, P7) vs user's explicit wish for crisp hero photos and handwriting-style type.
C3 Data coverage honesty vs practical usefulness (P2): 9/1015 priced.
