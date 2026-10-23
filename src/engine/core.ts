import { dayIndex, evalCond, nextRandom } from './cond'
import { DRACO_SCHEDULE, HEROINE_ORDER, activityMessage } from '../data/constants'
import type { RandomEvent } from '../data/randomEvents'
import { termsIn } from '../data/glossary'
import { presentAt } from './presence'
import { calendarEvent, eventsStartingIn, openEventsAt } from '../data/calendar'
import { type Incident } from '../data/incidents'
import { activitySceneFor } from '../data/activityScenes'
import { ACTIVITY_DEFS, PLACE_RULES, placeStatus, spanStatus } from '../data/places'
import {
  HEROINES, NON_ROMANCE, SLOTS, type Bond, type ChoiceNode, ChoiceOption, type PolyStatus, type RomanceStatus, type Form, type GameState, type Node, type RoutineNode, type Scenario,
} from './types'

let SCENARIO: Scenario = {}
export function setScenario(sc: Scenario) { SCENARIO = sc }
/** 장면 길이. 시나리오가 등록되지 않았으면 undefined(검사 생략), 등록됐는데 없는 장면이면 null */
export function sceneLength(id: string): number | null | undefined { if (!Object.keys(SCENARIO).length) return undefined; return SCENARIO[id]?.length ?? null }
export function getScenario() { return SCENARIO }

export const SCENE_DELTA_CAP = 12
export const BACKLOG_MAX = 200

/** 초기 능력치(BALANCE_REPORT.md). 6학년이므로 기본 마법·비행은 가능하며, 수치는 '게임 중 성장하는 역량'의 척도다. */
export const INITIAL_STATS = { int: 10, str: 14, magic: 16, insight: 9, social: 8, will: 13 }
/** 이 값 이상이면 1회 성장량이 1로 둔화된다. */
export const STAT_SOFT_CAP = 40

export function newState(startScene: string, seed = 20260901): GameState {
  const npc = (a: number, t: number, w: number) => ({ affinity: a, trust: t, wariness: w })
  return {
    schemaVersion: 2, mode: 'STORY', scene: startScene, idx: 0,
    view: { bg: 'black', char: null, expr: null, form: 'base', pose: 'stand', gaze: 'front', light: 'normal', cue: null, cg: null },
    calendar: { date: '09-01', weekday: '일', slot: '-' },
    routine: null,
    stats: { ...INITIAL_STATS },
    emotions: {
      draco: { affinity: 10, trust: 5, respect: 20, attraction: 0, jealousy: 15, wariness: 60, guilt: 0, dependence: 0, acceptance: 50, autonomy: 60, exposure: 0 },
      hermione: npc(40, 50, 0), ginny: npc(40, 40, 0), luna: npc(35, 40, 0), ron: npc(60, 60, 0), pansy: npc(5, 0, 40),
    },
    bonds: defaultBonds(), recent: [], terms: [], termsRead: [], seen: {}, deeds: {}, board: { done: {}, read: [] },
    flags: {}, knowledge: {}, choices: [], eventLog: [], promises: [], encCount: {}, visits: {}, sceneDelta: {},
    backlog: [], rng: seed, chapter: 1,
  }
}

/** 관계 초기 단계(0 서먹·경계 / 1 아는 사이 / 2 친구 / 3 가까운 사이). 연애 상태는 장면으로만 바뀐다 */
export function defaultBonds(): Record<string, Bond> {
  const st: Record<string, number> = { draco: 0, hermione: 2, ginny: 1, luna: 1, pansy: 0, ron: 2 }
  return Object.fromEntries([...HEROINES, ...NON_ROMANCE].map((h) => [h, { stage: st[h], romance: 'none' as RomanceStatus, poly: 'unasked' as PolyStatus, seen: 0, know: 0 }]))
}
const ROMANCE_SET = ['none', 'open', 'together', 'declined', 'ended']
const POLY_SET = ['unasked', 'asked', 'accepted', 'declined']
function bondOf(s: GameState, id: string): Bond {
  if (!HEROINES.includes(id as never) && !NON_ROMANCE.includes(id)) throw new Error(`알 수 없는 인물: ${id}`)
  s.bonds = s.bonds ?? defaultBonds()
  return (s.bonds[id] ??= { stage: 0, romance: 'none', poly: 'unasked', seen: 0, know: 0 })
}
/** 연애·다자 상태는 공략 가능 히로인에게만 적용한다(비공략 인물에는 오류로 드러낸다) */
function heroineBond(s: GameState, id: string): Bond {
  if (!HEROINES.includes(id as never)) throw new Error(`연애 상태를 가질 수 없는 인물: ${id}`)
  return bondOf(s, id)
}
/** 만남 기록: witnesses는 일정표상 같은 장소·시간에 있던 다른 인물(서사적 근거가 있을 때만 제3자가 반응한다) */
function recordMeet(s: GameState, who: string, witnesses: string[]) {
  const b = bondOf(s, who); b.seen++
  s.recent = [...(s.recent ?? []), { who, day: dayIndex(s.calendar.date), witnesses }].slice(-8)
}

/** 해리가 본 대사·선택에 나온 세계관 용어를 기록한다(용어집 해금). 같은 용어는 한 번만 */
export function noteTerms(s: GameState, ...texts: string[]) {
  const have = (s.terms = s.terms ?? [])
  for (const t of texts) for (const id of termsIn(t)) if (!have.includes(id)) have.push(id)
}

/** 용어 설명을 읽었다고 기록한다(등장 이력 terms와 별개). 이미 읽었으면 같은 상태를 돌려준다 */
export function readTerm(s: GameState, id: string): GameState {
  if (s.termsRead?.includes(id)) return s
  const n = clone(s); n.termsRead = [...(n.termsRead ?? []), id]; return n
}

export function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)) as T }

export function currentNode(s: GameState): Node | undefined { return SCENARIO[s.scene]?.[s.idx] }
export const lineId = (s: GameState) => `${s.scene}:${s.idx}`
export const canOpenMap = (s: GameState | null) => !!s && s.mode === 'ROUTINE'

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)) }

export function applyDelta(s: GameState, head: string, key: string, v: number) {
  if (head === 'stat') {
    const st = s.stats as unknown as Record<string, number>
    if (st[key] === undefined) throw new Error(`알 수 없는 능력치: ${key}`)
    const gain = v > 0 && st[key] >= STAT_SOFT_CAP ? Math.min(v, 1) : v
    st[key] = clamp(st[key] + gain)
    return
  }
  const emo = (s.emotions as unknown as Record<string, Record<string, number>>)[head]
  if (!emo || emo[key] === undefined) throw new Error(`알 수 없는 감정 변수: ${head}.${key}`)
  const k = `${head}.${key}`
  const used = s.sceneDelta[k] ?? 0
  const allowed = clamp(used + v, -SCENE_DELTA_CAP, SCENE_DELTA_CAP) - used // 한 장면 ±12 상한
  s.sceneDelta[k] = used + allowed
  emo[key] = clamp(emo[key] + allowed)
}

/** 사건으로 상태가 재정의될 때만 쓴다(예: 변화 직후 자기수용). 장면 변동 상한과 무관. */
function setValue(s: GameState, head: string, key: string, v: number) {
  const emo = (s.emotions as unknown as Record<string, Record<string, number>>)[head]
  if (!emo || emo[key] === undefined) throw new Error(`알 수 없는 감정 변수: ${head}.${key}`)
  emo[key] = clamp(v)
}

export function applyEffects(s: GameState, fx: string[] = []) {
  for (const e of fx) {
    let m: RegExpMatchArray | null
    if ((m = e.match(/^time\+(\d+)$/))) consumeTime(s, Number(m[1]))
    else if ((m = e.match(/^stage:([a-z]+)([+-])(\d)$/))) { const b = bondOf(s, m[1]); b.stage = Math.max(0, Math.min(3, b.stage + (m[2] === '-' ? -1 : 1) * Number(m[3]))) }
    else if ((m = e.match(/^stage:([a-z]+)=(\d)$/))) bondOf(s, m[1]).stage = Math.max(0, Math.min(3, Number(m[2])))
    else if ((m = e.match(/^romance:([a-z]+)=(\w+)$/))) { if (!ROMANCE_SET.includes(m[2])) throw new Error(`알 수 없는 연애 상태: ${m[2]}`); heroineBond(s, m[1]).romance = m[2] as RomanceStatus }
    else if ((m = e.match(/^poly:([a-z]+)=(\w+)$/))) { if (!POLY_SET.includes(m[2])) throw new Error(`알 수 없는 동의 상태: ${m[2]}`); heroineBond(s, m[1]).poly = m[2] as PolyStatus }
    // 지식 단계: know:<id>=N | know:<id>+N | know:<id>-N (0~4). 변신·환영에 대한 인물의 인지 상태(장면 효과로만 바뀐다)
    else if ((m = e.match(/^know:([a-z]+)=([0-4])$/))) bondOf(s, m[1]).know = Number(m[2])
    else if ((m = e.match(/^know:([a-z]+)([+-])([0-4])$/))) { const b = bondOf(s, m[1]); b.know = Math.max(0, Math.min(4, (b.know ?? 0) + (m[2] === '-' ? -1 : 1) * Number(m[3]))) }
    // 행동의 사회적 파급: deed:<id>@a,b = 해리의 행동을 a,b가 직접 봤다 / hear:<id>:<who>:<from>[:ex] = who가 from에게 전해 들었다(ex면 과장·왜곡)
    else if ((m = e.match(/^deed:([a-z0-9_]+)(?:@([a-z,]*))?$/))) { s.deeds = s.deeds ?? {}; const d = (s.deeds[m[1]] = s.deeds[m[1]] ?? { day: dayIndex(s.calendar.date), saw: [], heard: {} }); for (const w of (m[2] ?? '').split(',').filter(Boolean)) if (!d.saw.includes(w)) d.saw.push(w) }
    else if ((m = e.match(/^hear:([a-z0-9_]+):([a-z]+):([a-z]+)(:ex)?$/))) { s.deeds = s.deeds ?? {}; const d = (s.deeds[m[1]] = s.deeds[m[1]] ?? { day: dayIndex(s.calendar.date), saw: [], heard: {} }); if (!d.saw.includes(m[2]) && !d.heard[m[2]]) d.heard[m[2]] = { from: m[3], exag: !!m[4] } }
    else if ((m = e.match(/^meet:([a-z]+)(?:@([a-z,]*))?$/))) recordMeet(s, m[1], (m[2] ?? '').split(',').filter(Boolean))
    else if ((m = e.match(/^ev:([a-z0-9_]+)=(\w+)$/))) { s.board = s.board ?? { done: {}, read: [] }; s.board.done[m[1]] = m[2] } // 행사 결과 기록
    else if ((m = e.match(/^flag:(\w+)$/))) s.flags[m[1]] = true
    else if ((m = e.match(/^unflag:(\w+)$/))) delete s.flags[m[1]]
    else if ((m = e.match(/^kn:(\w+)$/))) s.knowledge[m[1]] = true
    else if ((m = e.match(/^log:(.*)$/))) s.eventLog.push(m[1])
    else if ((m = e.match(/^promise:(.*)$/))) s.promises.push(m[1])
    else if ((m = e.match(/^(\w+)\.(\w+)([+-])(\d+)$/))) applyDelta(s, m[1], m[2], (m[3] === '-' ? -1 : 1) * Number(m[4]))
    else if ((m = e.match(/^(\w+)\.(\w+)=(\d+)$/))) setValue(s, m[1], m[2], Number(m[3]))
    else throw new Error(`알 수 없는 효과: ${e}`)
  }
}

function jump(s: GameState, scene: string) {
  if (!SCENARIO[scene]) throw new Error(`존재하지 않는 장면: ${scene}`)
  s.scene = scene; s.idx = 0; s.sceneDelta = {}
  // 챕터 번호는 메인 장면(chN_*)에 진입할 때 갱신한다(만남·조연 이벤트 enc/fr 장면은 챕터를 바꾸지 않는다)
  const m = scene.match(/^(?:ch|v2c)(\d+)_/)
  if (m) s.chapter = Number(m[1])
}

/** 비대화형 노드를 실행하고 대화형 노드(line/choice/routine/end/endChapter)에서 멈춘다. s를 직접 변경. */
export function run(s: GameState): GameState {
  for (let guard = 0; guard < 500; guard++) {
    const node = currentNode(s)
    if (!node) throw new Error(`장면 끝을 넘어갔습니다: ${s.scene}:${s.idx}`)
    switch (node.t) {
      case 'fx': applyEffects(s, node.fx); s.idx++; break
      case 'if': {
        const target = evalCond(s, node.cond) ? node.then : node.else
        if (target) jump(s, target); else s.idx++
        break
      }
      case 'goto': jump(s, node.scene); break
      case 'bg': s.view.bg = node.id; s.idx++; break
      case 'show': {
        if (node.char !== s.view.char) { s.view.pose = 'stand'; s.view.gaze = 'front' }
        s.view.char = node.char
        if (node.expr !== undefined) s.view.expr = node.expr
        if (node.pose) s.view.pose = node.pose
        if (node.gaze) s.view.gaze = node.gaze
        s.view.form = node.form ?? defaultForm(s, node.char)
        if (node.char) s.seen = { ...(s.seen ?? {}), [node.char]: { expr: s.view.expr ?? 'calm', form: s.view.form, ...(node.note ? { note: node.note } : s.seen?.[node.char]?.note ? { note: s.seen[node.char].note } : {}) } }
        s.idx++; break
      }
      case 'cue':
        if (node.effect) s.view.cue = { effect: node.effect, n: (s.view.cue?.n ?? 0) + 1 }
        if (node.light) s.view.light = node.light
        s.idx++; break
      case 'cg': s.view.cg = node.id; s.idx++; break
      case 'date': s.calendar = { date: node.date, weekday: node.weekday, slot: '-' }; s.idx++; break
      case 'line':
        if (node.when && !evalCond(s, node.when)) { s.idx++; break }
        if (node.expr) s.view.expr = node.expr // 표정은 작가가 명시한 순간에만 변경
        if (node.pose) s.view.pose = node.pose
        if (node.gaze) s.view.gaze = node.gaze
        return s
      case 'choice': return s
      case 'trans': if (!TRANSITIONS) { s.idx++; break } return s
      case 'routine': startRoutine(s, node); return s
      case 'end': if (s.mode === 'EVENT') { returnFromEvent(s); return s } throw new Error('STORY에서 end 노드는 사용할 수 없습니다')
      case 'endChapter': s.mode = 'ENDED'; s.endTitle = node.title; return s
    }
  }
  throw new Error('run: 무한 루프 의심')
}

/** 외형 기본값: 변화 이후 드레이코는 공개 장면에서 환영(기존 외형)으로 보인다. 진짜 모습은 장면이 form:'true'로 명시할 때만. */
export function defaultForm(s: GameState, char: string | null): Form {
  if (char !== 'draco') return 'base'
  return s.flags.FLAG_DRACO_CHANGED ? 'illusion' : 'base'
}

/** 챕터 종료 카드(ENDED)에서 다음 챕터로 이어간다. next가 없으면 상태를 바꾸지 않는다. 저장된 ENDED 상태도 같은 방식으로 이어진다. */
export function continueChapter(s: GameState): GameState {
  const node = currentNode(s)
  if (s.mode !== 'ENDED' || node?.t !== 'endChapter' || !node.next) return s
  const n = clone(s)
  n.mode = 'STORY'; n.endTitle = undefined
  jump(n, node.next)
  return run(n)
}

export function startScene(s: GameState, scene: string): GameState {
  const n = clone(s); jump(n, scene); return run(n)
}

export function advance(s: GameState): GameState {
  const node = currentNode(s)
  if (node?.t === 'trans') { const t = clone(s); t.idx++; return run(t) }
  if (!node || node.t !== 'line') return s
  const n = clone(s)
  n.backlog.push({ kind: 'line', who: node.who, text: node.text })
  noteTerms(n, node.text)
  if (n.backlog.length > BACKLOG_MAX) n.backlog.splice(0, n.backlog.length - BACKLOG_MAX)
  n.idx++
  return run(n)
}

export function visibleOptions(s: GameState, node: ChoiceNode, timerOn: boolean) {
  return node.options.filter((o) => {
    if (o.hesitate && timerOn && node.timed) return false // 타이머가 켜져 있으면 "망설임"은 시간 초과로만 발생
    return (!o.if || evalCond(s, o.if)) && (!o.req || evalCond(s, o.req))
  })
}

/** 선택지 상태: 노출 조건(if)이 거짓이면 목록에 없고, 잠금 조건(req)이 거짓이면 잠김(locked). 실행 시점의 실제 상태로 판정한다 */
export function listOptions(s: GameState, node: ChoiceNode, timerOn: boolean): { opt: ChoiceOption; locked: boolean }[] {
  return node.options.filter((o) => !(o.hesitate && timerOn && node.timed) && (!o.if || evalCond(s, o.if))).map((opt) => ({ opt, locked: !!opt.req && !evalCond(s, opt.req) }))
}

export function choose(s: GameState, key: string): GameState {
  const node = currentNode(s)
  if (!node || node.t !== 'choice') return s
  const opt = node.options.find((o) => o.key === key)
  if (!opt) throw new Error(`선택지 없음: ${node.id}/${key}`)
  if ((opt.req && !evalCond(s, opt.req)) || (opt.if && !evalCond(s, opt.if))) return s // 잠긴·숨은 선택지는 실행되지 않는다(상태 불변)
  const n = clone(s)
  applyEffects(n, opt.fx)
  if (opt.expr) n.view.expr = opt.expr // 실제 클릭 이후에만 표정 변경
  n.choices.push({ id: node.id, option: key, scene: s.scene, date: s.calendar.date })
  n.backlog.push({ kind: 'choice', text: opt.text })
  noteTerms(n, node.prompt ?? '', opt.text)
  if (n.backlog.length > BACKLOG_MAX) n.backlog.splice(0, n.backlog.length - BACKLOG_MAX)
  if (opt.goto) jump(n, opt.goto); else n.idx++
  return run(n)
}

/* ---------- 일과 ---------- */
/**
 * 자유 일과는 "시간대 칸"을 소모하며 진행한다(하루 3칸: 오후1·오후2·저녁). 활동마다 소요 칸 수(dur)가 다르다.
 * 진행 커서는 dayIdx*3+slotIdx 하나이므로 구버전 저장(고정 슬롯 방식)도 그대로 이어진다.
 */
const PER_DAY = SLOTS.length
export const routineTotal = (r: { days: unknown[] }) => r.days.length * PER_DAY
export const routineCursor = (r: { dayIdx: number; slotIdx: number }) => r.dayIdx * PER_DAY + r.slotIdx
/** 남은 시간대 칸 수(절대 음수가 되지 않는다) */
export function remainingSlots(s: GameState): number {
  const r = s.routine; if (!r) return 0
  return Math.max(0, routineTotal(r) - routineCursor(r))
}
function startRoutine(s: GameState, node: RoutineNode) {
  s.mode = 'ROUTINE'
  s.encCount = {} // 만남 풀은 일과 구간마다 처음부터 소비한다
  s.routine = {
    days: node.days, dayIdx: 0, slotIdx: 0, night: node.night, then: node.then,
    locations: node.locations, encounters: node.encounters, friends: node.friends, meets: node.meets, pendingDone: false, message: null,
  }
  syncCalendar(s)
}
function syncCalendar(s: GameState) {
  const r = s.routine!
  const d = r.days[Math.min(r.dayIdx, r.days.length - 1)]
  s.calendar = { date: d.date, weekday: d.weekday, slot: SLOTS[Math.min(r.slotIdx, PER_DAY - 1)] }
}
function finishRoutine(s: GameState) {
  const then = s.routine!.then
  s.routine = null; s.mode = 'STORY'
  jump(s, then); run(s)
}
function returnFromEvent(s: GameState) {
  // 활동 장면 뒤에 이어질 이벤트 장면이 있으면 지도로 돌아가지 않고 그 장면을 재생한다
  const after = s.routine!.after
  if (after) { s.routine!.after = undefined; jump(s, after); run(s); return }
  s.mode = 'ROUTINE'
  if (s.routine!.pendingDone) finishRoutine(s)
}

/* ---------- 일상 랜덤 이벤트 ---------- */
let EVENTS: RandomEvent[] = []
/** 일상 랜덤 이벤트 목록을 등록한다(앱·이벤트 테스트에서만 호출 — 등록하지 않으면 이벤트는 발생하지 않는다). */
export function setRandomEvents(list: RandomEvent[]) { EVENTS = list }
/** 장면 전환 연출: 앱에서만 켠다(꺼져 있으면 trans 노드는 건너뛴다) */
let TRANSITIONS = false
export function setTransitions(on: boolean) { TRANSITIONS = on }
/** 활동 장면: 앱에서만 켠다(꺼져 있으면 활동은 이전처럼 지도에서 바로 끝나고, 이벤트만 장면으로 재생된다) */
let ACTIVITY_SCENES_ON = false
export function setActivityScenes(on: boolean) { ACTIVITY_SCENES_ON = on }
export const EVENT_CHANCE = { base: 0.5, medium: 0.7, long: 0.85, afterEvent: 0.4, rare: 0.04 }

/**
 * 이벤트로 인한 추가 시간 소모. 남은 시간을 넘지 않고(초과분은 버린다), 끝에 닿으면 일과 종료 대기(pendingDone)가 된다.
 * 필수 스토리(then)는 건너뛰지 않으며 이벤트 장면이 끝난 뒤 정상적으로 이어진다.
 */
function consumeTime(s: GameState, n: number) {
  const r = s.routine
  if (!r || n <= 0) return
  const left = Math.max(0, routineTotal(r) - routineCursor(r))
  const used = Math.min(n, left)
  if (used <= 0) return
  const t1 = routineCursor(r) + used
  if (t1 >= routineTotal(r)) { r.dayIdx = r.days.length - 1; r.slotIdx = PER_DAY - 1; r.pendingDone = true }
  else { r.dayIdx = Math.floor(t1 / PER_DAY); r.slotIdx = t1 % PER_DAY; syncCalendar(s) }
  const what = used === 1 ? '한 시간대' : used === 2 ? '두 시간대' : `${used}시간대`
  r.notice = r.pendingDone ? `뜻밖에 ${what}가 더 흘러, 자유 시간이 끝났다.` : `뜻밖에 ${what}가 더 흘렀다. (지금은 ${timeLabel(r, t1)})`
}

/** 활동 직후 일상 이벤트를 추첨한다. 같은 이벤트의 연속·과다 반복은 막고, 희귀 이벤트는 따로 낮은 확률로 굴린다. */
function drawRandomEvent(s: GameState, loc: string, actId: string, dur: number, startSlot: number): string | null {
  const rev = (s.rev ??= { seen: {}, last: null, since: 99 })
  const ctx = (e: RandomEvent) => {
    if (!e.places.includes(loc)) return false
    if (e.acts && !e.acts.includes(actId)) return false
    if (e.minDur && dur < e.minDur) return false
    if (e.slots && !e.slots.includes(startSlot)) return false
    if (e.chapters && (s.chapter < e.chapters[0] || s.chapter > e.chapters[1])) return false
    if (e.once && (rev.seen[e.id] ?? 0) > 0) return false
    if (e.id === rev.last) return false
    if (e.cond && !evalCond(s, e.cond)) return false
    return true
  }
  const base = dur >= 3 ? EVENT_CHANCE.long : dur === 2 ? EVENT_CHANCE.medium : EVENT_CHANCE.base
  const chance = rev.since === 0 ? base * EVENT_CHANCE.afterEvent : base
  const pool = EVENTS.filter(ctx)
  const rare = pool.filter((e) => e.type === 'rare'), common = pool.filter((e) => e.type !== 'rare')
  const pickFrom = (list: RandomEvent[]) => {
    if (!list.length) return null
    const w = list.map((e) => (e.weight ?? 1) / (1 + 1.5 * (rev.seen[e.id] ?? 0))) // 이미 본 이벤트일수록 덜 나온다
    let u = nextRandom(s) * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < list.length; i++) { u -= w[i]; if (u <= 0) return list[i].id }
    return list[list.length - 1].id
  }
  const hitRare = rare.length > 0 && nextRandom(s) < EVENT_CHANCE.rare
  const hit = nextRandom(s) < chance
  const id = hitRare ? pickFrom(rare) : hit ? pickFrom(common) : null
  if (!id) { rev.since++; return null }
  rev.seen[id] = (rev.seen[id] ?? 0) + 1; rev.last = id; rev.since = 0
  return id
}

export function dracoLocation(weekday: string, slotIdx: number) { return DRACO_SCHEDULE[weekday]?.[slotIdx] }

export interface ActionInfo { actId: string; name: string; desc: string; dur: number; ok: boolean; reason?: string; endsAt: string }
export interface PlaceInfo { id: string; ok: boolean; reason?: string }
const timeLabel = (r: { days: { date: string; weekday: string }[] }, t: number) => {
  const d = r.days[Math.floor(t / PER_DAY)]
  return d ? `${d.date.replace('-', '월 ')}일 ${d.weekday}요일 ${SLOTS[t % PER_DAY]}` : ''
}
/** 지금 이 장소를 이용할 수 있는가(출입 조건) */
export function placeInfo(s: GameState, loc: string): PlaceInfo {
  const r = s.routine
  if (!r || !PLACE_RULES[loc]) return { id: loc, ok: false, reason: '갈 수 없는 곳이다.' }
  const st = placeStatus(loc, r.slotIdx, r.days[Math.min(r.dayIdx, r.days.length - 1)].weekday)
  return { id: loc, ok: st.ok, reason: st.reason }
}
/** 이 장소의 활동 목록과 현재 가능 여부·사유·예상 종료 시점(UI·테스트 공용) */
export function listActions(s: GameState, loc: string): ActionInfo[] {
  const r = s.routine
  const rule = PLACE_RULES[loc]
  if (!r || !rule) return []
  const t0 = routineCursor(r), left = remainingSlots(s)
  const weekdays = r.days.map((d) => d.weekday)
  const pl = placeInfo(s, loc)
  const base = rule.acts.map((pa) => {
    const def = ACTIVITY_DEFS[pa.id]
    const end = t0 + def.dur
    let st: { ok: boolean; reason?: string } = pl.ok ? spanStatus(loc, pa.id, t0, def.dur, weekdays) : { ok: false, reason: pl.reason }
    if (st.ok && def.dur > left) st = { ok: false, reason: '남은 자유 시간이 모자란다.' }
    return {
      actId: pa.id, name: pa.name ?? def.name, desc: pa.desc ?? def.desc, dur: def.dur, ok: st.ok, reason: st.reason,
      endsAt: end >= routineTotal(r) ? '자유 시간이 끝난다' : timeLabel(r, end),
    }
  })
  // 지금 이 장소·날짜·시간대에 열려 있는 행사·약속(맨 앞에 둔다)
  const events = openEventsAt(s, loc).map((e): ActionInfo => {
    const end = t0 + e.dur
    const ok = pl.ok && e.dur <= left
    return {
      actId: 'ev:' + e.id, name: '★ ' + e.title, desc: e.notice, dur: e.dur, ok, reason: ok ? undefined : (pl.reason ?? '남은 자유 시간이 모자란다.'),
      endsAt: end >= routineTotal(r) ? '자유 시간이 끝난다' : timeLabel(r, end),
    }
  })
  return [...events, ...base]
}

/**
 * 이 활동을 고르면 시간이 흘러 놓치게 되는, 이미 성립한 약속(미참가, 활동 구간 안에 시작). 읽기 전용 — 상태를 바꾸지 않는다.
 * 약속 장소를 직접 고르는 참가(ev:)와 다른 장소를 골랐다는 사실만으로는 충돌이 아니다: 활동 시간 안에 약속 시각이 들어올 때만 충돌이다.
 */
export function appointmentConflicts(s: GameState, loc: string, actId: string): { id: string; title: string }[] {
  const r = s.routine; if (s.mode !== 'ROUTINE' || !r || actId.startsWith('ev:') || !r.locations.includes(loc)) return []
  const def = ACTIVITY_DEFS[actId]; const info = def && listActions(s, loc).find((a) => a.actId === actId)
  if (!def || !info || !info.ok) return []
  const t0 = routineCursor(r)
  return eventsStartingIn(s, t0, t0 + def.dur).filter((x) => x.e.kind === 'appointment').map((x) => ({ id: x.e.id, title: x.e.title }))
}

export function pickActivity(s: GameState, loc: string, actId: string): GameState {
  if (s.mode !== 'ROUTINE' || !s.routine) return s // 지도는 ROUTINE에서만 동작
  const r0 = s.routine
  if (!r0.locations.includes(loc)) return s
  if (actId.startsWith('ev:')) return pickEvent(s, loc, actId.slice(3))
  const def = ACTIVITY_DEFS[actId]
  if (!def) throw new Error(`알 수 없는 활동: ${actId}`)
  const info = listActions(s, loc).find((a) => a.actId === actId)
  if (!info || !info.ok) return s // 이 장소에 없는 활동·출입 조건·시간 부족은 무시한다(상태 불변)
  const n = clone(s)
  const r = n.routine!
  const t0 = routineCursor(r)
  for (const [k, v] of Object.entries(def.gains)) applyDelta(n, 'stat', k, v as number)
  // 활동 시간 동안 드레이코가 이 장소에 한 번이라도 있었는가(일정표 기준)
  let dracoHere = false
  for (let t = t0; t < t0 + def.dur; t++) if (dracoLocation(r.days[Math.floor(t / PER_DAY)].weekday, t % PER_DAY) === loc) dracoHere = true
  n.visits = n.visits ?? {}
  const visit = (n.visits[loc] ?? 0) + 1
  n.visits[loc] = visit
  // 결과는 서술로만 알린다: 능력치 이름·수치·성장 종류는 표시하지 않는다(BALANCE_REPORT 비공개 정책)
  r.message = activityMessage(loc, def.family, visit, r.slotIdx, def.dur)
  r.at = loc; r.notice = undefined; r.span = [t0, def.dur]
  const t1 = t0 + def.dur
  if (t1 >= routineTotal(r)) { r.dayIdx = r.days.length - 1; r.slotIdx = PER_DAY - 1; r.pendingDone = true }
  else { r.dayIdx = Math.floor(t1 / PER_DAY); r.slotIdx = t1 % PER_DAY }
  if (!r.pendingDone) syncCalendar(n)
  /** 이벤트 장면(ev)이 있으면 활동 장면 뒤에 잇고, 없으면 활동 장면만 재생한다. 활동 장면이 꺼져 있으면 예전처럼 동작한다 */
  const play = (ev: string | null): GameState => {
    if (!ACTIVITY_SCENES_ON) {
      if (ev) { n.mode = 'EVENT'; jump(n, ev); return run(n) }
      if (r.pendingDone) { finishRoutine(n); return n }
      return n
    }
    const key = `a:${actId}:${loc}`
    const count = n.encCount[key] ?? 0
    n.encCount[key] = count + 1
    r.after = ev ?? undefined
    n.mode = 'EVENT'
    n.view.bg = loc === 'classroom4' ? 'common' : loc; n.view.char = null; n.view.cg = null
    jump(n, activitySceneFor(actId, count, !!ev))
    return run(n)
  }
  const pool = r.encounters[loc] ?? []
  const used = n.encCount[loc] ?? 0
  // 히로인 고유 이벤트: 활동 구간 안에서 일정표상 그 장소에 있는 히로인 중, 아직 풀이 남은 사람(만난 횟수가 적은 순)
  const here = presentAt(r, loc, t0, def.dur)
  const cands = r.meets ? HEROINE_ORDER.filter((h) => here.includes(h) && (r.meets![h]?.[loc]?.length ?? 0) > (n.encCount[`h:${h}:${loc}`] ?? 0))
    .sort((a, b) => (bondOf(n, a).seen - bondOf(n, b).seen)) : []
  /* 같은 칸에 드레이코와 히로인이 함께 있으면 처음에는 드레이코 조우가 먼저다. 이미 드레이코를 그 히로인보다 더 자주 만났다면 이번에는 히로인이 나온다
     (드레이코의 조우 풀은 그대로 남고, 우선순위를 전역으로 바꾸지 않는다. 조우 풀이 소진된 뒤에는 드레이코가 있어도 히로인이 막히지 않는다) */
  const dracoMet = Object.keys(r.encounters).reduce((a, k) => a + (n.encCount[k] ?? 0), 0)
  const dracoFirst = dracoHere && used < pool.length && !(cands.length && dracoMet > bondOf(n, cands[0]).seen)
  if (dracoFirst) {
    n.encCount[loc] = used + 1
    return play(pool[used])
  }
  if (r.meets) {
    if (cands.length) {
      const h = cands[0]; const k = `h:${h}:${loc}`; const idx = n.encCount[k] ?? 0
      n.encCount[k] = idx + 1
      recordMeet(n, h, here.filter((x) => x !== h)) // 같은 자리에 있던 사람이 증인
      return play(r.meets[h][loc][idx])
    }
  }
  // 돌발 사건(세계 사건): 드레이코 만남·히로인 이벤트(메인 쪽)를 덮어쓰지 않고, 조연 일상·랜덤 이벤트보다 먼저. 날짜·장소·활동이 맞을 때 저장 상태에서 결정적으로 정해지는 확률로 일어난다
  const iid = INCIDENTS.length ? incidentFor(n, loc, actId, t0) : null
  if (iid) return play(iid)
  const fpool = r.friends?.[loc] ?? []
  const fused = n.encCount[`f:${loc}`] ?? 0
  if (!dracoHere && fused < fpool.length) {
    n.encCount[`f:${loc}`] = fused + 1
    return play(fpool[fused])
  }
  const rid = EVENTS.length ? drawRandomEvent(n, loc, actId, def.dur, t0 % PER_DAY) : null
  return play(rid)
}

/** 지도에서 고른 행사·약속 참가. 시간은 한 번만 쓰고 참가 기록을 먼저 남겨 재참가·중복 보상을 막는다. 캐릭터·랜덤 이벤트는 이어지지 않는다 */
function pickEvent(s: GameState, loc: string, evId: string): GameState {
  const e = calendarEvent(evId)
  const info = e && listActions(s, loc).find((a) => a.actId === 'ev:' + evId)
  if (!e || !info || !info.ok) return s
  const n = clone(s); const r = n.routine!
  const t0 = routineCursor(r)
  n.board = n.board ?? { done: {}, read: [] }
  n.board.done[e.id] = 'joined'
  n.visits = n.visits ?? {}; n.visits[loc] = (n.visits[loc] ?? 0) + 1
  r.message = e.title; r.at = loc; r.notice = undefined; r.span = [t0, e.dur]; r.after = undefined
  const t1 = t0 + e.dur
  if (t1 >= routineTotal(r)) { r.dayIdx = r.days.length - 1; r.slotIdx = PER_DAY - 1; r.pendingDone = true }
  else { r.dayIdx = Math.floor(t1 / PER_DAY); r.slotIdx = t1 % PER_DAY }
  if (!r.pendingDone) syncCalendar(n)
  n.mode = 'EVENT'
  n.view.bg = loc === 'classroom4' ? 'common' : loc; n.view.char = null; n.view.cg = null
  jump(n, e.scene)
  return run(n)
}

/* ---------- 돌발 사건(세계 사건) ---------- */
let INCIDENTS: Incident[] = []
/** 앱에서만 켠다(테스트 기본은 꺼짐). 사건 장면은 시나리오에 포함되어 있어야 한다 */
export function setIncidents(list: Incident[]) { INCIDENTS = list }
const hash01 = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) } return ((h >>> 0) % 10000) / 10000 }
/** 활동을 **시작한** 시각(t0)을 기준으로 날짜·시간대를 정한다. 활동이 끝난 뒤의 시각(다음 날로 넘어간 뒤)을 쓰면 날짜와 시간대가 어긋난다(TIME-01). */
function incidentFor(s: GameState, loc: string, actId: string, t0: number): string | null {
  const rev = (s.rev ??= { seen: {}, last: null, since: 99 })
  rev.salt = rev.salt ?? ((s.rng >>> 0) % 100000)
  const startSlot = t0 % PER_DAY
  const date = s.routine!.days[Math.min(Math.floor(t0 / PER_DAY), s.routine!.days.length - 1)].date
  for (const inc of INCIDENTS) {
    if (!inc.places.includes(loc) || (inc.acts && !inc.acts.includes(actId)) || !inc.dates.includes(date)) continue
    if (inc.slots && !inc.slots.includes(startSlot)) continue
    if ((rev.seen[inc.id] ?? 0) > 0) continue
    if (inc.cond && !evalCond(s, inc.cond)) continue
    // 같은 (게임, 사건, 날짜, 시간대, 장소)는 몇 번을 다시 불러와도 같은 결과다 → 저장·불러오기로 운을 바꿀 수 없다
    if (hash01(rev.salt + '|' + inc.id + '|' + date + '|' + startSlot + '|' + loc) < inc.chance) { rev.seen[inc.id] = 1; rev.last = inc.id; rev.since = 0; return inc.id }
  }
  return null
}

/**
 * 자유 시간 건너뛰기 계획. 목표는 일과 칸 번호(현재 칸 < 목표 ≤ 일과 끝). 규칙:
 *  - 과거·현재·일과 밖 목표는 거부한다(스토리가 허용한 미래 범위는 현재 일과 구간까지).
 *  - 건너뛰는 구간에 시작하는 **필수** 행사(required)가 있으면 그 시작 시각에서 멈춘다(그 칸에 도착, 넘지 않는다). 지금 칸이 필수 행사의 시작이면 건너뛸 수 없다.
 *  - 선택형 행사는 놓칠 수 있다는 목록(missable)만 돌려준다(놓친 행사는 게시판에 "놓침"으로 남는다).
 *  - 건너뛴 시간에는 활동이 없으므로 능력치·관계·돌발 사건·랜덤 이벤트·만남 풀이 소비되지 않는다(무한 휴식으로 얻는 이득이 없다).
 */
/** 이 자유 시간 뒤에 반드시 시작되는 필수 장면(엔진이 강제하는 스토리 경계)의 날짜·제목. 시간 건너뛰기는 이 경계를 넘지 못하고 그 앞에서 제어권을 돌려준다 */
export function nextBoundary(s: GameState): { scene: string; date?: string; weekday?: string; title?: string } | null {
  const r = s.routine; if (!r) return null
  const nodes = SCENARIO[r.then] ?? []
  const d = nodes.find((n) => n.t === 'date') as { date: string; weekday: string } | undefined
  const tr = nodes.find((n) => n.t === 'trans') as { title: string } | undefined
  return { scene: r.then, date: d?.date, weekday: d?.weekday, title: tr?.title }
}
export interface SkipPlan {
  ok: boolean; reason?: string; from: number; to: number; slots: number
  /** 필수 행사 때문에 멈출 칸(목표보다 이르다) */
  stopAt?: number; stopTitle?: string
  missable: { id: string; title: string; at: number }[]
  reachesEnd: boolean
}
export function skipPlan(s: GameState, target: number): SkipPlan {
  const base: SkipPlan = { ok: false, from: 0, to: target, slots: 0, missable: [], reachesEnd: false }
  const r = s.routine; if (s.mode !== 'ROUTINE' || !r) return { ...base, reason: '지금은 시간을 건너뛸 수 없다.' }
  const from = routineCursor(r), total = routineTotal(r)
  base.from = from
  if (!Number.isInteger(target) || target <= from) return { ...base, reason: '지나간 시각이나 지금 시각으로는 갈 수 없다.' }
  if (target > total) return { ...base, reason: '이 자유 시간 뒤로는 갈 수 없다. 그 사이에 반드시 거쳐야 하는 이야기가 있다.' }
  const inRange = eventsStartingIn(s, from, target)
  const required = inRange.find((x) => x.e.required)
  if (required && required.at <= from) return { ...base, reason: `지금은 건너뛸 수 없다: ${required.e.title}` }
  const stopAt = required?.at
  const dest = stopAt ?? target
  const skipped = inRange.filter((x) => !x.e.required && (stopAt === undefined || x.at < stopAt))
  return { ok: true, from, to: target, slots: dest - from, stopAt, stopTitle: required?.e.title, reachesEnd: dest >= total, missable: skipped.map((x) => ({ id: x.e.id, title: x.e.title, at: x.at })) }
}
/** 시간 건너뛰기 실행. 한 칸씩 진행하는 대신 목적지 칸으로 이동하되 계획의 규칙(필수 행사에서 멈춤)을 따른다. 상태는 복제본에서 바꾼다. */
export function skipTo(s: GameState, target: number): { state: GameState; plan: SkipPlan } {
  const plan = skipPlan(s, target)
  if (!plan.ok) return { state: s, plan }
  const n = clone(s); const r = n.routine!
  const dest = plan.stopAt ?? target
  r.notice = undefined; r.after = undefined; r.span = undefined
  r.message = plan.stopAt !== undefined ? `시간이 흘러 ${plan.stopTitle ?? '중요한 일정'} 시각에 닿았다.` : '시간이 흘렀다.'
  if (dest >= routineTotal(r)) { finishRoutine(n); return { state: n, plan } }
  r.dayIdx = Math.floor(dest / PER_DAY); r.slotIdx = dest % PER_DAY
  syncCalendar(n)
  return { state: n, plan }
}

/** 남은 자유 시간을 그냥 보내고 다음 스토리로 넘어간다(플레이어가 일부러 시간을 넘길 때). */
export function skipRoutine(s: GameState): GameState {
  if (s.mode !== 'ROUTINE' || !s.routine) return s
  const n = clone(s)
  finishRoutine(n)
  return n
}

/* ---------- 디버그 ---------- */
export function debugSet(s: GameState, path: string, value: number | boolean): GameState {
  const n = clone(s)
  if (typeof value === 'boolean') { if (value) n.flags[path] = true; else delete n.flags[path]; return n }
  const [head, key] = path.split('.')
  if (head === 'stat') (n.stats as unknown as Record<string, number>)[key] = clamp(value)
  else (n.emotions as unknown as Record<string, Record<string, number>>)[head][key] = clamp(value)
  return n
}
