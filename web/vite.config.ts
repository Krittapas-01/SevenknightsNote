import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * API อยู่คนละโดเมนกับเว็บ (workers.dev) → ให้เบราว์เซอร์ต่อสาย (DNS + TLS) ไว้ตั้งแต่อ่าน HTML
 * ไม่งั้นต้องรอโค้ดโหลดเสร็จแล้วค่อยเริ่มต่อสาย ก่อนดึงข้อมูลกิลด์ได้ (ช้ากว่าเดิมหลายร้อย ms บนมือถือ)
 * crossorigin: เรียก API แบบไม่ส่งคุกกี้ (fetch ปกติ) ต้องใช้สายแบบเดียวกัน
 */
function apiPreconnect(): Plugin {
  let origin = ''
  return {
    name: 'api-preconnect',
    // VITE_API_URL จาก .env.production (deploy.ps1 เขียนให้) · ตอน dev ไม่มี (ใช้ proxy /api) → ไม่ใส่
    configResolved(config) {
      try { origin = config.env.VITE_API_URL ? new URL(config.env.VITE_API_URL).origin : '' } catch { origin = '' }
    },
    transformIndexHtml: () => (origin ? [{ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' }] : []),
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPreconnect()],
  build: {
    rollupOptions: {
      output: {
        // แยกไลบรารีที่ไม่ค่อยเปลี่ยนออกเป็นไฟล์ของมันเอง (deploy รอบหน้าเบราว์เซอร์ใช้ของเดิมใน cache ได้)
        // (ใช้ฟังก์ชันจับจาก path — แบบรายชื่อแพ็กเกจ react-dom/client หลุดไปอยู่ไฟล์หลัก ทำให้ไฟล์หลักใหญ่ 600 kB และ cache ไม่ได้ทุกครั้งที่ deploy)
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'react'
          if (id.includes('node_modules/@dnd-kit/')) return 'dnd'
          if (id.includes('node_modules/lucide-react/')) return 'icons'
        },
      },
    },
  },
  server: {
    // ให้ dev server อ่านไฟล์กลาง ../shared (กติกาเกมที่ใช้ร่วมกับ API) ได้
    fs: { allow: ['..'] },
    // ตอน dev: ส่ง /api ไปที่ Worker (wrangler dev รันที่พอร์ต 8787)
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
})
