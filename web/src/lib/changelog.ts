/**
 * แพทช์โน้ต (ใหม่สุดอยู่บนสุด) แบบ Minecraft: เวอร์ชัน + ชื่อแพทช์ → หมวด ใหม่ / เปลี่ยน / แก้บั๊ก → หัวข้อย่อย → รายการ
 * เพิ่มแพทช์ใหม่ไว้บนสุดทุกครั้งที่ deploy · id ต้องไม่ซ้ำ (ใช้วันที่ + ตัวอักษร) — เครื่องที่ยังไม่เห็น id ล่าสุดจะเห็นป๊อปอัป
 */
import { EN } from './i18n'

export type PatchItem = { text: string; guide?: string }
export type PatchGroup = { title?: string; items: PatchItem[] }
export type PatchKind = 'new' | 'change' | 'fix'
export type ChangelogEntry = {
  id: string
  version: string
  date: string
  /** ชื่อแพทช์ */
  title: string
  /** สรุป 1–2 บรรทัด */
  summary?: string
  sections: { kind: PatchKind; groups: PatchGroup[] }[]
}
export const PATCH_KIND: Record<PatchKind, string> = EN
  ? { new: 'New features', change: 'Changes', fix: 'Bug fixes' }
  : { new: 'ฟีเจอร์ใหม่', change: 'การเปลี่ยนแปลง', fix: 'แก้บั๊ก' }
const g = (title: string | undefined, ...items: (string | PatchItem)[]): PatchGroup => ({ title, items: items.map((x) => (typeof x === 'string' ? { text: x } : x)) })

const CHANGELOG_TH: ChangelogEntry[] = [
  {
    id: '2026-10-10',
    version: '1.3',
    date: '10 ต.ค. 2026',
    title: 'Light & Words',
    summary: 'ภาษาอังกฤษ โหมดสว่าง คำเรียกใหม่ แผนสงครามแบบการ์ด และตั้งไม้ทีละขั้น',
    sections: [
      { kind: 'new', groups: [
        g('ภาษาอังกฤษ', 'ตั้งค่า → ภาษา / Language: ไทย / English', 'ชื่ออัศวินและสัตว์เลี้ยงใช้ชื่อตามเกมเวอร์ชันอังกฤษ · ค้นหาได้ทั้งชื่อไทยและอังกฤษ'),
        g('โหมดสว่าง', 'ตั้งค่า → ธีม: มืด / สว่าง / ตามเครื่อง'),
        g('แผนสงครามแบบการ์ด',
          'แผนบุกและแผนกันเป็นการ์ดแบบหน้าจัดทีมในเกม 1 ใบต่อ 1 ไม้',
          'กดการ์ดเพื่อดูรายละเอียด และเลื่อนดูไม้ถัดไปด้วยปุ่ม ‹ ›'),
        g('ตั้งไม้ทีละขั้น',
          'บ้านที่จะตี → ทีมแก้ → อุปกรณ์/ค่าความสามารถ',
          'แผนกันเริ่มที่บ้านกันเลย · กดออกนอกหน้าต่างจะถามก่อนถ้ายังไม่ได้บันทึก'),
        g('ดูรายละเอียดทั้งทีม', 'ป๊อปอัปรูปแบบทีม + อุปกรณ์/ค่าความสามารถของอัศวินทีละตัว'),
        g('จัดทีมง่ายขึ้น',
          'ดับเบิลคลิกช่องว่าง = เปิดหน้าเลือกอัศวินแบบใหญ่',
          'ลากสลับตำแหน่งอัศวินข้ามการ์ดได้ (เช่น ระหว่างทีมแก้กับทีมสำรอง)',
          'ปุ่ม "ล้างข้อมูลตัวนี้" ในตารางอุปกรณ์/ค่าความสามารถ'),
        g('หน้าบ้านศัตรู', 'ปุ่ม "แก้ไข" ลอยมุมขวาล่าง กดแล้วเลือก แก้ทีมแก้ / เพิ่มทีมแก้ / แก้บ้านศัตรู'),
        g('ตั้งค่า',
          'เมนู ☰ ล่างสุด: ขนาดหน้าเว็บ ลดแอนิเมชัน เลื่อนหน้านุ่ม และข้อมูลในเครื่อง',
          'หน้ากิลด์สลับมุมมองคนแก้/คนดูได้'),
        g('แถบประกาศ', 'โชว์แผนที่ใช้วันนี้ให้ตรงกับวัน (วันตี = แผนบุก · วันจัดบ้าน = แผนกัน)'),
      ] },
      { kind: 'change', groups: [
        g('เปลี่ยนคำเรียก',
          'ฮีโร่ → อัศวิน · สเตตัส → ค่าความสามารถ · จองสกิล → ลำดับการใช้สกิล · ค่ายกล → รูปแบบ · สปีด → ความเร็ว',
          'ของ/แหวน → อุปกรณ์/เครื่องประดับ · แท็ก โจมตี/เวทย์/ถึก → กายภาพ/เวท/แทงก์ (แท็กเดิมของกิลด์ไม่หาย)',
          'ทีมเป้าหมาย/ทีมศัตรู → บ้านศัตรู · ทีมบุก → ทีมแก้ · คอมพ์สำรอง → ทีมสำรอง · ทีมกันของเรา → บ้านกัน'),
        g('แผนสงคราม',
          'ทุกทีมต้องมีสัตว์เลี้ยง และถามก่อนถ้ายังตั้งลำดับการใช้สกิลไม่ครบ',
          'แผนกันเตือนถ้าใช้อัศวินหรือสัตว์เลี้ยงซ้ำข้ามไม้',
          'ประกาศแผนบุกกับแผนกันแยกกัน ประกาศอันหนึ่งแล้วอีกอันไม่หลุด'),
        g('ค่าความสามารถ', 'อ่านจากรูปแม่นขึ้น (ใช้ภาพป๊อปอัปในหน้าจัดทีมได้) และใส่เซต/เครื่องประดับ/คำอธิบายได้ในหน้าต่างเดียว'),
        g('หน้าตา',
          'การ์ดทีมขนาดเท่ากันทุกที่ ไม่ว่ารูปแบบไหน',
          'แท็บมีแถบทองเลื่อนตาม และแถบเลื่อนสีทองทั้งเว็บ',
          'ปุ่มลบกดสองครั้งเพื่อยืนยัน แทนหน้าต่างของเบราว์เซอร์'),
        g('ค้นหาบ้านศัตรู', 'ค้นจากทีมบ้านศัตรูอย่างเดียว ไม่รวมทีมแก้ (ผลค้นหาตรงขึ้น)'),
        g('ปิดไว้ชั่วคราว', 'คู่มือ/ทัวร์สอนใช้ และปุ่มบันทึกเป็นรูป — กำลังทำใหม่', 'เลือกบ้านจากที่จดไว้ในแผนบุก — ตอนนี้จัดบ้านที่จะตีเองในหน้าต่างตั้งไม้'),
      ] },
      { kind: 'fix', groups: [
        g(undefined,
          'กดกากบาทหรือ Esc ในหน้าต่างถาม = ยกเลิก (เดิมไปทำขั้นต่อไปเลย)',
          'ดาวท้าย banner กิลด์ไม่ทับปุ่มรหัสแก้ไขแล้ว',
          'ไม่มีเคอร์เซอร์กะพริบบนข้อความเวลาคลิกหน้าเว็บ',
          'ลากแถบแผนสงครามออกนอกขอบแล้วปล่อยเมาส์ แถบไม่เลื่อนตามเมาส์ต่อเองแล้ว',
          'แท็บหน้ากิลด์ (แผนสงคราม ↔ บ้านศัตรู) เลื่อนเข้าแบบมีแอนิเมชันจนจบ ไม่สะดุดกลางทาง',
          'ค้นหาบ้านศัตรูด้วยชื่ออัศวินภาษาอังกฤษได้ (เช่น Melia)',
          'ลบประกาศ / ลบแผน / ลบพรีเซต ใช้ปุ่มกดสองครั้ง ไม่มีหน้าต่างของเบราว์เซอร์เด้งขึ้นมาแล้ว',
          'มือถือ: ช่องกรอกค่าความสามารถเรียงคอลัมน์เดียว ชื่อค่าไม่โดนตัด',
          'หน้ารายละเอียดไม้ไม่มีชื่อไม้ซ้ำสองที่แล้ว',
          'คำเก่าที่ยังหลงอยู่เปลี่ยนให้ครบ (เช่น จองแล้ว → ตั้งแล้ว, คิว → ลำดับ, ของ → อุปกรณ์)'),
      ] },
    ],
  },
  {
    id: '2026-10-08',
    version: '1.2',
    date: '8 ต.ค. 2026',
    title: 'Practice Grounds',
    summary: 'วิธีใช้ในแต่ละหน้า กิลด์ทดลอง และหน้ากิลด์ลื่นขึ้น',
    sections: [
      { kind: 'new', groups: [
        g('วิธีใช้', 'ปุ่ม "วิธีใช้" ในหน้ากิลด์ บ้านศัตรู และแผนสงคราม พร้อมปุ่มลองฝึกในกิลด์ทดลอง (กดได้ทุกอย่าง ไม่บันทึกจริง)'),
        g('แผนสงคราม', { text: 'ถามใส่ความเร็วทีมให้ตอนบันทึก ถ้าใส่ความเร็วโจมตีครบทุกตัว', guide: 'stats' }),
        g('ติดต่อ', { text: 'ปุ่ม Discord มุมขวาล่าง สำหรับแจ้งบั๊กหรือเสนอฟีเจอร์', guide: 'contact' }),
      ] },
      { kind: 'change', groups: [
        g(undefined,
          'หน้าบ้านศัตรูเบาลงและเลื่อนด้วยลูกกลิ้งเมาส์ลื่นขึ้น แม้กิลด์จะมีหลายสิบทีม',
          'หน้าคำนวณแต้มเบ็ดเสร็จบอกวันเวลาจบซีซัน และตราแรงค์คมขึ้น'),
      ] },
    ],
  },
  {
    id: '2026-10-07',
    version: '1.1',
    date: '7 ต.ค. 2026',
    title: 'Quick Load',
    summary: 'หน้ากิลด์โหลดเร็วขึ้น',
    sections: [
      { kind: 'change', groups: [
        g(undefined,
          'เปิดกิลด์ที่เคยเข้าแล้วขึ้นทันที แล้วค่อยอัปเดตข้อมูลล่าสุดตามหลัง',
          { text: 'แท็กหลัก (กายภาพ เวท แทงก์) อยู่หน้าสุดเสมอ แท็กที่เพิ่มเองเรียงตามลำดับที่ใส่', guide: 'targets' }),
      ] },
    ],
  },
  {
    id: '2026-10-06',
    version: '1.0',
    date: '6 ต.ค. 2026',
    title: 'Presets & Favorites',
    summary: 'พรีเซต ทีมที่ชอบ และแผนบุกหลายบ้าน',
    sections: [
      { kind: 'new', groups: [
        g('ทีมที่ชอบ & พรีเซต',
          'กด 👍 ทีมแก้ที่ตีแล้วชนะ เก็บไว้ดูในหน้า "พรีเซต & ทีมที่ชอบ" (ล็อกอิน Discord)',
          'บันทึกทีมแก้เป็นพรีเซตของตัวเอง ใช้ได้ทุกกิลด์ทุกเครื่อง'),
        g('แผนบุก', { text: 'ไม้ 1 ไม้ใส่บ้านที่จะตีได้สูงสุด 3 บ้าน', guide: 'plans' }),
        g('ค่าความสามารถ', { text: 'อ่านจากรูปหน้าข้อมูลอัศวินในเกม และปุ่มใช้ค่าล่าสุดของตัวนั้น', guide: 'stats' }),
        g('สงครามเบ็ดเสร็จ', 'หน้าคำนวณแต้ม'),
      ] },
      { kind: 'change', groups: [
        g(undefined, { text: 'บ้านศัตรูที่แก้ใน 24 ชม. มีจุดเขียว และทีมที่แก้ล่าสุดอยู่บนสุด', guide: 'targets' }),
      ] },
    ],
  },
]

/** แพทช์โน้ตภาษาอังกฤษ (id/version ตรงกับฝั่งไทย) */
const CHANGELOG_EN: ChangelogEntry[] = [
  {
    id: '2026-10-10', version: '1.3', date: '10 Oct 2026', title: 'Light & Words',
    summary: 'Light mode, English, new wording, card-style war plans and step-by-step slot setup',
    sections: [
      { kind: 'new', groups: [
        g('English', 'Settings → Language: Thai / English · hero and pet names use the English game names'),
        g('Light mode', 'Settings → Theme: Dark / Light / Device'),
        g('Card-style war plans', 'Attack and defense plans show one in-game style team card per slot', 'Tap a card for details, and use ‹ › to move between slots'),
        g('Step-by-step slot setup', 'Defense to attack → counter → gear/stats', 'Defense plans start at the defense step · clicking outside asks before discarding changes'),
        g('Full team details', 'Popup with the team formation + gear/stats of each hero'),
        g('Easier team building', 'Double-click an empty slot to open the large hero picker', 'Drag heroes between cards to swap them (e.g. counter ↔ backup team)', '"Clear this hero" button in the gear/stats table'),
        g('Enemy defense page', 'Floating "Edit" button at the bottom right with Edit counter / Add counter / Edit enemy defense'),
        g('Settings', 'Bottom of the ☰ menu: page size, reduce motion, smooth scrolling and local data', 'Switch between editor and viewer view on the guild page'),
        g('Announcement bar', "Shows today's plan for the day type (attack day = attack plan · setup day = defense plan)"),
      ] },
      { kind: 'change', groups: [
        g('New wording', 'Hero, stats, skill queue, formation and speed now use the in-game terms', 'Tags Attack/Magic/Tank → Physical/Magic/Tank (existing guild tags are kept)', 'Target team → enemy defense · attack team → counter · alternate comp → backup team · our defense → defense'),
        g('War plans', 'Every team needs a pet, and you are asked first if the skill queue is incomplete', 'Defense plans warn about heroes or pets used in more than one slot', 'Attack and defense plans are announced separately'),
        g('Stats', 'More accurate screenshot reading (in-team popups work too), and sets/accessories/notes in the same window'),
        g('Look & feel', 'Team cards are the same size everywhere, whatever the formation', 'Tabs have a sliding gold highlight, and gold scrollbars site-wide', 'Delete buttons ask for a second tap instead of a browser dialog'),
        g('Enemy defense search', 'Searches the enemy team only, not counters (more relevant results)'),
        g('Temporarily off', 'Guides/tours and save-as-image — being reworked', 'Picking saved defenses in attack plans — build the defense to attack in the slot setup instead'),
      ] },
      { kind: 'fix', groups: [
        g(undefined,
          'The X button or Esc in a confirmation now cancels (it used to continue)',
          'The star on the guild banner no longer covers the edit code button',
          'No more blinking text cursor when clicking the page',
          'Dragging the war plan rail past its edge and releasing outside no longer keeps it scrolling with the mouse',
          'Guild page tabs (War plans ↔ Enemy defenses) now slide in smoothly all the way',
          'Enemy defense search finds English hero names (e.g. Melia)',
          'Deleting announcements, plans and presets uses a two-tap button — no more browser pop-ups',
          'Mobile: stat inputs are in a single column so stat names are no longer cut off',
          'Slot details no longer show the slot name twice'),
      ] },
    ],
  },
  {
    id: '2026-10-08', version: '1.2', date: '8 Oct 2026', title: 'Practice Grounds',
    summary: 'Per-page help, a practice guild and smoother guild pages',
    sections: [
      { kind: 'new', groups: [
        g('Help', 'A "Help" button on the guild, enemy defense and war plan pages, with practice in a demo guild (nothing is saved)'),
        g('War plans', { text: 'Asks to fill team speed on save when every hero has attack speed', guide: 'stats' }),
        g('Contact', { text: 'Discord button at the bottom right to report bugs or suggest features', guide: 'contact' }),
      ] },
      { kind: 'change', groups: [
        g(undefined, 'Enemy defense page is lighter and scrolls smoothly even with dozens of teams', 'Total War calculator shows the season end time, with sharper rank emblems'),
      ] },
    ],
  },
  {
    id: '2026-10-07', version: '1.1', date: '7 Oct 2026', title: 'Quick Load',
    summary: 'Guild pages load faster',
    sections: [
      { kind: 'change', groups: [
        g(undefined, 'Guilds you opened before show instantly, then refresh in the background', { text: 'Main tags (Physical, Magic, Tank) always come first; custom tags keep their order', guide: 'targets' }),
      ] },
    ],
  },
  {
    id: '2026-10-06', version: '1.0', date: '6 Oct 2026', title: 'Presets & Favorites',
    summary: 'Presets, favorite teams and multi-defense attack slots',
    sections: [
      { kind: 'new', groups: [
        g('Favorites & presets', 'Tap 👍 on counters that won and find them on the "Presets & favorites" page (Discord login)', 'Save counters as your own presets, usable in every guild on every device'),
        g('Attack plans', { text: 'One slot can target up to 3 defenses', guide: 'plans' }),
        g('Stats', { text: 'Read stats from an in-game hero page screenshot, plus a button to reuse your latest stats', guide: 'stats' }),
        g('Total War', 'Points calculator'),
      ] },
      { kind: 'change', groups: [
        g(undefined, { text: 'Enemy defenses edited in the last 24h get a green dot, and recently edited teams go on top', guide: 'targets' }),
      ] },
    ],
  },
]
export const CHANGELOG = EN ? CHANGELOG_EN : CHANGELOG_TH

export const LATEST_UPDATE = CHANGELOG[0]?.id ?? ''
const KEY = '7k-note:seen-update'

export function seenUpdate(): string | null {
  try { return localStorage.getItem(KEY) } catch { return LATEST_UPDATE }
}
export function markUpdateSeen() {
  try { localStorage.setItem(KEY, LATEST_UPDATE) } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
  window.dispatchEvent(new Event('7k-note:update-seen'))
}
/** อัปเดตที่ผู้ใช้ยังไม่เห็น (ใหม่กว่า id ที่เห็นล่าสุด) */
export function unseenUpdates(seen = seenUpdate()) {
  if (!seen) return CHANGELOG.slice(0, 1)
  const i = CHANGELOG.findIndex((c) => c.id === seen)
  return i < 0 ? CHANGELOG.slice(0, 1) : CHANGELOG.slice(0, i)
}
