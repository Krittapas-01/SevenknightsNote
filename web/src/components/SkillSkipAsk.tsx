import { MAX_SKILL_QUEUE, heroCount, type SkillStep, type Team } from '../lib/types'
import Modal from './Modal'
import { tx, L } from '../lib/i18n'

/** ทีมที่ยังตั้งลำดับการใช้สกิลไม่ครบ (ไม่นับทีมที่ยังไม่มีตัว) */
export const skillShort = (team: Team, skills: SkillStep[]) => heroCount(team) > 0 && skills.length < MAX_SKILL_QUEUE

/**
 * ถามยืนยันก่อนไปต่อ เมื่อทีมตั้งลำดับการใช้สกิลไม่ครบ (ไม่ตั้ง/ตั้งไม่ครบก็ได้ แค่กันลืม) — ใช้ทุกที่ที่บันทึกทีมเรา
 * items = [ชื่อทีม, จำนวนที่ตั้งแล้ว]
 */
export default function SkillSkipAsk({ items, onBack, onSkip, onCancel }: { items: [string, number][] | null; onBack: () => void; onSkip: () => void; /** กากบาท/Esc = ยกเลิก ไม่ทำอะไรต่อ */ onCancel: () => void }) {
  return (
    <Modal open={!!items} title={tx('ไม่ตั้งลำดับการใช้สกิลใช่ไหม?')} onClose={onCancel}>
      <ul className="space-y-1 text-white/85">
        {items?.map(([name, have], i) => (
          <li key={i}>
            <span className="font-semibold text-gold">{name}</span>{' '}
            {have ? L(`ตั้งไว้ ${have}/${MAX_SKILL_QUEUE} ครั้ง`, `Set ${have}/${MAX_SKILL_QUEUE} times`) : tx('ยังไม่ได้ตั้งลำดับการใช้สกิล')}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-white/50">{tx('ตั้งลำดับการใช้สกิล = กดวงกลมดาวล่างสุดของการ์ด แล้วกดสกิลตามลำดับที่อยากให้ออก · ไม่ตั้งหรือตั้งไม่ครบก็ได้')}</p>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onBack} className="btn-gold flex-1 py-2">{tx('กลับไปตั้งลำดับการใช้สกิล')}</button>
        <button type="button" onClick={onSkip} className="pill px-5 py-2">{tx('ไม่ตั้ง ไปต่อเลย')}</button>
      </div>
    </Modal>
  )
}
