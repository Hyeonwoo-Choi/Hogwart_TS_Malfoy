import { useEffect, useRef } from 'react'
import { buildCases } from '../data/cases'
import { buildJournal } from '../data/journal'
import type { GameState } from '../engine/types'

/**
 * 마법 이펙트 연결 지점(최종 그래픽 작업용). 지금은 구독자가 없어 아무 일도 하지 않으며, 효과가 없어도 모든 기능이 그대로 동작한다.
 * 그래픽 쪽은 `onUiEffect`로 구독하고, UI 상태와 효과 실행은 서로 모른다.
 *  term-discover  용어를 처음 마주침(대사 진행으로 `terms`가 늘 때, 불러오기 직후엔 보내지 않는다)
 *  term-open      용어 설명창이 열림(first=true면 처음 읽는 것, false면 재열람)
 *  journal-update 인물 관찰 기록에 새 문장이 생김(id=인물)
 *  clue           새 관찰 단서(OB_*)를 얻음(id=단서 키)
 *  case-update    사건 수첩에 새 단서가 생김(id=사건)
 *  transition     장면(시간·장소) 전환 또는 화면 종류 전환(id=문구 또는 'map|1>scene|1' 같은 화면 키)
 *  board-open     학사 게시판 열림 / event-join 지도에서 행사·약속에 참가(id=행사)
 *  notebook-open / notebook-close / notebook-page  마법 수첩 열림·닫힘·페이지 전환(id=인물 기록|사건 수첩|마법 용어집의 section)
 */
export type UiEffectType = 'term-discover' | 'term-open' | 'journal-update' | 'case-update' | 'clue' | 'transition' | 'notebook-open' | 'notebook-close' | 'notebook-page' | 'board-open' | 'event-join' | 'choice-locked'
export interface UiEffect { type: UiEffectType; id?: string; first?: boolean }
type Listener = (e: UiEffect) => void

const listeners = new Set<Listener>()
export function onUiEffect(f: Listener): () => void { listeners.add(f); return () => { listeners.delete(f) } }
export function emitUiEffect(e: UiEffect) { listeners.forEach((f) => { try { f(e) } catch { /* 효과 실패가 게임을 멈추지 않는다 */ } }) }

/** 게임 상태의 변화에서 효과 신호를 만든다(읽기 전용). 첫 렌더·불러오기 직후의 상태는 기준선으로만 쓰고 신호를 보내지 않는다. */
export function useGameEffectSignals(state: GameState | null) {
  const prev = useRef<{ terms: number; ob: Set<string>; journal: Record<string, number>; cases: Record<string, number> } | null>(null)
  const sig = state ? state.choices.length + Object.keys(state.flags).length + Object.keys(state.knowledge).length : -1
  useEffect(() => {
    if (!state) { prev.current = null; return }
    const ob = new Set(Object.keys(state.knowledge).filter((k) => k.startsWith('OB_')))
    const journal: Record<string, number> = {}
    for (const p of buildJournal(state)) journal[p.id] = p.observed.length
    const before = prev.current
    const cases: Record<string, number> = {}
    for (const c of buildCases(state)) cases[c.id] = c.obs.length + c.testimony.length
    prev.current = { terms: state.terms?.length ?? 0, ob, journal, cases }
    if (!before) return
    if ((state.terms?.length ?? 0) > before.terms) emitUiEffect({ type: 'term-discover' })
    for (const k of ob) if (!before.ob.has(k)) emitUiEffect({ type: 'clue', id: k })
    for (const [id, n] of Object.entries(journal)) if (n > (before.journal[id] ?? 0)) emitUiEffect({ type: 'journal-update', id })
    for (const [id, n] of Object.entries(cases)) if (n > (before.cases[id] ?? 0)) emitUiEffect({ type: 'case-update', id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, state?.terms?.length, !!state])
}
