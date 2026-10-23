import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { JournalPanel } from '../ui/Journal'
import { GlossaryPanel, TermText } from '../ui/Terms'
import { store } from '../engine/store'
import { applyEffects, clone, newState, noteTerms } from '../engine/core'
import { evalCond } from '../engine/cond'
import { validateSave } from '../engine/save'
import { GLOSSARY, segmentText, termsIn } from '../data/glossary'
import { JOURNAL, buildJournal } from '../data/journal'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'

const clickStage = () => act(() => { fireEvent.click(screen.getByTestId('stage')) })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const fresh = () => newState(START_SCENE)

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
})
afterEach(() => { cleanup(); vi.useRealTimers() })
const start = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }

describe('대사 즉시 표시(회귀)', () => {
  it('타이핑 중 클릭하면 전체가 표시되고, 남은 타이머 틱이 글자를 되돌리지 않는다', () => {
    store.updateSettings({ typing: 'slow' })
    start()
    const full = store.state ? (SCENARIO[store.state.scene][store.state.idx] as { text: string }).text : ''
    tick(150)
    expect(screen.getByTestId('text').textContent!.length).toBeLessThan(full.length)
    clickStage()
    expect(screen.getByTestId('text').textContent).toBe(full)
    tick(24); tick(100); tick(2000)
    expect(screen.getByTestId('text').textContent).toBe(full)
    expect(screen.getByTestId('dialogue').getAttribute('data-state')).toBe('done')
  })
  it('빠른 연속 클릭(두 번)은 현재 대사를 완성한 뒤 다음 대사로 정확히 한 칸만 넘긴다', () => {
    store.updateSettings({ typing: 'slow' })
    start(); const i = store.state!.idx
    clickStage(); clickStage()
    expect(store.state!.idx).toBe(i + 1)
  })
})

describe('세계관 용어', () => {
  it('용어 분할: 긴 별칭 우선, 한 줄에서 같은 용어는 처음만 표시', () => {
    const segs = segmentText('N.E.W.T. 과정과 N.E.W.T. 시험, 그리고 룬 문자와 룬 사전.')
    expect(segs.filter((s) => s.term === 'newt')).toHaveLength(1)
    expect(segs.filter((s) => s.term === 'runes')).toHaveLength(1)
    expect(segs.map((s) => s.text).join('')).toBe('N.E.W.T. 과정과 N.E.W.T. 시험, 그리고 룬 문자와 룬 사전.')
    expect(termsIn('용어 없는 문장')).toEqual([])
  })

  it('용어 클릭은 설명만 열고 대사를 넘기지 않으며, 닫아도 넘어가지 않는다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    const idx = store.state!.idx
    const btn = screen.getByRole('button', { name: /급행열차 설명 보기/ })
    act(() => { fireEvent.click(btn) })
    expect(store.state!.idx).toBe(idx)
    const pop = screen.getByTestId('term-pop')
    expect(pop.textContent).toContain('9와 4분의 3')
    // 설명창 안쪽 클릭도 대사창으로 전파되지 않는다
    act(() => { fireEvent.click(pop) })
    expect(store.state!.idx).toBe(idx)
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    expect(screen.queryByTestId('term-pop')).toBeNull()
    expect(store.state!.idx).toBe(idx)
  })

  it('용어 설명을 열면 자동 진행이 멈춘다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    act(() => { fireEvent.click(screen.getByTestId('btn-auto')) })
    const idx = store.state!.idx
    act(() => { fireEvent.click(screen.getByRole('button', { name: /급행열차 설명 보기/ })) })
    tick(20000)
    expect(store.state!.idx).toBe(idx)
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    tick(20000)
    expect(store.state!.idx).toBe(idx)
  })

  it('TermText 클릭이 상위 클릭 핸들러로 전파되지 않는다', () => {
    const parent = vi.fn(); const onTerm = vi.fn()
    render(<div onClick={parent}><TermText text="퀴디치 경기" onTerm={onTerm} /></div>)
    fireEvent.click(screen.getByRole('button'))
    expect(onTerm).toHaveBeenCalledWith('quidditch'); expect(parent).not.toHaveBeenCalled()
  })

  it('용어집은 이미 마주친 용어만 보여 주고, 아직 나오지 않은 용어는 이름도 개수도 알리지 않는다', () => {
    const s = fresh(); noteTerms(s, '오늘은 퀴디치 연습.')
    render(<GlossaryPanel state={s} visibleTexts={[]} />)
    const g = screen.getByTestId('glossary')
    expect(g.textContent).toContain('퀴디치')
    expect(g.textContent).not.toContain('필요의 방'); expect(g.textContent).not.toMatch(/\d+\s*\/\s*\d+/)
  })

  it('메뉴에서 열어도 게임 상태가 바뀌지 않는다(용어집·관찰 기록)', () => {
    start(); act(() => { store.jump('v2c1_train') })
    const before = JSON.stringify(store.state)
    act(() => { fireEvent.click(screen.getByTestId('btn-menu')) })
    act(() => { fireEvent.click(screen.getByTestId('menu-notebook')) })
    expect(screen.getByTestId('journal')).toBeTruthy() // 첫 페이지: 인물 기록
    act(() => { fireEvent.click(screen.getByTestId('nb-tab-glossary')) })
    expect(screen.getByTestId('glossary').textContent).toContain('호그와트 급행열차') // 화면에 보이는 대사의 용어는 즉시 열람 가능
    act(() => { fireEvent.click(screen.getByTestId('nb-tab-cases')) })
    expect(screen.getByTestId('cases')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    expect(JSON.stringify(store.state)).toBe(before)
  })

  it('용어 설명 문구에 미래 사건·비밀이 없고, 모든 별칭이 한 용어에만 속한다', () => {
    const banned = /변신(?!술)|환영|여성|캐비닛|사라지는|어둠의 표식|임무|나르시사|보긴|호감|연인|비밀/
    for (const g of GLOSSARY) { expect(g.text + g.summary).not.toMatch(banned) }
    const all = GLOSSARY.flatMap((g) => g.aliases)
    expect(new Set(all).size).toBe(all.length)
  })

  it('저장 복원 후에도 해금된 용어가 유지되고, 이전 저장은 대화 기록에서 보정된다', () => {
    const s = fresh(); s.backlog.push({ kind: 'line', text: '필요의 방이라는 말을 들었다.' })
    delete s.terms // 이전 저장에는 terms 필드가 없다
    const f = { schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: s }
    const out = validateSave(JSON.parse(JSON.stringify(f))).state
    expect(out.terms).toContain('requirement')
    expect(validateSave(JSON.parse(JSON.stringify({ ...f, state: out }))).state.terms).toEqual(out.terms)
  })

  it('advance에서 대사에 나온 용어가 기록된다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    expect(store.state!.terms ?? []).not.toContain('express')
    clickStage()
    expect(store.state!.terms).toContain('express')
  })
})

/* ---------- 관찰 기록 ---------- */
const withChoice = (s: GameState, id: string, option: string) => { s.choices.push({ id, option, scene: 't', date: '09-01' }) }
const pageOf = (s: GameState, who: string) => buildJournal(s).find((p) => p.id === who)
const textOf = (s: GameState) => JSON.stringify(buildJournal(s))

describe('인물 관찰 기록', () => {
  it('아무것도 보지 못한 시작 상태에는 열람 가능한 인물이 없다(잠금 항목도 노출하지 않는다)', () => {
    const s = fresh()
    expect(buildJournal(s)).toEqual([])
    render(<JournalPanel state={s} />)
    const j = screen.getByTestId('journal')
    expect(j.textContent).toContain('아직 적어 둘 만큼')
    for (const n of ['말포이', '헤르미온느', '지니', '루나', '판시']) expect(j.textContent).not.toContain(n)
  })

  it('목격한 사건에 따라서만 인물이 나타나고 기록이 쌓인다', () => {
    const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE'])
    expect(buildJournal(s).map((p) => p.id)).toEqual(['draco'])
    const d = pageOf(s, 'draco')!
    expect(d.observed).toHaveLength(1)
    expect(d.observed[0]).toContain('소매')
    expect(textOf(s)).not.toMatch(/7층|톱밥|통금|물병|추락/) // 아직 겪지 않은 사건
    applyEffects(s, ['meet:ginny'])
    expect(buildJournal(s).map((p) => p.id).sort()).toEqual(['draco', 'ginny'])
  })

  it('같은 사건을 다른 선택으로 겪으면 기록이 달라진다(K-04 A/B/C/D)', () => {
    const outs = ['A', 'B', 'C', 'D'].map((k) => {
      const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE', `flag:${{ A: 'FLAG_REPORTED_NIGHT', B: 'FLAG_MUTUAL_SECRET', C: 'FLAG_CONFRONTED_NIGHT', D: 'FLAG_FOLLOWED_NIGHT' }[k]}`])
      withChoice(s, 'K-04', k)
      const d = pageOf(s, 'draco')!
      return d.interp + '|' + d.observed.join('/') + '|' + d.recent.join('/')
    })
    expect(new Set(outs).size).toBe(4)
  })

  it('충돌하는 항목은 우선순위 규칙으로 하나만 고른다(인상·해석은 1개, 달라진 점은 최대 2개)', () => {
    const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE', 'kn:OB_TREMOR', 'kn:OB_WINDOW', 'flag:FLAG_PUBLIC_RESCUE', 'flag:FLAG_FOLLOWED_NIGHT'])
    withChoice(s, 'K-03', 'A'); withChoice(s, 'K-04', 'D')
    const d = pageOf(s, 'draco')!
    expect(d.impression).toContain('그가 내가 거기 있었다는 걸') // K-04 항목(prio 4)이 가장 최근 사건
    expect(d.recent.length).toBeLessThanOrEqual(2)
  })

  it('관계 수치·연애 상태·지식 단계가 바뀌어도 기록은 달라지지 않는다(근거 없는 애정 표현 차단)', () => {
    const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE', 'meet:ginny', 'meet:luna', 'meet:pansy'])
    const before = textOf(s)
    applyEffects(s, ['romance:ginny=together', 'romance:luna=open', 'stage:ginny+2', 'stage:pansy+2', 'ginny.affinity+10', 'pansy.trust+10', 'draco.affinity+12', 'draco.attraction+12', 'know:pansy=4'])
    expect(textOf(s)).toBe(before)
  })

  it('저장·복원·JSON 복제 후에도 같은 기록이 재현되고 미래 기록이 미리 나타나지 않는다', () => {
    const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE', 'meet:hermione'])
    const f = { schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: s }
    const back = validateSave(JSON.parse(JSON.stringify(f))).state
    expect(textOf(back)).toBe(textOf(s))
    expect(textOf(clone(back))).toBe(textOf(s))
    expect(textOf(back)).not.toMatch(/주장|지도 한 장|거울|7층/)
  })

  it('모든 문장에 비밀·내부 용어·확정적 감정 표현이 없다', () => {
    const banned = /변신|환영|여성|여자|캐비닛|사라지는|표식|호감|신뢰도|연애|연인|사랑|좋아한다|질투|FLAG_|KN_|OB_|stage|romance|know|affinity/
    for (const c of JOURNAL) for (const e of c.entries) expect(e.text, `${c.id}: ${e.text}`).not.toMatch(banned)
  })

  it('모든 조건식이 해석되고, 참조하는 플래그·관찰·선택이 시나리오에 실제로 존재한다', () => {
    const s = fresh()
    const scenarioText = JSON.stringify(SCENARIO)
    for (const c of JOURNAL) for (const cond of [c.visible, ...c.entries.map((e) => e.when)]) {
      expect(() => evalCond(s, cond), cond).not.toThrow()
      for (const m of cond.matchAll(/\b(FLAG|KN|OB)_[A-Z0-9_]+/g)) {
        const flag = m[0]
        expect(scenarioText.includes(`flag:${flag}`) || scenarioText.includes(`kn:${flag}`), `${flag} 설정 없음`).toBe(true)
      }
      for (const m of cond.matchAll(/\bCH_([A-Z])(\d+)_([A-Z])\b/g)) {
        const id = `${m[1]}-${m[2].padStart(2, '0')}`
        expect(scenarioText.includes(`"id":"${id}"`) && scenarioText.includes(`"key":"${m[3]}"`), `${m[0]} 선택지 없음`).toBe(true)
      }
    }
  })

  it('UI: 탭으로 인물을 바꿔 볼 수 있고 각 인물은 자기 기록만 보여 준다', () => {
    const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE', 'meet:ginny', 'meet:luna'])
    render(<JournalPanel state={s} />)
    expect(screen.getByTestId('j-page').getAttribute('data-who')).toBe('draco')
    act(() => { fireEvent.click(screen.getByTestId('j-tab-ginny')) })
    const page = screen.getByTestId('j-page')
    expect(page.getAttribute('data-who')).toBe('ginny')
    expect(page.textContent).toContain('열차 문에 매달려')
    expect(page.textContent).not.toContain('소매')
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })
})
