import { CloudError, SAVE_SLOT_RE, type CloudApi, type CloudUser, type DeleteResult, type PushResult, type SavePayload, type SaveRow } from '../cloud/types'
import { ALLOWED_ENDINGS } from '../cloud/versions'

/** jsonb처럼 객체 키 순서를 바꿔 저장한다(길이→사전순). 클라이언트 해시가 키 순서에 의존하면 테스트가 깨진다. */
function jsonbNormalize(x: unknown): unknown {
  if (x === null || typeof x !== 'object') return x
  if (Array.isArray(x)) return x.map(jsonbNormalize)
  const o = x as Record<string, unknown>
  return Object.fromEntries(Object.keys(o).sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).map((k) => [k, jsonbNormalize(o[k])]))
}
const bytes = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).length

interface DbRow extends SaveRow { user_id: string }
interface Account { id: string; email: string; password: string; confirmed: boolean }

/** public.game_saves / ending_unlocks / auth 의 동작을 모사하는 서버. 실제 DB의 RLS·CHECK·UNIQUE·revision 트리거와 같은 규칙을 가진다. */
export class FakeServer {
  accounts: Account[] = []
  rows: DbRow[] = []
  endings: { user_id: string; ending_id: string }[] = []
  online = true
  requireConfirm = false
  log: string[] = []
  private seq = 0
  newId() { return `u${++this.seq}` }
}

export class FakeCloud implements CloudApi {
  private session: CloudUser | null = null
  private listeners = new Set<(u: CloudUser | null) => void>()
  constructor(public srv: FakeServer) {}
  private net() { if (!this.srv.online) throw new CloudError('network', '네트워크에 연결할 수 없습니다.') }
  private authed(): CloudUser { if (!this.session) throw new CloudError('auth', '로그인이 필요합니다.'); return this.session }
  private emit() { this.listeners.forEach((f) => f(this.session)) }

  async getSession() { return this.session }
  async signUp(email: string, password: string) {
    this.net()
    if (this.srv.accounts.some((a) => a.email === email)) throw new CloudError('auth', '이미 가입된 이메일입니다. 로그인해 주세요.')
    const a: Account = { id: this.srv.newId(), email, password, confirmed: !this.srv.requireConfirm }
    this.srv.accounts.push(a)
    if (!a.confirmed) return { user: null, needsConfirm: true }
    this.session = { id: a.id, email }; this.emit(); return { user: this.session, needsConfirm: false }
  }
  async signIn(email: string, password: string) {
    this.net()
    const a = this.srv.accounts.find((x) => x.email === email && x.password === password)
    if (!a) throw new CloudError('auth', '이메일 또는 비밀번호가 올바르지 않습니다.')
    if (!a.confirmed) throw new CloudError('auth', '이메일 확인이 아직 끝나지 않았습니다.')
    this.session = { id: a.id, email }; this.emit(); return this.session
  }
  async signOut() { this.session = null; this.emit() }
  onAuthChange(cb: (u: CloudUser | null) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb) } }
  /** 테스트용: 이메일 확인 완료 */
  confirm(email: string) { const a = this.srv.accounts.find((x) => x.email === email); if (a) a.confirmed = true }
  /** 테스트용: 앱 재시작 시 저장된 세션 복원 */
  restoreSession(u: CloudUser | null) { this.session = u }

  private check(p: SavePayload) {
    if (!SAVE_SLOT_RE.test(p.slot)) throw new CloudError('validation', 'slot check')
    const st = p.state as { chapter?: number } | null
    if (!st || typeof st !== 'object' || Array.isArray(st) || bytes(p.state) >= 1_048_576) throw new CloudError('validation', 'state check')
    if (!Array.isArray(p.read_lines) || bytes(p.read_lines) >= 524_288) throw new CloudError('validation', 'read_lines check')
    if (p.label.length > 120) throw new CloudError('validation', 'label check')
    if (p.chapter < 1 || p.chapter > 14) throw new CloudError('validation', 'chapter check')
    if (p.schema_version < 1) throw new CloudError('validation', 'schema_version check')
    if (p.scenario_version.length < 1 || p.scenario_version.length > 40) throw new CloudError('validation', 'scenario_version check')
  }
  private strip(r: DbRow): SaveRow { const { user_id: _u, ...rest } = r; void _u; return JSON.parse(JSON.stringify(rest)) as SaveRow }

  /** RLS: 세션 사용자와 다른 userId로 요청해도 자기 행만 보인다(다른 사용자 행은 존재하지 않는 것처럼 동작) */
  async listSaves(userId: string) {
    this.net(); const me = this.authed()
    return this.srv.rows.filter((r) => r.user_id === me.id && r.user_id === userId).map((r) => this.strip(r))
  }
  async pushSave(userId: string, p: SavePayload, expected: number | null): Promise<PushResult> {
    this.net(); const me = this.authed(); this.check(p)
    this.srv.log.push(`push:${p.slot}:${expected}`)
    const now = new Date().toISOString()
    const cur = this.srv.rows.find((r) => r.user_id === me.id && r.slot === p.slot)
    if (expected == null) {
      if (cur) return { ok: false, conflict: true, cloud: this.strip(cur) } // UNIQUE(user_id, slot) 위반
      const row: DbRow = { user_id: me.id, ...p, state: jsonbNormalize(p.state), read_lines: [...p.read_lines], revision: 1, created_at: now, updated_at: now }
      this.srv.rows.push(row); return { ok: true, row: this.strip(row) }
    }
    // UPDATE ... WHERE user_id = auth.uid() AND slot = ? AND revision = expected  (userId가 세션과 다르면 0행)
    if (!cur || userId !== me.id || cur.revision !== expected) return { ok: false, conflict: true, cloud: cur && userId === me.id ? this.strip(cur) : null }
    Object.assign(cur, { ...p, state: jsonbNormalize(p.state), read_lines: [...p.read_lines], revision: cur.revision + 1, updated_at: now }) // 트리거: revision+1
    return { ok: true, row: this.strip(cur) }
  }
  async deleteSave(userId: string, slot: string, expected: number): Promise<DeleteResult> {
    this.net(); const me = this.authed()
    const i = this.srv.rows.findIndex((r) => r.user_id === me.id && userId === me.id && r.slot === slot && r.revision === expected)
    if (i < 0) { const cur = this.srv.rows.find((r) => r.user_id === me.id && r.slot === slot); return { ok: false, conflict: true, cloud: cur ? this.strip(cur) : null } }
    this.srv.rows.splice(i, 1); return { ok: true }
  }
  async listEndings(userId: string) { this.net(); const me = this.authed(); return this.srv.endings.filter((e) => e.user_id === me.id && e.user_id === userId).map((e) => e.ending_id) }
  async insertEndings(userId: string, ids: string[]) {
    this.net(); const me = this.authed()
    if (userId !== me.id) throw new CloudError('rls', 'RLS') // 정책 WITH CHECK 위반
    for (const id of ids) {
      if (!(ALLOWED_ENDINGS as readonly string[]).includes(id)) throw new CloudError('validation', 'ending check')
      if (!this.srv.endings.some((e) => e.user_id === me.id && e.ending_id === id)) this.srv.endings.push({ user_id: me.id, ending_id: id })
    }
  }
}
