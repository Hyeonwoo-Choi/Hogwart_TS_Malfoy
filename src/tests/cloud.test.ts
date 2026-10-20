import { beforeEach, describe, expect, it } from 'vitest'
import { CloudController } from '../cloud/cloudStore'
import { evaluateConfig } from '../cloud/config'
import { loadEndings, mergeEndings, recordEnding } from '../cloud/endings'
import { SupabaseCloud } from '../cloud/supabaseApi'
import { contentHash, loadMeta, toPayload } from '../cloud/sync'
import { CloudError, type SavePayload } from '../cloud/types'
import { ALLOWED_ENDINGS, SCENARIO_VERSION } from '../cloud/versions'
import { loadFromSlot, saveToSlot, rawGet } from '../engine/save'
import { STORAGE_PREFIX } from '../engine/env'
import { play } from './helpers'
import { FakeCloud, FakeServer } from './fakeCloud'

const state1 = () => play({ 'K-03': 'D' }, 1, { stopAt: (s) => s.scene === 'ch1_routine' }).s
const state2 = () => play({ 'K-03': 'A' }, 2, { stopAt: (s) => s.scene === 'ch2_open' }).s

function device(srv: FakeServer) {
  const api = new FakeCloud(srv)
  const ctl = new CloudController(true, async () => api, 0)
  const msgs: string[] = []; ctl.setNotifier((m) => msgs.push(m))
  return { api, ctl, msgs }
}
async function login(srv: FakeServer, email = 'a@example.com', pw = 'password1') {
  const d = device(srv); await d.ctl.init()
  await d.ctl.signUp(email, pw).then((r) => { if (!r.ok) throw new Error('signup') })
  return d
}
const row = (srv: FakeServer, slot: string) => srv.rows.find((r) => r.slot === slot)

beforeEach(() => window.localStorage.clear())

describe('설정·키 안전', () => {
  const URL = 'https://abcd.supabase.co'
  const jwt = (role: string) => `h.${btoa(JSON.stringify({ role })).replace(/=/g, '')}.s`
  it('환경변수가 없으면 꺼진다(게임은 로컬 저장으로 정상 동작)', () => {
    expect(evaluateConfig(undefined, undefined, false)).toMatchObject({ enabled: false, reason: 'not-configured' })
    expect(evaluateConfig(URL, '', false).enabled).toBe(false)
  })
  it('service_role / sb_secret_ 키는 거부한다', () => {
    expect(evaluateConfig(URL, jwt('service_role'), false)).toMatchObject({ enabled: false, reason: 'secret-key-rejected' })
    expect(evaluateConfig(URL, 'sb_secret_abc123', false)).toMatchObject({ enabled: false, reason: 'secret-key-rejected' })
    expect(evaluateConfig(URL, 'not-a-key', false).enabled).toBe(false)
  })
  it('anon JWT 또는 sb_publishable_ 키와 올바른 URL만 허용한다', () => {
    expect(evaluateConfig(URL, jwt('anon'), false).enabled).toBe(true)
    expect(evaluateConfig(URL, 'sb_publishable_abc', false).enabled).toBe(true)
    expect(evaluateConfig('http://evil.example.com', jwt('anon'), false)).toMatchObject({ enabled: false, reason: 'invalid-url' })
  })
  it('?qa 격리 모드에서는 클라우드가 항상 꺼진다', () => {
    expect(evaluateConfig(URL, jwt('anon'), true)).toMatchObject({ enabled: false, reason: 'qa-mode' })
  })
  it('비활성 컨트롤러는 아무 호출도 하지 않는다', async () => {
    const c = new CloudController(false, null); await c.init()
    expect(c.getSnapshot()).toMatchObject({ enabled: false, status: 'disabled' })
    expect(await c.pushSlot('slot1', 'normal')).toBe('skipped')
  })
})

describe('인증', () => {
  it('가입 → 로그인됨 → 앱 재시작 시 세션 복원', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    expect(d.ctl.getSnapshot()).toMatchObject({ status: 'signed_in', user: { email: 'a@example.com' } })
    const d2 = device(srv); d2.api.restoreSession(d.ctl.getSnapshot().user); await d2.ctl.init()
    expect(d2.ctl.getSnapshot().status).toBe('signed_in')
  })
  it('이메일 확인이 필요한 서버: 가입 직후는 로그아웃 상태, 확인 후 로그인된다', async () => {
    const srv = new FakeServer(); srv.requireConfirm = true
    const d = device(srv); await d.ctl.init()
    expect(await d.ctl.signUp('b@example.com', 'password1')).toEqual({ ok: true, needsConfirm: true })
    expect(d.ctl.getSnapshot().status).toBe('signed_out')
    expect(await d.ctl.signIn('b@example.com', 'password1')).toBe(false)
    expect(d.ctl.getSnapshot().error).toContain('확인')
    d.api.confirm('b@example.com'); expect(await d.ctl.signIn('b@example.com', 'password1')).toBe(true)
  })
  it('틀린 비밀번호는 오류 문구만 보이고 상태는 로그아웃', async () => {
    const srv = new FakeServer(); await login(srv)
    const d = device(srv); await d.ctl.init()
    expect(await d.ctl.signIn('a@example.com', 'wrong-pass')).toBe(false)
    expect(d.ctl.getSnapshot()).toMatchObject({ status: 'signed_out', error: expect.stringContaining('올바르지') })
  })
})

describe('저장·복원·삭제 (auto, slot1~slot10, 버전)', () => {
  it('로컬 저장은 로그인 없이도 되고, 로그인 후 새 슬롯은 INSERT로 올라간다(revision 1)', async () => {
    const srv = new FakeServer(); const d = device(srv); await d.ctl.init()
    saveToSlot('slot1', state1(), new Set(['a:1']))
    expect(loadFromSlot('slot1')).not.toBeNull(); expect(await d.ctl.pushSlot('slot1', 'normal')).toBe('skipped') // 비로그인
    await d.ctl.signUp('a@example.com', 'password1')
    // 로그인 직후 로컬에만 있는 슬롯은 자동 업로드하지 않는다(사용자가 선택)
    expect(srv.rows).toHaveLength(0); expect(d.ctl.getSnapshot().views.find((v) => v.slot === 'slot1')?.status).toBe('local_only')
    expect(await d.ctl.pushSlot('slot1', 'normal')).toBe('ok')
    expect(row(srv, 'slot1')).toMatchObject({ revision: 1, schema_version: 2, scenario_version: SCENARIO_VERSION, chapter: 1 })
  })
  it('auto 및 slot1~slot10 모두 저장·복원된다', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    const slots = ['auto', ...Array.from({ length: 10 }, (_, i) => `slot${i + 1}`)]
    for (const s of slots) { saveToSlot(s, state1(), new Set()); expect(await d.ctl.pushSlot(s, 'normal')).toBe('ok') }
    expect(srv.rows.map((r) => r.slot).sort()).toEqual([...slots].sort())
    window.localStorage.clear()
    await d.ctl.refresh()
    for (const s of slots) expect(d.ctl.getSnapshot().views.find((v) => v.slot === s)?.status).toBe('cloud_only')
    for (const s of slots) expect(await d.ctl.pullSlot(s)).toBe('ok')
    for (const s of slots) expect(loadFromSlot(s)?.state.scene).toBeTruthy()
  })
  it('다음 저장은 기준 리비전으로 UPDATE되고 revision이 증가한다', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    saveToSlot('slot2', state1(), new Set()); await d.ctl.pushSlot('slot2', 'normal')
    saveToSlot('slot2', state2(), new Set(['x'])); expect(await d.ctl.pushSlot('slot2', 'normal')).toBe('ok')
    expect(row(srv, 'slot2')).toMatchObject({ revision: 2 }); expect(srv.log.slice(-1)[0]).toBe('push:slot2:1')
  })
  it('내용이 같으면(jsonb 키 순서가 달라도) 동기화됨으로 판정한다', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    saveToSlot('slot3', state1(), new Set(['a', 'b'])); await d.ctl.pushSlot('slot3', 'normal'); await d.ctl.refresh()
    expect(d.ctl.getSnapshot().views.find((v) => v.slot === 'slot3')?.status).toBe('same')
  })
  it('호환되지 않는 클라우드 저장(schema/scenario 버전)은 열지 않고 서버 원본도 건드리지 않는다', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    saveToSlot('slot4', state1(), new Set()); await d.ctl.pushSlot('slot4', 'normal')
    const r = row(srv, 'slot4')!; r.schema_version = 1; window.localStorage.removeItem(`${STORAGE_PREFIX}save:slot4`)
    await d.ctl.refresh()
    expect(d.ctl.getSnapshot().views.find((v) => v.slot === 'slot4')?.status).toBe('incompatible')
    expect(await d.ctl.pullSlot('slot4')).toBe('incompatible'); expect(loadFromSlot('slot4')).toBeNull()
    r.schema_version = 2; r.scenario_version = 'ch9-9.v9'; await d.ctl.refresh()
    expect(d.ctl.getSnapshot().views.find((v) => v.slot === 'slot4')?.status).toBe('incompatible')
    expect(srv.rows.find((x) => x.slot === 'slot4')).toBeTruthy()
  })
  it('구버전(v1) 로컬 저장은 업로드하지 않는다', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    window.localStorage.setItem(`${STORAGE_PREFIX}save:slot5`, JSON.stringify({ schemaVersion: 1, state: {} }))
    await d.ctl.refresh()
    expect(d.ctl.getSnapshot().views.find((v) => v.slot === 'slot5')?.status).toBe('local_legacy')
    expect(await d.ctl.pushSlot('slot5', 'normal')).toBe('skipped'); expect(srv.rows).toHaveLength(0)
  })
  it('허용되지 않은 슬롯·과대 데이터·챕터 범위는 클라이언트에서 거부/보정된다', () => {
    saveToSlot('slot1', state1(), new Set())
    const f = loadFromSlot('slot1')!
    expect(() => toPayload('slot11', f)).toThrow(CloudError); expect(() => toPayload('../x', f)).toThrow(CloudError)
    expect(() => toPayload('slot1', { ...f, state: { ...f.state, backlog: 'x'.repeat(1_100_000) as never } })).toThrow(/너무 큽니다/)
    expect(toPayload('slot1', { ...f, state: { ...f.state, chapter: 99 } }).chapter).toBe(14)
    expect(toPayload('slot1', { ...f, label: 'a'.repeat(300) }).label).toHaveLength(120)
  })
  it('클라우드 삭제는 리비전 조건부이며 로컬 슬롯은 남는다', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    saveToSlot('slot6', state1(), new Set()); await d.ctl.pushSlot('slot6', 'normal')
    expect(await d.ctl.deleteCloudSlot('slot6')).toBe('ok'); expect(row(srv, 'slot6')).toBeUndefined(); expect(loadFromSlot('slot6')).not.toBeNull()
  })
})

describe('충돌: 자동 덮어쓰기 금지, 사용자 선택', () => {
  async function twoDevices() {
    const srv = new FakeServer()
    const a = await login(srv)
    saveToSlot('slot1', state1(), new Set(['a'])); await a.ctl.pushSlot('slot1', 'normal')
    return { srv, a }
  }
  it('다른 기기가 먼저 바꾸면 내 저장은 올라가지 않고 충돌로 표시된다(서버 데이터 유지)', async () => {
    const { srv, a } = await twoDevices()
    // 기기 B: 같은 계정, 같은 슬롯을 먼저 갱신
    const b = device(srv); b.api.restoreSession(a.ctl.getSnapshot().user); await b.ctl.init(); await b.ctl.refresh()
    window.localStorage.clear() // B는 별도 기기(별도 localStorage)라고 가정하기 위해 A의 로컬을 비운 뒤 B가 받는다
    await b.ctl.refresh(); await b.ctl.pullSlot('slot1')
    saveToSlot('slot1', state2(), new Set(['b'])); expect(await b.ctl.pushSlot('slot1', 'normal')).toBe('ok')
    const serverAfterB = JSON.stringify(row(srv, 'slot1')!.state)
    // 기기 A로 돌아와서(A의 로컬/메타 복원이 필요하므로 A 로컬 재현) 오래된 기준으로 저장 시도
    window.localStorage.clear()
    saveToSlot('slot1', state1(), new Set(['a-edit']))
    const metaKey = `${STORAGE_PREFIX}cloudmeta:${a.ctl.getSnapshot().user!.id}`
    window.localStorage.setItem(metaKey, JSON.stringify({ base: { slot1: { rev: 1, hash: 'old' } }, pending: {} }))
    expect(await a.ctl.pushSlot('slot1', 'normal')).toBe('conflict')
    expect(JSON.stringify(row(srv, 'slot1')!.state)).toBe(serverAfterB) // 덮어쓰지 않음
    expect(a.msgs.some((m) => m.includes('서로 달라졌습니다'))).toBe(true)
    expect(a.ctl.getSnapshot().views.find((v) => v.slot === 'slot1')?.status).toBe('conflict')
  })
  it('처음 로그인한 기기에서 같은 슬롯에 서로 다른 데이터가 있으면 올리지 않고 충돌로 표시한다', async () => {
    const { srv, a } = await twoDevices()
    window.localStorage.clear(); saveToSlot('slot1', state2(), new Set(['other']))
    const b = device(srv); b.api.restoreSession(a.ctl.getSnapshot().user); await b.ctl.init()
    expect(b.ctl.getSnapshot().views.find((v) => v.slot === 'slot1')?.status).toBe('conflict')
    expect(await b.ctl.pushSlot('slot1', 'normal')).toBe('conflict'); expect(row(srv, 'slot1')!.revision).toBe(1)
  })
  it('"클라우드 것을 유지": 로컬은 bak에 보존된 채 클라우드 내용으로 교체된다', async () => {
    const { srv, a } = await twoDevices()
    const before = rawGet('save:slot1')
    window.localStorage.removeItem(`${STORAGE_PREFIX}cloudmeta:${a.ctl.getSnapshot().user!.id}`)
    saveToSlot('slot1', state2(), new Set(['mine'])); await a.ctl.refresh()
    expect(a.ctl.getSnapshot().views.find((v) => v.slot === 'slot1')?.status).toBe('conflict')
    const mine = rawGet('save:slot1')
    expect(await a.ctl.pullSlot('slot1')).toBe('ok')
    expect(rawGet('bak:slot1')).toBe(mine); expect(rawGet('save:slot1')).not.toBe(mine)
    expect(contentHash(loadFromSlot('slot1')!.state, loadFromSlot('slot1')!.read)).toBe(contentHash(row(srv, 'slot1')!.state, row(srv, 'slot1')!.read_lines))
    void before
  })
  it('"이 기기 것을 유지": 본 서버 리비전 기준으로만 덮어쓰며, 그 사이 또 바뀌면 다시 충돌', async () => {
    const { srv, a } = await twoDevices()
    window.localStorage.removeItem(`${STORAGE_PREFIX}cloudmeta:${a.ctl.getSnapshot().user!.id}`)
    saveToSlot('slot1', state2(), new Set(['mine'])); await a.ctl.refresh()
    row(srv, 'slot1')!.revision += 1 // 사용자가 화면을 보는 동안 다른 기기가 또 저장
    expect(await a.ctl.pushSlot('slot1', 'keep_local')).toBe('conflict')
    await a.ctl.refresh()
    expect(await a.ctl.pushSlot('slot1', 'keep_local')).toBe('ok')
    expect(row(srv, 'slot1')!.revision).toBe(3)
  })
})

describe('오프라인·네트워크 장애', () => {
  it('저장 중 오프라인이어도 로컬 저장은 보존되고 대기 표시 후 복구되면 올라간다', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    saveToSlot('slot1', state1(), new Set()); srv.online = false
    expect(await d.ctl.pushSlot('slot1', 'normal')).toBe('offline')
    expect(loadFromSlot('slot1')).not.toBeNull(); expect(srv.rows).toHaveLength(0)
    expect(loadMeta(d.ctl.getSnapshot().user!.id).pending.slot1).toBe(true); expect(d.ctl.getSnapshot().offline).toBe(true)
    expect(d.msgs.some((m) => m.includes('오프라인'))).toBe(true)
    srv.online = true; expect(await d.ctl.pushSlot('slot1', 'normal')).toBe('ok')
    expect(loadMeta(d.ctl.getSnapshot().user!.id).pending.slot1).toBeUndefined()
  })
  it('새로고침·불러오기 중 오프라인이어도 예외 없이 오류 상태만 표시한다', async () => {
    const srv = new FakeServer(); const d = await login(srv)
    srv.online = false
    await expect(d.ctl.refresh()).resolves.toBeUndefined(); expect(d.ctl.getSnapshot()).toMatchObject({ offline: true, busy: false })
    expect(await d.ctl.pullSlot('slot1')).toBe('missing')
  })
  it('오프라인 상태의 로그인 시도는 실패 문구를 보이고 게임 상태에 영향이 없다', async () => {
    const srv = new FakeServer(); srv.online = false
    const d = device(srv); await d.ctl.init(); expect(await d.ctl.signIn('a@example.com', 'password1')).toBe(false)
    expect(d.ctl.getSnapshot().error).toContain('네트워크')
  })
})

describe('사용자 격리·로그아웃', () => {
  it('다른 사용자의 행은 보이지 않고 조건부 UPDATE·DELETE도 0행(권한 없음)이다', async () => {
    const srv = new FakeServer(); const a = await login(srv)
    saveToSlot('slot1', state1(), new Set()); await a.ctl.pushSlot('slot1', 'normal')
    const aId = a.ctl.getSnapshot().user!.id
    const b = await login(srv, 'b@example.com', 'password2')
    expect(await b.api.listSaves(aId)).toEqual([]); expect(await b.api.listSaves(b.ctl.getSnapshot().user!.id)).toEqual([])
    const p: SavePayload = toPayload('slot1', loadFromSlot('slot1')!)
    expect(await b.api.pushSave(aId, p, 1)).toMatchObject({ ok: false, conflict: true, cloud: null })
    expect(await b.api.deleteSave(aId, 'slot1', 1)).toMatchObject({ ok: false, conflict: true })
    await expect(b.api.insertEndings(aId, ['E-A1'])).rejects.toMatchObject({ kind: 'rls' })
    expect(row(srv, 'slot1')!.revision).toBe(1)
  })
  it('로그아웃하면 동기화 메타와 화면 데이터가 지워지고, 다른 계정으로 로그인해도 이전 계정 정보가 없다', async () => {
    const srv = new FakeServer(); const a = await login(srv)
    saveToSlot('slot1', state1(), new Set()); await a.ctl.pushSlot('slot1', 'normal')
    const aId = a.ctl.getSnapshot().user!.id
    expect(rawGet(`cloudmeta:${aId}`)).toBeTruthy()
    await a.ctl.signOut()
    expect(rawGet(`cloudmeta:${aId}`)).toBeNull(); expect(a.ctl.getSnapshot()).toMatchObject({ status: 'signed_out', user: null, views: [] })
    expect(loadFromSlot('slot1')).not.toBeNull() // 이 기기의 저장 슬롯은 사용자의 데이터이므로 유지
    expect(await a.ctl.pushSlot('slot1', 'normal')).toBe('skipped')
    await a.ctl.signUp('b@example.com', 'password2')
    expect(a.ctl.getSnapshot().views.find((v) => v.slot === 'slot1')?.cloud).toBeNull()
  })
  it('오프라인에서도 로그아웃은 로컬 캐시를 지운다', async () => {
    const srv = new FakeServer(); const a = await login(srv); const id = a.ctl.getSnapshot().user!.id
    saveToSlot('slot1', state1(), new Set()); await a.ctl.pushSlot('slot1', 'normal'); srv.online = false
    await a.ctl.signOut(); expect(rawGet(`cloudmeta:${id}`)).toBeNull(); expect(a.ctl.getSnapshot().status).toBe('signed_out')
  })
})

describe('엔딩 해금 동기화', () => {
  it('허용 엔딩 ID는 DB CHECK·BRANCH_MAP 7장과 같은 13개다', () => {
    expect([...ALLOWED_ENDINGS]).toEqual(['E-A1', 'E-A2', 'E-A3', 'E-B1', 'E-B2', 'E-C1', 'E-C2', 'E-D1', 'E-D2', 'E-E1', 'E-E2', 'E-F1', 'E-F2'])
  })
  it('허용 목록 밖 ID는 로컬에도 서버에도 기록되지 않는다', async () => {
    expect(recordEnding('E-Z9')).toBe(false); expect(recordEnding('E-A1')).toBe(true); expect(recordEnding('E-A1')).toBe(false)
    expect(mergeEndings(['E-Z9', 'E-B2', "E-A1'; drop table x;--"])).toBe(1)
    const srv = new FakeServer(); const d = await login(srv)
    await expect(d.api.insertEndings(d.ctl.getSnapshot().user!.id, ['E-Z9'])).rejects.toMatchObject({ kind: 'validation' })
  })
  it('로그인 시 로컬·클라우드 엔딩이 합집합으로 맞춰지고(INSERT만) 중복 실행해도 같다', async () => {
    const srv = new FakeServer(); const a = await login(srv)
    recordEnding('E-A1'); recordEnding('E-C2'); await a.ctl.syncEndings()
    expect(srv.endings.map((e) => e.ending_id).sort()).toEqual(['E-A1', 'E-C2'])
    window.localStorage.clear(); expect(loadEndings().ids).toEqual([])
    await a.ctl.syncEndings(); expect(loadEndings().ids.sort()).toEqual(['E-A1', 'E-C2'])
    await a.ctl.syncEndings(); expect(srv.endings).toHaveLength(2)
  })
})

/** 실제 SupabaseCloud가 만드는 쿼리의 모양을 검증한다(서버 없이). 실서버 동작은 별도 확인 필요. */
describe('SupabaseCloud 쿼리 형태(스텁)', () => {
  type Call = { m: string; a: unknown[] }
  function stub(results: { data?: unknown; error?: unknown }[]) {
    const calls: Call[] = []
    const builder: Record<string, unknown> = {}
    for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'single', 'maybeSingle']) builder[m] = (...a: unknown[]) => { calls.push({ m, a }); return builder }
    builder.then = (res: (v: unknown) => unknown) => res(results.shift() ?? { data: [], error: null })
    return { sb: { from: (t: string) => { calls.push({ m: 'from', a: [t] }); return builder }, auth: {} } as never, calls }
  }
  const payload = (): SavePayload => ({ slot: 'slot1', state: { a: 1 }, read_lines: [], label: 'l', chapter: 1, schema_version: 2, scenario_version: 'ch1-2.v1' })
  it('UPDATE는 user_id·slot·revision 조건을 모두 건다(원자적 조건부 갱신)', async () => {
    const { sb, calls } = stub([{ data: [{ slot: 'slot1', revision: 4 }], error: null }])
    const r = await new SupabaseCloud(sb).pushSave('U1', payload(), 3)
    expect(r.ok).toBe(true)
    const eqs = calls.filter((c) => c.m === 'eq').map((c) => c.a.join('='))
    expect(eqs).toEqual(['user_id=U1', 'slot=slot1', 'revision=3']); expect(calls.some((c) => c.m === 'update')).toBe(true)
    const upd = calls.find((c) => c.m === 'update')!.a[0] as Record<string, unknown>
    expect(upd).not.toHaveProperty('revision'); expect(upd).not.toHaveProperty('user_id'); expect(upd).not.toHaveProperty('id')
  })
  it('UPDATE가 0행이면 충돌로 처리하고 서버 행을 다시 읽는다', async () => {
    const { sb } = stub([{ data: [], error: null }, { data: { slot: 'slot1', revision: 9 }, error: null }])
    expect(await new SupabaseCloud(sb).pushSave('U1', payload(), 3)).toMatchObject({ ok: false, conflict: true, cloud: { revision: 9 } })
  })
  it('INSERT는 revision·user_id를 보내지 않고, 23505(UNIQUE 위반)는 충돌이다', async () => {
    const { sb, calls } = stub([{ data: null, error: { code: '23505', message: 'dup' } }, { data: { slot: 'slot1', revision: 2 }, error: null }])
    expect(await new SupabaseCloud(sb).pushSave('U1', payload(), null)).toMatchObject({ ok: false, conflict: true })
    const ins = calls.find((c) => c.m === 'insert')!.a[0] as Record<string, unknown>
    expect(ins).not.toHaveProperty('revision'); expect(ins).not.toHaveProperty('user_id')
  })
  it('DELETE는 user_id·slot·revision 조건, 엔딩은 DO NOTHING upsert, 목록은 user_id 필터', async () => {
    const d = stub([{ data: [{ slot: 'slot1' }], error: null }]); expect(await new SupabaseCloud(d.sb).deleteSave('U1', 'slot1', 2)).toEqual({ ok: true })
    expect(d.calls.filter((c) => c.m === 'eq').map((c) => c.a.join('='))).toEqual(['user_id=U1', 'slot=slot1', 'revision=2'])
    const e = stub([{ error: null }]); await new SupabaseCloud(e.sb).insertEndings('U1', ['E-A1'])
    const up = e.calls.find((c) => c.m === 'upsert')!; expect(up.a[1]).toMatchObject({ ignoreDuplicates: true, onConflict: 'user_id,ending_id' })
    const l = stub([{ data: [], error: null }]); await new SupabaseCloud(l.sb).listSaves('U1'); expect(l.calls.find((c) => c.m === 'eq')!.a).toEqual(['user_id', 'U1'])
  })
  it('네트워크/권한/검증 오류는 종류별로 분류된다', async () => {
    const mk = (error: unknown) => new SupabaseCloud(stub([{ data: null, error }]).sb).listSaves('U1')
    await expect(mk({ name: 'TypeError', message: 'Failed to fetch' })).rejects.toMatchObject({ kind: 'network' })
    await expect(mk({ code: '42501', message: 'new row violates row-level security policy' })).rejects.toMatchObject({ kind: 'rls' })
    await expect(mk({ code: '23514', message: 'check' })).rejects.toMatchObject({ kind: 'validation' })
    await expect(mk({ status: 401, message: 'JWT expired' })).rejects.toMatchObject({ kind: 'auth' })
  })
})
