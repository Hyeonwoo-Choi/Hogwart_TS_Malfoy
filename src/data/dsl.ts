import type { ChoiceOption, CueEffect, Form, Gaze, LineNode, Light, Node, Pose } from '../engine/types'

/** 시나리오 작성용 축약 헬퍼 (데이터 파일 공용). 서술은 해리 1인칭. */
export const N = (text: string, when?: string): Node => ({ t: 'line', text, when })
export const S = (who: string, text: string, expr?: string, when?: string): Node => ({ t: 'line', who, text, expr, when })
export const show = (char: string | null, expr?: string, o: { pose?: Pose; gaze?: Gaze; form?: Form; note?: string } = {}): Node => ({ t: 'show', char, expr, ...o })
export const bg = (id: string): Node => ({ t: 'bg', id })
export const go = (scene: string): Node => ({ t: 'goto', scene })
export const fx = (...f: string[]): Node => ({ t: 'fx', fx: f })
export const date = (d: string, weekday: string): Node => ({ t: 'date', date: d, weekday })
export const opt = (key: string, text: string, o: Partial<ChoiceOption> = {}): ChoiceOption => ({ key, text, ...o })
export const iff = (cond: string, then: string, els?: string): Node => ({ t: 'if', cond, then, else: els })
export const END: Node = { t: 'end' }
/** 연출 큐(진행을 막지 않음) */
export const cue = (effect?: CueEffect, light?: Light): Node => ({ t: 'cue', effect, light })
export const light = (l: Light): Node => ({ t: 'cue', light: l })
/** 시간·장소 전환(페이드 + 문구). 의미 있는 시간 경과·장소 이동에만 쓴다 */
export const trans = (title: string, place?: string): Node => ({ t: 'trans', title, place })
/** CG 표시 / 해제 */
export const cg = (id: string | null): Node => ({ t: 'cg', id })

/** 인물 대사 + 표정·자세·시선(거리감 연출). 자세는 near/close/back 등으로 다가옴·물러남을 표현한다 */
export const SX = (who: string, text: string, o: { expr?: string; pose?: Pose; gaze?: Gaze; when?: string } = {}): Node => {
  const n: LineNode = { t: 'line', who, text }
  if (o.expr) n.expr = o.expr
  if (o.pose) n.pose = o.pose
  if (o.gaze) n.gaze = o.gaze
  if (o.when) n.when = o.when
  return n
}
export const H = (text: string, when?: string) => S('해리', text, undefined, when)
export const D = (text: string, expr?: string, when?: string) => S('드레이코', text, expr, when)
/** 드레이코 대사 + 자세·시선 */
export const DX = (text: string, o: { expr?: string; pose?: Pose; gaze?: Gaze; when?: string }): Node => {
  const n: LineNode = { t: 'line', who: '드레이코', text }
  if (o.expr) n.expr = o.expr
  if (o.pose) n.pose = o.pose
  if (o.gaze) n.gaze = o.gaze
  if (o.when) n.when = o.when
  return n
}
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
