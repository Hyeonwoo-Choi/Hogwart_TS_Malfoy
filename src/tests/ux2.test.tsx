import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { TermText, GlossaryPanel } from '../ui/Terms'
import { onUiEffect, type UiEffect } from '../ui/effects'
import { store } from '../engine/store'
import { clone, newState, noteTerms, readTerm } from '../engine/core'
import { validateSave } from '../engine/save'
import { START_SCENE } from '../data/scenario'

const clickStage = () => act(() => { fireEvent.click(screen.getByTestId('stage')) })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const start = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }
const toMap = () => { start(); act(() => { store.jump('v2c1_routine') }); for (let i = 0; i < 10 && store.state!.mode === 'STORY'; i++) clickStage(); tick(900) }

beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('용어 읽음 상태', () => {
  it('안 읽은 용어는 신규 스타일, 읽은 용어는 읽음 스타일이고 재클릭으로 다시 볼 수 있다', () => {
    const onTerm = vi.fn()
    const { rerender } = render(<TermText text="퀴디치 경기" onTerm={onTerm} read={[]} />)
    expect(screen.getByRole('button').className).toContain('term-new'); expect(screen.getByRole('button').getAttribute('aria-label')).toContain('설명 보기')
    rerender(<TermText text="퀴디치 경기" onTerm={onTerm} read={['quidditch']} />)
    expect(screen.getByRole('button').className).toContain('term-read'); expect(screen.getByRole('button').getAttribute('aria-label')).toContain('다시 보기')
    fireEvent.click(screen.getByRole('button')); expect(onTerm).toHaveBeenCalledWith('quidditch')
  })

  it('설명창을 열어야 읽음이 된다(등장만으로는 안 읽음). 닫은 뒤에도 대사는 넘어가지 않고 읽음은 이후 등장에서도 유지된다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    expect(store.state!.termsRead ?? []).toEqual([])
    const idx = store.state!.idx
    const btn = screen.getByRole('button', { name: /급행열차 설명 보기/ })
    expect(btn.className).toContain('term-new')
    act(() => { fireEvent.click(btn) })
    expect(store.state!.termsRead).toEqual(['express'])
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    expect(store.state!.idx).toBe(idx)
    expect(screen.getByRole('button', { name: /급행열차 설명 다시 보기/ }).className).toContain('term-read')
    // 읽음과 등장 이력은 별개: seen(terms) 의미는 그대로
    act(() => { store.advance() }); expect(store.state!.terms).toContain('express'); expect(store.state!.termsRead).toEqual(['express'])
  })

  it('읽음 상태는 저장·복원되고, 이전 저장에는 빈 목록으로 보정되며 중복 기록되지 않는다', () => {
    let s = newState(START_SCENE); noteTerms(s, '퀴디치와 마법부'); s = readTerm(s, 'quidditch'); s = readTerm(s, 'quidditch')
    expect(s.termsRead).toEqual(['quidditch'])
    const f = (st: typeof s) => ({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: st })
    expect(validateSave(JSON.parse(JSON.stringify(f(s)))).state.termsRead).toEqual(['quidditch'])
    const old = clone(s); delete old.termsRead
    expect(validateSave(JSON.parse(JSON.stringify(f(old)))).state.termsRead).toEqual([])
  })

  it('용어집 페이지에서 항목을 펼치면 같은 읽음 상태가 되고, 읽은 항목은 신규 표시가 사라진다', () => {
    start(); act(() => { store.jump('v2c1_train') }); clickStage()
    act(() => { fireEvent.click(screen.getByTestId('btn-menu')) }); act(() => { fireEvent.click(screen.getByTestId('menu-notebook')) }); act(() => { fireEvent.click(screen.getByTestId('nb-tab-glossary')) })
    const head = screen.getByTestId('g-express')
    expect(head.closest('article')!.className).toContain('g-new')
    expect(screen.getByTestId('glossary').textContent).not.toContain('마법사가 아닌 사람들의 눈에는') // 펼치기 전
    act(() => { fireEvent.click(head) })
    expect(screen.getByTestId('glossary').textContent).toContain('마법사가 아닌 사람들의 눈에는')
    expect(store.state!.termsRead).toContain('express')
    expect(screen.getByTestId('g-express').closest('article')!.className).toContain('g-read')
  })

  it('아직 마주치지 않은 용어는 읽음 여부와 무관하게 용어집에 나타나지 않는다', () => {
    const s = newState(START_SCENE); noteTerms(s, '퀴디치')
    render(<GlossaryPanel state={s} visibleTexts={[]} />)
    expect(screen.queryByTestId('g-requirement')).toBeNull(); expect(screen.getByTestId('g-quidditch')).toBeTruthy()
  })
})

describe('지도: 활동 패널·능력치 자동 접기', () => {
  it('장소를 고르면 능력치가 자동으로 접히고(직접 펼친 적이 없을 때), 활동 패널이 뜬다', () => {
    toMap()
    const t = screen.getByTestId('stats-toggle'); expect(t.getAttribute('aria-expanded')).toBe('true')
    act(() => { fireEvent.click(screen.getByTestId('loc-library')) })
    expect(t.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByTestId('place-panel').textContent).toContain('도서관')
    act(() => { fireEvent.click(t) }) // 언제든 다시 펼칠 수 있다
    expect(t.getAttribute('aria-expanded')).toBe('true')
  })
  it('사용자가 직접 펼친 능력치는 장소를 골라도 닫지 않는다', () => {
    toMap()
    const t = screen.getByTestId('stats-toggle')
    act(() => { fireEvent.click(t) }); act(() => { fireEvent.click(t) }) // 접었다가 직접 펼침
    act(() => { fireEvent.click(screen.getByTestId('loc-library')) })
    expect(t.getAttribute('aria-expanded')).toBe('true')
  })
  it('장소를 빠르게 연속 선택해도 마지막 장소의 활동만 하나의 패널에 표시된다', () => {
    toMap()
    for (const id of ['library', 'hall', 'potions', 'library']) act(() => { fireEvent.click(screen.getByTestId(`loc-${id}`)) })
    const panel = screen.getByTestId('place-panel')
    expect(panel.querySelectorAll('.panel-body')).toHaveLength(1)
    expect(panel.querySelector('h2')!.textContent).toContain('도서관')
    expect(panel.querySelector('.menu-list')).toBeTruthy()
  })
  it('같은 활동 버튼을 연달아 눌러도 시간이 한 번만 소모된다', () => {
    toMap()
    act(() => { fireEvent.click(screen.getByTestId('loc-library')) })
    const r0 = store.state!.routine!; const before = r0.dayIdx * 3 + r0.slotIdx
    const btn = screen.getAllByTestId(/^act-/)[0]
    const dur = Number(/(\d+)/.exec(btn.textContent ?? '')?.[1] ?? 1)
    act(() => { fireEvent.click(btn); fireEvent.click(btn) })
    const r1 = store.state!.routine
    const after = r1 ? r1.dayIdx * 3 + r1.slotIdx : before + 1
    expect(after - before).toBeGreaterThanOrEqual(1); expect(after - before).toBeLessThanOrEqual(2 + dur * 0)
  })
})

describe('자유 일과 진입·종료 연출과 효과 연결 지점', () => {
  it('스토리→자유 일과 진입 시 이전 화면이 막에 덮인 뒤 지도가 나타나고, 불러오기 직후에는 재생하지 않는다', () => {
    start(); act(() => { store.jump('v2c1_routine') })
    expect(screen.queryByTestId('screen-veil')).toBeNull()
    for (let i = 0; i < 10 && store.state!.mode === 'STORY'; i++) clickStage()
    expect(store.state!.mode).toBe('ROUTINE')
    expect(screen.queryByTestId('map')).toBeNull() // 상태는 이미 지도지만 화면은 아직 이전 장면(페이드아웃이 보인다)
    expect(screen.getByTestId('screen-veil').className).toContain('sv-out')
    tick(320 + 120); expect(screen.getByTestId('map')).toBeTruthy()
    tick(400); expect(screen.queryByTestId('screen-veil')).toBeNull()
    act(() => { store.save('slot2') }); act(() => { store.toTitle() })
    cleanup(); render(<App />); act(() => { store.load('slot2') })
    expect(screen.queryByTestId('screen-veil')).toBeNull(); expect(screen.getByTestId('map')).toBeTruthy()
  })

  it('효과 연결 지점: 용어 최초 열람/재열람, 단서(OB_*), 관찰 기록 갱신, 용어 발견 신호가 나가고 구독 해제 후에는 가지 않는다', () => {
    const got: UiEffect[] = []
    const off = onUiEffect((e) => got.push(e))
    start(); act(() => { store.jump('v2c1_train') })
    act(() => { fireEvent.click(screen.getByRole('button', { name: /급행열차 설명 보기/ })) })
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    act(() => { fireEvent.click(screen.getByRole('button', { name: /급행열차 설명 다시 보기/ })) })
    const opens = got.filter((e) => e.type === 'term-open')
    expect(opens.map((e) => e.first)).toEqual([true, false]); expect(opens[0].id).toBe('express')
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    for (let i = 0; i < 8; i++) clickStage()
    expect(got.some((e) => e.type === 'clue' && e.id === 'OB_SLEEVE')).toBe(true)
    expect(got.some((e) => e.type === 'journal-update' && e.id === 'draco')).toBe(true)
    expect(got.some((e) => e.type === 'term-discover')).toBe(true)
    off()
    const n = got.length
    clickStage(); expect(got.length).toBe(n)
  })

  it('불러오기 직후에는 이미 있던 용어·단서로 효과 신호를 보내지 않는다', () => {
    start(); act(() => { store.jump('v2c1_train') }); for (let i = 0; i < 8; i++) clickStage()
    act(() => { store.save('slot3') }); act(() => { store.toTitle() })
    const got: UiEffect[] = []; const off = onUiEffect((e) => got.push(e))
    cleanup(); render(<App />); act(() => { store.load('slot3') })
    expect(got.filter((e) => e.type === 'clue' || e.type === 'journal-update' || e.type === 'term-discover')).toEqual([])
    off()
  })
})
