import { Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from './Modal'
import { api, type PackInput } from '../lib/api'
import { L, LOCALE } from '../lib/i18n'
import { ATLAS_CATS, CAT_NAME, ITEMS, PACK_BASE_KEYS, PACK_ITEM_KEYS, PACK_TABS, itemName, itemsOf, packTab, packValue, perBaht, periodLabel, type ItemLine, type Pack, type PackItemKey, type PackItems, type PackPeriod, type PackTab } from '../lib/packs'

/** แอดมิน: จัดการแพ็คในหน้า "เช็กความคุ้มค่าแพ็ค" (เห็นทุกแพ็ค รวมที่หมดอายุแล้ว) */
type Form = {
  name: string; group: string; price: string; gems: string
  list: { k: PackItemKey; n: string; b: boolean; s: number }[]; tab: PackTab; other: string
  limit: string; period: PackPeriod; endsAt: string; base: boolean; sort: string
  extra?: Pick<PackItems, 'perks' | 'days' | 'daily'>
}
const EMPTY: Form = { name: '', group: '', price: '', gems: '', list: [{ k: 'rubies', n: '', b: false, s: 0 }], tab: 'special', other: '', limit: '1', period: 'once', endsAt: '', base: false, sort: '100' }
const TAB_NAME: Record<PackTab, string> = {
  monthly: L('รายเดือน', 'Monthly'), special: L('พิเศษ', 'Special'), limited: L('จำกัดเวลา', 'Limited Time'), daily: L('รายวัน', 'Daily'), ruby: L('ร้านรูบี้', 'Ruby top-up'),
  offer: L('ข้อเสนอตามเงื่อนไข', 'Conditional offers'), relay: L('รีเลย์', 'Relay'), pass: L('พาส', 'Passes'), event: L('กิจกรรม', 'Events'),
}

const toForm = (p: Pack): Form => ({
  name: p.name, group: p.group, price: String(p.price), gems: p.gems ? String(p.gems) : '',
  list: itemsOf(p).map((x) => ({ k: x.k, n: String(x.n), b: !!x.b, s: x.s ?? 0 })), tab: packTab(p), other: p.items.other ?? '',
  extra: { perks: p.items.perks, days: p.items.days, daily: p.items.daily }, // ข้อมูลรายเดือนจาก migration (ไม่มีช่องแก้ แต่ไม่ให้หายตอนบันทึก)
  limit: String(p.limit), period: p.period, endsAt: p.endsAt ? new Date(p.endsAt).toISOString().slice(0, 10) : '', base: p.base, sort: String(p.sort),
})
const INPUT = 'w-full rounded-lg border border-white/15 bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-gold'
const num = (s: string) => Number(s) || 0
const toInput = (f: Form): PackInput => ({
  name: f.name.trim(), group: f.group.trim(), price: num(f.price), gems: num(f.gems),
  items: { list: f.list.filter((x) => num(x.n) > 0).map((x): ItemLine => ({ k: x.k, n: num(x.n), ...(x.b ? { b: 1 as const } : {}), ...(x.s ? { s: x.s } : {}) })), tab: f.tab, other: f.other.trim(), ...f.extra },
  limit: Math.max(1, num(f.limit)), period: f.period,
  // วันที่ = หมดตอนเริ่มวันนั้น 00:00 UTC (07:00 ไทย = รอบรีเซ็ตเกม)
  endsAt: f.endsAt ? Date.parse(f.endsAt) : null, base: f.base, sort: num(f.sort),
})

export default function AdminPacks() {
  const [packs, setPacks] = useState<Pack[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ id: string | null; f: Form } | null>(null)
  const [del, setDel] = useState<Pack | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => api.adminPacks().then((r) => { setPacks(r.packs); setErr(null) }).catch((e) => setErr(e.message))
  useEffect(() => { void load() }, [])

  const save = async () => {
    if (!edit) return
    setBusy(true); setErr(null)
    try {
      const body = toInput(edit.f)
      if (edit.id) await api.adminUpdatePack(edit.id, body)
      else await api.adminCreatePack(body)
      setEdit(null); await load()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!del) return
    setBusy(true)
    try { await api.adminDeletePack(del.id); setDel(null); await load() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const now = Date.now()
  const base = packs?.find((p) => p.base)
  const baseRate = base ? perBaht(base) : 0
  const set = (k: keyof Form, v: string | boolean) => setEdit((e) => e && { ...e, f: { ...e.f, [k]: v } })
  const setItem = (i: number, v: Partial<Form['list'][number]>) => setEdit((e) => e && { ...e, f: { ...e.f, list: e.f.list.map((x, j) => (j === i ? { ...x, ...v } : x)) } })
  const preview = edit ? toInput(edit.f) : null

  return (
    <section className="mt-8" data-testid="admin-packs">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-gold">{L('แพ็คในหน้าเช็กความคุ้มค่า', 'Packs on the pack value page')}</h2>
        <span className="text-xs text-white/40">{packs ? L(`${packs.length} แพ็ค`, `${packs.length} packs`) : ''}</span>
        <button type="button" onClick={() => setEdit({ id: null, f: EMPTY })} className="btn-gold ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm">
          <Plus className="h-4 w-4" />{' '}{L('เพิ่มแพ็ค', 'Add pack')}
        </button>
      </div>
      {err && !edit && <p className="mt-2 text-sm text-red-300">{err}</p>}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-black/30 text-left text-xs text-white/50">
            <tr><th className="px-3 py-2">{L('แพ็ค', 'Pack')}</th><th className="px-3 py-2 text-right">{L('ราคา', 'Price')}</th><th className="px-3 py-2">{L('ของ', 'Items')}</th><th className="px-3 py-2 text-right">{L('% ฐาน', '% of base')}</th><th className="px-3 py-2">{L('ซื้อได้', 'Limit')}</th><th className="px-3 py-2">{L('หมด', 'Ends')}</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {packs?.map((p) => {
              const expired = p.endsAt !== null && p.endsAt <= now
              const pct = baseRate ? Math.round((perBaht(p) / baseRate) * 100) : 0
              return (
                <tr key={p.id} className={expired ? 'opacity-45' : ''}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 font-medium">{p.base && <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-label={L('แพ็คฐาน', 'Base pack')} />}{p.name}</div>
                    <div className="text-xs text-white/40">{TAB_NAME[packTab(p)]} · {p.group} · sort {p.sort}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">฿{p.price.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-white/70">
                    {itemsOf(p).map((x) => `${itemName(x.k)} ${x.n.toLocaleString()}${x.b ? '*' : ''}${x.s ? ` (${L('เลือก', 'pick')}${x.s > 1 ? x.s : ''})` : ''}`).join(' · ')}
                    {p.items.other && <div className="text-white/40">{p.items.other}</div>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct}%</td>
                  <td className="px-3 py-2 text-xs">{periodLabel(p.period, p.limit)}</td>
                  <td className="px-3 py-2 text-xs">{p.endsAt ? (expired ? L('หมดแล้ว', 'Ended') : new Date(p.endsAt).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })) : '—'}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <button type="button" aria-label={L('แก้', 'Edit')} onClick={() => setEdit({ id: p.id, f: toForm(p) })} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-gold"><Pencil className="h-4 w-4" /></button>
                    <button type="button" aria-label={L('ลบ', 'Delete')} onClick={() => setDel(p)} className="rounded-full p-1.5 text-red-300/70 hover:bg-red-500/15 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              )
            })}
            {packs && !packs.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-white/40">{L('ยังไม่มีแพ็ค', 'No packs yet')}</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!edit} title={edit?.id ? L('แก้แพ็ค', 'Edit pack') : L('เพิ่มแพ็ค', 'Add pack')} onClose={() => !busy && setEdit(null)} wide>
        {edit && preview && (
          <form onSubmit={(e) => { e.preventDefault(); void save() }} className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <F label={L('ชื่อแพ็ค *', 'Pack name *')}><input required value={edit.f.name} onChange={(e) => set('name', e.target.value)} className={INPUT} /></F>
              <F label={L('กลุ่ม = ชื่อแถบในร้าน (เช่น Rookie Ruby Support Pack)', 'Group = shop banner name (e.g. Rookie Ruby Support Pack)')}><input value={edit.f.group} onChange={(e) => set('group', e.target.value)} className={INPUT} /></F>
              <F label={L('ราคา (บาท) *', 'Price (THB) *')}><input required type="number" min="1" step="0.01" value={edit.f.price} onChange={(e) => set('price', e.target.value)} className={INPUT} /></F>
              <F label={L('ปริซึม (ราคาในเกม)', 'Prisms (in-game price)')}><input type="number" min="0" value={edit.f.gems} onChange={(e) => set('gems', e.target.value)} className={INPUT} /></F>
            </div>
            <p className="pt-1 text-xs font-semibold text-gold/80">{L('ของในแพ็ค (เรียงตามในเกม · ติ๊ก BONUS = ของแถม · "เลือก ช่อง N" = ตัวเลือกของช่อง Select เลือกได้ 1 อย่างต่อช่อง)', 'Pack items (in in-game order · BONUS = free extra · "Pick slot N" = an option of a Select slot, 1 per slot)')}</p>
            <div className="space-y-1.5">
              {edit.f.list.map((x, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={x.k} onChange={(e) => setItem(i, { k: e.target.value as PackItemKey })} className={`${INPUT} min-w-0 flex-1`}>
                    <optgroup label={L('ของหลัก', 'Main items')}>{PACK_BASE_KEYS.map((k) => <option key={k} value={k}>{itemName(k)}</option>)}</optgroup>
                    {ATLAS_CATS.map((c) => (
                      <optgroup key={c} label={L(CAT_NAME[c][0], CAT_NAME[c][1])}>
                        {PACK_ITEM_KEYS.filter((k) => ITEMS[k].cat === c).map((k) => <option key={k} value={k}>{itemName(k)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input type="number" min="0" value={x.n} onChange={(e) => setItem(i, { n: e.target.value })} className={`${INPUT} w-28`} placeholder={L('จำนวน', 'Amount')} />
                  <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={x.b} onChange={(e) => setItem(i, { b: e.target.checked })} /> BONUS</label>
                  <select value={x.s} title={L('ช่อง Select: ตัวเลือกในช่องเดียวกันใส่เลขเดียวกัน ระบบนับอันที่คุ้มสุด', 'Select slot: give options in the same slot the same number; the best one is counted')} onChange={(e) => setItem(i, { s: Number(e.target.value) })} className={`${INPUT} w-24 shrink-0 text-xs`}>
                    <option value={0}>{L('ไม่ใช่ตัวเลือก', 'Not an option')}</option>{[1, 2, 3, 4].map((g) => <option key={g} value={g}>{L(`เลือก ช่อง ${g}`, `Pick slot ${g}`)}</option>)}
                  </select>
                  <button type="button" aria-label={L('ลบช่องนี้', 'Remove this row')} onClick={() => setEdit((ed) => ed && { ...ed, f: { ...ed.f, list: ed.f.list.filter((_, j) => j !== i) } })}
                    className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-red-300"><X className="h-4 w-4" /></button>
                </div>
              ))}
              {edit.f.list.length < 12 && (
                <button type="button" onClick={() => setEdit((ed) => ed && { ...ed, f: { ...ed.f, list: [...ed.f.list, { k: 'rubies', n: '', b: true, s: 0 }] } })}
                  className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs hover:border-gold"><Plus className="h-3.5 w-3.5" />{' '}{L('เพิ่มช่อง', 'Add row')}</button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label={L('แท็บในร้าน', 'Shop tab')}>
                <select value={edit.f.tab} onChange={(e) => set('tab', e.target.value)} className={INPUT}>
                  {PACK_TABS.map((t) => <option key={t} value={t}>{TAB_NAME[t]}</option>)}
                </select>
              </F>
              <F label={L('ของอื่น (แสดงอย่างเดียว ไม่นับ)', 'Other items (shown only, not counted)')}><input value={edit.f.other} onChange={(e) => set('other', e.target.value)} className={INPUT} placeholder={L('เลือกของแถม 1 อย่าง', 'Pick 1 bonus item')} /></F>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <F label={L('ซื้อได้ (ครั้ง)', 'Buy limit (times)')}><input type="number" min="1" value={edit.f.limit} onChange={(e) => set('limit', e.target.value)} className={INPUT} /></F>
              <F label={L('รอบ', 'Resets')}>
                <select value={edit.f.period} onChange={(e) => set('period', e.target.value)} className={INPUT}>
                  <option value="once">{L('ตลอด', 'Never')}</option><option value="daily">{L('ต่อวัน', 'Daily')}</option><option value="weekly">{L('ต่อสัปดาห์', 'Weekly')}</option><option value="biweekly">{L('ต่อ 2 สัปดาห์', 'Every 2 weeks')}</option><option value="monthly">{L('ต่อเดือน', 'Monthly')}</option>
                </select>
              </F>
              <F label={L('หมดวันที่ (07:00)', 'Ends on (07:00 Thai)')}><input type="date" value={edit.f.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={INPUT} /></F>
              <F label={L('ลำดับ (sort)', 'Order (sort)')}><input type="number" min="0" value={edit.f.sort} onChange={(e) => set('sort', e.target.value)} className={INPUT} /></F>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={edit.f.base} onChange={(e) => set('base', e.target.checked)} />{' '}{L('ใช้เป็นแพ็คฐาน (100%) — แพ็คฐานเดิมจะถูกยกเลิก', 'Use as the base pack (100%) — replaces the current base pack')}</label>
            <p className="rounded-xl bg-black/25 px-3 py-2 text-xs text-white/60">
              {L('มูลค่า', 'Worth')} ≈ {packValue(preview).toLocaleString()} {L('รูบี้', 'rubies')}
              {preview.price > 0 && <> · {(packValue(preview) / preview.price).toFixed(2)} {L('รูบี้/บาท', 'rubies/THB')}{baseRate && !edit.f.base ? ` · ${Math.round((packValue(preview) / preview.price / baseRate) * 100)}% ${L('ของฐาน', 'of base')}` : ''}</>}
            </p>
            {err && <p className="text-red-300">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setEdit(null)} className="rounded-full px-4 py-1.5 text-white/70 hover:bg-white/10">{L('ยกเลิก', 'Cancel')}</button>
              <button type="submit" disabled={busy} className="btn-gold px-5 py-1.5">{busy ? L('กำลังบันทึก...', 'Saving...') : L('บันทึก', 'Save')}</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!del} title={`${L('ลบแพ็ค', 'Delete pack')}: ${del?.name ?? ''}`} onClose={() => !busy && setDel(null)}>
        <p className="text-sm text-white/60">{L('ลบแล้วหายจากหน้าเช็กความคุ้มค่าทันที (แพ็คหมดอายุจะซ่อนเองอยู่แล้ว ไม่ต้องลบก็ได้)', 'Deleting removes it from the pack value page at once (expired packs hide on their own, so you rarely need to delete)')}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setDel(null)} className="rounded-full px-4 py-1.5 text-white/70 hover:bg-white/10">{L('ยกเลิก', 'Cancel')}</button>
          <button type="button" disabled={busy} onClick={() => void remove()} className="rounded-full bg-red-500/80 px-5 py-1.5 font-semibold text-white hover:bg-red-500">{L('ลบ', 'Delete')}</button>
        </div>
      </Modal>
    </section>
  )
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs text-white/50">{label}</span>{children}</label>
}
