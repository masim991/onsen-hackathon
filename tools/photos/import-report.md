# 사진 가져오기 보고서 (Wikimedia Commons, 2026-11-23)

## 상태: 보류 (이미지 다운로드가 여전히 429, DB·사이트에는 아무것도 반영하지 않음)

- Commons API(라이선스·저작자·크기 조회)는 끝났고, 후보 52건이 검사를 통과했다. 2026-11-23 오후에 API로 52건 라이선스·폭을 다시 확인해 전부 일치했다.
- 같은 날 재개: 첫 파일(official-gunma-kusatsu-k0027)에서 HTTP 429, 5분 대기 후 재시도도 429라서 규칙대로 중단했다(0건 다운로드). 브라우저 경유·UA 변경 같은 우회는 하지 않았다. get.mjs 는 이제 429가 나오면 5분 한 번만 쉬고, 그래도 429면 즉시 멈춘다.
- 따라서 web/images, web/photo-assets.js, onsen_photos(351건)는 그대로다. ?v= 는 현재 20261231 이고 사진 반영 때 20270101 로 올린다.

## 이어서 하는 순서
1. plan.json 은 이 폴더에 이미 있다(52건). 다시 만들 일이 생기면 srcs.json, commons.json(API 응답)을 두고 build.mjs 실행
2. 이 폴더에서 `node get.mjs`. 먼저 HEAD 한 번으로 429가 풀렸는지 확인. get.mjs: web/images/commons-<sha256(키) 앞 16자>.jpg 로 1280px 판 저장 (기존 파일 이름 규칙은 sha1이 아니라 sha256 앞 16자)
3. gen.mjs: onsen_photos INSERT SQL(on conflict do nothing)과 photo-assets.js 추가분 생성 -> execute_sql, 이후 ?v=20270101 로 올리고 check.mjs

## 통과 후보 (52건: 라이선스 CC0/PD/CC BY/CC BY-SA, 폭 800px 이상, JPEG)

| ID | 시설 | 파일 페이지 | 라이선스 | 저작자 | 출처 |
|---|---|---|---|---|---|
| official-gunma-kusatsu-k0027 | 草津温泉 大東舘 | https://commons.wikimedia.org/wiki/File:AMMS_Hotels_Kusatsu-Onsen_Daitokan.JPG | Public domain | Abasaa | 파일 행 |
| official-gunma-kusatsu-k0087 | 草津 山本館 | https://commons.wikimedia.org/wiki/File:Kusatsu_Onsen_Yamamotokan.JPG | Public domain | Abasaa | 파일 행 |
| official-gunma-kusatsu-k0052 | 奈良屋 | https://commons.wikimedia.org/wiki/File:Kusatsu_Onsen_Naraya.JPG | Public domain | Abasaa | 파일 행 |
| official-gifu-gero-yamagataya | 下呂温泉山形屋 | https://commons.wikimedia.org/wiki/File:Yamagataya%2C_Gero.jpg | CC BY-SA 4.0 | 運動会プロテインパワー | 파일 행 |
| official-mie-kumano-yunokuchi | 湯元山荘 湯ノ口温泉 | https://commons.wikimedia.org/wiki/File:Yumoto_Sanso_Yunokuchi_Spa.jpg | CC BY-SA 4.0 | Miyuki Meinaka | 파일 행 |
| official-hyogo-arima-goshoboh | 陶泉 御所坊 | https://commons.wikimedia.org/wiki/File:%E9%99%B6%E6%B3%89_%E5%BE%A1%E6%89%80%E5%9D%8A_Tocen_Goshoboh_-_panoramio.jpg | CC BY 3.0 | iloverjoa | 파일 행 |
| official-saga-siebold-s-bath | 公衆浴場シーボルトの湯 | https://commons.wikimedia.org/wiki/File:Ureshino_onsen.jpg | CC BY-SA 4.0 | Totti | 파일 행 |
| official-fukuoka-hakata-fuji-no-sono | 旅館 富士の苑 | https://commons.wikimedia.org/wiki/File:Hakata_onsen_Fujinoen.jpg | CC BY-SA 4.0 | 水だらけのプール | 파일 행 |
| official-iwate-hanamaki-oosawa | 大沢温泉 | https://commons.wikimedia.org/wiki/File:Osawa_Onsen_Toujiya.jpg | CC BY-SA 4.0 | 掬茶 | 파일 행 |
| official-fukushima-TF4541 | 野地温泉 | https://commons.wikimedia.org/wiki/File:%E9%87%8E%E5%9C%B0%E6%B8%A9%E6%B3%89%E3%83%9B%E3%83%86%E3%83%AB.jpg | CC0 | 松島誠 | 파일 행 |
| official-oita-hita-kissho-no-yu | つえたて温泉ひぜんや 吉祥の湯 | https://commons.wikimedia.org/wiki/File:Tsuetate_onsen_Hizenya.JPG | CC BY-SA 4.0 | hyolee2 | 파일 행 |
| official-gunma-kusatsu-k0012 | 大阪屋旅館 | https://commons.wikimedia.org/wiki/File:Kusatsu_Onsen_Osakaya.JPG | Public domain | Abasaa | 파일 행 |
| manus-otakinoyu | 大滝乃湯 | https://commons.wikimedia.org/wiki/File:Kusatsu_Onsen_Ohtakinoyu.jpg | CC BY-SA 3.0 | photo: Qurren (talk) Taken with Canon PowerShot G9 X | 파일 행 |
| add-gozanoyu | 御座之湯 | https://commons.wikimedia.org/wiki/File:251129_Goza-no-yu.jpg | CC0 | Aspere | 분류에서 선택 |
| official-kanagawa-hakone-gora-kansuiro | 強羅環翠楼 | https://commons.wikimedia.org/wiki/File:Kansuiro.jpg | CC BY-SA 3.0 | sgico | 분류에서 선택 |
| official-gunma-ikaho-06 | 岸権旅館 | https://commons.wikimedia.org/wiki/File:Kishigon_Ryokan.JPG | Public domain | Abasaa | 분류에서 선택 |
| official-gunma-ikaho-08 | 千明仁泉亭 | https://commons.wikimedia.org/wiki/File:Ikaho_Onsen_Chigira_Jinsentei.jpg | CC BY-SA 4.0 | Qurren | 분류에서 선택 |
| official-kanagawa-hakone-tonosawa-ichinoyu-honkan | 塔ノ沢一の湯本館 | https://commons.wikimedia.org/wiki/File:Ichinoyu.jpg | CC BY-SA 3.0 | Ichinoyu | 파일 행 |
| official-kanagawa-hakone-yoshiike-ryokan | 吉池旅館 | https://commons.wikimedia.org/wiki/File:Yoshiike_Ryokan.JPG | Public domain | Abasaa | 파일 행 |
| official-kanagawa-hakone-hakone-suishoen | 箱根・翠松園 | https://commons.wikimedia.org/wiki/File:Hakone_Suisho-en%2C_Japan_%284119899571%29.jpg | CC BY-SA 2.0 | William Cho | 분류에서 선택 |
| official-fukushima-iizaka-hakyuyu | 波来湯 | https://commons.wikimedia.org/wiki/File:Iizaka_Onsen_Hakoyu.JPG | Public domain | Abasaa | 파일 행 |
| official-tottori-misasa-kawarafuro | 河原風呂 | https://commons.wikimedia.org/wiki/File:Misasa_onsen_kawaranoyu_202106.jpg | CC BY-SA 4.0 | 三塚 | 파일 행 |
| official-ishikawa-wakura-togetsuan | 大正浪漫の宿 渡月庵 | https://commons.wikimedia.org/wiki/File:Togetsuan_Entrance.JPG | CC BY-SA 4.0 | User: (WT-shared) Jpatokal at wts wikivoyage | 파일 행 |
| official-nagano-asama-higashiishikawa | 東石川旅館 | https://commons.wikimedia.org/wiki/File:Higashi_Ishikawa_Ryokan_-_panoramio.jpg | CC BY-SA 3.0 | Soul of Japan | 파일 행 |
| official-hyogo-arima-kinnoyu | 有馬本温泉 金の湯 | https://commons.wikimedia.org/wiki/File:Kinnoyu01s1920.jpg | CC BY 2.5 | 663highland | 분류에서 선택 |
| official-ikoi | いこい旅館 | https://commons.wikimedia.org/wiki/File:Ikoi_ryokan_-Kurokawa_Onsen.jpg | CC BY 2.0 | Hans Suter | 파일 행 |
| official-nagano-nozawa-sotoyu-1 | 大湯 | https://commons.wikimedia.org/wiki/File:O-YU_the_public_bathhouse_-_panoramio.jpg | CC BY 3.0 | ccfarmer | 파일 행 |
| official-nagano-nozawa-sotoyu-11 | 滝の湯 | https://commons.wikimedia.org/wiki/File:%E6%BB%9D%E3%81%AE%E6%B9%AF.jpg | CC BY-SA 4.0 | Koda6029 | 파일 행 |
| official-nagano-bessho-daishi-yu | 別所温泉 大師湯 | https://commons.wikimedia.org/wiki/File:Daishi-yu_Bessho_Hotspring.JPG | CC BY-SA 3.0 | NY066 | 파일 행 |
| official-nagano-bessho-ishi-yu | 別所温泉 石湯 | https://commons.wikimedia.org/wiki/File:Ishi-yu_Bessho_Hotspring.JPG | CC BY-SA 3.0 | NY066 | 파일 행 |
| official-nagano-bessho-oyu | 別所温泉 大湯 | https://commons.wikimedia.org/wiki/File:Bessyoonsen-ooyu01.JPG | CC BY-SA 3.0 | Traveller | 파일 행 |
| official-yamagata-ginzan-kosekiya-annex | 古勢起屋別館 | https://commons.wikimedia.org/wiki/File:Ginzan_Onsen_Kosekiya_Bekkan_Front_view.jpg | CC BY-SA 4.0 | さかおり | 파일 행 |
| official-oita-taketa-gozenyu | 温泉療養文化館 御前湯 | https://commons.wikimedia.org/wiki/File:Nagayu-Gozenyu.JPG | CC BY-SA 3.0 | NY066 | 파일 행 |
| official-yamagata-YK10836 | 小野川温泉共同浴場「尼湯」「滝の湯」 | https://commons.wikimedia.org/wiki/File:Onogawa_Bath_AmaYu.JPG | CC BY-SA 4.0 | Jpatokal | 파일 행 |
| official-kanagawa-kogome | 湯河原温泉こごめの湯 | https://commons.wikimedia.org/wiki/File:Kogome-no-yu_Yugawara.JPG | CC BY-SA 3.0 | NY066 | 파일 행 |
| official-20261119-suimeikan-gero | 水明館 | https://commons.wikimedia.org/wiki/File:%E3%80%90%E6%97%A5%E6%9C%AC%E4%B8%8B%E5%91%82%E4%BD%8F%E5%AE%BF%E3%80%91%E6%B0%B4%E6%98%8E%E9%A4%A8_%2832552317990%29.jpg | CC BY-SA 2.0 | fullfen666 | 분류에서 선택 |
| official-gunma-shibukawa-bath-1 | 伊香保露天風呂 | https://commons.wikimedia.org/wiki/File:Ikaho_open_air_bath.JPG | CC BY-SA 3.0 | NY066 | 분류에서 선택 |
| official-gunma-shibukawa-bath-2 | 伊香保温泉石段の湯 | https://commons.wikimedia.org/wiki/File:Ikaho_Onsen%2C_Ishidan_no_yu_01.jpg | CC BY 2.0 | Norimasa Hayashida | 파일 행 |
| official-nagano-matsumoto-awanoyu | 泡の湯 | https://commons.wikimedia.org/wiki/File:%E6%B3%A1%E3%81%AE%E6%B9%AF%E6%97%85%E9%A4%A8_Awanoyu_at_Shirahone_Spa_-_panoramio.jpg | CC BY-SA 3.0 | YOSHIFUMI OGISO | 파일 행 |
| official-kagawa-kotohira-kotosankaku | ことひら温泉琴参閣 | https://commons.wikimedia.org/wiki/File:150504_Kotosankaku_Kogohira_Kagawa_pref_Japan01n.jpg | CC BY 2.5 | 663highland | 파일 행 |
| manus-arima-ginnoyu | 有馬温泉 銀の湯 | https://commons.wikimedia.org/wiki/File:Ginnoyu01s1920.jpg | CC BY 2.5 | 663highland | 분류에서 선택 |
| official-shiga-ogoto-yumotokan | 湯元舘 | https://commons.wikimedia.org/wiki/File:Yumotokan-Ogoto_onsen.JPG | CC BY-SA 3.0 | イーゴス108 | 파일 행 |
| official-fukuoka-daimaru-bessho | 大丸別荘 | https://commons.wikimedia.org/wiki/File:Daimaru_Besso_02.jpg | CC BY-SA 4.0 | STA3816 | 파일 행 |
| official-fukuoka-taikanso | 大観荘 | https://commons.wikimedia.org/wiki/File:Daikanso.jpg | CC BY-SA 4.0 | STA3816 | 파일 행 |
| 110 | 鶴の湯温泉 | https://commons.wikimedia.org/wiki/File:Tsurunoyu_Onsen_02.jpg | CC BY-SA 2.0 | Fumiaki Yoshimatsu from Tokyo, Japan | 파일 행 |
| manus-ganiba | 蟹場温泉 | https://commons.wikimedia.org/wiki/File:Ganiba_Onsen_01.jpg | CC BY-SA 2.0 | Fumiaki Yoshimatsu from Tokyo, Japan | 파일 행 |
| official-20261119-chorakuen-tamatsukuri | 湯之助の宿 長楽園 | https://commons.wikimedia.org/wiki/File:140427_Chorakuen_Tamatsukuri_Onsen_Matsue_Shimane_pref_Japan01s3.jpg | CC BY 2.5 | 663highland | 분류에서 선택 |
| official-hiroshima-miyajima-iwaso | 岩惣 | https://commons.wikimedia.org/wiki/File:%E5%B2%A9%E6%83%A3%E7%8E%84%E9%96%A2.jpg | CC BY-SA 2.0 | Shiken Hung | 파일 행 |
| official-wakayama-yunomine-public | 湯の峰温泉公衆浴場 | https://commons.wikimedia.org/wiki/File:Unomineonsenkousyuyokuzyou.jpg | CC BY-SA 3.0 | houzyouhideyosi | 분류에서 선택 |
| official-wakayama-yunomine-tsuboyu | つぼ湯 | https://commons.wikimedia.org/wiki/File:Kumano_Kodo_World_heritage_Yunomine_Onsen_Tsuboyu_%E6%B9%AF%E3%81%AE%E5%B3%B0%E6%B8%A9%E6%B3%89_%E3%81%A4%E3%81%BC%E6%B9%AF02.JPG | CC BY-SA 4.0 | Nekosuki | 분류에서 선택 |
| official-jozankei-shikanoyu | 鹿の湯 | https://commons.wikimedia.org/wiki/File:Hotel_Shika-no-Yu.JPG | CC BY-SA 4.0 | 禁樹なずな | 파일 행 |
| official-fukuoka-futsukaichi-hakatayu | 博多湯 | https://commons.wikimedia.org/wiki/File:Hakata-yu.jpg | CC BY-SA 4.0 | STA3816 | 파일 행 |

(오사와 온천은 기존 로컬 파일 images/commons-osawa-20261119.jpg 를 재사용한다. 스이메이칸·조라쿠엔·쓰보유 3건은 분류의 첫 파일을 임시로 골랐으니 눈으로 확인 후 확정.)

## 라이선스 사유로 거절: 0건, 크기·형식 사유 거절: 0건

## 건너뜀 / 사람 확인 필요 (30건)

| ID | 시설 | 링크 | 사유 |
|---|---|---|---|
| official-gunma-kusatsu-k0011 | 益成屋旅館 | https://commons.wikimedia.org/wiki/File:Ekinariya_Ryokan.JPG | 파일명 Ekinariya를 益成屋 읽기로 추정한 매칭(시트 기재) |
| official-aomori-tsuta | 蔦温泉旅館 | https://commons.wikimedia.org/wiki/File:Tsuta_Onsen_spa_,_%E8%94%A6%E6%B8%A9%E6%B3%89_-_panoramio_(1).jpg | 6080x1600 파노라마라 카드 비율에 안 맞음 |
| o2 | 西の河原露天風呂 | https://commons.wikimedia.org/wiki/Category:Sainokawara_Park | 분류가 공원(Sainokawara Park)이라 노천탕 사진이 아님 |
| official-kanagawa-hakone-hakone-kowakien-tenyu | 箱根小涌園 天悠 | https://commons.wikimedia.org/wiki/Category:Hakone_Kowakien_Ten-yu | 시트 애매함 + 분류에 내부 사진 1장뿐 |
| official-kanagawa-hakone-kin-no-take | 金乃竹 | https://commons.wikimedia.org/wiki/Category:Kinnotake_Resorts | 분류에 파일 0장 |
| official-gunma-ikaho-12 | 雨情の湯 森秋旅館 | https://commons.wikimedia.org/wiki/Category:Ikaho_Onsen | 분류가 이카호 온천 전체(森秋旅館 전용 아님) |
| official-hyogo-kinosaki-sotoyu-satonoyu | さとの湯 | https://commons.wikimedia.org/wiki/Category:Onsen_in_Kinosaki | 분류에 さとの湯 사진 없음(고노유 사진 1장) |
| official-tottori-misasa-ohashi | 旅館大橋 | https://bunka.nii.ac.jp/heritages/detail/185040 | Commons 파일/분류 페이지가 아님(문화유산온라인) |
| official-shizuoka-shuzenji-kikuya | 湯回廊 菊屋 | https://commons.wikimedia.org/wiki/File:Kikuya_Ryokan_-Shuzenji_Onsen.jpg | 폭 640px(800 미만) + 외관 아닌 복도 사진 |
| official-tochigi-kinugawa-kinugawa-onsen-asaya | 鬼怒川温泉 あさや | https://commons.wikimedia.org/wiki/Category:Asaya_Hotel | 시트 특이사항 애매함(호텔) |
| official-shimane-tamatsukuri-hoseikan | 保性館 | https://bunka.nii.ac.jp/heritages/detail/610693 | Commons 파일/분류 페이지가 아님(문화유산온라인) |
| official-wakayama-katsuura-nakanoshima | 碧き島の宿 熊野別邸 中の島 | https://commons.wikimedia.org/wiki/Category:Hotel_Nakanoshima | 시트 특이사항 애매함(옛 이름 호텔) |
| manus-yamamizuki | 山みず木 | https://commons.wikimedia.org/wiki/File:Kurokawa_Onsen_Yamamizuki_Banner.jpg | 2100x300 가로 배너 사진, 카드에 부적합 |
| official-yamagata-ginzan-showakan | 味とまごころの宿 昭和館 | https://commons.wikimedia.org/wiki/Category:Showakan | 분류 사진이 긴잔 온천 전경뿐(昭和館 특정 불가) |
| official-n-hanaya | 旅館 花屋 | https://commons.wikimedia.org/wiki/Category:Hanaya_Hotel | 시트 특이사항 애매함(분류명 Hanaya Hotel) |
| official-kumamoto-yamaga-sakurayu | 山鹿温泉元湯 さくら湯 | https://commons.wikimedia.org/wiki/File:Yamaga_sakurayu.jpg | 2012년 재건 전 옛 건물일 수 있음(시트 기재) |
| official-20261119-wataya-ureshino | 和多屋別荘 | https://commons.wikimedia.org/wiki/Hotels_in_Japan | Commons 파일/분류 페이지가 아님(갤러리 등) |
| official-wakayama-kumano-kawayu-kosetsu | 川湯温泉 公衆浴場 | https://commons.wikimedia.org/wiki/Category:Kawayu_Onsen_Public_Bath | 분류 사진이 川湯 일반 풍경, 공중욕장 특정 불가 |
| official-kochi-kochi-sansuien | 高知三翠園温泉 湯殿 水哉閣 | https://commons.wikimedia.org/wiki/Category:Sansuien_(Kochi) | 시트 특이사항 애매함(호텔식) |
| official-kumamoto-aso-seifuso | 地獄温泉 青風荘 | https://commons.wikimedia.org/wiki/File:地獄温泉「清風荘」2.JPG | 출처 불명(Yahoo 블로그 사진을 업로더가 CC로 올림, 기계판독 출처 없음) + 青風荘/清風荘 표기 차이 |
| official-miyagi-ac36fa67 | 鎌先温泉 湯主一條 | https://bunka.nii.ac.jp/heritages/detail/284063 | Commons 파일/분류 페이지가 아님(문화유산온라인) |
| official-tochigi-yunishigawa-kamiyashiki-taira-no-takafusa | 上屋敷 平の高房 | https://commons.wikimedia.org/wiki/File:Takafusa_Hotel.JPG | 시트 특이사항 애매함(파일명 Takafusa Hotel) |
| official-kagoshima-kuei-unagi-onsen | 区営鰻温泉 | https://commons.wikimedia.org/wiki/File:Unagi_Onsen_Ibusuki,_Kagoshima.JPG | 시트 특이사항 애매함(鰻温泉 전체 사진) |
| official-hokkaido-HK12976 | 平磯温泉 料亭湯宿銀鱗荘 | https://commons.wikimedia.org/wiki/Category:Ginrinsou | 시트 특이사항 애매함(건물 사진 없음) |
| official-nara-nara-dorogawa-center | 洞川温泉センター | https://commons.wikimedia.org/wiki/File:Dorokawa.onsen.jpg | 시트 특이사항 애매함(센터 건물인지 불명) |
| official-kumamoto-hitoyoshi-yoshino | 芳野旅館 | https://bunka.nii.ac.jp/heritages/detail/229138 | Commons 파일/분류 페이지가 아님(문화유산온라인) |
| official-miyagi-yusaya | ゆさや旅館 | https://bunka.nii.ac.jp/heritages/detail/114734 | Commons 파일/분류 페이지가 아님(문화유산온라인) |
| official-okayama-okutsuso | 奥津荘 | https://bunka.nii.ac.jp/heritages/search?freetext=%E5%A5%A5%E6%B4%A5%E8%8D%98%E6%9C%AC%E9%A4%A8 | Commons 파일/분류 페이지가 아님(문화유산온라인) |
| official-oita-kokonoe-hokkein | 法華院温泉 高原テラス | https://commons.wikimedia.org/wiki/Category:Hokkein_Onsen | 시트 특이사항 애매함(山荘 vs 高原テラス) |
| official-miyazaki-hinokage-hinokage-onsen-eki | 日之影温泉駅 | https://commons.wikimedia.org/wiki/Category:Hinokage-Onsen_Station | 시트 특이사항 애매함(옛 역 건물) |

## 참고
- 분류(Category) 행은 26건이었다(요청에는 33건). 그중 선택한 것은 12건.
- 위 후보 시설 82개는 모두 DB에 존재하고 사진이 0장임을 확인했다. onsen_facilities 해시 md5 = 37ce3476fd6283aae39ab8cf051de6b9 (변경 없음), onsen_photos 351건.
- 사진 설명(caption)은 "<시설명> 외관 사진" 형식 예정이며 개별 확인 전.
