import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
// import tailwindcss from "tailwindcss";


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // css: {
  //   postcss: {
  //     plugins: [tailwindcss()],
  //   },
  // },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'cabinetsklg.koltech.dev' // Добавь сюда свой домен
    ]
  },

  // optimizeDeps: {
  //   exclude: ['lucide-react'],
  // },
})
