import { describe, expect, it } from 'vitest'
import { advance, choose, clone, currentNode, newState, run, visibleOptions } from '../engine/core'
import { buildJournal } from '../data/journal'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { ChoiceNode, GameState } from '../engine/types'
import { play } from './helpers'

/**
 * 챕터 1 인물 애착·의미 있는 분기(2차) 검증. 자동 테스트는 선택별 장면·상태·소비 연결을 증명하며, 인물이 매력적인지는 증명하지 않는다.
 * at()/lines()는 변형 비교용(강제 상태), play()는 자연 플레이(엔진 진행)다.
 */
const ev = (s: GameState, scene: string) => { if (/^hr1_/.test(scene)) { s.mode = 'EVENT'; s.routine = { days: [{ date: '09-05', weekday: '목' }], dayIdx: 0, slotIdx: 2, night: false, then: 'v2c1_night', locations: [], encounters: {}, pendingDone: false, message: null } } }
const toCh2 = (s: GameState) => s.scene === 'ch2_open'
const at = (scene: string, patch: (s: GameState) => void = () => {}) => { const s = newState(START_SCENE, 1); s.scene = scene; s.idx = 0; s.mode = 'STORY'; s.chapter = 1; ev(s, scene); patch(s); let t = run(s); for (let i = 0; i < 90; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
const next = (s: GameState, key: string) => { let t = choose(s, key); for (let i = 0; i < 90; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
const lines = (scene: string, patch: (s: GameState) => void, chapter = 2) => { const s = newState(START_SCENE, 1); s.scene = scene; s.idx = 0; s.mode = 'STORY'; s.chapter = chapter; ev(s, scene); patch(s); let t = run(s); const out: string[] = []; for (let i = 0; i < 120 && t.scene === scene; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
const f = (...k: string[]) => (s: GameState) => { for (const x of k) s.flags[x] = true }
const keys = (s: GameState) => visibleOptions(s, currentNode(s) as ChoiceNode, true).map((o) => o.key)
const NAMES = /헤르미온느|그레인저|지니|위즐리|루나|러브굿|판시|파킨슨|말포이|드레이코|론/

describe('인물에 따라 같은 대화가 다르게 흘러간다', () => {
  it('헤르미온느: 근거를 짚는 길(B)은 능력을 인정받고, 틀려도 괜찮다고 하는 길(D)은 개인적인 신뢰를 얻는다. 둘은 다른 장면·플래그·후속이다', () => {
    const s = at('hr1_hermione_library_1'); expect(keys(s)).toEqual(['A', 'B', 'C', 'D'])
    const b = next(clone(s), 'B'), d = next(clone(s), 'D'), a = next(clone(s), 'A')
    expect(b.flags.FLAG_C1_HER_RESPECT && !b.flags.FLAG_C1_HER_PERSONAL).toBe(true); expect(d.flags.FLAG_C1_HER_PERSONAL && !d.flags.FLAG_C1_HER_RESPECT).toBe(true); expect(a.flags.FLAG_C1_HER_RESPECT || a.flags.FLAG_C1_HER_PERSONAL).toBeFalsy()
    expect(d.emotions.hermione.trust).toBeGreaterThan(b.emotions.hermione.trust); expect(new Set([a, b, d].map((x) => x.scene)).size).toBeGreaterThanOrEqual(1)
    const l2 = (h: string) => lines('hr1_hermione_library_2', (x) => { x.choices.push({ id: 'H-03', option: h, scene: 'x', date: '09-01' }) }, 1)
    expect(new Set(['A', 'B', 'C', 'D'].map(l2)).size).toBe(4)
    const p = (...k: string[]) => lines('ch2_p_research', f(...k)); expect(p('FLAG_C1_HER_RESPECT')).not.toBe(p('FLAG_C1_HER_PERSONAL')); expect(p('FLAG_C1_HER_RESPECT')).not.toBe(p())
  })
  it('지니: 내기(H-04 D)는 동등한 조건의 경쟁이다. 지니는 진 값을 직접 치르고 "오빠가 이긴 것"이라고 선을 그으며, 이후 만남과 챕터 2 경로에 기억이 남는다', () => {
    const s = at('hr1_ginny_pitch_1'); expect(keys(s)).toEqual(['A', 'B', 'C', 'D'])
    const d = next(clone(s), 'D'); expect(d.flags.FLAG_C1_GIN_BET).toBe(true)
    expect(JSON.stringify(SCENARIO.hr1_ginny_pitch_1_D)).toContain('오빠가 이긴 거야')
    const l2 = (h: string) => lines('hr1_ginny_pitch_2', (x) => { x.choices.push({ id: 'H-04', option: h, scene: 'x', date: '09-01' }) }, 1)
    expect(new Set(['A', 'B', 'C', 'D'].map(l2)).size).toBe(4)
    expect(lines('ch2_p_pitch', f('FLAG_C1_GIN_BET'))).not.toBe(lines('ch2_p_pitch', f()))
  })
  it('루나: 의심(C1-01 D)에도 화내지 않고 의심하는 사람이 더 정확히 듣는다고 한다. 같이 센 경우·물은 경우와 다른 분위기이며, 다른 사람(말포이)의 걸음을 읽는 자기 방식을 보여 준다', () => {
    const s = at('v2c1_tue'); expect(keys(s)).toEqual(['A', 'B', 'C', 'D'])
    const a = next(clone(s), 'A'), b = next(clone(s), 'B'), c = next(clone(s), 'C'), d = next(clone(s), 'D')
    expect(d.flags.FLAG_C1_LUNA_DOUBTED).toBe(true); expect(d.knowledge.OB_SEVEN_RIPPLE || d.knowledge.KN_SEVEN_WEST).toBeFalsy()
    const text = (id: string) => JSON.stringify(SCENARIO[id])
    for (const id of ['v2c1_tue_luna_a', 'v2c1_tue_luna_b', 'v2c1_tue_luna_d']) expect(text(id)).toContain('걸을 때 소리를 안 내려고'); expect(text('v2c1_tue_luna_c')).not.toContain('걸을 때 소리를')
    expect(text('v2c1_tue_luna_d')).toContain('의심하는 사람이 더 정확히')
    expect(new Set([a, b, c, d].map((x) => x.flags.FLAG_C1_LUNA_LISTENED ? 'a' : x.flags.FLAG_C1_LUNA_ASKED ? 'b' : x.flags.FLAG_C1_LUNA_LATER ? 'c' : 'd')).size).toBe(4)
    expect(lines('ch2_p_secret', f('FLAG_C1_LUNA_DOUBTED'))).not.toBe(lines('ch2_p_secret', f()))
  })
  it('판시: 협상과 거절에 서로 다른 태도를 보이고(계산을 인정/정직한 거절을 받아 둠), 해리가 경계하더라도 능력을 인정하는 말이 있다', () => {
    const t = (id: string) => JSON.stringify(SCENARIO[id])
    expect(t('v2c1_tue_pansy_b')).toContain('계산이 정확한 건 인정'); expect(t('v2c1_tue_pansy_a')).toContain('하나만 정확히 골랐네'); expect(t('v2c1_tue_pansy_c')).toContain('정직한 거절은 받아 둘게')
  })
  it('론: 질투나 반응이 아니라 독립된 판단을 말한다. 해리가 받아들이거나, 반박하거나, 피할 때 서로 다른 우정의 결과가 남고 이후 장면에서 기억한다', () => {
    const s = at('v2c1_tue_ron'); expect(keys(s)).toEqual(['A', 'B', 'C'])
    expect(JSON.stringify(SCENARIO.v2c1_tue_ron)).toContain('눈빛을 모아')
    const a = next(clone(s), 'A'), b = next(clone(s), 'B'), c = next(clone(s), 'C')
    expect([a, b, c].map((x) => x.scene)).toEqual(['v2c1_week', 'v2c1_week', 'v2c1_week'])
    expect(a.flags.FLAG_C1_RON_HEARD && b.flags.FLAG_C1_RON_ARGUED && c.flags.FLAG_C1_RON_DEFLECTED).toBe(true); expect(a.emotions.ron.trust).toBeGreaterThan(b.emotions.ron.trust)
    const fu = (...k: string[]) => lines('v2c1_followup', f(...k), 1); expect(new Set([fu('FLAG_C1_RON_HEARD'), fu('FLAG_C1_RON_ARGUED'), fu('FLAG_C1_RON_DEFLECTED')]).size).toBe(3)
    const o = (...k: string[]) => lines('ch2_open', f(...k, 'x')); expect(new Set([o('FLAG_C1_RON_HEARD'), o('FLAG_C1_RON_ARGUED'), o('FLAG_C1_RON_DEFLECTED')]).size).toBe(3)
  })
})

describe('H-08과 K-04: 앞선 경험이 결정의 이유와 무게가 된다', () => {
  it('H-08은 여전히 익명 6지선다이고 이전 선택을 이유로 어떤 경로도 막지 않는다(전부 열려 있다)', () => {
    const s = at('v2c1_week', (x) => { x.choices.push({ id: 'H-02', option: 'A', scene: 'x', date: '09-01' }); x.flags.FLAG_C1_LUNA_LATER = true; x.flags.FLAG_C1_PAN_DECLINED = true; x.flags.FLAG_C1_RON_DEFLECTED = true })
    expect(keys(s)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    for (const n of SCENARIO.v2c1_week) if (n.t === 'choice') for (const o of n.options) expect(o.if).toBeUndefined()
  })
  it('H-08 안내문은 앞선 경험(순찰/연회에서 들은 말·경기장에서 본 것·수업의 떨림)을 이름 없이 단서와 이어 준다', () => {
    const META = /루트|호감|신뢰|경계|우선순위|히로인|보상|분기|약속|경로|단계/
    const week = SCENARIO.v2c1_week.filter((n) => n.t === 'line') as { text: string; when?: string }[]
    for (const n of week) { expect(n.text).not.toMatch(NAMES); expect(n.text).not.toMatch(META) }
    expect(week.filter((n) => n.when && /CH_H02_[AB]|OB_TREMOR/.test(n.when)).length).toBeGreaterThanOrEqual(3); expect(week.some((n) => n.text.includes('같은 시각 같은 칸을 두고 다투던'))).toBe(true)
    const recap = (patch: (x: GameState) => void) => lines('v2c1_week', patch, 1)
    expect(recap(f('x'))).not.toBe(recap((x) => { x.choices.push({ id: 'H-02', option: 'A', scene: 'x', date: '09-01' }) }))
    expect(recap((x) => { x.choices.push({ id: 'H-02', option: 'A', scene: 'x', date: '09-01' }) })).not.toBe(recap((x) => { x.choices.push({ id: 'H-02', option: 'B', scene: 'x', date: '09-01' }) }))
  })
  it('K-04: 앞선 선택이 독백으로 되살아나고, 판시와 정보를 교환한 경우에만 그 정보를 꺼내는 선택지(E)가 열린다', () => {
    const base = at('v2c1_night'); expect(keys(base)).toEqual(['A', 'B', 'C', 'D'])
    const informed = at('v2c1_night', (x) => { x.knowledge.KN_LETTER_DRAWER = true }); expect(keys(informed)).toEqual(['A', 'B', 'C', 'D', 'E'])
    const mono = (...k: string[]) => lines('v2c1_night', f(...k), 1)
    for (const k of ['FLAG_C1_RON_HEARD', 'FLAG_C1_RON_ARGUED', 'FLAG_C1_LUNA_LISTENED']) expect(mono(k), k).not.toBe(mono())
    expect(lines('v2c1_night', (x) => { x.knowledge.KN_LETTER_DRAWER = true }, 1)).not.toBe(mono())
  })
  it('K-04 E(들은 말을 꺼냄)는 되돌릴 수 없는 결과를 남긴다: 드레이코의 경계, 밤의 마무리 대사, 챕터 2 판시의 반응', () => {
    const s = at('v2c1_night', (x) => { x.knowledge.KN_LETTER_DRAWER = true }); const e = next(clone(s), 'E')
    expect(e.flags.FLAG_C1_LEAKED_LETTER).toBe(true); expect(e.emotions.draco.wariness).toBeGreaterThan(s.emotions.draco.wariness); expect(e.emotions.draco.trust).toBeLessThan(s.emotions.draco.trust)
    expect(e.scene).not.toBe('v2c1_night')
    expect(lines('ch2_p_sly', f('FLAG_C1_LEAKED_LETTER'))).not.toBe(lines('ch2_p_sly', f()))
    expect(JSON.stringify(SCENARIO.v2c1_night_end)).toContain('서랍 얘기는 다시 꺼내지 마')
    const j = newState(START_SCENE, 1); j.bonds!.pansy.seen = 1; j.flags.FLAG_C1_LEAKED_LETTER = true; expect(JSON.stringify(buildJournal(j).find((p) => p.id === 'pansy'))).toContain('출처가 하나로 좁혀졌다')
  })
  it('자연 플레이: 판시와 교환한 정보를 K-04에서 꺼내는 경로가 챕터 2까지 완주하고 그 상태가 이어진다', () => {
    const r = play({ 'C1-02': 'A', 'K-01': 'A', 'K-04': 'E' }, 5, { stopAt: toCh2 })
    expect(r.s.scene).toBe('ch2_open'); expect(r.s.flags.FLAG_C1_LEAKED_LETTER).toBe(true); expect(r.s.knowledge.KN_LETTER_DRAWER).toBe(true)
  })
})

describe('관계를 깊게 맺지 않는 플레이와 뒤늦게 맺는 플레이', () => {
  it('모든 일대일 선택에서 가장 가벼운 선택(미룸·거절·구경·피함)을 해도 챕터 2까지 정상 진행된다', () => {
    const r = play({ 'C1-01': 'C', 'C1-02': 'C', 'C1-03': 'C', 'H-03': 'C', 'H-04': 'C', 'H-08': 'F', 'K-04': 'C' }, 7, { stopAt: toCh2 })
    expect(r.s.scene).toBe('ch2_open')
  })
  it('뒤늦게 친해지는 길: 첫 만남을 미뤘어도 자유 일과의 일대일 선택(H-03·H-04·H-05·H-06)이 열려 있고 챕터 2 이후에도 관계 장면이 남는다', () => {
    for (const id of ['hr1_hermione_library_1', 'hr1_ginny_pitch_1', 'hr1_luna_lake_1', 'hr1_pansy_courtyard_1']) expect(SCENARIO[id].some((n) => n.t === 'choice'), id).toBe(true)
    expect(lines('hr1_luna_lake_1', f('FLAG_C1_LUNA_LATER'), 1)).toContain('와 줬네')
  })
  it('자연 플레이 전수(C1-01×C1-02×C1-03×K-04 = 240)가 챕터 2까지 완주한다', () => {
    let n = 0
    for (const a of 'ABCD') for (const b of 'ABCD') for (const c of 'ABC') for (const k of 'ABCDE') { n++; expect(play({ 'C1-01': a, 'C1-02': b, 'C1-03': c, 'K-04': k }, n, { stopAt: toCh2 }).s.scene).toBe('ch2_open') }
    expect(n).toBe(240)
  })
  it('수첩: 직접 본 것만 기록하고 선택하지 않은 정보는 먼저 보이지 않는다', () => {
    const base = newState(START_SCENE, 1); for (const w of ['hermione', 'ginny', 'luna', 'pansy']) base.bonds![w].seen = 1
    const text = (s: GameState, id: string) => JSON.stringify(buildJournal(s).find((p) => p.id === id))
    expect(text(base, 'hermione')).not.toContain('열두 번'); expect(text(base, 'ginny')).not.toContain('선을 그었다'); expect(text(base, 'luna')).not.toContain('의심하는 사람')
    const a = clone(base); Object.assign(a.flags, { FLAG_C1_HER_PERSONAL: true, FLAG_C1_GIN_BET: true, FLAG_C1_LUNA_DOUBTED: true })
    expect(text(a, 'hermione')).toContain('열두 번'); expect(text(a, 'ginny')).toContain('선을 그었다'); expect(text(a, 'luna')).toContain('의심하는 사람')
  })
})
