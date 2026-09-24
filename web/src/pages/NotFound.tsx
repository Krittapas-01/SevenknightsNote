import { Link } from 'react-router'

export default function NotFound({ message = 'ไม่พบหน้านี้' }: { message?: string }) {
  return (
    <div className="py-24 text-center">
      <p className="text-xl">{message}</p>
      <Link to="/" className="btn-gold mt-6 inline-block px-5 py-2">กลับหน้าแรก</Link>
    </div>
  )
}
