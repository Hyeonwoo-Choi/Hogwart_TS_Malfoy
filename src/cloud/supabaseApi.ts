import type { SupabaseClient } from '@supabase/supabase-js'
import { CloudError, type CloudApi, type CloudUser, type DeleteResult, type PushResult, type SavePayload, type SaveRow } from './types'

const COLS = 'slot,state,read_lines,label,chapter,schema_version,scenario_version,revision,created_at,updated_at'

/** PostgREST/Auth 오류를 분류한다. 네트워크 단절은 로컬 저장을 막지 않는다. */
export function classify(err: unknown): CloudError {
  if (err instanceof CloudError) return err
  const e = err as { message?: string; code?: string; status?: number; name?: string } | null
  const msg = e?.message ?? String(err)
  if (e?.name === 'TypeError' || /fetch|network|failed to fetch|load failed|timeout|ECONN|offline/i.test(msg) || e?.status === 0 || e?.name === 'AuthRetryableFetchError') return new CloudError('network', '네트워크에 연결할 수 없습니다.')
  if (e?.status === 401 || /jwt|not authenticated|invalid login|invalid_credentials|email not confirmed|session/i.test(msg) || e?.name?.startsWith('Auth')) return new CloudError('auth', authMessage(msg))
  if (e?.code === '42501' || /row-level security|permission denied/i.test(msg)) return new CloudError('rls', '이 데이터에 접근할 권한이 없습니다.')
  if (e?.code === '23514' || e?.code === '22001') return new CloudError('validation', '저장 데이터가 서버 규칙(크기·형식)에 맞지 않습니다.')
  return new CloudError('unknown', '클라우드 요청에 실패했습니다.')
}
function authMessage(m: string): string {
  if (/invalid login|invalid_credentials/i.test(m)) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (/not confirmed/i.test(m)) return '이메일 확인이 아직 끝나지 않았습니다. 받은 편지함의 확인 링크를 눌러 주세요.'
  if (/already|registered/i.test(m)) return '이미 가입된 이메일입니다. 로그인해 주세요.'
  if (/password/i.test(m)) return '비밀번호가 서버 규칙에 맞지 않습니다.'
  return '로그인 상태를 확인할 수 없습니다. 다시 로그인해 주세요.'
}

const toUser = (u: { id: string; email?: string | null } | null | undefined): CloudUser | null => (u ? { id: u.id, email: u.email ?? '' } : null)

/**
 * 실제 Supabase 구현. 서버 규칙:
 *  - RLS: 각 정책이 user_id = auth.uid() 를 강제한다. 여기서도 .eq('user_id') 를 명시한다(방어적 중복).
 *  - UPDATE는 revision 조건부(원자적): 다른 기기가 먼저 바꿨다면 0행 → conflict. 트리거가 revision을 +1 한다.
 *  - INSERT는 revision을 보내지 않는다(기본값 1). UNIQUE(user_id, slot) 위반(23505) → conflict.
 */
export class SupabaseCloud implements CloudApi {
  constructor(private sb: SupabaseClient) {}

  async getSession() {
    try { const { data, error } = await this.sb.auth.getSession(); if (error) throw error; return toUser(data.session?.user) } catch (e) { throw classify(e) }
  }
  async signUp(email: string, password: string) {
    try {
      const { data, error } = await this.sb.auth.signUp({ email, password }); if (error) throw error
      // 이메일 확인이 켜져 있으면 session이 없다
      return { user: data.session ? toUser(data.user) : null, needsConfirm: !data.session }
    } catch (e) { throw classify(e) }
  }
  async signIn(email: string, password: string) {
    try { const { data, error } = await this.sb.auth.signInWithPassword({ email, password }); if (error) throw error; return toUser(data.user)! } catch (e) { throw classify(e) }
  }
  // scope:'local' — 이 기기의 세션만 종료(다른 기기의 로그인은 유지). 서버 호출 실패여도 로컬 토큰은 제거된다.
  async signOut() { try { const { error } = await this.sb.auth.signOut({ scope: 'local' }); if (error) throw error } catch (e) { throw classify(e) } }
  onAuthChange(cb: (u: CloudUser | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((_ev, session) => cb(toUser(session?.user)))
    return () => data.subscription.unsubscribe()
  }

  async listSaves(userId: string): Promise<SaveRow[]> {
    try {
      const { data, error } = await this.sb.from('game_saves').select(COLS).eq('user_id', userId)
      if (error) throw error
      return (data ?? []) as SaveRow[]
    } catch (e) { throw classify(e) }
  }

  async pushSave(userId: string, p: SavePayload, expectedRevision: number | null): Promise<PushResult> {
    try {
      if (expectedRevision == null) {
        const { data, error } = await this.sb.from('game_saves').insert({ ...p }).select(COLS).single()
        if (error) {
          if ((error as { code?: string }).code === '23505') return { ok: false, conflict: true, cloud: await this.fetchOne(userId, p.slot) }
          throw error
        }
        return { ok: true, row: data as SaveRow }
      }
      const { data, error } = await this.sb.from('game_saves').update({ ...p })
        .eq('user_id', userId).eq('slot', p.slot).eq('revision', expectedRevision).select(COLS)
      if (error) throw error
      if (!data || data.length === 0) return { ok: false, conflict: true, cloud: await this.fetchOne(userId, p.slot) }
      return { ok: true, row: data[0] as SaveRow }
    } catch (e) { throw classify(e) }
  }

  async deleteSave(userId: string, slot: string, expectedRevision: number): Promise<DeleteResult> {
    try {
      const { data, error } = await this.sb.from('game_saves').delete()
        .eq('user_id', userId).eq('slot', slot).eq('revision', expectedRevision).select('slot')
      if (error) throw error
      if (!data || data.length === 0) return { ok: false, conflict: true, cloud: await this.fetchOne(userId, slot) }
      return { ok: true }
    } catch (e) { throw classify(e) }
  }

  private async fetchOne(userId: string, slot: string): Promise<SaveRow | null> {
    const { data, error } = await this.sb.from('game_saves').select(COLS).eq('user_id', userId).eq('slot', slot).maybeSingle()
    if (error) throw error
    return (data as SaveRow | null) ?? null
  }

  async listEndings(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.sb.from('ending_unlocks').select('ending_id').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((r: { ending_id: string }) => r.ending_id)
    } catch (e) { throw classify(e) }
  }
  async insertEndings(userId: string, ids: string[]): Promise<void> {
    if (!ids.length) return
    try {
      // ON CONFLICT DO NOTHING: 이 테이블에는 UPDATE/DELETE 권한이 없다(INSERT·SELECT만).
      const { error } = await this.sb.from('ending_unlocks').upsert(ids.map((ending_id) => ({ user_id: userId, ending_id })), { onConflict: 'user_id,ending_id', ignoreDuplicates: true })
      if (error) throw error
    } catch (e) { throw classify(e) }
  }
}

/** 클라이언트는 설정이 유효할 때만 동적으로 로드한다(미설정 시 번들·네트워크 영향 없음). */
export async function createSupabaseCloud(url: string, anonKey: string): Promise<CloudApi> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hfd-cloud-auth' } })
  return new SupabaseCloud(sb)
}
