import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        // MERN backend on 5000 | Django backend on 8000
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
