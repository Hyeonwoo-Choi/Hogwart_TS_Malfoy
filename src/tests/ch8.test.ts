import { beforeEach, describe, expect, it } from 'vitest'
import { clone, continueChapter, setScenario } from '../engine/core'
import { evalCond } from '../engine/cond'
import { loadFromSlot, saveToSlot } from '../engine/save'
import { CH8_SCENARIO, SCENARIO } from '../data/scenario'
import { EH04_TRUST } from '../data/ch8b'
import { buildCodex } from '../data/codex'
import { checkCompat } from '../cloud/sync'
import { atChoice, play, reachable, visibleKeys } from './helpers'
import type { Policy } from './helpers'
import type { GameState } from '../engine/types'

setScenario(SCENARIO)
beforeEach(() => { localStorage.clear() })

const isEnd8 = (s: GameState) => s.mode === 'ENDED' && s.scene === 'ch8_end'
const toK14 = (plan: Record<string, string> = {}, seed = 1) => play(plan, seed, { follow: true, stopAt: atChoice('K-14') })
const end8 = (plan: Record<string, string> = {}, seed = 1, opts: { policy?: Policy; from?: GameState } = {}) => play(plan, seed, { follow: true, stopAt: isEnd8, ...opts })
/** K-14 시점의 상태를 고쳐 챕터 8 끝까지 이어 간다 */
const fromK14 = (edit: (s: GameState) => void, plan: Record<string, string>, seed = 1) => {
  const s = clone(toK14({}, seed).s); edit(s)
  return play(plan, seed, { follow: true, from: s, stopAt: isEnd8 })
}
/** 편지 장면의 첫 줄 직전 상태를 고쳐 챕터 8 끝까지 이어 간다(편지 도입 대사 포함) */
const fromLetter = (edit: (s: GameState) => void, plan: Record<string, string>, seed = 1) => {
  const s = clone(play({}, seed, { follow: true, stopAt: (x) => x.scene === 'ch8_letter' }).s); edit(s)
  return play(plan, seed, { follow: true, from: s, stopAt: isEnd8 })
}
const text = (r: { lines: string[] }) => r.lines.join('|')

describe('챕터 7 후속: K-12 B/C 선택 기록(저장된 choices로 판별)', () => {
  const intro = (plan: Record<string, string>) => play(plan, 3, { follow: true, stopAt: atChoice('K-13') }).lines.join('|')
  it('B(곁에 앉음)와 C(지나침)는 각자의 도입 반응이 있고 서로의 반응은 나오지 않는다', () => {
    const b = intro({ 'K-12': 'B' }), c = intro({ 'K-12': 'C' }), a = intro({ 'K-12': 'A' })
    expect(b).toContain('가방을 반대편 의자로 옮겼다'); expect(b).not.toContain('방학 동안 아무 일도 없었다는 얼굴')
    expect(c).toContain('방학 동안 아무 일도 없었다는 얼굴'); expect(c).not.toContain('가방을 반대편 의자로 옮겼다')
    expect(a).not.toContain('가방을 반대편 의자로 옮겼다'); expect(a).not.toContain('방학 동안 아무 일도 없었다는 얼굴')
  })
  it('새 플래그 없이 기존 선택 기록만으로 판별한다(예전 저장도 동일)', () => {
    const s = clone(toK14({ 'K-12': 'B' }, 3).s)
    expect(evalCond(s, 'CH_K12_B')).toBe(true); expect(evalCond(s, 'CH_K12_C')).toBe(false); expect(evalCond(s, 'CH_K13_B')).toBe(false)
    expect(Object.keys(s.flags).some((k) => /K12|SAT_BESIDE|PASSED_BY/.test(k))).toBe(false)
    const s2 = clone(s); s2.choices = s2.choices.filter((c) => c.id !== 'K-12')
    expect(evalCond(s2, 'CH_K12_B')).toBe(false) // 기록이 없으면 추정하지 않는다
  })
})

describe('챕터 8 구조·연결', () => {
  it('모든 장면이 도달 가능하고 만남·조연 이벤트는 end로 끝난다', () => {
    const seen = reachable()
    expect(Object.keys(CH8_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    for (const [id, ns] of Object.entries(CH8_SCENARIO)) if (/^(enc|fr)8/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('챕터 7 종료 카드 → 챕터 8 시작(챕터 번호 8), 챕터 8 종료 카드는 다음 챕터가 없다(챕터 9 미구현)', () => {
    const e7 = play({}, 3, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch7_end' }).s
    const n = continueChapter(e7); expect(n.scene).toBe('ch8_open'); expect(n.chapter).toBe(8)
    const e8 = end8({}, 3).s; expect(e8.endTitle).toContain('챕터 8'); expect(continueChapter(e8)).toBe(e8)
  })
})

describe('K-14 · EH-04', () => {
  it('A/B/C/D 모두 챕터 8 끝까지 진행된다', () => {
    for (const k of ['A', 'B', 'C', 'D']) { const r = end8({ 'K-14': k }, 4); expect(r.s.mode, k).toBe('ENDED'); expect(r.s.chapter).toBe(8) }
  })
  it('EH-04: 신뢰 임계값 이상이면 편지를 접지 않고, 미만이면 편지를 태우고 접근을 막는다', () => {
    const hi = fromLetter((s) => { s.emotions.draco.trust = EH04_TRUST + 10 }, { 'K-14': 'A' }, 5)
    const lo = fromLetter((s) => { s.emotions.draco.trust = 0 }, { 'K-14': 'A' }, 5)
    expect(text(hi)).toContain('말이 안 나오네'); expect(text(lo)).toContain('닫는 거야, 포터')
    expect(hi.scenes).toContain('ch8_k14_A_open'); expect(lo.scenes).toContain('ch8_k14_A_closed')
  })
  it('A는 고신뢰에서만 가족 사정(KN_FAMILY_REASON)·곁의 흔적(FLAG_LETTER_SHARED)을 얻고, 저신뢰에서는 아무 지식도 얻지 않는다', () => {
    const clear = (s: GameState) => { delete s.knowledge.KN_FAMILY_REASON; delete s.flags.FLAG_CONFIDED_LUNA }
    const hi = fromK14((s) => { clear(s); s.emotions.draco.trust = 30 }, { 'K-14': 'A' }, 6).s
    const lo = fromK14((s) => { clear(s); s.emotions.draco.trust = 0 }, { 'K-14': 'A' }, 6).s
    expect(hi.knowledge.KN_FAMILY_REASON).toBe(true); expect(hi.flags.FLAG_LETTER_SHARED).toBe(true)
    expect(lo.knowledge.KN_FAMILY_REASON).toBeFalsy(); expect(lo.flags.FLAG_LETTER_SHARED).toBeFalsy()
    expect(lo.emotions.draco.respect).toBeGreaterThan(0)
  })
  it('B/C는 지식을 주지 않고 신뢰·경계에 대가가 남는다. D는 지식을 얻는 대신 신뢰 −15', () => {
    const base = (k: string) => fromK14((s) => { delete s.knowledge.KN_FAMILY_REASON; s.emotions.draco.trust = 20; s.emotions.draco.wariness = 40 }, { 'K-14': k }, 7).s
    const a = base('A'), b = base('B'), c = base('C'), d = base('D')
    expect(b.knowledge.KN_FAMILY_REASON).toBeFalsy(); expect(c.knowledge.KN_FAMILY_REASON).toBeFalsy()
    expect(d.knowledge.KN_FAMILY_REASON).toBe(true); expect(d.flags.FLAG_SNOOPED_LETTER).toBe(true)
    expect(d.emotions.draco.trust).toBeLessThan(a.emotions.draco.trust - 10); expect(c.emotions.draco.trust).toBeLessThan(b.emotions.draco.trust)
    expect(c.emotions.draco.wariness).toBeGreaterThan(b.emotions.draco.wariness)
  })
  it('DE-15: 편지를 못 본 척한 이력(FLAG_DETENTION_KINDNESS)이 있을 때만 인용하고, 신뢰에 따라 어조가 다르다', () => {
    const t = (flag: boolean, trust: number) => text(fromLetter((s) => { s.emotions.draco.trust = trust; if (flag) s.flags.FLAG_DETENTION_KINDNESS = true; else delete s.flags.FLAG_DETENTION_KINDNESS }, { 'K-14': 'B' }, 8))
    expect(t(true, 30)).toContain('못 본 척했지'); expect(t(true, 0)).toContain('두 번째도 허락되는 건 아니야')
    expect(t(false, 30)).not.toContain('못 본 척했지'); expect(t(false, 0)).not.toContain('두 번째도 허락되는 건 아니야')
  })
  it('이미 아는 사실(루나에게 들은 KN_FAMILY_REASON)은 처음 듣는 것처럼 다루지 않는다', () => {
    const t = (known: boolean) => text(fromK14((s) => { s.emotions.draco.trust = 30; if (known) s.knowledge.KN_FAMILY_REASON = true; else delete s.knowledge.KN_FAMILY_REASON }, { 'K-14': 'A' }, 9))
    expect(t(true)).toContain('루나가 말한 "엄마"는 이 편지였다'); expect(t(false)).not.toContain('루나가 말한 "엄마"')
  })
  it('KN_NECKLACE_TARGET(T-04 확인)은 고신뢰 A에서 목걸이 단서가 있을 때만 생기고, 임무·인질·편지의 정체는 공개되지 않는다', () => {
    const run = (trust: number, link: boolean, accused: boolean, k = 'A') => fromK14((s) => { s.emotions.draco.trust = trust; if (link) s.knowledge.KN_NECKLACE_LINK = true; else delete s.knowledge.KN_NECKLACE_LINK; if (accused) s.flags.FLAG_ACCUSED_PUBLIC = true; else delete s.flags.FLAG_ACCUSED_PUBLIC }, { 'K-14': k }, 10)
    expect(run(30, true, false).s.knowledge.KN_NECKLACE_TARGET).toBe(true); expect(run(30, false, true).s.knowledge.KN_NECKLACE_TARGET).toBe(true)
    expect(run(30, false, false).s.knowledge.KN_NECKLACE_TARGET).toBeFalsy(); expect(run(0, true, true).s.knowledge.KN_NECKLACE_TARGET).toBeFalsy(); expect(run(30, true, false, 'D').s.knowledge.KN_NECKLACE_TARGET).toBeFalsy()
    const t = text(run(30, true, true))
    expect(t).not.toMatch(/인질|볼드모트|죽음을 먹는|캐비닛을 고치|통로|임무/)
    expect(buildCodex(run(30, true, false).s).some((e) => e.title === '목걸이가 향한 곳')).toBe(true)
  })
  it('A 고신뢰의 비밀 유지 약속 뒤 가족 편지와 목걸이 직접 진술을 헤르미온느에게 자동 공개하지 않는다', () => {
    const r = fromK14((s) => { s.emotions.draco.trust = 30; s.knowledge.KN_NECKLACE_LINK = true }, { 'K-14': 'A', 'K-15': 'A' }, 18)
    const t = text(r)
    expect(t).toContain('아무에게도 안 해. 약속할게')
    expect(t).toContain('내가 직접 본 건 거기까지야')
    expect(t).toContain('내 것이 아닌 대답이었다')
    expect(t).toContain('목걸이에 대해 들은 말도 삼켰다')
    expect(t).not.toContain('가족에게 온 편지를 가족 말고 읽을 사람은 없잖아')
    expect(t).not.toContain('목걸이가 처음부터 교장 선생님을 향한 거였다면')
  })
  it('D 무단 열람의 지식과 비용은 남지만 ch8_clues에서 비공개 내용을 자동 공유하지 않는다', () => {
    const r = fromK14((s) => { delete s.knowledge.KN_FAMILY_REASON; s.emotions.draco.trust = 20 }, { 'K-14': 'D', 'K-15': 'A' }, 19)
    const t = text(r)
    expect(r.s.flags.FLAG_SNOOPED_LETTER).toBe(true)
    expect(r.s.knowledge.KN_FAMILY_REASON).toBe(true)
    expect(t).toContain('내가 직접 본 건 거기까지야')
    expect(t).not.toContain('가족에게 온 편지를 가족 말고 읽을 사람은 없잖아')
  })
  it('공개 꽃잎과 독립적인 덤블도어 단서는 비밀 직접 진술과 분리해 계속 토론한다', () => {
    const r = fromK14((s) => { delete s.knowledge.KN_FAMILY_REASON; s.knowledge.OB_PRESSED_FLOWER = true; s.knowledge.OB_DUMBLEDORE_HINT = true }, { 'K-14': 'B', 'K-15': 'A' }, 20)
    const t = text(r)
    expect(t).toContain('10월 편지에 국화가 피었다고 쓰여 있었어')
    expect(t).toContain('교장 선생님이 "누구에게 가려던 물건이었냐"고 물으셨어')
    expect(t).toContain('그건 짐작이지만, 설명이 되는 짐작이야')
  })
})

describe('K-15 론', () => {
  it('A/B/C 모두 진행되고 결과가 플래그·감정으로 남는다', () => {
    const a = end8({ 'K-15': 'A' }, 11).s, b = end8({ 'K-15': 'B' }, 11).s, c = end8({ 'K-15': 'C' }, 11).s
    expect(b.flags.FLAG_RON_STRAINED).toBe(true); expect(a.flags.FLAG_RON_STRAINED).toBeFalsy(); expect(c.flags.FLAG_RON_STRAINED).toBeFalsy()
    expect(c.flags.FLAG_CONFIDED_RON).toBe(true); expect(a.flags.FLAG_CONFIDED_RON).toBeFalsy()
    expect(a.emotions.ron.trust).toBeGreaterThan(b.emotions.ron.trust); expect(b.emotions.ron.wariness).toBeGreaterThan(a.emotions.ron.wariness)
  })
  it('론의 슬럼프는 해리의 집착과 별개의 문제로 시작되고(시작 장면), 결과 대사는 선택에 맞는 것만 나온다', () => {
    const a = text(end8({ 'K-15': 'A' }, 12)), b = text(end8({ 'K-15': 'B' }, 12)), c = text(end8({ 'K-15': 'C' }, 12))
    for (const t of [a, b, c]) expect(t).toContain('키퍼 선발이 다음 달이고')
    expect(a).toContain('열 번 던져서 일곱 번 막았어'); expect(b).not.toContain('열 번 던져서 일곱 번 막았어'); expect(c).toContain('아는 것과 끼어드는 건 다른 일이야')
    expect(b).toContain('괜찮은 척이 더 편해서'); expect(a).not.toContain('괜찮은 척이 더 편해서')
  })
})

describe('경로 개연성·형식', () => {
  it('공개 장소의 드레이코는 챕터 8 전체에서 환영 외형이고, 모든 경로에서 고백·애정 표현이 없다', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const r = end8({ 'K-14': 'ABCD'[seed % 4], 'K-15': 'ABC'[seed % 3] }, seed)
      expect(r.views.filter((v) => v.char === 'draco' && /^(ch8|enc8)/.test(v.scene)).every((v) => v.form !== 'true')).toBe(true)
      expect(text(r)).not.toMatch(/좋아해|사랑해|좋아한다고/)
    }
  })
  it('특화·균형·저신뢰·고신뢰·비로맨스(라이벌) 경로 모두 챕터 8 종료 카드까지 도달한다', () => {
    for (const policy of ['study', 'train', 'quidditch', 'talk', 'balanced', 'rest'] as const) {
      const r = end8({ 'K-14': 'ABCD'[policy.length % 4], 'K-15': 'ABC'[policy.length % 3] }, 13, { policy })
      expect(r.s.mode, policy).toBe('ENDED'); expect(r.s.chapter).toBe(8)
    }
    const rival = end8({ 'K-03': 'B', 'S-04': 'B', 'K-10': 'A', 'K-11': 'A', 'K-12': 'C', 'K-13': 'C', 'K-14': 'B', 'K-15': 'B' }, 14).s
    const high = end8({ 'K-03': 'D', 'S-01': 'B', 'S-04': 'A', 'K-10': 'C', 'K-11': 'B', 'K-12': 'B', 'K-13': 'B', 'K-14': 'A', 'K-15': 'C' }, 14).s
    expect(rival.mode).toBe('ENDED'); expect(high.mode).toBe('ENDED')
    expect(high.emotions.draco.trust).toBeGreaterThan(rival.emotions.draco.trust)
    expect(high.flags.FLAG_LETTER_SHARED).toBe(true)
  })
  it('종료 장면의 반응은 K-14 선택에 맞는 것만 나온다', () => {
    const shared = text(fromK14((s) => { s.emotions.draco.trust = 30 }, { 'K-14': 'A' }, 15)), snoop = text(fromK14(() => {}, { 'K-14': 'D' }, 15))
    expect(shared).toContain('짧게 고개를 끄덕였다'); expect(shared).toContain('다음 달에 한 번, 부탁할 일이 생길지도'); expect(snoop).not.toContain('다음 달에 한 번, 부탁할 일')
    expect(snoop).toContain('판시만 한 번 나를 길게 노려보았다'); expect(shared).not.toContain('판시만 한 번 나를 길게 노려보았다')
  })
})

describe('챕터 8 저장·복원·호환', () => {
  it('K-14·K-15 직전, 자유 일과 중간, 종료 카드 저장 복원', () => {
    const a = toK14({}, 16); saveToSlot('slot1', a.s, new Set())
    const fa = loadFromSlot('slot1')!; expect(fa.state.scene).toBe('ch8_letter'); expect(fa.state.chapter).toBe(8); expect(visibleKeys(fa.state)).toEqual(['A', 'B', 'C', 'D'])
    const k15 = play({}, 16, { follow: true, stopAt: atChoice('K-15') }); saveToSlot('slot2', k15.s, new Set())
    expect(visibleKeys(loadFromSlot('slot2')!.state)).toEqual(['A', 'B', 'C'])
    const r = play({}, 16, { follow: true, stopAt: (s) => s.mode === 'ROUTINE' && s.scene === 'ch8_routine' })
    saveToSlot('slot3', r.s, new Set()); expect(loadFromSlot('slot3')!.state.routine).toEqual(r.s.routine)
    const e = end8({}, 16).s; saveToSlot('slot4', e, new Set()); expect(loadFromSlot('slot4')!.state.mode).toBe('ENDED')
  })
  it('챕터 7 종료 카드로 저장된 세이브는 불러온 뒤 챕터 8로 이어지고, 이전 시나리오 버전 행도 열린다', () => {
    const e7 = play({}, 17, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch7_end' }).s
    saveToSlot('slot5', e7, new Set())
    const n = continueChapter(loadFromSlot('slot5')!.state); expect(n.scene).toBe('ch8_open'); expect(n.chapter).toBe(8)
    const e8 = end8({}, 17).s
    const row = (v: string) => ({ user_id: 'u', slot: 'slot1', state: JSON.parse(JSON.stringify(e8)), read_lines: [], label: '', chapter: 8, schema_version: 2, scenario_version: v, revision: 1, created_at: 'x', updated_at: 'x' })
    for (const v of ['ch1-2.v1', 'ch1-4.v1', 'ch1-6.v1', 'ch1-7.v1', 'ch1-8.v1']) expect(checkCompat(row(v)).ok, v).toBe(true)
    expect(checkCompat(row('ch9.v1')).ok).toBe(false)
  })
})
