import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { store } from '../engine/store'
import { currentNode, lineId } from '../engine/core'

const press = (key: string, init: KeyboardEventInit = {}) => act(() => { fireEvent.keyDown(window, { key, ...init }) })
const clickStage = () => act(() => { fireEvent.click(screen.getByTestId('stage')) })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const mode = () => store.state?.mode
const untilChoice = () => { for (let i = 0; i < 80 && currentNode(store.state!)?.t === 'line'; i++) clickStage() }

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

const start = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }

describe('대화 진행 UI', () => {
  it('타이틀 → 새 게임 → 대사 표시 → 클릭으로 다음 대사', () => {
    render(<App />)
    expect(screen.getByTestId('title')).toBeTruthy()
    expect(screen.getByText(/비공식 팬 창작물/)).toBeTruthy()
    act(() => { fireEvent.click(screen.getByTestId('new-game')) })
    const first = screen.getByTestId('text').textContent
    clickStage()
    expect(screen.getByTestId('text').textContent).not.toBe(first)
  })
  it('타이핑 중 클릭은 현재 대사를 즉시 완성하고, 완성 후 클릭이 다음 대사로 넘긴다', () => {
    store.updateSettings({ typing: 'slow' })
    start()
    const idx0 = store.state!.idx
    tick(100)
    expect(screen.getByTestId('dialogue').getAttribute('data-state')).toBe('typing')
    clickStage()
    expect(store.state!.idx).toBe(idx0) // 아직 같은 대사
    expect(screen.getByTestId('dialogue').getAttribute('data-state')).toBe('done')
    clickStage()
    expect(store.state!.idx).toBe(idx0 + 1)
  })
  it('Enter/Space 키로도 진행된다', () => {
    start(); const i = store.state!.idx
    press('Enter'); expect(store.state!.idx).toBe(i + 1)
    press(' '); expect(store.state!.idx).toBe(i + 2)
  })
  it('대사창 숨기기(H): 숨김 중 클릭은 복원만 하고 진행하지 않는다', () => {
    start(); const i = store.state!.idx
    press('h'); expect(screen.queryByTestId('dialogue')).toBeNull()
    clickStage(); expect(store.state!.idx).toBe(i); expect(screen.getByTestId('dialogue')).toBeTruthy()
  })
  it('휠을 위로 올리면 대화 기록이 열리고 지나간 대사가 보인다', () => {
    start(); clickStage(); clickStage()
    act(() => { fireEvent.wheel(screen.getByTestId('stage'), { deltaY: -100 }) })
    expect(within(screen.getByTestId('backlog')).getAllByText(/./).length).toBeGreaterThan(1)
    press('Escape'); expect(screen.queryByTestId('backlog')).toBeNull()
  })
})

describe('선택지·자동 진행·스킵', () => {
  it('자동 진행은 대사를 넘기다가 선택지에서 중단되고 선택을 임의로 확정하지 않는다', () => {
    start()
    act(() => { fireEvent.click(screen.getByTestId('btn-auto')) })
    for (let i = 0; i < 60 && currentNode(store.state!)?.t === 'line'; i++) tick(3000)
    expect(currentNode(store.state!)?.t).toBe('choice')
    const at = `${store.state!.scene}:${store.state!.idx}`
    tick(60000)
    expect(`${store.state!.scene}:${store.state!.idx}`).toBe(at)
    expect(store.state!.choices.length).toBe(0)
    expect(screen.getByTestId('btn-auto').getAttribute('aria-pressed')).toBe('false')
  })
  it('선택지 호버에는 표정이 변하지 않고, 클릭 후에만 표정이 바뀐다', () => {
    start(); act(() => store.jump('c1_potions'))
    untilChoice()
    const sprite = () => screen.getByTestId('sprite').getAttribute('data-expr')
    const before = sprite()
    const a = screen.getByTestId('choice-A')
    act(() => { fireEvent.mouseOver(a); fireEvent.mouseEnter(a); fireEvent.focus(a) })
    expect(sprite()).toBe(before)
    expect(screen.getByTestId('sprite').getAttribute('data-char')).toBe('draco')
    act(() => { fireEvent.click(a) })
    expect(sprite()).toBe('interest')
  })
  it('숫자키로 선택지를 고르고 능력치·감정 수치 팝업은 표시되지 않는다', () => {
    start(); untilChoice()
    expect(screen.getByTestId('choices')).toBeTruthy()
    const buttons = within(screen.getByTestId('choices')).getAllByRole('button')
    expect(buttons.length).toBe(4)
    expect(screen.queryByText(/신뢰|호감|경계심/)).toBeNull()
    press('2')
    expect(store.state!.choices[0]).toMatchObject({ id: 'P-01', option: 'B' })
    expect(screen.queryByTestId('choices')).toBeNull()
  })
  it('Ctrl 스킵은 읽은 대사만 건너뛰고 읽지 않은 대사에서 멈춘다', () => {
    start()
    const first = lineId(store.state!)
    expect(store.isRead(first)).toBe(false)
    press('Control'); tick(500)
    expect(lineId(store.state!)).toBe(first) // 미읽음 → 스킵 불가
    act(() => { fireEvent.keyUp(window, { key: 'Control' }) })
    for (let i = 0; i < 3; i++) clickStage() // 3줄 읽음 처리
    const stop = lineId(store.state!)
    act(() => store.toTitle()); act(() => store.newGame())
    press('Control'); for (let i = 0; i < 20; i++) tick(60)
    expect(store.state!.idx).toBeGreaterThanOrEqual(3) // 읽은 3줄은 건너뜀
    expect(lineId(store.state!)).toBe(stop) // 미읽음 대사에서 정지
    act(() => { fireEvent.keyUp(window, { key: 'Control' }) })
  })
  it('시간제한 선택지: 시간 초과 시 정의된 "망설임" 결과가 적용된다', () => {
    start()
    act(() => store.jump('sys_timed'))
    for (let i = 0; i < 6 && currentNode(store.state!)?.t === 'line'; i++) clickStage()
    expect(screen.getByTestId('timerbar')).toBeTruthy()
    expect(screen.queryByTestId('choice-H')).toBeNull()
    tick(8500)
    expect(store.state!.choices.at(-1)).toMatchObject({ id: 'K-T1', option: 'H' })
    expect(store.state!.eventLog).toContain('hesitated')
  })
  it('시간제한 해제 시 타이머가 없고 "망설임"이 명시 선택지로 나온다', () => {
    store.updateSettings({ timer: 'off' }); start()
    act(() => store.jump('sys_timed'))
    for (let i = 0; i < 6 && currentNode(store.state!)?.t === 'line'; i++) clickStage()
    expect(screen.queryByTestId('timerbar')).toBeNull()
    expect(screen.getByTestId('choice-H')).toBeTruthy()
    tick(60000); expect(store.state!.choices.length).toBe(0)
  })
})

describe('지도 잠금과 저장', () => {
  it('스토리 중에는 지도가 렌더되지 않고, 일과 구간에서만 나타난다', () => {
    start()
    expect(screen.queryByTestId('map')).toBeNull(); expect(mode()).toBe('STORY')
    act(() => store.jump('c1_routine'))
    for (let i = 0; i < 4 && mode() === 'STORY'; i++) clickStage()
    expect(mode()).toBe('ROUTINE'); expect(screen.getByTestId('map')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByTestId('loc-courtyard')) }); act(() => { fireEvent.click(screen.getByTestId('act-rest')) })
    expect(screen.getByTestId('map-msg').textContent).toContain('휴식')
  })
  it('저장 → 새로고침 상황(스토어 초기화) → 불러오기 후 같은 상태로 복원된다', () => {
    start(); untilChoice(); press('1')
    const snap = JSON.stringify(store.state)
    act(() => { fireEvent.click(screen.getByTestId('btn-menu')) }); act(() => { fireEvent.click(screen.getByTestId('menu-save')) })
    act(() => { fireEvent.click(screen.getByTestId('save-slot1')) })
    act(() => store.toTitle())
    expect(screen.getByTestId('title')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByTestId('open-load')) })
    act(() => { fireEvent.click(screen.getByTestId('load-slot1')) })
    expect(JSON.stringify(store.state)).toBe(snap)
    expect(store.state!.choices[0].id).toBe('P-01')
  })
  it('잘못된 저장 파일을 가져오면 오류 메시지가 표시되고 상태는 바뀌지 않는다', async () => {
    vi.useRealTimers()
    start(); const before = JSON.stringify(store.state)
    act(() => { fireEvent.click(screen.getByTestId('btn-menu')) }); act(() => { fireEvent.click(screen.getByTestId('menu-load')) })
    const input = screen.getByTestId('import-file') as HTMLInputElement
    const file = new File(['{"schemaVersion":3}'], 'bad.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: () => Promise.resolve('{"schemaVersion":3}') })
    await act(async () => { fireEvent.change(input, { target: { files: [file] } }) })
    expect((await screen.findByRole('alert')).textContent).toMatch(/버전/)
    expect(JSON.stringify(store.state)).toBe(before)
  })
})
