export type Mode = 'TITLE' | 'STORY' | 'EVENT' | 'ROUTINE' | 'ENDED'
export const SLOTS = ['오후1', '오후2', '저녁'] as const
export type Slot = (typeof SLOTS)[number]

export interface DracoEmotions {
  affinity: number; trust: number; respect: number; attraction: number
  jealousy: number; wariness: number; guilt: number; dependence: number
}
export interface NpcEmotions { affinity: number; trust: number; wariness: number }
export interface Stats { int: number; str: number; magic: number; insight: number; social: number; will: number }

export type Effect = string // 'draco.trust+5' | 'stat.int+2' | 'flag:X' | 'unflag:X' | 'kn:X' | 'log:text'

export interface LineNode { t: 'line'; who?: string; text: string; expr?: string; when?: string }
export interface ChoiceOption {
  key: string; text: string; if?: string; fx?: Effect[]; goto?: string; expr?: string
  /** 시간제한 해제 시에만 노출되는 "망설임" 명시 선택지 */
  hesitate?: boolean
}
export interface ChoiceNode {
  t: 'choice'; id: string; prompt?: string; options: ChoiceOption[]
  timed?: { seconds: number; timeoutKey: string }
}
export interface FxNode { t: 'fx'; fx: Effect[] }
export interface IfNode { t: 'if'; cond: string; then: string; else?: string }
export interface GotoNode { t: 'goto'; scene: string }
export interface BgNode { t: 'bg'; id: string }
export interface ShowNode { t: 'show'; char: string | null; expr?: string }
export interface DateNode { t: 'date'; date: string; weekday: string }
export interface RoutineNode {
  t: 'routine'; days: { date: string; weekday: string }[]; night: boolean; then: string
  locations: string[]; encounters: Record<string, string[]>
  /** 드레이코가 없는 장소에서 순서대로 한 번씩 발생하는 조연 일상 이벤트 */
  friends?: Record<string, string[]>
}
export interface EndNode { t: 'end' }
export interface EndChapterNode { t: 'endChapter'; title: string }
export type Node =
  | LineNode | ChoiceNode | FxNode | IfNode | GotoNode | BgNode | ShowNode | DateNode
  | RoutineNode | EndNode | EndChapterNode
export type Scenario = Record<string, Node[]>

export interface RoutineState {
  days: { date: string; weekday: string }[]; dayIdx: number; slotIdx: number; night: boolean
  then: string; locations: string[]; encounters: Record<string, string[]>; friends?: Record<string, string[]>
  pendingDone: boolean; message: string | null
}
export interface ChoiceRecord { id: string; option: string; scene: string; date: string }
export interface BacklogEntry { kind: 'line' | 'choice'; who?: string; text: string }

export interface GameState {
  schemaVersion: 1
  mode: Mode
  scene: string
  idx: number
  view: { bg: string; char: string | null; expr: string | null }
  calendar: { date: string; weekday: string; slot: string }
  routine: RoutineState | null
  stats: Stats
  emotions: { draco: DracoEmotions; hermione: NpcEmotions; ginny: NpcEmotions; luna: NpcEmotions; ron: NpcEmotions }
  flags: Record<string, boolean>
  knowledge: Record<string, boolean>
  choices: ChoiceRecord[]
  eventLog: string[]
  promises: string[]
  encCount: Record<string, number>
  sceneDelta: Record<string, number>
  backlog: BacklogEntry[]
  rng: number
  chapter: number
  endTitle?: string
}

export type TypingSpeed = 'slow' | 'normal' | 'fast' | 'instant'
export interface Settings {
  typing: TypingSpeed
  autoSpeed: 'slow' | 'normal' | 'fast'
  textSize: 1 | 2 | 3
  timer: 'normal' | 'relaxed' | 'off'
}
export const DEFAULT_SETTINGS: Settings = { typing: 'normal', autoSpeed: 'normal', textSize: 2, timer: 'normal' }
