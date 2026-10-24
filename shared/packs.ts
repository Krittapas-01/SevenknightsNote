/**
 * ของในแพ็ค (หน้าเช็กความคุ้มค่าแพ็ค) — รายชื่อชนิดของที่ API ยอมรับ ใช้ร่วมกันทั้งเว็บและ API
 * ชื่อ/ราคาร้าน/มูลค่าตั้งต้นของแต่ละชนิดอยู่ที่ web/src/lib/packs.ts (ITEMS)
 * items ในฐานข้อมูล = JSON { list: [{ k, n, b? }], tab?, other? } · b = 1 คือของแถม (ป้าย BONUS ในเกม)
 * (ข้อมูลรุ่นแรก { rubies, chests, summon, raid, other } ยังอ่านได้ — เว็บแปลงให้เอง)
 */
import { ATLAS_ITEMS } from './atlasItems'

/** ของหลักที่มีค่าตั้งต้นของเราเอง (ชื่อ/ค่าอยู่ใน web/src/lib/packs.ts) */
export const PACK_BASE_KEYS = [
  'rubies', 'chests', 'keys', 'gold',
  'pickup', 'permanent', 'collab', 'pet', 'petWish', 'equip', 'card23', 'card3',
  'chaos', 'oblivion', 'memories', 'awakening', 'crystal', 'rankUp', 'spark', 'skillStone',
  'raid', 'ore', 'star',
] as const
export type PackBaseKey = (typeof PACK_BASE_KEYS)[number]
/** + ไอเท็มอื่นทั้งหมดจาก 7K Atlas Resource Codex (shared/atlasItems.ts) */
export type PackItemKey = PackBaseKey | (typeof ATLAS_ITEMS)[number]['k']
export const PACK_ITEM_KEYS: readonly PackItemKey[] = [...PACK_BASE_KEYS, ...ATLAS_ITEMS.map((x) => x.k)]

/** แท็บในร้าน (เหมือนในเกม) */
export const PACK_TABS = ['monthly', 'special', 'limited', 'daily'] as const
export type PackTab = (typeof PACK_TABS)[number]

/** ของต่อแพ็คได้สูงสุดกี่ช่อง */
export const MAX_PACK_ITEMS = 12
