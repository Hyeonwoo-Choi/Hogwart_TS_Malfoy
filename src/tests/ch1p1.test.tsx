import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { advance, appointmentConflicts, applyEffects, choose, clone, currentNode, listActions, newState, pickActivity, run, setActivityScenes, setIncidents, setRandomEvents, skipTo } from '../engine/core'
import { store } from '../engine/store'
import { INCIDENTS } from '../data/incidents'
import { START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'

/**
 * Ch1 P1-A/B/C: 판시 이벤트 접근성·약속 충돌, H-08 B 지니 경로 유지, 헤르미온느 H-03 후속 대사.
 * [natural] = 실제 엔진의 시간·장소·활동 선택으로 도달, [forced] = 상태를 직접 구성한 검증.
 */
const routineAt = (flags: string[] = []) => {
  setActivityScenes(true); setRandomEvents([]); setIncidents(INCIDENTS)
  let s = newState(START_SCENE, 5); s.scene = 'v2c1_routine'; s.idx = 0; s.mode = 'STORY'; s.chapter = 1; for (const f of flags) s.flags[f] = true; s = run(s)
  for (let i = 0; i < 20 && s.mode !== 'ROUTINE'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else break }
  return s
}
afterEach(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })
const toMapAgain = (s: GameState) => { let t = s; for (let i = 0; i < 60 && t.mode === 'EVENT'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else if (n?.t === 'choice') t = choose(t, n.options.filter((o) => !o.hesitate && !o.req)[0].key); else break } return t }
const act1 = (s: GameState, loc: string) => listActions(s, loc).find((a) => a.ok && !a.actId.startsWith('ev:') && a.dur === 1)!.actId
const goTo = (s: GameState, t: number) => { if (s.routine!.dayIdx * 3 + s.routine!.slotIdx === t) return s; const r = skipTo(s, t); expect(r.plan.ok, r.plan.reason).toBe(true); return r.state }
/** 활동 하나를 고르고 어떤 장면이 이어지는지(활동 장면 뒤의 이벤트 포함) 돌려준다. 이어서 지도로 돌아온 상태도 함께 */
const visit = (s: GameState, loc: string) => { const t = pickActivity(s, loc, act1(s, loc)); const after = t.routine?.after; return { after, back: toMapAgain(t) } }

describe('P1-A 판시 도서관·경기장 이벤트 자연 도달', () => {
  it('[natural] 판시 도서관(hr1_pansy_library): 수요일 저녁 홀에서 드레이코를 만난 뒤 목요일 오후1 도서관에 가면 열린다', () => {
    let s = routineAt(); s = goTo(s, 2)
    s = visit(s, 'hall').back; expect(s.encCount.hall).toBe(1) // 드레이코 조우를 먼저 겪었다
    expect(s.routine!.dayIdx * 3 + s.routine!.slotIdx).toBe(3)
    const v = visit(s, 'library'); expect(v.after).toBe('hr1_pansy_library')
  })
  it('[natural] 판시 경기장(hr1_pansy_pitch): 수요일 오후2 경기장에서 지니를 만나고 저녁 홀에서 드레이코를 만난 뒤 목요일 오후2 경기장에 가면 열린다', () => {
    let s = routineAt(); s = goTo(s, 1)
    const g = visit(s, 'pitch'); expect(g.after).toMatch(/hr1_ginny_pitch_1/); s = g.back
    s = goTo(s, 2); s = visit(s, 'hall').back
    s = goTo(s, 4); expect(s.routine!.dayIdx).toBe(1); expect(s.routine!.slotIdx).toBe(1)
    expect(visit(s, 'pitch').after).toBe('hr1_pansy_pitch')
  })
  it('[natural] 드레이코 조우도 그대로 열린다: 처음 겹치는 칸(목 오후1 도서관, 목 오후2 경기장)에서는 드레이코가 먼저 나온다', () => {
    let s = routineAt(); s = goTo(s, 3); expect(visit(s, 'library').after).toBe('enc1_library_1')
    const p = goTo(routineAt(), 4); expect(visit(p, 'pitch').after).toBe('enc1_pitch')
  })
  it('[natural] 판시가 열리는 순서에서도 드레이코의 다른 조우(홀 저녁 3장면)는 소모되지 않고 남는다(미경험 이벤트 자동 소비 없음)', () => {
    let s = routineAt(); s = goTo(s, 2); s = visit(s, 'hall').back
    const v = visit(s, 'library'); expect(v.after).toBe('hr1_pansy_library')
    expect(v.back.encCount.library ?? 0).toBe(0); expect(v.back.encCount.hall).toBe(1)
  })
  it('[natural] 다른 히로인 접근성 유지: 헤르미온느(목 오후2 도서관, 드레이코 없음)·지니(수 오후2 경기장)·루나(수 오후1 호수)가 그대로 열린다', () => {
    expect(visit(goTo(routineAt(), 4), 'library').after).toMatch(/hr1_hermione_library_1/)
    expect(visit(goTo(routineAt(), 1), 'pitch').after).toMatch(/hr1_ginny_pitch_1/)
    expect(visit(routineAt(), 'lake').after).toMatch(/hr1_luna_lake_1/)
  })
  it('[natural] 드레이코를 만나지 않아도 일과가 끝까지 진행된다(드레이코가 없는 칸·장소만 고른 플레이)', () => {
    let s = routineAt(); let guard = 0
    while (s.mode === 'ROUTINE' && guard++ < 12) { const loc = ['lake', 'greenhouse', 'common', 'courtyard'].find((l) => listActions(s, l).some((a) => a.ok && !a.actId.startsWith('ev:')))!; const t = pickActivity(s, loc, act1(s, loc)); s = toMapAgain(t) }
    expect(s.scene).toBe('v2c1_night'); expect(s.encCount.library ?? 0).toBe(0)
  })
})

describe('P1-A 약속 충돌', () => {
  const withAp = () => { const s = routineAt(['FLAG_RT_GINNY']); return s } // ap_ginny: 09-04 오후2 경기장
  it('[forced] 약속 시각(수 오후2)에 다른 장소 활동을 하면 충돌로 보인다. 약속 시각이 아니거나 약속이 없으면 충돌이 아니다', () => {
    const s = goTo(withAp(), 1); expect(appointmentConflicts(s, 'library', act1(s, 'library')).map((x) => x.id)).toEqual(['ap_ginny'])
    expect(appointmentConflicts(routineAt(), 'library', 'study')).toEqual([])
    const s0 = withAp(); expect(appointmentConflicts(s0, 'library', act1(s0, 'library'))).toEqual([]) // 오후1 한 칸 활동은 오후2 약속과 겹치지 않는다
    const s1 = goTo(withAp(), 1); const evId = listActions(s1, 'pitch').find((a) => a.actId === 'ev:ap_ginny')!.actId
    expect(appointmentConflicts(s1, 'pitch', evId)).toEqual([]) // 약속 장소에 가는 것은 충돌이 아니다
  })
  it('[forced] 충돌 조회는 상태를 바꾸지 않는다', () => {
    const s = goTo(withAp(), 1); const before = JSON.stringify(s); appointmentConflicts(s, 'library', act1(s, 'library')); expect(JSON.stringify(s)).toBe(before)
  })
  it('[natural] 약속 장소에 가면 약속 장면이 시작되고(참가 기록 joined) 놓친 약속으로 남지 않는다', () => {
    const s = goTo(withAp(), 1); const t = pickActivity(s, 'pitch', 'ev:ap_ginny'); expect(t.board!.done.ap_ginny).toBe('joined')
  })
  it('[forced] 약속을 놓친 밤: 놓쳤다는 해리의 반응이 나오고, 참가했으면 나오지 않는다(후속 경로는 막히지 않는다)', () => {
    const run7 = (patch: (s: GameState) => void) => { const s = newState(START_SCENE, 1); s.scene = 'v2c1_night'; s.idx = 0; s.mode = 'STORY'; s.chapter = 1; patch(s); let t = run(s); const out: string[] = []; for (let i = 0; i < 40; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
    const missed = run7((s) => { s.flags.FLAG_RT_GINNY = true }); expect(missed).toContain('약속한 시각에 그 자리에 가지 못한'); expect(missed).toContain('끝내 확인하지 못했다')
    const joined = run7((s) => { s.flags.FLAG_RT_GINNY = true; applyEffects(s, ['ev:ap_ginny=joined']) }); expect(joined).not.toContain('약속한 시각에 그 자리에 가지 못한')
    const luna = run7((s) => { s.flags.FLAG_RT_LUNA = true }); expect(luna).toContain('약속한 시각에 그 자리에 가지 못한')
  })
})

describe('P1-A 약속 충돌 확인창(DOM)', () => {
  beforeEach(() => { vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle(); store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 }) })
  afterEach(() => { cleanup(); vi.useRealTimers() })
  const click = (id: string) => act(() => { fireEvent.click(screen.getByTestId(id)) })
  const toMap = () => {
    render(<App />); click('new-game'); act(() => { store.jump('v2c1_routine') })
    for (let i = 0; i < 12 && store.state!.mode === 'STORY'; i++) click('stage')
    act(() => { vi.advanceTimersByTime(900) })
    act(() => { const s = clone(store.state!); s.flags.FLAG_RT_GINNY = true; s.routine!.dayIdx = 0; s.routine!.slotIdx = 1; (store as unknown as { set: (x: GameState) => void }).set(s) })
  }
  it('[DOM] 약속 시각과 겹치는 활동은 확인창이 뜨고, 취소하면 시간·장소·기록이 그대로이며, 진행하면 한 번만 적용된다', () => {
    toMap(); click('zone-castle'); click('loc-library'); const actId = listActions(store.state!, 'library').find((a) => a.ok && !a.actId.startsWith('ev:'))!.actId
    const before = JSON.stringify(store.state)
    click(`act-${actId}`); expect(screen.getByTestId('appt-warn').textContent).toContain('경기장'); expect(JSON.stringify(store.state)).toBe(before)
    click('appt-cancel'); expect(screen.queryByTestId('appt-confirm')).toBeNull(); expect(JSON.stringify(store.state)).toBe(before)
    click(`act-${actId}`); click('appt-go'); expect(screen.queryByTestId('appt-confirm')).toBeNull()
    expect(JSON.stringify(store.state)).not.toBe(before); expect(store.state!.mode).toBe('EVENT')
  })
  it('[DOM] 약속과 겹치지 않는 활동에는 확인창이 뜨지 않는다(다른 장소라는 이유만으로 묻지 않는다)', () => {
    toMap(); act(() => { const s = clone(store.state!); s.routine!.slotIdx = 0; (store as unknown as { set: (x: GameState) => void }).set(s) })
    click('zone-castle'); click('loc-library'); const actId = listActions(store.state!, 'library').find((a) => a.ok && !a.actId.startsWith('ev:') && a.dur === 1)!.actId
    click(`act-${actId}`); expect(screen.queryByTestId('appt-confirm')).toBeNull(); expect(store.state!.mode).toBe('EVENT')
  })
})

describe('P1-B H-08 B 지니 경로', () => {
  const hist = (list: [string, string][]) => (s: GameState) => { for (const [id, option] of list) s.choices.push({ id, option, scene: 'x', date: '09-01' }) }
  const pickB = (patch: (s: GameState) => void) => { const s = newState(START_SCENE, 3); s.scene = 'v2c1_week'; s.idx = 0; s.mode = 'STORY'; s.chapter = 1; patch(s); let t = choose(run(s) && (() => { let u = run(s); for (let i = 0; i < 60; i++) { const n = currentNode(u); if (n?.t === 'line') u = advance(u); else break } return u })(), 'B'); for (let i = 0; i < 40 && t.scene !== 'v2c1_routine'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
  const combos: [string, [string, string][]][] = [
    ['이력 없음', []], ['H-01 A', [['H-01', 'A']]], ['P-01 A', [['P-01', 'A']]], ['P-01 B', [['P-01', 'B']]],
    ['H-01 A + P-01 A', [['H-01', 'A'], ['P-01', 'A']]], ['H-01 A + P-01 B', [['H-01', 'A'], ['P-01', 'B']]],
  ]
  for (const [name, h] of combos) {
    it(`[forced] ${name}: B를 고르면 지니 경로가 유지되고 판시 경로로 바뀌지 않는다`, () => {
      const t = pickB(hist(h)); expect(t.flags.FLAG_RT_GINNY).toBe(true); expect(t.flags.FLAG_RT_PANSY).toBeFalsy(); expect(t.flags.FLAG_RT_PANSY_PITCH).toBeFalsy(); expect(t.scene).toBe('v2c1_routine')
    })
  }
  it('[forced] B 이후 챕터 2 도입이 지니 장면(ch2_p_pitch)으로 이어진다', () => {
    const s = newState(START_SCENE, 3); s.scene = 'ch2_route'; s.idx = 0; s.mode = 'STORY'; s.chapter = 2; s.flags.FLAG_RT_GINNY = true
    expect(run(s).scene).toBe('ch2_p_pitch')
    const b = pickB(hist([['H-01', 'A'], ['P-01', 'A']])); const r = clone(b); r.scene = 'ch2_route'; r.idx = 0; r.mode = 'STORY'; r.routine = null; expect(run(r).scene).toBe('ch2_p_pitch')
  })
  it('[forced] A·C·D·E·F 선택의 기존 동작은 그대로다', () => {
    const m: Record<string, string | null> = { A: 'FLAG_RT_HERMIONE', C: 'FLAG_RT_LUNA', D: 'FLAG_RT_PANSY', E: 'FLAG_RT_DRACO', F: null }
    for (const [k, f] of Object.entries(m)) {
      const s = newState(START_SCENE, 3); s.scene = 'v2c1_week'; s.idx = 0; s.mode = 'STORY'; s.chapter = 1; let u = run(s); for (let i = 0; i < 60; i++) { const n = currentNode(u); if (n?.t === 'line') u = advance(u); else break }
      let t = choose(u, k); for (let i = 0; i < 40 && t.scene !== 'v2c1_routine'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break }
      if (f) expect(t.flags[f], k).toBe(true); else expect(['FLAG_RT_HERMIONE', 'FLAG_RT_GINNY', 'FLAG_RT_LUNA', 'FLAG_RT_PANSY', 'FLAG_RT_DRACO'].some((x) => t.flags[x])).toBe(false)
    }
  })
  it('[forced 이전 저장] 이미 판시 경기장 경로가 저장된 상태는 건드리지 않고 일정·후속 조건이 계속 읽힌다', () => {
    const s = routineAt(['FLAG_RT_PANSY', 'FLAG_RT_PANSY_PITCH']); const t = goTo(s, 4)
    expect(listActions(t, 'pitch').some((a) => a.actId === 'ev:ap_pansy_pitch')).toBe(true); expect(t.flags.FLAG_RT_GINNY).toBeFalsy()
  })
})

describe('P1-C 헤르미온느 H-03 후속(hr1_hermione_library_2)', () => {
  const out = (h: string | null) => { const s = newState(START_SCENE, 1); s.scene = 'hr1_hermione_library_2'; s.idx = 0; s.mode = 'EVENT'; s.chapter = 1
    s.routine = { days: [{ date: '09-05', weekday: '목' }], dayIdx: 0, slotIdx: 2, night: false, then: 'v2c1_night', locations: [], encounters: {}, pendingDone: false, message: null } as GameState['routine']
    if (h) s.choices.push({ id: 'H-03', option: h, scene: 'x', date: '09-01' }); let t = run(s); const o: string[] = []; for (let i = 0; i < 40 && t.scene === 'hr1_hermione_library_2'; i++) { const n = currentNode(t); if (n?.t === 'line') { o.push(n.text); t = advance(t) } else break } return o.join('|') }
  const A = '소리 내어 읽다가', B = '두 번째 단락도 고쳤어', C = '혼자 정리할 시간이 필요했는데', D = '열두 번째 문장'
  const dflt = '어차피 혼자서도 풀었을 거야'
  it('개발용 문구("특히 A를 골랐다면")는 어떤 경우에도 출력되지 않는다', () => { for (const h of ['A', 'B', 'C', 'D', null]) expect(out(h)).not.toMatch(/특히 A|골랐다면/) })
  it('A는 함께 소리 내어 읽은 경험만, B는 근거를 짚은 경험만, C는 혼자 정리할 시간만, D는 초안을 읽어 준 경험만 반영한다', () => {
    const o = { A: out('A'), B: out('B'), C: out('C'), D: out('D') }
    expect(o.A).toContain(A); expect(o.B).toContain(B); expect(o.C).toContain(C); expect(o.D).toContain(D)
    for (const [k, txt] of Object.entries(o)) for (const [kk, mark] of Object.entries({ A, B, C, D })) if (k !== kk) expect(txt, `${k}에 ${kk} 혼입`).not.toContain(mark)
    for (const txt of Object.values(o)) expect(txt).not.toContain(dflt)
  })
  it('이력이 없는 저장에서는 선택 경험을 전제하지 않는 기본 대사가 나온다', () => {
    const t = out(null); expect(t).toContain(dflt); for (const m of [A, B, C, D]) expect(t).not.toContain(m)
    expect(t).not.toMatch(/네가 들어 준|네가 말해 준|읽어 줘서/)
  })
  it('공통 대사는 A에서만 일어난 일(소리 내어 읽다 단어를 바꿔 읽음)을 전제하지 않는다', () => { expect(out('B')).not.toMatch(/들어 준 덕|소리 내어 읽다가/) })
  it('플래그·후속 효과는 그대로다(FLAG_HR1_HER_PAPER)', () => {
    const s = newState(START_SCENE, 1); s.scene = 'hr1_hermione_library_2'; s.idx = 0; s.mode = 'EVENT'; s.chapter = 1
    s.routine = { days: [{ date: '09-05', weekday: '목' }], dayIdx: 0, slotIdx: 2, night: false, then: 'v2c1_night', locations: [], encounters: {}, pendingDone: false, message: null } as GameState['routine']
    let t = run(s); for (let i = 0; i < 40 && t.scene === 'hr1_hermione_library_2'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break }
    expect(t.flags.FLAG_HR1_HER_PAPER).toBe(true)
  })
})
