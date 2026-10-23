import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { TermText } from '../ui/Terms'
import { store } from '../engine/store'
import { clone, continueChapter, newState, readTerm, run } from '../engine/core'
import { validateSave } from '../engine/save'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { segmentText, termsIn } from '../data/glossary'
import type { GameState } from '../engine/types'

/**
 * 용어 읽음 상태 회귀 테스트: 기존 구현(termsRead·TermText)이 요구 규칙을 이미 만족하는지 확인하고,
 * 이번 개편에서 추가된 장면(챕터 2 경로·행사·선택지)에도 같은 상태가 적용되는지 본다.
 */
const clickStage = () => act(() => { fireEvent.click(screen.getByTestId('stage')) })
const setState = (s: GameState) => act(() => { (store as unknown as { set: (x: GameState) => void }).set(s) })
beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

/** 같은 용어 id가 들어 있는 첫 번째 줄(대사·서술)이 있는 장면과 위치를 서로 다른 두 장면에서 찾는다 */
function linesWith(id: string, prefix: RegExp, n: number) {
  const out: { scene: string; idx: number; text: string }[] = []
  for (const [scene, nodes] of Object.entries(SCENARIO)) {
    if (!prefix.test(scene)) continue
    const idx = nodes.findIndex((x) => x.t === 'line' && !x.when && termsIn(x.text).includes(id))
    if (idx >= 0) out.push({ scene, idx, text: (nodes[idx] as { text: string }).text })
    if (out.length >= n) break
  }
  return out
}
const showLine = (scene: string, idx: number, read: string[] = []) => {
  const s = newState(START_SCENE, 1); s.scene = scene; s.idx = idx; s.mode = 'STORY'; s.termsRead = read; setState(s)
}

describe('용어 읽음: 공통 ID · 영구 유지', () => {
  it('띄어쓰기·표기가 달라도 같은 용어 id로 묶여 읽음 상태를 공유한다(별칭)', () => {
    const idOf = (x: string) => segmentText(x).find((y) => y.term)?.term
    expect(idOf('그리핀도르 탑')).toBe('houses'); expect(idOf('슬리데린 식탁')).toBe('houses'); expect(idOf('레번클로의 방')).toBe('houses')
    for (const x of ['그리핀도르 탑', '슬리데린 식탁']) {
      const { unmount } = render(<TermText text={x} onTerm={() => {}} read={['houses']} />)
      for (const b of screen.getAllByRole('button')) expect(b.className).toContain('term-read')
      unmount()
    }
  })

  it('읽은 용어는 챕터 1·챕터 2·행사·활동 장면 어디서나 무채색이고 읽지 않은 용어는 금색이다', () => {
    const groups: [string, RegExp][] = [['ch1', /^v2c1_/], ['ch2', /^ch2_/], ['event', /^ev[12]_/], ['activity', /^act_/]]
    let tested = 0
    for (const id of ['quidditch', 'potions', 'houses', 'classes', 'slugclub']) {
      for (const [name, re] of groups) {
        const found = linesWith(id, re, 1)[0]
        if (!found) continue
        tested++
        const { unmount } = render(<TermText text={found.text} onTerm={() => {}} read={[id]} />)
        for (const b of document.querySelectorAll(`button[data-term="${id}"]`)) expect(b.className, `${name}:${found.scene}`).toContain('term-read')
        unmount()
        const r2 = render(<TermText text={found.text} onTerm={() => {}} read={[]} />)
        for (const b of document.querySelectorAll(`button[data-term="${id}"]`)) expect(b.className, `${name}:${found.scene}`).toContain('term-new')
        r2.unmount()
      }
    }
    expect(tested).toBeGreaterThanOrEqual(6)
  })

  it('앱 화면: 한 장면에서 용어 설명을 읽으면 다른 장면(다른 챕터)에서도 무채색이다', () => {
    const [a, b] = [...linesWith('quidditch', /^v2c1_/, 1), ...linesWith('quidditch', /^ch2_|^ev[12]_/, 1)]
    expect(a && b).toBeTruthy()
    render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) })
    showLine(a.scene, a.idx)
    const btn = document.querySelector('button[data-term="quidditch"]') as HTMLButtonElement
    expect(btn.className).toContain('term-new')
    act(() => { fireEvent.click(btn) })
    expect(store.state!.termsRead).toContain('quidditch')
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    // 읽은 직후 현재 화면에도 반영된다
    expect((document.querySelector('button[data-term="quidditch"]') as HTMLElement).className).toContain('term-read')
    // 다른 장면으로 이동해도 유지된다(상태에서 이어받아 장면만 바꾼다)
    const s = clone(store.state!); s.scene = b.scene; s.idx = b.idx; setState(s)
    expect((document.querySelector('button[data-term="quidditch"]') as HTMLElement).className).toContain('term-read')
  })

  it('읽은 용어도 키보드로 접근해 다시 열 수 있다(버튼 요소, 포커스 가능, Enter로 설명)', () => {
    const onTerm = vi.fn()
    render(<TermText text="퀴디치 경기" onTerm={onTerm} read={['quidditch']} />)
    const b = screen.getByRole('button'); expect(b.tagName).toBe('BUTTON'); expect(b.getAttribute('tabindex')).not.toBe('-1')
    b.focus(); expect(document.activeElement).toBe(b)
    fireEvent.click(b); expect(onTerm).toHaveBeenCalledWith('quidditch')
  })

  /** 선택지 옵션 텍스트에 등록 용어가 들어 있는 첫 선택지(장면·노드 위치) */
  const termChoice = () => {
    for (const [scene, nodes] of Object.entries(SCENARIO)) for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.t === 'choice') { const o = n.options.find((x) => termsIn(x.text).length && !x.if); if (o) return { scene, idx: i, key: o.key, term: termsIn(o.text)[0] } }
    }
    throw new Error('용어가 들어 있는 선택지가 없다')
  }
  const openChoice = () => {
    const c = termChoice()
    render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) })
    const s = newState(START_SCENE, 1); s.scene = c.scene; s.idx = c.idx; s.mode = 'STORY'; setState(s)
    return c
  }
  it('선택지 속 용어: 눌러서 설명이 열리고 선택은 실행되지 않으며, 읽음 색이 본문과 같은 상태로 바뀐다', () => {
    const c = openChoice()
    const before = store.state!.scene + ':' + store.state!.idx + ':' + store.state!.choices.length
    const row = screen.getByTestId('choice-' + c.key)
    expect(row.querySelectorAll('button').length).toBeGreaterThan(0) // 용어는 진짜 버튼(키보드 접근)
    const btn = row.querySelector('button[data-term="' + c.term + '"]') as HTMLButtonElement
    expect(btn.className).toContain('term-new')
    act(() => { fireEvent.click(btn) })
    expect(screen.getByTestId('term-pop')).toBeTruthy()
    expect(store.state!.scene + ':' + store.state!.idx + ':' + store.state!.choices.length).toBe(before) // 선택 미실행
    expect(store.state!.termsRead).toContain(c.term)
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    expect((screen.getByTestId('choice-' + c.key).querySelector('button[data-term="' + c.term + '"]') as HTMLElement).className).toContain('term-read')
  })
  it('선택지 키보드: 용어 버튼에서 Enter는 설명을 열고(선택 안 됨), 선택지 자체에서 Enter는 선택을 실행한다', () => {
    const c = openChoice()
    const before = store.state!.choices.length
    const btn = screen.getByTestId('choice-' + c.key).querySelector('button[data-term]') as HTMLButtonElement
    btn.focus(); expect(document.activeElement).toBe(btn)
    act(() => { fireEvent.keyDown(btn, { key: 'Enter' }); fireEvent.click(btn) }) // 버튼의 Enter는 클릭으로 처리된다
    expect(store.state!.choices.length).toBe(before); expect(screen.queryByTestId('term-pop')).toBeTruthy()
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    const row = screen.getByTestId('choice-' + c.key); expect(row.getAttribute('role')).toBe('button'); expect(row.getAttribute('tabindex')).toBe('0')
    act(() => { fireEvent.keyDown(row, { key: 'Enter' }) })
    expect(store.state!.choices.length).toBe(before + 1)
  })
  it('설명창을 읽은 상태는 저장·불러오기 뒤 선택지에서도 유지된다', () => {
    const c = openChoice()
    act(() => { fireEvent.click(screen.getByTestId('choice-' + c.key).querySelector('button[data-term]') as HTMLButtonElement) })
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    store.save('slot5'); const saved = clone(store.state!); store.toTitle(); store.load('slot5')
    expect(store.state!.termsRead).toEqual(saved.termsRead)
    expect((document.querySelector('[data-testid="choice-' + c.key + '"] button[data-term="' + c.term + '"]') as HTMLElement | null)?.className ?? 'term-read').toContain('term-read')
  })

  it('읽음 상태는 저장·복원·챕터 이월에서 유지되고, 새 게임은 빈 상태로 시작한다', () => {
    let s = run(newState(START_SCENE, 1)); s = readTerm(s, 'quidditch'); s = readTerm(s, 'potions')
    const f = (st: GameState) => ({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: st })
    expect(validateSave(JSON.parse(JSON.stringify(f(s)))).state.termsRead).toEqual(['quidditch', 'potions'])
    const end = clone(s); end.scene = 'ch2_end'; end.idx = SCENARIO.ch2_end.length - 1; end.mode = 'ENDED'
    expect(continueChapter(end).termsRead).toEqual(['quidditch', 'potions'])
    expect(newState(START_SCENE, 2).termsRead).toEqual([])
    render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }); expect(store.state!.termsRead).toEqual([])
  })

  it('영구적인 점선 밑줄은 없다(색으로만 구분)', () => {
    render(<TermText text="퀴디치 경기" onTerm={() => {}} read={[]} />)
    const css = document.documentElement.outerHTML
    expect(css).not.toMatch(/border-bottom:\s*1px dotted/)
    void clickStage
  })
})
