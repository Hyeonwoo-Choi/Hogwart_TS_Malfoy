import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { Portrait } from '../ui/Journal'
import { store } from '../engine/store'
import { newState, run } from '../engine/core'
import { validateSave } from '../engine/save'
import { START_SCENE } from '../data/scenario'

const start = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }
beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('수첩 v2: 툴바·고정 레이아웃·초상화', () => {
  it('상단 버튼 순서는 자동/스킵/수첩/기록/숨기기/메뉴이고, 수첩 버튼으로 연 뒤 닫아도 장면 상태가 그대로다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    const labels = Array.from(document.querySelectorAll('.bar-items button')).map((b) => b.textContent)
    expect(labels).toEqual(['자동', '스킵', '수첩', '기록', '숨기기', '메뉴'])
    const before = JSON.stringify(store.state)
    act(() => { fireEvent.click(screen.getByTestId('btn-notebook')) }); expect(screen.getByTestId('notebook')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) }); expect(screen.queryByTestId('notebook')).toBeNull()
    expect(JSON.stringify(store.state)).toBe(before)
  })
  it('자동 진행 중 수첩을 열면 대사가 넘어가지 않는다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    act(() => { fireEvent.click(screen.getByTestId('btn-auto')) })
    act(() => { fireEvent.click(screen.getByTestId('btn-notebook')) })
    const at = JSON.stringify([store.state?.scene, store.state?.idx])
    act(() => { vi.advanceTimersByTime(30000) })
    expect(JSON.stringify([store.state?.scene, store.state?.idx])).toBe(at)
  })
  it('루트와 지도 화면에서도 수첩 버튼이 있다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    expect(screen.getByTestId('btn-notebook')).toBeTruthy()
  })
  it('수첩 모달은 고정 크기 구조다: 모달 book 클래스, 본문만 스크롤(CSS 규칙)·탭 전환 시 맨 위로', async () => {
    start(); act(() => { fireEvent.click(screen.getByTestId('btn-notebook')) })
    expect(document.querySelector('.modal.book')).toBeTruthy()
    // @ts-expect-error node 내장 모듈(타입 패키지 없음)
    const { readFileSync } = await import('node:fs'); const css = readFileSync('src/styles.css', 'utf8')
    expect(css).toMatch(/\.modal\.book \{[^}]*height: min\(700px, calc\(100dvh - 28px\)\)/)
    expect(css).toMatch(/\.modal\.book \.nb-page \{[^}]*overflow-y: auto/)
    expect(css).toMatch(/\.modal\.book \.modal-body \{[^}]*overflow: hidden/)
    const page = screen.getByTestId('nb-page'); const spy = vi.fn(); page.scrollTo = spy as never
    act(() => { fireEvent.click(screen.getByTestId('nb-tab-cases')) }); expect(spy).toHaveBeenCalledWith(0, 0)
  })
  it('초상화: 마지막으로 본 표정만 쓰고 관계 수치로 표정을 바꾸지 않으며, 저장·불러오기 후에도 같다', () => {
    let s = run(newState(START_SCENE, 1)); s.seen = { hermione: { expr: 'angry', form: 'base' } }
    s.emotions.hermione.affinity = 90
    const { container, rerender } = render(<Portrait state={s} id="hermione" />)
    expect(container.querySelector('[data-testid="j-portrait"]')!.getAttribute('data-expr')).toBe('angry')
    expect(screen.getByTestId('j-expr').textContent).toBe('분노')
    s.seen = { hermione: { expr: 'smile', form: 'base' } }; rerender(<Portrait state={s} id="hermione" />)
    expect(screen.getByTestId('j-expr').textContent).toBe('미소')
    const back = validateSave(JSON.parse(JSON.stringify({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: s }))).state
    expect(back.seen).toEqual(s.seen)
    const old = { ...s }; delete (old as { seen?: unknown }).seen
    const back2 = validateSave(JSON.parse(JSON.stringify({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: old }))).state
    expect(back2.seen).toEqual({})
    rerender(<Portrait state={back2} id="hermione" />); expect(screen.getByTestId('j-expr').textContent).toContain('아직')
  })
  it('장면에서 인물이 표정과 함께 나오면 수첩에 기억된다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    for (let i = 0; i < 40; i++) act(() => { store.advance() })
    const seen = store.state?.seen ?? {}
    expect(Object.keys(seen).length).toBeGreaterThan(0)
  })
})
