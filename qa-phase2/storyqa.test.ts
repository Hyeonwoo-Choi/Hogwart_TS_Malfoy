import { describe, expect, it } from 'vitest'
import { newState } from '../src/engine/core'
import type { Scenario } from '../src/engine/types'
import { inspectCondition, blindHints } from './checks'
import { simulate } from './simulate'
import { inventory, summarize } from './report'

const fixture: Scenario = {
  start: [ { t: 'line', text: '문 앞이다.' }, { t: 'choice', id: 'T-01', options: [
    { key: 'A', text: '두드린다.', fx: ['flag:FLAG_TEST', 'stat.int+2'], goto: 'automatic' },
    { key: 'B', text: '기다린다.', goto: 'other' },
  ] } ],
  automatic: [{ t: 'if', cond: 'FLAG_TEST', then: 'done', else: 'other' }],
  done: [{ t: 'endChapter', title: 'Done' }],
  other: [{ t: 'endChapter', title: 'Other' }],
}
const opts = { profile: 'research' as const, seed: 11, chapter: 1, scenario: fixture, start: 'start', events: false }

describe('story QA infrastructure', () => {
  it('uses actual effects once and records automatic-only scenes', () => {
    const s = newState('start', 11); s.scene = 'start'; s.idx = 1
    const run = simulate({ ...opts, initialState: s, replay: [{ kind: 'choice', scene: 'start', idx: 1, key: 'A' }] })
    expect(run.completed).toBe(true)
    expect(run.final.flags.FLAG_TEST).toBe(true)
    expect(run.final.stats.int).toBe(12)
    expect(run.final.choices).toHaveLength(1)
    expect(run.scenes).toContain('automatic')
    expect(run.decisions[0].before.stats.int).toBe(10)
    expect(run.decisions[0].after.stats.int).toBe(12)
  })
  it('does not let forced coverage inflate natural coverage', () => {
    const s = newState('other'); const forced = simulate({ ...opts, initialState: s })
    const r = summarize([forced], { scenario: fixture, start: 'start', chapter: 1 })
    expect(r.plays).toBe(0); expect(r.forcedProbes).toBe(1)
    expect(r.sceneVisits.other).toBe(0); expect(r.forcedScenes.other).toBe(1)
    expect(r.unvisited.find(x => x.target === 'other')?.verdict).toContain('불가능 판정 아님')
  })
  it('inspects unmet predicates without changing RNG or state', () => {
    const s = newState('start'); const before = JSON.stringify(s)
    expect(inspectCondition(s, 'stat.int>=99 && FLAG_TEST').result).toBe(false)
    expect(inspectCondition(s, 'stat.int>=99').values['stat.int']).toBe(10)
    expect(inspectCondition(s, 'roll(50)').result).toBeUndefined()
    expect(JSON.stringify(s)).toBe(before)
  })
  it('reports no legal options and step exhaustion as failures', () => {
    const locked: Scenario = { start: [{ t: 'choice', id: 'T-02', options: [{ key: 'A', text: '잠김', if: 'stat.int>=99', goto: 'done' }] }], done: fixture.done }
    expect(simulate({ ...opts, scenario: locked }).failure).toContain('노출 선택지 없음')
    expect(simulate({ ...opts, maxSteps: 1 }).failure).toContain('최대 진행 횟수')
  })
  it('keeps structural candidates distinct from observed coverage', () => {
    expect([...inventory(fixture, 'start', 1)].sort()).toEqual(['automatic', 'done', 'other', 'start'])
    const r = summarize([simulate(opts)], { scenario: fixture, start: 'start', chapter: 1 })
    expect(r.completed).toBe(1)
    expect(r.unvisitedChoices.length).toBe(1)
  })
  it('rejects stale replay actions and preserves input probe states', () => {
    const s = newState('start'); const original = JSON.stringify(s)
    const r = simulate({ ...opts, initialState: s, replay: [{ kind: 'choice', scene: 'wrong', idx: 1, key: 'A' }] })
    expect(r.failure).toContain('재현 경로 불일치')
    expect(JSON.stringify(s)).toBe(original)
  })
  it('does not flag already introduced names as automatic leaks', () => {
    expect(blindHints('지니가 손을 내민다.', ['지니를 따라간다.'], [], 'test')).toHaveLength(0)
    expect(blindHints('발신인 없는 편지.', ['판시 루트로 간다.'], [], 'test')[0].level).toBe('suspect')
  })
  it('reports an effect crossing a later predicate as a review candidate', () => {
    const sc: Scenario = { start: [{ t: 'choice', id: 'T-03', options: [{ key: 'A', text: '계속', fx: ['hermione.trust+2'], goto: 'gate' }] }],
      gate: [{ t: 'if', cond: 'hermione.trust>=52', then: 'done', else: 'other' }], done: fixture.done, other: fixture.other }
    const r = simulate({ ...opts, scenario: sc })
    expect(r.findings.find(f => f.code === 'CHOICE_EFFECT_THRESHOLD')?.level).toBe('suspect')
  })
  it('keeps an injected routine cursor instead of restarting its routine node', () => {
    const sc: Scenario = { start: [{ t: 'routine', days: [{ date: '09-04', weekday: '수' }], night: false,
      then: 'done', locations: ['common'], encounters: {} }], done: fixture.done }
    const s = newState('start'); s.mode = 'ROUTINE'; s.calendar = { date: '09-04', weekday: '수', slot: '저녁' }
    s.routine = { days: [{ date: '09-04', weekday: '수' }], dayIdx: 0, slotIdx: 2, night: false, then: 'done', locations: ['common'], encounters: {}, pendingDone: false, message: null }
    const r = simulate({ ...opts, scenario: sc, initialState: s })
    expect(r.provenance).toBe('forced'); expect(r.completed).toBe(true)
    expect(r.decisions.filter(d => d.action.kind === 'activity')).toHaveLength(1)
  })
  it('is deterministic and replays a natural Ch1–Ch2 run with the same endpoint', () => {
    const a = simulate({ profile: 'research', seed: 2 })
    const b = simulate({ profile: 'research', seed: 2 })
    expect(a.completed).toBe(true); expect(a).toEqual(b)
    const replay = simulate({ profile: 'research', seed: 2, replay: a.decisions.map(d => d.action) })
    expect(replay.failure).toBeUndefined(); expect(replay.final).toEqual(a.final)
    expect(replay.scenes).toEqual(a.scenes)
  })
})
