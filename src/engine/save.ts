import { clone, defaultBonds, noteTerms, sceneLength } from './core'
import { STORAGE_PREFIX } from './env'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type GameState, type Settings } from './types'

export const SLOT_COUNT = 10
export const AUTO_KEY = 'auto'
/** QA 모드면 'hfd-qa:', 아니면 'hfd:' — 두 영역은 서로 읽거나 쓰지 않는다. */
const P = STORAGE_PREFIX

const memory = new Map<string, string>()
/** 읽기: 임시(메모리) 저장이 있으면 그것이 최신이다. 영구 저장 쓰기가 실패한 뒤에는 localStorage에 남은 이전 값보다 메모리 값이 새것이다(SAVE-01). */
function get(k: string): string | null {
  const m = memory.get(k)
  if (m !== undefined) return m
  try { return window.localStorage.getItem(P + k) } catch { return null }
}
/** 쓰기: 영구 저장에 성공하면 임시 값을 지워 정합성을 유지하고, 실패하면 최신 값을 메모리에만 둔다(반환 false). */
function put(k: string, v: string): boolean {
  try { window.localStorage.setItem(P + k, v); memory.delete(k); return true } catch { memory.set(k, v); return false }
}
function del(k: string) { try { window.localStorage.removeItem(P + k) } catch { /* noop */ } memory.delete(k) }

/** 저장소 원시 접근(같은 접두사 hfd:/hfd-qa: 사용). 클라우드 동기화 메타·엔딩 기록용. */
export const rawGet = get
export const rawPut = put
export const rawDel = del

export interface SaveFile {
  schemaVersion: 2; savedAt: string; label: string; state: GameState; read: string[]
  /** 이야기 계열 표식('v2'). 없으면 이전 계열(ch1-8)의 저장이다 — 챕터 2 이상은 관계 기본값으로 변환해 이어하고, 챕터 1은 불러오지 않고 보존한다 */
  story?: string
}
export const STORY_ID = 'v2'
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
  return { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), label: labelOf(state), state: clone(state), read: [...read], story: STORY_ID }
}

/** 구버전: schemaVersion 1, 또는 이전 이야기 계열(story 표식 없음)의 챕터 1 저장(장면 구조가 달라 안전하게 이어할 수 없다) */
function isOldLine(f: { schemaVersion?: number; story?: string; state?: { chapter?: number } }): boolean {
  if (f.schemaVersion === 1) return true
  return f.story !== STORY_ID && (f.state?.chapter ?? 1) <= 1
}

/** 기존 슬롯이 구버전이면 덮어쓰기 전에 별도 키로 옮겨 보존한다. */
function preserveLegacy(key: string) {
  const raw = get(`save:${key}`)
  if (!raw) return
  try {
    const f = JSON.parse(raw) as { schemaVersion?: number }
    if (isOldLine(f) && !get(`legacy:${key}`)) put(`legacy:${key}`, raw)
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
  // 관계 모델(V2) 보정: 이전 계열 저장(챕터 2 이상)은 기본 관계값으로 시작하고 기존 선택 이력·플래그는 그대로 둔다
  const base = defaultBonds()
  const saved = (s.bonds ?? {}) as Partial<GameState['bonds']> & Record<string, { know?: number } | undefined>
  s.bonds = { ...base, ...(s.bonds ?? {}) }
  // 지식 단계(know): 저장에 값이 **명시**돼 있으면(0 포함) 그대로 둔다. 필드가 없거나 그 인물의 관계 기록 자체가 없던 저장은 이력으로 복원한다:
  // 챕터 2 S-02 B(판시가 환영의 흔들림을 봄) 이력이 있으면 판시는 1(행동 변화 관찰), 그 밖에는 0. (SAVE-02: 기본값 보정이 먼저 know=0을 채워 이력 복원이 건너뛰어지던 결함)
  for (const [id, b] of Object.entries(s.bonds)) {
    if (typeof saved[id]?.know === 'number') { b.know = saved[id]!.know; continue }
    b.know = id === 'pansy' && (s.flags?.FLAG_PANSY_NOTICED || (s.choices ?? []).some((c) => c.id === 'S-02' && c.option === 'B')) ? 1 : 0
  }
  s.recent = s.recent ?? []
  // 용어집 해금 기록(terms)이 없는 저장은 남아 있는 대화 기록에서 보정한다(기록에 없는 오래된 용어는 다시 마주칠 때 열린다)
  s.termsRead = s.termsRead ?? []
  s.seen = s.seen ?? {}
  s.deeds = s.deeds ?? {}
  s.board = s.board ?? { done: {}, read: [] }
  // 선택 이력만으로 의미가 완전히 정해지는 뒤늦은 플래그만 복원한다: 챕터 1 H-03 B(초안의 약점을 짚음)에 이 플래그가 붙기 전의 저장.
  // 그 밖의 새 플래그(C1-xx·H-03 D·H-04 D 등)는 해당 선택이 이력에 없으면 그대로 없다(근거 없이 true/false로 확정하지 않는다).
  if (!s.flags.FLAG_C1_HER_RESPECT && (s.choices ?? []).some((c) => c.id === 'H-03' && c.option === 'B')) s.flags.FLAG_C1_HER_RESPECT = true
  if (!s.terms) { s.terms = []; noteTerms(s, ...(s.backlog ?? []).map((b) => b.text)) }
  s.emotions.pansy = s.emotions.pansy ?? { affinity: 5, trust: 0, wariness: 40 }
  const d = s.emotions.draco as Partial<GameState['emotions']['draco']>
  s.emotions.draco = { ...s.emotions.draco, acceptance: d.acceptance ?? 50, autonomy: d.autonomy ?? 60, exposure: d.exposure ?? 0 }
  return s
}

const MODES = ['TITLE', 'STORY', 'EVENT', 'ROUTINE', 'ENDED']
const isObj = (x: unknown) => !!x && typeof x === 'object' && !Array.isArray(x)
/** 필수 타입·장면·인덱스 검증. 없는 장면 ID나 범위를 벗어난 인덱스는 불러오기 전에 거부한다(시나리오가 등록되지 않은 환경에서는 장면 검사를 건너뛴다). */
function checkShape(s: GameState) {
  const bad = (m: string): never => { throw new Error(`저장 파일이 손상되었습니다: ${m}`) }
  if (!MODES.includes(s.mode as string)) bad('mode')
  if (typeof s.scene !== 'string' || !s.scene) bad('scene')
  if (!Number.isInteger(s.idx) || s.idx < 0) bad('idx')
  for (const k of ['stats', 'emotions', 'flags', 'knowledge', 'view', 'calendar'] as const) if (!isObj(s[k])) bad(k)
  if (!Array.isArray(s.choices)) bad('choices')
  if (typeof s.calendar.date !== 'string') bad('calendar.date')
  if (s.mode === 'ROUTINE' && !(isObj(s.routine) && Array.isArray(s.routine!.days) && s.routine!.days.length)) bad('routine')
  const len = sceneLength(s.scene)
  if (len !== undefined && len === 0) bad('scene')
  if (len === null) bad(`없는 장면 ${s.scene}`)
  if (typeof len === 'number' && s.idx >= len) bad(`장면 위치 ${s.scene}:${s.idx}`)
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
  if (isOldLine(f)) throw new LegacySaveError()
  checkShape(s) // 게임 상태에 적용하기 전에 막는다(SAVE-02)
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
  try { return isOldLine(JSON.parse(raw) as { schemaVersion?: number }) } catch { return false }
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
