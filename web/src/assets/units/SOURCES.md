# Unit portrait sources

Retrieved 2026-09-25 from [7K Atlas Hero Codex](https://7katlas.com/codex.html)
and [Pet Codex](https://7katlas.com/pets.html), a fan reference site by
7KDreamer Plays & castiel, not an official Netmarble site.
Game artwork © Netmarble Corp. & Netmarble Nexus Inc. Source attribution
does not change ownership of these assets.

These original transparent WebP images replace the earlier framed GameWith
thumbnails. They contain no baked-in rarity background, card border, star row,
or upper-right sparkle. They are stored locally and loaded lazily; there are no
runtime requests to the source site, generated artwork, or added dependencies.

Hero images use the site's compressed `images/heroes/thumb/` variants
(512 × 512, under 70 KB each). Pet images use its transparent card portraits
(256 × 256, under 53 KB each). Original alpha channels are preserved.
The UI frames hero portraits closer using CSS, without altering the source art.

## Form matching

- Source fields `name_th` / `name_jp` were matched to the verified catalog names.
- Hero `portraits.s6` is used for the base form and `portraits.awk` for awakening.
  Awakened names never fall back to a base portrait.
- `Rudy.webp` is base Rudy; `Rudy awake.webp` is awakened Rudy. The landing
  page demonstration selects `ลูดี้ awake`.
- By the user's explicit preference, existing ไอลีน uses awakened Eileene.
- เกล and เกลลิดัส share `Gelidus.webp`; แทโอ and เทโอ share `Teo.webp`.
- The user chose the transparent pet set even where its appearance differs
  from the prior GameWith six-star image (for example, Ruu).
- จีฟ is Jeb; รีเซล maps to Richel (รีเชล in the source).
- No saved guild formations, catalog IDs, API, or drag-and-drop logic changed.

## Heroes

Source metadata: [Rare](https://7katlas.com/COMBINE/heroes-R.js),
[Legendary](https://7katlas.com/COMBINE/heroes-L.js),
[Legendary+](https://7katlas.com/COMBINE/heroes-Lplus.js),
[Legendary++](https://7katlas.com/COMBINE/heroes-Lpp.js).
Image URLs below start with `https://7katlas.com/images/heroes/thumb/`.

| Local file | Catalog name / alias | Source name | Form | Source image |
| --- | --- | --- | --- | --- |
| Clemyth awake.webp | เคลมิส awake | [Clemyth](https://7katlas.com/codex.html?hero=clemyth) | awakened | L+/AWK/Tex_HeroIcon_401797Big.webp |
| Sun Wukong.webp | ซุนหงอคง | [Sun Wukong](https://7katlas.com/codex.html?hero=sun-wukong) | base | L+/6/Tex_HeroIcon_101476Big.webp |
| โอม๊ก.webp | โอม๊ก | [O'Mok](https://7katlas.com/codex.html?hero=omok) | base | L+/6/Tex_HeroIcon_101776Big.webp |
| Radgrid.webp | แร็ดกริด | [Radgrid](https://7katlas.com/codex.html?hero=radgrid) | base | L+/6/Tex_HeroIcon_101696Big.webp |
| Silvesta awake.webp | ซิลเวสตา awake | [Silvesta](https://7katlas.com/codex.html?hero=silvesta) | awakened | L+/AWK/Tex_HeroIcon_400557Big.webp |
| Lu Bu.webp | ลิโป้ | [Lu Bu](https://7katlas.com/codex.html?hero=lu-bu) | base | L+/6/Tex_HeroIcon_101486Big.webp |
| Skuld awake.webp | สกัลด์ awake | [Skuld](https://7katlas.com/codex.html?hero=skuld) | awakened | L+/AWK/Tex_HeroIcon_401687Big.webp |
| Melia.webp | มิเลีย | [Melia](https://7katlas.com/codex.html?hero=melia) | base | L++/6/Tex_HeroIcon_101206Big.webp |
| Dellons awake.webp | เดลโลนส์ awake | [Dellons](https://7katlas.com/codex.html?hero=dellons) | awakened | L+/AWK/Tex_HeroIcon_400587Big.webp |
| Freyja.webp | เฟรย่า | [Freyja](https://7katlas.com/codex.html?hero=freyja) | base | L+/6/Tex_HeroIcon_101316Big.webp |
| เรกินเลฟ.webp | เรกินเลฟ | [Reginleif](https://7katlas.com/codex.html?hero=reginleif) | base | L+/6/Tex_HeroIcon_101706Big.webp |
| Randgrid.webp | แรนด์กริด | [Randgrid](https://7katlas.com/codex.html?hero=randgrid) | base | L+/6/Tex_HeroIcon_101716Big.webp |
| Sunran awake.webp | ซอรัน awake | [Sunran](https://7katlas.com/codex.html?hero=sunran) | awakened | L+/AWK/Tex_HeroIcon_401877Big.webp |
| Branze & Bransel.webp | บรันซ์ & บรันเซล | [Branze & Bransel](https://7katlas.com/codex.html?hero=branze-bransel) | base | L+/6/Tex_HeroIcon_101456Big.webp |
| พาลานอส.webp | พาลานอส | [Pallanus](https://7katlas.com/codex.html?hero=pallanus) | base | L+/6/Tex_HeroIcon_101466Big.webp |
| Karl Heron.webp | คาร์ล เฮรอน | [Karl Heron](https://7katlas.com/codex.html?hero=karl-heron) | base | L+/6/Tex_HeroIcon_101786Big.webp |
| Gelidus.webp | เกลลิดัส / เกล | [Gelidus](https://7katlas.com/codex.html?hero=gelidus) | base | L++/6/Tex_HeroIcon_101196Big.webp |
| Hellenia awake epic.webp | เฮเลเนีย awake epic | [Hellenia](https://7katlas.com/codex.html?hero=hellenia) | awakened | R/AWK/Tex_HeroIcon_400667Big.webp |
| เตียวเสี้ยน.webp | เตียวเสี้ยน | [Diaochan](https://7katlas.com/codex.html?hero=diaochan) | base | L/6/Tex_HeroIcon_101606Big.webp |
| Aris awake.webp | อาริส awake | [Aris](https://7katlas.com/codex.html?hero=aris) | awakened | L+/AWK/Tex_HeroIcon_401827Big.webp |
| Yoongun awake.webp | ยุนกอน awake | [Yoongun](https://7katlas.com/codex.html?hero=yoongun) | awakened | L+/AWK/Tex_HeroIcon_401907Big.webp |
| Rudy awake.webp | ลูดี้ awake | [Rudy](https://7katlas.com/codex.html?hero=rudy) | awakened | L+/AWK/Tex_HeroIcon_400567Big.webp |
| Rin.webp | ริน | [Rin](https://7katlas.com/codex.html?hero=rin) | base | L+/6/Tex_HeroIcon_101416Big.webp |
| Dongyoung awake.webp | โดยอง awake | [Dongyoung](https://7katlas.com/codex.html?hero=dongyoung) | awakened | L+/AWK/Tex_HeroIcon_401897Big.webp |
| ไพร์.webp | ไพร์ | [Fai](https://7katlas.com/codex.html?hero=fai) | base | L++/6/Tex_HeroIcon_101216Big.webp |
| Hayeon.webp | ฮายอน / อีจูฉี | [Hayeon](https://7katlas.com/codex.html?hero=hayeon) | awakened | L+/AWK/Tex_HeroIcon_401887Big.webp |
| Trude.webp | ธรูด | [Trude](https://7katlas.com/codex.html?hero=trude) | base | L+/6/Tex_HeroIcon_101306Big.webp |
| Yeonhee.webp | ยอนฮี | [Yeonhee](https://7katlas.com/codex.html?hero=yeonhee) | base | L+/6/Tex_HeroIcon_100536Big.webp |
| มิสต์.webp | มิสต์ | [Mist](https://7katlas.com/codex.html?hero=mist) | base | L+/6/Tex_HeroIcon_101726Big.webp |
| Kyle.webp | ไคล์ | [Kyle](https://7katlas.com/codex.html?hero=kyle) | base | L+/6/Tex_HeroIcon_101436Big.webp |
| เอซ.webp | เอซ | [Ace](https://7katlas.com/codex.html?hero=ace) | base | L+/6/Tex_HeroIcon_100516Big.webp |
| Orkah awake.webp | ออร์ก้า awake | [Orkah](https://7katlas.com/codex.html?hero=orkah) | awakened | L+/AWK/Tex_HeroIcon_401807Big.webp |
| เมลคีร์.webp | เมลคีร์ | [Mercure](https://7katlas.com/codex.html?hero=mercure) | base | L+/6/Tex_HeroIcon_101126Big.webp |
| เพลตัน.webp | เพลตัน | [Platin](https://7katlas.com/codex.html?hero=platin) | base | L+/6/Tex_HeroIcon_100546Big.webp |
| อลิซ.webp | อลิซ | [Alice](https://7katlas.com/codex.html?hero=alice) | base | L/6/Tex_HeroIcon_100956Big.webp |
| รีน่า.webp | รีน่า | [Lina](https://7katlas.com/codex.html?hero=lina) | base | L/6/Tex_HeroIcon_100726Big.webp |
| เอมิเลีย.webp | เอมิเลีย | [Amelia](https://7katlas.com/codex.html?hero=amelia) | base | L/6/Tex_HeroIcon_101406Big.webp |
| Aquila.webp | อากีลา | [Aquila](https://7katlas.com/codex.html?hero=aquila) | base | L+/6/Tex_HeroIcon_101446Big.webp |
| Juri.webp | จูริ | [Juri](https://7katlas.com/codex.html?hero=juri) | base | L++/6/Tex_HeroIcon_101256Big.webp |
| Teo.webp | แทโอ / เทโอ | [Teo](https://7katlas.com/codex.html?hero=teo) | base | L+/6/Tex_HeroIcon_100526Big.webp |
| คางุระ.webp | คางุระ | [Kagura](https://7katlas.com/codex.html?hero=kagura) | base | L+/6/Tex_HeroIcon_101386Big.webp |
| Rosie.webp | โรซี่ | [Rosie](https://7katlas.com/codex.html?hero=rosie) | base | L++/6/Tex_HeroIcon_101226Big.webp |
| เอลิเซีย.webp | เอลิเซีย | [Elysia](https://7katlas.com/codex.html?hero=elysia) | base | L+/6/Tex_HeroIcon_101276Big.webp |
| บาลิสต้า.webp | บาลิสต้า | [Ballista](https://7katlas.com/codex.html?hero=ballista) | base | L/6/Tex_HeroIcon_100916Big.webp |
| แรคคูน.webp | แรคคูน | [Rahkun](https://7katlas.com/codex.html?hero=rahkun) | base | R/6/Tex_HeroIcon_100146Big.webp |
| Hellenia.webp | เฮเลเนีย | [Hellenia](https://7katlas.com/codex.html?hero=hellenia) | base | R/6/Tex_HeroIcon_100666Big.webp |
| Jave.webp | เจฟ | [Jave](https://7katlas.com/codex.html?hero=jave) | base | L+/6/Tex_HeroIcon_100616Big.webp |
| Spike.webp | สไปค์ | [Spike](https://7katlas.com/codex.html?hero=spike) | base | L+/6/Tex_HeroIcon_100626Big.webp |
| Knox.webp | น็อกซ์ | [Knox](https://7katlas.com/codex.html?hero=knox) | base | L/6/Tex_HeroIcon_100496Big.webp |
| คริส.webp | คริส | [Kris](https://7katlas.com/codex.html?hero=kris) | base | L+/6/Tex_HeroIcon_100576Big.webp |
| นาจา.webp | นาจา | [Nezha](https://7katlas.com/codex.html?hero=nezha) | base | L+/6/Tex_HeroIcon_101566Big.webp |
| ลุค.webp | ลุค | [Rook](https://7katlas.com/codex.html?hero=rook) | base | L/6/Tex_HeroIcon_100896Big.webp |
| ชานชะเลอร์.webp | ชานชะเลอร์ | [Chancellor](https://7katlas.com/codex.html?hero=chancellor) | base | L/6/Tex_HeroIcon_100906Big.webp |
| เฟิงเยี่ยน.webp | เฟิงเยี่ยน | [Feng Yan](https://7katlas.com/codex.html?hero=feng-yan) | base | R/6/Tex_HeroIcon_100686Big.webp |
| คิริเอล.webp | คิริเอล | [Kyrielle](https://7katlas.com/codex.html?hero=kyrielle) | base | L+/6/Tex_HeroIcon_101286Big.webp |
| Rudy.webp | ลูดี้ | [Rudy](https://7katlas.com/codex.html?hero=rudy) | base | L+/6/Tex_HeroIcon_100566Big.webp |
| ไรอัน.webp | ไรอัน | [Ryan](https://7katlas.com/codex.html?hero=ryan) | base | L+/6/Tex_HeroIcon_101296Big.webp |
| Vanessa.webp | วาเนสซา | [Vanessa](https://7katlas.com/codex.html?hero=vanessa) | base | L+/6/Tex_HeroIcon_100636Big.webp |
| Sunran.webp | ซอรัน | [Sunran](https://7katlas.com/codex.html?hero=sunran) | base | L+/6/Tex_HeroIcon_101876Big.webp |
| Clemyth.webp | เคลมิส | [Clemyth](https://7katlas.com/codex.html?hero=clemyth) | base | L+/6/Tex_HeroIcon_101796Big.webp |
| Aris.webp | อาริส | [Aris](https://7katlas.com/codex.html?hero=aris) | base | L+/6/Tex_HeroIcon_101826Big.webp |
| Yoongun.webp | ยุนกอน | [Yoongun](https://7katlas.com/codex.html?hero=yoongun) | base | L+/6/Tex_HeroIcon_101906Big.webp |
| Dongyoung.webp | โดยอง | [Dongyoung](https://7katlas.com/codex.html?hero=dongyoung) | base | L+/6/Tex_HeroIcon_101896Big.webp |
| Skuld.webp | สกัลด์ | [Skuld](https://7katlas.com/codex.html?hero=skuld) | base | L+/6/Tex_HeroIcon_101686Big.webp |
| Dellons.webp | เดลโลนส์ | [Dellons](https://7katlas.com/codex.html?hero=dellons) | base | L+/6/Tex_HeroIcon_100586Big.webp |
| Orkah.webp | ออร์ก้า | [Orkah](https://7katlas.com/codex.html?hero=orkah) | base | L+/6/Tex_HeroIcon_101806Big.webp |
| ยูชิน.webp | ยูชิน | [Yu Shin](https://7katlas.com/codex.html?hero=yu-shin) | base | L/6/Tex_HeroIcon_100696Big.webp |
| Rachel.webp | เรเชล | [Rachel](https://7katlas.com/codex.html?hero=rachel) | base | L+/6/Tex_HeroIcon_100606Big.webp |
| Eileene.webp | ไอลีน | [Eileene](https://7katlas.com/codex.html?hero=eileene) | awakened | L+/AWK/Tex_HeroIcon_400597Big.webp |
| Karma.webp | คาร์มา | [Karma](https://7katlas.com/codex.html?hero=karma) | base | L+/6/Tex_HeroIcon_101426Big.webp |
| Silvesta.webp | ซิลเวสตา | [Silvesta](https://7katlas.com/codex.html?hero=silvesta) | base | L+/6/Tex_HeroIcon_100556Big.webp |

## Pets

Source metadata: [Legendary pets](https://7katlas.com/COMBINE/pets-L.js).
Image URLs below start with `https://7katlas.com/images/pets/raw/`.

| Local file | Source name | Source image |
| --- | --- | --- |
| ยอนจี.webp | Yeonji | L/Tex_PetIcon_10070Card.webp |
| เจโอ.webp | Jeo | L/Tex_PetIcon_10380Card.webp |
| ยู.webp | Yu | L/Tex_PetIcon_10360Card.webp |
| อีรีน.webp | Eirin | L/Tex_PetIcon_10020Card.webp |
| ลู.webp | Ruu | L/Tex_PetIcon_10010Card.webp |
| คารัม.webp | Karam | L/Tex_PetIcon_10490Card.webp |
| โยรัง.webp | Yorang | L/Tex_PetIcon_10450Card.webp |
| ไพค์.webp | Pike | L/Tex_PetIcon_10050Card.webp |
| เมลแปร์โรว์.webp | Merparrow | L/Tex_PetIcon_10370Card.webp |
| วินดี้.webp | Windy | L/Tex_PetIcon_10350Card.webp |
| รีเซล.webp | Richel | L/Tex_PetIcon_10030Card.webp |
| ครี.webp | Kree | L/Tex_PetIcon_10040Card.webp |
| จีฟ.webp | Jeb | L/Tex_PetIcon_10340Card.webp |
| เดลโล่.webp | Dello | L/Tex_PetIcon_10060Card.webp |

## Additional roster portraits (2026-09-25)

Added the 23 missing portraits from the same Atlas metadata and compressed
`images/heroes/thumb/` source. Knox and Velika use their `awk` portraits;
the remaining entries use `s6`. Klahan matches the English source name
(Thai source alias: พยัคฆ์เมฆา). Local filenames match the existing roster IDs.

| Local file | Source name | Form | Source image |
| --- | --- | --- | --- |
| โคลท์.webp | Colt | s6 | images/heroes/thumb/L+/6/Tex_HeroIcon_101136Big.webp |
| คลาฮาน.webp | Klahan | s6 | images/heroes/thumb/L+/6/Tex_HeroIcon_101376Big.webp |
| ไป่หลง.webp | Bai Long | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101546Big.webp |
| พีดัม.webp | Bi Dam | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_100706Big.webp |
| ชาแฮอิน.webp | Cha Hae-in | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101746Big.webp |
| เซอิน.webp | Shane | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_100876Big.webp |
| ทากะ.webp | Taka | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101146Big.webp |
| ซองจินอู.webp | Sung Jinwoo | s6 | images/heroes/thumb/L+/6/Tex_HeroIcon_101736Big.webp |
| เดซี่.webp | Daisy | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101176Big.webp |
| เอสปาด้า.webp | Espada | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_100866Big.webp |
| มิโฮะ.webp | Miho | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101396Big.webp |
| ปาสคาล.webp | Pascal | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101006Big.webp |
| ลูลี่.webp | Ruri | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_100846Big.webp |
| เบลลีก้า awake.webp | Velika | awk | images/heroes/thumb/L/AWK/Tex_HeroIcon_400817Big.webp |
| เสี่ยวเฉียว.webp | Xiao Qiao | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101526Big.webp |
| อารากอน.webp | Aragon | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_100966Big.webp |
| น็อกซ์ awake.webp | Knox | awk | images/heroes/thumb/L/AWK/Tex_HeroIcon_400497Big.webp |
| บิสกิต.webp | Biscuit | s6 | images/heroes/thumb/L+/6/Tex_HeroIcon_101106Big.webp |
| ออร์ลี่.webp | Orly | s6 | images/heroes/thumb/L+/6/Tex_HeroIcon_101266Big.webp |
| ไป๋เจียว.webp | Bai Jiao | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101556Big.webp |
| กวนอู.webp | Guan Yu | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_101616Big.webp |
| เนีย.webp | Nia | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_100856Big.webp |
| ซีค.webp | Sieg | s6 | images/heroes/thumb/L/6/Tex_HeroIcon_100886Big.webp |

## Rare roster portraits (2026-09-25)

Added 36 portraits for the expanded Rare roster from the same Atlas metadata.
Heavenia uses her awakened portrait; the other 35 use six-star base portraits.
Transparent compressed WebP originals are loaded locally with the existing lazy loading.

| Local file | Source name | Form | Source image |
| --- | --- | --- | --- |
| แบล็คโรส.webp | Black Rose | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101116Big.webp |
| แคทตี้.webp | Catty | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101156Big.webp |
| เฮฟเว่นเนีย awake.webp | Heavenia | awk | images/heroes/thumb/R/AWK/Tex_HeroIcon_400677Big.webp |
| โฮกิ้น.webp | Hokin | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100076Big.webp |
| เจน.webp | Jane | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100926Big.webp |
| จิน.webp | Jin | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101166Big.webp |
| จูพี้.webp | Jupy | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100746Big.webp |
| ลีโอ.webp | Leo | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100216Big.webp |
| เมย์.webp | May | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100946Big.webp |
| เรย์.webp | Rei | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101186Big.webp |
| สนิปเปอร์.webp | Snipper | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100736Big.webp |
| โซอี.webp | Soi | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100716Big.webp |
| เสี่ยว.webp | Xiao | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101856Big.webp |
| จูล่ง.webp | Zhao Yun | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101596Big.webp |
| เอเรียล.webp | Ariel | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100656Big.webp |
| เบน.webp | Bane | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100286Big.webp |
| คลีโอ.webp | Cleo | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100356Big.webp |
| โจ๊กเกอร์.webp | Joker | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100776Big.webp |
| หลิงหลิง.webp | Ling Ling | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101496Big.webp |
| โนโฮ.webp | Noho | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100986Big.webp |
| เซร่า.webp | Sera | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100936Big.webp |
| ซิลเวีย.webp | Sylvia | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100826Big.webp |
| ยูริ.webp | Yuri | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100186Big.webp |
| อีวาน.webp | Evan | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100756Big.webp |
| ลี.webp | Li | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100646Big.webp |
| ยูจินโฮ.webp | Yoo Jinho | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101756Big.webp |
| โคลอี้.webp | Chloe | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100976Big.webp |
| คาริน.webp | Karin | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100766Big.webp |
| คารอน.webp | Karon | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100786Big.webp |
| อีจูฮี.webp | Lee Joohee | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_101766Big.webp |
| ลูซี่.webp | Lucy | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100806Big.webp |
| ซาร่า.webp | Sarah | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100486Big.webp |
| ยูอิ.webp | Yui | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100836Big.webp |
| อสุรา.webp | Asura | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100996Big.webp |
| ลาเนีย.webp | Lania | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100426Big.webp |
| วิคตอเรีย.webp | Victoria | s6 | images/heroes/thumb/R/6/Tex_HeroIcon_100796Big.webp |
