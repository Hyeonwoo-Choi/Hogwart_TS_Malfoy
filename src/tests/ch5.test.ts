import { beforeEach, describe, expect, it } from 'vitest'
import { choose, clone, continueChapter, currentNode, setScenario, visibleOptions } from '../engine/core'
import { loadFromSlot, saveToSlot } from '../engine/save'
import { CH5_SCENARIO, SCENARIO } from '../data/scenario'
import { EH02_GUILT } from '../data/ch5b'
import { buildCodex } from '../data/codex'
import { checkCompat } from '../cloud/sync'
import { atChoice, play, reachable, visibleKeys } from './helpers'
import type { ChoiceNode, GameState } from '../engine/types'

setScenario(SCENARIO)
beforeEach(() => { localStorage.clear() })

const toK09 = (plan: Record<string, string> = {}, seed = 1) => play(plan, seed, { follow: true, stopAt: atChoice('K-09') })
const toCh6 = (plan: Record<string, string>, seed = 1, from?: GameState) => play(plan, seed, { follow: true, from, stopAt: (s) => s.scene === 'ch6_open' })
/** K-09 시점에서 마법 실력만 바꿔 병동 앞(EH-02 직전)까지 이어 간다 */
const withMagic = (m: number, plan: Record<string, string>, seed = 1) => {
  const s = clone(toK09({}, seed).s); s.stats.magic = m
  return play(plan, seed, { follow: true, from: s, stopAt: (x) => x.scene === 'ch5_ward' })
}
const toK10From = (s: GameState, plan: Record<string, string>, seed = 1) => play(plan, seed, { follow: true, from: s, stopAt: atChoice('K-10') })

describe('챕터 5 구조·연결', () => {
  it('모든 장면이 도달 가능하고 만남·조연 이벤트는 end로 끝난다', () => {
    const seen = reachable()
    expect(Object.keys(CH5_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    for (const [id, ns] of Object.entries(CH5_SCENARIO)) if (/^(enc|fr)5/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('챕터 4 종료 카드 → 챕터 5, 챕터 5 종료 카드 → 챕터 6', () => {
    const e4 = play({}, 3, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch4_end' }).s
    const n = continueChapter(e4); expect(n.scene).toBe('ch5_open'); expect(n.chapter).toBe(5)
    const e5 = play({}, 3, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch5_end' }).s
    expect(e5.endTitle).toContain('챕터 5')
    const m = continueChapter(e5); expect(m.scene).toBe('ch6_open'); expect(m.chapter).toBe(6)
  })
})

describe('K-09 시간제한', () => {
  it('타이머가 켜져 있으면 "망설임"은 숨겨지고 시간 초과 키(T)가 실제 선택지로 존재한다', () => {
    const s = toK09({}, 2).s; const n = currentNode(s) as ChoiceNode
    expect(n.timed?.timeoutKey).toBe('T'); expect(n.options.some((o) => o.key === 'T' && o.hesitate)).toBe(true)
    expect(visibleOptions(s, n, true).map((o) => o.key)).toEqual(['A', 'B'])
    expect(visibleOptions(s, n, false).map((o) => o.key)).toEqual(['A', 'B', 'T']) // 완화·해제 모드의 "망설임"은 명시 선택지
  })
  it('마법 판정: 충분하면 피해 가벼움(MILD), 부족하면 중간(MID). 선택지 문구에 수치가 없다', () => {
    const hi = withMagic(90, { 'K-09': 'A' }).s; expect(hi.flags.FLAG_KATIE_MILD).toBe(true); expect(hi.flags.FLAG_KATIE_MID).toBeFalsy()
    const lo = withMagic(5, { 'K-09': 'A' }).s; expect(lo.flags.FLAG_KATIE_MID).toBe(true); expect(lo.flags.FLAG_KATIE_MILD).toBeFalsy()
    const n = currentNode(toK09({}, 2).s) as ChoiceNode
    for (const o of n.options) expect(/\d/.test(o.text)).toBe(false)
  })
  it('B는 중간, 시간 초과(T)는 가장 큰 피해와 해리의 죄책감 플래그를 남긴다', () => {
    const b = withMagic(30, { 'K-09': 'B' }).s; expect(b.flags.FLAG_KATIE_MID).toBe(true)
    const timeout = choose(clone(toK09({}, 4).s), 'T')
    const t = play({}, 4, { follow: true, from: timeout, stopAt: (x) => x.scene === 'ch5_ward' }).s
    expect(t.flags.FLAG_KATIE_SEVERE).toBe(true); expect(t.flags.FLAG_HARRY_GUILT).toBe(true)
  })
  it('죄책감은 피해에 비례하고, EH-02 양쪽(냉담/얼어붙음)이 도달한다', () => {
    const mild = withMagic(90, { 'K-09': 'A' }).s; const mid = withMagic(5, { 'K-09': 'B' }).s
    expect(mild.emotions.draco.guilt).toBeLessThan(EH02_GUILT); expect(mid.emotions.draco.guilt).toBeGreaterThanOrEqual(EH02_GUILT)
    const a = clone(toK09({}, 6).s); a.stats.magic = 90
    const r1 = toK10From(a, { 'K-09': 'A' }, 6)
    expect(r1.s.flags.FLAG_DRACO_SNEER).toBe(true); expect(r1.s.flags.FLAG_DRACO_FROZE).toBeFalsy()
    const r2 = toK10From(clone(toK09({}, 6).s), { 'K-09': 'B' }, 6)
    expect(r2.s.flags.FLAG_DRACO_FROZE).toBe(true); expect(r2.s.flags.FLAG_DRACO_SNEER).toBeFalsy()
  })
})

describe('K-10 대응과 정보 수준', () => {
  const k10 = (k: string, seed = 7) => toCh6({ 'K-10': k }, seed)
  it('네 선택지 모두 챕터 5 끝 → 챕터 6으로 이어진다', () => {
    for (const k of ['A', 'B', 'C', 'D']) { const r = k10(k); expect(r.s.scene, k).toBe('ch6_open'); expect(r.s.chapter).toBe(6); expect(r.scenes).toContain(`ch5_k10_${k}`) }
  })
  it('결과: A 공개 고발(신뢰↓), B 교장 보고(힌트), C 사적 대면·단서, D 단서 확보', () => {
    const a = k10('A').s, b = k10('B').s, c = k10('C').s, d = k10('D').s
    expect(a.flags.FLAG_ACCUSED_PUBLIC).toBe(true); expect(a.knowledge.KN_NECKLACE_LINK).toBeFalsy()
    expect(b.flags.FLAG_TOLD_DUMBLEDORE).toBe(true); expect(b.knowledge.OB_DUMBLEDORE_HINT).toBe(true)
    expect(c.flags.FLAG_CONFRONTED_PRIVATE).toBe(true); expect(c.knowledge.KN_NECKLACE_LINK).toBe(true)
    expect(d.knowledge.KN_NECKLACE_LINK).toBe(true)
    expect(a.emotions.draco.trust).toBeLessThan(c.emotions.draco.trust)
  })
  it('포장지 문양(F-10)은 모든 경로에서 관찰로 남고 도감에 "증거"가 아니라고 기록된다', () => {
    const s = k10('D').s; expect(s.knowledge.OB_WRAPPER).toBe(true)
    expect(buildCodex(s).find((e) => e.title === '찢어진 포장지')?.text).toContain('증거')
  })
  it('해리의 정보 수준에 따라 의심/확신 서술이 달라진다(캐비닛을 본 경우와 못 본 경우)', () => {
    const lines = (plan: Record<string, string>) => play(plan, 3, { follow: true, stopAt: atChoice('K-10') }).lines.join('|')
    const know = lines({ 'K-08': 'A', 'K-04': 'D' }); const none = lines({ 'K-08': 'D' })
    expect(know).toContain('이름을 불렀다'); expect(none).toContain('의심할 사람이었다'); expect(know).not.toContain('의심할 사람이었다')
  })
  it('시간 초과 경험(죄책감)이 있으면 해리의 문장이 달라진다', () => {
    const t = choose(clone(toK09({}, 8).s), 'T')
    expect(play({}, 8, { follow: true, from: t, stopAt: atChoice('K-10') }).lines.join('|')).toContain('공정하다는 말이 이토록')
  })
})

describe('챕터 5 저장·복원·호환', () => {
  it('K-09(시간제한) 직전 저장 → 복원 후에도 같은 선택지로 이어진다', () => {
    const r = toK09({}, 9); saveToSlot('slot1', r.s, new Set())
    const f = loadFromSlot('slot1')!; expect(f.state.scene).toBe('ch5_katie'); expect(f.state.chapter).toBe(5)
    expect(visibleKeys(f.state)).toEqual(visibleKeys(r.s))
    expect(toK10From(f.state, { 'K-09': 'B' }, 9).s.flags.FLAG_KATIE_MID).toBe(true)
  })
  it('K-10 직전·챕터 5 종료 카드 저장 복원, 클라우드 호환', () => {
    const r = play({}, 9, { follow: true, stopAt: atChoice('K-10') }); saveToSlot('slot2', r.s, new Set())
    expect(loadFromSlot('slot2')!.state.scene).toBe('ch5_k10')
    const e = play({}, 9, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch5_end' }).s
    saveToSlot('slot3', e, new Set()); expect(loadFromSlot('slot3')!.state.mode).toBe('ENDED')
    const row = (v: string) => ({ user_id: 'u', slot: 'slot1', state: JSON.parse(JSON.stringify(e)), read_lines: [], label: '', chapter: 5, schema_version: 2, scenario_version: v, revision: 1, created_at: 'x', updated_at: 'x' })
    expect(checkCompat(row('ch1-6.v1')).ok).toBe(true); expect(checkCompat(row('ch1-4.v1')).ok).toBe(true); expect(checkCompat(row('ch0.v0')).ok).toBe(false)
  })
  it('공개 장소의 드레이코는 챕터 5 전체에서 환영(illusion) 외형이다', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const r = play({ 'K-10': 'ABCD'[seed % 4] }, seed, { follow: true, stopAt: (s) => s.scene === 'ch6_open' })
      expect(r.views.filter((v) => v.char === 'draco' && v.scene.startsWith('ch5')).every((v) => v.form !== 'true')).toBe(true)
    }
  })
})
