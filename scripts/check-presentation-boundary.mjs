import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const seen = new Set()
function visit(file) {
  if (seen.has(file)) return
  seen.add(file)
  const relative = path.relative(root, file).replaceAll('\\', '/')
  if (/^src\/(engine|data|cloud|ui)\//.test(relative) || relative === 'src/App.tsx') throw Error('Legacy import: ' + relative)
  const source = fs.readFileSync(file, 'utf8')
  if (/\b(localStorage|sessionStorage|fetch|WebSocket)\b/.test(source)) throw Error('Storage/network in presentation: ' + relative)
  const imports = ts.preProcessFile(source).importedFiles
  for (const { fileName } of imports) {
    if (!fileName.startsWith('.')) {
      if (!['react', 'react-dom/client'].includes(fileName)) throw Error('Unexpected dependency: ' + fileName)
      continue
    }
    const base = path.resolve(path.dirname(file), fileName)
    const next = [base, base+'.ts', base+'.tsx'].find(p => fs.existsSync(p) && fs.statSync(p).isFile())
    if (!next) throw Error('Unresolved import: ' + fileName)
    if (!next.endsWith('.css')) visit(next)
  }
}
visit(path.join(root, 'src/main.tsx'))
console.log('PASS: isolated presentation graph (' + seen.size + ' source modules), no legacy/storage/network')
