import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // แยกไลบรารีที่ไม่ค่อยเปลี่ยนออกเป็นไฟล์ของมันเอง (deploy รอบหน้าเบราว์เซอร์ใช้ของเดิมใน cache ได้)
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          dnd: ['@dnd-kit/core'],
        },
      },
    },
  },
  server: {
    // ตอน dev: ส่ง /api ไปที่ Worker (wrangler dev รันที่พอร์ต 8787)
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
})
