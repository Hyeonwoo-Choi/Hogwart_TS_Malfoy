import { getScenario } from '../engine/core'
import { clone } from '../engine/core'
import { STORY_ID, isLegacySlot, loadFromSlot, rawDel, rawGet, rawPut, validateSave, type SaveFile } from '../engine/save'
import { SCHEMA_VERSION, type GameState } from '../engine/types'
import { COMPATIBLE_SCENARIO_VERSIONS, SCENARIO_VERSION } from './versions'
import { CloudError, MAX_LABEL, MAX_READ_BYTES, MAX_STATE_BYTES, SAVE_SLOT_RE, type SavePayload, type SaveRow } from './types'

/* ---------- 내용 해시 (jsonb는 키 순서를 바꾸므로 정규화 후 비교) ---------- */
function canon(x: unknown): string {
  if (x === null || typeof x !== 'object') return JSON.stringify(x) ?? 'null'
  if (Array.isArray(x)) return `[${x.map(canon).join(',')}]`
  const o = x as Record<string, unknown>
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`
}
export function contentHash(state: unknown, read: string[]): string {
  const s = canon({ state, read: [...read].sort() })
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return `${h.toString(16)}-${s.length}`
}
const byteLen = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).length

/* ---------- 동기화 메타(사용자별, 로그아웃 시 삭제) ---------- */
export interface Base { rev: number; hash: string }
export interface Meta { base: Record<string, Base>; pending: Record<string, true> }
const metaKey = (uid: string) => `cloudmeta:${uid}`
export function loadMeta(uid: string): Meta {
  try { const m = JSON.parse(rawGet(metaKey(uid)) ?? '{}') as Partial<Meta>; return { base: m.base ?? {}, pending: m.pending ?? {} } } catch { return { base: {}, pending: {} } }
}
export function saveMeta(uid: string, m: Meta) { rawPut(metaKey(uid), JSON.stringify(m)) }
/** 로그아웃: 이 기기에 남은 클라우드 캐시(동기화 메타)를 지운다. 로컬 저장 슬롯은 사용자의 데이터이므로 지우지 않는다. */
export function clearCloudCache(uid: string | null) {
  if (uid) rawDel(metaKey(uid))
}

/* ---------- 변환·검증 ---------- */
export function validateSlot(slot: string) {
  if (!SAVE_SLOT_RE.test(slot)) throw new CloudError('validation', `허용되지 않는 슬롯입니다: ${slot}`)
}
export function toPayload(slot: string, f: SaveFile): SavePayload {
  validateSlot(slot)
  const state = f.state
  if (byteLen(state) > MAX_STATE_BYTES) throw new CloudError('validation', '저장 데이터가 너무 큽니다(최대 약 1MB).')
  if (byteLen(f.read) > MAX_READ_BYTES) throw new CloudError('validation', '읽은 대사 기록이 너무 큽니다.')
  const chapter = Math.min(14, Math.max(1, Math.trunc(state.chapter || 1)))
  return { slot, state, read_lines: f.read, label: (f.label ?? '').slice(0, MAX_LABEL), chapter, schema_version: SCHEMA_VERSION, scenario_version: SCENARIO_VERSION }
}

export type Compat = { ok: true; file: SaveFile } | { ok: false; reason: string }
/** 클라우드 행이 이 빌드에서 열 수 있는 저장인지 판정한다. 불가여도 서버 데이터는 건드리지 않는다. */
export function checkCompat(row: SaveRow): Compat {
  if (row.schema_version !== SCHEMA_VERSION) return { ok: false, reason: `저장 형식 v${row.schema_version}은(는) 이 버전에서 열 수 없습니다.` }
  if (!COMPATIBLE_SCENARIO_VERSIONS.includes(row.scenario_version)) return { ok: false, reason: `이야기 버전(${row.scenario_version})이 달라 열 수 없습니다.` }
  try {
    const file = validateSave({ schemaVersion: SCHEMA_VERSION, savedAt: row.updated_at, label: row.label, state: clone(row.state) as GameState, read: row.read_lines, story: row.scenario_version.startsWith('v2') ? STORY_ID : undefined })
    if (!getScenario()[file.state.scene]) return { ok: false, reason: '저장된 장면이 이 버전에 없습니다.' }
    return { ok: true, file }
  } catch { return { ok: false, reason: '저장 데이터가 손상되었습니다.' } }
}

/* ---------- 슬롯 상태 ---------- */
export type SlotStatus = 'empty' | 'same' | 'local_only' | 'cloud_only' | 'local_newer' | 'cloud_newer' | 'conflict' | 'incompatible' | 'local_legacy'
export interface SlotView { slot: string; local: SaveFile | null; cloud: SaveRow | null; compat: Compat | null; status: SlotStatus; pending: boolean }

export function classify(slot: string, local: SaveFile | null, legacy: boolean, cloud: SaveRow | null, base: Base | undefined, pending: boolean): SlotView {
  const compat = cloud ? checkCompat(cloud) : null
  const v = (status: SlotStatus): SlotView => ({ slot, local, cloud, compat, status, pending })
  if (legacy) return v('local_legacy')
  if (cloud && compat && !compat.ok) return v('incompatible')
  if (!local && !cloud) return v('empty')
  if (local && !cloud) return v('local_only')
  if (!local && cloud) return v('cloud_only')
  const hl = contentHash(local!.state, local!.read), hc = contentHash(cloud!.state, cloud!.read_lines)
  if (hl === hc) return v('same')
  if (!base) return v('conflict') // 한 번도 동기화한 적 없는데 양쪽이 다르다 → 사용자가 선택
  const localChanged = hl !== base.hash, cloudChanged = cloud!.revision !== base.rev
  if (localChanged && cloudChanged) return v('conflict')
  if (localChanged) return v('local_newer')
  if (cloudChanged) return v('cloud_newer')
  return v('same')
}

export function buildViews(uid: string, rows: SaveRow[], meta: Meta, slots: string[]): SlotView[] {
  return slots.map((slot) => {
    const cloud = rows.find((r) => r.slot === slot) ?? null
    const legacy = isLegacySlot(slot)
    return classify(slot, legacy ? null : loadFromSlot(slot), legacy, cloud, meta.base[slot], !!meta.pending[slot])
  }).map((x) => { void uid; return x })
}

/** 클라우드 → 로컬. 덮어쓰기 전에 기존 로컬을 bak:<slot>에 보존한다(삭제하지 않음). */
export function writeLocalFromCloud(row: SaveRow, compat: Extract<Compat, { ok: true }>) {
  const prev = rawGet(`save:${row.slot}`)
  if (prev) rawPut(`bak:${row.slot}`, prev)
  rawPut(`save:${row.slot}`, JSON.stringify({ ...compat.file, savedAt: row.updated_at, label: row.label }))
}
export const rowBase = (row: SaveRow): Base => ({ rev: row.revision, hash: contentHash(row.state, row.read_lines) })
