/** ไอคอนรูบี้แบบเส้น (ทรงอัญมณีตัดมุมเหมือนรูบี้ในเกม) ใช้แทนไอคอน lucide ได้ */
export default function RubyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8 2h8l4 4v12l-4 4H8l-4-4V6z" />
      <path d="M10 7.5h4l1.5 1.5v6L14 16.5h-4L8.5 15V9z" />
      <path d="M5.5 4.5l4 4M18.5 4.5l-4 4M18.5 19.5l-4-4M5.5 19.5l4-4" />
    </svg>
  )
}
