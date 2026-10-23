import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SceneRenderer } from '../src/components/SceneRenderer'
import { MockSceneScreen } from '../src/screens/MockSceneScreen'
import type { SceneView } from '../src/shared/presentation'
afterEach(() => { cleanup(); vi.useRealTimers() })
const scene: SceneView = { id: 'a', text: 'sample', speaker: 'speaker', characters: [] }
describe('independent presentation', () => {
  it('advances only after completing the line', () => {
    const advance = vi.fn()
    render(<SceneRenderer scene={scene} onAdvance={advance} onChoose={vi.fn()} />)
    fireEvent.click(screen.getByText('문장 펼치기'))
    expect(advance).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('다음'))
    expect(advance).toHaveBeenCalledTimes(1)
  })
  it('emits choice IDs, blocks disabled choices, and does not advance', () => {
    const choose = vi.fn(), advance = vi.fn()
    render(<SceneRenderer scene={{ ...scene, choices: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No', disabled: true }] }} instant onChoose={choose} onAdvance={advance} />)
    fireEvent.click(screen.getByText('2. No'))
    expect(choose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('1. Yes'))
    expect(choose).toHaveBeenCalledWith('yes')
    expect(advance).not.toHaveBeenCalled()
  })
  it('replaces failed images and supports keyboard choices', () => {
    const choose = vi.fn()
    render(<SceneRenderer scene={{ ...scene, characters: [{ id: 'x', name: 'Portrait', src: '/missing.png' }], choices: [{ id: 'yes', text: 'Yes' }] }} instant onChoose={choose} onAdvance={vi.fn()} />)
    fireEvent.error(screen.getByAltText('Portrait'))
    expect(screen.getByRole('img', { name: 'Portrait' }).tagName).toBe('DIV')
    fireEvent.keyDown(window, { key: '1' })
    expect(choose).toHaveBeenCalledWith('yes')
  })
  it('blocks input during a scene transition and cleans up timers', () => {
    vi.useFakeTimers()
    const advance = vi.fn(), choose = vi.fn()
    const view = render(<SceneRenderer scene={scene} instant onAdvance={advance} onChoose={choose} />)
    view.rerender(<SceneRenderer scene={{ ...scene, id: 'b' }} instant onAdvance={advance} onChoose={choose} />)
    expect((screen.getByText('다음') as HTMLButtonElement).disabled).toBe(true)
    act(() => { vi.advanceTimersByTime(700) })
    expect((screen.getByText('다음') as HTMLButtonElement).disabled).toBe(false)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('runs the mock without storage or external requests', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem')
    const set = vi.spyOn(Storage.prototype, 'setItem')
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<MockSceneScreen />)
    fireEvent.click(screen.getByLabelText('즉시 표시'))
    fireEvent.click(screen.getByText('다음'))
    expect(screen.getByText('1. CG 프레임과 화면 전환을 확인한다.')).toBeDefined()
    expect(get).not.toHaveBeenCalled(); expect(set).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
