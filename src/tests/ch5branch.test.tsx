import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { advance, applyEffects, choose, clone, continueChapter, currentNode, listOptions, newState, run, setActivityScenes, setIncidents, setRandomEvents, visibleOptions } from '../engine/core'
import { evalCond } from '../engine/cond'
import { validateSave } from '../engine/save'
import { buildJournal } from '../data/journal'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { INCIDENTS } from '../data/incidents'
import { CALENDAR } from '../data/calendar'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { V2C5X } from '../data/v2c5x'
import { simulate2, type Out } from './ch2sim'
import type { ChoiceNode, GameState, Node } from '../engine/types'
import './helpers'

/**
 * 챕터 5 확장(C5-01~C5-05) 검증. 자연 도달 = 능력치를 키우는 일과 정책(statPolicy)으로 챕터 1부터 플레이한 결과만 센다.
 * 강제 상태(flags/stats를 직접 지정한 at())는 인물 반응의 변형 비교용이며 자연 도달로 보고하지 않는다.
 */
const at = (scene: string, patch: (s: GameState) => void = () => {}) => {
  const s = newState(START_SCENE, 1); s.scene = scene; s.idx = 0; s.mode = /^ev/.test(scene) ? 'EVENT' : 'STORY'; s.chapter = 5
  if (/^ev/.test(scene)) s.routine = { days: [{ date: '11-17', weekday: '일' }], dayIdx: 0, slotIdx: 2, night: false, then: 'ch5_gate', locations: [], encounters: {}, pendingDone: false, message: null }
  patch(s); let t = run(s); for (let i = 0; i < 80; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t
}
const lines = (scene: string, patch: (s: GameState) => void = () => {}) => { const s = newState(START_SCENE, 1); s.scene = scene; s.idx = 0; s.mode = /^ev/.test(scene) ? 'EVENT' : 'STORY'; s.chapter = 5; patch(s); let t = run(s); const out: string[] = []; for (let i = 0; i < 80; i++) { const n = currentNode(t); if (n?.t === 'line' && t.scene === scene) { out.push(n.text); t = advance(t) } else break } return out.join('|') }
const hasDraco = (id: string) => (SCENARIO[id] ?? []).some((n: Node) => (n.t === 'show' && n.char === 'draco') || (n.t === 'line' && /드레이코|말포이/.test(n.who ?? '')))
const withFlags = (...f: string[]) => (s: GameState) => { for (const k of f) s.flags[k] = true }

describe('챕터 5 확장: 구조', () => {
  it('새 장면의 이동 대상이 모두 존재하고 선택 ID C5-01~C5-05가 기존 ID와 겹치지 않는다', () => {
    const ids: string[] = []; const old = new Set<string>()
    for (const [id, nodes] of Object.entries(SCENARIO)) for (const n of nodes) {
      if (n.t === 'choice') { if (id in V2C5X) ids.push(n.id); else old.add(n.id) }
      if (id in V2C5X) {
        if (n.t === 'goto') expect(SCENARIO[n.scene], `${id}→${n.scene}`).toBeTruthy()
        if (n.t === 'if') { expect(SCENARIO[n.then]).toBeTruthy(); if (n.else) expect(SCENARIO[n.else]).toBeTruthy() }
        if (n.t === 'choice') n.options.forEach((o) => expect(SCENARIO[o.goto!], `${id}${o.key}`).toBeTruthy())
      }
    }
    expect([...ids].sort()).toEqual(['C5-01', 'C5-02', 'C5-03', 'C5-04', 'C5-05']); for (const i of ids) expect(old.has(i)).toBe(false)
    for (const i of ['K-09', 'K-10']) expect(old.has(i)).toBe(true)
  })
  it('세 사건은 같은 날짜·같은 시간대·다른 장소에 있고 게시판에 인물 이름이 없다(한 사건에만 설 수 있다)', () => {
    const ev = CALENDAR.filter((e) => /^ap5_/.test(e.id)); expect(ev.length).toBe(3)
    expect(new Set(ev.map((e) => e.date + e.slots.join())).size).toBe(1); expect(new Set(ev.map((e) => e.place)).size).toBe(3)
    for (const e of ev) { expect(e.title + e.notice).not.toMatch(/헤르미온느|판시|지니|루나|말포이|론|케이티/); expect(SCENARIO[e.scene]).toBeTruthy() }
  })
  it('능력치 특별 행동 선택지마다 잠기지 않는 일반 선택이 있고, 잠금 사유에 숫자가 없으며 조건식이 해석된다', () => {
    const s = newState(START_SCENE, 1); let locks = 0
    for (const [id, nodes] of Object.entries(V2C5X)) for (const n of nodes) if (n.t === 'choice') {
      const gated = n.options.filter((o) => o.req); locks += gated.length
      if (gated.length) expect(n.options.some((o) => !o.req), `${id}/${n.id}`).toBe(true)
      for (const o of gated) { expect(o.lock).toBeTruthy(); expect(o.lock!).not.toMatch(/[0-9]/); expect(() => evalCond(s, o.req!)).not.toThrow() }
    }
    expect(locks).toBeGreaterThanOrEqual(9)
  })
  it('기존 ch5 흐름은 유지된다: 케이티 사건(K-09)·K-10 선택·ch6_open 연결', () => {
    expect(SCENARIO.ch5_news_mild.some((n) => n.t === 'goto' && n.scene === 'ch5_dawn')).toBe(true)
    expect(SCENARIO.ch5_dawn.some((n) => n.t === 'choice' && n.options.some((o) => o.goto === 'ch5_ward'))).toBe(true)
    const last = SCENARIO.ch5_end[SCENARIO.ch5_end.length - 1]; expect(last.t === 'endChapter' && last.next).toBe('ch6_open')
  })
})

describe('챕터 5 확장: 능력 선택과 인물의 반응(변형 비교, 강제 상태)', () => {
  it('H: 같은 장부 사건이라도 Ch4의 초대·행동 이력에 따라 헤르미온느의 첫 말이 달라지고, 잠금은 활동으로 키운 능력치로 열린다', () => {
    const a = lines('ev5_h_chain', withFlags('FLAG_C4_H_JOINT_INVITE')), b = lines('ev5_h_chain'), c = lines('ev5_h_chain', withFlags('FLAG_C4_H_AID'))
    expect(new Set([a, b, c]).size).toBe(3)
    const lo = at('ev5_h_chain'); const n = currentNode(lo) as ChoiceNode
    expect(visibleOptions(lo, n, true).map((o) => o.key)).toEqual(['D'])
    const hi = at('ev5_h_chain', (s) => { s.stats.int = 50; s.stats.insight = 40; s.stats.social = 40 })
    expect(visibleOptions(hi, n, true).map((o) => o.key)).toEqual(['A', 'B', 'C', 'D'])
    const viaC4 = at('ev5_h_chain', (s) => { s.stats.int = 37; s.flags.FLAG_C4_H_LOGIC = true })
    expect(visibleOptions(viaC4, n, true).map((o) => o.key)).toContain('A') // Ch4에서 논리를 보인 사람은 문턱이 낮다(이력 조합)
  })
  it('H: 이름을 적자는 성급한 제안은 능력치와 무관하게 신뢰를 깎고, 판시에게 부풀려진 소문이 간다(목격하지 않은 사람은 전언으로만)', () => {
    const step = (s: GameState, key: string) => { let t = choose(s, key); for (let i = 0; i < 50; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
    const sc = at('ev5_h_scope'); const base = sc.emotions.hermione.trust
    const named = step(sc, 'C'); const narrow = step(sc, 'A')
    expect(named.emotions.hermione.trust).toBeLessThan(base); expect(narrow.emotions.hermione.trust).toBeGreaterThan(base)
    expect(evalCond(named, 'WIT_c5_h_named_hermione')).toBe(true); expect(evalCond(named, 'WIT_c5_h_named_pansy')).toBe(false)
    expect(evalCond(named, 'HEARD_c5_h_named_pansy') && evalCond(named, 'EXAG_c5_h_named_pansy')).toBe(true)
    expect(evalCond(narrow, 'DEED_c5_h_named')).toBe(false)
  })
  it('G: 같은 점검 마법도 지니가 "내 하늘에는 걸지 마"라고 했던 이력이 있으면 감사 대신 경계가, 없으면 신뢰가 쌓인다(같은 능력·다른 감정)', () => {
    const run4 = (flags: string[]) => { let s = at('ev5_g_team', (x) => { x.stats.magic = 60; withFlags(...flags)(x) }); s = choose(s, 'A'); for (let i = 0; i < 60 && s.scene !== 'ev5_g_vote' && s.mode !== 'ROUTINE'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else break } return s }
    const ok = run4([]); const resent = run4(['FLAG_C4_G_WARD_RESENT'])
    expect(ok.flags.FLAG_C5_G_SAFE && resent.flags.FLAG_C5_G_SAFE).toBe(true)
    expect(ok.emotions.ginny.trust).toBeGreaterThan(resent.emotions.ginny.trust); expect(resent.emotions.ginny.wariness).toBeGreaterThan(ok.emotions.ginny.wariness)
    expect(lines('ev5_g_team', withFlags('FLAG_C4_G_WARD_RESENT'))).not.toBe(lines('ev5_g_team', withFlags('FLAG_C4_G_WARD_OK')))
  })
  it('G: 보호 마법 점검의 목격자는 후치·지니·론이고 데멜자는 전언으로만 안다(즉시 반응하지 않는다)', () => {
    const s = at('ev5_g_team', (x) => { x.stats.magic = 60 }); const t = choose(s, 'A')
    expect(t.deeds!.c5_g_scan.saw).toEqual(['hooch', 'ginny', 'ron']); expect(evalCond(t, 'WIT_c5_g_scan_ron')).toBe(true)
    expect(t.deeds!.c5_g_scan.heard.demelza.from).toBe('ron'); expect(evalCond(t, 'KNOWS_c5_g_scan_pansy')).toBe(false)
  })
  it('R: 판시는 공개 반박을, 루나는 조용한 확인을 원한다: 해리의 선택에 따라 각자의 가치관이 서로 다르게 반응한다', () => {
    const run4 = (key: string, patch: (s: GameState) => void) => { let s = at('ev5_r_rumor', patch); s = choose(s, key); for (let i = 0; i < 80 && s.mode !== 'ROUTINE'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else break } return s }
    const tell = run4('A', (s) => { s.stats.insight = 40 }); const soft = run4('B', (s) => { s.stats.social = 44 }); const stamp = run4('C', (s) => { s.stats.int = 40; s.knowledge.OB_WRAPPER = true }); const half = run4('D', () => {})
    expect(tell.flags.FLAG_C5_R_CONTAINED && soft.flags.FLAG_C5_R_PROTECTED && stamp.flags.FLAG_C5_R_PUBLIC && half.flags.FLAG_C5_R_HALF).toBe(true)
    expect(stamp.emotions.pansy.trust).toBeGreaterThan(soft.emotions.pansy.trust); expect(stamp.emotions.luna.trust).toBeLessThan(soft.emotions.luna.trust) // 같은 해결이 한쪽에는 도움, 다른 쪽에는 불편
    expect(new Set([tell, soft, stamp, half].map((x) => `${x.emotions.pansy.trust}/${x.emotions.luna.trust}/${x.emotions.pansy.wariness}`)).size).toBeGreaterThanOrEqual(3)
  })
  it('R: 휴고는 직접 본 것과 들은 것을 구분한다. 루나가 따로 말해 주는 단서(KN_BARE_HAND)는 해리가 그녀의 관찰을 존중한 이력이 있을 때만 나온다', () => {
    const run4 = (patch: (s: GameState) => void) => { let s = at('ev5_r_rumor', (x) => { x.stats.insight = 40; patch(x) }); s = choose(s, 'A'); for (let i = 0; i < 80 && s.mode !== 'ROUTINE'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else break } return s }
    expect(run4(withFlags('FLAG_C4_L_LISTEN')).knowledge.KN_BARE_HAND).toBe(true)
    expect(run4(() => {}).knowledge.KN_BARE_HAND).toBeFalsy()
  })
  it('같은 관계 수치라도 이전 행동의 맥락이 다르면 반응이 달라진다(지니: 보호 마법 이력 OK vs RESENT)', () => {
    const a = (f: string) => lines('ch5_g_wrap', (s) => { s.emotions.ginny.trust = 50; s.flags.FLAG_C5_G_SCAN = true; s.flags[f] = true })
    expect(a('FLAG_C4_G_WARD_OK')).not.toBe(a('FLAG_C4_G_WARD_RESENT'))
  })
  it('론의 반응: 전언으로 들은 것만 인정과 경쟁심으로 나타난다(들은 적 없으면 없다)', () => {
    const base = lines('ch5_sunday'); const heard = lines('ch5_sunday', (s) => { applyEffects(s, ['deed:h_logic@hermione', 'hear:h_logic:ron:hermione']) })
    expect(heard).not.toBe(base); expect(heard).toContain('부럽더라'); expect(base).not.toContain('부럽더라')
  })
})

describe('챕터 5 확장: 자연 플레이(능력치를 키우는 일과로 챕터 1부터)', () => {
  const R: Record<string, Out[]> = {}
  const STY = ['H5A', 'H5B', 'H5C', 'H5D', 'G5A', 'G5B', 'G5C', 'G5D', 'R5A', 'R5B', 'R5C', 'R5D', 'W5']
  const evOf: Record<string, string> = { H: 'ev5_h_chain', G: 'ev5_g_team', R: 'ev5_r_rumor' }
  beforeAll(() => {
    setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS)
    for (const st of STY) R[st] = Array.from({ length: 6 }, (_, i) => simulate2(st, i + 1, 'ch2_end', 5))
    const rep: Record<string, unknown> = {}
    for (const st of STY.filter((x) => x !== 'W5')) { const ev = evOf[st[0]]; const on = R[st].filter((o) => o.scenes.has(ev)); rep[st] = { '사건에 선 플레이': `${on.length}/6`, '사건 직전 능력치': on.slice(0, 2).map((o) => { const x = o.snaps[ev].stats; return `i${x.int}/in${x.insight}/s${x.social}/m${x.magic}/str${x.str}` }) } }
    console.log('[챕터 5 능력 해금 활동 경로]', JSON.stringify(rep))
  })
  afterAll(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })
  const on = (st: string) => R[st].filter((o) => o.scenes.has(evOf[st[0]]))
  const key = (o: Out, id: string) => o.s.choices.find((c) => c.id === id)?.option

  it('모든 스타일이 챕터 5 종료 카드(→ch6_open)까지 도달하고, 각 사건에 선 자연 플레이가 충분하다(6시드 중 3 이상)', () => {
    for (const st of STY) for (const o of R[st]) { const e = currentNode(o.s); expect(o.ended && e?.t === 'endChapter' && e.next, st).toBe('ch6_open') }
    for (const st of STY.filter((x) => x !== 'W5')) expect(on(st).length, st).toBeGreaterThanOrEqual(3)
  })
  it('주요 사건 3개(H·G·R)가 서로 다른 장면 집합·절정·결산을 가진다', () => {
    const sets = ['H5A', 'G5A', 'R5A'].map((st) => [...on(st)[0].scenes].filter((x) => /^(ev5|ch5_[hgr]_)/.test(x)).join(','))
    expect(new Set(sets).size).toBe(3)
    for (const o of on('H5A')) expect(o.s.flags.FLAG_C5_H_ATT && !o.s.flags.FLAG_C5_G_ATT && !o.s.flags.FLAG_C5_R_ATT).toBe(true)
    for (const o of on('G5A')) expect(o.s.flags.FLAG_C5_G_PLAY_ON && o.s.flags.FLAG_C5_G_NEXT).toBe(true)
    for (const o of on('R5A')) expect(o.s.flags.FLAG_C5_R_NEXT && (o.s.flags.FLAG_C5_R_CONTAINED || o.s.flags.FLAG_C5_R_PROTECTED || o.s.flags.FLAG_C5_R_PUBLIC || o.s.flags.FLAG_C5_R_HALF)).toBeTruthy()
  })
  it('한 사건에 서면 다른 사건은 놓치지만 독립적으로 진행된다: 보드에는 하나만 남고 결과 플래그가 자동으로 정해진다', () => {
    for (const o of on('H5A')) { expect(o.s.board!.done.ap5_h_chain).toBeTruthy(); expect(o.s.board!.done.ap5_g_team).toBeFalsy(); expect(o.s.flags.FLAG_C5_G_OFFSTAGE && o.s.flags.FLAG_C5_R_OFFSTAGE).toBe(true) }
    for (const o of on('G5A')) { expect(o.s.board!.done.ap5_h_chain).toBeFalsy(); expect(o.s.flags.FLAG_C5_H_OFFSTAGE && o.s.flags.FLAG_C5_R_OFFSTAGE).toBe(true) }
    for (const o of on('R5A')) { expect(o.s.flags.FLAG_C5_H_OFFSTAGE && o.s.flags.FLAG_C5_G_OFFSTAGE).toBe(true) }
    for (const o of R.W5) { const l = [...o.scenes]; if (!l.some((x) => /^ev5_/.test(x))) expect(o.s.flags.FLAG_C5_H_OFFSTAGE && o.s.flags.FLAG_C5_G_OFFSTAGE && o.s.flags.FLAG_C5_R_OFFSTAGE).toBe(true) }
  })
  it('능력치 특별 행동이 활동 성장으로 실제 해금되어 고른 결과다(통찰·지능·사교·마법·체력)', () => {
    const cases: [string, string, string, string][] = [['H5A', 'C5-02', 'A', 'stat.int>=44 || (FLAG_C4_H_LOGIC && stat.int>=36)'], ['H5B', 'C5-02', 'B', 'stat.insight>=32 || (FLAG_C4_H_TRACE && stat.insight>=26)'], ['H5C', 'C5-02', 'C', 'stat.social>=36 || (FLAG_C4_H_AID && stat.social>=30)'], ['G5A', 'C5-04', 'A', 'stat.magic>=50'], ['G5B', 'C5-04', 'B', 'stat.str>=36'], ['G5C', 'C5-04', 'C', 'stat.social>=34 || (FLAG_C4_G_ALLY_DEMELZA && stat.social>=28)'], ['R5A', 'C5-05', 'A', 'stat.insight>=32 || (KN_COURIER_SEAL && stat.insight>=26)'], ['R5B', 'C5-05', 'B', 'stat.social>=36 || (FLAG_C4_P_MEDIATE && stat.social>=30)']]
    for (const [st, id, k, cond] of cases) {
      const picked = on(st).filter((o) => key(o, id) === k); expect(picked.length, `${st} ${id}${k}`).toBeGreaterThanOrEqual(1)
      for (const o of picked) expect(evalCond(o.snaps[evOf[st[0]]], cond), st).toBe(true)
    }
  })
  it('능력치를 키우지 않은 플레이(H5D·G5D·R5D)도 일반 선택으로 사건을 끝까지 마친다(진행이 능력치로 막히지 않는다)', () => {
    for (const [st, id] of [['H5D', 'C5-02'], ['G5D', 'C5-04'], ['R5D', 'C5-05']]) for (const o of on(st)) { expect(o.ended).toBe(true); expect(key(o, id)).toBe('D') }
  })
  it('드레이코 비접촉: C5-01 B(병동 앞에 가지 않음) → 사건 → K-10 B·D로 챕터 5를 마치는 동안 드레이코가 나오는 장면이 없다(우연한 일과 만남 제외)', () => {
    for (const st of STY.filter((x) => x !== 'W5')) for (const o of R[st]) {
      if (key(o, 'C5-01') !== 'B') continue
      const l = [...o.scenes]; const i = l.indexOf('ch5_dawn'); expect(i).toBeGreaterThanOrEqual(0)
      for (const sc of l.slice(i)) expect(hasDraco(sc) && !/^enc5_/.test(sc), `${st}:${sc}`).toBe(false)
      expect(l.includes('ch5_ward')).toBe(false); expect(['B', 'D']).toContain(key(o, 'K-10'))
    }
    expect(R.W5.some((o) => o.scenes.has('ch5_ward'))).toBe(true) // 대조: 병동 앞에 가면 드레이코와 마주친다
  })
  it('Ch4 결과가 Ch5 사건의 조건을 바꾼다: Ch4 G 경로의 보호 마법·재심 결과가 Ch5 지니 사건의 문장으로 이어진다', () => {
    const g = R.G5A.filter((o) => o.scenes.has('ev5_g_team'))
    const text = (o: Out) => lines('ev5_g_team', (s) => { Object.assign(s.flags, o.snaps.ev5_g_team.flags) })
    for (const o of g) expect(text(o)).toContain(o.s.flags.FLAG_C4_G_START || o.s.flags.FLAG_C4_G_BENCH ? (o.s.flags.FLAG_C4_G_BENCH ? '케이티 자리는 내가 맡을게' : '세 번째 추격수') : '')
  })
  it('시간순: 챕터 5의 달력은 11/16 → 11/17 → 11/18로 거꾸로 가지 않는다', () => {
    for (const st of STY) for (const o of R[st]) {
      const i = o.dates.indexOf('11-11'); const seq = o.dates.slice(i).map((d) => { const [m, dd] = d.split('-').map(Number); return (m >= 9 ? m - 9 : m + 3) * 31 + dd })
      for (let k = 1; k < seq.length; k++) expect(seq[k], `${st} ${o.dates.slice(i).join('>')}`).toBeGreaterThanOrEqual(seq[k - 1])
    }
  })
  it('저장→불러오기: 사건 직후·결산 직전 저장해도 같은 결과로 끝난다', () => {
    const o = on('H5A')[0]
    const back = validateSave(JSON.parse(JSON.stringify({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: o.s }))).state as GameState
    expect(back.deeds).toEqual(o.s.deeds); expect(back.seen).toEqual(o.s.seen); expect(back.flags).toEqual(o.s.flags)
    const mid = clone(o.snaps.ch5_h_wrap); const b2 = validateSave(JSON.parse(JSON.stringify({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: mid }))).state as GameState
    const fin = (s: GameState) => { let t = s; for (let i = 0; i < 400 && t.mode !== 'ENDED'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else if (n?.t === 'choice') t = choose(t, visibleOptions(t, n, true).find((x) => x.key === 'B')?.key ?? visibleOptions(t, n, true)[0].key); else break } return t }
    const x = fin(clone(mid)), y = fin(b2); expect(JSON.stringify(y.flags)).toBe(JSON.stringify(x.flags)); expect(y.scene).toBe(x.scene)
  })
  it('챕터 6 첫 장면이 챕터 5의 결과(후속 행동·거절·경계)에 따라 달라진다', () => {
    const o = on('H5A')[0]
    const l = (flags: string[]) => { const s = run(clone(o.s)); for (const k of Object.keys(s.flags)) if (/^(FLAG_C5_|KN_BARE)/.test(k)) delete s.flags[k]; delete s.knowledge.KN_BARE_HAND; for (const f of flags) s.flags[f] = true; let t = continueChapter(s); const out: string[] = []; for (let i = 0; i < 80 && t.scene === 'ch6_open'; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
    const base = l([]); for (const f of [['FLAG_C5_H_NEXT'], ['FLAG_C5_H_NEXT', 'FLAG_C5_H_NAMED'], ['FLAG_C5_G_DRILL'], ['FLAG_C5_G_PLAY_ON'], ['FLAG_C5_R_NEXT']]) expect(l(f), f.join()).not.toBe(base)
  })
})

describe('수첩 연동(챕터 5)', () => {
  it('목격한 능력 행동은 직접 본 것에, 소문으로 들은 것은 "들은 이야기"(부풀려졌을 수 있다)로 구분되고 관찰하지 않은 일은 기록되지 않는다', () => {
    const base = newState(START_SCENE, 1); base.bonds!.hermione.seen = 1; base.bonds!.pansy.seen = 1
    const seen = clone(base); applyEffects(seen, ['deed:c5_h_named@hermione', 'hear:c5_h_named:pansy:gossip:ex'])
    const text = (s: GameState, id: string) => JSON.stringify(buildJournal(s).find((p) => p.id === id))
    expect(text(base, 'hermione')).not.toContain('특정 인물 지목 없음'); expect(text(seen, 'hermione')).toContain('특정 인물 지목 없음')
    expect(text(base, 'pansy')).not.toContain('부풀려졌을 수 있다'); expect(text(seen, 'pansy')).toContain('부풀려졌을 수 있다')
    const page = buildJournal(seen).find((p) => p.id === 'pansy')!; expect(page.observed.join('')).not.toContain('슬리데린 학생의 이름')
  })
  it('가지 않은 사건의 결과는 인물이 먼저 말해 준 뒤(OFFSTAGE)에만 들은 이야기로 남는다', () => {
    const s = newState(START_SCENE, 1); s.bonds!.hermione.seen = 1
    expect(JSON.stringify(buildJournal(s).find((p) => p.id === 'hermione'))).not.toContain('혼자 시간표를 끝내')
    s.flags.FLAG_C5_H_OFFSTAGE = true; expect(JSON.stringify(buildJournal(s).find((p) => p.id === 'hermione'))).toContain('들은 이야기(본인에게서)')
  })
  it('초상화는 해리가 마지막으로 본 표정과 목격 맥락만 쓰고, 새 관찰이 오면 갱신된다(호감도로 바꾸지 않는다)', () => {
    const a = at('ev5_h_a'); expect(a.seen!.hermione.expr).toBe('interest'); expect(a.seen!.hermione.note).toContain('마지막 전달 칸')
    const c = at('ev5_h_scope_c'); expect(c.seen!.hermione.expr).toBe('angry'); expect(c.seen!.hermione.note).toContain('이름을 적자고')
    const hi = clone(c); hi.emotions.hermione.affinity = 99; expect(hi.seen!.hermione.expr).toBe('angry')
    expect(at('ev5_r_rumor').seen!.hermione).toBeUndefined()
  })
  it('잠금 선택지 UI 확인용: 능력치가 부족한 상태의 C5-05에는 일반 선택 D만 실행 가능하고 나머지는 잠김으로 목록에 남는다', () => {
    const s = at('ev5_r_rumor'); const n = currentNode(s) as ChoiceNode
    expect(listOptions(s, n, true).map((x) => `${x.opt.key}:${x.locked ? 'L' : 'O'}`)).toEqual(['A:L', 'B:L', 'C:L', 'D:O'])
  })
})
