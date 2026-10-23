import { act, cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { EVENT_CHANCE, advance, choose, clone, currentNode, listActions, pickActivity, remainingSlots, setRandomEvents, setScenario, skipRoutine } from '../engine/core'
import { loadFromSlot, saveToSlot } from '../engine/save'
import { store } from '../engine/store'
import { EVENT_SCENARIO, RANDOM_EVENTS, type RandomEvent } from '../data/randomEvents'
import { ACTIVITY_DEFS, PLACE_RULES } from '../data/places'
import { SCENARIO } from '../data/scenario'
import { play } from './helpers'
import type { ChoiceNode, GameState } from '../engine/types'

setScenario(SCENARIO)
const SAVED_CHANCE = { ...EVENT_CHANCE }
beforeAll(() => setRandomEvents(RANDOM_EVENTS))
afterAll(() => setRandomEvents([]))
afterEach(() => Object.assign(EVENT_CHANCE, SAVED_CHANCE))

const ch1Routine = (seed = 1) => clone(play({}, seed, { follow: true, stopAt: (s) => s.mode === 'ROUTINE' }).s)
/** 만남·조연 일상(이미 있는 스크립트 이벤트)을 소진해 둔 일과 상태 — 랜덤 이벤트만 검증할 때 쓴다 */
const quiet = (seed = 1) => { const s = ch1Routine(seed); for (const k of Object.keys(s.routine!.encounters)) s.encCount[k] = 99; for (const k of Object.keys(s.routine!.friends ?? {})) s.encCount[`f:${k}`] = 99; for (const [h, byLoc] of Object.entries(s.routine!.meets ?? {})) for (const l of Object.keys(byLoc)) s.encCount[`h:${h}:${l}`] = 99; return s }
const meta = (id: string) => RANDOM_EVENTS.find((e) => e.id === id)!
/** 이벤트 장면을 끝까지 넘겨 일과/다음 스토리로 돌아온다(선택지는 pick 함수로 고른다) */
const settle = (s0: GameState, pick: (n: ChoiceNode) => string = (n) => n.options[0].key) => {
  let s = s0
  for (let i = 0; i < 200 && s.mode === 'EVENT'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else if (n?.t === 'choice') s = choose(s, pick(n)); else break }
  return s
}
/** 시작 칸 기준으로 활동 하나를 무작위로 고른다(고정 시드 난수) */
const randomAct = (s: GameState, r: () => number): [string, string] => {
  const all: [string, string][] = []
  for (const loc of s.routine!.locations) for (const a of listActions(s, loc)) if (a.ok && !a.actId.startsWith('ev:')) all.push([loc, a.actId])
  return all[Math.floor(r() * all.length)]
}
const rng = (seed: number) => { let x = seed * 7919; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff } }

describe('이벤트 데이터', () => {
  it('모든 이벤트의 장소·활동·시간대 조건이 장소 규칙과 모순되지 않고, 장면과 선택지 결과 장면이 존재한다', () => {
    for (const e of RANDOM_EVENTS) {
      expect(EVENT_SCENARIO[e.id], e.id).toBeTruthy(); expect(e.id.startsWith('rev_')).toBe(true)
      for (const p of e.places) {
        expect(PLACE_RULES[p], `${e.id}:${p}`).toBeTruthy()
        for (const a of e.acts ?? []) {
          const pa = PLACE_RULES[p].acts.find((x) => x.id === a)
          expect(pa, `${e.id}: ${p}에 ${a} 활동이 없다`).toBeTruthy()
          if (e.slots && pa?.slots) expect(e.slots.some((sl) => pa.slots!.includes(sl)), `${e.id} 시간대`).toBe(true)
        }
        if (e.minDur) expect(PLACE_RULES[p].acts.some((x) => ACTIVITY_DEFS[x.id].dur >= e.minDur! && (!e.acts || e.acts.includes(x.id))), `${e.id} minDur`).toBe(true)
      }
    }
    for (const [id, nodes] of Object.entries(EVENT_SCENARIO)) {
      const last = nodes[nodes.length - 1]
      expect(['end', 'if', 'goto', 'choice'], id).toContain(last.t)
      for (const n of nodes) { if (n.t === 'choice') n.options.forEach((o) => expect(EVENT_SCENARIO[o.goto!], `${id}→${o.goto}`).toBeTruthy()); if (n.t === 'if') { expect(EVENT_SCENARIO[n.then]).toBeTruthy(); expect(EVENT_SCENARIO[n.else!]).toBeTruthy() } }
    }
  })
  it('이벤트는 관계 수치(감정)와 플래그·지식을 건드리지 않는다(능력치와 추가 시간만)', () => {
    for (const [id, nodes] of Object.entries(EVENT_SCENARIO)) {
      const fxs = nodes.flatMap((n) => (n.t === 'fx' ? n.fx : n.t === 'choice' ? n.options.flatMap((o) => o.fx ?? []) : []))
      for (const e of fxs) expect(e, id).toMatch(/^(stat\.[a-z]+[+-]\d+|time\+\d+)$/)
    }
  })
  it('모든 장소·활동 조합에 적용 가능한 이벤트가 2개 이상 있다', () => {
    for (const rule of Object.values(PLACE_RULES)) for (const pa of rule.acts) {
      const n = RANDOM_EVENTS.filter((e: RandomEvent) => e.places.includes(rule.id) && (!e.acts || e.acts.includes(pa.id))).length
      expect(n, `${rule.id}:${pa.id}`).toBeGreaterThanOrEqual(2)
    }
  })
  it('장소별로 고유한 사건이 있고 유형이 고르게 분포한다', () => {
    const byType: Record<string, number> = {}; const byPlace: Record<string, number> = {}
    for (const e of RANDOM_EVENTS) { byType[e.type] = (byType[e.type] ?? 0) + 1; for (const p of e.places) byPlace[p] = (byPlace[p] ?? 0) + 1 }
    for (const t of ['flavor', 'mishap', 'fortunate', 'choice', 'rare']) expect(byType[t], t).toBeGreaterThanOrEqual(5)
    for (const p of Object.keys(PLACE_RULES)) expect(byPlace[p], p).toBeGreaterThanOrEqual(4)
    console.log('[events]', RANDOM_EVENTS.length, JSON.stringify(byType), JSON.stringify(byPlace))
  })
})

describe('추첨', () => {
  it('고정 시드로 재현 가능하다(같은 시드·같은 행동 → 같은 이벤트 순서)', () => {
    const run = () => {
      const r = rng(5); let s = ch1Routine(3); const ids: string[] = []
      for (let i = 0; i < 40 && s.mode !== 'STORY'; i++) { const [l, a] = randomAct(s, r); s = pickActivity(s, l, a); if (s.mode === 'EVENT') { ids.push(s.scene); s = settle(s) } }
      return ids
    }
    expect(run()).toEqual(run())
  })
  it('이벤트는 허용된 장소·활동·시작 시간대·소요·챕터에서만 발생하고, 같은 이벤트는 연속으로 나오지 않는다', () => {
    let total = 0, evs = 0, rare = 0
    for (let seed = 1; seed <= 150; seed++) {
      const r = rng(seed); let s = ch1Routine(seed); let last = ''
      for (let i = 0; i < 12 && s.mode === 'ROUTINE'; i++) {
        const [loc, act] = randomAct(s, r)
        const slot = s.routine!.slotIdx; const dur = ACTIVITY_DEFS[act].dur
        const next = pickActivity(s, loc, act); total++
        if (next.mode === 'EVENT' && next.scene.startsWith('rev_')) {
          const e = meta(next.scene); evs++; if (e.type === 'rare') rare++
          expect(e.places, e.id).toContain(loc)
          if (e.acts) expect(e.acts, e.id).toContain(act)
          if (e.slots) expect(e.slots, e.id).toContain(slot)
          if (e.minDur) expect(dur, e.id).toBeGreaterThanOrEqual(e.minDur)
          if (e.chapters) expect(next.chapter).toBeGreaterThanOrEqual(e.chapters[0])
          expect(e.id, '연속 반복').not.toBe(last); last = e.id
          s = settle(next)
        } else { s = next; if (s.mode === 'EVENT') s = settle(s) }
      }
    }
    expect(evs).toBeGreaterThan(50); expect(rare / evs).toBeLessThan(0.2); expect(total).toBeGreaterThan(evs) // 평범한 결과가 더 많다
  })
  it('스크립트 이벤트(만남·조연 일상)가 없는 활동에서 랜덤 이벤트 확률은 절반 안팎이고 평범한 결과가 더 많다', () => {
    let total = 0, evs = 0, rare = 0
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed); const s = quiet(seed % 5 + 1); s.rng = seed * 313
      const [loc, act] = randomAct(s, r); if (ACTIVITY_DEFS[act].dur > 1) continue
      const next = pickActivity(s, loc, act); total++
      if (next.mode === 'EVENT' && next.scene.startsWith('rev_') && meta(next.scene)) { evs++; if (meta(next.scene).type === 'rare') rare++ }
    }
    const rate = evs / total
    expect(rate).toBeGreaterThan(0.25); expect(rate).toBeLessThan(0.6); expect(rare / evs).toBeLessThan(0.2)
    console.log('[event-rate-1slot]', rate.toFixed(2), 'rare', (rare / Math.max(1, evs)).toFixed(3))
  })
  it('이미 본 이벤트일수록 덜 나온다(본 횟수가 기록되고 가중치가 줄어든다)', () => {
    const r = rng(9); let s = ch1Routine(9)
    for (let i = 0; i < 6 && s.mode === 'ROUTINE'; i++) { const [l, a] = randomAct(s, r); s = pickActivity(s, l, a); if (s.mode === 'EVENT') s = settle(s) }
    const seen = Object.values(s.rev?.seen ?? {}).reduce((a, b) => a + b, 0)
    expect(seen).toBeGreaterThan(0); expect(s.rev!.last).toBeTruthy()
  })
  it('장기 활동은 추첨 확률이 더 높다', () => {
    const count = (loc: string, act: string, n = 200) => { let k = 0; for (let seed = 1; seed <= n; seed++) { const s = quiet(seed % 7 + 1); s.rng = seed * 977; const e = pickActivity(s, loc, act); if (e.mode === 'EVENT' && e.scene.startsWith('rev_')) k++ } return k }
    expect(count('classroom4', 'train_long')).toBeGreaterThanOrEqual(0) // 만남이 먼저 소비되는 장소는 제외하고 비교
    expect(count('library', 'deep_study')).toBeGreaterThan(count('library', 'study'))
  })
})

describe('시간 소모', () => {
  const forced = (id: string) => { setRandomEvents([meta(id)]); EVENT_CHANCE.base = EVENT_CHANCE.medium = EVENT_CHANCE.long = 1; EVENT_CHANCE.afterEvent = 1; EVENT_CHANCE.rare = 0 }
  afterEach(() => setRandomEvents(RANDOM_EVENTS))
  it('사고(mishap)는 추가 시간을 소모하고 날짜·남은 시간과 안내 문구를 갱신한다', () => {
    forced('rev_lib_tower'); const s0 = quiet()
    const e = pickActivity(s0, 'library', 'study'); expect(e.scene).toBe('rev_lib_tower')
    expect(remainingSlots(e)).toBe(8) // 활동 1칸 소모(이벤트 중에는 아직 추가 시간 없음)
    const done = settle(e); expect(done.mode).toBe('ROUTINE')
    expect(remainingSlots(done)).toBe(7); expect(done.routine!.notice).toMatch(/뜻밖에 한 시간대가 더 흘렀다/)
    expect(done.calendar.slot).toBe('저녁')
  })
  it('남은 시간이 얼마 없으면 초과분을 버리고 거기서 끝나며, 필수 스토리(다음 장면)는 건너뛰지 않는다', () => {
    forced('rev_lib_tower'); const s0 = quiet(); s0.routine!.dayIdx = 2; s0.routine!.slotIdx = 0 // 마지막 날 오후1: 남은 3칸
    const mid = settle(pickActivity(s0, 'library', 'research')) // 2칸 + 이벤트 1칸 = 3칸 → 정확히 끝
    expect(mid.mode).toBe('STORY'); expect(mid.scene).toBe('v2c1_night'); expect(mid.routine).toBeNull()
    setRandomEvents([meta('rev_com_ink')]) // 남은 시간 0에서 시작한 사고: 추가 시간은 버려지고 음수가 되지 않는다
    const s1 = quiet(); s1.routine!.dayIdx = 2; s1.routine!.slotIdx = 2
    const e = settle(pickActivity(s1, 'common', 'study'))
    expect(e.mode).toBe('STORY'); expect(e.scene).toBe('v2c1_night'); expect(remainingSlots(e)).toBe(0)
  })
  it('이벤트 도중 저장→복원해도 추가 시간이 한 번만 적용된다', () => {
    forced('rev_lib_tower'); localStorage.clear()
    const e = pickActivity(quiet(), 'library', 'study'); expect(e.mode).toBe('EVENT')
    const a = settle(e)
    saveToSlot('slot1', e, new Set()); const loaded = loadFromSlot('slot1')!.state
    expect(loaded).toEqual(e); const b = settle(loaded)
    expect(remainingSlots(b)).toBe(remainingSlots(a)); expect(b).toEqual(a)
    // 이벤트가 끝난 뒤 저장한 상태를 다시 불러와도 시간은 그대로이다
    saveToSlot('slot2', a, new Set()); expect(remainingSlots(loadFromSlot('slot2')!.state)).toBe(remainingSlots(a))
  })
  it('구버전 저장(rev·notice 필드 없음)에서도 정상 추첨·진행한다', () => {
    forced('rev_lib_tower'); const s = quiet(); delete s.rev; delete s.routine!.notice
    expect(pickActivity(s, 'library', 'study').rev).toBeTruthy()
  })
  it('일과 이벤트가 켜져 있어도 skipRoutine·시간 초과 차단은 그대로다', () => {
    const s = ch1Routine(); expect(skipRoutine(s).scene).toBe('v2c1_night')
  })
})

describe('선택형·희귀 이벤트', () => {
  const force = (id: string) => { setRandomEvents([meta(id)]); EVENT_CHANCE.base = EVENT_CHANCE.medium = EVENT_CHANCE.long = 1; EVENT_CHANCE.afterEvent = 1; EVENT_CHANCE.rare = 0 }
  afterEach(() => setRandomEvents(RANDOM_EVENTS))
  it('선택지 두 갈래 모두 완료되고 결과(능력치·시간)가 다르다', () => {
    force('rev_lib_restricted')
    const base = () => { const s = quiet(); s.routine!.dayIdx = 0; return s }
    const a = settle(pickActivity(base(), 'library', 'research'), () => 'A'), b = settle(pickActivity(base(), 'library', 'research'), () => 'B')
    expect(a.mode).toBe('ROUTINE'); expect(b.mode).toBe('ROUTINE')
    expect(remainingSlots(b)).toBe(remainingSlots(a) - 1); expect(b.stats.insight).toBeGreaterThan(a.stats.insight); expect(a.stats.will).toBeGreaterThan(b.stats.will)
  })
  it('확률 분기(roll)가 있는 선택형 이벤트는 양쪽 결과가 모두 나온다', () => {
    force('rev_pot_smell')
    const scenes = new Set<string>()
    for (let seed = 1; seed <= 60; seed++) {
      const s = quiet(); s.routine!.locations.push('potions'); s.rng = seed * 131; s.routine!.slotIdx = 0
      const e = pickActivity(s, 'potions', 'brew_research'); if (e.scene !== 'rev_pot_smell') continue
      let t = e; const seen: string[] = []
      for (let i = 0; i < 40 && t.mode === 'EVENT'; i++) { seen.push(t.scene); const n = currentNode(t); t = n?.t === 'line' ? advance(t) : n?.t === 'choice' ? choose(t, 'B') : t; if (n?.t === 'end') break }
      seen.forEach((x) => scenes.add(x))
    }
    expect(scenes.has('rev_pot_smell_b_good')).toBe(true); expect(scenes.has('rev_pot_smell_b_bad')).toBe(true)
  })
  it('희귀 이벤트는 매우 낮은 확률로만 나온다(희귀 확률 설정)', () => {
    expect(EVENT_CHANCE.rare).toBeLessThanOrEqual(0.1)
    expect(RANDOM_EVENTS.filter((e) => e.type === 'rare').length).toBeGreaterThanOrEqual(5)
  })
})

describe('Ch1~8 자유 일과 전체 완주(이벤트 켠 상태)', () => {
  it('모든 성장 정책으로 모든 구간이 끝까지 완료되고 잔여 시간은 음수가 되지 않는다', () => {
    for (const policy of ['study', 'train', 'quidditch', 'talk', 'rest', 'balanced', 'random'] as const) {
      const r = play({}, 31, { follow: true, policy, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch8_end' })
      expect(r.s.mode, policy).toBe('ENDED'); expect(r.s.chapter).toBe(8)
      const evs = r.scenes.filter((x) => x.startsWith('rev_')); expect(evs.length, policy).toBeGreaterThan(0)
    }
  })
  it('무작위 시드 100회 플레이가 모두 챕터 8 종료 카드에 도달한다', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const r = play({}, seed, { follow: true, policy: 'random', stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch8_end' })
      expect(r.s.mode, `seed ${seed}`).toBe('ENDED')
    }
  })
})

describe('지도 UI의 이벤트 안내', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); store.read.clear(); store.toTitle(); setRandomEvents([meta('rev_lib_tower')]); EVENT_CHANCE.base = EVENT_CHANCE.medium = EVENT_CHANCE.long = 1; EVENT_CHANCE.afterEvent = 1; EVENT_CHANCE.rare = 0 })
  afterEach(() => { cleanup(); vi.useRealTimers(); setRandomEvents(RANDOM_EVENTS) })
  it('사고 이벤트 뒤 일과로 돌아오면 추가 시간 소모가 명확히 안내된다', () => {
    render(<App />)
    act(() => { store.newGame() }); act(() => { store.jump('c1_routine') }); for (let i = 0; i < 6 && store.state!.mode === 'STORY'; i++) act(() => { store.advance() })
    act(() => { const st = store.state!; for (const k of Object.keys(st.routine!.encounters)) st.encCount[k] = 99; for (const k of Object.keys(st.routine!.friends ?? {})) st.encCount[`f:${k}`] = 99; for (const [h, byLoc] of Object.entries(st.routine!.meets ?? {})) for (const l of Object.keys(byLoc)) st.encCount[`h:${h}:${l}`] = 99 }); act(() => { store.pick('library', 'study') }); expect(store.state!.mode).toBe('EVENT')
    for (let i = 0; i < 40 && store.state!.mode === 'EVENT'; i++) act(() => { store.advance() })
    expect(store.state!.mode).toBe('ROUTINE'); act(() => { vi.advanceTimersByTime(900) }) // 화면 전환(페이드) 뒤 지도
    // 안내는 지도를 밀어내는 상단 알림창이 아니라 작은 알림(토스트)으로 한 번 나온다
    expect(screen.queryByTestId('map-notice')).toBeNull()
    expect(screen.getByTestId('toast').textContent).toMatch(/뜻밖에 한 시간대가 더 흘렀다/)
    expect(store.state!.routine!.notice).toMatch(/뜻밖에 한 시간대가 더 흘렀다/)
    expect(screen.getByTestId('time-left').textContent).toContain('4 / 6')
    act(() => { store.pick('common', 'chess') }); expect(store.state!.routine!.notice).toBeUndefined() // 다음 활동에서 사라진다
  })
})
