import { dayIndex } from './cond'
import type { GameState } from './types'

/**
 * 히로인 반응 훅(V2_HEROINES.md 3장). 관찰자(observer)가 해리와 다른 인물(subject)의 만남을 **직접 목격했을 때만** 반응이 생긴다.
 * 반응 종류는 낭만적 감정과 분리된다: 질투 / 경쟁심 / 호기심 / 서운함 / 무관심.
 * 시나리오 조건식에서는 `REACT_<observer>_<subject>`(최근 3일 기준)로 읽는다. 값: 0 없음 1 질투 2 경쟁심 3 호기심 4 서운함 5 무관심.
 * 드레이코는 기존 감정 훅(EH-xx)이 담당하므로 이 표에 없다.
 */
export type Reaction = 'none' | 'jealousy' | 'rivalry' | 'curiosity' | 'hurt' | 'indifference'
export const REACTION_CODE: Record<Reaction, number> = { none: 0, jealousy: 1, rivalry: 2, curiosity: 3, hurt: 4, indifference: 5 }
export const REACT_DAYS = 3

/** 관찰자별 단계(stage 0~3) × (해리와의 연애 상태가 열려 있는가) 반응표. 단계 0은 모두 무관심. */
const TABLE: Record<string, { calm: Reaction[]; romantic: Reaction[] }> = {
  hermione: { calm: ['indifference', 'curiosity', 'hurt', 'curiosity'], romantic: ['indifference', 'curiosity', 'hurt', 'jealousy'] },
  ginny: { calm: ['indifference', 'indifference', 'rivalry', 'rivalry'], romantic: ['indifference', 'indifference', 'rivalry', 'hurt'] },
  luna: { calm: ['indifference', 'curiosity', 'curiosity', 'curiosity'], romantic: ['indifference', 'curiosity', 'curiosity', 'hurt'] },
  pansy: { calm: ['indifference', 'rivalry', 'rivalry', 'rivalry'], romantic: ['indifference', 'rivalry', 'rivalry', 'jealousy'] },
}

/** 해리와 observer의 연애가 열려 있거나(open) 성립(together)한 상태 */
const isRomantic = (r: string) => r === 'open' || r === 'together'

export function reactionOf(s: GameState, observer: string, subject: string, days = REACT_DAYS): Reaction {
  const row = TABLE[observer]
  if (!row || observer === subject) return 'none'
  const today = dayIndex(s.calendar.date)
  const saw = (s.recent ?? []).some((m) => m.who === subject && m.witnesses.includes(observer) && today - m.day <= days)
  if (!saw) return 'none'
  const b = s.bonds?.[observer]
  const stage = Math.max(0, Math.min(3, b?.stage ?? 0))
  return (b && isRomantic(b.romance) ? row.romantic : row.calm)[stage]
}
