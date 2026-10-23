import { beforeEach, describe, expect, it } from 'vitest'
import { clone, continueChapter, setScenario } from '../engine/core'
import { loadFromSlot, saveToSlot } from '../engine/save'
import { CH6_SCENARIO, SCENARIO } from '../data/scenario'
import { EH03_RESPECT } from '../data/ch6b'
import { buildCodex } from '../data/codex'
import { atChoice, play, reachable, visibleKeys } from './helpers'
import type { Policy } from './helpers'
import type { GameState } from '../engine/types'

setScenario(SCENARIO)
beforeEach(() => { localStorage.clear() })

const toK11 = (plan: Record<string, string> = {}, seed = 1) => play(plan, seed, { follow: true, stopAt: atChoice('K-11') })
const toK12 = (plan: Record<string, string> = {}, seed = 1) => play(plan, seed, { follow: true, stopAt: atChoice('K-12') })
const end6 = (plan: Record<string, string>, seed = 1, opts: { policy?: Policy; from?: GameState } = {}) => play(plan, seed, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch6_end', ...opts })
/** K-11 시점의 상태를 고쳐서 이어 간다 */
const fromK11 = (edit: (s: GameState) => void, plan: Record<string, string>, seed = 1) => {
  const s = clone(toK11({}, seed).s); edit(s)
  return play(plan, seed, { follow: true, from: s, stopAt: (x) => x.scene === 'ch6_scar' })
}

describe('챕터 6 구조·연결', () => {
  it('모든 장면이 도달 가능하고 만남·조연 이벤트는 end로 끝난다', () => {
    const seen = reachable()
    expect(Object.keys(CH6_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    for (const [id, ns] of Object.entries(CH6_SCENARIO)) if (/^(enc|fr)6/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('챕터 6 종료 카드는 챕터 7로 이어진다', () => {
    const e = end6({ 'K-12': 'B' }, 2).s
    expect(e.mode).toBe('ENDED'); expect(e.endTitle).toContain('챕터 6'); expect(e.chapter).toBe(6)
    const n = continueChapter(e); expect(n.scene).toBe('ch7_open'); expect(n.chapter).toBe(7)
  })
})

describe('K-11 표식 확인', () => {
  it('모든 방법이 KN_NO_MARK를 남기고, 강제 확인만 FLAG_FORCED_MARK_CHECK를 남긴다', () => {
    const a = fromK11((s) => { s.stats.insight = 99 }, { 'K-11': 'A' }).s
    const b = fromK11((s) => { s.stats.insight = 99 }, { 'K-11': 'B' }).s
    const c = fromK11((s) => { s.stats.insight = 99 }, { 'K-11': 'C' }).s
    for (const s of [a, b, c]) expect(s.knowledge.KN_NO_MARK).toBe(true)
    expect(a.flags.FLAG_FORCED_MARK_CHECK).toBe(true); expect(b.flags.FLAG_FORCED_MARK_CHECK).toBeFalsy(); expect(c.flags.FLAG_FORCED_MARK_CHECK).toBeFalsy()
  })
  it('통찰 판정: C는 통찰이 부족하면 선택지 자체가 숨겨지고 충분하면 나타난다', () => {
    const lo = clone(toK11({}, 3).s); lo.stats.insight = 5
    expect(visibleKeys(lo)).toEqual(['A', 'B'])
    const hi = clone(toK11({}, 3).s); hi.stats.insight = 90
    expect(visibleKeys(hi)).toEqual(['A', 'B', 'C'])
  })
  it('방법별 자율성·신뢰 차이: B > C > A', () => {
    const run = (k: string) => fromK11((s) => { s.stats.insight = 99 }, { 'K-11': k }, 4).s.emotions.draco
    const a = run('A'), b = run('B'), c = run('C')
    expect(b.autonomy).toBeGreaterThan(c.autonomy); expect(c.autonomy).toBeGreaterThan(a.autonomy)
    expect(b.trust).toBeGreaterThan(a.trust)
  })
  it('B는 약속(SCAR_SECRET)과 CG를 남기고, A는 약속 없이 분노 반응으로 간다', () => {
    const b = fromK11(() => {}, { 'K-11': 'B' }); expect(b.s.promises).toContain('SCAR_SECRET'); expect(b.cgs).toContain('cg_scar_sleeve')
    const a = fromK11(() => {}, { 'K-11': 'A' }); expect(a.s.promises).not.toContain('SCAR_SECRET'); expect(a.scenes).toContain('ch6_eh03_anger')
  })
  it('T-01: 표식은 없고 흉터라는 서술만 있고, 흉터의 원인은 공개하지 않는다(Ch8 이월)', () => {
    const r = fromK11(() => {}, { 'K-11': 'B' }); const text = r.lines.join('|')
    expect(text).toContain('표식은 없었다'); expect(text).toContain('흉터')
    expect(text).not.toMatch(/어둠의 군주|볼드모트|나르시사의 명령|어머니의 부탁/)
    expect(buildCodex(r.s).find((e) => e.title === '소매 아래')?.text).toContain('표식이 없었다')
  })
  it('진짜 외형(form: true)은 표식 확인 장면에서만 나타난다', () => {
    for (const [i, k] of ['A', 'B', 'C'].entries()) {
      const r = fromK11((s) => { s.stats.insight = 99 }, { 'K-11': k }, 5 + i)
      const bad = r.views.filter((v) => v.char === 'draco' && v.form === 'true' && !v.scene.startsWith('ch6_mark'))
      expect(bad).toEqual([])
      expect(r.views.some((v) => v.char === 'draco' && v.form === 'true' && v.scene.startsWith('ch6_mark'))).toBe(true)
    }
  })
})

describe('EH-03 · DE-07 · DE-16', () => {
  it('존경이 충분하고 강제하지 않았으면 차분한 반응(calm), 부족하면 분노 반응', () => {
    const hi = fromK11((s) => { s.emotions.draco.respect = EH03_RESPECT + 5 }, { 'K-11': 'B' }, 6)
    const lo = fromK11((s) => { s.emotions.draco.respect = EH03_RESPECT - 10 }, { 'K-11': 'B' }, 6)
    expect(hi.scenes).toContain('ch6_eh03_calm'); expect(lo.scenes).toContain('ch6_eh03_anger')
    expect(hi.s.emotions.draco.respect).toBeGreaterThan(lo.s.emotions.draco.respect)
  })
  it('강제 확인은 존경이 높아도 항상 분노 반응(EH-03 ¬조건)', () => {
    const r = fromK11((s) => { s.emotions.draco.respect = 99 }, { 'K-11': 'A' }, 6)
    expect(r.scenes).toContain('ch6_eh03_anger'); expect(r.scenes).not.toContain('ch6_eh03_calm')
  })
  it('DE-16: 사적 대면 이력이 있으면 분노 반응의 문장이 달라지고 "교사에게 말하지 않았군"이 언급된다', () => {
    const base = (flag: boolean) => fromK11((s) => { s.emotions.draco.respect = 0; if (flag) s.flags.FLAG_CONFRONTED_PRIVATE = true; else delete s.flags.FLAG_CONFRONTED_PRIVATE }, { 'K-11': 'B' }, 7).lines.join('|')
    expect(base(true)).toContain('교사에게 말하지 않았군'); expect(base(false)).not.toContain('교사에게 말하지 않았군')
    expect(base(true)).toContain('스스로 그 불꽃을 누르고'); expect(base(false)).toContain('푸른 불꽃이 튀었다가')
  })
  it('DE-07: 공개 고발 이력이 있으면 스네이프의 감시 플래그가 서고 강제 확인 때 스네이프가 개입한다', () => {
    const r = play({ 'K-10': 'A', 'K-11': 'A' }, 7, { follow: true, stopAt: (s) => s.scene === 'ch6_scar' })
    expect(r.s.flags.FLAG_ACCUSED_PUBLIC).toBe(true); expect(r.s.flags.FLAG_SNAPE_WATCH).toBe(true); expect(r.scenes).toContain('ch6_mark_A_snape')
    const q = play({ 'K-10': 'D', 'K-11': 'A' }, 7, { follow: true, stopAt: (s) => s.scene === 'ch6_scar' })
    expect(q.s.flags.FLAG_SNAPE_WATCH).toBeFalsy(); expect(q.scenes).not.toContain('ch6_mark_A_snape')
  })
  it('F-11: 편지 소각 흔적은 모든 경로에서 남지만 내용은 공개되지 않는다', () => {
    const r = toK11({}, 8)
    expect(r.s.knowledge.OB_BURNED_LETTER).toBe(true)
    const t = r.lines.filter((l) => /재|편지/.test(l)).join('|'); expect(t).toContain('글씨는 하나도 읽을 수 없었다')
  })
})

describe('K-12 크리스마스와 종료', () => {
  it('세 선택지가 모두 챕터 6 종료 카드로 이어지고 결과가 상태에 남는다', () => {
    const a = end6({ 'K-12': 'A' }, 3).s, b = end6({ 'K-12': 'B' }, 3).s, c = end6({ 'K-12': 'C' }, 3).s
    for (const s of [a, b, c]) { expect(s.mode).toBe('ENDED'); expect(s.endTitle).toContain('챕터 6') }
    expect(a.flags.FLAG_GIFT_GIVEN).toBe(true); expect(b.flags.FLAG_GIFT_GIVEN).toBeFalsy(); expect(c.flags.FLAG_GIFT_GIVEN).toBeFalsy()
    expect(b.emotions.draco.respect).toBeGreaterThan(c.emotions.draco.respect)
    expect(a.emotions.draco.trust).toBeGreaterThan(c.emotions.draco.trust)
    expect(end6({ 'K-12': 'B' }, 3).cgs).toContain('cg_xmas_hearth')
  })
})

describe('성장 경로·신뢰 경로 전체 플레이 (챕터 1~6)', () => {
  it('특화형(공부·마법·퀴디치·대화)과 균형형 모두 챕터 6 종료 카드까지 도달한다', () => {
    for (const policy of ['study', 'train', 'quidditch', 'talk', 'balanced', 'rest'] as const) {
      const r = end6({ 'K-12': 'B' }, 11, { policy })
      expect(r.s.mode, policy).toBe('ENDED'); expect(r.s.chapter).toBe(6)
    }
  })
  it('저신뢰(공개 고발·거짓말)와 고신뢰(사적 도움·사실대로) 경로가 EH 분기와 K-11 선택지 구성을 달리 만든다', () => {
    const low = play({ 'K-03': 'B', 'K-04': 'C', 'S-04': 'B', 'K-10': 'A', 'K-11': 'A' }, 12, { follow: true })
    const high = play({ 'K-03': 'D', 'S-01': 'B', 'S-04': 'A', 'K-10': 'C', 'K-11': 'B' }, 12, { follow: true })
    expect(low.s.mode).toBe('ENDED'); expect(high.s.mode).toBe('ENDED')
    expect(high.s.emotions.draco.trust).toBeGreaterThan(low.s.emotions.draco.trust)
    expect(low.scenes).toContain('ch6_eh03_anger'); expect(high.scenes).toContain('ch6_mark_B')
  })
})

describe('챕터 6 저장·복원', () => {
  it('K-11·K-12 직전과 종료 카드 저장 → 복원', () => {
    const a = toK11({}, 9); saveToSlot('slot1', a.s, new Set())
    const fa = loadFromSlot('slot1')!; expect(fa.state.scene).toBe('ch6_mark'); expect(fa.state.chapter).toBe(6); expect(visibleKeys(fa.state)).toEqual(visibleKeys(a.s))
    const b = toK12({}, 9); saveToSlot('slot2', b.s, new Set())
    const fb = loadFromSlot('slot2')!; expect(fb.state.scene).toBe('ch6_xmas'); expect(fb.state.flags).toEqual(b.s.flags)
    const e = end6({ 'K-12': 'A' }, 9).s; saveToSlot('slot3', e, new Set())
    const fe = loadFromSlot('slot3')!; expect(fe.state.mode).toBe('ENDED'); expect(fe.state.endTitle).toBe(e.endTitle)
  })
  it('자유 일과 도중 저장(챕터 6)도 복원된다', () => {
    const r = play({}, 6, { follow: true, stopAt: (s) => s.mode === 'ROUTINE' && s.scene === 'ch6_routine' })
    expect(r.s.mode).toBe('ROUTINE'); saveToSlot('slot4', r.s, new Set())
    const f = loadFromSlot('slot4')!; expect(f.state.routine).toEqual(r.s.routine)
  })
})
