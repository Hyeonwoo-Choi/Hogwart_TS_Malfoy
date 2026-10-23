import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { advance, choose, clone, continueChapter, currentNode, listActions, newState, pickActivity, run, setActivityScenes, setIncidents, setRandomEvents, visibleOptions } from '../engine/core'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { INCIDENTS } from '../data/incidents'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { V2C3X } from '../data/v2c3x'
import { V2C4X } from '../data/v2c4x'
import { CALENDAR } from '../data/calendar'
import { dayIndex, evalCond } from '../engine/cond'
import { validateSave } from '../engine/save'
import { simulate2, type Out } from './ch2sim'
import type { GameState, Node } from '../engine/types'
import './helpers'

/**
 * 챕터 3 2차 사건(W-11~W-15)과 챕터 4 관심 사건 분기(C4-01~C4-07) 검증.
 * 자동 테스트는 도달·상태·시간순·누출 방지·저장 호환 같은 구조를 증명하며 서사 품질은 증명하지 않는다.
 * 일부 결과 변형(어깨 상태 등)은 챕터 3 플래그를 직접 지정해 만든 상태에서 이어서 플레이해 확인한다(자연 도달은 시드 분포로 따로 센다).
 */
const mkOut = (style: string, seed: number, through: number) => simulate2(style, seed, 'ch2_end', through)
const textOf = (id: string) => (SCENARIO[id] ?? []).filter((n) => n.t === 'line').map((n) => (n as { text: string }).text).join('\n')
const hasDraco = (id: string) => (SCENARIO[id] ?? []).some((n: Node) => (n.t === 'show' && n.char === 'draco') || (n.t === 'line' && (n.who === '드레이코' || /말포이|드레이코/.test(n.who ?? ''))))

/** 주어진 상태에서 챕터 4 종료 카드까지 이어서 플레이한다(plan: 선택 ID → 키, 없으면 첫 선택지) */
function finish(s0: GameState, plan: Record<string, string> = {}, until?: (s: GameState) => boolean) {
  let s = clone(s0); const scenes: string[] = []
  for (let i = 0; i < 4000; i++) {
    if (until?.(s)) break
    if (s.mode === 'ENDED') break
    if (s.mode === 'ROUTINE') { // 사건이 끝나면 남은 일과를 짧은 활동으로 보낸다(사건·긴 활동은 고르지 않는다)
      let pick: [string, string] | undefined
      for (const loc of s.routine!.locations) for (const a of listActions(s, loc)) if (!pick && a.ok && a.dur === 1 && !a.actId.startsWith('ev:')) pick = [loc, a.actId]
      s = pickActivity(s, pick![0], pick![1]); continue
    }
    if (scenes[scenes.length - 1] !== s.scene) scenes.push(s.scene)
    const n = currentNode(s)
    if (n?.t === 'line') s = advance(s)
    else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, (v.find((o) => o.key === plan[n.id]) ?? v[0]).key) }
    else break
  }
  return { s, scenes }
}

describe('챕터 3 2차 사건(W-11~W-15)', () => {
  it('이동 대상이 모두 존재하고 선택 ID가 기존 ID와 겹치지 않으며, 사건마다 3지선다·END로 일과에 돌아간다', () => {
    const old = new Set<string>(); const fresh: string[] = []
    for (const [id, nodes] of Object.entries(SCENARIO)) for (const n of nodes) if (n.t === 'choice') { if (id in V2C3X) fresh.push(n.id); else old.add(n.id) }
    expect(fresh.sort()).toEqual(['W-11', 'W-12', 'W-13', 'W-14', 'W-15'])
    for (const f of fresh) expect(old.has(f)).toBe(false)
    for (const [id, nodes] of Object.entries(V2C3X)) {
      for (const n of nodes) {
        if (n.t === 'choice') { expect(n.options.length, id).toBe(3); for (const o of n.options) expect(SCENARIO[o.goto!], `${id}${o.key}`).toBeTruthy() }
        if (n.t === 'goto') expect(SCENARIO[n.scene]).toBeTruthy()
      }
      expect(nodes[nodes.length - 1].t === 'end' || nodes[nodes.length - 1].t === 'choice', id).toBe(true)
    }
  })
  it('캘린더: 5개 2차 사건은 10/3 오후1, 각자의 경로 조건에서만 열리고 제목·공지에 인물 이름이 없다', () => {
    const names = /헤르미온느|그레인저|지니|위즐리|루나|러브굿|판시|파킨슨|말포이|드레이코|론/
    for (const e of CALENDAR.filter((x) => /^ap3_(a_appeal|b_shoulder|c_chalk|d_reply|e_ron)$/.test(x.id))) {
      expect(e.date).toBe('10-03'); expect(e.slots).toEqual([0]); expect(e.cond).toMatch(/^FLAG_P3_[A-E]$/)
      expect(e.title).not.toMatch(names); expect(e.notice).not.toMatch(names)
      expect(SCENARIO[e.scene]).toBeTruthy()
    }
  })
  it('같은 사건이어도 1차 행사 결과에 따라 장면 문장이 달라지고, 모든 선택의 결과 플래그가 일요일 결산에서 읽힌다', () => {
    const sun = ['v2c3_sunA', 'v2c3_sunB', 'v2c3_sunC', 'v2c3_sunD', 'v2c3_sunE'].map((id) => JSON.stringify(SCENARIO[id])).join('')
    for (const nodes of Object.values(V2C3X)) for (const n of nodes) if (n.t === 'choice') for (const o of n.options) for (const e of o.fx ?? []) {
      const m = e.match(/^flag:(FLAG_P3_[A-E]2_\w+)$/); if (m) expect(sun.includes(m[1]), `${m[1]} 일요일 결산에서 소비`).toBe(true)
    }
    const s0 = newState(START_SCENE, 1); s0.scene = 'ev3_a_appeal'; s0.idx = 0; s0.mode = 'STORY'; s0.chapter = 3; const s = run(s0)
    const a0 = clone(s0); a0.flags.FLAG_P3_A_COPIED = true; const a = run(a0)
    const lines = (st: GameState) => { let t = clone(st); const out: string[] = []; for (let i = 0; i < 40; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
    expect(lines(a)).not.toBe(lines(s))
  })
  it('각 2차 사건의 세 선택은 서로 다른 후속 장면과 효과를 만든다', () => {
    for (const [id, nodes] of Object.entries(V2C3X)) for (const n of nodes) if (n.t === 'choice') {
      const gotos = n.options.map((o) => o.goto); expect(new Set(gotos).size, id).toBe(3)
      const texts = gotos.map((g) => textOf(g!)); expect(new Set(texts).size, id).toBe(3)
      expect(new Set(n.options.map((o) => (o.fx ?? []).find((e) => /^flag:/.test(e)))).size, id).toBe(3)
    }
  })
})

describe('챕터 4 관심 사건 분기: 구조', () => {
  it('새 장면의 이동 대상이 모두 존재하고 선택 ID C4-01~C4-07이 겹치지 않는다', () => {
    const ids: string[] = []; const old = new Set<string>()
    for (const [id, nodes] of Object.entries(SCENARIO)) for (const n of nodes) {
      if (n.t === 'choice') { if (id in V2C4X) ids.push(n.id); else old.add(n.id) }
      if (id in V2C4X) {
        if (n.t === 'goto') expect(SCENARIO[n.scene], `${id}→${n.scene}`).toBeTruthy()
        if (n.t === 'if') { expect(SCENARIO[n.then]).toBeTruthy(); if (n.else) expect(SCENARIO[n.else]).toBeTruthy() }
        if (n.t === 'choice') n.options.forEach((o) => expect(SCENARIO[o.goto!], `${id}${o.key}`).toBeTruthy())
      }
    }
    expect([...ids].sort()).toEqual(['C4-01', 'C4-02', 'C4-03', 'C4-04', 'C4-05', 'C4-06', 'C4-07'])
    for (const i of ids) expect(old.has(i)).toBe(false)
  })
  it('두 사건은 같은 날짜·같은 시간대·다른 장소에 있어 동시에 갈 수 없다', () => {
    const g = CALENDAR.find((e) => e.id === 'ap4_g_trial')!; const l = CALENDAR.find((e) => e.id === 'ap4_l_stair')!
    expect(g.date).toBe(l.date); expect(g.slots).toEqual(l.slots); expect(g.place).not.toBe(l.place)
    expect(g.notice + l.notice).not.toMatch(/지니|루나|말포이|판시/) // 게시판은 사건만 말한다
  })
  it('기존 K-08/S-04 이력·선택 ID는 보존된다', () => {
    const ids = new Set<string>(); for (const nodes of Object.values(SCENARIO)) for (const n of nodes) if (n.t === 'choice') ids.add(n.id)
    for (const i of ['K-08', 'S-04', 'K-07', 'S-03']) expect(ids.has(i)).toBe(true)
  })
})

describe('챕터 4 관심 사건 분기: 자연 플레이', () => {
  const R: Record<string, Out[]> = {}
  beforeAll(() => {
    setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS)
    // 자유 일과에서는 다른 일정·만남이 그 시간대를 쓰면 사건을 놓칠 수 있다(정상). 사건에 선 플레이만 모아 비교한다.
    for (const st of ['G', 'L', 'W']) R[st] = Array.from({ length: 12 }, (_, i) => mkOut(st, i + 1, 4)).filter((o) => st === 'W' || o.scenes.has(st === 'G' ? 'ev4_g_trial' : 'ev4_l_stair'))
  })
  afterAll(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })
  /** 사건을 고른 시점 이후의 장면들(G·L은 사건 장면, W는 7층 벽) */
  it('각 스타일에서 사건에 선 플레이가 충분히 나온다(12시드 중 6 이상)', () => { for (const st of ['G', 'L', 'W']) expect(R[st].length, st).toBeGreaterThanOrEqual(6) })
  const after = (o: Out) => { const l = [...o.scenes]; const i = Math.max(l.indexOf('ev4_g_trial'), l.indexOf('ev4_l_stair'), l.indexOf('ch4_wall')); return l.slice(i) }

  it('세 관심 사건 경로가 모두 챕터 4 종료 카드(→ch5_open)까지 자연 플레이로 도달한다', () => {
    for (const st of ['G', 'L', 'W']) for (const o of R[st]) {
      expect(o.ended, st).toBe(true); expect(o.s.chapter).toBe(4)
      const n = currentNode(o.s); expect(n?.t === 'endChapter' && n.next, st).toBe('ch5_open')
    }
  })
  it('G는 주전 재심·판시 보고·일요일 지니 장면, L은 서쪽 계단·판시 보고·일요일 루나 장면, W는 7층 벽·S-04로 서로 다른 장면 집합을 지난다', () => {
    for (const o of R.G) { expect(o.scenes.has('ev4_g_trial') && o.scenes.has('ch4_g_after') && o.scenes.has('ch4_pansy_report') && o.scenes.has('ch4_g_sun')).toBe(true); expect(o.scenes.has('ch4_wall') || o.scenes.has('ev4_l_stair') || o.scenes.has('ch4_s04')).toBe(false) }
    for (const o of R.L) { expect(o.scenes.has('ev4_l_stair') && o.scenes.has('ev4_l_find') && o.scenes.has('ch4_l_after') && o.scenes.has('ch4_l_sun')).toBe(true); expect(o.scenes.has('ch4_wall') || o.scenes.has('ev4_g_trial') || o.scenes.has('ch4_s04')).toBe(false) }
    for (const o of R.W) { expect(o.scenes.has('ch4_wall') && o.scenes.has('ch4_s04')).toBe(true); expect(o.scenes.has('ev4_g_trial') || o.scenes.has('ev4_l_stair') || o.scenes.has('ch4_g_after') || o.scenes.has('ch4_l_after')).toBe(false) }
    const sets = ['G', 'L', 'W'].map((st) => [...R[st][0].scenes].filter((x) => /^(ev4|ch4_)/.test(x)).join(','))
    expect(new Set(sets).size).toBe(3)
  })
  it('드레이코 비접촉: G·L 경로는 사건 선택 이후 드레이코가 나오는 장면·대사·표시가 한 번도 없다', () => {
    for (const st of ['G', 'L']) for (const o of R[st]) {
      const l = [...o.scenes]; for (const sc of l.slice(l.findIndex((x) => x === 'ch4_g_after' || x === 'ch4_l_after'))) expect(hasDraco(sc), `${st}:${sc}`).toBe(false) // 사건 이후의 필수 장면
      expect(o.s.choices.some((c) => c.id === 'K-08' || c.id === 'S-04')).toBe(false)
    }
    expect([...R.G, ...R.L].some((o) => !after(o).some((sc) => hasDraco(sc)))).toBe(true) // 자유 일과의 우연한 만남까지 피한 완주도 존재한다
    expect(R.W.every((o) => after(o).some((sc) => hasDraco(sc)))).toBe(true) // 기존 W 경로는 직접 접촉이 있다(대조)
  })
  it('지식 누출 방지: 가지 않은 사건·장면의 정보는 해리의 지식에 들어오지 않는다', () => {
    // 사건 선택 이후 새로 얻은 지식만 비교한다(앞 챕터에서 이미 알던 것은 제외)
    const gained = (o: Out, from: string) => Object.keys(o.s.knowledge).filter((k) => o.s.knowledge[k] && !o.snaps[from].knowledge[k])
    for (const o of R.G) { for (const k of ['KN_ROOM', 'KN_CABINET', 'KN_ROOM_RULE', 'OB_NOTE_TIN']) expect(gained(o, 'ev4_g_trial'), `G ${k}`).not.toContain(k) }
    for (const o of R.W) for (const k of ['KN_ROOM_RULE', 'OB_NOTE_TIN']) expect(o.s.knowledge[k], `W ${k}`).toBeFalsy()
    for (const o of R.L) { expect(o.s.knowledge.KN_ROOM_RULE).toBe(true); expect(gained(o, 'ev4_l_stair')).not.toContain('KN_CABINET') }
  })
  it('선택하지 않은 사건도 해리와 무관하게 진행된다: 결과 플래그가 자동으로 정해진다', () => {
    for (const o of R.L) { expect(o.s.flags.FLAG_C4_G_OFFSTAGE).toBe(true); expect(!!o.s.flags.FLAG_C4_G_START !== !!o.s.flags.FLAG_C4_G_BENCH).toBe(true); expect(o.s.flags.FLAG_C4_G_ATT).toBeFalsy() }
    for (const o of R.G) { expect(o.s.flags.FLAG_C4_L_ALONE).toBe(true); expect(o.s.flags.FLAG_C4_L_ATT).toBeFalsy() }
    for (const o of R.W) { expect(o.s.flags.FLAG_C4_L_ALONE).toBe(true); expect(o.s.flags.FLAG_C4_G_OFFSTAGE).toBe(true) }
    for (const st of ['G', 'L']) for (const o of R[st]) expect(o.s.flags.FLAG_C4_W_PANSY_SEEN).toBe(true) // 7층의 일은 판시가 대신 처리했다
  })
  it('시간순: 챕터 4 후반의 달력은 11/6 → 11/8 → 11/10으로 거꾸로 가지 않는다', () => {
    for (const st of ['G', 'L', 'W']) for (const o of R[st]) {
      const i = o.dates.indexOf('11-03'); const seq = o.dates.slice(i).map(dayIndex)
      for (let k = 1; k < seq.length; k++) expect(seq[k], `${st} ${o.dates.slice(i).join('>')}`).toBeGreaterThanOrEqual(seq[k - 1])
    }
  })
  it('한 사건에 개입하면 다른 사건은 놓친다: 보드 기록에 하나만 남는다', () => {
    for (const o of R.G) { expect(o.s.board!.done.ap4_g_trial).toBeTruthy(); expect(o.s.board!.done.ap4_l_stair).toBeFalsy() }
    for (const o of R.L) { expect(o.s.board!.done.ap4_l_stair).toBeTruthy(); expect(o.s.board!.done.ap4_g_trial).toBeFalsy() }
  })
  it('결과가 챕터 5 첫 장면의 대사를 실제로 바꾼다(회수)', () => {
    const ch5 = (flags: string[]) => { const s = run(clone(R.W[0].s)); for (const k of Object.keys(s.flags)) if (/^FLAG_C4_/.test(k)) delete s.flags[k]; for (const f of flags) s.flags[f] = true; return continueChapter(s) }
    const lines = (st: GameState) => { let t = clone(st); const out: string[] = []; for (let i = 0; i < 60 && t.scene === 'ch5_open'; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
    const base = lines(ch5([]))
    for (const f of ['FLAG_C4_G_START', 'FLAG_C4_G_BENCH', 'FLAG_C4_L_RETURNED', 'FLAG_C4_L_TOOK_NOTE', 'FLAG_C4_PANSY_TOLD', 'FLAG_C4_PANSY_LIED', 'FLAG_C4_PANSY_REDIRECT', 'FLAG_C4_G_WALKED', 'FLAG_C4_L_HANDS']) expect(lines(ch5([f])), f).not.toBe(base)
  })
})

describe('챕터 4 관심 사건 분기: 선택의 결과·관계 장면·저장', () => {
  let base: Record<string, GameState> = {}
  beforeAll(() => {
    setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS)
    base = { G: mkOut('G', 3, 4).snaps.ev4_g_trial, L: mkOut('L', 3, 4).snaps.ev4_l_stair }
  })
  afterAll(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })
  const g = (flags: string[] = [], plan: Record<string, string> = {}, until?: (s: GameState) => boolean) => { const s = clone(base.G); for (const k of Object.keys(s.flags)) if (/^FLAG_P3_B/.test(k)) delete s.flags[k]; Object.assign(s.flags, Object.fromEntries(flags.map((f) => [f, true]))); return finish(s, plan, until) }
  const l = (plan: Record<string, string> = {}, until?: (s: GameState) => boolean) => finish(clone(base.L), plan, until)

  it('C4-02 기록원의 판정: 정직·편들기·판독 요청이 서로 다른 플래그·관계 변화를 만든다', () => {
    const run2 = (k: string) => g([], { 'C4-01': 'B', 'C4-02': k })
    const a = run2('A'), b = run2('B'), c = run2('C')
    expect(a.s.flags.FLAG_C4_G_DISALLOWED).toBe(true); expect(b.s.flags.FLAG_C4_G_FAVORED).toBe(true); expect(c.s.flags.FLAG_C4_G_ASKED_HOOCH).toBe(true)
    expect(b.s.emotions.ginny.trust).toBeLessThan(a.s.emotions.ginny.trust)
    expect(new Set([a, b, c].map((x) => x.scenes.join('>'))).size).toBe(3)
  })
  it('재심 결과: 어깨를 돌본 적 없으면 지니 스스로 빠지고(후보), 돌봤으면 패스 또는 득점으로 주전이 된다', () => {
    const bench = g(['FLAG_P3_B'], { 'C4-01': 'A' }); expect(bench.s.flags.FLAG_C4_G_BENCH).toBe(true); expect(bench.s.flags.FLAG_C4_G_START).toBeFalsy()
    const pass = g(['FLAG_P3_B', 'FLAG_P3_B2_COUNT'], { 'C4-01': 'A' }); expect(pass.s.flags.FLAG_C4_G_PASS).toBe(true); expect(pass.s.flags.FLAG_C4_G_ALLY_DEMELZA).toBe(true)
    const shot = g([], { 'C4-01': 'A' }); expect(shot.s.flags.FLAG_C4_G_SHOT).toBe(true)
    const warm = g(['FLAG_P3_B'], { 'C4-01': 'C' }); expect(warm.s.flags.FLAG_C4_G_PASS).toBe(true) // 한계를 알면 지니가 스스로 패스를 고른다
    expect(new Set([bench, pass, shot].map((x) => x.scenes.join('>'))).size).toBe(3)
  })
  it('C4-03/C4-04 서쪽 계단: 같이 올라가면 직접 본 것(OB)이, 소리만 들으면 들은 것(KN)만 남고 쪽지 선택이 갈린다', () => {
    const a = l({ 'C4-03': 'A', 'C4-04': 'C' }); expect(a.s.knowledge.OB_NOTE_TIN).toBe(true); expect(a.s.flags.FLAG_C4_L_TOOK_NOTE).toBe(true)
    const c = l({ 'C4-03': 'C', 'C4-04': 'A' }); expect(c.s.knowledge.OB_NOTE_TIN).toBeFalsy(); expect(c.s.knowledge.KN_ROOM_RULE).toBe(true); expect(c.s.flags.FLAG_C4_L_RETURNED).toBe(true)
    const b = l({ 'C4-03': 'B', 'C4-04': 'B' }); expect(b.s.flags.FLAG_C4_L_SHARED_HER).toBe(true)
    expect(new Set([a, b, c].map((x) => x.scenes.join('>'))).size).toBe(3)
  })
  it('소리만 들은 경로에서는 쪽지를 가져가는 선택지가 숨겨진다(가진 적 없는 물건)', () => {
    const r = l({ 'C4-03': 'C' }, (s) => { const n = currentNode(s); return n?.t === 'choice' && n.id === 'C4-04' })
    const n = currentNode(r.s)!; expect(n.t).toBe('choice')
    expect(visibleOptions(r.s, n as never, true).map((o) => o.key)).toEqual(['A', 'B'])
    const r2 = l({ 'C4-03': 'A' }, (s) => { const n2 = currentNode(s); return n2?.t === 'choice' && n2.id === 'C4-04' })
    expect(visibleOptions(r2.s, currentNode(r2.s) as never, true).map((o) => o.key)).toEqual(['A', 'B', 'C'])
  })
  it('관계 장면(C4-05): 신뢰 조건이 맞을 때만 제안되고, 수락·천천히·거절이 각각 다른 결과를 남기며 거절해도 진행·관계가 닫히지 않는다', () => {
    const run3 = (trust: number, k: string, extra: string[] = []) => { const s = clone(base.G); s.emotions.ginny.trust = trust; for (const f of extra) s.flags[f] = true; return finish(s, { 'C4-01': 'A', 'C4-05': k }) }
    expect(run3(30, 'A').scenes).not.toContain('ch4_g_close') // 조건 미달이면 제안 자체가 없다
    expect(run3(60, 'A', ['FLAG_GIN_DISTANT']).scenes).not.toContain('ch4_g_close')
    const a = run3(60, 'A'), b = run3(60, 'B'), c = run3(60, 'C')
    expect(a.s.flags.FLAG_C4_G_CLOSE).toBe(true); expect(b.s.flags.FLAG_C4_G_SLOW).toBe(true); expect(c.s.flags.FLAG_C4_G_DECLINED).toBe(true)
    for (const x of [a, b, c]) { expect(x.s.mode).toBe('ENDED'); expect(x.s.flags.FLAG_C4_G_ATT).toBe(true) }
    expect(c.s.bonds!.ginny.romance).not.toBe('ended'); expect(c.s.emotions.ginny.trust).toBeGreaterThanOrEqual(60) // 거절이 관계를 끝내지 않는다
    expect(textOf('ch4_g_close_C')).toContain('말하고 싶을 때') // 이유를 캐묻지 않는다
  })
  it('선택하지 않은 사건 때문에 열린 관계가 서운함을 드러낸다(질투·서운함 대사의 자연 조건)', () => {
    const s = clone(base.L); s.flags.FLAG_GIN_OPEN = true
    const r = finish(s, { 'C4-03': 'A', 'C4-04': 'A' }, (x) => x.scene === 'ch4_end'); expect(r.scenes).toContain('ch4_settle_j')
    const txt = SCENARIO.ch4_settle_j.filter((n) => n.t === 'line' && n.when && evalCond(r.s, n.when)).map((n) => (n as { text: string }).text)
    expect(txt.some((t) => /경기장에 없었다는 건 기억해 둘게/.test(t))).toBe(true)
  })
  it('저장→불러오기: 사건 중간(C4-04 앞)·결산 직전 저장 후에도 같은 결과로 끝난다', () => {
    const at = (s: GameState) => { const n = currentNode(s); return n?.t === 'choice' && n.id === 'C4-04' }
    const mid = l({ 'C4-03': 'A' }, at)
    const file = { schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: mid.s }
    const back = validateSave(JSON.parse(JSON.stringify(file))).state as GameState
    const x = finish(clone(mid.s), { 'C4-04': 'C' }), y = finish(back, { 'C4-04': 'C' })
    expect(y.scenes.join('>')).toBe(x.scenes.join('>')); expect(JSON.stringify(y.s.flags)).toBe(JSON.stringify(x.s.flags)); expect(y.s.mode).toBe('ENDED')
    const settle = finish(clone(base.G), { 'C4-01': 'A' }, (s) => s.scene === 'ch4_settle')
    const back2 = validateSave(JSON.parse(JSON.stringify({ ...file, state: settle.s }))).state as GameState
    expect(finish(back2).s.flags.FLAG_C4_L_ALONE).toBe(true)
  })
})
