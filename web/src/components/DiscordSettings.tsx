import { BellRing, Check, MessageCircle, Plus, Send, ShieldCheck, Trash2, Unlink } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import type { GuildData } from '../lib/types'
import { BOSS_DEFAULT_TEXT, BOSS_REVIVAL, MAX_BOSS_TEXT } from '../../../shared/game'
import Modal from './Modal'

type Mode = '' | 'everyone' | 'here' | 'role'
type RoleRow = { id: string; name: string; edit: boolean }
const cleanId = (v: string) => v.trim().replace(/^<@&(\d+)>$/, '$1')
const modeOf = (m: string): Mode => (m === '' || m === 'everyone' || m === 'here' ? m : 'role')

/** ปุ่ม + หน้าตั้งค่าแจ้งเตือนประกาศเข้า Discord (เฉพาะคนแก้ได้) */
export default function DiscordSettings({ gid, discord, reload }: { gid: string; discord: GuildData['discord']; reload: () => Promise<void> }) {
  const connected = !!discord?.connected
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [bossUrl, setBossUrl] = useState('')
  // ห้องที่ 2 บอสจุติ: API ส่ง bossConnected มาเฉพาะกิลด์ที่เปิดไว้
  const hasBoss = discord?.bossConnected !== undefined
  const bossConnected = !!discord?.bossConnected
  const [bossStart, setBossStart] = useState('')
  const [bossEnd, setBossEnd] = useState('')
  const [mode, setMode] = useState<Mode>('')
  const [role, setRole] = useState('')
  const [serverId, setServerId] = useState('')
  const [rows, setRows] = useState<RoleRow[]>([])
  const setRow = (i: number, r: Partial<RoleRow>) => setRows((x) => x.map((v, j) => (j === i ? { ...v, ...r } : v)))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function show() {
    const m = discord?.mention ?? ''
    setUrl('')
    setBossUrl('')
    setBossStart(discord?.bossText?.start ?? BOSS_DEFAULT_TEXT.start)
    setBossEnd(discord?.bossText?.end ?? BOSS_DEFAULT_TEXT.end)
    setMode(modeOf(m))
    setRole(modeOf(m) === 'role' ? m : '')
    setServerId(discord?.serverId ?? '')
    // รวมยศที่ตั้งชื่อไว้ (ตามลำดับ) + ยศที่แก้ได้แต่ยังไม่ตั้งชื่อ
    const edit = discord?.editRoles ?? []
    const named = discord?.roleNames ?? []
    setRows([
      ...named.map((r) => ({ id: r.id, name: r.name, edit: edit.includes(r.id) })),
      ...edit.filter((id) => !named.some((r) => r.id === id)).map((id) => ({ id, name: '', edit: true })),
    ])
    setMsg(null)
    setOpen(true)
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setMsg({ ok: true, text: ok })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const mention = mode === 'role' ? role.trim() : mode
  const save = () =>
    run(async () => {
      if (mode === 'role' && !/^\d{5,25}$/.test(role.trim().replace(/^<@&(\d+)>$/, '$1'))) throw new Error('ใส่ Role ID เป็นตัวเลข')
      const list = rows.map((r) => ({ ...r, id: cleanId(r.id), name: r.name.trim() })).filter((r) => r.id)
      if (list.some((r) => !/^\d{5,25}$/.test(r.id))) throw new Error('Role ID ต้องเป็นตัวเลข')
      if (list.length && !serverId.trim()) throw new Error('ใส่ Server ID ด้วย')
      await api.saveDiscord(gid, {
        mention, serverId: serverId.trim(),
        editRoles: list.filter((r) => r.edit).map((r) => r.id),
        roleNames: list.filter((r) => r.name).map((r) => ({ id: r.id, name: r.name })),
        ...(url.trim() ? { webhook: url.trim() } : {}),
        ...(hasBoss && bossUrl.trim() ? { bossWebhook: bossUrl.trim() } : {}),
        // ข้อความเหมือนค่าเริ่มต้น = เก็บเป็น null (ถ้าแก้ค่าเริ่มต้นในโค้ดทีหลัง จะได้ตามไปด้วย)
        ...(hasBoss ? { bossText: { start: bossStart.trim() === BOSS_DEFAULT_TEXT.start ? null : bossStart.trim(), end: bossEnd.trim() === BOSS_DEFAULT_TEXT.end ? null : bossEnd.trim() } } : {}),
      })
      setUrl('')
      setBossUrl('')
      await reload()
    }, 'บันทึกแล้ว')
  const test = () => run(() => api.testDiscord(gid), 'ส่งข้อความทดสอบแล้ว ลองดูในห้อง Discord')
  const testBoss = () => run(() => api.testDiscord(gid, true), 'ส่งข้อความทดสอบเข้าห้องบอสจุติแล้ว')
  const unlinkBoss = () =>
    run(async () => {
      await api.saveDiscord(gid, { mention, bossWebhook: '' })
      await reload()
    }, 'ยกเลิกห้องบอสจุติแล้ว')
  const unlink = () =>
    run(async () => {
      await api.saveDiscord(gid, { mention: '', webhook: '' })
      await reload()
    }, 'ยกเลิกการเชื่อมแล้ว')

  const field = 'mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-gold'
  return (
    <>
      <button onClick={show} title="เชื่อม Discord"
        className={`rounded-full p-1.5 hover:bg-white/10 ${connected ? 'text-[#8b93ff]' : 'text-white/60 hover:text-white'}`}>
        <MessageCircle className="h-4 w-4" />
      </button>
      <Modal open={open} title="เชื่อม Discord" onClose={() => setOpen(false)}>
        <p className={`flex items-center gap-1.5 text-sm ${connected ? 'text-green-400' : 'text-white/55'}`}>
          {connected ? <><Check className="h-4 w-4" /> เชื่อมอยู่ ทุกประกาศ (รวมประกาศอัตโนมัติ 07:00) จะส่งเข้าห้อง</> : 'ยังไม่ได้เชื่อม'}
        </p>

        <label className="mt-4 block text-sm text-white/70">{connected ? 'เปลี่ยนเป็นห้องอื่น (เว้นว่าง = ใช้ห้องเดิม)' : 'ลิงก์ Webhook ของห้อง'}</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className={field} autoComplete="off" />
        <p className="mt-1 text-xs text-white/40">ในดิสคอร์ด: ตั้งค่าห้อง → Integrations → Webhooks → New Webhook → Copy Webhook URL (ลิงก์นี้เก็บเป็นความลับ คนดูเว็บไม่เห็น)</p>

        <label className="mt-4 block text-sm text-white/70">แท็กใครตอนประกาศ</label>
        <div className="pill mt-1 flex w-fit flex-wrap p-0.5 text-sm">
          {([['', 'ไม่แท็ก'], ['role', 'ยศ'], ['here', '@here'], ['everyone', '@everyone']] as const).map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 ${mode === m ? 'bg-gold font-semibold text-ink' : 'text-white/70 hover:bg-white/10'}`}>
              {label}
            </button>
          ))}
        </div>
        {mode === 'role' && (
          <>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role ID เช่น 123456789012345678" inputMode="numeric" className={field} />
            <p className="mt-1 text-xs text-white/40">เปิด Developer Mode (ตั้งค่าผู้ใช้ → Advanced) แล้วกดชื่อคนที่มียศนั้น → คลิกขวาที่ป้ายยศ → Copy Role ID (ไม่ต้องเป็นแอดมิน)</p>
          </>
        )}

        {hasBoss && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="flex items-center gap-1.5 font-semibold"><BellRing className="h-4 w-4 text-gold" /> ห้องที่ 2 · แจ้งเตือนบอสจุติ</p>
            <p className="mt-1 text-xs text-white/45">
              รอบละ {BOSS_REVIVAL.days} วัน (เริ่ม 07:00 → จบเที่ยงคืนวันสุดท้าย แล้ววนใหม่) · แจ้ง 07:00 ตอนเริ่มรอบ และเช้าวันสุดท้าย · แท็กยศเดียวกับด้านบน
            </p>
            <p className={`mt-2 flex items-center gap-1.5 text-sm ${bossConnected ? 'text-green-400' : 'text-white/55'}`}>
              {bossConnected ? <><Check className="h-4 w-4" /> เชื่อมอยู่</> : 'ยังไม่ได้เชื่อม'}
            </p>
            {([['วันเริ่มรอบ (07:00)', bossStart, setBossStart, 'start'], ['วันสุดท้าย (07:00)', bossEnd, setBossEnd, 'end']] as const).map(([label, v, set, k]) => (
              <div key={k} className="mt-3">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>ข้อความ{label}</span>
                  {v !== BOSS_DEFAULT_TEXT[k] && <button type="button" onClick={() => set(BOSS_DEFAULT_TEXT[k])} className="text-xs text-gold hover:underline">ใช้ข้อความเริ่มต้น</button>}
                </div>
                <textarea value={v} onChange={(e) => set(e.target.value)} maxLength={MAX_BOSS_TEXT} rows={2} placeholder="เว้นว่าง = ไม่ส่งวันนี้" className={field} />
              </div>
            ))}
            <p className="mt-1 text-xs text-white/40">{'{จบ}'} = วันจบรอบ · {'{รอบใหม่}'} = วันเริ่มรอบถัดไป · เว้นว่าง = ไม่ส่ง</p>
            <input value={bossUrl} onChange={(e) => setBossUrl(e.target.value)} placeholder={bossConnected ? 'เปลี่ยนห้อง (เว้นว่าง = ใช้ห้องเดิม)' : 'https://discord.com/api/webhooks/...'} className={field} autoComplete="off" />
            {bossConnected && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={busy} onClick={testBoss} className="pill flex items-center gap-1.5 px-3 py-1.5 text-sm hover:border-gold"><Send className="h-4 w-4" /> ทดสอบห้องนี้</button>
                <button disabled={busy} onClick={unlinkBoss} className="pill flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:border-red-400 hover:text-red-300"><Unlink className="h-4 w-4" /> ยกเลิกห้องนี้</button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4 text-gold" /> ยศใน Discord</p>
          <p className="mt-1 text-xs text-white/45">ตั้งชื่อยศให้ขึ้นหลังชื่อคนประกาศ และเลือกยศที่แก้แผนได้โดยไม่ต้องใช้รหัส (รหัสแก้ไขยังใช้ได้ตามเดิม) เรียงยศใหญ่ไว้บนสุด ถ้ามีหลายยศจะแสดงยศที่อยู่บนสุด</p>
          <label className="mt-3 block text-sm text-white/70">Server ID</label>
          <input value={serverId} onChange={(e) => setServerId(e.target.value)} placeholder="คลิกขวาที่ไอคอนเซิร์ฟเวอร์ → Copy Server ID" inputMode="numeric" className={field} />
          <div className="mt-3 space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-black/20 p-2 sm:flex-nowrap">
                <input value={r.id} onChange={(e) => setRow(i, { id: e.target.value })} placeholder="Role ID" inputMode="numeric"
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-gold" />
                <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="ชื่อที่แสดง เช่น หัวกิลด์" maxLength={32}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2.5 py-1.5 text-sm outline-none focus:border-gold" />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-white/75">
                  <input type="checkbox" checked={r.edit} onChange={(e) => setRow(i, { edit: e.target.checked })} className="h-4 w-4 accent-[#e2bf72]" /> แก้แผนได้
                </label>
                <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label="ลบยศนี้" className="rounded-full p-1.5 text-white/40 hover:bg-red-500/15 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setRows((x) => [...x, { id: '', name: '', edit: false }])} className="flex items-center gap-1 text-sm text-gold hover:underline">
              <Plus className="h-4 w-4" /> เพิ่มยศ
            </button>
          </div>
        </div>

        {msg && <p className={`mt-4 text-sm ${msg.ok ? 'text-green-400' : 'text-red-300'}`}>{msg.text}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button disabled={busy} onClick={save} className="btn-gold px-6 py-2">บันทึก</button>
          {connected && (
            <>
              <button disabled={busy} onClick={test} className="pill flex items-center gap-1.5 px-4 py-2 text-sm hover:border-gold"><Send className="h-4 w-4" /> ส่งข้อความทดสอบ</button>
              <button disabled={busy} onClick={unlink} className="pill ml-auto flex items-center gap-1.5 px-4 py-2 text-sm text-white/60 hover:border-red-400 hover:text-red-300"><Unlink className="h-4 w-4" /> ยกเลิกการเชื่อม</button>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
