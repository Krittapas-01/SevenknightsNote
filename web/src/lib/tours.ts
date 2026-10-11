import type { Tour, TourStep } from './tour'
import { L } from './i18n'

/**
 * เนื้อหาการสอนใช้แต่ละหน้า (ส่องปุ่มจริงด้วย data-tour / data-onboard)
 * สอนเฉพาะสิ่งที่อยู่ในหน้านั้น ตอนที่ผู้ใช้เข้ามาถึงจริง — ไม่ยัดทุกอย่างตั้งแต่หน้าแรก
 */
const s = (sel: string | undefined, title: [string, string], body: [string, string], extra: Partial<TourStep> = {}): TourStep =>
  ({ sel, title: L(...title), body: L(...body), ...extra })

// ใช้ร่วมกันระหว่างแก้บ้านศัตรู / แก้ทีมแก้ (ส่องเฉพาะการ์ดที่กำลังแก้)
const E = '[data-tour-editing]'
const teamSteps = (who: [string, string]): TourStep[] => [
  s(`${E} [data-tour="team-body"]`, [`ช่องอัศวินของ${who[0]}`, `${who[1]} hero slots`],
    ['แตะช่อง + เพื่อเลือกช่องที่จะใส่ แถบอัศวินจะเด้งขึ้นมาด้านล่าง\n(แตะช่องว่าง 2 ครั้ง = เปิดตารางอัศวินทั้งหมด · แตะอัศวินในทีม 2 ครั้ง = เอาออก · ลากเพื่อสลับตำแหน่ง)',
      'Tap a + slot to choose where a hero goes — the hero bar pops up at the bottom.\n(Double-tap an empty slot for the full grid · double-tap a hero to remove it · drag to swap.)'], { action: 'click' }),
  s('[data-tour="hero-dock"]', ['แถบอัศวิน', 'Hero bar'],
    ['ลากอัศวินจากตรงนี้ไปวางในช่องได้เลย · มีค้นหาชื่อ / กรองประเภท / ดูทั้งหมด และแท็บสัตว์เลี้ยง\nอัศวินที่ขึ้นว่า "ในทีม" ใช้ไปแล้ว',
      'Drag heroes from here into a slot · search, filter by type, open the full grid, or switch to pets.\nHeroes marked "In team" are already used.'], { wait: 1200 }),
  s(`${E} [data-tour="team-pet"]`, ['สัตว์เลี้ยง', 'Pet'],
    ['ทุกทีมต้องมีสัตว์เลี้ยง 1 ตัว (บันทึกไม่ได้ถ้ายังไม่เลือก) · แตะแล้วเลือกจากแท็บสัตว์เลี้ยง',
      'Every team needs one pet (you can\'t save without it) · tap it and pick from the Pets tab.']),
  s(`${E} [data-tour="team-formation"]`, ['รูปแบบ', 'Formation'],
    ['แตะเพื่อเปลี่ยน พื้นฐาน / สมดุล / บุก / ป้องกัน — จำนวนช่องหน้า-หลังเปลี่ยนตาม อัศวินที่ใส่ไว้ไม่หาย',
      'Tap to switch Basic / Balanced / Attack / Protective — front/back slots change, placed heroes stay.']),
  s(`${E} [data-tour="team-skills"]`, ['ลำดับการใช้สกิล', 'Skill order'],
    ['แตะวงนี้ แล้วแตะสกิลตามลำดับที่อยากให้ออก (สูงสุด 3 ครั้ง)\nเลขสีบนรูปอัศวิน = ลำดับ: แดง 1 · เหลือง 2 · เขียว 3',
      'Tap this, then tap skills in the order they should fire (up to 3).\nColored numbers on portraits show the order: red 1 · yellow 2 · green 3.']),
  s(`${E} [data-tour="team-speed"]`, ['ความเร็วทีม', 'Team speed'],
    ['ใส่ความเร็วรวมของทีม (ไม่ใส่ก็ได้) — ใช้เทียบว่าใครได้ออกก่อน', 'Total team speed (optional) — handy to compare who moves first.']),
]

export const TOURS: Tour[] = [
  {
    id: 'guild-editor',
    steps: [
      s(undefined, ['ยินดีต้อนรับสู่กิลด์ของคุณ 👑', 'Welcome to your guild 👑'],
        ['คุณแก้ไขกิลด์นี้ได้ — ขอพาดูส่วนสำคัญสั้น ๆ ประมาณ 1 นาที\nกดข้ามได้ตลอด และดูซ้ำได้จากปุ่ม ? ด้านบน',
          'You can edit this guild — here\'s a quick 1-minute tour.\nSkip any time, and replay it from the ? button at the top.']),
      s('[data-tour="guild-tabs"]', ['สองส่วนหลักของกิลด์', 'The two halves of a guild'],
        ['แผนสงคราม = แผนบุก/แผนกันที่ทั้งกิลด์ใช้\nบ้านศัตรู = บ้านที่เจอ พร้อมทีมที่ใช้ตีผ่าน (ทีมแก้)',
          'War plans = attack/defense plans the whole guild follows.\nEnemy defenses = teams you met, with the teams that beat them (counters).']),
      s('[data-onboard="new-attack"]', ['สร้างแผนบุก', 'Create an attack plan'],
        ['จัด 5 ไม้ — แต่ละไม้เลือกบ้านศัตรูที่จดไว้ ทีมแก้จะตามมาเอง แล้วระบบเช็กอัศวินซ้ำให้',
          'Fill 5 slots — pick a saved enemy defense per slot, its counters come along, and duplicates are checked for you.']),
      s('[data-onboard="announce"]', ['ประกาศแผนให้ทั้งกิลด์', 'Announce the plan'],
        ['เลือกแผนที่จะใช้วันนี้ (และกิลด์ที่เจอ) → ทุกคนเห็นแถบประกาศด้านบนทุกหน้า\nต่อ Discord ไว้ ระบบจะโพสต์ให้ด้วย',
          'Pick today\'s plan (and opponent) → everyone sees it in the bar on every page.\nConnect Discord and it\'s posted there too.']),
      s('[data-onboard="share"]', ['ส่งลิงก์ให้คนในกิลด์', 'Share with your guild'],
        ['ลิงก์นี้ดูได้อย่างเดียว ส่งในแชตกิลด์ได้เลย ไม่ต้องสมัคร', 'This link is view-only — post it in guild chat, no sign-up needed.']),
      s('[data-tour="guild-settings"]', ['ตั้งค่าการแก้ไข', 'Edit settings'],
        ['เปลี่ยนรหัสแก้ไข / ลิงก์สำหรับคนแก้ / ให้ยศใน Discord แก้ได้ / ลบกิลด์',
          'Change the edit password, get the editor link, let Discord roles edit, or delete the guild.']),
      s('[data-tour="tab-targets"]', ['ไปที่บ้านศัตรู', 'Go to enemy defenses'],
        ['เริ่มจากจดบ้านศัตรูก่อน — กดแท็บนี้', 'Start by saving enemy defenses — tap this tab.'], { action: 'click' }),
      s('[data-onboard="add-target"]', ['จดบ้านศัตรูบ้านแรก', 'Save your first enemy defense'],
        ['เจอบ้านใหม่ก็กดปุ่มนี้ — เข้าไปแล้วจะสอนการจัดทีมทีละขั้น', 'Tap this when you meet a new defense — the team editor tour starts inside.']),
      s('[data-tour="help-button"]', ['ดูการสอนซ้ำ', 'Replay the guide'],
        ['ทุกหน้าที่มีการสอน กดปุ่ม ? นี้เพื่อดูซ้ำได้ · รีเซ็ตทั้งหมดได้ที่ ตั้งค่า', 'On any page with a guide, tap ? to replay it · reset all guides in Settings.']),
    ],
  },
  {
    id: 'guild-viewer',
    steps: [
      s('[data-tour="guild-tabs"]', ['แผนและบ้านศัตรูของกิลด์', 'Plans and enemy defenses'],
        ['แผนสงคราม = แผนที่กิลด์ให้ใช้ · บ้านศัตรู = บ้านที่เจอพร้อมทีมที่ตีผ่าน — กดเข้าไปดูรายละเอียดได้',
          'War plans = what the guild uses · Enemy defenses = teams met and how to beat them — open any to see details.']),
      s('[data-onboard="announce"]', ['แผนที่ใช้วันนี้', 'Today\'s plan'],
        ['ดูว่าวันนี้กิลด์ประกาศให้ใช้แผนไหน (แถบประกาศด้านบนก็กดได้)', 'See which plan the guild announced today (the bar at the top is clickable too).'], { wait: 800 }),
      s('[data-tour="guild-login"]', ['อยากช่วยแก้?', 'Want to edit?'],
        ['ใส่รหัสแก้ไขของกิลด์ หรือเข้าด้วย Discord (ถ้าหัวกิลด์เปิดให้ยศของคุณแก้ได้)', 'Enter the guild\'s edit password, or sign in with Discord if your role is allowed.']),
    ],
  },
  {
    id: 'target-view',
    steps: [
      s('[data-tour="counter-tabs"]', ['ทีมแก้ของบ้านนี้', 'Counters for this defense'],
        ['แต่ละแท็บคือทีมที่ใช้ตีบ้านนี้ผ่าน\nกดค้างแล้วลากเพื่อเรียงลำดับ — #1 (มงกุฎ) คือทีมที่แนะนำให้ใช้ก่อน',
          'Each tab is a team that beat this defense.\nPress and drag to reorder — #1 (crown) is the one to try first.'], { wait: 800 }),
      s('[data-tour="vs-arena"]', ['ทีมเรา VS บ้านศัตรู', 'Your team VS the defense'],
        ['แตะอัศวินเพื่อดูอุปกรณ์/ค่าความสามารถที่จดไว้ · เลขสีบนรูป = ลำดับการใช้สกิล',
          'Tap a hero to see the gear/stats noted · colored numbers = skill order.']),
      s('[data-tour="edit-fab"]', ['แก้ไข', 'Edit'],
        ['กดปุ่มนี้เพื่อแก้ทีมแก้ เพิ่มทีมแก้ใหม่ หรือแก้บ้านศัตรู — ลองกดดู', 'Edit a counter, add a new one, or edit the defense — give it a tap.'], { action: 'click' }),
      s('[data-tour="edit-menu"]', ['เลือกสิ่งที่จะแก้', 'Pick what to edit'],
        ['เลือกเมนูไหนก็ได้ — ตอนแก้ครั้งแรกจะมีสอนการจัดทีมต่อ', 'Pick any — the first time you edit, the team editor tour continues there.'], { wait: 1000 }),
    ],
  },
  {
    id: 'target-new',
    steps: [
      s(undefined, ['จดบ้านศัตรู', 'Save an enemy defense'],
        ['จัดทีมให้เหมือนบ้านที่เจอในเกม ใส่แท็ก แล้วบันทึก — ขอพาดูทีละส่วน', 'Rebuild the defense you met, tag it, and save — here\'s how, step by step.']),
      ...teamSteps(['บ้านศัตรู', 'Enemy']),
      s('[data-tour="tag-editor"]', ['แท็กบ้าน', 'Tags'],
        ['เลือกประเภท 1 อย่าง (กายภาพ / เวท / แทงก์) + แท็กเสริม เช่น หลังไว — ใช้ค้นหาและจัดแผน',
          'Pick one type (Physical / Magic / Tank) plus extras like Fast back — used for search and planning.']),
      s('[data-tour="save-actions"]', ['บันทึก', 'Save'],
        ['เสร็จแล้วกดบันทึก — จากนั้นเพิ่มทีมแก้ (ทีมที่ใช้ตีบ้านนี้) ต่อได้เลย', 'Save when done — then add counters (teams that beat it).']),
    ],
  },
  {
    id: 'counter-edit',
    steps: [
      s(undefined, ['จดทีมแก้', 'Save a counter'],
        ['ทีมแก้ = ทีมที่ใช้ตีบ้านนี้ผ่าน จัดทีม ตั้งลำดับสกิล จดอุปกรณ์ แล้วบันทึก', 'A counter is a team that beat this defense: build it, set skill order, note gear, save.']),
      ...teamSteps(['ทีมแก้', 'Counter']),
      s('[data-tour="library"]', ['เลือกจากที่จดไว้', 'Pick from saved'],
        ['ใช้ทีมแก้ที่เคยจดในบ้านอื่นซ้ำได้ ไม่ต้องจัดใหม่ (หรือพรีเซ็ตส่วนตัวข้าง ๆ)', 'Reuse a counter saved on another defense instead of rebuilding (or your personal presets next to it).']),
      s('[data-tour="stats-import"]', ['อ่านค่าความสามารถจากรูป', 'Read stats from a screenshot'],
        ['แคปหน้าข้อมูลอัศวินในเกม แล้วอัปโหลด/วาง (Ctrl+V) — ระบบอ่านตัวเลขให้ ตรวจแล้วกดใส่\nถ้ารูปเป็นตัวที่ยังไม่อยู่ในทีม จะถามว่าจะเพิ่มเข้าทีมไหม',
          'Screenshot the hero info page in game and upload/paste it (Ctrl+V) — numbers are read for you, check and apply.\nIf it\'s a hero not on the team yet, you\'ll be asked to add it.']),
      s('[data-tour="save-actions"]', ['บันทึก', 'Save'],
        ['กดบันทึก — ถ้ายังไม่ได้ตั้งลำดับสกิลหรือความเร็ว ระบบจะถามก่อน', 'Save — if skill order or speed is missing, you\'ll be asked first.']),
    ],
  },
  {
    id: 'plan-view',
    steps: [
      s('[data-tour="alloc"]', ['จัดสรรอัศวิน', 'Hero allocation'],
        ['ดูว่าแต่ละไม้ใช้ใครบ้าง — อัศวินที่ใช้ซ้ำหลายไม้จะขึ้นสีแดง', 'See who each slot uses — heroes used in more than one slot turn red.'], { wait: 800 }),
      s('#slot-0', ['การ์ดไม้', 'Slot cards'],
        ['ทีมหลักของแต่ละไม้ · แตะการ์ดเพื่อดูรายละเอียด ตัวสำรอง และทีมที่จะตี', 'Main team per slot · tap a card for details, backups and the target.'], { wait: 1000 }),
      s('[data-tour="plan-edit"]', ['แก้ไขแผน', 'Edit the plan'],
        ['กดเพื่อเริ่มแก้ — ลองกดดู', 'Tap to start editing — try it.'], { action: 'click' }),
    ],
  },
  {
    id: 'plan-edit',
    steps: [
      s('#slot-0', ['ตั้งทีละไม้', 'One slot at a time'],
        ['แตะการ์ดไม้เพื่อเปิดหน้าต่างตั้งไม้: ① บ้านที่จะตี › ② ทีมแก้ › ③ อุปกรณ์', 'Tap a slot card to open the slot editor: ① target › ② counter › ③ gear.'], { wait: 1200 }),
      s('[data-tour="alloc"]', ['เช็กอัศวินซ้ำ', 'Check duplicates'],
        ['แถบนี้บอกตัวซ้ำระหว่างไม้ · มีปุ่มจัดอัตโนมัติเลือกตัวสำรองที่ไม่ชนกันให้', 'Shows heroes clashing across slots · auto-assign picks backups that don\'t clash.'], { wait: 800 }),
      s('[data-tour="plan-save"]', ['บันทึกแผน', 'Save the plan'],
        ['เสร็จแล้วกดบันทึกแผน แล้วไปประกาศในหน้ากิลด์ให้ทุกคนใช้', 'Save, then announce it from the guild page so everyone uses it.']),
    ],
  },
  {
    id: 'plan-wizard',
    steps: [
      s('[data-tour="wiz-steps"]', ['3 ขั้นต่อไม้', '3 steps per slot'],
        ['① บ้านที่จะตี › ② ทีมแก้ › ③ อุปกรณ์/ค่าความสามารถ — กดข้ามไปมาได้', '① Target › ② Counter › ③ Gear/stats — jump between them anytime.'], { wait: 1200 }),
      s('[data-tour="wiz-body"]', ['ทำทีละขั้น', 'Fill it in'],
        ['เลือกบ้านจากที่จดไว้ ทีมแก้จะตามมาเอง แก้ต่อได้ · ขั้นสุดท้ายจดอุปกรณ์รายตัว แล้วกด เสร็จ',
          'Pick a saved defense and its counter comes along (edit freely) · note gear in the last step, then tap Done.']),
    ],
  },
]
