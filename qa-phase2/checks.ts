import { evalCond, resolveVar } from '../src/engine/cond'
import { clone } from '../src/engine/core'
import { buildCases } from '../src/data/cases'
import type { GameState } from '../src/engine/types'

export interface Finding { code: string; level: 'error' | 'suspect'; scene: string; detail: string }
export interface ConditionSample { condition: string; result?: boolean; values: Record<string, number | string>; note?: string }
/** Never evaluate roll() while inspecting a checkpoint: inspection must not consume RNG. */
export function inspectCondition(s: GameState, condition: string): ConditionSample {
  const values: ConditionSample['values'] = {}
  for (const name of new Set(condition.match(/[A-Za-z_][A-Za-z0-9_.]*/g) ?? [])) {
    if (name === 'roll') continue
    try { values[name] = resolveVar(s, name) } catch (e) { values[name] = String(e) }
  }
  if (/\broll\s*\(/.test(condition)) return { condition, values, note: '확률 조건: 평가 생략' }
  try { return { condition, result: evalCond(clone(s), condition), values } }
  catch (e) { return { condition, values, note: String(e) } }
}

/** QA contracts describe observed facts, not alternative story/engine transition rules. */
export function storyContracts(s: GameState): Finding[] {
  const out: Finding[] = []
  const last = s.choices.at(-1)
  if (last?.id === 'Q-03' && last.option === 'B' && s.scene === 'ch2_p_secret_B') {
    const book = JSON.stringify(buildCases(s))
    if (/이마 높이|따뜻한 곳/.test(book)) out.push({ code: 'NOTEBOOK_UNOBSERVED_STAIR', level: 'suspect', scene: s.scene,
      detail: 'Q-03 B는 입구 표시 선택인데 수첩에 내부 문양·온기가 공개됨. 문장과 관찰 경로를 검토할 것.' })
  }
  return out
}

/** Lexical hints are review candidates only; names already revealed in context are allowed. */
export function blindHints(prompt: string, texts: string[], context: string[], scene: string): Finding[] {
  const names = ['드레이코', '헤르미온느', '지니', '루나', '판시']
  const known = [prompt, ...context].join('\n')
  const hints: Finding[] = []
  for (const text of texts) {
    const revealed = names.filter(n => text.includes(n) && !known.includes(n))
    if (revealed.length || /루트로|호감도|신뢰도|성공률|보상\s*[+:]|\d+\s*%/.test(text)) hints.push({ code: 'BLIND_CHOICE_REVIEW', level: 'suspect', scene,
      detail: `자동 확정 아님. 최근 문맥 밖 이름/메타 표현: ${text}` })
  }
  return hints
}
