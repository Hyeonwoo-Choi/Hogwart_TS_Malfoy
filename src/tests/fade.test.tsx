import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { store } from '../engine/store'
import { routineCursor, setActivityScenes } from '../engine/core'

const clickStage = () => act(() => { fireEvent.click(screen.getByTestId('stage')) })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const start = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }
const toMap = () => { start(); act(() => { store.jump('v2c1_routine') }); for (let i = 0; i < 10 && store.state!.mode === 'STORY'; i++) clickStage(); tick(900) }
const cur = () => routineCursor(store.state!.routine!)

beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
  setActivityScenes(true)
})
afterEach(() => { cleanup(); setActivityScenes(false); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('활동 장면 진입·복귀 전환', () => {
  it('활동을 고르면 상태는 즉시 장면이지만 화면은 지도가 막에 덮인 뒤 장면으로 바뀐다. 빠른 연속 클릭에도 시간은 한 번만 쓴다', () => {
    toMap()
    act(() => { fireEvent.click(screen.getByTestId('loc-hall')) })
    const t0 = cur()
    const btn = screen.getByTestId('act-meal')
    act(() => { fireEvent.click(btn); fireEvent.click(btn); fireEvent.click(btn) })
    expect(store.state!.mode).toBe('EVENT')
    expect(screen.getByTestId('map')).toBeTruthy() // 막이 덮이는 동안에는 아직 지도가 보인다
    expect(screen.getByTestId('screen-veil').className).toContain('sv-out')
    tick(320 + 120)
    expect(screen.queryByTestId('map')).toBeNull(); expect(screen.getByTestId('stage')).toBeTruthy()
    tick(400); expect(screen.queryByTestId('screen-veil')).toBeNull()
    expect(cur() - t0).toBe(1)
    expect(screen.getByTestId('text').textContent).toContain('식탁') // 활동 장면의 첫 대사
    expect(screen.queryByTestId('map-msg')).toBeNull(); expect(screen.queryByTestId('map-notice')).toBeNull() // 결과 알림창 없음
  })

  it('전환 중에는 입력이 막히고(막이 덮인 동안), 장면을 끝내면 지도로 돌아오며 복귀도 막으로 덮인 뒤 바뀐다', () => {
    toMap()
    act(() => { fireEvent.click(screen.getByTestId('loc-hall')) }); act(() => { fireEvent.click(screen.getByTestId('act-meal')) })
    const idx = store.state!.idx
    expect(screen.queryByTestId('stage')).toBeNull() // 막이 덮인 동안 화면은 아직 지도라 대사 입력이 닿지 않는다
    tick(500); tick(400)
    // 장면을 끝까지 읽는다
    for (let i = 0; i < 30 && store.state!.mode === 'EVENT'; i++) clickStage()
    expect(store.state!.mode).toBe('ROUTINE')
    expect(screen.queryByTestId('map')).toBeNull(); expect(screen.getByTestId('screen-veil').className).toContain('sv-out') // 복귀도 페이드아웃이 먼저 보인다
    tick(440); expect(screen.getByTestId('map')).toBeTruthy()
    tick(400); expect(screen.queryByTestId('screen-veil')).toBeNull()
    expect(idx).toBeGreaterThanOrEqual(0)
  })

  it('자유 일과 종료 시에도 지도 위에서 페이드아웃이 먼저 보이고, 그 뒤 다음 스토리가 시작된다', () => {
    toMap()
    act(() => { fireEvent.click(screen.getByTestId('skip-time')) }); act(() => { fireEvent.click(screen.getByTestId('ts-t-end')) }); act(() => { fireEvent.click(screen.getByTestId('skip-confirm')) }); act(() => { fireEvent.click(screen.getByTestId('skip-confirm')) }) // 큰 이동은 두 번 확인
    expect(store.state!.routine).toBeNull()
    expect(screen.getByTestId('map')).toBeTruthy(); expect(screen.getByTestId('screen-veil').className).toContain('sv-out')
    tick(440); expect(screen.queryByTestId('map')).toBeNull()
    tick(400); expect(screen.queryByTestId('screen-veil')).toBeNull()
  })

  it('움직임 감소 설정에서는 막 없이 즉시 전환된다', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }))
    start(); act(() => { store.jump('v2c1_routine') })
    for (let i = 0; i < 10 && store.state!.mode === 'STORY'; i++) clickStage()
    expect(screen.queryByTestId('screen-veil')).toBeNull(); expect(screen.getByTestId('map')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByTestId('loc-hall')) }); act(() => { fireEvent.click(screen.getByTestId('act-meal')) })
    expect(screen.queryByTestId('screen-veil')).toBeNull(); expect(screen.queryByTestId('map')).toBeNull(); expect(screen.getByTestId('stage')).toBeTruthy()
  })

  it('활동 장면 도중 저장→복원: 전환이 다시 재생되지 않고 활동 결과가 중복되지 않는다', () => {
    toMap()
    act(() => { fireEvent.click(screen.getByTestId('loc-hall')) }); act(() => { fireEvent.click(screen.getByTestId('act-meal')) })
    tick(900)
    const stats = JSON.stringify(store.state!.stats); const c = cur()
    act(() => { store.save('slot4') }); act(() => { store.toTitle() })
    cleanup(); render(<App />); act(() => { store.load('slot4') })
    expect(screen.queryByTestId('screen-veil')).toBeNull(); expect(screen.getByTestId('stage')).toBeTruthy()
    expect(JSON.stringify(store.state!.stats)).toBe(stats); expect(cur()).toBe(c)
  })
})
