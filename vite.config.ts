/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  envDir: 'tests/noenv',
  server: { host: '127.0.0.1', port: 5181, strictPort: true },
  test: { environment: 'jsdom', globals: true, include: ['tests/**/*.test.{ts,tsx}'] },
})
