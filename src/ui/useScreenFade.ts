import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../engine/types'

/**
 * 화면 전환 조정 계층. 게임 상태(store)는 활동을 고르는 즉시 바뀌지만, 화면에 보이는 상태(view)는
 * "지도 ↔ 활동 장면 ↔ 스토리" 경계에서만 잠깐 이전 화면에 머문다: 이전 화면을 검은 막으로 덮고(out) → 새 화면으로 바꾼 뒤(hold) → 막을 걷는다(in).
 * - 막이 덮이는 동안(out·hold)에는 입력을 막는다(busy). 상태는 이미 확정돼 있어 시간·효과가 중복 적용되지 않는다.
 * - 새 게임·타이틀·불러오기·가져오기(epoch 변화)와 첫 렌더는 전환 없이 바로 보여 준다(저장 복원에서 연출이 재생되지 않는다).
 * - 움직임 감소 설정에서는 연출 없이 즉시 바꾼다. 언마운트 시 타이머를 정리한다.
 */
export type FadePhase = 'out' | 'hold' | 'in'
export const FADE_OUT_MS = 320, FADE_HOLD_MS = 120, FADE_IN_MS = 380

/** 화면의 종류(지도 / 장면 / 종료 카드)와 자유 일과 중인지 */
const keyOf = (s: GameState | null) => (s ? `${s.mode === 'ROUTINE' ? 'map' : s.mode === 'ENDED' ? 'end' : 'scene'}|${s.routine ? 1 : 0}` : 'none')
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useScreenFade(live: GameState | null, epoch: number, onBoundary?: (from: string, to: string) => void) {
  const [shown, setShown] = useState<GameState | null>(live)
  const [phase, setPhase] = useState<FadePhase | null>(null)
  const latest = useRef(live); latest.current = live
  const seenEpoch = useRef(epoch)
  const busy = useRef(false)
  const timers = useRef<number[]>([])

  const boundary = !!live && !!shown && seenEpoch.current === epoch && keyOf(shown) !== keyOf(live) && !reduced()
  const view = phase === 'out' || (phase === null && !busy.current && boundary) ? shown : live

  useEffect(() => {
    if (busy.current) return // 연출 중에는 최신 상태(latest)만 기억하고 연출이 끝날 때 반영한다
    const sameEpoch = seenEpoch.current === epoch
    seenEpoch.current = epoch
    if (!(live && shown && sameEpoch && keyOf(shown) !== keyOf(live) && !reduced())) { setShown(live); return }
    busy.current = true
    onBoundary?.(keyOf(shown), keyOf(live))
    setPhase('out')
    const at = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)) }
    at(FADE_OUT_MS, () => {
      setPhase('hold')
      at(FADE_HOLD_MS, () => {
        setPhase('in')
        at(FADE_IN_MS, () => { busy.current = false; setPhase(null); setShown(latest.current) })
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, epoch])
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; busy.current = false }, [])

  return { view, phase, busy: phase === 'out' || phase === 'hold' }
}
