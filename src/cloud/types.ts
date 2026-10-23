/** 클라우드 계층 공용 타입. DB 모델은 public.game_saves / public.ending_unlocks (기존 테이블 재사용, 변경 없음). */

export const SAVE_SLOT_RE = /^(auto|slot([1-9]|10))$/
export const MAX_STATE_BYTES = 1_048_576 - 4096 // DB: pg_column_size(state) < 1048576 (여유 포함)
export const MAX_READ_BYTES = 524_288 - 4096 // DB: pg_column_size(read_lines) < 524288
export const MAX_LABEL = 120
export const MAX_SCENARIO_VERSION = 40

export interface CloudUser { id: string; email: string }

/** game_saves 한 행(클라이언트가 읽는 컬럼) */
export interface SaveRow {
  slot: string
  state: unknown
  read_lines: string[]
  label: string
  chapter: number
  schema_version: number
  scenario_version: string
  revision: number
  created_at: string
  updated_at: string
}
/** 업로드 페이로드(id·user_id·revision·시각은 서버가 결정한다) */
export interface SavePayload {
  slot: string; state: unknown; read_lines: string[]; label: string; chapter: number; schema_version: number; scenario_version: string
}

export type CloudErrorKind = 'network' | 'auth' | 'validation' | 'rls' | 'unknown'
export class CloudError extends Error {
  constructor(public kind: CloudErrorKind, message: string) { super(message) }
}

/** 낙관적 동시성 결과: 서버 행의 revision이 기대값과 다르면 conflict(자동 덮어쓰기 없음) */
export type PushResult = { ok: true; row: SaveRow } | { ok: false; conflict: true; cloud: SaveRow | null }
export type DeleteResult = { ok: true } | { ok: false; conflict: true; cloud: SaveRow | null }

/** 클라우드 접근 추상화. 실제 구현은 supabaseApi.ts, 테스트는 tests/fakeCloud.ts. 모든 메서드는 실패 시 CloudError를 던진다. */
export interface CloudApi {
  getSession(): Promise<CloudUser | null>
  signUp(email: string, password: string): Promise<{ user: CloudUser | null; needsConfirm: boolean }>
  signIn(email: string, password: string): Promise<CloudUser>
  signOut(): Promise<void>
  onAuthChange(cb: (u: CloudUser | null) => void): () => void
  listSaves(userId: string): Promise<SaveRow[]>
  /** expectedRevision == null → INSERT(이미 있으면 conflict), 아니면 UPDATE ... WHERE revision = expectedRevision */
  pushSave(userId: string, p: SavePayload, expectedRevision: number | null): Promise<PushResult>
  deleteSave(userId: string, slot: string, expectedRevision: number): Promise<DeleteResult>
  listEndings(userId: string): Promise<string[]>
  /** INSERT ... ON CONFLICT DO NOTHING (UPDATE/DELETE 권한 없음) */
  insertEndings(userId: string, ids: string[]): Promise<void>
}
