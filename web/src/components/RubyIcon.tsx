/** ไอคอนรูบี้แบบเส้น (ทรงอัญมณีตัดมุมเหมือนรูบี้ในเกม) ใช้แทนไอคอน lucide ได้ */
export default function RubyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M7 3h10l4 4v10l-4 4H7l-4-4V7z" />
      <path d="M9.5 8h5l1.5 1.5v5L14.5 16h-5L8 14.5v-5z" />
      <path d="M5 5l3.5 3.5M19 5l-3.5 3.5M19 19l-3.5-3.5M5 19l3.5-3.5" />
    </svg>
  )
}
