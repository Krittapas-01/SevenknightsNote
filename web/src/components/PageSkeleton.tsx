import { tx } from '../lib/i18n'

/** กล่องเทาระหว่างรอข้อมูล — รูปร่างคล้ายหน้าจริง ให้รู้ว่ากำลังโหลดอะไร (แทนคำว่า "กำลังโหลด...") */
const Bar = ({ className = '' }: { className?: string }) => <span className={`block animate-pulse rounded-full bg-white/10 ${className}`} />
const Box = ({ className = '' }: { className?: string }) => <div className={`panel animate-pulse ${className}`} />

export default function PageSkeleton({ kind }: { kind: 'guild' | 'target' | 'plan' }) {
  return (
    <div role="status" aria-busy="true" data-testid="page-skeleton">
      <span className="sr-only">{tx('กำลังโหลด...')}</span>
      {kind === 'guild' && (
        <div aria-hidden>
          <Box className="h-44 p-5" />
          <Box className="mt-4 h-56" />
          <div className="mt-6 flex gap-2"><Bar className="h-9 w-32" /><Bar className="h-9 w-32" /></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Box className="h-40" /><Box className="h-40" /><Box className="hidden h-40 sm:block" />
          </div>
        </div>
      )}
      {kind === 'target' && (
        <div aria-hidden>
          <Bar className="h-5 w-32" />
          <div className="mt-5 flex justify-center"><Bar className="h-11 w-72 max-w-full" /></div>
          <div className="mt-8 flex flex-col items-center gap-6 md:flex-row md:items-stretch md:justify-center">
            <Box className="h-[420px] w-full max-w-[380px]" />
            <Box className="hidden h-[420px] w-full max-w-[380px] md:block" />
          </div>
        </div>
      )}
      {kind === 'plan' && (
        <div aria-hidden>
          <Bar className="h-5 w-32" />
          <Bar className="mt-4 h-9 w-64 max-w-full" />
          <Bar className="mt-5 h-12 w-full" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => <Box key={i} className={`h-72 ${i > 1 ? 'hidden sm:block' : ''}`} />)}
          </div>
        </div>
      )}
    </div>
  )
}
