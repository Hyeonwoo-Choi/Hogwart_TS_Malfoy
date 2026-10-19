import type { ChoiceOption, Node } from '../engine/types'

/** 시나리오 작성용 축약 헬퍼 (데이터 파일 공용) */
export const N = (text: string, when?: string): Node => ({ t: 'line', text, when })
export const S = (who: string, text: string, expr?: string, when?: string): Node => ({ t: 'line', who, text, expr, when })
export const show = (char: string | null, expr?: string): Node => ({ t: 'show', char, expr })
export const bg = (id: string): Node => ({ t: 'bg', id })
export const go = (scene: string): Node => ({ t: 'goto', scene })
export const fx = (...f: string[]): Node => ({ t: 'fx', fx: f })
export const date = (d: string, weekday: string): Node => ({ t: 'date', date: d, weekday })
export const opt = (key: string, text: string, o: Partial<ChoiceOption> = {}): ChoiceOption => ({ key, text, ...o })
export const iff = (cond: string, then: string, els?: string): Node => ({ t: 'if', cond, then, else: els })
export const END: Node = { t: 'end' }

export const H = (text: string, when?: string) => S('해리', text, undefined, when)
export const D = (text: string, expr?: string, when?: string) => S('드레이코', text, expr, when)
export const HER = (text: string, when?: string) => S('헤르미온느', text, undefined, when)
export const RON = (text: string, when?: string) => S('론', text, undefined, when)
export const GIN = (text: string, when?: string) => S('지니', text, undefined, when)
export const LUN = (text: string, when?: string) => S('루나', text, undefined, when)
export const PAN = (text: string, when?: string) => S('판시', text, undefined, when)
export const SLU = (text: string, when?: string) => S('슬러그혼', text, undefined, when)
export const SNA = (text: string, when?: string) => S('스네이프', text, undefined, when)
export const MCG = (text: string, when?: string) => S('맥고나걸', text, undefined, when)
export const FIL = (text: string, when?: string) => S('필치', text, undefined, when)
export const HOO = (text: string, when?: string) => S('후치', text, undefined, when)
