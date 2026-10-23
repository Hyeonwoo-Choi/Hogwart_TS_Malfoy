import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { store, introConfig } from '../engine/store'
import { INTRO_LINES, INTRO_TOTAL_MS } from '../ui/Intro'

/** 새 게임 타이포그래피 프롤로그: 재생 규칙·스킵·연타·움직임 감소·불러오기에서 반복하지 않음·스포일러 없음 */
/** 타이머 체인(글자마다 새 타이머)이 렌더 사이에 이어지도록 작은 단계로 나눠 진행한다 */
const tick = (ms: number) => { for (let t = 0; t < ms; t += 25) act(() => { vi.advanceTimersByTime(Math.min(25, ms - t)) }) }
const newGame = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }
const line = () => screen.getByTestId('intro-line').textContent!.replace('▌', '')

beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
  introConfig.enabled = true
})
afterEach(() => { cleanup(); introConfig.enabled = false; vi.useRealTimers(); vi.unstubAllGlobals() })

describe('도입부 프롤로그', () => {
  it('새 게임에서만 재생되고, 끝나면 게임(열차 장면)이 시작된다. 게임 상태는 도입부 동안 바뀌지 않는다', () => {
    newGame()
    expect(screen.getByTestId('intro')).toBeTruthy(); expect(screen.queryByTestId('stage')).toBeNull()
    const before = JSON.stringify(store.state)
    tick(INTRO_TOTAL_MS * 1.6 + 2000)
    expect(screen.queryByTestId('intro')).toBeNull(); expect(screen.getByTestId('stage')).toBeTruthy()
    expect(JSON.stringify(store.state)).toBe(before)
  })
  it('기본 설정(테스트)에서는 재생되지 않는다', () => {
    introConfig.enabled = false; newGame(); expect(screen.queryByTestId('intro')).toBeNull(); expect(screen.getByTestId('stage')).toBeTruthy()
  })
  it('클릭: 타이핑 중이면 현재 문장 즉시 완성, 완성 뒤에는 다음 문장. 연타해도 문장을 건너뛰지 않는다', () => {
    newGame(); tick(1100) // 첫 글자가 나올 만큼
    expect(line().length).toBeLessThan(INTRO_LINES[0].length)
    act(() => { fireEvent.click(screen.getByTestId('intro')) }); expect(line()).toBe(INTRO_LINES[0])
    // 완성된 문장에서 바로 다음 클릭은 다음 문장으로(그 문장은 아직 비어 있다)
    act(() => { fireEvent.click(screen.getByTestId('intro')) }); expect(line()).not.toBe(INTRO_LINES[0]); expect(INTRO_LINES[1].startsWith(line())).toBe(true)
    // 연타: 같은 순간의 두 번 클릭은 한 문장만 진행(완성 → 다음 문장이 되지, 두 문장 건너뛰지 않는다)
    act(() => { fireEvent.click(screen.getByTestId('intro')); fireEvent.click(screen.getByTestId('intro')) })
    expect(INTRO_LINES[2].startsWith(line()) || line() === INTRO_LINES[1]).toBe(true)
  })
  it('문장 사이에는 정적이 있다: 완성 직후에는 같은 문장이 남아 있다가 시간이 지나면 다음 문장', () => {
    newGame(); tick(900 + INTRO_LINES[0].length * 80 + 100)
    expect(line()).toBe(INTRO_LINES[0]); tick(600); expect(line()).toBe(INTRO_LINES[0]) // 읽는 시간
    tick(2000); expect(line()).not.toBe(INTRO_LINES[0])
  })
  it('전체 스킵: 버튼·Esc·S 모두 도입부를 끝내고 게임을 시작한다(스킵 후 다시 나오지 않는다)', () => {
    newGame(); act(() => { fireEvent.click(screen.getByTestId('intro-skip')) }); tick(600)
    expect(screen.queryByTestId('intro')).toBeNull(); expect(screen.getByTestId('stage')).toBeTruthy()
    cleanup(); store.toTitle(); newGame(); act(() => { fireEvent.keyDown(window, { key: 'Escape' }) }); tick(600); expect(screen.queryByTestId('intro')).toBeNull()
    cleanup(); store.toTitle(); newGame(); act(() => { fireEvent.keyDown(window, { key: 's' }) }); tick(600); expect(screen.queryByTestId('intro')).toBeNull()
  })
  it('스킵 버튼 연타·스킵 직후 클릭은 게임 진행을 방해하지 않는다(대사가 한 줄도 넘어가지 않는다)', () => {
    newGame(); const idx = store.state!.idx; const scene = store.state!.scene
    act(() => { fireEvent.click(screen.getByTestId('intro-skip')); fireEvent.click(screen.getByTestId('intro-skip')); fireEvent.click(screen.getByTestId('intro')) }); tick(800)
    expect(store.state!.scene).toBe(scene); expect(store.state!.idx).toBe(idx)
  })
  it('불러오기·이어하기에서는 반복하지 않는다', () => {
    newGame(); tick(INTRO_TOTAL_MS * 1.6 + 2000); store.save('slot1'); cleanup(); store.toTitle()
    render(<App />); act(() => { store.load('slot1') }); expect(screen.queryByTestId('intro')).toBeNull(); expect(screen.getByTestId('stage')).toBeTruthy()
    expect(store.intro).toBe(false)
  })
  it('움직임 감소: 문장이 한 번에 표시되고 클릭·자동 진행·스킵이 동작한다', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }))
    newGame(); expect(line()).toBe(INTRO_LINES[0]) // 타이핑 없이 즉시
    act(() => { fireEvent.click(screen.getByTestId('intro')) }); expect(line()).toBe(INTRO_LINES[1])
    tick(5000); expect(line()).not.toBe(INTRO_LINES[1]) // 자동 진행(읽을 시간은 더 길다)
    act(() => { fireEvent.click(screen.getByTestId('intro-skip')) }); tick(10); expect(screen.queryByTestId('intro')).toBeNull()
  })
  it('내용: 약 20~40초(자동 진행 기준), 1996년 9월 1일로 시작하고 열차로 이어지며 비밀·변신을 누설하지 않는다', () => {
    expect(INTRO_TOTAL_MS).toBeGreaterThanOrEqual(20000); expect(INTRO_TOTAL_MS).toBeLessThanOrEqual(40000)
    expect(INTRO_LINES[0]).toContain('1996년 9월 1일'); expect(INTRO_LINES.join(' ')).toMatch(/9와 4분의 3/)
    expect(INTRO_LINES.join(' ')).not.toMatch(/말포이|드레이코|변신|캐비닛|환영|흉터|표식|판시|루나|지니|헤르미온느/)
  })
  it('모바일 폭에서도 스킵 버튼이 존재하고 터치 영역이 충분하다(스타일 규칙 확인)', async () => {
    const fsm = (await import(/* @vite-ignore */ ('node:' + 'fs'))) as { readFileSync: (p: string, e: string) => string }
    const css = fsm.readFileSync('src/styles.css', 'utf8')
    expect(css).toMatch(/\.intro \.btn\.intro-skip \{[^}]*min-height: 44px/); expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.intro/)
    newGame(); expect(screen.getByTestId('intro-skip').textContent).toBe('건너뛰기')
  })
})
