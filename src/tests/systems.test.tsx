import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { store } from '../engine/store'
import { setDevAttrs, STORAGE_PREFIX } from '../engine/env'
import { isLegacySlot, listSlots, loadCgRecord, loadFromSlot, recordCg, saveToSlot } from '../engine/save'
import { buildCodex } from '../data/codex'
import { CG_LIST } from '../data/cg'
import { play } from './helpers'

beforeEach(() => { vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.cgSeen = []; store.toTitle(); store.updateSettings({ typing: 'instant' }) })
afterEach(() => { cleanup(); vi.useRealTimers(); setDevAttrs(null) })

const SPOILER = /data-(expr|form|pose|gaze|asset|char|cg)=|PLACEHOLDER|플레이스홀더|draco_t|char\.draco|cg_[a-z]|변신 전|변신 후|환영 상태|평온|무표정|비웃음/

describe('플레이어 화면 스포일러 방지', () => {
  it('일반 모드 DOM에는 표정·외형 상태·에셋 ID·플레이스홀더 문구가 없다(변화 직후 진짜 모습 장면 포함)', () => {
    setDevAttrs(false)
    const { container } = render(<App />)
    act(() => { fireEvent.click(screen.getByTestId('new-game')) })
    expect(container.innerHTML).not.toMatch(SPOILER)
    for (const scene of ['v2c1_train', 'ch2_after', 'ch2_dawn', 'ch2_morning']) {
      act(() => store.jump(scene))
      for (let i = 0; i < 12; i++) {
        expect(container.innerHTML, scene).not.toMatch(SPOILER)
        act(() => { fireEvent.click(screen.getByTestId('stage')) })
        if (!store.state || store.state.mode !== 'STORY') break
      }
    }
  })
  it('캐릭터 실루엣의 접근성 이름은 인물 이름뿐이다', () => {
    setDevAttrs(false)
    render(<App />)
    act(() => { fireEvent.click(screen.getByTestId('new-game')) }); act(() => store.jump('ch2_after'))
    for (let i = 0; i < 6; i++) act(() => { fireEvent.click(screen.getByTestId('stage')) })
    const labels = [...document.querySelectorAll('svg[role="img"]')].map((e) => e.getAttribute('aria-label'))
    expect(labels.every((l) => l === '드레이코' || l === '')).toBe(true)
  })
  it('타이틀에 개발용 에셋 개수가 보이지 않는다', () => {
    setDevAttrs(false)
    render(<App />)
    expect(screen.queryByTestId('dev-info')).toBeNull()
  })
})

describe('CG 기록', () => {
  it('장면에서 CG가 표시되면 경험 기록이 남고, 저장 슬롯과 별개로 보존된다', () => {
    render(<App />)
    act(() => { fireEvent.click(screen.getByTestId('new-game')) })
    act(() => store.jump('v2c1_train'))
    for (let i = 0; i < 12; i++) act(() => { fireEvent.click(screen.getByTestId('stage')) })
    expect(loadCgRecord().ids).toContain('cg_train_sleeve')
    // 저장 데이터에는 CG 기록이 들어가지 않으며, 슬롯을 지워도 기록은 남는다
    saveToSlot('slot1', store.state!, new Set())
    expect(window.localStorage.getItem(`${STORAGE_PREFIX}save:slot1`)).not.toContain('"ids"')
    window.localStorage.removeItem(`${STORAGE_PREFIX}save:slot1`)
    expect(loadCgRecord().ids).toContain('cg_train_sleeve')
  })
  it('갤러리는 경험한 장면만 제목을 보여 주고, 나머지는 ???로 가린다', () => {
    recordCg('cg_pitch_fall'); store.refreshCg()
    render(<App />)
    act(() => { fireEvent.click(screen.getByTestId('open-gallery')) })
    const g = screen.getByTestId('gallery').textContent ?? ''
    expect(g).toContain('세 번째 급강하')
    for (const c of CG_LIST.filter((x) => x.id !== 'cg_pitch_fall')) expect(g).not.toContain(c.title)
    expect((g.match(/\?\?\?/g) ?? []).length).toBe(CG_LIST.length - 1)
  })
  it('모든 CG ID는 고유하며 본편 시나리오에서 실제로 사용된다', () => {
    const ids = CG_LIST.map((c) => c.id); expect(new Set(ids).size).toBe(ids.length)
    const used = new Set<string>()
    const plans: Record<string, string>[] = [{ 'K-03': 'D', 'S-01': 'B', 'K-04': 'B', 'K-05': 'C' }, { 'K-03': 'A' }, { 'K-03': 'D', 'S-01': 'B', 'K-04': 'D', 'K-08': 'A', 'K-11': 'B', 'K-12': 'B', 'K-13': 'B' }]
    for (const plan of plans) play(plan, 1, { follow: true }).cgs.forEach((c) => used.add(c))
    for (const id of ids) expect(used.has(id), id).toBe(true)
  })
})

describe('마법사의 기록(도감)', () => {
  const INTERNAL = /(FLAG|KN|OB)_|draco\.|stat\.|cg_|K-0\d|S-0\d|trust|wariness/
  it('해리가 겪지 않은 것은 기록하지 않고, 내부 ID·조건을 출력하지 않는다', () => {
    const early = play({ 'K-01': 'C' }, 1, { stopAt: (s) => s.scene === 'v2c1_pitch' }).s
    const c = buildCodex(early)
    expect(c.some((e) => e.title === '열차에서 엿들은 말')).toBe(false)
    expect(c.some((e) => e.title === '그날 밤')).toBe(false)
    expect(JSON.stringify(c)).not.toMatch(INTERNAL)
  })
  it('나중에 알게 된 사실은 과거 기록에 재해석으로 덧붙는다(변화 이후에만)', () => {
    const before = buildCodex(play({}, 2, { stopAt: (s) => s.scene === 'ch2_night' }).s).find((e) => e.title === '검보랏빛 불꽃')
    expect(before?.note).toBeUndefined()
    const end = play({}, 2).s
    const after = buildCodex(end).find((e) => e.title === '검보랏빛 불꽃')
    expect(after?.note).toContain('다시 보니')
    expect(JSON.stringify(buildCodex(end))).not.toMatch(INTERNAL)
  })
})

describe('저장 호환 정책', () => {
  it('구버전(v1) 저장은 불러오지 않고, 목록에 보존된 채 표시되며, 덮어쓰기 전에 별도 보관된다', () => {
    const v1 = JSON.stringify({ schemaVersion: 1, savedAt: '2026-10-01', label: 'old', state: { mode: 'STORY' }, read: [] })
    window.localStorage.setItem(`${STORAGE_PREFIX}save:slot3`, v1)
    window.localStorage.setItem(`${STORAGE_PREFIX}save:auto`, v1)
    expect(isLegacySlot('slot3')).toBe(true); expect(loadFromSlot('slot3')).toBeNull()
    expect(listSlots().find((s) => s.key === 'slot3')).toMatchObject({ legacy: true, empty: false })
    expect(store.load('slot3')).toBe(false)
    // 새 게임의 자동 저장은 구버전 자동 저장을 먼저 보관한 뒤 기록한다
    store.newGame()
    expect(window.localStorage.getItem(`${STORAGE_PREFIX}legacy:auto`)).toBe(v1)
    expect(loadFromSlot('auto')?.state.schemaVersion).toBe(2)
  })
  it('일반 모드의 저장 키는 hfd:, ?qa 모드는 hfd-qa:로 분리된다', async () => {
    expect(STORAGE_PREFIX).toBe('hfd:')
    vi.resetModules()
    window.history.pushState({}, '', '/?qa')
    const env = await import('../engine/env')
    expect(env.STORAGE_PREFIX).toBe('hfd-qa:'); expect(env.QA_MODE).toBe(true)
    window.history.pushState({}, '', '/')
  })
  it('저장→불러오기 후 배경·인물·외형·연출 상태·남은 시간 슬롯이 그대로 복원된다', () => {
    const mid = play({ 'S-01': 'B', 'K-04': 'B' }, 3, { stopAt: (s) => s.scene === 'ch2_dawn' && s.idx > 6 }).s
    saveToSlot('slot2', mid, new Set())
    const back = loadFromSlot('slot2')!.state
    expect(back.view).toEqual(mid.view); expect(back.emotions.draco).toEqual(mid.emotions.draco)
    const rt = play({}, 3, { stopAt: (s) => s.mode === 'ROUTINE' }).s
    saveToSlot('slot4', rt, new Set()); expect(loadFromSlot('slot4')!.state.routine).toEqual(rt.routine)
  })
})
