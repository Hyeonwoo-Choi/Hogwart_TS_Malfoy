import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import { realpathSync } from 'node:fs'
const root = realpathSync.native(fileURLToPath(new URL('../', import.meta.url)))
process.chdir(root) // Normalize Windows 8.3 cwd aliases before Vitest/Vite resolve files.

const react = (await import('@vitejs/plugin-react')).default
const mode = process.argv[2] ?? 'test'
const output = process.env.HFD_QA_OUTPUT ?? await mkdtemp(path.join(os.tmpdir(), 'hfd-presentation-'))
// Same React plugin as vite.config.ts; configFile:false avoids esbuild config bundling.
// Empty envDir prevents loading legacy cloud credentials in every mode.
const base = { root, configFile: false, envDir: path.join(root, 'tests/noenv'), plugins: [react()], cacheDir: path.join(output, 'cache') }
if (mode === 'build' || mode === 'preview') {
  const { build } = await import('vite')
  await build({ ...base, build: { outDir: path.join(output, 'dist'), emptyOutDir: false } })
  console.log('Isolated build:', path.join(output, 'dist'))
  if (mode === 'preview') { const { preview } = await import('vite'); const server = await preview({ ...base, build: { outDir: path.join(output, 'dist') }, preview: { host: '127.0.0.1', port: 5181, strictPort: true } }); server.printUrls() }
} else if (mode === 'serve') {
  const { createServer } = await import('vite')
  const server = await createServer({ ...base, server: { host: '127.0.0.1', port: 5181, strictPort: true } })
  await server.listen()
  server.printUrls()
} else {
  const { startVitest } = await import('vitest/node')
  const ctx = await startVitest('test', ['tests/renderer.test.tsx'], { ...base, watch: false, environment: 'jsdom', globals: true, include: ['tests/**/*.test.tsx'], pool: 'forks', maxWorkers: 1, minWorkers: 1 }, base)
  if (!ctx) process.exitCode = 1
  else { const failed = ctx.state.getFiles().some(file => file.result?.state === 'fail') || ctx.state.getUnhandledErrors().length > 0; await ctx.close(); if (failed) process.exitCode = 1 }
}
