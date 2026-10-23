import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  advance, choose, clone, currentNode, listActions, newState, pickActivity, remainingSlots, routineCursor, run, setActivityScenes, setIncidents, setRandomEvents, startScene, visibleOptions,
} from '../engine/core'
import { evalCond } from '../engine/cond'
import { boardView, CALENDAR, openEventsAt } from '../data/calendar'
import { INCIDENTS } from '../data/incidents'
import { buildCases } from '../data/cases'
import { buildJournal } from '../data/journal'
import { START_SCENE } from '../data/scenario'
import type { ChoiceNode, GameState } from '../engine/types'
import './helpers'

beforeEach(() => { setActivityScenes(true); setRandomEvents([]); setIncidents([]) })
afterEach(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })

/** 챕터 1 자유 일과의 첫 지도 상태(9/4 수 오후1). 이벤트 풀은 비운다 */
function routineState(flags: string[] = [], emptyPools = true): GameState {
  let s = newState(START_SCENE)
  for (const f of flags) s.flags[f] = true
  s = startScene(s, 'v2c1_routine')
  for (let i = 0; i < 10 && s.mode !== 'ROUTINE'; i++) s = advance(s)
  if (emptyPools) { const r = s.routine!; r.encounters = {}; r.meets = {}; r.friends = {} }
  return s
}
const at = (s: GameState, day: number, slot: number) => { const n = clone(s); n.routine!.dayIdx = day; n.routine!.slotIdx = slot; return n }
/** 활동 직후 이어질 돌발 사건(활동 장면 뒤에 재생된다) */
const incOf = (s: GameState) => (s.scene.startsWith('inc_') ? s.scene : s.routine?.after?.startsWith('inc_') ? s.routine.after : null)
const evActs = (s: GameState, loc: string) => listActions(s, loc).filter((a) => a.actId.startsWith('ev:')).map((a) => a.actId.slice(3))
function playOut(s: GameState, pickKey?: (id: string) => string | undefined, guard = 300): GameState {
  for (let i = 0; i < guard && s.mode === 'EVENT'; i++) {
    const n = currentNode(s)
    if (n?.t === 'line') s = advance(s)
    else if (n?.t === 'choice') { const v = visibleOptions(s, n as ChoiceNode, true); s = choose(s, (v.find((o) => o.key === pickKey?.((n as ChoiceNode).id)) ?? v[0]).key) }
    else throw new Error(`예상치 못한 노드 ${s.scene}:${n?.t}`)
  }
  return s
}

describe('학사 일정: 날짜·시간대·장소 제한', () => {
  it('행사는 정확한 날짜·시간대·장소에서만 열리고, 약속·계획은 성립 조건(우선순위 선택) 없이는 나타나지 않는다', () => {
    const flagsOf = (c?: string) => (c ?? '').match(/(?<!!)FLAG_RT_[A-Z_]+/g) ?? [] // 이 행사가 성립하는 조건의 플래그만 켠다
    const places = ['library', 'pitch', 'lake', 'courtyard', 'potions', 'greenhouse', 'hall', 'common', 'classroom4']
    for (const e of CALENDAR) {
      const base = routineState(flagsOf(e.cond))
      const dayIdx = base.routine!.days.findIndex((d) => d.date === e.date)
      for (let d = 0; d < base.routine!.days.length; d++) for (let slot = 0; slot < 3; slot++) for (const loc of places) {
        const opens = evActs(at(base, d, slot), loc).includes(e.id)
        const should = d === dayIdx && e.slots.includes(slot) && loc === e.place
        expect(opens, `${e.id} @${d}/${slot}/${loc}`).toBe(should)
      }
    }
    // 약속·계획: 플래그가 없으면 어디에도 없다
    const none = routineState()
    for (const e of CALENDAR.filter((x) => x.kind !== 'public')) expect(evActs(at(none, 1, 1), e.place)).not.toContain(e.id)
    for (const e of CALENDAR.filter((x) => x.kind === 'public' && x.date === '09-05')) expect(evActs(at(none, 1, e.slots[0]), e.place)).toContain(e.id)
  })

  it('참가하면 시간은 한 번만 쓰이고 참가 기록이 남아 다시 참가할 수 없다(중복 보상 방지)', () => {
    const s0 = at(routineState(), 1, 1) // 목 오후2 경기장
    const t0 = routineCursor(s0.routine!)
    const a = pickActivity(s0, 'pitch', 'ev:ev_pitch_open')
    expect(a.mode).toBe('EVENT'); expect(a.scene).toBe('ev1_pitch'); expect(a.board!.done.ev_pitch_open).toBe('joined')
    expect(routineCursor(a.routine!) - t0).toBe(1)
    expect(pickActivity(a, 'pitch', 'ev:ev_pitch_open')).toBe(a) // 장면 중 재클릭 무시
    const done = playOut(a, (id) => (id === 'E-04' ? 'A' : id === 'E-05' ? 'B' : undefined))
    expect(done.mode).toBe('ROUTINE'); expect(done.board!.done.ev_pitch_open).toBe('gin_ok'); expect(done.flags.FLAG_EV_PITCH_GINNY_OK).toBe(true)
    // 같은 시간대로 되돌려도(저장 조작 가정) 이미 참가한 행사는 열리지 않는다
    expect(evActs(at(done, 1, 1), 'pitch')).not.toContain('ev_pitch_open')
    expect(openEventsAt(at(done, 1, 1), 'pitch')).toHaveLength(0)
  })

  it('같은 시간대의 두 행사(목 오후2 도서관 약속 / 경기장 공개 연습)는 하나를 고르면 다른 하나는 놓친 행사가 된다', () => {
    const s = at(routineState(['FLAG_RT_HERMIONE']), 1, 1)
    const items = boardView(s).items
    const lib = items.find((i) => i.id === 'ap_hermione')!, pitch = items.find((i) => i.id === 'ev_pitch_open')!
    expect(lib.status).toBe('today'); expect(pitch.status).toBe('today')
    expect(lib.conflictWith).toContain('퀴디치 공개 연습'); expect(pitch.conflictWith).toContain('접힌 양피지의 각주')
    const after = playOut(pickActivity(s, 'library', 'ev:ap_hermione'), (id) => (id === 'E-08' ? 'A' : undefined))
    // 이제 목 저녁: 경기장 공개 연습은 지나갔다
    const view = boardView(after).items
    expect(view.find((i) => i.id === 'ap_hermione')!.status).toBe('done')
    expect(view.find((i) => i.id === 'ev_pitch_open')!.status).toBe('missed')
    expect(evActs(after, 'pitch')).not.toContain('ev_pitch_open')
  })

  it('게시판은 공지 전·성립하지 않은 일정의 존재를 알리지 않고, 월 경계에서는 그 달의 일정만 보인다', () => {
    const s = routineState()
    expect(boardView(s).items.map((i) => i.id).sort()).toEqual(['ev_greenhouse_prac', 'ev_pitch_open'])
    const early = clone(s); early.routine = null; early.calendar = { date: '08-31', weekday: '토', slot: '-' }
    expect(boardView(early).items).toEqual([]) // 8월에는 9월 행사가 없다
    const oct = clone(s); oct.routine = null; oct.calendar = { date: '10-02', weekday: '수', slot: '-' }
    expect(boardView(oct)).toEqual({ month: 10, items: [] })
    const routeS = routineState(['FLAG_RT_LUNA'])
    expect(boardView(routeS).items.map((i) => i.id)).toContain('ap_luna')
    expect(JSON.stringify(boardView(s))).not.toMatch(/균열|금이|벽의 금|crack|7층|말포이/) // 돌발·비밀 사건은 게시판에 없다
  })

  it('시간 건너뛰기·일과 종료 뒤에도 행사 기록이 꼬이지 않고, 장면 도중 저장→복원해도 같은 결과다', () => {
    const a = pickActivity(at(routineState(), 1, 0), 'greenhouse', 'ev:ev_greenhouse_prac') // 목 오후1 온실
    expect(a.scene).toBe('ev1_greenhouse')
    const mid = advance(advance(a)) // 장면 도중
    const restored = JSON.parse(JSON.stringify(mid)) as GameState
    const pick = (id: string) => (id === 'E-01' ? 'A' : id === 'E-02' ? 'A' : undefined)
    const o1 = playOut(mid, pick), o2 = playOut(restored, pick)
    expect(JSON.stringify(o2.board)).toBe(JSON.stringify(o1.board)); expect(routineCursor(o2.routine!)).toBe(routineCursor(o1.routine!)); expect(JSON.stringify(o2.emotions)).toBe(JSON.stringify(o1.emotions))
    expect(o1.board!.done.ev_greenhouse_prac).toBe('hermione_ok'); expect(o1.flags.FLAG_EV_GH_HERMIONE_OK).toBe(true)
    expect(Object.keys(o1.board!.done)).toEqual(['ev_greenhouse_prac'])
    expect(o1.emotions.hermione.trust).toBeGreaterThan(newState(START_SCENE).emotions.hermione.trust)
  })

  it('낮은 결과(건성 / 잘못된 접근)는 관계를 올리지 않고, 결과에 따라 참가 기록이 달라진다', () => {
    const base = at(routineState(), 1, 0)
    const trust0 = base.emotions.hermione.trust
    const run1 = (key: string) => playOut(pickActivity(base, 'greenhouse', 'ev:ev_greenhouse_prac'), (id) => (id === 'E-01' ? 'A' : id === 'E-02' ? key : undefined))
    expect(run1('A').emotions.hermione.trust).toBe(trust0 + 2)
    expect(run1('B').emotions.hermione.trust).toBe(trust0)
    expect(run1('C').emotions.hermione.trust).toBe(trust0 - 1)
    expect(new Set(['A', 'B', 'C'].map((k) => run1(k).board!.done.ev_greenhouse_prac)).size).toBe(3)
  })
})

/* ---------------- 다중 히로인 챕터 1: 경로별 실제 경험 ---------------- */
const ROUTES: Record<string, { key: string; flag: string; ok: string; apt: string; choice: string; best: string; clue: string; scene: string }> = {
  hermione: { key: 'A', flag: 'FLAG_RT_HERMIONE', ok: 'FLAG_RT_HERMIONE_OK', apt: 'ap_hermione', choice: 'E-08', best: 'A', clue: 'OB_RUNE_WALL', scene: 'ev1_ap_her_a' },
  ginny: { key: 'B', flag: 'FLAG_RT_GINNY', ok: 'FLAG_RT_GINNY_OK', apt: 'ap_ginny', choice: 'E-09', best: 'A', clue: 'OB_PITCH_FLASH', scene: 'ev1_ap_gin_a' },
  luna: { key: 'C', flag: 'FLAG_RT_LUNA', ok: 'FLAG_RT_LUNA_OK', apt: 'ap_luna', choice: 'E-10', best: 'A', clue: 'FLAG_LUNA_COUNT7', scene: 'ev1_ap_lun_a' },
  pansy: { key: 'D', flag: 'FLAG_RT_PANSY', ok: 'FLAG_RT_PANSY_OK', apt: 'ap_pansy', choice: 'E-11', best: 'A', clue: 'KN_PANSY_NIGHTS', scene: 'ev1_ap_pan_a' },
  draco: { key: 'E', flag: 'FLAG_RT_DRACO', ok: 'FLAG_RT_DRACO_OK', apt: 'pl_draco', choice: 'E-12', best: 'A', clue: 'FLAG_RT_DRACO_OK', scene: 'ev1_pl_dra_a' },
}
interface Run { s: GameState; scenes: Set<string>; lines: string[]; joined: string[] }
/** 한 번의 챕터 1 플레이: 이번 주 우선순위(H-08)를 정하고, 열려 있는 자기 약속에 참가하며 최선/최악 선택을 고른다. 나머지 선택은 첫 선택지(또는 시드 무작위) */
function playCh1(routeKey: string | null, o: { best?: boolean; attendOthers?: boolean; seed?: number } = {}): Run {
  const best = o.best ?? true
  let s = run(newState(START_SCENE, o.seed ?? 1)); const scenes = new Set<string>(); const lines: string[] = []; const joined: string[] = []
  let rnd = (o.seed ?? 1) * 7919
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  for (let step = 0; step < 6000 && s.scene !== 'ch2_open'; step++) {
    scenes.add(s.scene)
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') {
      const all: [string, string][] = []
      for (const loc of s.routine!.locations) for (const a of listActions(s, loc)) if (a.ok) all.push([loc, a.actId])
      const mine = all.filter(([, a]) => a.startsWith('ev:') && (o.attendOthers ? true : /^ev:(ap_|pl_)/.test(a)))
      const pickMine = mine.find(([, a]) => routeKey && a === `ev:${ROUTES[routeKey].apt}`)
      const [loc, act] = pickMine ?? (o.attendOthers && mine.length ? mine[0] : all.find(([, a]) => a === 'rest' || a === 'meal' || a === 'walk') ?? all[0])
      if (act.startsWith('ev:')) joined.push(act.slice(3))
      s = pickActivity(s, loc, act)
    } else if (n?.t === 'line') { lines.push(n.text); s = advance(s) }
    else if (n?.t === 'choice') {
      const v = visibleOptions(s, n, true)
      let key: string | undefined
      if (n.id === 'H-08') key = routeKey ? ROUTES[routeKey].key : 'F'
      else if (n.id === 'H-01') key = 'C' // 판시의 걱정을 진지하게 받아 주지 않는 이력 — 이력 기반 후속(경기장 소리가 관중석 소리로 이어짐)을 피해 B가 항상 지니의 경로가 되게 한다
      else if (routeKey && n.id === ROUTES[routeKey].choice) key = best ? ROUTES[routeKey].best : v[v.length - 1].key
      else if (/^E-/.test(n.id)) key = v[Math.floor(r() * v.length)].key
      s = choose(s, (v.find((x) => x.key === key) ?? v[0]).key)
    } else throw new Error(`예상치 못한 노드 ${s.scene}:${n?.t}`)
  }
  return { s, scenes, lines, joined }
}

describe('다중 히로인 챕터 1: 말포이가 아닌 경로도 서로 다른 메인 스토리를 만든다', () => {
  const runs: Record<string, Run> = {}
  beforeAll(() => { setActivityScenes(true); for (const k of [...Object.keys(ROUTES), 'none']) runs[k] = playCh1(k === 'none' ? null : k) }) // 수집 단계에는 beforeEach가 아직 적용되지 않는다
  afterAll(() => { setActivityScenes(false) })

  it('여섯 경로(헤르미온느·지니·루나·판시·말포이·약속 없음)가 모두 챕터 2에 도달한다', () => {
    for (const [k, r] of Object.entries(runs)) { expect(r.s.scene, k).toBe('ch2_open'); expect(r.s.choices.some((c) => c.id === 'H-08'), k).toBe(true) }
  })

  it('각 경로는 자기 약속 장면을 실제로 경험하고 자기 단서·결과 플래그를 얻으며 다른 경로의 것은 얻지 않는다', () => {
    for (const [k, def] of Object.entries(ROUTES)) {
      const r = runs[k]
      expect(r.scenes.has(def.scene), `${k} 약속 장면`).toBe(true); expect(r.s.flags[def.flag], k).toBe(true); expect(r.s.flags[def.ok] || r.s.knowledge[def.ok], `${k} 성공`).toBeTruthy()
      for (const [k2, d2] of Object.entries(ROUTES)) if (k2 !== k && k !== 'draco' && k2 !== 'draco') expect(!!(r.s.flags[d2.clue] || r.s.knowledge[d2.clue]), `${k}가 ${k2}의 단서를 가짐`).toBe(false)
    }
    expect(runs.none.s.flags.FLAG_RT_HERMIONE || runs.none.s.flags.FLAG_RT_GINNY || runs.none.s.flags.FLAG_RT_LUNA || runs.none.s.flags.FLAG_RT_PANSY || runs.none.s.flags.FLAG_RT_DRACO).toBeFalsy()
  })

  it('토요일 밤 7층으로 가는 이유(시작 원인)와 챕터 끝 후속 대사가 경로마다 다르다', () => {
    const night = (k: string) => runs[k].lines.filter((l) => /도면 사본|번쩍임|일곱 줄|날짜 두 개|악몽에 잠을/.test(l)).join('|')
    expect(night('hermione')).toContain('도면 사본'); expect(night('ginny')).toContain('번쩍임'); expect(night('luna')).toContain('일곱 줄'); expect(night('pansy')).toContain('날짜 두 개')
    expect(night('draco')).toContain('악몽에 잠을'); expect(night('none')).toContain('악몽에 잠을')
    const hook = (k: string) => runs[k].lines.slice(-30).join('|')
    expect(hook('hermione')).toContain('같은 줄을 마저 풀어야 해'); expect(hook('ginny')).toContain('어깨는 고쳤어'); expect(hook('luna')).toContain('일곱 번째 줄은 일요일 아침에도')
    expect(hook('pansy')).toContain('어젯밤 걔 늦게 들어왔어'); expect(hook('draco')).toContain('금요일에 솥 닦은 거')
    expect(hook('none').match(/같은 줄을 마저|어깨는 고쳤어|일곱 번째 줄은 일요일|어젯밤 걔|솥 닦은 거/)?.[0]).toBeUndefined()
  })

  it('경로 사이의 경험 차이: 경로마다 다른 장면·대사를 8줄 이상 따로 가진다(이름 교체가 아님)', () => {
    const keys = Object.keys(ROUTES)
    for (const k of keys) {
      const mine = new Set(runs[k].lines)
      const others = new Set(keys.filter((x) => x !== k).flatMap((x) => runs[x].lines))
      expect([...mine].filter((l) => !others.has(l)).length, k).toBeGreaterThanOrEqual(8)
      const ownScenes = [...runs[k].scenes].filter((sc) => /^ev1_(ap|pl)_/.test(sc))
      expect(ownScenes.length, k).toBeGreaterThanOrEqual(2)
    }
  })

  it('말포이와의 관계가 낮은 경로(말포이를 한 번도 따로 찾지 않은 4개 경로)도 공통 메인(K-04 → 챕터 2)을 지나며 K-04의 선택지·효과는 그대로다', () => {
    for (const k of ['hermione', 'ginny', 'luna', 'pansy']) {
      const r = runs[k]
      expect(r.s.choices.some((c) => c.id === 'K-04'), k).toBe(true); expect(r.scenes.has('v2c1_night'), k).toBe(true)
      expect(r.s.flags.FLAG_RT_DRACO_OK, k).toBeFalsy()
      expect(r.s.emotions.draco.trust, k).toBeLessThan(runs.draco.s.emotions.draco.trust + 1)
    }
  })

  it('최악의 선택(약속 장면의 마지막 선택지)이어도 챕터는 진행되고 단서는 얻지 못하며 후속은 "반쯤만 지켜졌다"로 이어진다', () => {
    for (const [k, def] of Object.entries(ROUTES)) {
      const r = playCh1(k, { best: false })
      expect(r.s.scene, k).toBe('ch2_open')
      expect(r.s.flags[def.ok] || r.s.knowledge[def.ok], k).toBeFalsy()
      expect(r.lines.some((l) => /반쯤만 지켜졌다/.test(l)), k).toBe(true)
    }
  })

  it('사건 수첩·인물 기록에 경로별 단서가 해리가 겪은 사실로만 기록된다(다른 경로의 단서는 없다)', () => {
    const casesText = (k: string) => JSON.stringify(buildCases(runs[k].s).find((c) => c.id === 'upper-floors'))
    expect(casesText('hermione')).toContain('문을 숨기는 매듭'); expect(casesText('hermione')).not.toMatch(/일곱 번째 줄이라고|수요일과 토요일 밤/)
    expect(casesText('ginny')).toContain('일정한 간격으로 번쩍였다'); expect(casesText('luna')).toContain('일곱 번째 줄이라고 셌다'); expect(casesText('pansy')).toContain('수요일과 토요일 밤에 기숙사에서 사라지고')
    const j = (k: string, who: string) => JSON.stringify(buildJournal(runs[k].s).find((p) => p.id === who))
    expect(j('hermione', 'hermione')).toContain('건축 도면과 대조'); expect(j('ginny', 'ginny')).toContain('급강하를 봐 줬다'); expect(j('luna', 'luna')).toContain('같이 셌다'); expect(j('pansy', 'pansy')).toContain('약속했다'); expect(j('draco', 'draco')).toContain('솥을 같이 닦았다')
    expect(JSON.stringify(buildJournal(runs.none.s))).not.toMatch(/건축 도면과 대조|급강하를 봐 줬다|솥을 같이 닦았다/)
  })

  it('선택한 약속은 게시판의 해당 약속으로 나타나고 다른 사람의 약속은 나타나지 않는다', () => {
    for (const [k, def] of Object.entries(ROUTES)) {
      const s = routineState([def.flag]); const ids = boardView(s).items.map((i) => i.id)
      expect(ids, k).toContain(def.apt)
      for (const d2 of Object.values(ROUTES)) if (d2.apt !== def.apt) expect(ids).not.toContain(d2.apt)
    }
  })
})

/* ---------------- 돌발 사건 ---------------- */
describe('돌발 탐험 사건: 성 벽의 금', () => {
  const libStudy = (s: GameState) => pickActivity(s, 'library', 'study')

  it('정해진 날짜·장소·활동 뒤에만, 저장 상태에서 결정적으로 일어난다(같은 상태는 몇 번을 불러와도 같은 결과)', () => {
    setIncidents(INCIDENTS)
    const base = routineState()
    const outcomes = new Set<string>()
    for (let d = 0; d < 3; d++) for (let slot = 0; slot < 2; slot++) {
      const s = at(base, d, slot)
      const a = libStudy(s), b = libStudy(JSON.parse(JSON.stringify(s)) as GameState)
      expect(incOf(a), `${d}/${slot}`).toBe(incOf(b)) // 재현성
      outcomes.add(incOf(a) ? 'crack' : 'none')
      expect(incOf(pickActivity(s, 'hall', 'meal'))).toBeNull() // 다른 장소·활동에서는 없다
    }
    expect(outcomes.size).toBeGreaterThanOrEqual(1)
    const evening = at(base, 0, 2); evening.routine!.slotIdx = 2
    expect(incOf(libStudy(evening))).toBeNull() // 저녁(도서관 닫힘)은 제외
  })

  it('한 번만 일어나고, 선택 네 갈래(직접/신고/동료/물러남)가 서로 다른 결과·단서·시간·수첩 기록을 남긴다', () => {
    setIncidents(INCIDENTS)
    // 사건이 일어나는 상태를 찾는다
    let start: GameState | null = null
    for (let seed = 1; seed <= 60 && !start; seed++) { const s = newState(START_SCENE, seed); const b = routineStateFrom(s); for (let d = 0; d < 3 && !start; d++) for (let sl = 0; sl < 2 && !start; sl++) { const x = at(b, d, sl); if (incOf(libStudy(x)) === 'inc_crack_corridor') start = x } }
    expect(start).toBeTruthy()
    const results: Record<string, GameState> = {}
    for (const k of ['A', 'B', 'C', 'D']) {
      const e = libStudy(start!); expect(incOf(e)).toBe('inc_crack_corridor'); expect(e.rev!.seen.inc_crack_corridor).toBe(1)
      results[k] = playOut(e, (id) => (id === 'X-01' ? k : undefined))
      expect(results[k].mode, k).toBe('ROUTINE')
    }
    expect(results.A.flags.FLAG_CRACK_LOOKED).toBe(true); expect(results.B.flags.FLAG_CRACK_REPORTED).toBe(true); expect(results.D.flags.FLAG_CRACK_AVOIDED).toBe(true)
    expect(results.A.stats.will).toBeLessThan(results.D.stats.will) // 불이익(손끝 냉기) vs 신중
    const cur = (s: GameState) => routineCursor(s.routine!)
    expect(cur(results.A)).toBeGreaterThan(cur(results.D)); expect(cur(results.B)).toBe(cur(results.A)) // 직접·신고는 한 시간대 더, 물러남은 추가 소모 없음
    for (const k of ['A', 'B', 'D']) expect(buildCases(results[k]).some((c) => c.id === 'castle-crack'), k).toBe(true)
    const caseOf = (k: string) => JSON.stringify(buildCases(results[k]).find((c) => c.id === 'castle-crack'))
    expect(new Set(['A', 'B', 'D'].map(caseOf)).size).toBe(3)
    expect(caseOf('A')).not.toMatch(/캐비닛|변신|환영/) // 메인 비밀과 연결하지 않는다
    // 같은 사건은 다시 일어나지 않는다
    expect(incOf(libStudy(results.A))).not.toBe('inc_crack_corridor')
  })

  it('동료에게 도움을 청하면 그 시간대에 도서관에 실제로 있는 히로인만 응한다(일정표 기준)', () => {
    const lib = routineState(); // 수 오후1 도서관: 헤르미온느가 있다
    const a = pickActivity(clone(lib), 'library', 'study')
    expect(evalCond({ ...a, routine: { ...a.routine!, at: 'library', span: [0, 1] } } as GameState, 'HERE_hermione')).toBe(true)
    expect(evalCond({ ...a, routine: { ...a.routine!, at: 'library', span: [0, 1] } } as GameState, 'HERE_luna')).toBe(false)
    expect(evalCond({ ...a, routine: { ...a.routine!, at: 'lake', span: [0, 1] } } as GameState, 'HERE_luna')).toBe(true) // 수 오후1 호수에는 루나
    const s0 = newState(START_SCENE); expect(evalCond(s0, 'HERE_hermione')).toBe(false) // 일과 밖에서는 아무도 "그 자리"에 있지 않다
  })

  it('후속 사건은 직접 살피거나 도움을 받은 뒤 다음 날에만, 신고했다면 일어나지 않는다', () => {
    setIncidents(INCIDENTS)
    const s = routineState(['FLAG_CRACK_LOOKED']); const t = at(s, 1, 0)
    let seen = 0; for (let d = 1; d < 3; d++) for (let sl = 0; sl < 3; sl++) { const x = pickActivity(at(s, d, sl), 'classroom4', 'train'); if (incOf(x) === 'inc_crack_followup') seen++ }
    expect(seen).toBeGreaterThan(0)
    const reported = routineState(['FLAG_CRACK_LOOKED', 'FLAG_CRACK_REPORTED'])
    for (let d = 1; d < 3; d++) for (let sl = 0; sl < 3; sl++) expect(incOf(pickActivity(at(reported, d, sl), 'classroom4', 'train'))).toBeNull()
    const fresh = routineState(); expect(incOf(pickActivity(at(fresh, 1, 0), 'classroom4', 'train'))).toBeNull()
    void t
  })

  it('사건이 켜진 채로도 챕터 1을 끝까지 진행할 수 있고, 사건을 놓쳐도 필수 진행은 막히지 않는다', () => {
    setIncidents(INCIDENTS)
    for (const k of ['hermione', 'none']) { const r = playCh1(k === 'none' ? null : k, { seed: 5 }); expect(r.s.scene, k).toBe('ch2_open') }
  })
})

function routineStateFrom(base: GameState): GameState {
  let s = startScene(base, 'v2c1_routine')
  for (let i = 0; i < 10 && s.mode !== 'ROUTINE'; i++) s = advance(s)
  const r = s.routine!; r.encounters = {}; r.meets = {}; r.friends = {}
  return s
}
void remainingSlots

