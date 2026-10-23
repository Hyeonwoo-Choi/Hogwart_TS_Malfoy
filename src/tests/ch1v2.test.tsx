import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { store } from '../engine/store'
import { advance, choose, currentNode, newState, run, setTransitions, startScene } from '../engine/core'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { ChoiceNode, GameState, Node } from '../engine/types'

const clickStage = () => act(() => { fireEvent.click(screen.getByTestId('stage')) })
const press = (key: string) => act(() => { fireEvent.keyDown(window, { key }) })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const fresh = () => newState(START_SCENE)
const withChoice = (s: GameState, id: string, option: string) => { s.choices.push({ id, option, scene: 't', date: '09-01' }); return s }

const ch1Scenes = () => Object.entries(SCENARIO).filter(([k]) => /^(v2c1_|hr1_|enc1_|fr1_)/.test(k))
const allNodes = () => ch1Scenes().flatMap(([k, ns]) => ns.map((n, i) => ({ k, i, n })))

describe('챕터 1 ↔ 챕터 8 키퍼 시점', () => {
  const ch8 = JSON.stringify(SCENARIO.ch8_letter ?? []) + JSON.stringify(Object.entries(SCENARIO).filter(([k]) => k.startsWith('ch8')))
  it('챕터 8은 "키퍼 선발이 다음 달"(이른 봄 주전 확정)을 전제한다', () => { expect(ch8).toContain('키퍼 선발이 다음 달') })
  it('챕터 1의 공지는 가을 평가 연습의 시작이며 주전 확정은 겨울 뒤로 미룬다', () => {
    const text = JSON.stringify(SCENARIO.v2c1_hall_ron)
    expect(text).toContain('평가 연습'); expect(text).toContain('주전 확정은 겨울이 지난 뒤')
  })
  it('챕터 1 어디에서도 가을에 주전 선발이 끝나는 것으로 말하지 않는다', () => {
    const lines = allNodes().filter((x) => x.n.t === 'line').map((x) => (x.n as { text: string }).text)
    for (const t of lines) expect(t, t).not.toMatch(/선발이 곧|선발은 다음 주|선발에서 떨어/)
  })
  it('H-07 A/B/C는 모두 마법약 수업으로 이어지고 기존 효과를 유지한다', () => {
    const expected: Record<string, string[]> = { A: ['ron.trust+2'], B: ['ron.affinity+2'], C: ['ron.trust+1'] }
    for (const k of ['A', 'B', 'C']) {
      let s = startScene(fresh(), 'v2c1_hall_ron')
      while (currentNode(s)?.t === 'line') s = advance(s) // 공지 장면 → 선택지(H-07)
      expect((currentNode(s) as ChoiceNode).id).toBe('H-07')
      const before = { t: s.emotions.ron.trust, a: s.emotions.ron.affinity }
      s = choose(s, k)
      while (currentNode(s)?.t === 'line' && s.scene !== 'v2c1_potions') s = advance(s)
      expect(s.scene, k).toBe('v2c1_potions')
      const d = { t: s.emotions.ron.trust - before.t, a: s.emotions.ron.affinity - before.a }
      const want = expected[k][0]
      expect(want.startsWith('ron.trust') ? d.t : d.a).toBe(Number(want.slice(-1)))
    }
  })
  it('H-02 B 이력이면 "열 번에 일곱" 후속 대사, 아니면 일반 대사가 나온다', () => {
    const run1 = (b: boolean) => {
      let s = fresh(); if (b) withChoice(s, 'H-02', 'B'); else withChoice(s, 'H-02', 'A')
      s = startScene(s, 'v2c1_hall_ron'); const out: string[] = []
      while (currentNode(s)?.t === 'line') { out.push((currentNode(s) as { text: string }).text); s = advance(s) }
      return out.join('\n')
    }
    expect(run1(true)).toContain('열 번에 일곱'); expect(run1(false)).not.toContain('열 번에 일곱')
    expect(run1(false)).toContain('확률 안에')
  })
})

describe('챕터 1 서사 보강', () => {
  const hallLines = (b: boolean) => {
    let s = fresh(); withChoice(s, 'H-02', b ? 'B' : 'A'); s = startScene(s, 'v2c1_hall'); const out: string[] = []
    while (currentNode(s)?.t === 'line' && s.scene === 'v2c1_hall') { out.push((currentNode(s) as { text: string }).text); s = advance(s) }
    return out.join('\n')
  }
  it('H-02 B 경로도 연회에서 헤르미온느의 불안을 듣는다(A 경로와 중복되지 않는다)', () => {
    expect(hallLines(true)).toContain('올해가 무서워'); expect(hallLines(false)).not.toContain('올해가 무서워')
  })
  it('슬리데린 위계가 행동으로 보인다(잔을 채우는 크레이브, 길을 피하는 하급생) — 변신을 암시하지 않는다', () => {
    const t = hallLines(false)
    expect(t).toContain('빈 잔을 말없이 채웠다'); expect(t).toContain('하급생')
    expect(t).not.toMatch(/변신|환영|여성|캐비닛/)
  })
  it('검은 봉투 한 줄은 추측형으로 쓰여 해리의 시점을 넘지 않는다', () => {
    const t = JSON.stringify(SCENARIO.v2c1_prologue)
    expect(t).toContain('검은 봉투'); expect(t).toContain('있는 모양이었다'); expect(t).not.toContain('있다는 뜻이었다')
  })
  it('기존 선택 ID·선택지 키·효과(H-01, H-02, P-01, K-01~04)가 유지된다', () => {
    const find = (id: string) => allNodes().map((x) => x.n).filter((n): n is ChoiceNode => n.t === 'choice' && n.id === id)[0]
    const keys = (id: string) => find(id).options.map((o) => o.key).join('')
    expect(keys('P-01')).toBe('ABCD'); expect(keys('K-01')).toBe('ABC'); expect(keys('K-02')).toBe('ABCD'); expect(keys('K-03')).toBe('ABCD'); expect(keys('K-04')).toBe('ABCDE') /* A~D 그대로, E는 판시와 교환한 정보가 있을 때만 열리는 추가 선택지 */
    expect(keys('H-01')).toBe('ABC'); expect(keys('H-02')).toBe('AB'); expect(keys('H-07')).toBe('ABC')
    const fx = (id: string, k: string) => find(id).options.find((o) => o.key === k)!.fx
    expect(fx('H-01', 'A')).toEqual(['pansy.trust+2', 'pansy.wariness-5'])
    expect(fx('H-01', 'B')).toEqual(['pansy.affinity-2', 'pansy.wariness+5'])
    expect(fx('H-01', 'C')).toEqual(['pansy.trust+1'])
    expect(fx('K-03', 'D')).toEqual(['flag:FLAG_PRIVATE_HELP', 'draco.trust+4', 'draco.affinity+1'])
    expect(fx('K-04', 'B')).toEqual(['flag:FLAG_MUTUAL_SECRET', 'promise:NIGHT_SILENCE', 'draco.wariness+3', 'draco.dependence+2'])
  })
})

describe('장면 전환(trans) — 엔진', () => {
  afterEach(() => setTransitions(false))
  it('꺼져 있으면(테스트·기본) 건너뛰고, 켜면 그 노드에서 멈췄다가 advance로 진행한다', () => {
    setTransitions(false)
    let s = startScene(fresh(), 'v2c1_hall'); expect(currentNode(s)?.t).toBe('line')
    setTransitions(true)
    s = startScene(fresh(), 'v2c1_hall')
    const n = currentNode(s) as Node & { title: string; place?: string }
    expect(n.t).toBe('trans'); expect(n.title).toBe('그날 저녁'); expect(n.place).toContain('대연회장')
    const idx = s.idx
    s = advance(s)
    expect(s.idx).toBeGreaterThan(idx); expect(currentNode(s)?.t).toBe('line')
  })
  it('챕터 1의 전환은 의미 있는 시간·장소 변화에만 있고, 비밀 장소·사건을 문구로 알리지 않는다', () => {
    const ts = allNodes().filter((x) => x.n.t === 'trans')
    expect(ts.map((x) => (x.n as { title: string }).title)).toEqual(['그날 저녁', '다음 날 오후', '다음 날 오후', '다음 날 방과 후', '토요일 밤', '다음 날 아침', '경기장에서 돌아오는 길', '화요일 저녁', '화요일 밤'])
    for (const x of ts) {
      const n = x.n as { title: string; place?: string }
      expect(n.title + (n.place ?? '')).not.toMatch(/7층|캐비닛|변신|환영|필요의 방|표식/)
      expect(x.i, `${x.k} 첫 노드 근처`).toBeLessThanOrEqual(1) // 장면 맨 앞에서만 쓴다(대사 사이에 끼지 않는다)
    }
    // 모든 대사 사이에 넣지 않는다: 전환은 장면 수에 비해 적다
    expect(ts.length).toBeLessThan(ch1Scenes().length / 3)
  })
  it('전환 직전·직후 장면의 날짜·요일과 문구가 모순되지 않는다(월요일 오후 마법약, 화요일 오후 경기장, 토요일 밤, 일요일 아침)', () => {
    const dateOf = (scene: string) => (SCENARIO[scene].find((n) => n.t === 'date') as { weekday: string } | undefined)?.weekday
    expect(dateOf('v2c1_potions')).toBe('월'); expect(dateOf('v2c1_pitch')).toBe('화'); expect(dateOf('v2c1_night')).toBe('토'); expect(dateOf('v2c1_followup')).toBe('일')
  })
  it('전환 노드가 있는 상태의 저장·복원: 같은 위치에서 한 번만 재생된다(위치가 그대로 보존)', () => {
    setTransitions(true)
    const s = startScene(fresh(), 'v2c1_hall')
    const back = JSON.parse(JSON.stringify(s)) as GameState
    expect(currentNode(back)?.t).toBe('trans'); expect(back.scene).toBe(s.scene); expect(back.idx).toBe(s.idx)
    expect(run(back).idx).toBe(s.idx) // run은 trans에서 멈춘다(자동으로 건너뛰지 않는다)
  })
})

describe('장면 전환 UI · 선택지 패널 · 지도', () => {
  beforeEach(() => {
    vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
    store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
  })
  afterEach(() => { cleanup(); setTransitions(false); vi.useRealTimers(); vi.unstubAllGlobals() })
  const start = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }

  it('페이드 전환: 어두운 화면에 시간·장소가 뜨고, 전환 중 클릭·키 입력은 대사를 넘기지 않으며, 끝나면 다음 장면이 시작된다', () => {
    setTransitions(true); start()
    act(() => { store.jump('v2c1_hall') })
    expect(screen.getByTestId('veil').textContent).toContain('그날 저녁'); expect(screen.getByTestId('veil').textContent).toContain('대연회장')
    const idx = store.state!.idx
    clickStage(); press('Enter'); press(' ')
    expect(store.state!.idx).toBe(idx) // 전환 중 입력 무시
    tick(300); expect(store.state!.idx).toBe(idx)
    tick(450 + 1500) // 어두워짐 + 읽는 시간 → 장면 진행
    expect(currentNode(store.state!)?.t).toBe('line')
    expect(screen.getByTestId('veil').className).toContain('veil-out')
    tick(600)
    expect(screen.queryByTestId('veil')).toBeNull()
    expect(screen.getByTestId('text').textContent).toContain('개학 연회')
  })

  it('저장 위치가 전환 노드여도(불러오기) 전환이 중복 실행되지 않고 한 번만 재생된다', () => {
    setTransitions(true); start()
    act(() => { store.jump('v2c1_hall') })
    act(() => { store.save('slot1') })
    tick(450 + 1500); tick(600)
    expect(screen.queryByTestId('veil')).toBeNull()
    const after = store.state!.idx
    act(() => { store.load('slot1') })
    expect(currentNode(store.state!)?.t).toBe('trans')
    expect(screen.getAllByTestId('veil')).toHaveLength(1)
    tick(450 + 1500); tick(600)
    expect(store.state!.idx).toBe(after)
    expect(screen.queryByTestId('veil')).toBeNull()
  })

  it('움직임 감소 설정에서는 페이드 없이 문구만 잠시 보인다', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }))
    setTransitions(true); start(); act(() => { store.jump('v2c1_hall') })
    expect(screen.getByTestId('veil').className).toContain('veil-hold')
    tick(1500); expect(currentNode(store.state!)?.t).toBe('line')
    tick(10); expect(screen.queryByTestId('veil')).toBeNull()
  })

  it('다음 날 마법약 교실 전환도 같은 방식으로 재생된다', () => {
    setTransitions(true); start(); act(() => { store.jump('v2c1_hall') })
    tick(450 + 1500); tick(600) // 첫 전환 종료
    act(() => { store.jump('v2c1_potions') })
    expect(screen.queryByTestId('veil')).not.toBeNull()
  })

  it('선택지는 대사창과 같은 패널 안에 놓여 겹치지 않고, 선택지를 건너뛸 수 없다', () => {
    start()
    for (let i = 0; i < 80 && currentNode(store.state!)?.t === 'line'; i++) clickStage()
    const dlg = screen.getByTestId('dialogue')
    expect(dlg.getAttribute('data-state')).toBe('choice')
    const choices = screen.getByTestId('choices')
    expect(dlg.contains(choices)).toBe(true)
    expect(screen.getByTestId('stage').className).toContain('is-choice')
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('data-testid')?.startsWith('choice-'))).toHaveLength(4)
    const idx = store.state!.idx
    clickStage(); press('Enter')
    expect(store.state!.idx).toBe(idx) // 선택 전에는 진행하지 않는다
    act(() => { fireEvent.click(screen.getByTestId('choice-C')) })
    expect(store.state!.choices.at(-1)).toMatchObject({ id: 'P-01', option: 'C' })
    expect(screen.getByTestId('stage').className).not.toContain('is-choice')
  })

  it('자유 일과 지도: 능력치는 접고 펼 수 있고, 장소를 고르면 활동 패널이 열린다', () => {
    start(); act(() => { store.jump('v2c1_routine') })
    for (let i = 0; i < 10 && store.state!.mode === 'STORY'; i++) clickStage() // 일과 도입 서술 → 지도
    tick(900) // 화면 전환(페이드) 완료
    expect(screen.getByTestId('map')).toBeTruthy()
    expect(screen.getByTestId('stat-int')).toBeTruthy()
    const t = screen.getByTestId('stats-toggle')
    expect(t.getAttribute('aria-expanded')).toBe('true')
    act(() => { fireEvent.click(t) })
    expect(t.getAttribute('aria-expanded')).toBe('false'); expect(document.getElementById('stats-body')!.getAttribute('aria-hidden')).toBe('true')
    act(() => { fireEvent.click(t) }); expect(t.getAttribute('aria-expanded')).toBe('true'); expect(document.getElementById('stats-body')!.getAttribute('aria-hidden')).toBe('false')
    act(() => { fireEvent.click(screen.getByTestId('loc-library')) })
    expect(screen.getByTestId('place-panel').textContent).toContain('도서관')
    expect(screen.getByTestId('time-left').textContent).toMatch(/남은 자유 시간/)
  })
})

describe('챕터 1 반응 훅·7층 단서 분산', () => {
  it('루나는 온실에서 내가 헤르미온느와 있는 걸 직접 봤을 때만 호기심을 보인다(REACT_luna_hermione)', async () => {
    const { applyEffects } = await import('../engine/core')
    const { evalCond } = await import('../engine/cond')
    const { buildJournal } = await import('../data/journal')
    const s = fresh(); s.calendar.date = '09-05'
    expect(evalCond(s, 'REACT_luna_hermione == 3')).toBe(false) // 만남 없음
    applyEffects(s, ['meet:hermione@ginny'])
    expect(evalCond(s, 'REACT_luna_hermione == 3')).toBe(false) // 루나가 없던 자리
    applyEffects(s, ['meet:hermione@luna'])
    expect(evalCond(s, 'REACT_luna_hermione == 3')).toBe(true)
    // 장면: 반응 분기가 있고, 지속 기록용 표식을 남기며, 관찰 기록에 한 문장으로 반영된다(연애 표현 없음)
    const txt = JSON.stringify([SCENARIO.hr1_hermione_greenhouse, SCENARIO.hr1_hermione_greenhouse_l])
    expect(txt).toContain('REACT_luna_hermione == 3'); expect(txt).toContain('flag:FLAG_LUN_SAW_HER')
    applyEffects(s, ['meet:luna', 'flag:FLAG_LUN_SAW_HER'])
    const luna = buildJournal(s).find((p) => p.id === 'luna')!
    expect(luna.observed.join(' ')).toContain('헤르미온느와 화분 이름표를 읽는 걸 봤다고')
    expect(JSON.stringify(luna)).not.toMatch(/질투|좋아|연애|사랑/)
  })
  it('루나의 호수 단서는 7층을 특정하지 않고(성 위쪽 높은 곳), 7층은 말포이의 창·밤 복도에만 남는다', () => {
    const lunaLines = [...(SCENARIO.hr1_luna_lake_2 ?? []), ...(SCENARIO.fr1_lake_2 ?? [])].filter((n) => n.t === 'line').map((n) => (n as { text: string }).text).join('\n')
    expect(lunaLines).toContain('성 위쪽'); expect(lunaLines).not.toMatch(/7층|일곱 번째/)
    const all = allNodes().filter((x) => x.n.t === 'line').map((x) => ({ k: x.k, t: (x.n as { text: string }).text })).filter((x) => /7층/.test(x.t)).map((x) => x.k)
    expect([...new Set(all)].sort()).toEqual(['v2c1_night', 'v2c1_followup', 'v2c1_pitch'].sort())
  })
})
