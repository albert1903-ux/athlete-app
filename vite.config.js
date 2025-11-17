import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoBase = process.env.NODE_ENV === 'production' ? '/athlete-app/' : '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: repoBase,
})
