export type Mode = 'TITLE' | 'STORY' | 'EVENT' | 'ROUTINE' | 'ENDED'
export const SLOTS = ['오후1', '오후2', '저녁'] as const
export type Slot = (typeof SLOTS)[number]

export interface DracoEmotions {
  affinity: number; trust: number; respect: number; attraction: number
  jealousy: number; wariness: number; guilt: number; dependence: number
  /** 별도 상태: 자기수용 / 자율성(스스로 통제한다는 감각) / 노출도(비밀이 드러난 정도) */
  acceptance: number; autonomy: number; exposure: number
}
export interface NpcEmotions { affinity: number; trust: number; wariness: number }
export interface Stats { int: number; str: number; magic: number; insight: number; social: number; will: number }

/** 'draco.trust+5' | 'draco.acceptance=10' | 'stat.int+2' | 'flag:X' | 'unflag:X' | 'kn:X' | 'log:text' | 'promise:X' */
export type Effect = string

/** 캐릭터 연출 큐. 숨겨진 감정 수치가 아니라 장면에서 관찰 가능한 행동을 작가가 지정한다. */
export type Form = 'base' | 'illusion' | 'true'
export type Pose = 'stand' | 'arms' | 'turned' | 'slumped' | 'guard' | 'lean'
export type Gaze = 'front' | 'away' | 'down' | 'side'
export type Light = 'normal' | 'dim' | 'warm' | 'cold' | 'spot' | 'dark'
export type CueEffect = 'fade' | 'blackout' | 'flash' | 'shake' | 'zoom' | 'blur' | 'focus' | 'magic' | 'pause'

export interface LineNode { t: 'line'; who?: string; text: string; expr?: string; when?: string; pose?: Pose; gaze?: Gaze }
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
export interface ShowNode { t: 'show'; char: string | null; expr?: string; pose?: Pose; gaze?: Gaze; form?: Form }
export interface DateNode { t: 'date'; date: string; weekday: string }
/** 연출 큐: 진행을 막지 않는 비대화형 노드. reduce-motion에서는 UI가 정적 대체를 쓴다. */
export interface CueNode { t: 'cue'; effect?: CueEffect; light?: Light; sound?: string }
/** CG 표시(id) / 해제(null). 해금 기록은 이미지 유무와 무관하게 저장된다. */
export interface CgNode { t: 'cg'; id: string | null }
export interface RoutineNode {
  t: 'routine'; days: { date: string; weekday: string }[]; night: boolean; then: string
  locations: string[]; encounters: Record<string, string[]>
  /** 드레이코가 없는 장소에서 순서대로 한 번씩 발생하는 조연 일상 이벤트 */
  friends?: Record<string, string[]>
}
export interface EndNode { t: 'end' }
export interface EndChapterNode { t: 'endChapter'; title: string }
export type Node =
  | LineNode | ChoiceNode | FxNode | IfNode | GotoNode | BgNode | ShowNode | DateNode | CueNode | CgNode
  | RoutineNode | EndNode | EndChapterNode
export type Scenario = Record<string, Node[]>

export interface RoutineState {
  days: { date: string; weekday: string }[]; dayIdx: number; slotIdx: number; night: boolean
  then: string; locations: string[]; encounters: Record<string, string[]>; friends?: Record<string, string[]>
  pendingDone: boolean; message: string | null
}
export interface ChoiceRecord { id: string; option: string; scene: string; date: string }
export interface BacklogEntry { kind: 'line' | 'choice'; who?: string; text: string }

export interface View {
  bg: string; char: string | null; expr: string | null
  form: Form; pose: Pose; gaze: Gaze; light: Light
  /** 마지막 연출 큐. n은 같은 효과의 재생을 구분하는 증가값 */
  cue: { effect: CueEffect; n: number } | null
  cg: string | null
}

export const SCHEMA_VERSION = 2
export interface GameState {
  schemaVersion: 2
  mode: Mode
  scene: string
  idx: number
  view: View
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
  /** 장소별 누적 방문 수(반복 방문 문구 변화용) */
  visits: Record<string, number>
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
