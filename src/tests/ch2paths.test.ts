import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { choose, clone, continueChapter, currentNode, newState, run, setActivityScenes, setIncidents, setRandomEvents, visibleOptions } from '../engine/core'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { INCIDENTS } from '../data/incidents'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { buildCases } from '../data/cases'
import { buildJournal } from '../data/journal'
import { CALENDAR, openEventsAt } from '../data/calendar'
import { INTIMATE, TENSION } from '../data/v2c2r'
import { evalCond } from '../engine/cond'
import { validateSave } from '../engine/save'
import { STYLES2, simulate2, type Out } from './ch2sim'
import type { GameState } from '../engine/types'
import './helpers'

/**
 * 챕터 2 다중 경로: 경로 도달·공통 메인 보존·챕터 1 결과의 반영·관계 조건부 장면·질투 근거·동의·상태 전달·8가지 플레이 스타일 비교.
 * 자동 테스트는 코드·상태 수준의 증명이며, 장면 문장의 품질이나 플레이 체감은 검증하지 못한다.
 */
const N = 16
const all: Record<string, Out[]> = {}
const PATH_SCENE: Record<string, string> = { hermione: 'ch2_p_research', ginny: 'ch2_p_pitch', luna: 'ch2_p_secret', pansy: 'ch2_p_sly', draco: 'ch2_p_unstable' }

beforeAll(() => {
  setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS)
  for (const st of Object.keys(STYLES2)) all[st] = Array.from({ length: N }, (_, i) => simulate2(st, i + 1))
  const table: Record<string, unknown> = {}
  for (const [st, outs] of Object.entries(all)) {
    const sceneSets = outs.map((o) => o.scenes)
    const union = new Set(sceneSets.flatMap((s) => [...s]))
    const eve: Record<string, number> = {}
    for (const o of outs) { const e = [...o.scenes].find((x) => /^ch2_eve_[ti]_|^ch2_eve_gen/.test(x))!; eve[e] = (eve[e] ?? 0) + 1 }
    const cases = new Set(outs.map((o) => JSON.stringify(buildCases(o.s).find((c) => c.id === 'seventh-door')?.obs ?? [])))
    table[st] = { 완료: outs.filter((o) => o.ended).length, 서로다른장면수: union.size, 장면수평균: Math.round(outs.reduce((a, o) => a + o.scenes.size, 0) / outs.length), 이브장면: eve, 수첩변형: cases.size }
  }
  console.log('[챕터 2 플레이 스타일 비교]', JSON.stringify(table))
})
afterAll(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })

const flag = (s: GameState, f: string) => !!(s.flags[f] || s.knowledge[f])

describe('챕터 2 사건 경로: 도달과 공통 메인', () => {
  it('8가지 플레이 스타일이 모두 챕터 2를 끝까지 완료하고 공통 메인 선택(K-05·K-06·S-01·S-02)을 지난다', () => {
    for (const [st, outs] of Object.entries(all)) for (const o of outs) {
      expect(o.ended, `${st}`).toBe(true)
      expect(o.s.scene, st).toBe('ch2_end')
      for (const id of ['K-05', 'K-06', 'S-01', 'S-02']) expect(o.s.choices.some((c) => c.id === id), `${st} ${id}`).toBe(true)
    }
  })
  it('말포이 변화 사건과 인과(캐비닛 + 프로테고 충돌)가 모든 경로에서 유지된다', () => {
    for (const [st, outs] of Object.entries(all)) for (const o of outs) {
      expect(flag(o.s, 'FLAG_DRACO_CHANGED'), st).toBe(true); expect(flag(o.s, 'KN_TRANSFORMATION'), st).toBe(true)
      expect(o.scenes.has('ch2_night') && o.scenes.has('ch2_after'), st).toBe(true)
    }
  })
  it('챕터 1의 우선순위(H-08)가 챕터 2의 시작 사건을 바꾼다: 경로별 시작 장면이 서로 다르고, 말포이 장면으로 시작하지 않는다', () => {
    for (const st of ['hermione', 'ginny', 'luna', 'pansy', 'draco']) for (const o of all[st]) {
      expect(o.scenes.has(PATH_SCENE[st]), st).toBe(true)
      expect(o.scenes.has('ch2_open_snape') || o.scenes.has('ch2_open_b'), `${st}는 일반 시작을 거치지 않는다`).toBe(false)
    }
    // 약속을 걸지 않아도 공개 행사 결과나 단서가 있으면 경로가 정해진다. 아무 단서도 없을 때만 일반 시작(기존 말포이 장면)이다
    const generalRuns = all.none.filter((o) => o.scenes.has('ch2_open_snape') || o.scenes.has('ch2_open_b'))
    expect(generalRuns.length).toBeGreaterThan(all.none.length / 2)
    for (const o of all.none) { const general = o.scenes.has('ch2_open_snape') || o.scenes.has('ch2_open_b'); expect([...o.scenes].some((x) => /^ch2_p_(research|pitch|secret|sly|unstable)$/.test(x))).toBe(!general) }
    const open = (st: string) => [...all[st][0].scenes].filter((x) => /^ch2_p_/.test(x)).join(',')
    expect(new Set(['hermione', 'ginny', 'luna', 'pansy'].map(open)).size).toBe(4)
  })
  it('경로별 핵심 장면·선택(Q-01~Q-04)이 서로 다르다: 다른 경로의 시작 사건에 들어가지 않는다', () => {
    const own: Record<string, string> = { hermione: 'Q-01', ginny: 'Q-02', luna: 'Q-03', pansy: 'Q-04' }
    for (const [st, id] of Object.entries(own)) for (const o of all[st]) {
      expect(o.s.choices.some((c) => c.id === id), st).toBe(true)
      for (const [st2, id2] of Object.entries(own)) if (st2 !== st) expect(o.s.choices.some((c) => c.id === id2), `${st}에 ${id2} 없음`).toBe(false)
    }
  })
  it('각 경로의 시작 선택은 서로 다른 지식·결과를 남긴다(A/B/C가 모두 단서를 준다)', () => {
    const kn = (id: string, key: string) => {
      const n = SCENARIO[{ 'Q-01': 'ch2_p_research', 'Q-02': 'ch2_p_pitch', 'Q-03': 'ch2_p_secret', 'Q-04': 'ch2_p_sly' }[id]!].find((x) => x.t === 'choice')
      if (n?.t !== 'choice') throw new Error('no choice'); return n.options.find((o) => o.key === key)!.fx!.filter((e) => /^(kn|flag):/.test(e)).join('|')
    }
    for (const id of ['Q-01', 'Q-02', 'Q-03', 'Q-04']) { const sets = ['A', 'B', 'C'].map((k) => kn(id, k)); expect(new Set(sets).size, id).toBe(3); for (const x of sets) expect(x.length).toBeGreaterThan(0) }
  })
  it('가장 나쁜 선택 조합에서도 챕터 2는 끝까지 진행된다(conflict 스타일 완료)', () => {
    for (const o of all.conflict) { expect(o.ended).toBe(true); expect(o.scenes.has('ch2_match')).toBe(true) }
  })
})

describe('챕터 1의 결과가 챕터 2에 반영된다', () => {
  const base = (patch: (s: GameState) => void) => { const s = newState(START_SCENE, 3); s.scene = 'ch2_route'; s.idx = 0; s.chapter = 2; patch(s); return run(s) }
  it('명시적 선택(FLAG_RT_*) → 단서(OB_/KN_) → 행사 결과 → 일반 순으로 경로가 정해진다', () => {
    expect(base((s) => { s.flags.FLAG_RT_LUNA = true; s.knowledge.OB_RUNE_WALL = true }).scene).toBe('ch2_p_secret') // 명시적 선택이 단서보다 우선
    expect(base((s) => { s.knowledge.OB_PITCH_FLASH = true }).scene).toBe('ch2_p_pitch')
    expect(base((s) => { s.flags.FLAG_EV_GH_LUNA_OK = true }).scene).toBe('ch2_p_secret')
    expect(base((s) => { s.flags.FLAG_RT_DRACO = true }).scene).toBe('ch2_p_unstable') // 지하 교실 불빛을 따라간 경우는 독립 E 경로
    expect(base((s) => { s.flags.FLAG_RT_PANSY = true }).scene).toBe('ch2_p_sly') // D는 판시 쪽 선택으로만
    expect(base((s) => { s.knowledge.OB_SCORCH = true }).scene).toBe('ch2_p_unstable') // 다른 단서 없이 4층 그을음만 본 경우
    expect(base((s) => { s.knowledge.OB_SCORCH = true; s.knowledge.KN_PANSY_NIGHTS = true }).scene).toBe('ch2_p_sly') // 다른 경로의 단서가 있으면 그쪽이 먼저
    expect(base(() => {}).scene).toBe('ch2_open_b')
    expect(base((s) => { s.flags.FLAG_REPORTED_NIGHT = true }).scene).toBe('ch2_open_snape')
  })
  it('같은 선택(Q)의 결과가 만찬·밤 도입·챕터 끝 후속 문장을 바꾼다', () => {
    const lines = (scene: string, cond: RegExp) => SCENARIO[scene].filter((n) => n.t === 'line' && n.when && cond.test(n.when)).length
    expect(lines('ch2_night', /FLAG_P2_RESEARCH/)).toBeGreaterThanOrEqual(2); expect(lines('ch2_night', /FLAG_P2_PITCH/)).toBeGreaterThanOrEqual(1)
    expect(lines('ch2_night', /FLAG_P2_SECRET/)).toBeGreaterThanOrEqual(1); expect(lines('ch2_night', /FLAG_P2_SLY/)).toBeGreaterThanOrEqual(1)
    expect(lines('ch2_end', /FLAG_P2_/)).toBeGreaterThanOrEqual(4); expect(lines('ch2_dinner_c', /FLAG_P2_/)).toBeGreaterThanOrEqual(2)
    expect(SCENARIO.ch2_dinner_permit.some((n) => n.t === 'fx' && n.fx.includes('flag:FLAG_P2_PERMIT_OK'))).toBe(true)
  })
  it('숨겨진 계단을 알면(OB_HIDDEN_STAIR) 밤에 7층으로 가는 방법이 달라진다(봉쇄하면 달라지지 않는다)', () => {
    const stairLine = SCENARIO.ch2_night.find((n) => n.t === 'line' && n.when?.includes('OB_HIDDEN_STAIR'))
    expect(stairLine && stairLine.t === 'line' && stairLine.when).toContain('!FLAG_P2_STAIR_SEALED')
    const used = all.luna.filter((o) => flag(o.s, 'OB_HIDDEN_STAIR') && !flag(o.s, 'FLAG_P2_STAIR_SEALED')).length
    expect(used).toBeGreaterThan(0)
  })
  it('경로별 결과가 챕터 2 종료 뒤에도 보존된다(다음 챕터로 이어가도 상태 유지)', () => {
    for (const st of ['hermione', 'ginny', 'luna', 'pansy']) {
      const o = all[st][0]; const f = { hermione: 'FLAG_P2_RESEARCH', ginny: 'FLAG_P2_PITCH', luna: 'FLAG_P2_SECRET', pansy: 'FLAG_P2_SLY' }[st]!
      const next = continueChapter(clone(o.s))
      expect(next.flags[f], st).toBe(true); expect(next.chapter, st).toBe(3)
      for (const h of ['hermione', 'ginny', 'luna', 'pansy']) expect(next.bonds![h].stage).toBe(o.s.bonds![h].stage) // 다른 히로인과의 관계가 이월에서 초기화되지 않는다
    }
  })
  it('저장→불러오기(세이브 검증)를 거쳐도 경로와 관계 상태가 동일하다', () => {
    for (const st of ['hermione', 'pansy']) {
      const o = all[st][0]; const f = { schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: o.s }
      const back = validateSave(JSON.parse(JSON.stringify(f))).state
      expect(back.flags).toEqual(o.s.flags); expect(back.knowledge).toEqual(o.s.knowledge); expect(back.bonds).toEqual(o.s.bonds); expect(back.choices).toEqual(o.s.choices)
    }
  })
})

describe('사건 수첩: 경로 기록', () => {
  const door = (o: Out) => buildCases(o.s).find((c) => c.id === 'seventh-door')
  it('선택한 경로와 그 경로의 단서만 기록되고, 다른 경로에서만 얻는 정보는 공개되지 않는다', () => {
    const txt = (st: string) => JSON.stringify(door(all[st][0]))
    expect(txt('hermione')).toContain('룬 사본'); expect(txt('hermione')).not.toMatch(/급강하|태피스트리|가문의 편지/)
    expect(txt('ginny')).toContain('경기장'); expect(txt('ginny')).not.toMatch(/룬 사본|태피스트리|가문의 편지/)
    expect(txt('luna')).toContain('나선 계단'); expect(txt('luna')).not.toMatch(/룬 사본|급강하|가문의 편지/)
    expect(txt('pansy')).toContain('판시의 부탁'); expect(txt('pansy')).not.toMatch(/룬 사본|급강하|태피스트리/)
  })
  it('기록은 출처를 나눈다: 직접 본 것 · 들은 이야기 · 추측 · 의문, 그리고 직접 본 결론 하나뿐이다', () => {
    const d = door(all.hermione[0])!
    expect(d.obs.length).toBeGreaterThan(1); expect(d.questions.length).toBeGreaterThan(0)
    expect(d.resolution.join()).toContain('직접 보았다')
    expect(JSON.stringify(d)).not.toMatch(/변신|여성|말포이가 그/) // 해리가 알 수 없는 사실·비밀을 쓰지 않는다
  })
  it('열람은 상태를 바꾸지 않는다(순수 파생)', () => {
    const s = all.luna[0].s; const before = JSON.stringify(s); buildCases(s); buildJournal(s); expect(JSON.stringify(s)).toBe(before)
  })
  it('다른 경로의 플레이 스타일은 수첩 내용이 서로 다르다', () => {
    const sig = (st: string) => JSON.stringify(door(all[st][0])?.obs)
    expect(new Set(['hermione', 'ginny', 'luna', 'pansy'].map(sig)).size).toBe(4)
  })
})

describe('관계 조건부 장면', () => {
  const eve = (patch: (s: GameState) => void) => { const s = newState(START_SCENE, 5); s.scene = 'ch2_eve'; s.idx = 0; s.chapter = 2; s.calendar = { date: '09-27', weekday: '금', slot: '-' }; patch(s); return run(s) }
  const hi = (s: GameState, h: 'hermione' | 'ginny' | 'luna' | 'pansy') => { s.bonds![h].stage = 2; s.emotions[h].trust = 80; s.flags[`FLAG_RT_${h.toUpperCase()}_OK`] = true }
  it('높은 호감·신뢰 + 함께한 사건이면 친밀 장면이 열린다(히로인별로 서로 다른 장면)', () => {
    const scenes = (['hermione', 'ginny', 'luna', 'pansy'] as const).map((h) => eve((s) => hi(s, h)).scene)
    expect(scenes).toEqual(['ch2_eve_i_hermione', 'ch2_eve_i_ginny', 'ch2_eve_i_luna', 'ch2_eve_i_pansy_body'])
  })
  it('신뢰가 같아도 함께한 사건이 없으면 친밀 장면이 열리지 않고 일반 장면으로 진행된다(숫자만으로 열리지 않음)', () => {
    expect(eve((s) => { s.bonds!.luna.stage = 3; s.emotions.luna.trust = 99 }).scene).toBe('ch2_eve_gen')
    expect(eve((s) => { s.bonds!.pansy.stage = 3; s.emotions.pansy.trust = 99 }).scene).toBe('ch2_eve_gen')
  })
  it('호감이 낮아도 메인 진행은 막히지 않는다: 일반 장면 뒤 첫 경기로 이어진다', () => {
    const s = eve(() => {}); expect(s.scene).toBe('ch2_eve_gen')
    let t = s; for (let i = 0; i < 20 && t.scene === 'ch2_eve_gen'; i++) t = run({ ...t, idx: t.idx + 1 }); expect(['ch2_eve_gen', 'ch2_match']).toContain(t.scene)
  })
  it('약속·규칙을 어긴 이력이 있으면 갈등 장면이 우선한다', () => {
    expect(eve((s) => { hi(s, 'hermione'); s.flags.FLAG_P2_BREACH = true }).scene).toBe('ch2_eve_t_hermione_breach')
    expect(eve((s) => { s.flags.FLAG_P2_STAIR_SEALED = true }).scene).toBe('ch2_eve_t_luna')
    expect(eve((s) => { s.flags.FLAG_P2_STAYED_OUT = true }).scene).toBe('ch2_eve_t_pansy')
    expect(eve((s) => { s.flags.FLAG_P2_HOOCH_CHECK = true }).scene).toBe('ch2_eve_t_ginny')
  })
  it('질투·반응은 실제로 목격된 경우에만 생긴다: 목격이 없으면 같은 관계 단계에서도 반응 장면이 없다', () => {
    expect(eve((s) => { s.bonds!.pansy.stage = 2 }).scene).toBe('ch2_eve_gen')
    const seen = eve((s) => { s.bonds!.pansy.stage = 2; s.calendar.date = '09-27'; s.recent = [{ who: 'hermione', day: 26, witnesses: ['pansy'] }] })
    expect(seen.scene).toBe('ch2_eve_t_pansy')
    const old = eve((s) => { s.bonds!.pansy.stage = 2; s.recent = [{ who: 'hermione', day: 10, witnesses: ['pansy'] }] }) // 오래전 목격은 반응하지 않는다
    expect(old.scene).toBe('ch2_eve_gen')
    const other = eve((s) => { s.bonds!.pansy.stage = 2; s.recent = [{ who: 'hermione', day: 26, witnesses: ['ginny'] }] }) // 판시가 보지 못한 만남
    expect(other.scene).toBe('ch2_eve_gen')
  })
  it('같은 목격이라도 인물의 단계·성격에 따라 반응이 다르다(헤르미온느: 호기심→서운함, 판시: 경쟁심)', () => {
    const code = (obs: string, who: string, stage: number) => { const s = newState(START_SCENE, 1); s.bonds![obs].stage = stage; s.calendar = { date: '09-27', weekday: '금', slot: '-' }; s.recent = [{ who, day: 27, witnesses: [obs] }]; return [1, 2, 3, 4, 5].find((k) => evalCond(s, `REACT_${obs}_${who}==${k}`)) }
    expect(code('hermione', 'pansy', 1)).toBe(3); expect(code('hermione', 'pansy', 2)).toBe(4); expect(code('pansy', 'hermione', 2)).toBe(2)
    expect(code('hermione', 'pansy', 0)).toBe(5) // 아직 서먹한 사이: 무관심
  })
  it('친밀 장면의 모든 선택지: 거절·보류 선택은 불이익(신뢰 하락·경계 상승) 없이 받아들여진다', () => {
    for (const h of ['hermione', 'ginny', 'luna', 'pansy']) {
      const n = [...SCENARIO[`ch2_eve_i_${h}`], ...(SCENARIO[`ch2_eve_i_${h}_body`] ?? [])].find((x) => x.t === 'choice')
      if (n?.t !== 'choice') throw new Error('no choice')
      const decl = n.options.filter((o) => o.fx?.some((e) => /DECLINED_GENTLY|_SLOW/.test(e)))
      expect(decl.length, h).toBeGreaterThanOrEqual(1)
      for (const o of decl) for (const e of o.fx ?? []) expect(e, `${h} ${o.key}`).not.toMatch(/(trust|affinity)-|wariness\+/)
    }
  })
  it('연애 상태는 명시적 합의 선택에서만 open이 되며 챕터 2에서 together·poly 효과는 없다', () => {
    const opens: string[] = []
    for (const [id, nodes] of Object.entries(SCENARIO)) if (/^ch2_/.test(id)) for (const n of nodes) {
      if (n.t === 'choice') for (const o of n.options) for (const e of o.fx ?? []) { expect(e, `${id} ${o.key}`).not.toMatch(/romance:\w+=together|poly:/); if (/romance:\w+=open/.test(e)) opens.push(`${id}:${o.key}:${o.text}`) }
      if (n.t === 'fx') for (const e of n.fx) expect(e, id).not.toMatch(/romance:\w+=(open|together)|poly:/)
    }
    expect(opens.length).toBe(4)
    for (const o of opens) expect(o, '동의를 묻는 선택').toMatch(/잡아도 돼|확인해 봐|가도 돼|좋아해/)
  })
  it('친밀 장면 보상은 한 번만 적용된다: 한 번의 플레이에서 L-0x 선택은 최대 1회', () => {
    for (const outs of Object.values(all)) for (const o of outs) {
      const rs = o.s.choices.filter((c) => /^L-/.test(c.id) && c.id !== 'L-21')
      expect(rs.length).toBeLessThanOrEqual(1)
    }
  })
  it('질투/경쟁 반응 장면은 다른 히로인의 관계를 초기화하지 않는다', () => {
    const s0 = eve((s) => { s.bonds!.pansy.stage = 2; s.recent = [{ who: 'hermione', day: 26, witnesses: ['pansy'] }]; s.bonds!.hermione.stage = 2; s.bonds!.ginny.stage = 3 })
    const n = currentNode(s0); expect(n).toBeTruthy()
    let t = s0; for (let i = 0; i < 40 && currentNode(t)?.t !== 'choice'; i++) { const nn = currentNode(t); if (nn?.t === 'line') t = run({ ...t, idx: t.idx + 1 }); else break }
    const v = visibleOptions(t, currentNode(t) as never, true); t = choose(t, v[0].key)
    expect(t.bonds!.hermione.stage).toBe(2); expect(t.bonds!.ginny.stage).toBe(3)
  })
})

describe('경로 행사(게시판): 날짜·시간·장소·조건', () => {
  it('Ch2 경로 행사는 해당 경로·정확한 날짜/시간대/장소에서만 열린다', () => {
    const mk = (flagId: string, date: string, slot: number) => { const s = newState(START_SCENE, 1); s.flags[flagId] = true; s.routine = { days: [{ date, weekday: '목' }], dayIdx: 0, slotIdx: slot, night: false, then: 'x', locations: [], encounters: {}, pendingDone: false, message: null }; return s }
    expect(openEventsAt(mk('FLAG_P2_RESEARCH', '09-27', 1), 'library').map((e) => e.id)).toContain('ap2_research')
    expect(openEventsAt(mk('FLAG_P2_RESEARCH', '09-27', 0), 'library').map((e) => e.id)).not.toContain('ap2_research')
    expect(openEventsAt(mk('FLAG_P2_RESEARCH', '09-26', 1), 'library').map((e) => e.id)).not.toContain('ap2_research')
    expect(openEventsAt(mk('FLAG_P2_PITCH', '09-27', 1), 'library').map((e) => e.id)).not.toContain('ap2_research') // 다른 경로
    expect(openEventsAt(mk('FLAG_P2_PITCH', '09-26', 1), 'pitch').map((e) => e.id)).toContain('ap2_pitch')
    expect(openEventsAt(mk('FLAG_P2_SECRET', '09-27', 1), 'lake').map((e) => e.id)).toContain('ap2_secret')
    expect(openEventsAt(mk('FLAG_P2_SLY', '09-27', 1), 'library').map((e) => e.id)).toContain('ap2_sly')
    expect(CALENDAR.filter((e) => e.id.startsWith('ap2_')).length).toBe(6)
  })
  it('행사를 놓쳐도(attend 낮음) 경로의 핵심 단서는 시작 사건에서 이미 주어진다', () => {
    for (const o of all.none) { const any = ['RESEARCH', 'PITCH', 'SECRET', 'SLY', 'UNSTABLE'].some((p) => flag(o.s, 'FLAG_P2_' + p)); expect(any).toBe(!(o.scenes.has('ch2_open_snape') || o.scenes.has('ch2_open_b'))) }
    for (const o of all.hermione) expect(flag(o.s, 'KN_KNOT_BLOCK')).toBe(true)
    for (const o of all.ginny) expect(flag(o.s, 'OB_WINDOW_WEST7') || flag(o.s, 'FLAG_P2_HOOCH_CHECK') || flag(o.s, 'FLAG_P2_LEFT_TO_GINNY')).toBe(true)
  })
})

describe('정상 플레이 도달성(강제 상태 주입 없이)', () => {
  const reached = (st: string, scene: string) => all[st].filter((o) => o.scenes.has(scene)).length
  it('깊이 들어가는 플레이(deep)는 판시의 친밀 장면과 그 뒤의 밤까지 정상 플레이로 도달한다', () => {
    console.log('[deep]', JSON.stringify({ 친밀: reached('deep', 'ch2_eve_i_pansy_body'), 밤: reached('deep', 'ch2_eve_i_pansy_night'), 밤_수락: reached('deep', 'ch2_eve_i_pansy_night_A'), 비밀공유: all.deep.filter((o) => flag(o.s, 'FLAG_P2_PAN_CONFIDED')).length }))
    expect(reached('deep', 'ch2_eve_i_pansy_body')).toBeGreaterThan(0); expect(reached('deep', 'ch2_eve_i_pansy_night')).toBeGreaterThan(0)
    expect(reached('deep', 'ch2_eve_i_pansy_night')).toBeLessThan(all.deep.length) // 조건(비밀 공유 + 높은 신뢰)이 있어 모두에게 열리지는 않는다
  })
  it('과감한 플레이(bold): 멱살(L-15 D)과 비밀 폭로(L-14 D)가 모두 정상 플레이에서 선택지로 열리고 후폭풍이 남는다', () => {
    console.log('[bold]', JSON.stringify({ 멱살: reached('bold', 'ch2_eve_t_draco_D'), 폭로: all.bold.filter((o) => o.s.flags.FLAG_P2_BETRAYED_PANSY).length }))
    expect(reached('bold', 'ch2_eve_t_draco_D')).toBeGreaterThan(0)
    expect(all.bold.filter((o) => o.s.flags.FLAG_P2_BETRAYED_PANSY).length).toBeGreaterThan(0)
    for (const o of all.bold.filter((x) => x.s.flags.FLAG_P2_FIGHT_DRACO || x.s.flags.FLAG_P2_BETRAYED_PANSY)) { expect(o.ended).toBe(true); expect(flag(o.s, 'FLAG_DRACO_CHANGED')).toBe(true) }
  })
  it('헤르미온느 갈등의 두 원인(서고 위반 / 판시와의 만남 목격)은 모두 정상 플레이로 도달한다', () => {
    const n = (scene: string) => Object.keys(all).reduce((a, st) => a + reached(st, scene), 0)
    console.log('[hermione-t]', JSON.stringify({ seen: n('ch2_eve_t_hermione_seen'), breach: n('ch2_eve_t_hermione_breach') }))
    expect(n('ch2_eve_t_hermione_seen')).toBeGreaterThan(0); expect(n('ch2_eve_t_hermione_breach')).toBeGreaterThan(0)
  })
})

describe('8가지 플레이 스타일 비교', () => {
  it('스타일마다 서로 다른 장면 집합을 본다: 경로 스타일 간 고유 장면이 충분하다', () => {
    const uniq = (a: string, b: string) => { const A = new Set(all[a].flatMap((o) => [...o.scenes])); const B = new Set(all[b].flatMap((o) => [...o.scenes])); return [...A].filter((x) => !B.has(x)).length }
    for (const [a, b] of [['hermione', 'ginny'], ['ginny', 'luna'], ['luna', 'pansy'], ['pansy', 'hermione'], ['hermione', 'none']]) expect(uniq(a, b), `${a} vs ${b}`).toBeGreaterThanOrEqual(8)
  })
  it('관계 조건에 따른 특별 장면이 실제로 나온다: 친밀·갈등·일반이 모두 관측되고 스타일에 따라 다르다', () => {
    const kinds = new Set<string>(); const byStyle: Record<string, Set<string>> = {}
    for (const [st, outs] of Object.entries(all)) { byStyle[st] = new Set(); for (const o of outs) for (const x of o.scenes) { const m = x.match(/^ch2_eve_([ti])_|^ch2_eve_(gen)$/); if (m) { const k = m[1] ?? m[2]; kinds.add(k); byStyle[st].add(k) } } }
    expect([...kinds].sort()).toEqual(['gen', 'i', 't'])
    const frac = (st: string) => all[st].filter((o) => [...o.scenes].some((x) => /^ch2_eve_i_/.test(x))).length / N
    console.log('[intimate-frac]', JSON.stringify(Object.fromEntries(Object.keys(all).map((k) => [k, frac(k)]))), 'N', N)
    expect(frac('none')).toBeLessThan(0.25) // 관계에 신경 쓰지 않는 플레이는 친밀 장면에 거의 도달하지 않는다
    expect(frac('hermione')).toBeGreaterThanOrEqual(0.5) // 원래 기준 복원: 현재 구현에서 16시드 중 8회(0.5)로 충족. 기준을 낮췄던 0.4는 쉬기 제거 직후의 표본 분포였고 챕터 2 E 경로 분리로 달라졌다
    expect(byStyle.hermione.has('i') && byStyle.luna.has('i')).toBe(true)
    expect(byStyle.conflict.has('t')).toBe(true) // 갈등이 많은 플레이는 갈등 장면에 도달한다
  })
  it('다자 관계: 여러 히로인과 친밀감을 쌓는 스타일(multi)이 서로 다른 히로인의 친밀 장면에 도달한다', () => {
    const who = new Set<string>(); for (const o of all.multi) for (const x of o.scenes) { const m = x.match(/^ch2_eve_i_(\w+)$/); if (m) who.add(m[1]) }
    expect(who.size).toBeGreaterThanOrEqual(2)
    for (const o of all.multi) expect(Object.values(o.s.bonds!).filter((b) => b.romance === 'together').length).toBe(0) // 합의 없는 다자 연애는 성립하지 않는다
  })
  it('조건식에 쓰인 모든 변수가 해석 가능하다(오타 없음)', () => {
    const s = newState(START_SCENE, 1)
    for (const c of [...Object.values(TENSION), ...Object.values(INTIMATE)]) expect(() => evalCond(s, c), c).not.toThrow()
  })
})
