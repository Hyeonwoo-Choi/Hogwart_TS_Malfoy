import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { store } from '../engine/store'
import { advance, applyDelta, applyEffects, choose, clone, continueChapter, currentNode, listActions, listOptions, newState, pickActivity, run, setActivityScenes, setIncidents, setRandomEvents, STAT_SOFT_CAP, visibleOptions } from '../engine/core'
import { evalCond } from '../engine/cond'
import { validateSave } from '../engine/save'
import { buildJournal } from '../data/journal'
import { Portrait } from '../ui/Journal'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { INCIDENTS } from '../data/incidents'
import { CALENDAR } from '../data/calendar'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { V2C4H } from '../data/v2c4h'
import { V2C4X } from '../data/v2c4x'
import { simulate2, type Out } from './ch2sim'
import type { ChoiceNode, GameState, Node } from '../engine/types'
import './helpers'

/**
 * 능력치 기반 선택지(req/lock) · 행동의 사회적 파급(deed/hear) · Ch4 H·P 사건 · 수첩 연동 검증.
 * 자연 도달은 일과 활동 정책(statPolicy)으로 능력치를 키운 플레이만 성공으로 센다. 강제 상태(flags/stats 직접 지정)는 변형 결과 확인용이며 자연 도달로 보고하지 않는다.
 */
const setState = (s: GameState) => act(() => { (store as unknown as { set: (x: GameState) => void }).set(s) })
const at = (scene: string, patch: (s: GameState) => void = () => {}) => { const s = newState(START_SCENE, 1); s.scene = scene; s.idx = 0; s.mode = /^ev/.test(scene) ? 'EVENT' : 'STORY'; s.chapter = 4
  if (/^ev/.test(scene)) s.routine = { days: [{ date: '11-06', weekday: '수' }], dayIdx: 0, slotIdx: 2, night: false, then: 'ch4_gate', locations: [], encounters: {}, pendingDone: false, message: null }
  patch(s); let t = run(s); for (let i = 0; i < 60; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
const choiceNodes = () => Object.entries(SCENARIO).flatMap(([id, nodes]) => nodes.filter((n): n is ChoiceNode => n.t === 'choice').map((n) => ({ id, n })))

beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('능력치 조건 엔진', () => {
  it('충족하면 선택 가능, 부족하면 잠김: 잠긴 선택지는 목록에는 있지만 실행 목록(visibleOptions)에는 없다', () => {
    const lo = at('ev4_h_ledger'); const hi = at('ev4_h_ledger', (s) => { s.stats.int = 45 })
    const node = (s: GameState) => currentNode(s) as ChoiceNode
    expect(listOptions(lo, node(lo), true).find((x) => x.opt.key === 'A')!.locked).toBe(true)
    expect(listOptions(hi, node(hi), true).find((x) => x.opt.key === 'A')!.locked).toBe(false)
    expect(visibleOptions(lo, node(lo), true).map((o) => o.key)).toEqual(['D'])
    expect(visibleOptions(hi, node(hi), true).map((o) => o.key)).toEqual(['A', 'D'])
  })
  it('잠긴 선택지는 실행해도 상태가 변하지 않는다(직접 choose 호출도 거부)', () => {
    const lo = at('ev4_h_ledger'); const before = JSON.stringify(lo)
    for (const k of ['A', 'B', 'C']) expect(JSON.stringify(choose(lo, k))).toBe(before)
    expect(choose(lo, 'D').scene).not.toBe('ev4_h_ledger')
  })
  it('같은 사건에 능력치가 아니라 지식·플래그 조합으로도 해금된다(우회·조합)', () => {
    const viaFlag = at('ev4_h_ledger', (s) => { s.stats.int = 31; s.flags.FLAG_P3_A2_PAGE = true })
    expect(visibleOptions(viaFlag, currentNode(viaFlag) as ChoiceNode, true).map((o) => o.key)).toContain('A')
    const noFlag = at('ev4_h_ledger', (s) => { s.stats.int = 31 })
    expect(visibleOptions(noFlag, currentNode(noFlag) as ChoiceNode, true).map((o) => o.key)).not.toContain('A')
    const viaKn = at('ev4_h_ledger', (s) => { s.stats.insight = 23; s.knowledge.KN_BORROW_PATTERN = true })
    expect(visibleOptions(viaKn, currentNode(viaKn) as ChoiceNode, true).map((o) => o.key)).toContain('B')
  })
  it('판정은 실행 시점의 실제 저장 상태 기준이다: 같은 장면이라도 능력치가 오른 뒤에는 열린다', () => {
    const s = at('ev4_p_deal'); const n = currentNode(s) as ChoiceNode
    expect(visibleOptions(s, n, true).map((o) => o.key)).toEqual(['D'])
    const grown = clone(s); applyDelta(grown, 'stat', 'will', 20); applyDelta(grown, 'stat', 'social', 24)
    expect(visibleOptions(grown, n, true).map((o) => o.key)).toEqual(['A', 'C', 'D'])
    const saved = validateSave(JSON.parse(JSON.stringify({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: grown }))).state as GameState
    expect(visibleOptions(saved, n, true).map((o) => o.key)).toEqual(['A', 'C', 'D'])
  })
  it('모든 능력치 잠금 선택지에는 우회(잠기지 않는 선택)가 있고, 잠금 사유는 숫자 없는 자연어이며 수치가 노출되지 않는다', () => {
    let locks = 0
    for (const { id, n } of choiceNodes()) {
      const gated = n.options.filter((o) => o.req)
      if (!gated.length) continue
      locks += gated.length
      expect(n.options.some((o) => !o.req), `${id}/${n.id} 우회 선택 없음`).toBe(true)
      for (const o of gated) { expect(o.lock, `${id}${o.key}`).toBeTruthy(); expect(o.lock!).not.toMatch(/[0-9]/); expect(o.text).not.toMatch(/\d/) }
    }
    expect(locks).toBeGreaterThanOrEqual(9)
  })
  it('잠금 조건식은 모두 해석되고 존재하는 능력치만 쓴다', () => {
    const s = newState(START_SCENE, 1)
    for (const { id, n } of choiceNodes()) for (const o of n.options) { if (o.req) expect(() => evalCond(s, o.req!), `${id}${o.key}`).not.toThrow() }
  })
  it('지나친 반복 성장 방지: 소프트 캡 이후에는 한 번에 +1만 오른다', () => {
    const s = newState(START_SCENE, 1); s.stats.int = STAT_SOFT_CAP; applyDelta(s, 'stat', 'int', 5); expect(s.stats.int).toBe(STAT_SOFT_CAP + 1)
  })
})

describe('능력치 선택지 UI: 잠금 표시와 실행 조건이 일치한다', () => {
  const start = (s: GameState) => { act(() => { store.toTitle() }); render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }); setState(s); act(() => { vi.advanceTimersByTime(3000) }) }
  it('잠긴 선택지는 aria-disabled이고 눌러도 선택이 실행되지 않으며 사유만 보인다(클릭·Enter·Space·번호키)', () => {
    start(at('ev4_p_deal'))
    const a = screen.getByTestId('choice-A'); expect(a.getAttribute('aria-disabled')).toBe('true'); expect(screen.getByTestId('choice-D').getAttribute('aria-disabled')).toBeNull()
    const before = JSON.stringify(store.state)
    act(() => { fireEvent.click(a) }); expect(screen.getByTestId('lock-note').textContent).toMatch(/사교적/); expect(JSON.stringify(store.state)).toBe(before)
    act(() => { fireEvent.keyDown(a, { key: 'Enter' }) }); act(() => { fireEvent.keyDown(a, { key: ' ' }) }); expect(JSON.stringify(store.state)).toBe(before)
    act(() => { fireEvent.keyDown(window, { key: '1' }) }); expect(JSON.stringify(store.state)).toBe(before); expect(screen.getByTestId('lock-note')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByTestId('choice-D')) }); expect(store.state!.scene).not.toBe('ev4_p_deal')
  })
  it('능력치가 충족되면 같은 선택지가 열려 실행된다. 화면의 잠금 집합은 엔진 판정과 항상 같다', () => {
    for (const patch of [(s: GameState) => { s.stats.social = 12 }, (s: GameState) => { s.stats.social = 40 }, (s: GameState) => { s.stats.will = 33; s.stats.insight = 30 }]) {
      const s = at('ev4_p_deal', patch)
      cleanup(); start(s)
      const node = currentNode(s) as ChoiceNode
      for (const { opt, locked } of listOptions(s, node, true)) expect(screen.getByTestId(`choice-${opt.key}`).getAttribute('aria-disabled') === 'true', opt.key).toBe(locked)
    }
    cleanup(); start(at('ev4_p_deal', (s) => { s.stats.social = 40 }))
    act(() => { fireEvent.click(screen.getByTestId('choice-A')) }); expect(store.state!.flags.FLAG_C4_P_MEDIATE).toBe(true)
  })
  it('잠금 안내와 CSS: 잠금 스타일이 있고 포커스를 받을 수 있다(키보드·모바일 접근)', async () => {
    start(at('ev4_p_deal'))
    const a = screen.getByTestId('choice-A'); expect(a.getAttribute('tabindex')).toBe('0'); expect(a.getAttribute('role')).toBe('button')
    // @ts-expect-error node 내장 모듈(타입 패키지 없음)
    const { readFileSync } = await import('node:fs'); const css = readFileSync('src/styles.css', 'utf8')
    expect(css).toMatch(/\.choice\.locked \{[^}]*cursor: not-allowed/)
  })
})

describe('행동의 사회적 파급: 목격과 전언', () => {
  it('직접 본 사람과 전해 들은 사람을 구분하고, 전언은 출처와 과장 여부를 기록한다', () => {
    const s = at('ev4_h_ledger'); const n = clone(s)
    const after = choose(Object.assign(n, { stats: { ...n.stats, social: 40 } }), 'C')
    expect(after.deeds!.h_aid.saw).toEqual(['hermione'])
    expect(evalCond(after, 'WIT_h_aid_hermione')).toBe(true)
    expect(evalCond(after, 'WIT_h_aid_ron')).toBe(false) // 목격하지 않은 사람은 즉시 반응하지 않는다
    expect(evalCond(after, 'HEARD_h_aid_ron')).toBe(true); expect(after.deeds!.h_aid.heard.ron.from).toBe('hermione'); expect(evalCond(after, 'EXAG_h_aid_ron')).toBe(false)
    expect(evalCond(after, 'EXAG_h_aid_pansy')).toBe(true) // 소문을 거친 전언은 부풀려졌을 수 있다
    expect(evalCond(after, 'WIT_h_aid_pansy')).toBe(false); expect(evalCond(after, 'KNOWS_h_aid_pansy')).toBe(true)
    expect(evalCond(after, 'DEED_h_logic')).toBe(false)
  })
  it('직접 목격한 사람은 전언 기록으로 덮어쓰이지 않는다', () => {
    const s = at('ev4_h_ledger'); applyDeed(s, ['deed:x@ron', 'hear:x:ron:gossip:ex'])
    expect(evalCond(s, 'WIT_x_ron')).toBe(true); expect(evalCond(s, 'HEARD_x_ron')).toBe(false)
  })
  it('같은 행동(보호 마법)을 보고도 지니의 반응은 해리의 이력에 따라 서로 다른 감정·후속 플래그로 갈린다', () => {
    const base = (flags: string[]) => at('ev4_g_epilogue', (s) => { Object.assign(s.flags, Object.fromEntries(flags.map((f) => [f, true]))); applyDeed(s, ['deed:g_ward@hooch,ginny', 'hear:g_ward:ron:ginny']); s.flags.FLAG_C4_G_WARDED = true })
    const finish = (s: GameState) => { let t = s; for (let i = 0; i < 40 && t.mode !== 'ROUTINE' && t.mode !== 'ENDED'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
    const ok = finish(base(['FLAG_P3_B2_FACTS'])); const bad = finish(base(['FLAG_P3_B2_SIDED_RON']))
    expect(ok.flags.FLAG_C4_G_WARD_OK).toBe(true); expect(bad.flags.FLAG_C4_G_WARD_RESENT).toBe(true)
    expect(ok.emotions.ginny.trust).toBeGreaterThan(bad.emotions.ginny.trust); expect(bad.emotions.ginny.wariness).toBeGreaterThan(ok.emotions.ginny.wariness)
  })
  it('같은 거래를 보고도 판시는 접근에 따라 흥미·경계·체면을 다르게 해석한다(호감 일괄 상승이 아니다)', () => {
    const run4 = (key: string, patch: (s: GameState) => void) => { let s = at('ev4_p_deal', patch); s = choose(s, key); for (let i = 0; i < 40 && s.scene !== 'ev4_p_after' && s.mode !== 'ROUTINE'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else break } return s }
    const med = run4('A', (s) => { s.stats.social = 40 }); const rd = run4('B', (s) => { s.stats.insight = 40 }); const hold = run4('C', (s) => { s.stats.will = 40 }); const back = run4('D', () => {})
    expect(med.flags.FLAG_C4_P_DEAL_OK && rd.flags.FLAG_C4_P_DEAL_OK && hold.flags.FLAG_C4_P_DEAL_FAIL && back.flags.FLAG_C4_P_DEAL_HALF).toBe(true)
    expect(rd.flags.FLAG_C4_P_INTRIGUED).toBe(true); expect(hold.flags.FLAG_C4_P_RUMOR).toBe(true)
    expect(evalCond(hold, 'EXAG_p_hold_ron')).toBe(true); expect(evalCond(med, 'EXAG_p_mediate_ron')).toBe(false)
    expect(new Set([med, rd, hold, back].map((x) => `${x.emotions.pansy.trust}/${x.emotions.pansy.wariness}`)).size).toBeGreaterThanOrEqual(3)
  })
  it('같은 장부 사건에서 접근별로 헤르미온느의 신뢰·경계가 서로 다르게 쌓인다', () => {
    const run4 = (key: string, patch: (s: GameState) => void) => { let s = at('ev4_h_ledger', patch); s = choose(s, key); for (let i = 0; i < 40; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else break } return s }
    const a = run4('A', (s) => { s.stats.int = 45 }); const b = run4('B', (s) => { s.stats.insight = 40 }); const c = run4('C', (s) => { s.stats.social = 40 }); const d = run4('D', () => {})
    expect(new Set([a, b, c, d].map((x) => `${x.emotions.hermione.trust}/${x.emotions.hermione.wariness}`)).size).toBeGreaterThanOrEqual(3)
    expect(d.flags.FLAG_C4_H_LEAVE).toBe(true); expect(d.deeds!.h_logic).toBeUndefined() // 맡기면 능력 행동 기록이 남지 않는다
  })
  it('근거가 없으면 교수님께 가져가는 선택(C4-09 B)은 잠기고, 있으면 열린다(플래그 조합 잠금)', () => {
    const none = at('ev4_h_scope'); const n = currentNode(none) as ChoiceNode
    expect(visibleOptions(none, n, true).map((o) => o.key)).toEqual(['A', 'C'])
    const some = at('ev4_h_scope', (s) => { s.flags.FLAG_C4_H_TRACE = true })
    expect(visibleOptions(some, n, true).map((o) => o.key)).toEqual(['A', 'B', 'C'])
  })
})

const applyDeed = (s: GameState, fx: string[]) => applyEffects(s, fx)

describe('Ch4 H·P·G·L 능력 경로: 자연 도달(일과 활동으로 능력치를 키운 플레이)', () => {
  const R: Record<string, Out[]> = {}
  const STY = ['H', 'HI', 'HC', 'HD', 'P', 'PI', 'PW', 'PD', 'GM', 'LI']
  beforeAll(() => {
    setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS)
    for (const st of STY) R[st] = Array.from({ length: 8 }, (_, i) => simulate2(st, i + 1, 'ch2_end', 4))
    const ev: Record<string, string> = { H: 'ev4_h_ledger', HI: 'ev4_h_ledger', HC: 'ev4_h_ledger', HD: 'ev4_h_ledger', P: 'ev4_p_deal', PI: 'ev4_p_deal', PW: 'ev4_p_deal', PD: 'ev4_p_deal', GM: 'ev4_g_trial', LI: 'ev4_l_stair' }
    const rep: Record<string, unknown> = {}
    for (const st of STY) { const on = R[st].filter((o) => o.scenes.has(ev[st])); rep[st] = { '사건에 선 플레이': `${on.length}/8`, '사건 직전 능력치': on.map((o) => { const x = o.snaps[ev[st]].stats; return `i${x.int}/in${x.insight}/s${x.social}/w${x.will}/m${x.magic}` }).slice(0, 2) } }
    console.log('[능력 해금 활동 경로]', JSON.stringify(rep))
  })
  afterAll(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })
  const on = (st: string, scene: string) => R[st].filter((o) => o.scenes.has(scene))
  const key = (o: Out, id: string) => o.s.choices.find((c) => c.id === id)?.option

  it('각 경로에 사건에 선 자연 플레이가 충분하다(8시드 중 4 이상)', () => {
    const ev: Record<string, string> = { H: 'ev4_h_ledger', HI: 'ev4_h_ledger', HC: 'ev4_h_ledger', HD: 'ev4_h_ledger', P: 'ev4_p_deal', PI: 'ev4_p_deal', PW: 'ev4_p_deal', PD: 'ev4_p_deal', GM: 'ev4_g_trial', LI: 'ev4_l_stair' }
    for (const st of STY) expect(on(st, ev[st]).length, st).toBeGreaterThanOrEqual(4)
  })
  it('지능·통찰·사교로 키운 플레이는 H의 해금 선택(A·B·C)을 실제로 열고 골랐다(강제 상태 아님)', () => {
    for (const [st, k, stat] of [['H', 'A', 'int'], ['HI', 'B', 'insight'], ['HC', 'C', 'social']] as const) {
      const runs = on(st, 'ev4_h_ledger'); const unlocked = runs.filter((o) => key(o, 'C4-08') === k)
      expect(unlocked.length, `${st}:${k}`).toBeGreaterThanOrEqual(2)
      for (const o of unlocked) { const s0 = o.snaps.ev4_h_ledger; expect(evalCond(s0, { A: 'stat.int>=38 || (FLAG_P3_A2_PAGE && stat.int>=30)', B: 'stat.insight>=28 || (KN_BORROW_PATTERN && stat.insight>=22)', C: 'stat.social>=30' }[k]), `${st} ${stat}`).toBe(true) }
    }
  })
  it('능력치를 키우지 않은 플레이(HD·PD)도 일반 선택으로 같은 사건을 끝까지 마친다(우회 경로)', () => {
    for (const st of ['HD', 'PD']) { for (const o of on(st, st === 'HD' ? 'ev4_h_ledger' : 'ev4_p_deal')) { expect(o.ended).toBe(true); expect(key(o, st === 'HD' ? 'C4-08' : 'C4-10')).toBe('D') } }
  })
  it('P: 사교·통찰·의지로 키운 플레이가 해금 선택 A·B·C를 연다', () => {
    for (const [st, k] of [['P', 'A'], ['PI', 'B'], ['PW', 'C']] as const) {
      const unlocked = on(st, 'ev4_p_deal').filter((o) => key(o, 'C4-10') === k); expect(unlocked.length, `${st}:${k}`).toBeGreaterThanOrEqual(2)
      for (const o of unlocked) expect(evalCond(o.snaps.ev4_p_deal, { A: 'stat.social>=30 || (FLAG_P3_D2_ASK_OWN && stat.social>=24)', B: 'stat.insight>=28 || (KN_COURIER_SEAL && stat.insight>=22)', C: 'stat.will>=30' }[k])).toBe(true)
    }
  })
  it('G(마법 숙련 보호 마법)·L(통찰로 소리 짚기) 능력 선택이 자연 도달한다', () => {
    expect(on('GM', 'ev4_g_trial').filter((o) => key(o, 'C4-01') === 'D').length).toBeGreaterThanOrEqual(2)
    expect(on('LI', 'ev4_l_stair').filter((o) => key(o, 'C4-03') === 'D').length).toBeGreaterThanOrEqual(2)
    for (const o of on('GM', 'ev4_g_trial')) if (key(o, 'C4-01') === 'D') { expect(o.s.flags.FLAG_C4_G_WARDED).toBe(true); expect(o.s.flags.FLAG_C4_G_WARD_OK || o.s.flags.FLAG_C4_G_WARD_RESENT).toBe(true); expect(o.s.deeds!.g_ward.saw).toEqual(['hooch', 'ginny']) }
    for (const o of on('LI', 'ev4_l_stair')) if (key(o, 'C4-03') === 'D') { expect(o.s.knowledge.OB_NOTE_TIN).toBeFalsy(); expect(o.s.knowledge.KN_ROOM_RULE).toBe(true) } // 올라가지 않았으므로 직접 본 것은 없다
  })
  it('H·P 경로가 챕터 4 종료(→ch5_open)까지 도달하고 드레이코와 접촉하지 않으며 시간이 거꾸로 가지 않는다', () => {
    const has = (id: string) => (SCENARIO[id] ?? []).some((n: Node) => (n.t === 'show' && n.char === 'draco') || (n.t === 'line' && /드레이코|말포이/.test(n.who ?? '')))
    for (const st of ['H', 'HI', 'HC', 'HD', 'P', 'PI', 'PW', 'PD']) for (const o of R[st]) {
      if (!o.scenes.has(st.startsWith('H') ? 'ev4_h_ledger' : 'ev4_p_deal')) continue
      const e = currentNode(o.s); expect(o.ended && e?.t === 'endChapter' && e.next, st).toBe('ch5_open')
      const l = [...o.scenes]; for (const sc of l.slice(l.findIndex((x) => x === 'ch4_h_after' || x === 'ch4_p_after'))) expect(has(sc), `${st}:${sc}`).toBe(false)
      expect(o.s.choices.some((c) => c.id === 'K-08' || c.id === 'S-04')).toBe(false)
      const seq = o.dates.slice(o.dates.indexOf('11-03')).map((d) => { const [m, dd] = d.split('-').map(Number); return (m >= 9 ? m - 9 : m + 3) * 31 + dd }); for (let k = 1; k < seq.length; k++) expect(seq[k]).toBeGreaterThanOrEqual(seq[k - 1])
    }
  })
  it('가지 않은 H·P도 독립적으로 진행된다(settle): G·L·W 경로에 결과 플래그가 남는다', () => {
    const att = (arr: Out[], sc: string) => arr.filter((o) => o.scenes.has(sc))
    for (const o of att(R.GM, 'ev4_g_trial').concat(att(R.LI, 'ev4_l_stair'))) { expect(o.s.flags.FLAG_C4_H_OFFSTAGE).toBe(true); expect(o.s.flags.FLAG_C4_P_OFFSTAGE).toBe(true) }
    for (const o of att(R.H, 'ev4_h_ledger').concat(att(R.HD, 'ev4_h_ledger'))) { expect(o.s.flags.FLAG_C4_P_OFFSTAGE).toBe(true); expect(o.s.flags.FLAG_C4_H_OFFSTAGE).toBeFalsy() }
    for (const o of att(R.P, 'ev4_p_deal').concat(att(R.PD, 'ev4_p_deal'))) { expect(o.s.flags.FLAG_C4_H_OFFSTAGE).toBe(true); expect(o.s.flags.FLAG_C4_P_OFFSTAGE).toBeFalsy() }
  })
  it('지식 누출 방지: H·P에서는 7층 벽·쪽지 상자 정보를 새로 얻지 않는다', () => {
    for (const st of ['H', 'HD', 'P', 'PD']) for (const o of R[st]) for (const k of ['KN_ROOM_RULE', 'OB_NOTE_TIN']) expect(o.s.knowledge[k], `${st} ${k}`).toBeFalsy()
  })
  it('저장→불러오기: 사건 직후 저장해도 목격·전언 기록과 결과가 유지된다', () => {
    const o = on('HC', 'ev4_h_ledger').find((x) => key(x, 'C4-08') === 'C')!
    const back = validateSave(JSON.parse(JSON.stringify({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: o.s }))).state as GameState
    expect(back.deeds).toEqual(o.s.deeds); expect(back.seen).toEqual(o.s.seen)
    const old = clone(o.s) as Partial<GameState>; delete old.deeds; delete old.seen
    const back2 = validateSave(JSON.parse(JSON.stringify({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: old }))).state as GameState
    expect(back2.deeds).toEqual({}); expect(back2.seen).toEqual({})
  })
  it('챕터 5 첫 장면이 능력 행동의 결과(목격·전언 포함)에 따라 달라진다', () => {
    const o = on('H', 'ev4_h_ledger')[0]
    const lines = (flags: string[], deeds: string[] = []) => { const s = run(clone(o.s)); for (const k of Object.keys(s.flags)) if (/^FLAG_C4_/.test(k)) delete s.flags[k]; s.deeds = {}; for (const f of flags) s.flags[f] = true; applyDeed(s, deeds); let t = continueChapter(s); const out: string[] = []; for (let i = 0; i < 80 && t.scene === 'ch5_open'; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
    const base = lines([])
    for (const f of ['FLAG_C4_H_JOINT_INVITE', 'FLAG_C4_H_PINCE_ACTS', 'FLAG_C4_H_MCG_WATCH', 'FLAG_C4_H_HOLD_DONE', 'FLAG_C4_P_INVITE', 'FLAG_C4_P_READ', 'FLAG_C4_P_RUMOR', 'FLAG_C4_G_WARD_OK', 'FLAG_C4_G_WARD_RESENT', 'FLAG_C4_L_LISTEN']) expect(lines([f]), f).not.toBe(base)
    expect(lines([], ['deed:h_aid@hermione', 'hear:h_aid:ron:hermione'])).not.toBe(base)
    expect(lines([], ['deed:p_hold@pansy', 'hear:p_hold:ron:gossip:ex'])).not.toBe(base)
    expect(lines([], ['deed:g_ward@hooch,ginny', 'hear:g_ward:ron:ginny'])).not.toBe(base)
  })
})

describe('수첩 연동: 직접 관찰한 표정·맥락만 기록한다', () => {
  const hermionePage = (s: GameState) => buildJournal(s).find((p) => p.id === 'hermione')
  it('목격한 능력 행동은 인물 기록의 직접 본 것에 남고, 목격하지 않은 사건은 기록되지 않는다', () => {
    const none = newState(START_SCENE, 1); none.bonds!.hermione.seen = 1
    const s = clone(none); applyDeed(s, ['deed:h_logic@hermione'])
    const all = (st: GameState) => JSON.stringify(buildJournal(st))
    expect(all(none)).not.toContain('도장 날짜가 근무표와 어긋나는'); expect(all(s)).toContain('도장 날짜가 근무표와 어긋나는')
    const seenOnly = hermionePage(s)
    if (seenOnly) expect(seenOnly.observed.some((t) => t.includes('도장 날짜'))).toBe(true)
  })
  it('전해 들은 이야기는 "들은 이야기"로 구분되고(출처 표시) 과장 가능성이 적힌다', () => {
    const s = newState(START_SCENE, 1); s.bonds!.pansy.seen = 1; s.flags.FLAG_C4_P_ATT = true
    applyDeed(s, ['deed:p_hold@pansy,sadler', 'hear:p_hold:ron:gossip:ex'])
    const page = buildJournal(s).find((p) => p.id === 'pansy')
    if (page) { expect(page.recent.join('')).toContain('들은 이야기'); expect(page.recent.join('')).toContain('부풀려졌을 수 있다'); expect(page.observed.join('')).not.toContain('주먹') }
  })
  it('초상화는 해리가 마지막으로 본 표정과 목격 맥락(note)을 쓰고, 새 관찰이 오면 갱신되며 호감도로 표정을 정하지 않는다', () => {
    const s = at('ev4_h_a'); // show(hermione, interest, note) 이후 상태
    expect(s.seen!.hermione.expr).toBe('interest'); expect(s.seen!.hermione.note).toContain('어긋난 줄')
    const { container, rerender } = render(<Portrait state={s} id="hermione" />)
    expect(container.querySelector('[data-testid="j-portrait"]')!.getAttribute('data-expr')).toBe('interest'); expect(screen.getByTestId('j-note').textContent).toContain('어긋난 줄')
    const hi = clone(s); hi.emotions.hermione.affinity = 99; rerender(<Portrait state={hi} id="hermione" />)
    expect(screen.getByTestId('j-expr').textContent).toBe('흥미')
    const next = at('ev4_h_scope_b'); rerender(<Portrait state={next} id="hermione" />)
    expect(screen.getByTestId('j-expr').textContent).toBe('불안'); expect(screen.getByTestId('j-note').textContent).toContain('교수님께')
  })
  it('관찰하지 않은 인물의 표정은 기록되지 않는다(전지적 기록 금지)', () => {
    const s = at('ev4_p_deal'); expect(s.seen!.pansy).toBeTruthy(); expect(s.seen!.hermione).toBeUndefined(); expect(s.seen!.ginny).toBeUndefined()
  })
  it('캘린더: H·P 사건은 G·L과 같은 시간대·다른 장소이며 게시판에 인물 이름이 없다', () => {
    const ev = CALENDAR.filter((e) => /^ap4_/.test(e.id)); expect(ev.map((e) => e.id).sort()).toEqual(['ap4_g_trial', 'ap4_h_ledger', 'ap4_l_stair', 'ap4_p_deal'])
    expect(new Set(ev.map((e) => e.slots.join())).size).toBe(1); expect(new Set(ev.map((e) => e.date)).size).toBe(1); expect(new Set(ev.map((e) => e.place)).size).toBe(4)
    for (const e of ev) expect(e.title + e.notice).not.toMatch(/헤르미온느|판시|지니|루나|말포이/)
  })
  it('H·P 장면의 모든 이동 대상이 존재하고 새 선택 ID C4-08~C4-10이 겹치지 않는다', () => {
    const ids: string[] = []
    for (const [id, nodes] of Object.entries(SCENARIO)) for (const n of nodes) { if (n.t === 'choice' && id in V2C4H) ids.push(n.id)
      if (id in V2C4H || id in V2C4X) { if (n.t === 'goto') expect(SCENARIO[n.scene], `${id}→${n.scene}`).toBeTruthy(); if (n.t === 'choice') n.options.forEach((o) => expect(SCENARIO[o.goto!], `${id}${o.key}`).toBeTruthy()) } }
    expect(ids.sort()).toEqual(['C4-08', 'C4-09', 'C4-10'])
  })
})

describe('시간 건너뛰기는 능력치를 주지 않는다(기회비용 유지)', () => {
  it('지도 활동은 능력치를 올리고 그 칸을 쓰며, 같은 칸의 행사는 하나만 갈 수 있다', () => {
    const s = clone(simulate2('H', 1, 'ch4_routine', 4).snaps.ch4_routine) as GameState
    let t = s; for (let i = 0; i < 30 && t.mode !== 'ROUTINE'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break }
    expect(t.mode).toBe('ROUTINE')
    const study = listActions(t, 'library').find((a) => a.actId === 'study' && a.ok)
    if (study) { const u = pickActivity(t, 'library', 'study'); expect(u.stats.int).toBeGreaterThan(t.stats.int) }
  })
})
