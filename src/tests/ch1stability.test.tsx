import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { advance, choose, clone, currentNode, listActions, newState, pickActivity, run, setActivityScenes, setIncidents, setRandomEvents } from '../engine/core'
import { loadFromSlot, rawGet, saveToSlot, validateSave } from '../engine/save'
import { store } from '../engine/store'
import { buildCases } from '../data/cases'
import { DRACO_SCHEDULE, HEROINE_SCHEDULE } from '../data/constants'
import { INCIDENTS } from '../data/incidents'
import { JOURNAL, buildJournal } from '../data/journal'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'
import { play } from './helpers'
import { simulate2 } from './ch2sim'

/**
 * Antigravity Ch1 플레이테스트 결함(docs/antigravity-qa/CH1_PLAYER_EXPERIENCE_REVIEW.md) 재현·회귀 + 기존 저장 호환성.
 * 구분: "natural"은 엔진 진행, "forced"는 상태를 직접 구성한 재현이다. 화면 확인은 브라우저 QA(보고서)이며 여기서는 DOM/상태만 본다.
 */
const file = (state: GameState) => ({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state })
const choiceRec = (id: string, option: string) => ({ id, option, scene: 'x', date: '09-01' })
const page = (s: GameState, id: string) => buildJournal(s).find((p) => p.id === id)
const textOf = (s: GameState, id: string) => JSON.stringify(page(s, id) ?? {})
const FEAST = '개학 연회에서 순찰은 혼자 돌았다고'

describe('P0 H-02 B 수첩 정보 귀속', () => {
  const base = () => { const s = newState(START_SCENE, 1); s.knowledge.OB_SLEEVE = true; s.bonds!.hermione.seen = 1; return s }
  it('[forced] 개학 연회에서 헤르미온느가 털어놓은 말은 헤르미온느의 기록이며 드레이코 기록에는 없다', () => {
    const s = base(); s.choices.push(choiceRec('H-02', 'B'))
    expect(textOf(s, 'hermione')).toContain(FEAST); expect(page(s, 'hermione')!.observed.join('')).toContain(FEAST)
    expect(textOf(s, 'draco')).not.toContain(FEAST)
  })
  it('[forced] H-02 B를 고르지 않았으면 어느 기록에도 그 말이 없다(정보 비노출), A는 순찰의 고백만 남긴다', () => {
    const none = base(); expect(textOf(none, 'hermione')).not.toContain(FEAST); expect(textOf(none, 'draco')).not.toContain(FEAST)
    const a = base(); a.choices.push(choiceRec('H-02', 'A')); expect(textOf(a, 'hermione')).not.toContain(FEAST); expect(textOf(a, 'hermione')).toContain('올해가 무섭다고'); expect(textOf(a, 'draco')).not.toContain('올해가 무섭다고')
  })
  it('[natural] 드레이코를 마주치지 않으려는 플레이(K-01 C)에서도 직접 경험 기록에 다른 인물의 고백이 생기지 않는다', () => {
    const r = play({ 'H-02': 'B', 'K-01': 'C' }, 3, { stopAt: (x) => x.scene === 'ch2_open' })
    expect(textOf(r.s, 'draco')).not.toContain(FEAST); expect(textOf(r.s, 'hermione')).toContain(FEAST)
  })
  it('[static] 다른 선택 경로도 점검: 특정 인물만의 일대일 선택(H-03 헤르미온느·H-04 지니·H-05 루나·H-06 판시, H-02 헤르미온느/루나)의 기록은 그 인물의 페이지에만 있다', () => {
    const owner: Record<string, string[]> = { H03: ['hermione'], H04: ['ginny'], H05: ['luna'], H06: ['pansy'], H02: ['hermione', 'luna'] }
    for (const c of JOURNAL) for (const e of c.entries) {
      const m = e.when.match(/CH_(H0[2-6])_/g); if (!m) continue
      for (const tag of new Set(m.map((x) => x.slice(3, 6)))) expect(owner[tag], `${c.id}: ${e.text.slice(0, 20)}`).toContain(c.id)
    }
  })
  it('[forced] 저장 → 불러오기 뒤에도 정보 귀속이 같다(수첩은 저장 상태에서 파생된다)', () => {
    const s = base(); s.choices.push(choiceRec('H-02', 'B'))
    const back = validateSave(JSON.parse(JSON.stringify(file(s)))).state
    expect(textOf(back, 'hermione')).toBe(textOf(s, 'hermione')); expect(textOf(back, 'draco')).toBe(textOf(s, 'draco'))
  })
})

describe('P0 기존 저장 데이터 호환성', () => {
  /** 이번 개편 이전에는 없던 필드·플래그·선택 이력을 걷어내 "예전 저장"처럼 만든다(실제 구버전 파일은 저장소에 없다: forced) */
  const strip = (s: GameState): GameState => {
    const o = clone(s) as Partial<GameState> & GameState
    delete o.seen; delete o.deeds
    for (const k of Object.keys(o.flags)) if (/^FLAG_(C1|C4|C5)_/.test(k)) delete o.flags[k]
    for (const k of ['OB_SEVEN_RIPPLE', 'KN_SEVEN_WEST', 'KN_LETTER_DRAWER', 'KN_ROOM_RULE', 'OB_NOTE_TIN', 'KN_BARE_HAND']) delete o.knowledge[k]
    o.choices = o.choices.filter((c) => !/^C[145]-/.test(c.id))
    return o
  }
  beforeEach(() => { window.localStorage.clear() })
  const states = () => { setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS); const o = simulate2('H5A', 2, 'ch2_end', 5); return { ch1: o.snaps.v2c1_week, ch2: o.snaps.ch2_open, ch4: o.snaps.ch4_routine, ch5: o.snaps.ch5_dawn ?? o.snaps.ch5_news, end: o.s } }
  afterEach(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })

  it('[forced] 새 필드·플래그가 없는 Ch1·Ch2·Ch4·Ch5 저장을 불러오면 선택 이력·장면·진행 상태가 그대로이고 누락 필드는 빈 기본값이 된다', () => {
    const st = states()
    for (const [k, s] of Object.entries(st)) {
      const old = strip(s); const back = validateSave(JSON.parse(JSON.stringify(file(old)))).state
      expect(back.scene, k).toBe(old.scene); expect(back.idx, k).toBe(old.idx); expect(back.choices, k).toEqual(old.choices); expect(back.chapter).toBe(old.chapter)
      expect(back.stats).toEqual(old.stats); expect(back.emotions).toEqual(old.emotions); expect(back.board).toEqual(old.board)
      expect(back.seen).toEqual({}); expect(back.deeds).toEqual({})
    }
  })
  it('[forced] 선택 이력만으로 의미가 정해지는 플래그(H-03 B → FLAG_C1_HER_RESPECT)만 복원하고, 근거 없는 관계 플래그는 그대로 없다', () => {
    const b = strip(states().ch2); b.choices.push(choiceRec('H-03', 'B')); const a = strip(states().ch2); a.choices.push(choiceRec('H-03', 'A'))
    expect(validateSave(JSON.parse(JSON.stringify(file(b)))).state.flags.FLAG_C1_HER_RESPECT).toBe(true)
    const la = validateSave(JSON.parse(JSON.stringify(file(a)))).state.flags
    expect(la.FLAG_C1_HER_RESPECT).toBeUndefined()
    for (const k of ['FLAG_C1_LUNA_LISTENED', 'FLAG_C1_LUNA_DOUBTED', 'FLAG_C1_PAN_SHARED', 'FLAG_C1_RON_HEARD', 'FLAG_C1_GIN_BET', 'FLAG_C1_HER_PERSONAL', 'FLAG_C1_LEAKED_LETTER']) expect(la[k], k).toBeUndefined()
  })
  it('[forced] 예전 저장에서 이어 한 뒤 Ch1 → Ch2 상태 전달과 후속 반응이 막히지 않는다(관계 플래그 없이도 Ch2 도입이 진행된다)', () => {
    const old = strip(states().ch1); const s = validateSave(JSON.parse(JSON.stringify(file(old)))).state
    const r = play({}, 5, { from: s, stopAt: (x) => x.scene === 'ch2_open' }); expect(r.s.scene).toBe('ch2_open'); expect(r.s.chapter).toBe(2)
    expect(r.s.choices.slice(0, old.choices.length)).toEqual(old.choices) // 기존 선택 이력은 그대로 앞에 남는다
  })
  it('[forced] 반복 로드·재저장에서 상태가 누적 변경되지 않는다(멱등)', () => {
    const old = strip(states().ch4); let cur = validateSave(JSON.parse(JSON.stringify(file(old)))); const first = JSON.stringify(cur.state)
    for (let i = 0; i < 3; i++) cur = validateSave(JSON.parse(JSON.stringify(cur)))
    expect(JSON.stringify(cur.state)).toBe(first)
    saveToSlot('slot3', cur.state, new Set(['a'])); const l1 = loadFromSlot('slot3')!; saveToSlot('slot3', l1.state, new Set(l1.read)); expect(JSON.stringify(loadFromSlot('slot3')!.state)).toBe(first)
  })
  it('[forced] 손상된 저장은 안전하게 거부되고 원본 데이터는 파괴되지 않는다(필드 누락과 손상을 구분한다)', () => {
    const good = file(states().ch2); saveToSlot('slot4', good.state, new Set())
    const raw = rawGet('save:slot4')!; const broken = JSON.parse(raw); broken.state.scene = '존재하지 않는 장면'; broken.state.idx = 9999
    window.localStorage.setItem('hfd:save:slot5', JSON.stringify(broken)); const before = window.localStorage.getItem('hfd:save:slot5')
    expect(loadFromSlot('slot5')).toBeNull(); expect(window.localStorage.getItem('hfd:save:slot5')).toBe(before) // 불러오기 실패가 원본을 지우지 않는다
    expect(() => validateSave({ schemaVersion: 2, state: { mode: 'STORY' } })).toThrow(); expect(() => validateSave(null)).toThrow()
    expect(loadFromSlot('slot4')).not.toBeNull() // 정상 저장은 영향 없음
    const missing = JSON.parse(raw); delete missing.state.seen; delete missing.state.deeds; delete missing.state.termsRead
    expect(() => validateSave(missing)).not.toThrow() // 선택 필드 누락은 손상이 아니라 기본값으로 보정한다
  })
  it('[forced] 저장 → 새로고침(앱 재마운트) → 불러오기 왕복에서 수첩·선택 이력·시간이 같다', () => {
    const s = states().ch4; store.toTitle(); saveToSlot('slot2', s, new Set())
    const back = loadFromSlot('slot2')!.state; expect(back.choices).toEqual(s.choices); expect(back.calendar).toEqual(s.calendar); expect(back.flags).toEqual(s.flags)
    expect(JSON.stringify(buildJournal(back))).toBe(JSON.stringify(buildJournal(s))); expect(JSON.stringify(buildCases(back))).toBe(JSON.stringify(buildCases(s)))
  })
})

describe('P1 H-08 B 경로(치환 제거 후)', () => {
  const week = (hist: [string, string][]) => { const s = newState(START_SCENE, 3); s.scene = 'v2c1_week'; s.idx = 0; s.mode = 'STORY'; s.chapter = 1; for (const [id, o] of hist) s.choices.push(choiceRec(id, o)); let t = run(s); for (let i = 0; i < 60; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
  const pickB = (s: GameState) => { let t = choose(s, 'B'); for (let i = 0; i < 40 && t.scene !== 'v2c1_routine'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } return t }
  it('[forced] 이전에 치환이 일어나던 이력(프롤로그 A·연회 H-01 A)에서도 B(경기장 소리)는 지니 경로를 유지한다(치환 제거)', () => {
    const t = pickB(week([['H-01', 'A'], ['P-01', 'A']]))
    expect(t.flags.FLAG_RT_GINNY).toBe(true); expect(t.flags.FLAG_RT_PANSY_PITCH).toBeFalsy(); expect(t.flags.FLAG_RT_PANSY).toBeFalsy()
  })
  it('[forced] 다른 이력에서는 B가 지니 경로 그대로다. 나머지 선택지(A·C·D·E·F)는 이력과 무관하게 각자의 경로로 간다', () => {
    expect(pickB(week([['H-01', 'B'], ['P-01', 'A']])).flags.FLAG_RT_GINNY).toBe(true)
    const m: Record<string, string> = { A: 'FLAG_RT_HERMIONE', C: 'FLAG_RT_LUNA', D: 'FLAG_RT_PANSY', E: 'FLAG_RT_DRACO' }
    for (const [k, f] of Object.entries(m)) { let t = choose(week([['H-01', 'A'], ['P-01', 'A']]), k); for (let i = 0; i < 40 && t.scene !== 'v2c1_routine'; i++) { const n = currentNode(t); if (n?.t === 'line') t = advance(t); else break } expect(t.flags[f], k).toBe(true) }
  })
  it('[forced] 치환 장면(v2c1_week_B_stands)이 없고, B 선택 후 이어지는 서술에 "따라갈 소리를 바꾼다"는 말이 나오지 않는다', () => {
    expect(SCENARIO.v2c1_week_B_stands).toBeUndefined(); expect(JSON.stringify(SCENARIO.v2c1_week_B)).not.toContain('unflag')
    const t = pickB(week([['H-01', 'A'], ['P-01', 'A']])); expect(t.backlog.map((b) => b.text).join('|')).not.toContain('그쪽으로 바꾸기로')
  })
})

describe('P1 자유 일과: 드레이코 조우와 히로인 이벤트', () => {
  const routineAt = (rt: string[], date: number, slot: number) => {
    setActivityScenes(true); setRandomEvents([]); setIncidents(INCIDENTS)
    let s = newState(START_SCENE, 5); s.scene = 'v2c1_routine'; s.idx = 0; s.mode = 'STORY'; s.chapter = 1; for (const f of rt) s.flags[f] = true; s = run(s)
    for (let i = 0; i < 20 && s.mode !== 'ROUTINE'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else break }
    const o = clone(s); o.routine!.dayIdx = date; o.routine!.slotIdx = slot; return o
  }
  afterEach(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })
  it('[forced] 재현: 같은 칸에 드레이코와 히로인이 함께 있으면 드레이코 조우가 먼저 나온다(목요일 오후1 도서관: 헤르미온느·판시·드레이코)', () => {
    const s = routineAt([], 1, 0); const t = pickActivity(s, 'library', 'study')
    expect(t.routine!.after ?? t.scene).toMatch(/enc1_library/)
  })
  it('[forced] 선점된 히로인 이벤트는 사라지지 않는다: 드레이코가 없는 칸에서 다시 열린다(금요일 오후1 도서관: 헤르미온느만)', () => {
    const s = routineAt([], 2, 0); const t = pickActivity(s, 'library', 'study')
    expect(JSON.stringify([t.scene, t.routine?.after])).toMatch(/hr1_hermione_library/)
  })
  it('[forced] 드레이코 조우 풀이 소진되면 드레이코가 그 칸에 있어도 히로인 이벤트가 열린다(이전의 `!dracoHere` 차단 제거)', () => {
    const s = routineAt([], 1, 0); s.encCount.library = 2 // enc1_library 두 장면을 이미 본 상태
    const t = pickActivity(s, 'library', 'study'); expect(JSON.stringify([t.scene, t.routine?.after])).toMatch(/hr1_pansy_library/)
  })
  it('[static] 챕터 1 자유 일과(수~금 9칸)에서 히로인 만남이 일정표상 영구히 열리지 않는 장면을 찾는다: 히로인이 있는 칸에 항상 드레이코도 있으면 그 만남은 접근 불가다', () => {
    const days = ['수', '목', '금']; const meets: Record<string, Record<string, string[]>> = { hermione: { library: ['hr1_hermione_library_1', 'hr1_hermione_library_2'], greenhouse: ['hr1_hermione_greenhouse'], common: ['hr1_hermione_common'] }, ginny: { pitch: ['hr1_ginny_pitch_1', 'hr1_ginny_pitch_2'], courtyard: ['hr1_ginny_courtyard'], common: ['hr1_ginny_common'] }, luna: { lake: ['hr1_luna_lake_1', 'hr1_luna_lake_2'], greenhouse: ['hr1_luna_greenhouse'] }, pansy: { courtyard: ['hr1_pansy_courtyard_1', 'hr1_pansy_courtyard_2'], library: ['hr1_pansy_library'], pitch: ['hr1_pansy_pitch'] } }
    const dead: string[] = []
    for (const [h, byLoc] of Object.entries(meets)) for (const [loc, scenes] of Object.entries(byLoc)) {
      let free = 0; for (const d of days) for (let sl = 0; sl < 3; sl++) if (HEROINE_SCHEDULE[h][d][sl] === loc && DRACO_SCHEDULE[d][sl] !== loc) free++
      scenes.forEach((sc, i) => { if (free < i + 1) dead.push(sc) }) // i번째 장면은 그 장소에서 드레이코 없이 히로인을 i+1번 만나야 한다
    }
    // 정적 하한(드레이코가 항상 먼저일 때): 판시의 도서관·경기장 장면은 판시가 있는 모든 칸에 드레이코도 있다. 자연 도달은 엔진 규칙(드레이코를 더 자주 만난 뒤에는 히로인이 먼저)으로 열리며 ch1p1.test.tsx 의 [natural] 테스트가 증명한다
    expect(dead.sort()).toEqual(['hr1_pansy_library', 'hr1_pansy_pitch'])
  })
  it('[natural] 드레이코를 일부러 피하는 플레이(드레이코가 없는 장소·칸만 고름)로도 일과가 끝까지 진행되고 히로인 만남이 열린다', () => {
    let s = routineAt([], 0, 0); const seen = new Set<string>()
    for (let i = 0; i < 400 && s.mode !== 'ENDED' && s.scene !== 'v2c1_night'; i++) {
      seen.add(s.scene)
      if (s.mode === 'ROUTINE') {
        const r = s.routine!; const acts: [string, string][] = []
        for (const loc of r.locations) for (const a of listActions(s, loc)) if (a.ok && !a.actId.startsWith('ev:')) acts.push([loc, a.actId])
        const hero = acts.find(([loc]) => /library|courtyard|pitch|lake/.test(loc)) ?? acts[0]; s = pickActivity(s, hero[0], hero[1])
      } else { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else if (n?.t === 'choice') s = choose(s, n.options.filter((o) => !o.hesitate && !o.req)[0].key); else break }
    }
    expect([...seen].some((x) => /^hr1_/.test(x))).toBe(true); expect(s.scene).toBe('v2c1_night')
  })
})

describe('P1 시간 건너뛰기 안정화', () => {
  beforeEach(() => { vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle(); store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 }) })
  afterEach(() => { cleanup(); vi.useRealTimers() })
  const toMap = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }); act(() => { store.jump('v2c1_routine') }); for (let i = 0; i < 12 && store.state!.mode === 'STORY'; i++) act(() => { fireEvent.click(screen.getByTestId('stage')) }); act(() => { vi.advanceTimersByTime(900) }) }
  const click = (id: string) => act(() => { fireEvent.click(screen.getByTestId(id)) })
  it('[DOM] 기본값은 다음 시간대 1칸이며 확인 전에 소모 시간·놓칠 수 있는 일정이 보인다. "토요일 토요일" 중복 표기가 없다', () => {
    toMap(); click('skip-time')
    expect(screen.getByTestId('ts-elapsed').textContent).toMatch(/1칸/); expect(screen.getByTestId('ts-t-1').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('ts-boundary').textContent).not.toMatch(/(.요일) \1/); expect(screen.getByTestId('ts-boundary').textContent).not.toMatch(/토요일 토요일/)
  })
  it('[DOM] 구간 끝(9칸)은 직접 골라야 하며 두 번 확인해야 실행된다. 첫 확인과 취소는 상태를 바꾸지 않고, 확정 시 시간 한 번만 소모된다', () => {
    toMap(); click('skip-time'); click('ts-t-end'); const before = JSON.stringify(store.state)
    click('skip-confirm'); expect(JSON.stringify(store.state)).toBe(before); expect(screen.getByTestId('ts-armed').textContent).toMatch(/9칸/)
    click('ts-cancel'); expect(JSON.stringify(store.state)).toBe(before)
    click('skip-time'); click('ts-t-end'); click('skip-confirm'); click('skip-confirm'); expect(store.state!.routine).toBeNull()
  })
})

describe('P2 UI·표현 안정화(상태·DOM 확인; 화면은 브라우저 QA)', () => {
  it('[DOM] 폐문한 장소: 사유가 패널 상단에 한 번만 나오고 활동 카드마다 되풀이되지 않는다', async () => {
    cleanup(); vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle(); store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
    render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }); act(() => { store.jump('v2c1_routine') }); for (let i = 0; i < 12 && store.state!.mode === 'STORY'; i++) act(() => { fireEvent.click(screen.getByTestId('stage')) }); act(() => { vi.advanceTimersByTime(900) })
    act(() => { const s = clone(store.state!); s.routine!.slotIdx = 2; (store as unknown as { set: (x: GameState) => void }).set(s) })
    act(() => { fireEvent.click(screen.getByTestId('zone-castle')) }); act(() => { fireEvent.click(screen.getByTestId('loc-library')) })
    const reason = screen.getByTestId('loc-reason').textContent!; const body = screen.getByTestId('place-panel').textContent!
    expect(body.split(reason).length - 1).toBe(1); cleanup(); vi.useRealTimers()
  })
  it('[forced] 사건 수첩: 챕터 1 화요일 단서(OB/KN)는 고른 만큼만 나타나고, 고르지 않은 정보는 먼저 열리지 않는다', () => {
    const s = newState(START_SCENE, 1); const titles = (x: GameState) => JSON.stringify(buildCases(x))
    expect(titles(s)).not.toContain('파문'); expect(titles(s)).not.toContain('서랍에 넣는다')
    const a = clone(s); a.knowledge.OB_SEVEN_RIPPLE = true; expect(titles(a)).toContain('일곱까지 셌다'); expect(titles(a)).not.toContain('서쪽 높은 곳')
    const b = clone(s); b.knowledge.KN_SEVEN_WEST = true; expect(titles(b)).toContain('서쪽 높은 곳'); expect(titles(b)).not.toContain('일곱까지 셌다')
    const c = clone(s); c.knowledge.OB_SLEEVE = true; c.knowledge.KN_LETTER_DRAWER = true; expect(titles(c)).toContain('서랍에 넣는다')
  })
  it('[forced] 루나 대사의 시간 순서: 같이 일곱 번째 줄을 센 뒤에는 "아직 몇 번째 줄인지 못 셌어"라고 하지 않는다', () => {
    const lines = (flag: boolean) => { const s = newState(START_SCENE, 1); s.scene = 'hr1_luna_lake_2'; s.idx = 0; s.mode = 'EVENT'; s.chapter = 1; s.routine = { days: [{ date: '09-06', weekday: '금' }], dayIdx: 0, slotIdx: 2, night: false, then: 'v2c1_night', locations: [], encounters: {}, pendingDone: false, message: null }; if (flag) s.flags.FLAG_LUNA_COUNT7 = true; let t = run(s); const out: string[] = []; for (let i = 0; i < 40 && t.scene === 'hr1_luna_lake_2'; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
    expect(lines(false)).toContain('아직 몇 번째 줄인지는 못 셌어'); expect(lines(true)).not.toContain('아직 몇 번째 줄인지는 못 셌어'); expect(lines(true)).toContain('우리가 같이 세어서')
  })
  it('[forced] 캐릭터 정보창: 해리가 본 적 없는 변신·진짜 모습·숨은 포즈를 초상화로 먼저 보여 주지 않는다', async () => {
    const { Portrait } = await import('../ui/Journal')
    const s = newState(START_SCENE, 1); s.bonds!.draco.seen = 1; s.flags.FLAG_DRACO_CHANGED = true // 변신이 일어났지만 해리가 아직 진짜 모습을 보지 못한 상태
    const { container } = render(<Portrait state={s} id="draco" />)
    expect(container.innerHTML).not.toMatch(/data-form="true"|data-asset="true"/); expect(container.textContent).toContain('아직 표정을 눈여겨본 적 없다')
    cleanup()
    const seen = clone(s); seen.seen = { draco: { expr: 'calm', form: 'illusion' } }
    const r2 = render(<Portrait state={seen} id="draco" />); expect(r2.container.querySelector('[data-testid="j-expr"]')!.textContent).toBe('평온'); cleanup()
  })
})
