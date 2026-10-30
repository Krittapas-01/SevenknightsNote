/**
 * ชื่ออังกฤษของอัศวิน (ใช้ค้นหา + จับคู่ชื่อไฟล์รูป) — ข้อมูลล้วน ไม่มี import
 * ใช้ทั้งในเว็บ (data/heroes.ts) และ Pages Function ที่ทำรูปตัวอย่างลิงก์ Discord (web/functions/og)
 */
/** ชื่ออังกฤษในเกม */
export const EN_NAME: Record<string, string> = {
  ไพร์: 'Fai', เกลลิดัส: 'Gelidus', มิเลีย: 'Melia', จูริ: 'Juri', โรซี่: 'Rosie', ซอรัน: 'Sunran', ลูดี้: 'Rudy', ไอลีน: 'Eileene',
  อาริส: 'Aris', ซิลเวสตา: 'Silvesta', สกัลด์: 'Skuld', ยุนกอน: 'Yoongun', เคลมิส: 'Clemyth', เดลโลนส์: 'Dellons',
  ออร์ก้า: 'Orkah', โดยอง: 'Dongyoung', ฮายอน: 'Hayeon', อีจูฉี: 'Hayeon', แร็ดกริด: 'Radgrid', ลิโป้: 'Lu Bu', น็อกซ์: 'Knox',
  เฮเลเนีย: 'Hellenia', แทโอ: 'Teo', เทโอ: 'Teo', ไคล์: 'Kyle', วาเนสซา: 'Vanessa', ยอนฮี: 'Yeonhee', ธรูด: 'Trude',
  เฟรย่า: 'Freyja', ริน: 'Rin', 'บรันซ์ & บรันเซล': 'Branze & Bransel', เจฟ: 'Jave', คาร์มา: 'Karma',
  แรนด์กริด: 'Randgrid', อากีลา: 'Aquila', เรเชล: 'Rachel', สไปค์: 'Spike', ซุนหงอคง: 'Sun Wukong',
  'คาร์ล เฮรอน': 'Karl Heron', เจโอ: 'Jeo',
}

export const GOLD_EN: Record<string, string> = {
  'ไพร์': "Fai",
  'เกลลิดัส': "Gelidus",
  'จูริ': "Juri",
  'มิเลีย': "Melia",
  'โรซี่': "Rosie",
  'เอซ': "Ace",
  'อากีลา': "Aquila",
  'อาริส': "Aris",
  'บิสกิต': "Biscuit",
  'บรันซ์ & บรันเซล': "Branze & Bransel",
  'เคลมิส': "Clemyth",
  'โคลท์': "Colt",
  'เดลโลนส์': "Dellons",
  'โดยอง': "Dongyoung",
  'ไอลีน': "Eileene",
  'เอลิเซีย': "Elysia",
  'เฟรย่า': "Freyja",
  'ฮายอน': "Hayeon",
  'เจฟ': "Jave",
  'คางุระ': "Kagura",
  'คาร์ล เฮรอน': "Karl Heron",
  'คาร์มา': "Karma",
  'คลาฮาน': "Klahan",
  'คริส': "Kris",
  'ไคล์': "Kyle",
  'คิริเอล': "Kyrielle",
  'ลิโป้': "Lu Bu",
  'เมลคีร์': "Mercure",
  'มิสต์': "Mist",
  'นาจา': "Nezha",
  'โอม๊ก': "O'Mok",
  'ออร์ก้า': "Orkah",
  'ออร์ลี่': "Orly",
  'พาลานอส': "Pallanus",
  'เพลตัน': "Platin",
  'เรเชล': "Rachel",
  'แร็ดกริด': "Radgrid",
  'แรนด์กริด': "Randgrid",
  'เรกินเลฟ': "Reginleif",
  'ริน': "Rin",
  'ลูดี้': "Rudy",
  'ไรอัน': "Ryan",
  'ซิลเวสตา': "Silvesta",
  'สกัลด์': "Skuld",
  'สไปค์': "Spike",
  'ซุนหงอคง': "Sun Wukong",
  'ซองจินอู': "Sung Jinwoo",
  'ซอรัน': "Sunran",
  'จูดาส': "Judas",
  'กิยู': "Giyu",
  'ชิโนบุ': "Shinobu",
  'ทันจิโร่': "Tanjiro",
  'เซนอิทสึ': "Zenitsu",
  'แทโอ': "Teo",
  'ธรูด': "Trude",
  'วาเนสซา': "Vanessa",
  'ยอนฮี': "Yeonhee",
  'ยุนกอน': "Yoongun",
  'อลิซ': "Alice",
  'เอมิเลีย': "Amelia",
  'อารากอน': "Aragon",
  'ไป๋เจียว': "Bai Jiao",
  'ไป่หลง': "Bai Long",
  'บาลิสต้า': "Ballista",
  'พีดัม': "Bi Dam",
  'ชาแฮอิน': "Cha Hae-in",
  'ชานชะเลอร์': "Chancellor",
  'เดซี่': "Daisy",
  'แทอู๊ด': "Deo",
  'เตียวเสี้ยน': "Diaochan",
  'เอสปาด้า': "Espada",
  'กวนอู': "Guan Yu",
  'น็อกซ์': "Knox",
  'รีน่า': "Lina",
  'มิโฮะ': "Miho",
  'เนีย': "Nia",
  'ปาสคาล': "Pascal",
  'ลุค': "Rook",
  'ลูลี่': "Ruri",
  'เซอิน': "Shane",
  'ซีค': "Sieg",
  'ทากะ': "Taka",
  'เบลลีก้า': "Velika",
  'เสี่ยวเฉียว': "Xiao Qiao",
  'ยูชิน': "Yu Shin",
}

export const PURPLE_EN: Record<string, string> = {
  'เอเรียล': 'Ariel', 'อสุรา': 'Asura', 'เบน': 'Bane', 'แบล็คโรส': 'Black Rose', 'แคทตี้': 'Catty', 'โคลอี้': 'Chloe', 'คลีโอ': 'Cleo', 'อีวาน': 'Evan', 'เฟิงเยี่ยน': 'Feng Yan', 'เฮฟเว่นเนีย': 'Heavenia', 'เฮเลเนีย': 'Hellenia', 'โฮกิ้น': 'Hokin', 'เจน': 'Jane', 'จิน': 'Jin', 'โจ๊กเกอร์': 'Joker', 'จูพี้': 'Jupy', 'คาริน': 'Karin', 'คารอน': 'Karon', 'ลาเนีย': 'Lania', 'อีจูฮี': 'Lee Joohee', 'ลีโอ': 'Leo', 'ลี': 'Li', 'หลิงหลิง': 'Ling Ling', 'ลูซี่': 'Lucy', 'เมย์': 'May', 'โนโฮ': 'Noho', 'แรคคูน': 'Rahkun', 'เรย์': 'Rei', 'ซาร่า': 'Sarah', 'เซร่า': 'Sera', 'สนิปเปอร์': 'Snipper', 'โซอี': 'Soi', 'ซิลเวีย': 'Sylvia', 'วิคตอเรีย': 'Victoria', 'เสี่ยว': 'Xiao', 'ยูจินโฮ': 'Yoo Jinho', 'ยูอิ': 'Yui', 'ยูริ': 'Yuri', 'จูล่ง': 'Zhao Yun',
}

/**
 * คีย์ชื่อไฟล์รูป (ตัวพิมพ์เล็ก ไม่มีนามสกุล) ที่ลองจับคู่ตามลำดับ: ชื่อไทยตรง ๆ → ชื่ออังกฤษ + " awake"
 * ร่างปกติใช้แทนร่าง awake ไม่ได้ (ต้องตรงร่าง)
 */
export function imageKeys(name: string): string[] {
  const base = name.replace(/ awake.*$/, '')
  const en = EN_NAME[base] ?? GOLD_EN[base] ?? PURPLE_EN[base]
  const suffix = name.slice(base.length) // เช่น " awake"
  return [name, en && en + suffix].filter((k): k is string => !!k).map((k) => k.toLowerCase())
}
