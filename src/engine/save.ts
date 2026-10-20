import { clone } from './core'
import { STORAGE_PREFIX } from './env'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type GameState, type Settings } from './types'

export const SLOT_COUNT = 10
export const AUTO_KEY = 'auto'
/** QA 모드면 'hfd-qa:', 아니면 'hfd:' — 두 영역은 서로 읽거나 쓰지 않는다. */
const P = STORAGE_PREFIX

const memory = new Map<string, string>()
function get(k: string): string | null {
  try { const v = window.localStorage.getItem(P + k); return v ?? memory.get(k) ?? null } catch { return memory.get(k) ?? null }
}
function put(k: string, v: string): boolean {
  try { window.localStorage.setItem(P + k, v); return true } catch { memory.set(k, v); return false }
}
function del(k: string) { try { window.localStorage.removeItem(P + k) } catch { /* noop */ } memory.delete(k) }

export interface SaveFile {
  schemaVersion: 2; savedAt: string; label: string; state: GameState; read: string[]
}
export interface SlotInfo {
  key: string; empty: boolean; legacy?: boolean
  label?: string; savedAt?: string; chapter?: number; date?: string; slot?: string
}

export function slotKey(i: number | 'auto') { return i === 'auto' ? AUTO_KEY : `slot${i}` }

export function labelOf(s: GameState) {
  return `Ch.${s.chapter} · ${s.calendar.date}(${s.calendar.weekday}) ${s.calendar.slot === '-' ? '' : s.calendar.slot}`.trim()
}

/** 저장 호환 정책(GAME_BIBLE 7.3): v1은 선천적 설정의 구 시나리오 → 불러오기 거부, 데이터는 삭제하지 않고 보존. */
export const LEGACY_MESSAGE = '이전 버전의 이야기로 저장된 데이터입니다. 현재 이야기와 구조가 달라 불러올 수 없습니다. 원본은 삭제되지 않고 그대로 보존됩니다.'
export class LegacySaveError extends Error { constructor() { super(LEGACY_MESSAGE) } }

function makeFile(state: GameState, read: Set<string>): SaveFile {
  return { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), label: labelOf(state), state: clone(state), read: [...read] }
}

/** 기존 슬롯이 구버전이면 덮어쓰기 전에 별도 키로 옮겨 보존한다. */
function preserveLegacy(key: string) {
  const raw = get(`save:${key}`)
  if (!raw) return
  try {
    const f = JSON.parse(raw) as { schemaVersion?: number }
    if (f.schemaVersion === 1 && !get(`legacy:${key}`)) put(`legacy:${key}`, raw)
  } catch { /* 손상된 데이터는 그대로 둔다 */ }
}

export function saveToSlot(key: string, state: GameState, read: Set<string>): boolean {
  preserveLegacy(key)
  return put(`save:${key}`, JSON.stringify(makeFile(state, read)))
}

/** v2 세부 필드 누락(개발 중 생성된 저장)은 기본값으로 보정한다. */
function normalize(s: GameState): GameState {
  const v = s.view as Partial<GameState['view']>
  s.view = { bg: v.bg ?? 'black', char: v.char ?? null, expr: v.expr ?? null, form: v.form ?? 'base', pose: v.pose ?? 'stand', gaze: v.gaze ?? 'front', light: v.light ?? 'normal', cue: v.cue ?? null, cg: v.cg ?? null }
  s.visits = s.visits ?? {}
  const d = s.emotions.draco as Partial<GameState['emotions']['draco']>
  s.emotions.draco = { ...s.emotions.draco, acceptance: d.acceptance ?? 50, autonomy: d.autonomy ?? 60, exposure: d.exposure ?? 0 }
  return s
}

export function validateSave(x: unknown): SaveFile {
  const f = x as SaveFile
  if (!f || typeof f !== 'object') throw new Error('저장 파일 형식이 올바르지 않습니다.')
  const ver = (f as { schemaVersion?: unknown }).schemaVersion
  if (ver === 1) throw new LegacySaveError()
  if (ver !== SCHEMA_VERSION) throw new Error(`지원하지 않는 저장 버전입니다: ${String(ver)}`)
  const s = f.state
  const need = ['mode', 'scene', 'idx', 'stats', 'emotions', 'flags', 'knowledge', 'choices', 'view', 'calendar']
  for (const k of need) if (!s || !(k in s)) throw new Error(`저장 파일에 "${k}" 항목이 없습니다.`)
  normalize(s)
  return f
}

export function loadFromSlot(key: string): SaveFile | null {
  const raw = get(`save:${key}`)
  if (!raw) return null
  try { return validateSave(JSON.parse(raw)) } catch { return null }
}
export function isLegacySlot(key: string): boolean {
  const raw = get(`save:${key}`)
  if (!raw) return false
  try { return (JSON.parse(raw) as { schemaVersion?: number }).schemaVersion === 1 } catch { return false }
}
export function deleteSlot(key: string) { del(`save:${key}`) }

export function listSlots(): SlotInfo[] {
  const keys = [AUTO_KEY, ...Array.from({ length: SLOT_COUNT }, (_, i) => slotKey(i + 1))]
  return keys.map((key) => {
    if (isLegacySlot(key)) return { key, empty: false, legacy: true }
    const f = loadFromSlot(key)
    if (!f) return { key, empty: true }
    return { key, empty: false, label: f.label, savedAt: f.savedAt, chapter: f.state.chapter, date: f.state.calendar.date, slot: f.state.calendar.slot }
  })
}

export function exportSave(state: GameState, read: Set<string>): string {
  return JSON.stringify(makeFile(state, read), null, 2)
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

/* CG 경험 기록 — 저장 슬롯과 별개로 영구 보존(이미지 파일 유무와 무관). 삭제 API는 두지 않는다. */
export interface CgRecord { ids: string[]; at: Record<string, string> }
export function loadCgRecord(): CgRecord {
  try {
    const r = JSON.parse(get('cg') ?? '{}') as Partial<CgRecord>
    return { ids: Array.isArray(r.ids) ? r.ids : [], at: r.at ?? {} }
  } catch { return { ids: [], at: {} } }
}
export function recordCg(id: string): boolean {
  const r = loadCgRecord()
  if (r.ids.includes(id)) return false
  r.ids.push(id); r.at[id] = new Date().toISOString()
  put('cg', JSON.stringify(r))
  return true
}
