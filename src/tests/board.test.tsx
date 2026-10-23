import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { store } from '../engine/store'
import { clone, setActivityScenes } from '../engine/core'
import { onUiEffect, type UiEffect } from '../ui/effects'
import { buildCases } from '../data/cases'
import { ACTIVITY_SCENES } from '../data/activityScenes'
import type { GameState } from '../engine/types'

const clickStage = () => act(() => { fireEvent.click(screen.getByTestId('stage')) })
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const start = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }
const setState = (s: GameState) => act(() => { (store as unknown as { set: (x: GameState) => void }).set(s) })
const toMap = () => { for (let i = 0; i < 12 && store.state!.mode === 'STORY'; i++) clickStage(); tick(900) }
/** 챕터 1 우선순위 선택(H-08)부터 지도까지 UI로 진행 */
const viaWeek = (key: string) => {
  start(); act(() => { store.jump('v2c1_week') })
  for (let i = 0; i < 12 && !screen.queryByTestId(`choice-${key}`); i++) clickStage()
  act(() => { fireEvent.click(screen.getByTestId(`choice-${key}`)) })
  toMap()
}
const jumpTo = (day: number, slot: number) => { const s = clone(store.state!); s.routine!.dayIdx = day; s.routine!.slotIdx = slot; setState(s); tick(900) }

beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
  setActivityScenes(true)
})
afterEach(() => { cleanup(); setActivityScenes(false); vi.useRealTimers() })

describe('학사 게시판 UI', () => {
  it('지도에서 게시판을 열면 이번 달 행사가 보이고, 읽음 처리·닫기가 게임 상태(시간·수치)를 바꾸지 않으며 상단 알림창은 없다', () => {
    viaWeek('F')
    const before = JSON.stringify({ r: store.state!.routine, st: store.state!.stats, em: store.state!.emotions })
    expect(screen.queryByTestId('map-msg')).toBeNull(); expect(screen.queryByTestId('map-notice')).toBeNull()
    act(() => { fireEvent.click(screen.getByTestId('board-open')) })
    const b = screen.getByTestId('board')
    expect(b.textContent).toContain('9월 일정'); expect(b.textContent).toContain('온실 특별 실습'); expect(b.textContent).toContain('퀴디치 공개 연습')
    expect(b.textContent).toContain('목요일'); expect(b.textContent).toContain('오후1'); expect(b.textContent).toContain('참가 조건')
    expect(b.textContent).not.toMatch(/금이|균열|7층|말포이/)
    expect(screen.queryByTestId('bd-ap_hermione')).toBeNull() // 약속을 걸지 않았으니 개인 일정은 없다
    act(() => { fireEvent.click(screen.getByTestId('bd-ev_pitch_open').querySelector('button')!) })
    expect(store.state!.board!.read).toContain('ev_pitch_open')
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    expect(screen.queryByTestId('board')).toBeNull()
    expect(JSON.stringify({ r: store.state!.routine, st: store.state!.stats, em: store.state!.emotions })).toBe(before)
  })

  it('이번 주 우선순위(H-08)로 고른 약속만 게시판과 지도에 나타나고, 같은 시간대 행사와의 충돌이 안내된다', () => {
    viaWeek('A')
    act(() => { fireEvent.click(screen.getByTestId('board-open')) })
    const card = screen.getByTestId('bd-ap_hermione')
    expect(card.textContent).toContain('도서관'); expect(card.textContent).toContain('약속'); expect(card.textContent).toContain('퀴디치 공개 연습')
    expect(card.textContent).toContain('둘 중 하나만')
    for (const other of ['ap_ginny', 'ap_luna', 'ap_pansy', 'pl_draco']) expect(screen.queryByTestId(`bd-${other}`)).toBeNull()
  })

  it('행사 날짜·시간대·장소가 맞으면 지도 마커에 ★ 표시와 행사 버튼이 생기고, 참가하면 장면이 재생되며 지난 뒤에는 기록이 남는다', () => {
    const got: UiEffect[] = []; const off = onUiEffect((e) => got.push(e))
    viaWeek('F')
    expect(document.querySelector('.marker.has-event')).toBeNull() // 수 오후1에는 열린 행사가 없다
    jumpTo(1, 0) // 목 오후1
    act(() => { fireEvent.click(screen.getByTestId('zone-grounds')) })
    const gh = screen.getByTestId('loc-greenhouse'); expect(gh.className).toContain('has-event'); expect(gh.getAttribute('aria-label')).toContain('열린 행사')
    act(() => { fireEvent.click(gh) })
    const btn = screen.getByTestId('act-ev:ev_greenhouse_prac')
    expect(btn.textContent).toContain('온실 특별 실습'); expect(btn.textContent).toMatch(/한 시간대|소요/)
    const t0 = store.state!.routine!.dayIdx * 3 + store.state!.routine!.slotIdx
    act(() => { fireEvent.click(btn); fireEvent.click(btn) })
    tick(900)
    expect(store.state!.mode).toBe('EVENT'); expect(screen.getByTestId('stage')).toBeTruthy()
    expect(store.state!.routine!.dayIdx * 3 + store.state!.routine!.slotIdx - t0).toBe(1)
    expect(got.some((e) => e.type === 'event-join' && e.id === 'ev_greenhouse_prac')).toBe(true)
    // 장면 끝까지: 선택지 앞에서 헤르미온느 쪽을 고른다
    for (let i = 0; i < 12 && !screen.queryByTestId('choice-A'); i++) clickStage()
    act(() => { fireEvent.click(screen.getByTestId('choice-A')) })
    for (let i = 0; i < 12 && !screen.queryByTestId('choice-A'); i++) clickStage()
    act(() => { fireEvent.click(screen.getByTestId('choice-A')) })
    for (let i = 0; i < 12 && store.state!.mode === 'EVENT'; i++) clickStage()
    tick(900)
    expect(store.state!.mode).toBe('ROUTINE'); expect(screen.getByTestId('map')).toBeTruthy()
    expect(store.state!.board!.done.ev_greenhouse_prac).toBe('hermione_ok')
    act(() => { fireEvent.click(screen.getByTestId('board-open')) })
    expect(screen.getByTestId('bd-ev_greenhouse_prac').getAttribute('data-status')).toBe('done')
    expect(screen.getByTestId('bd-ev_pitch_open').getAttribute('data-status')).toBe('today') // 오후2는 아직
    off()
  })

  it('선택하지 않은 쪽(경기장 공개 연습)은 시간이 지나면 지난 일정 "놓침"으로 남는다', () => {
    viaWeek('F'); jumpTo(1, 2) // 목 저녁
    act(() => { fireEvent.click(screen.getByTestId('board-open')) })
    expect(screen.getByTestId('bd-ev_pitch_open').getAttribute('data-status')).toBe('missed')
    expect(screen.getByTestId('board').textContent).toContain('지난 일정')
  })
})

describe('활동 장면: 상태·사건 변형', () => {
  const lines = (id: string, _unused?: unknown) => ACTIVITY_SCENES[id].filter((n) => n.t === 'line').map((n) => (n as { text: string; when?: string }))
  it('능력치 수준·사건 경험에 따라 같은 활동의 문장이 갈린다(조건 줄)', () => {
    const study = lines('act_study_a', {} as GameState)
    expect(study.some((l) => l.when === 'stat.int>=16')).toBe(true); expect(study.some((l) => l.when === 'stat.int<12')).toBe(true)
    expect(study.some((l) => l.when === 'AT_library && FLAG_CRACK_SEEN')).toBe(true)
    expect(lines('act_study_b', {} as GameState).some((l) => l.when === 'AT_library && OB_RUNE_WALL')).toBe(true)
    expect(lines('act_quidditch_a', {} as GameState).some((l) => l.when === 'FLAG_RT_GINNY_OK')).toBe(true)
    expect(lines('act_observe_a', {} as GameState).some((l) => l.when === 'AT_lake && FLAG_LUNA_COUNT7')).toBe(true)
  })
  it('사건 수첩에 성 벽의 금과 경로별 단서가 단서 획득 뒤에만 나타난다', () => {
    start()
    expect(buildCases(store.state!)).toEqual([])
  })
})
