import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))].sort()
const local = /(^|\/)(node_modules|dist|\.git|\.worktrees|hogwarts-remote|backups|\.cache|coverage)(\/|$)|(^|\/)\.env(?!\.example$)|(^|\/)tmp_|^scripts_tmp_|^qa-phase2\/results\/|^docs\/antigravity-qa\/evidence\//
const absolute = /[A-Za-z]:[\\/](?:Users|Program Files)|\/home\/|\/Users\//
const credential = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sb_secret_[A-Za-z0-9_-]{12,})/
const selected = [], excluded = [], blocked = []
for (const name of files) {
  if (local.test(name)) { excluded.push(name); continue }
  const stat = await fs.lstat(path.join(root, name)).catch(() => null)
  if (!stat) continue // tracked rename source absent from working tree
  if (!stat.isFile()) throw Error('Unsupported entry: ' + name)
  const bytes = await fs.readFile(path.join(root, name))
  if (/\.(md|ts|tsx|json|mjs|cjs|txt|example)$/.test(name)) {
    const text = bytes.toString('utf8')
    if (absolute.test(text)) blocked.push({ path: name, reason: 'personal-absolute-path' })
    if (credential.test(text)) blocked.push({ path: name, reason: 'credential-pattern' })
    for (const token of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
      try { if (JSON.parse(Buffer.from(token[0].split('.')[1], 'base64url').toString()).role === 'service_role') blocked.push({ path: name, reason: 'privileged-jwt' }) } catch {}
    }
  }
  selected.push({ path: name, bytes: stat.size })
}
if (blocked.length) { console.error(JSON.stringify({ blocked }, null, 2)); process.exitCode = 1 }
else if (process.argv.includes('--list')) console.log(JSON.stringify({ files: selected, bytes: selected.reduce((n, f) => n + f.bytes, 0), excluded }, null, 2))
else {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'hogwarts-upload-'))
  for (const file of selected) {
    const destination = path.join(output, file.path)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.copyFile(path.join(root, file.path), destination)
  }
  console.log(JSON.stringify({ output, files: selected.length, bytes: selected.reduce((n, f) => n + f.bytes, 0), excluded: excluded.length }, null, 2))
}
