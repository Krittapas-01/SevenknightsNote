/**
 * ของในแพ็ค (หน้าเช็กความคุ้มค่าแพ็ค) — รายชื่อชนิดของที่ API ยอมรับ ใช้ร่วมกันทั้งเว็บและ API
 * ชื่อ/ราคาร้าน/มูลค่าตั้งต้นของแต่ละชนิดอยู่ที่ web/src/lib/packs.ts (ITEMS)
 * items ในฐานข้อมูล = JSON { list: [{ k, n, b? }], tab?, other? } · b = 1 คือของแถม (ป้าย BONUS ในเกม)
 * (ข้อมูลรุ่นแรก { rubies, chests, summon, raid, other } ยังอ่านได้ — เว็บแปลงให้เอง)
 */
export const PACK_ITEM_KEYS = [
  'rubies', 'chests', 'keys', 'gold',
  'pickup', 'permanent', 'collab', 'pet', 'petWish', 'equip', 'card23', 'card3',
  'chaos', 'oblivion', 'memories', 'awakening', 'crystal', 'rankUp', 'spark', 'skillStone',
  'raid', 'ore', 'star',
] as const
export type PackItemKey = (typeof PACK_ITEM_KEYS)[number]

/** แท็บในร้าน (เหมือนในเกม) */
export const PACK_TABS = ['monthly', 'special', 'limited', 'daily'] as const
export type PackTab = (typeof PACK_TABS)[number]

/** ของต่อแพ็คได้สูงสุดกี่ช่อง */
export const MAX_PACK_ITEMS = 12
