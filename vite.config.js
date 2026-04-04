import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/marketplace-ops-crm/',
  plugins: [react()],
})
