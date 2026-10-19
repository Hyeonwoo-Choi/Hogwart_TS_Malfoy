import { clone } from './core'
import { DEFAULT_SETTINGS, type GameState, type Settings } from './types'

export const SLOT_COUNT = 10
export const AUTO_KEY = 'auto'
const P = 'hfd:'

const memory = new Map<string, string>()
function get(k: string): string | null {
  try { const v = window.localStorage.getItem(P + k); return v ?? memory.get(k) ?? null } catch { return memory.get(k) ?? null }
}
function put(k: string, v: string): boolean {
  try { window.localStorage.setItem(P + k, v); return true } catch { memory.set(k, v); return false }
}
function del(k: string) { try { window.localStorage.removeItem(P + k) } catch { /* noop */ } memory.delete(k) }

export interface SaveFile {
  schemaVersion: 1; savedAt: string; label: string; state: GameState; read: string[]
}
export interface SlotInfo { key: string; empty: boolean; label?: string; savedAt?: string; chapter?: number; date?: string; slot?: string }

export function slotKey(i: number | 'auto') { return i === 'auto' ? AUTO_KEY : `slot${i}` }

export function labelOf(s: GameState) {
  return `Ch.${s.chapter} · ${s.calendar.date}(${s.calendar.weekday}) ${s.calendar.slot === '-' ? '' : s.calendar.slot}`.trim()
}

export function saveToSlot(key: string, state: GameState, read: Set<string>): boolean {
  const f: SaveFile = { schemaVersion: 1, savedAt: new Date().toISOString(), label: labelOf(state), state: clone(state), read: [...read] }
  return put(`save:${key}`, JSON.stringify(f))
}

export function validateSave(x: unknown): SaveFile {
  const f = x as SaveFile
  if (!f || typeof f !== 'object') throw new Error('저장 파일 형식이 올바르지 않습니다.')
  if (f.schemaVersion !== 1) throw new Error(`지원하지 않는 저장 버전입니다: ${String((f as { schemaVersion?: unknown }).schemaVersion)}`)
  const s = f.state
  const need = ['mode', 'scene', 'idx', 'stats', 'emotions', 'flags', 'knowledge', 'choices', 'view', 'calendar']
  for (const k of need) if (!s || !(k in s)) throw new Error(`저장 파일에 "${k}" 항목이 없습니다.`)
  return f
}

export function loadFromSlot(key: string): SaveFile | null {
  const raw = get(`save:${key}`)
  if (!raw) return null
  try { return validateSave(JSON.parse(raw)) } catch { return null }
}
export function deleteSlot(key: string) { del(`save:${key}`) }

export function listSlots(): SlotInfo[] {
  const keys = [AUTO_KEY, ...Array.from({ length: SLOT_COUNT }, (_, i) => slotKey(i + 1))]
  return keys.map((key) => {
    const f = loadFromSlot(key)
    if (!f) return { key, empty: true }
    return { key, empty: false, label: f.label, savedAt: f.savedAt, chapter: f.state.chapter, date: f.state.calendar.date, slot: f.state.calendar.slot }
  })
}

export function exportSave(state: GameState, read: Set<string>): string {
  const f: SaveFile = { schemaVersion: 1, savedAt: new Date().toISOString(), label: labelOf(state), state: clone(state), read: [...read] }
  return JSON.stringify(f, null, 2)
}
export function parseImport(text: string): SaveFile {
  let obj: unknown
  try { obj = JSON.parse(text) } catch { throw new Error('JSON을 읽을 수 없습니다. 파일이 손상되었을 수 있습니다.') }
  return validateSave(obj)
}

/* 읽은 대사 / 설정 */
export function loadRead(): Set<string> {
  try { return new Set(JSON.parse(get('read') ?? '[]') as string[]) } catch { return new Set() }
}
export function persistRead(r: Set<string>) { put('read', JSON.stringify([...r])) }
export function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(get('settings') ?? '{}') as Partial<Settings>) } } catch { return { ...DEFAULT_SETTINGS } }
}
export function persistSettings(s: Settings) { put('settings', JSON.stringify(s)) }
