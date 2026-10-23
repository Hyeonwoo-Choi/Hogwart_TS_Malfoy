import { beforeEach, describe, expect, it } from 'vitest'
import { clone, continueChapter, newState, run, setScenario } from '../engine/core'
import { evalCond } from '../engine/cond'
import { loadFromSlot, saveToSlot } from '../engine/save'
import { CH4_SCENARIO, SCENARIO, START_SCENE } from '../data/scenario'
import { buildCodex } from '../data/codex'
import { atChoice, play, reachable, visibleKeys } from './helpers'

setScenario(SCENARIO)
beforeEach(() => { localStorage.clear() })

const atK08 = (plan: Record<string, string> = {}, seed = 1) => play(plan, seed, { follow: true, stopAt: atChoice('K-08') })
const ch4End = (plan: Record<string, string>, seed = 1) => play(plan, seed, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch4_end' })
const full = (plan: Record<string, string>, seed = 1) => play(plan, seed, { follow: true, stopAt: (s) => s.scene === 'ch5_open' })

describe('챕터 4 구조·연결', () => {
  it('챕터 4의 모든 장면이 도달 가능하고 만남·조연 이벤트는 end로 끝난다', () => {
    const seen = reachable()
    expect(Object.keys(CH4_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    for (const [id, ns] of Object.entries(CH4_SCENARIO)) if (/^(enc|fr)4/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('챕터 4 조건식이 모두 유효하다', () => {
    const s0 = run(newState(START_SCENE))
    for (const ns of Object.values(CH4_SCENARIO)) for (const n of ns) {
      if (n.t === 'line' && n.when) expect(() => evalCond(s0, n.when!)).not.toThrow()
      if (n.t === 'if') expect(() => evalCond(s0, n.cond)).not.toThrow()
    }
  })
  it('챕터 3 종료 카드 → 챕터 4 시작(챕터 번호 4)', () => {
    const r = play({}, 2, { follow: true, stopAt: (s) => s.scene === 'ch4_open' })
    expect(r.s.chapter).toBe(4); expect(r.s.scene).toBe('ch4_open')
  })
})

describe('챕터 4 K-08 / S-04 분기', () => {
  it('K-08의 네 선택지가 모두 노출되거나(A는 조건 없음) 숨은 선택지가 없다', () => {
    const r = atK08({}, 3)
    expect(visibleKeys(r.s)).toEqual(['A', 'B', 'C', 'D'])
  })
  it('K-08 × S-04 모든 조합(4×3)이 챕터 4 종료 카드까지 도달한다', () => {
    for (const k of ['A', 'B', 'C', 'D']) for (const q of ['A', 'B', 'C']) {
      const r = full({ 'K-08': k, 'S-04': q }, 5)
      expect(r.s.scene, `${k}${q}`).toBe('ch5_open'); expect(r.s.chapter).toBe(5)
      expect(r.scenes).toContain(`ch4_s04_${q}`)
    }
  })
  it('K-08 B/C는 지식과 플래그를 남기고, D는 아무것도 확인하지 않는다', () => {
    const b = full({ 'K-08': 'B' }, 5).s; expect(b.knowledge.KN_ROOM).toBe(true); expect(b.flags.FLAG_HERMIONE_DEMAND).toBe(true)
    const c = full({ 'K-08': 'C' }, 5).s; expect(c.knowledge.KN_ROOM).toBe(true); expect(c.knowledge.KN_FAMILY_REASON).toBe(true)
    const d = full({ 'K-08': 'D' }, 5).s; expect(d.knowledge.KN_ROOM).toBeFalsy(); expect(d.knowledge.KN_CABINET).toBeFalsy()
  })
  it('K-08 A는 성공(KN_CABINET + CG)과 실패(경계심 상승) 양쪽이 모두 도달 가능하다', () => {
    let ok = 0; let fail = 0
    for (let seed = 1; seed <= 60; seed++) {
      const r = play({ 'K-08': 'A', 'K-04': 'B' }, seed, { follow: true, policy: seed % 2 ? 'study' : 'train' })
      if (r.scenes.includes('ch4_A_ok')) { ok++; expect(r.s.knowledge.KN_CABINET).toBe(true); expect(r.cgs).toContain('cg_cabinet_apple') }
      if (r.scenes.includes('ch4_A_fail')) { fail++; expect(r.s.knowledge.KN_CABINET).toBeFalsy() }
    }
    expect(ok).toBeGreaterThan(0); expect(fail).toBeGreaterThan(0)
  })
  it('S-04 결과: A=신뢰↑ 플래그, B=신뢰↓ 플래그, C=되묻기 플래그', () => {
    const a = full({ 'K-08': 'D', 'S-04': 'A' }, 5).s; expect(a.flags.FLAG_TOLD_DRACO_TRUTH).toBe(true)
    const b = full({ 'K-08': 'D', 'S-04': 'B' }, 5).s; expect(b.flags.FLAG_LIED_TO_DRACO).toBe(true)
    const c = full({ 'K-08': 'D', 'S-04': 'C' }, 5).s; expect(c.flags.FLAG_ASKED_DRACO_BACK).toBe(true)
    expect(a.emotions.draco.trust).toBeGreaterThan(b.emotions.draco.trust)
  })
  it('챕터 4 종료 카드는 챕터 5 시작으로 이어진다', () => {
    const e = ch4End({ 'K-08': 'D' }, 5).s
    expect(e.mode).toBe('ENDED'); expect(e.endTitle).toContain('챕터 4')
    const n = continueChapter(e); expect(n.scene).toBe('ch5_open'); expect(n.chapter).toBe(5)
  })
  it('도감에 방·캐비닛 지식과 선택 이력이 기록된다', () => {
    const r = full({ 'K-08': 'B', 'S-04': 'A' }, 5).s
    const titles = buildCodex(r).map((e) => e.title)
    expect(titles).toContain('벽 너머의 방')
  })
})

describe('챕터 4 저장·복원', () => {
  it('K-08 직전 저장 → 복원 후에도 같은 선택지로 진행되고, S-04 이후 상태가 일치한다', () => {
    const r = atK08({}, 8)
    saveToSlot('slot1', r.s, new Set())
    const f = loadFromSlot('slot1')!
    expect(f.state.scene).toBe('ch4_wall'); expect(f.state.chapter).toBe(4)
    expect(visibleKeys(f.state)).toEqual(visibleKeys(r.s))
    const a = ch4End({ 'K-08': 'C', 'S-04': 'C' }, 8)
    expect(a.s.mode).toBe('ENDED')
  })
  it('종료 카드(챕터 4) 상태의 저장도 복원된다', () => {
    const e = ch4End({ 'K-08': 'D' }, 4).s
    saveToSlot('slot3', e, new Set())
    const f = loadFromSlot('slot3')!
    expect(f.state.mode).toBe('ENDED'); expect(f.state.endTitle).toBe(e.endTitle)
    expect(clone(f.state).flags).toEqual(e.flags)
  })
  it('자유 일과(ROUTINE) 도중 저장해도 복원된다', () => {
    const r = play({}, 6, { follow: true, stopAt: (s) => s.mode === 'ROUTINE' && s.scene === 'ch4_routine' })
    expect(r.s.mode).toBe('ROUTINE')
    saveToSlot('slot4', r.s, new Set())
    const f = loadFromSlot('slot4')!
    expect(f.state.mode).toBe('ROUTINE'); expect(f.state.routine).toEqual(r.s.routine)
  })
})
