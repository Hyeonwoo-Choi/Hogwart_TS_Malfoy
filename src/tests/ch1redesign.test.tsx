import { describe, expect, it } from 'vitest'
import { advance, choose, clone, currentNode, newState, run, visibleOptions } from '../engine/core'
import { validateSave } from '../engine/save'
import { buildJournal } from '../data/journal'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { V2C1X } from '../data/v2c1x'
import type { ChoiceNode, GameState } from '../engine/types'
import { play } from './helpers'

/**
 * 챕터 1 재설계 검증(docs/CH1_NARRATIVE_AUDIT.md): 루나·판시의 H-08 이전 일대일 장면, 작은 선택의 분산, 후속 소비, 관계를 맺지 않는 플레이.
 * 자연 플레이 = 실제 엔진 진행(play 헬퍼, 강제 상태 없음). at()/patch는 변형 비교용이다.
 */
const NAMES = /헤르미온느|그레인저|지니|위즐리|루나|러브굿|판시|파킨슨|말포이|드레이코|론/
const toCh2 = (s: GameState) => s.scene === 'ch2_open'
const at = (scene: string, patch: (s: GameState) => void = () => {}) => { const s = newState(START_SCENE, 1); s.scene = scene; s.idx = 0; s.mode = 'STORY'; s.chapter = 1; patch(s); let t = run(s); for (let i = 0; i < 80; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
const lines = (scene: string, patch: (s: GameState) => void) => { const s = newState(START_SCENE, 1); s.scene = scene; s.idx = 0; s.mode = 'STORY'; s.chapter = 2; patch(s); let t = run(s); const out: string[] = []; for (let i = 0; i < 80 && t.scene === scene; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
const f = (...k: string[]) => (s: GameState) => { for (const x of k) s.flags[x] = true }
const next = (s: GameState, key: string) => { let t = choose(s, key); for (let i = 0; i < 60; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }

describe('챕터 1 재설계: 구조와 순서', () => {
  it('새 선택 ID C1-01·C1-02는 유일하고 모든 이동 대상이 존재하며 기존 선택 ID는 보존된다', () => {
    const ids: string[] = []; const old = new Set<string>()
    for (const [id, nodes] of Object.entries(SCENARIO)) for (const n of nodes) {
      if (n.t === 'choice') { if (id in V2C1X) ids.push(n.id); else old.add(n.id) }
      if (id in V2C1X) { if (n.t === 'goto') expect(SCENARIO[n.scene]).toBeTruthy(); if (n.t === 'choice') n.options.forEach((o) => expect(SCENARIO[o.goto!], `${id}${o.key}`).toBeTruthy()) }
    }
    expect(ids.sort()).toEqual(['C1-01', 'C1-02', 'C1-03']); for (const i of ids) expect(old.has(i)).toBe(false)
    for (const i of ['H-08', 'K-04', 'H-01', 'H-07']) expect(old.has(i)).toBe(true)
  })
  it('필수 경로: 경기장(K-03) → 루나 → 판시 → H-08 순서이며 모든 플레이어가 두 장면을 지난다(자연 플레이)', () => {
    const r = play({ 'C1-01': 'A', 'C1-02': 'D' }, 3, { stopAt: toCh2 })
    const idx = (sc: string) => r.scenes.indexOf(sc)
    expect(idx('v2c1_pitch_end')).toBeLessThan(idx('v2c1_tue')); expect(idx('v2c1_tue')).toBeLessThan(idx('v2c1_tue_pansy')); expect(idx('v2c1_tue_pansy_end')).toBeLessThan(idx('v2c1_week'))
    const ids = r.s.choices.map((c) => c.id); expect(ids.indexOf('C1-01')).toBeGreaterThan(ids.indexOf('K-03')); expect(ids.indexOf('C1-02')).toBeLessThan(ids.indexOf('H-08'))
    expect(r.s.scene).toBe('ch2_open')
  })
  it('두 장면은 일대일 대사와 관찰 맥락(note)으로 인물을 소개한다', () => {
    const count = (ids: string[], who: string) => ids.flatMap((id) => SCENARIO[id]).filter((n) => n.t === 'line' && n.who === who).length
    expect(count(['v2c1_tue', 'v2c1_tue_luna_a'], '루나')).toBeGreaterThanOrEqual(6); expect(count(['v2c1_tue_pansy', 'v2c1_tue_pansy_a'], '판시')).toBeGreaterThanOrEqual(6)
    for (const id of ['v2c1_tue', 'v2c1_tue_pansy']) expect(SCENARIO[id].some((n) => n.t === 'show' && n.char && n.note), id).toBe(true)
  })
  it('H-08 안내문은 여전히 익명이다(이름·메타 없음). 경험을 이름 없이 돌이키는 조건 줄이 있다', () => {
    const META = /루트|호감|신뢰|경계|우선순위|히로인|보상|분기|약속|경로|단계/
    for (const n of SCENARIO.v2c1_week) if (n.t === 'line') { expect(n.text).not.toMatch(NAMES); expect(n.text).not.toMatch(META) }
    expect(SCENARIO.v2c1_week.filter((n) => n.t === 'line' && n.when && /FLAG_C1_/.test(n.when)).length).toBeGreaterThanOrEqual(5)
  })
  it('시간순: 장면은 경기장(화 오후) 뒤 화요일 저녁이고 H-08(화요일 밤) 앞이다', () => {
    expect(SCENARIO.v2c1_tue[0].t).toBe('trans'); expect((SCENARIO.v2c1_tue[0] as { title: string }).title).toContain('돌아오는 길')
    expect((SCENARIO.v2c1_tue_pansy[0] as { title: string }).title).toContain('화요일 저녁')
  })
})

describe('챕터 1 재설계: 선택의 결과와 관계 형성', () => {
  it('C1-01: 같이 센다=직접 본 것(OB), 먼저 묻는다=들은 것(KN), 미룬다=정보 없음 + 내일 다시 오겠다는 말이 남는다', () => {
    const s = at('v2c1_tue'); expect(visibleOptions(s, currentNode(s) as ChoiceNode, true).map((o) => o.key)).toEqual(['A', 'B', 'C', 'D'])
    const a = next(clone(s), 'A'), b = next(clone(s), 'B'), c = next(clone(s), 'C')
    expect(a.knowledge.OB_SEVEN_RIPPLE).toBe(true); expect(a.knowledge.KN_SEVEN_WEST).toBeFalsy()
    expect(b.knowledge.KN_SEVEN_WEST).toBe(true); expect(b.knowledge.OB_SEVEN_RIPPLE).toBeFalsy()
    expect(c.knowledge.OB_SEVEN_RIPPLE || c.knowledge.KN_SEVEN_WEST).toBeFalsy(); expect(c.flags.FLAG_C1_LUNA_LATER).toBe(true)
    expect(new Set([a, b, c].map((x) => `${x.emotions.luna.affinity}/${x.emotions.luna.trust}`)).size).toBeGreaterThanOrEqual(2)
  })
  it('C1-02: 아는 것을 교환할 때만 서랍 속 편지(KN_LETTER_DRAWER)를 얻고, 엿듣지 못했으면 있지 않은 정보를 내놓는 선택지는 숨는다', () => {
    const s = at('v2c1_tue_pansy', (x) => { x.knowledge.KN_OVERHEARD = true })
    expect(visibleOptions(s, currentNode(s) as ChoiceNode, true).map((o) => o.key)).toEqual(['A', 'B', 'C'])
    const a = next(clone(s), 'A'), b = next(clone(s), 'B'), c = next(clone(s), 'C')
    expect(a.knowledge.KN_LETTER_DRAWER).toBe(true); expect(b.knowledge.KN_LETTER_DRAWER).toBeFalsy(); expect(c.knowledge.KN_LETTER_DRAWER).toBeFalsy()
    expect(a.flags.FLAG_C1_PAN_SHARED && b.flags.FLAG_C1_PAN_ASKED_FIRST && c.flags.FLAG_C1_PAN_DECLINED).toBe(true)
    const none = at('v2c1_tue_pansy'); expect(visibleOptions(none, currentNode(none) as ChoiceNode, true).map((o) => o.key)).toEqual(['D', 'B', 'C'])
  })
  it('관계를 맺지 않는 플레이(루나 미룸·판시 거절·H-08 F)도 챕터 2까지 정상 진행되고, 뒤늦게 관계를 쌓을 일대일 장면이 남아 있다', () => {
    const r = play({ 'C1-01': 'C', 'C1-02': 'C', 'H-08': 'F' }, 4, { stopAt: toCh2 })
    expect(r.s.scene).toBe('ch2_open'); expect(r.s.flags.FLAG_C1_LUNA_LATER && r.s.flags.FLAG_C1_PAN_DECLINED).toBe(true)
    expect(Object.keys(SCENARIO).filter((k) => /^hr1_(luna|pansy)_/.test(k)).length).toBeGreaterThanOrEqual(6)
  })
  it('저장→불러오기: 판시 선택 직전 저장 후 이어도 같은 결과', () => {
    const s = at('v2c1_tue_pansy', (x) => { x.knowledge.KN_OVERHEARD = true })
    const back = validateSave(JSON.parse(JSON.stringify({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: s }))).state as GameState
    expect(JSON.stringify(next(back, 'A').flags)).toBe(JSON.stringify(next(clone(s), 'A').flags))
  })
})

describe('챕터 1 재설계: 후속 소비(챕터 2·자유 일과·수첩)', () => {
  it('새 플래그는 모두 둘 이상의 장면에서 읽힌다(소비처 없는 상태 금지)', () => {
    const all = JSON.stringify(SCENARIO)
    for (const k of ['FLAG_C1_LUNA_LISTENED', 'FLAG_C1_LUNA_ASKED', 'FLAG_C1_LUNA_LATER', 'FLAG_C1_PAN_SHARED', 'FLAG_C1_PAN_ASKED_FIRST', 'FLAG_C1_PAN_DECLINED']) {
      const reads = (all.match(new RegExp('"when":"[^"]*' + k, 'g')) ?? []).length; expect(reads, k).toBeGreaterThanOrEqual(2)
    }
  })
  it('루나 경로 진입(챕터 2)과 첫 자유 일과 만남이 챕터 1의 행동에 따라 달라진다', () => {
    const l = (...k: string[]) => lines('ch2_p_secret', f(...k)); const base = l()
    for (const k of ['FLAG_C1_LUNA_LISTENED', 'FLAG_C1_LUNA_ASKED', 'FLAG_C1_LUNA_LATER', 'FLAG_HR1_LUN_LAKE']) expect(l(k), k).not.toBe(base)
    const h = (...k: string[]) => lines('hr1_luna_lake_1', f(...k)); for (const k of ['FLAG_C1_LUNA_LISTENED', 'FLAG_C1_LUNA_ASKED', 'FLAG_C1_LUNA_LATER']) expect(h(k), k).not.toBe(h())
  })
  it('판시 경로 진입(챕터 2)과 첫 자유 일과 만남이 거래의 이력에 따라 달라지고, 거절한 플레이도 막히지 않는다', () => {
    const p = (...k: string[]) => lines('ch2_p_sly', f(...k)); const base = p()
    for (const k of ['FLAG_C1_PAN_SHARED', 'FLAG_C1_PAN_DECLINED', 'FLAG_HR1_PAN_MIRROR']) expect(p(k), k).not.toBe(base)
    const h = (...k: string[]) => lines('hr1_pansy_courtyard_1', f(...k)); for (const k of ['FLAG_C1_PAN_SHARED', 'FLAG_C1_PAN_ASKED_FIRST', 'FLAG_C1_PAN_DECLINED']) expect(h(k), k).not.toBe(h())
  })
  it('론(H-07)과 지니·헤르미온느의 자유 일과 관계도 챕터 2에서 소비된다', () => {
    const r = (k: string) => lines('ch2_open', (s) => { s.choices.push({ id: 'H-07', option: k, scene: 'x', date: '09-01' }) })
    expect(new Set(['A', 'B', 'C'].map(r)).size).toBe(3)
    expect(lines('ch2_p_research', f('FLAG_HR1_HER_PAPER'))).not.toBe(lines('ch2_p_research', f())); expect(lines('ch2_p_pitch', f('FLAG_HR1_GIN_CAPTAIN'))).not.toBe(lines('ch2_p_pitch', f()))
  })
  it('수첩: 직접 본 것과 들은 것을 구분하고, 가지 않은 선택의 정보는 먼저 공개하지 않는다', () => {
    const base = newState(START_SCENE, 1); base.bonds!.luna.seen = 1; base.bonds!.pansy.seen = 1
    const text = (s: GameState, id: string) => JSON.stringify(buildJournal(s).find((p) => p.id === id))
    expect(text(base, 'luna')).not.toContain('파문'); expect(text(base, 'pansy')).not.toContain('서랍에 넣는다')
    const a = clone(base); a.flags.FLAG_C1_LUNA_LISTENED = true; a.flags.FLAG_C1_PAN_SHARED = true
    expect(text(a, 'luna')).toContain('파문'); expect(text(a, 'pansy')).toContain('서랍에 넣는다')
    const c = clone(base); c.flags.FLAG_C1_LUNA_LATER = true; c.flags.FLAG_C1_PAN_DECLINED = true
    expect(text(c, 'luna')).not.toContain('파문'); expect(text(c, 'pansy')).not.toContain('서랍에 넣는다')
    const s = at('v2c1_tue_luna_a'); expect(s.seen!.luna.note).toContain('일곱을 세는 동안')
  })
  it('자연 플레이로 챕터 1→2 진입까지 C1-01×C1-02×H-08 전 조합(72)이 완주한다', () => {
    let n = 0
    for (const a of 'ABC') for (const b of 'ABCD') for (const h of 'ABCDEF') { n++; expect(play({ 'C1-01': a, 'C1-02': b, 'H-08': h }, n, { stopAt: toCh2 }).s.scene).toBe('ch2_open') }
    expect(n).toBe(72)
  })
})
