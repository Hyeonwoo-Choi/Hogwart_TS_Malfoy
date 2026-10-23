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
/** near/close = 관찰자 쪽으로 다가옴(중간/클로즈업), back = 한 걸음 물러남, tilt = 고개를 갸웃. 이동은 CSS 변환이라 움직임 감소 설정에서는 정적 위치만 적용된다 */
export type Pose = 'stand' | 'arms' | 'turned' | 'slumped' | 'guard' | 'lean' | 'near' | 'close' | 'back' | 'tilt'
export type Gaze = 'front' | 'away' | 'down' | 'side'
export type Light = 'normal' | 'dim' | 'warm' | 'cold' | 'spot' | 'dark'
export type CueEffect = 'fade' | 'blackout' | 'flash' | 'shake' | 'zoom' | 'blur' | 'focus' | 'magic' | 'pause'

export interface LineNode { t: 'line'; who?: string; text: string; expr?: string; when?: string; pose?: Pose; gaze?: Gaze }
export interface ChoiceOption {
  key: string; text: string; if?: string; fx?: Effect[]; goto?: string; expr?: string
  /** 잠금 조건: if(노출 조건)는 참인데 req가 거짓이면 선택지는 보이되 잠긴다(실행 불가). 능력치·지식·관계·플래그를 조건식으로 조합한다 */
  req?: string
  /** 잠금 사유(자연어). 정확한 수치는 쓰지 않는다 */
  lock?: string
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
export interface ShowNode { t: 'show'; char: string | null; expr?: string; pose?: Pose; gaze?: Gaze; form?: Form; /** 수첩에 남길 관찰 맥락(해리가 본 행동) */ note?: string }
export interface DateNode { t: 'date'; date: string; weekday: string }
/** 연출 큐: 진행을 막지 않는 비대화형 노드. reduce-motion에서는 UI가 정적 대체를 쓴다. */
export interface CueNode { t: 'cue'; effect?: CueEffect; light?: Light; sound?: string }
/** CG 표시(id) / 해제(null). 해금 기록은 이미지 유무와 무관하게 저장된다. */
export interface CgNode { t: 'cg'; id: string | null }
export interface RoutineNode {
  t: 'routine'; days: { date: string; weekday: string }[]; night: boolean; then: string
  locations: string[]; encounters: Record<string, string[]>
  /** 히로인 고유 이벤트(스크립트): 히로인 → 장소 → 장면 풀(순서대로 한 번씩). 일정표상 그 시간·장소에 있는 히로인만 만난다 */
  meets?: Record<string, Record<string, string[]>>
  /** 드레이코가 없는 장소에서 순서대로 한 번씩 발생하는 조연 일상 이벤트 */
  friends?: Record<string, string[]>
}
/** 시간·장소 전환 연출(선택). 앱에서는 이 노드에서 멈추고 UI가 페이드 → 문구 → 페이드인 뒤 진행시킨다. 테스트·구버전은 건너뛴다. */
export interface TransNode { t: 'trans'; title: string; place?: string }
export interface EndNode { t: 'end' }
/** next가 있으면 챕터 종료 카드에서 "다음 챕터"로 이어갈 수 있다(없으면 아직 쓰이지 않은 이야기). */
export interface EndChapterNode { t: 'endChapter'; title: string; next?: string }
/** 관계 모델(V2): 히로인별 관계 단계·연애 상태·다자 연애 동의 상태. 수치(호감·신뢰)는 emotions에 있다. */
export type HeroineId = 'draco' | 'hermione' | 'ginny' | 'luna' | 'pansy'
export const HEROINES: HeroineId[] = ['draco', 'hermione', 'ginny', 'luna', 'pansy']
export type RomanceStatus = 'none' | 'open' | 'together' | 'declined' | 'ended'
export type PolyStatus = 'unasked' | 'asked' | 'accepted' | 'declined'
/** 비공략 인물(관계 단계·지식 단계만 가진다. 연애·다자 효과는 적용되지 않는다) */
export const NON_ROMANCE: string[] = ['ron']
/**
 * know: 드레이코의 변화·환영에 대한 이 인물의 지식 단계(0 모름 / 1 행동 변화만 관찰 / 2 이유를 의심 / 3 일부 사실 / 4 진실).
 * 선택 필드(이전 저장에는 없다 → 0으로 해석). 장면 효과로만 바뀐다. 도감·UI에는 표시하지 않는다.
 */
export interface Bond { stage: number; romance: RomanceStatus; poly: PolyStatus; seen: number; know?: number }
/** 최근 만남 기록(최대 8개). witnesses는 그 자리에 있었던(일정표상 같은 장소·시간) 다른 인물이다. */
export interface RecentMeet { who: string; day: number; witnesses: string[] }
export type Node =
  | LineNode | ChoiceNode | FxNode | IfNode | GotoNode | BgNode | ShowNode | DateNode | CueNode | CgNode
  | RoutineNode | EndNode | EndChapterNode | TransNode
export type Scenario = Record<string, Node[]>

export interface RoutineState {
  days: { date: string; weekday: string }[]; dayIdx: number; slotIdx: number; night: boolean
  then: string; locations: string[]; encounters: Record<string, string[]>; friends?: Record<string, string[]>
  meets?: Record<string, Record<string, string[]>>
  pendingDone: boolean; message: string | null
  /** 활동 장면이 끝난 뒤 이어서 재생할 이벤트 장면(캐릭터·랜덤 이벤트). 구버전 저장에는 없다 */
  after?: string
  /** 방금 한 활동의 시간 구간 [시작 칸, 길이]. 같은 자리에 있던 히로인(HERE_*) 판정용. 구버전 저장에는 없다 */
  span?: [number, number]
  /** 마지막으로 활동한 장소(지도의 현재 위치 표시용, 구버전 저장에는 없다) */
  at?: string
  /** 방금 일어난 뜻밖의 추가 시간 소모 안내(다음 활동 시 사라진다). 구버전 저장에는 없다 */
  notice?: string
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
  emotions: { draco: DracoEmotions; hermione: NpcEmotions; ginny: NpcEmotions; luna: NpcEmotions; ron: NpcEmotions; pansy: NpcEmotions }
  flags: Record<string, boolean>
  knowledge: Record<string, boolean>
  choices: ChoiceRecord[]
  eventLog: string[]
  promises: string[]
  encCount: Record<string, number>
  /** 장소별 누적 방문 수(반복 방문 문구 변화용) */
  visits: Record<string, number>
  /** 일상 랜덤 이벤트 기록(구버전 저장에는 없다): 본 횟수·직전 이벤트·마지막 이벤트 이후 활동 수 */
  rev?: { seen: Record<string, number>; last: string | null; since: number; salt?: number }
  /** 히로인별 관계 상태(V2). 구버전 저장은 불러올 때 기본값으로 보정한다 */
  bonds?: Record<string, Bond>
  /** 해리가 대사에서 마주친 세계관 용어 id(용어집 해금용, 선택 필드: 이전 저장은 대화 기록에서 보정한다) */
  terms?: string[]
  /** 학사 일정(게시판) 기록: 참가한 행사와 결과, 읽은 공지. 구버전 저장에는 없다 → 빈 기록 */
  board?: { done: Record<string, string>; read: string[] }
  /** 설명창을 열어 읽은 용어 id(terms의 부분집합 개념이 아니라 별도 열람 이력. 이전 저장에는 없다 → 빈 목록) */
  termsRead?: string[]
  /** 인물별로 해리가 마지막으로 본 표정·외형(수첩 초상화용, 구버전 저장에는 없다 → 빈 기록) */
  seen?: Record<string, { expr: string; form: string; note?: string }>
  /** 해리의 눈에 띈 행동(능력 사용 등)과 그것을 안 사람: 직접 목격(saw)·전언(heard, 출처·과장 여부). 구버전 저장에는 없다 → 빈 기록 */
  deeds?: Record<string, { day: number; saw: string[]; heard: Record<string, { from: string; exag: boolean }> }>
  /** 최근 만남(질투·반응 조건용, 최대 8개) */
  recent?: RecentMeet[]
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
