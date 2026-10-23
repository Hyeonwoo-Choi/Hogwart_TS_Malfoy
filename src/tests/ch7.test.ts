import { beforeEach, describe, expect, it } from 'vitest'
import { clone, continueChapter, setScenario } from '../engine/core'
import { loadFromSlot, saveToSlot } from '../engine/save'
import { CH7_SCENARIO, SCENARIO } from '../data/scenario'
import { DE08_SOCIAL } from '../data/ch7b'
import { buildCodex } from '../data/codex'
import { checkCompat } from '../cloud/sync'
import { atChoice, play, reachable, visibleKeys } from './helpers'
import type { Policy } from './helpers'
import type { GameState } from '../engine/types'

setScenario(SCENARIO)
beforeEach(() => { localStorage.clear() })

const toK13 = (plan: Record<string, string> = {}, seed = 1) => play(plan, seed, { follow: true, stopAt: atChoice('K-13') })
const end7 = (plan: Record<string, string> = {}, seed = 1, opts: { policy?: Policy; from?: GameState } = {}) => play(plan, seed, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch7_end', ...opts })
/** K-13 시점의 상태를 고쳐 끝까지 이어 간다 */
const fromK13 = (edit: (s: GameState) => void, plan: Record<string, string>, seed = 1) => {
  const s = clone(toK13({}, seed).s); edit(s)
  return play(plan, seed, { follow: true, from: s, stopAt: (x) => x.mode === 'ENDED' && x.scene === 'ch7_end' })
}

describe('챕터 7 구조·연결', () => {
  it('모든 장면이 도달 가능하고 만남·조연 이벤트는 end로 끝난다', () => {
    const seen = reachable()
    expect(Object.keys(CH7_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    for (const [id, ns] of Object.entries(CH7_SCENARIO)) if (/^(enc|fr)7/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('챕터 6 종료 카드 → 챕터 7 시작(챕터 번호 7), 챕터 7 종료 카드는 챕터 8로 이어진다', () => {
    const e6 = play({}, 3, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch6_end' }).s
    const n = continueChapter(e6); expect(n.scene).toBe('ch7_open'); expect(n.chapter).toBe(7)
    const e7 = end7({}, 3).s
    expect(e7.mode).toBe('ENDED'); expect(e7.endTitle).toContain('챕터 7'); const m = continueChapter(e7); expect(m.scene).toBe('ch8_open'); expect(m.chapter).toBe(8)
  })
})

describe('K-13 진행 방식', () => {
  it('A/B/C 모두 완료되고 각자의 플래그를 남긴다', () => {
    const a = end7({ 'K-13': 'A' }, 4).s, b = end7({ 'K-13': 'B' }, 4).s, c = end7({ 'K-13': 'C' }, 4).s
    expect(a.flags.FLAG_YIELDED_LEAD).toBe(true); expect(b.flags.FLAG_CO_DESIGNED).toBe(true); expect(c.flags.FLAG_TOOK_LEAD).toBe(true)
    for (const s of [a, b, c]) { expect(s.mode).toBe('ENDED'); expect(s.chapter).toBe(7) }
    expect(a.flags.FLAG_CO_DESIGNED).toBeFalsy(); expect(b.flags.FLAG_YIELDED_LEAD).toBeFalsy()
  })
  it('선택지 문구에 수치·성공률이 없다', () => {
    const s = toK13({}, 2).s
    expect(visibleKeys(s)).toEqual(['A', 'B', 'C'])
  })
  it('C 판정: 지성이 충분하면 초안이 통하고, 부족하면 계획이 결함(FLAG_PLAN_FLAWED)을 드러낸다', () => {
    const hi = fromK13((s) => { s.stats.int = 90 }, { 'K-13': 'C' }, 5).s
    const lo = fromK13((s) => { s.stats.int = 5 }, { 'K-13': 'C' }, 5).s
    expect(hi.flags.FLAG_PLAN_FLAWED).toBeFalsy(); expect(lo.flags.FLAG_PLAN_FLAWED).toBe(true)
  })
  it('방식에 따라 감정 반응이 다르다: B는 존경↑, A는 존경↓·자율성↑, C는 경계↑·자율성↓', () => {
    const run = (k: string) => { const s = clone(toK13({}, 6).s); s.stats.int = 90; const b = clone(s); const r = play({ 'K-13': k }, 6, { follow: true, from: s, stopAt: (x) => x.scene === 'ch7_routine' }).s; return { before: b.emotions.draco, after: r.emotions.draco } }
    const a = run('A'), b = run('B'), c = run('C')
    expect(a.after.respect - a.before.respect).toBeLessThan(0); expect(b.after.respect - b.before.respect).toBeGreaterThan(0)
    expect(a.after.autonomy).toBeGreaterThan(a.before.autonomy); expect(c.after.autonomy).toBeLessThan(c.before.autonomy)
    expect(c.after.wariness).toBeGreaterThan(c.before.wariness)
  })
})

describe('DE-08 · DE-13 · F-12 · 복선', () => {
  it('DE-08: 소문 이력이 없으면 소문 장면이 없고, 있으면 사교성에 따라 완화/방해로 갈린다', () => {
    const none = fromK13((s) => { delete s.flags.FLAG_RUMOR_ACTIVE }, { 'K-13': 'B' }, 7)
    expect(none.scenes).not.toContain('ch7_rumor')
    const ease = fromK13((s) => { s.flags.FLAG_RUMOR_ACTIVE = true; s.stats.social = DE08_SOCIAL + 20 }, { 'K-13': 'B' }, 7)
    const hit = fromK13((s) => { s.flags.FLAG_RUMOR_ACTIVE = true; s.stats.social = 0 }, { 'K-13': 'B' }, 7)
    expect(ease.scenes).toContain('ch7_rumor_ease'); expect(ease.s.flags.FLAG_RUMOR_EASED).toBe(true)
    expect(hit.scenes).toContain('ch7_rumor_hit'); expect(hit.s.flags.FLAG_RUMOR_EASED).toBeFalsy()
  })
  it('DE-13: 포션 도움 제안 이력이 있으면 "그때처럼" 대사가, 없으면 일반 대사가 나온다', () => {
    const has = fromK13((s) => { s.flags.FLAG_OFFERED_POTION_HELP = true }, { 'K-13': 'B' }, 8).lines.join('|')
    const not = fromK13((s) => { delete s.flags.FLAG_OFFERED_POTION_HELP }, { 'K-13': 'B' }, 8).lines.join('|')
    expect(has).toContain('그때처럼 도와줄 생각이면 사양이야'); expect(not).not.toContain('그때처럼 도와줄 생각이면 사양이야')
    expect(not).toContain('요청이 아니라 판단이야')
  })
  it('F-12: 폐쇄술은 모든 경로에서 관찰되고, 이유(Ch13)는 공개되지 않는다', () => {
    const r = end7({ 'K-13': 'A' }, 9); const t = r.lines.join('|')
    expect(r.s.knowledge.OB_OCCLUSION).toBe(true); expect(t).toContain('폐쇄술'); expect(t).toContain('사양')
    expect(t).not.toMatch(/맹세|볼드모트|어둠의 군주|덤블도어의 계획/)
    expect(t).toContain('알 수 없어')
  })
  it('Ch8 복선: 눌러 말린 꽃잎이 모든 경로에 남고 편지 내용은 공개되지 않는다', () => {
    for (const k of ['A', 'B', 'C']) {
      const r = end7({ 'K-13': k }, 10)
      expect(r.s.knowledge.OB_PRESSED_FLOWER, k).toBe(true)
    }
    const text = end7({ 'K-13': 'B' }, 10).lines.join('|')
    expect(text).not.toMatch(/루시우스|볼드모트|캐비닛이 완성|네 어머니는/)
    expect(buildCodex(end7({}, 10).s).some((e) => e.title === '눌러 말린 꽃잎')).toBe(true)
  })
})

describe('SS-08과 경로 개연성', () => {
  it('B(공동 설계)만 ch7_lab_night(CG·플래그), A/C는 ch7_lab_plain', () => {
    const b = end7({ 'K-13': 'B' }, 11), a = end7({ 'K-13': 'A' }, 11), c = end7({ 'K-13': 'C' }, 11)
    expect(b.scenes).toContain('ch7_lab_night'); expect(b.cgs).toContain('cg_lab_vigil'); expect(b.s.flags.FLAG_LAB_VIGIL).toBe(true)
    for (const r of [a, c]) { expect(r.scenes).toContain('ch7_lab_plain'); expect(r.scenes).not.toContain('ch7_lab_night'); expect(r.cgs).not.toContain('cg_lab_vigil') }
  })
  it('Ch6 K-12 선물 이력과 K-10/K-11 이력이 도입에 반영된다', () => {
    const l = (edit: (s: GameState) => void) => {
      const s = clone(play({}, 12, { follow: true, stopAt: (x) => x.scene === 'ch7_open' }).s); edit(s)
      return play({}, 12, { follow: true, from: s, stopAt: atChoice('K-13') }).lines.join('|')
    }
    expect(l((s) => { s.flags.FLAG_GIFT_GIVEN = true })).toContain('다른 공책을 못 찾았을 뿐이야')
    expect(l((s) => { delete s.flags.FLAG_GIFT_GIVEN })).not.toContain('다른 공책을 못 찾았을 뿐이야')
    expect(l((s) => { s.flags.FLAG_FORCED_MARK_CHECK = true })).toContain('왼팔이 오지 않게')
    expect(l((s) => { s.flags.FLAG_ACCUSED_PUBLIC = true })).toContain('식탁에서 지목한 포터')
  })
  it('모든 경로에서 고백·직접적 애정 표현이 없고 공개 장소의 외형은 환영이다', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const r = end7({ 'K-13': 'ABC'[seed % 3] }, seed)
      const ch7 = r.lines.join('|')
      expect(ch7).not.toMatch(/좋아해|사랑해|좋아한다고/)
      expect(r.views.filter((v) => v.char === 'draco' && /^(ch7|enc7)/.test(v.scene)).every((v) => v.form !== 'true')).toBe(true)
    }
  })
  it('특화·균형·저신뢰·고신뢰 경로 모두 챕터 7 종료 카드까지 도달한다', () => {
    for (const policy of ['study', 'train', 'quidditch', 'talk', 'balanced', 'rest'] as const) {
      const r = end7({ 'K-13': 'ABC'[policy.length % 3] }, 13, { policy })
      expect(r.s.mode, policy).toBe('ENDED'); expect(r.s.chapter).toBe(7)
    }
    const stop7 = (s: GameState) => s.mode === 'ENDED' && s.scene === 'ch7_end'
    const low = play({ 'K-03': 'B', 'S-04': 'B', 'K-10': 'A', 'K-11': 'A', 'K-12': 'C', 'K-13': 'C' }, 14, { follow: true, stopAt: stop7 })
    const high = play({ 'K-03': 'D', 'S-01': 'B', 'S-04': 'A', 'K-10': 'C', 'K-11': 'B', 'K-12': 'B', 'K-13': 'B' }, 14, { follow: true, stopAt: stop7 })
    expect(low.s.mode).toBe('ENDED'); expect(high.s.mode).toBe('ENDED')
    expect(high.s.emotions.draco.trust).toBeGreaterThan(low.s.emotions.draco.trust)
  })
})

describe('챕터 7 저장·복원·호환', () => {
  it('K-13 직전·자유 일과 중간·종료 카드 저장 복원', () => {
    const a = toK13({}, 15); saveToSlot('slot1', a.s, new Set())
    const fa = loadFromSlot('slot1')!; expect(fa.state.scene).toBe('ch7_pair'); expect(fa.state.chapter).toBe(7); expect(visibleKeys(fa.state)).toEqual(visibleKeys(a.s))
    const r = play({}, 15, { follow: true, stopAt: (s) => s.mode === 'ROUTINE' && s.scene === 'ch7_routine' })
    saveToSlot('slot2', r.s, new Set()); expect(loadFromSlot('slot2')!.state.routine).toEqual(r.s.routine)
    const e = end7({ 'K-13': 'B' }, 15).s; saveToSlot('slot3', e, new Set())
    const fe = loadFromSlot('slot3')!; expect(fe.state.mode).toBe('ENDED'); expect(fe.state.flags).toEqual(e.flags)
  })
  it('챕터 6 종료 카드로 저장된 기존 세이브는 불러온 뒤 챕터 7로 이어진다', () => {
    const e6 = play({}, 16, { follow: true, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch6_end' }).s
    saveToSlot('slot4', e6, new Set())
    const f = loadFromSlot('slot4')!; expect(f.state.mode).toBe('ENDED')
    const n = continueChapter(f.state); expect(n.scene).toBe('ch7_open'); expect(n.chapter).toBe(7)
  })
  it('클라우드 시나리오 버전: 이전 버전(ch1-2/4/6)과 현재(ch1-7) 호환, 모르는 버전 거부', () => {
    const e = end7({}, 17).s
    const row = (v: string) => ({ user_id: 'u', slot: 'slot1', state: JSON.parse(JSON.stringify(e)), read_lines: [], label: '', chapter: 7, schema_version: 2, scenario_version: v, revision: 1, created_at: 'x', updated_at: 'x' })
    for (const v of ['ch1-2.v1', 'ch1-4.v1', 'ch1-6.v1', 'ch1-7.v1']) expect(checkCompat(row(v)).ok, v).toBe(true)
    expect(checkCompat(row('ch9.v1')).ok).toBe(false)
  })
})
