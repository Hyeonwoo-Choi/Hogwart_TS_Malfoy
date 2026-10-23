import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { advance, clone, newState, routineCursor, routineTotal, skipPlan, skipTo, startScene } from '../engine/core'
import { store } from '../engine/store'
import { boardView, CALENDAR } from '../data/calendar'
import { ACTIVITY_DEFS, PLACE_RULES } from '../data/places'
import { START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'
import './helpers'

/** 시간 건너뛰기(쉬기 대체): 엔진 규칙 + UI. 건너뛴 시간은 활동이 아니므로 어떤 이득도 만들지 않는다. */
function routine(flags: string[] = []): GameState {
  let s = newState(START_SCENE, 3); for (const f of flags) s.flags[f] = true
  s = startScene(s, 'v2c1_routine'); for (let i = 0; i < 10 && s.mode !== 'ROUTINE'; i++) s = advance(s)
  const r = s.routine!; r.encounters = {}; r.meets = {}; r.friends = {}
  return s
}
const at = (s: GameState, day: number, slot: number) => { const n = clone(s); n.routine!.dayIdx = day; n.routine!.slotIdx = slot; return n }

describe('쉬기 제거', () => {
  it('어떤 장소에도 쉬기 활동이 없다(과거 저장 호환을 위해 활동 정의 자체는 남긴다)', () => {
    for (const [id, rule] of Object.entries(PLACE_RULES)) expect(rule.acts.some((a) => a.id === 'rest'), id).toBe(false)
    expect(ACTIVITY_DEFS.rest).toBeTruthy()
  })
})

describe('skipPlan · skipTo 엔진 규칙', () => {
  it('지난 시각·지금 시각·구간 밖·정수가 아닌 목표는 거부한다', () => {
    const s = at(routine(), 1, 1); const cur = routineCursor(s.routine!), total = routineTotal(s.routine!)
    for (const t of [0, cur - 1, cur, total + 1, 2.5, -3]) { const p = skipPlan(s, t); expect(p.ok, String(t)).toBe(false); expect(p.reason).toBeTruthy() }
    expect(skipPlan(s, cur + 1).ok).toBe(true); expect(skipPlan(s, total).ok).toBe(true)
    expect(skipPlan({ ...s, mode: 'STORY' }, cur + 1).ok).toBe(false)
  })
  it('날짜·시간대·달력이 갱신되고 능력치·관계·플래그·만남 풀·난수 상태는 바뀌지 않는다(건너뛴 시간에는 이득이 없다)', () => {
    const s = at(routine(), 0, 2)
    const { state } = skipTo(s, routineCursor(s.routine!) + 2)
    expect(state.routine!.dayIdx).toBe(1); expect(state.routine!.slotIdx).toBe(1)
    expect(state.calendar.date).toBe('09-05'); expect(state.calendar.weekday).toBe('목'); expect(state.calendar.slot).toBe('오후2')
    for (const k of ['stats', 'emotions', 'flags', 'knowledge', 'bonds', 'encCount', 'visits', 'rng', 'rev', 'choices', 'eventLog'] as const) expect(JSON.stringify(state[k]), k).toBe(JSON.stringify(s[k]))
    expect(s.routine!.dayIdx).toBe(0)
  })
  it('같은 목표를 두 번 실행해도 두 번째는 이미 지난 시각이라 거부된다(중복 실행·중간 사건 중복 없음)', () => {
    const s = routine(); const t = routineCursor(s.routine!) + 3
    const first = skipTo(s, t); expect(first.plan.ok).toBe(true)
    const second = skipTo(first.state, t); expect(second.plan.ok).toBe(false); expect(second.state).toBe(first.state)
  })
  it('구간 끝까지 건너뛰면 다음 스토리로 이어진다(예전 "남은 시간 넘기기"와 같다)', () => {
    const s = routine(); const { state, plan } = skipTo(s, routineTotal(s.routine!))
    expect(plan.reachesEnd).toBe(true); expect(state.routine).toBeNull(); expect(state.mode).toBe('STORY'); expect(state.scene).toBe('v2c1_night')
  })
  it('반복해서 건너뛰어도 한없이 쉴 수 없다: 매번 최소 한 칸 전진하고 구간 끝에서 다음 스토리로 간다', () => {
    let s = routine(); let n = 0; const max = routineTotal(s.routine!)
    while (s.mode === 'ROUTINE' && n < 100) { const before = routineCursor(s.routine!); s = skipTo(s, before + 1).state; n++; if (s.routine) expect(routineCursor(s.routine)).toBe(before + 1) }
    expect(n).toBeLessThanOrEqual(max); expect(s.mode).toBe('STORY')
  })
  it('선택형 행사는 놓칠 수 있다고 미리 알리고(missable), 건너뛰면 게시판에 "놓침"으로 남지 참가 처리되지는 않는다', () => {
    const s = routine(); const plan = skipPlan(s, routineTotal(s.routine!))
    expect(plan.missable.map((m) => m.id)).toEqual(expect.arrayContaining(['ev_greenhouse_prac', 'ev_pitch_open']))
    const start = at(s, 1, 0)
    const after = skipTo(start, routineCursor(start.routine!) + 4).state
    expect(after.board!.done.ev_pitch_open).toBeUndefined()
    expect(boardView(after).items.find((i) => i.id === 'ev_pitch_open')!.status).toBe('missed')
  })
  describe('필수 행사에서 멈춘다', () => {
    const synth = { id: 'req_test', title: '시험 호출', kind: 'plan' as const, date: '09-05', slots: [1], place: 'library', dur: 1, notice: 'x', scene: 'ev1_pl_draco', required: true }
    beforeEach(() => { CALENDAR.push(synth) })
    afterEach(() => { CALENDAR.splice(CALENDAR.indexOf(synth), 1) })
    it('목표가 필수 행사 뒤이면 그 시작 칸에서 멈추고, 그 칸에서는 더 건너뛸 수 없다', () => {
      const s = routine(); const evT = 1 * 3 + 1
      const p = skipPlan(s, routineTotal(s.routine!))
      expect(p.ok).toBe(true); expect(p.stopAt).toBe(evT); expect(p.stopTitle).toBe('시험 호출'); expect(p.reachesEnd).toBe(false)
      const r = skipTo(s, routineTotal(s.routine!)); expect(routineCursor(r.state.routine!)).toBe(evT); expect(r.state.mode).toBe('ROUTINE')
      expect(r.state.routine!.message).toMatch(/시험 호출/)
      const again = skipPlan(r.state, evT + 1); expect(again.ok).toBe(false); expect(again.reason).toMatch(/시험 호출/)
    })
    it('목표가 필수 행사 이전이면 영향이 없다', () => {
      const s = routine(); const p = skipPlan(s, 2); expect(p.ok).toBe(true); expect(p.stopAt).toBeUndefined()
    })
  })
})

describe('시간 건너뛰기 UI', () => {
  const click = (id: string) => act(() => { fireEvent.click(screen.getByTestId(id)) })
  const toMap = () => {
    render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }); act(() => { store.jump('v2c1_routine') })
    for (let i = 0; i < 12 && store.state!.mode === 'STORY'; i++) act(() => { fireEvent.click(screen.getByTestId('stage')) })
    act(() => { vi.advanceTimersByTime(900) })
  }
  beforeEach(() => { vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle(); store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 }) })
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

  it('지도에는 쉬기가 없고 "시간 건너뛰기"가 있으며, 모달은 현재 시각을 보여 주고 지나간 시각 버튼은 비활성이다', () => {
    toMap(); click('zone-castle'); click('loc-common')
    expect(screen.queryByTestId('act-rest')).toBeNull()
    click('skip-time'); expect(screen.getByTestId('ts-now').textContent).toMatch(/9월 04일 수요일 오후1/)
    expect((screen.getByTestId('ts-t-0') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTestId('ts-t-1') as HTMLButtonElement).disabled).toBe(false)
    // 기본 선택은 바로 다음 시간대(1칸)다. 구간 끝(9칸)은 직접 골라야 한다(실수로 하루 이상을 넘기지 않는다)
    expect(screen.getByTestId('ts-t-1').getAttribute('aria-pressed')).toBe('true'); expect(screen.getByTestId('ts-t-end').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByTestId('ts-elapsed').textContent).toMatch(/1칸/)
  })
  it('기본값으로 이동한다를 눌러도 1칸만 간다. 큰 이동은 확인을 한 번 더 거치고, 그 사이 취소하거나 목표를 바꾸면 상태가 바뀌지 않는다', () => {
    toMap(); click('skip-time'); click('skip-confirm'); expect(routineCursor(store.state!.routine!)).toBe(1)
    cleanup(); act(() => { store.toTitle() }); toMap(); click('skip-time'); click('ts-t-end')
    const before = JSON.stringify(store.state); click('skip-confirm')
    expect(screen.getByTestId('ts-armed').textContent).toMatch(/9칸/); expect(JSON.stringify(store.state)).toBe(before) // 첫 확인은 상태를 바꾸지 않는다
    click('ts-t-2'); expect(screen.queryByTestId('ts-armed')).toBeNull(); click('ts-t-end'); click('skip-confirm'); expect(screen.getByTestId('ts-armed')).toBeTruthy()
    click('ts-cancel'); expect(JSON.stringify(store.state)).toBe(before) // 취소는 시간·이벤트·능력치를 건드리지 않는다
  })
  it('목표를 고르고 확인하면 이동한다: 사전 안내(놓칠 수 있는 일정), 시간 경과 연출, 상태 반영, 연타해도 한 번만', () => {
    toMap(); click('skip-time'); click('ts-t-4')
    expect(screen.getByTestId('ts-warn').textContent).toMatch(/온실 특별 실습/)
    const saves = vi.spyOn(Storage.prototype, 'setItem')
    click('skip-confirm'); expect(routineCursor(store.state!.routine!)).toBe(0) // 4칸은 큰 이동: 첫 확인에서는 이동하지 않는다
    act(() => { fireEvent.click(screen.getByTestId('skip-confirm')); fireEvent.click(screen.getByTestId('skip-confirm')) })
    expect(routineCursor(store.state!.routine!)).toBe(4); expect(store.state!.calendar.slot).toBe('오후2')
    expect(screen.getByTestId('ts-anim').textContent).toMatch(/목요일 오후2/)
    expect(saves.mock.calls.filter((c) => String(c[0]).endsWith('save:auto')).length).toBe(1)
    act(() => { vi.advanceTimersByTime(1000) }); expect(screen.queryByTestId('ts-anim')).toBeNull(); expect(screen.getByTestId('map')).toBeTruthy()
  })
  it('움직임 감소: 연출 없이 바로 닫힌다. 취소는 아무것도 바꾸지 않는다', () => {
    toMap(); click('skip-time'); click('ts-cancel'); expect(screen.queryByTestId('ts-modal')).toBeNull(); expect(routineCursor(store.state!.routine!)).toBe(0)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }))
    click('skip-time'); click('ts-t-2'); click('skip-confirm')
    expect(screen.queryByTestId('ts-anim')).toBeNull(); expect(screen.queryByTestId('ts-modal')).toBeNull(); expect(routineCursor(store.state!.routine!)).toBe(2)
  })
  it('저장→불러오기 뒤에도 건너뛴 시각이 유지되고 시간이 다시 흐르지 않는다', () => {
    toMap(); click('skip-time'); click('ts-t-5'); click('skip-confirm'); click('skip-confirm'); act(() => { vi.advanceTimersByTime(1000) })
    store.save('slot2'); const cur = routineCursor(store.state!.routine!); const stats = JSON.stringify(store.state!.stats)
    act(() => { store.toTitle(); store.load('slot2') })
    expect(routineCursor(store.state!.routine!)).toBe(cur); expect(JSON.stringify(store.state!.stats)).toBe(stats)
  })
  it('건너뛴 뒤 지도·게시판·일정이 새 시각을 반영한다', () => {
    toMap(); click('skip-time'); click('ts-t-3'); click('skip-confirm'); click('skip-confirm'); act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByTestId('map').textContent).toMatch(/9월 05일 목요일/)
    click('board-open'); expect(screen.getByTestId('bd-ev_greenhouse_prac').getAttribute('data-status')).toBe('today')
  })
})
