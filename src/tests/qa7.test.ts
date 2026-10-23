import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { advance, choose, clone, currentNode, newState, pickActivity, run, listActions, setIncidents, visibleOptions } from '../engine/core'
import { buildCases } from '../data/cases'
import { buildJournal } from '../data/journal'
import { INCIDENTS } from '../data/incidents'
import { START_SCENE } from '../data/scenario'
import { loadFromSlot, saveToSlot, validateSave } from '../engine/save'
import { store } from '../engine/store'
import type { GameState } from '../engine/types'
import './helpers'

/** Codex QA 7건 회귀: SAVE-01 · STORY-01 · KNOW-01 · REL-01 · TIME-01 · SAVE-02 + 이력 기반 H-08 후속 */
const file = (st: GameState) => ({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: st })
const at = (scene: string, patch: (s: GameState) => void) => { const s = newState(START_SCENE, 4); s.scene = scene; s.idx = 0; s.chapter = 2; s.mode = 'STORY'; patch(s); return run(s) }
/** 장면을 지나며 본 문장들(선택은 pick 지정, 없으면 첫 선택). stop 장면에 닿으면 멈춘다 */
function play(s0: GameState, pick: Record<string, string>, stop = 'ch2_match') {
  let s = s0; const lines: string[] = []; const scenes: string[] = []
  for (let i = 0; i < 300 && s.scene !== stop && s.mode !== 'ENDED'; i++) {
    scenes.push(s.scene); const n = currentNode(s)
    if (n?.t === 'line') { lines.push(n.text); s = advance(s) }
    else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, (v.find((o) => o.key === pick[n.id]) ?? v[0]).key) }
    else break
  }
  return { s, lines, scenes, text: lines.join('\n') }
}

describe('SAVE-01 영구 저장 실패 시 최신 저장', () => {
  beforeEach(() => { window.localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks() })
  it('영구 저장이 실패해도 불러오기는 이전 영구 값이 아니라 가장 최근(임시) 저장을 돌려준다', () => {
    const a = clone(newState(START_SCENE, 1)); a.stats.int = 11
    expect(saveToSlot('slot7', a, new Set())).toBe(true)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    const b = clone(a); b.stats.int = 22
    expect(saveToSlot('slot7', b, new Set())).toBe(false) // 임시 저장임을 알린다
    expect(loadFromSlot('slot7')!.state.stats.int).toBe(22)
    vi.restoreAllMocks()
    const c = clone(a); c.stats.int = 33
    expect(saveToSlot('slot7', c, new Set())).toBe(true) // 영구 저장이 다시 성공하면 임시 값은 지워진다
    expect(loadFromSlot('slot7')!.state.stats.int).toBe(33)
    expect(window.localStorage.getItem('hfd-qa:save:slot7') ?? window.localStorage.getItem('hfd:save:slot7')).toContain('"int":33')
  })
  it('안내 문구가 영구 저장과 임시 저장을 구분한다', () => {
    store.newGame()
    store.save('slot3'); expect(store.toast).toBe('저장했습니다.')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    store.save('slot3'); expect(store.toast).toMatch(/임시로만 저장.*사라집니다/)
    store.autosave(); expect(store.toast).toMatch(/자동 저장을 브라우저에 기록하지 못했습니다/)
  })
})

describe('STORY-01 헤르미온느 갈등의 원인 구분', () => {
  const seen = (s: GameState) => { s.bonds!.hermione.stage = 2; s.recent = [{ who: 'pansy', day: 26, witnesses: ['hermione'] }]; s.calendar = { date: '09-27', weekday: '금', slot: '-' } }
  it('서고 위반만 있을 때는 판시를 언급하는 대사·화해가 나오지 않는다', () => {
    for (const k of ['A', 'B', 'C']) {
      const r = play(at('ch2_eve_t_hermione', (s) => { s.flags.FLAG_P2_BREACH = true; s.calendar = { date: '09-27', weekday: '금', slot: '-' } }), { 'L-11': k })
      expect(r.scenes).toContain('ch2_eve_t_hermione_breach'); expect(r.text, k).not.toMatch(/판시/)
    }
  })
  it('판시와의 만남을 목격했을 때만 있을 때는 서고 이야기가 나오지 않는다', () => {
    for (const k of ['A', 'B', 'C']) {
      const r = play(at('ch2_eve_t_hermione', seen), { 'L-11': k })
      expect(r.scenes).toContain('ch2_eve_t_hermione_seen'); expect(r.text, k).toMatch(/판시/); expect(r.text, k).not.toMatch(/서고|필치|필사/)
    }
  })
  it('두 원인은 서로 다른 경로에서만 생기며(겹치지 않음), 억지로 겹쳐도 일어나지 않은 만남을 전제하지 않는다', () => {
    const r = play(at('ch2_eve_t_hermione', (s) => { seen(s); s.flags.FLAG_P2_BREACH = true }), { 'L-11': 'A' })
    expect(r.scenes).toContain('ch2_eve_t_hermione_breach'); expect(r.text).not.toMatch(/판시/)
  })
  it('인물 기록: 서고 위반 경로의 화해/거리 두기 기록에 판시가 나오지 않는다', () => {
    const s = newState(START_SCENE, 1); s.flags.FLAG_HER_REPAIRED = true; s.flags.FLAG_P2_BREACH = true; s.flags.FLAG_RT_HERMIONE = true; s.bonds!.hermione.seen = 2
    const page = buildJournal(s).find((p) => p.id === 'hermione')
    expect(page?.observed.join('\n')).toMatch(/서고/); expect(page?.observed.join('\n')).not.toMatch(/판시/)
    const t = clone(s); delete t.flags.FLAG_P2_BREACH
    expect(buildJournal(t).find((p) => p.id === 'hermione')?.observed.join('\n')).toMatch(/판시/)
  })
})

describe('KNOW-01 계단 입구와 내부 정보 분리', () => {
  const door = (s: GameState) => JSON.stringify(buildCases(s).find((c) => c.id === 'seventh-door'))
  it('Q-03 B(입구만 표시)는 내부 문양·온기 정보를 얻지 않는다', () => {
    const b = play(at('ch2_p_secret', () => {}), { 'Q-03': 'B' }, 'ch2_routine1')
    expect(b.s.knowledge.OB_HIDDEN_STAIR).toBe(true); expect(b.s.knowledge.OB_STAIR_INSIDE).toBeFalsy(); expect(b.s.knowledge.KN_STAIR_WARM_LUNA).toBeFalsy()
    expect(door(b.s)).toContain('좁은 나선 계단'); expect(door(b.s)).not.toMatch(/매듭 문양이 새겨|따뜻/)
    const a = play(at('ch2_p_secret', () => {}), { 'Q-03': 'A' }, 'ch2_routine1')
    expect(a.s.knowledge.OB_STAIR_INSIDE).toBe(true); expect(door(a.s)).toMatch(/매듭 문양이 새겨/); expect(door(a.s)).toMatch(/따뜻/)
  })
  it('입구만 알면 밤에도 "처음 오르는 계단"으로 이동하고, 내부를 안 줄 알던 문장(칠십일 계단)은 나오지 않는다', () => {
    const mk = (extra: string[]) => { const s = newState(START_SCENE, 1); s.scene = 'ch2_night'; s.idx = 0; s.chapter = 2; s.mode = 'STORY'; s.knowledge.OB_HIDDEN_STAIR = true; for (const k of extra) s.knowledge[k] = true; return run(s) }
    const b = play(mk([]), {}, 'ch2_after'); expect(b.text).toMatch(/처음 오르는 계단/); expect(b.text).not.toMatch(/칠십일/)
    const a = play(mk(['OB_STAIR_INSIDE']), {}, 'ch2_after'); expect(a.text).toMatch(/칠십일/); expect(a.text).not.toMatch(/처음 오르는 계단/)
  })
})

describe('REL-01 선택 보상이 같은 장면의 진입 조건에 선반영되지 않는다', () => {
  const night = (trust: number, confided = true) => play(at('ch2_eve_i_pansy', (s) => { s.bonds!.pansy.stage = 2; s.emotions.pansy.trust = trust; s.flags.FLAG_RT_PANSY_OK = true; if (confided) s.flags.FLAG_P2_PAN_CONFIDED = true }), { 'L-04': 'B', 'L-21': 'B' })
  it('trust 8·9·10 경계: 선택 전 신뢰가 10 이상일 때만 밤이 열린다(선택 보상 +2로 8·9가 10을 넘어도 열리지 않음)', () => {
    expect(night(8).scenes).not.toContain('ch2_eve_i_pansy_night')
    expect(night(9).scenes).not.toContain('ch2_eve_i_pansy_night') // 9 + 2 = 11이어도 열리지 않는다
    expect(night(10).scenes).toContain('ch2_eve_i_pansy_night')
    expect(night(10).s.flags.FLAG_PAN_NIGHT_OPEN).toBe(true); expect(night(9).s.flags.FLAG_PAN_NIGHT_OPEN).toBeFalsy()
  })
  it('비밀을 나누지 않았다면 신뢰가 높아도 열리지 않는다', () => { expect(night(30, false).scenes).not.toContain('ch2_eve_i_pansy_night') })
})

describe('TIME-01 돌발 사건 판정 시점 통일', () => {
  afterEach(() => setIncidents([]))
  /** 9/4 저녁(슬롯 2)에 시작한 활동이 9/5로 넘어가는 경우 */
  function crossing() {
    let s = newState(START_SCENE, 2); s.flags.FLAG_X = true
    s.scene = 'v2c1_routine'; s.idx = 0; s.mode = 'STORY'; s = run(s)
    for (let i = 0; i < 10 && s.mode !== 'ROUTINE'; i++) s = advance(s)
    const r = s.routine!; r.encounters = {}; r.meets = {}; r.friends = {}
    r.dayIdx = r.days.findIndex((d) => d.date === '09-04'); r.slotIdx = 2
    const cand = r.locations.flatMap((loc) => listActions(s, loc).filter((a) => a.ok && !a.actId.startsWith('ev:')).map((a) => [loc, a.actId, a] as const))
    return { s, cand }
  }
  it('9/4 저녁 시작 → 9/5 오후1 사례: 시작 시각(9/4·저녁)의 사건만 걸리고 도착 시각(9/5·오후1)의 사건은 걸리지 않는다', () => {
    const { s, cand } = crossing()
    const pick = cand[0]; const [loc, act] = [pick[0], pick[1]]
    const base = INCIDENTS[0]
    const inc = (dates: string[], slots: number[]) => ({ ...base, places: [loc], acts: [act], dates, slots, chance: 1, cond: undefined })
    setIncidents([inc(['09-05'], [0])]) // 도착 시각 기준이라면 걸렸을 사건
    const arrive = pickActivity(clone(s), loc, act)
    expect([arrive.scene, arrive.routine?.after]).not.toContain(base.id)
    setIncidents([inc(['09-04'], [2])]) // 시작 시각 기준 사건
    const start = pickActivity(clone(s), loc, act)
    expect([start.scene, start.routine?.after]).toContain(base.id)
  })
  it('같은 시작 상태는 몇 번을 불러와도 같은 결과다(결정적 해시 입력이 시작 시각 기준)', () => {
    const { s, cand } = crossing(); const [loc, act] = [cand[0][0], cand[0][1]]
    const base = INCIDENTS[0]
    setIncidents([{ ...base, places: [loc], acts: [act], dates: ['09-04'], slots: [2], chance: 0.5, cond: undefined }])
    const run1 = pickActivity(clone(s), loc, act); const run2 = pickActivity(clone(s), loc, act)
    expect([run1.scene, run1.routine?.after]).toEqual([run2.scene, run2.routine?.after])
  })
})

describe('SAVE-02 구세이브 복원과 검증', () => {
  const base = () => { const s = clone(newState(START_SCENE, 1)); s.scene = START_SCENE; s.idx = 0; return s }
  it('이력 복원: 판시 관계 기록이 없던 저장도 환영 흔들림 목격 이력이 있으면 know=1', () => {
    const s = base(); s.flags.FLAG_PANSY_NOTICED = true; delete (s.bonds as Record<string, unknown>).pansy
    expect(validateSave(JSON.parse(JSON.stringify(file(s)))).state.bonds!.pansy.know).toBe(1)
    const t = base(); t.choices.push({ id: 'S-02', option: 'B', scene: 'ch2_morning', date: '09-29' }); delete (t as { bonds?: unknown }).bonds
    expect(validateSave(JSON.parse(JSON.stringify(file(t)))).state.bonds!.pansy.know).toBe(1)
    const u = base(); delete (u.bonds!.pansy as { know?: number }).know; u.flags.FLAG_PANSY_NOTICED = true
    expect(validateSave(JSON.parse(JSON.stringify(file(u)))).state.bonds!.pansy.know).toBe(1)
  })
  it('명시적 know=0은 이력이 있어도 유지되고, 이력이 없으면 0이다', () => {
    const s = base(); s.flags.FLAG_PANSY_NOTICED = true; s.bonds!.pansy.know = 0
    expect(validateSave(JSON.parse(JSON.stringify(file(s)))).state.bonds!.pansy.know).toBe(0)
    const t = base(); delete (t as { bonds?: unknown }).bonds
    expect(validateSave(JSON.parse(JSON.stringify(file(t)))).state.bonds!.pansy.know).toBe(0)
    const v = base(); v.bonds!.pansy.know = 3
    expect(validateSave(JSON.parse(JSON.stringify(file(v)))).state.bonds!.pansy.know).toBe(3)
  })
  it('없는 장면 ID·범위를 벗어난 인덱스·필수 타입 오류는 적용 전에 거부된다', () => {
    const f = (patch: (s: GameState) => void) => { const s = base(); patch(s); return () => validateSave(JSON.parse(JSON.stringify(file(s)))) }
    expect(f((s) => { s.scene = 'no_such_scene' })).toThrow(/없는 장면/)
    expect(f((s) => { s.idx = 99999 })).toThrow(/장면 위치/)
    expect(f((s) => { s.idx = -1 })).toThrow(/손상/)
    expect(f((s) => { s.idx = 1.5 })).toThrow(/손상/)
    expect(f((s) => { (s as unknown as { flags: unknown }).flags = [] })).toThrow(/flags/)
    expect(f((s) => { (s as unknown as { choices: unknown }).choices = {} })).toThrow(/choices/)
    expect(f((s) => { (s as unknown as { mode: string }).mode = 'WAT' })).toThrow(/mode/)
    expect(f((s) => { s.mode = 'ROUTINE'; s.routine = null })).toThrow(/routine/)
    expect(f(() => {})).not.toThrow()
  })
  it('손상된 저장을 가져와도 현재 게임 상태는 바뀌지 않는다', () => {
    store.state = base(); const before = JSON.stringify(store.state)
    const bad = base(); bad.scene = 'no_such_scene'
    expect(() => store.import(JSON.stringify(file(bad)))).toThrow()
    expect(JSON.stringify(store.state)).toBe(before)
  })
})

describe('H-08 이력 기반 후속(무작위 재배정 아님)', () => {
  const week = (hist: [string, string][]) => play(at('v2c1_week', (s) => { for (const [id, option] of hist) s.choices.push({ id, option, scene: 'x', date: '09-01' }) }), { 'H-08': 'B' }, 'v2c1_routine')
  it('경기장 소리(H-08 B)는 과거 선택 이력과 무관하게 항상 지니 경로다(과거 선택이 현재 행동을 다른 사람의 경로로 바꾸지 않는다)', () => {
    const r = week([['H-01', 'A'], ['P-01', 'A']]); expect(r.s.flags.FLAG_RT_GINNY).toBe(true); expect(r.s.flags.FLAG_RT_PANSY_PITCH).toBeFalsy(); expect(r.s.flags.FLAG_RT_PANSY).toBeFalsy()
    const t = week([['H-01', 'A'], ['P-01', 'C']]); expect(t.s.flags.FLAG_RT_GINNY).toBe(true); expect(t.s.flags.FLAG_RT_PANSY_PITCH).toBeFalsy()
    const u = week([['H-01', 'B'], ['P-01', 'A']]); expect(u.s.flags.FLAG_RT_GINNY).toBe(true)
  })
  it('[forced 이전 저장] 이전 버전 저장에 남아 있는 판시 경기장 경로(FLAG_RT_PANSY_PITCH)는 그대로 읽히고 일정·장면이 이어진다: 후속 일정은 목요일 오후2 경기장, 판시 장면은 같은 선택(E-11)', () => {
    const r = week([['H-01', 'A'], ['P-01', 'A']]); r.s.flags.FLAG_RT_PANSY = true; r.s.flags.FLAG_RT_PANSY_PITCH = true; delete r.s.flags.FLAG_RT_GINNY
    let s = clone(r.s); for (let i = 0; i < 10 && s.mode !== 'ROUTINE'; i++) s = advance(s)
    s.routine!.dayIdx = s.routine!.days.findIndex((d) => d.date === '09-05'); s.routine!.slotIdx = 1
    const ids = listActions(s, 'pitch').filter((a) => a.actId.startsWith('ev:')).map((a) => a.actId)
    expect(ids).toContain('ev:ap_pansy_pitch'); expect(ids).not.toContain('ev:ap_ginny')
    const joined = play(pickActivity(s, 'pitch', 'ev:ap_pansy_pitch'), { 'E-11': 'A' }, 'v2c1_routine')
    expect(joined.s.flags.FLAG_RT_PANSY_OK).toBe(true); expect(joined.text).toMatch(/판시/)
  })
})
