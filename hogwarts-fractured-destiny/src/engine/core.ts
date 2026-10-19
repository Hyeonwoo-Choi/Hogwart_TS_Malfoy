import { evalCond } from './cond'
import { ACTIVITIES, DRACO_SCHEDULE, STAT_KO } from '../data/constants'
import {
  SLOTS, type ChoiceNode, type GameState, type Node, type RoutineNode, type Scenario,
} from './types'

let SCENARIO: Scenario = {}
export function setScenario(sc: Scenario) { SCENARIO = sc }
export function getScenario() { return SCENARIO }

export const SCENE_DELTA_CAP = 12
export const BACKLOG_MAX = 200

export function newState(startScene: string, seed = 20260901): GameState {
  const npc = (a: number, t: number, w: number) => ({ affinity: a, trust: t, wariness: w })
  return {
    schemaVersion: 1, mode: 'STORY', scene: startScene, idx: 0,
    view: { bg: 'black', char: null, expr: null },
    calendar: { date: '09-01', weekday: '일', slot: '-' },
    routine: null,
    stats: { int: 40, str: 40, magic: 45, insight: 35, social: 35, will: 40 },
    emotions: {
      draco: { affinity: 10, trust: 5, respect: 20, attraction: 0, jealousy: 15, wariness: 60, guilt: 0, dependence: 0 },
      hermione: npc(40, 50, 0), ginny: npc(40, 40, 0), luna: npc(35, 40, 0), ron: npc(60, 60, 0),
    },
    flags: {}, knowledge: {}, choices: [], eventLog: [], promises: [], encCount: {}, sceneDelta: {},
    backlog: [], rng: seed, chapter: 1,
  }
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
    // 70 이상은 성장 둔화(+1)
    const gain = v > 0 && st[key] >= 70 ? 1 : v
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

export function applyEffects(s: GameState, fx: string[] = []) {
  for (const e of fx) {
    let m: RegExpMatchArray | null
    if ((m = e.match(/^flag:(\w+)$/))) s.flags[m[1]] = true
    else if ((m = e.match(/^unflag:(\w+)$/))) delete s.flags[m[1]]
    else if ((m = e.match(/^kn:(\w+)$/))) s.knowledge[m[1]] = true
    else if ((m = e.match(/^log:(.*)$/))) s.eventLog.push(m[1])
    else if ((m = e.match(/^promise:(.*)$/))) s.promises.push(m[1])
    else if ((m = e.match(/^(\w+)\.(\w+)([+-])(\d+)$/))) applyDelta(s, m[1], m[2], (m[3] === '-' ? -1 : 1) * Number(m[4]))
    else throw new Error(`알 수 없는 효과: ${e}`)
  }
}

function jump(s: GameState, scene: string) {
  if (!SCENARIO[scene]) throw new Error(`존재하지 않는 장면: ${scene}`)
  s.scene = scene; s.idx = 0; s.sceneDelta = {}
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
      case 'show': s.view.char = node.char; if (node.expr !== undefined) s.view.expr = node.expr; s.idx++; break
      case 'date': s.calendar = { date: node.date, weekday: node.weekday, slot: '-' }; s.idx++; break
      case 'line':
        if (node.when && !evalCond(s, node.when)) { s.idx++; break }
        if (node.expr) s.view.expr = node.expr // 표정은 작가가 명시한 순간에만 변경
        return s
      case 'choice': return s
      case 'routine': startRoutine(s, node); return s
      case 'end': if (s.mode === 'EVENT') { returnFromEvent(s); return s } throw new Error('STORY에서 end 노드는 사용할 수 없습니다')
      case 'endChapter': s.mode = 'ENDED'; s.endTitle = node.title; return s
    }
  }
  throw new Error('run: 무한 루프 의심')
}

export function startScene(s: GameState, scene: string): GameState {
  const n = clone(s); jump(n, scene); return run(n)
}

export function advance(s: GameState): GameState {
  const node = currentNode(s)
  if (!node || node.t !== 'line') return s
  const n = clone(s)
  n.backlog.push({ kind: 'line', who: node.who, text: node.text })
  if (n.backlog.length > BACKLOG_MAX) n.backlog.splice(0, n.backlog.length - BACKLOG_MAX)
  n.idx++
  return run(n)
}

export function visibleOptions(s: GameState, node: ChoiceNode, timerOn: boolean) {
  return node.options.filter((o) => {
    if (o.hesitate && timerOn && node.timed) return false // 타이머가 켜져 있으면 "망설임"은 시간 초과로만 발생
    return !o.if || evalCond(s, o.if)
  })
}

export function choose(s: GameState, key: string): GameState {
  const node = currentNode(s)
  if (!node || node.t !== 'choice') return s
  const opt = node.options.find((o) => o.key === key)
  if (!opt) throw new Error(`선택지 없음: ${node.id}/${key}`)
  const n = clone(s)
  applyEffects(n, opt.fx)
  if (opt.expr) n.view.expr = opt.expr // 실제 클릭 이후에만 표정 변경
  n.choices.push({ id: node.id, option: key, scene: s.scene, date: s.calendar.date })
  n.backlog.push({ kind: 'choice', text: opt.text })
  if (n.backlog.length > BACKLOG_MAX) n.backlog.splice(0, n.backlog.length - BACKLOG_MAX)
  if (opt.goto) jump(n, opt.goto); else n.idx++
  return run(n)
}

/* ---------- 일과 ---------- */
function startRoutine(s: GameState, node: RoutineNode) {
  s.mode = 'ROUTINE'
  s.encCount = {} // 만남 풀은 일과 구간마다 처음부터 소비한다
  s.routine = {
    days: node.days, dayIdx: 0, slotIdx: 0, night: node.night, then: node.then,
    locations: node.locations, encounters: node.encounters, friends: node.friends, pendingDone: false, message: null,
  }
  syncCalendar(s)
}
function syncCalendar(s: GameState) {
  const r = s.routine!
  const d = r.days[Math.min(r.dayIdx, r.days.length - 1)]
  s.calendar = { date: d.date, weekday: d.weekday, slot: SLOTS[Math.min(r.slotIdx, 2)] }
}
function finishRoutine(s: GameState) {
  const then = s.routine!.then
  s.routine = null; s.mode = 'STORY'
  jump(s, then); run(s)
}
function returnFromEvent(s: GameState) {
  s.mode = 'ROUTINE'
  if (s.routine!.pendingDone) finishRoutine(s)
}

/** 받침 유무에 따른 목적격 조사 */
const eulReul = (w: string) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '을' : '를')

export function dracoLocation(weekday: string, slotIdx: number) { return DRACO_SCHEDULE[weekday]?.[slotIdx] }

export function pickActivity(s: GameState, loc: string, actId: string): GameState {
  if (s.mode !== 'ROUTINE' || !s.routine) return s // 지도는 ROUTINE에서만 동작
  const r0 = s.routine
  if (!r0.locations.includes(loc)) return s
  const act = ACTIVITIES.find((a) => a.id === actId)
  if (!act) throw new Error(`알 수 없는 활동: ${actId}`)
  const n = clone(s)
  const r = n.routine!
  const before = { ...n.stats }
  for (const [k, v] of Object.entries(act.gains)) applyDelta(n, 'stat', k, v as number)
  const gained = Object.entries(act.gains)
    .map(([k, v]) => ({ k, d: (n.stats as unknown as Record<string, number>)[k] - (before as unknown as Record<string, number>)[k], v }))
  const dracoHere = dracoLocation(n.calendar.weekday, r.slotIdx) === loc
  r.message = `${act.name}${eulReul(act.name)} 마쳤다. (${gained.map((g) => `${STAT_KO[g.k] ?? g.k}+${g.d}`).join(', ')})`
  r.slotIdx++
  if (r.slotIdx >= SLOTS.length) {
    r.slotIdx = 0; r.dayIdx++
    if (r.dayIdx >= r.days.length) { r.dayIdx = r.days.length - 1; r.pendingDone = true }
  }
  if (!r.pendingDone) syncCalendar(n)
  const pool = r.encounters[loc] ?? []
  const used = n.encCount[loc] ?? 0
  if (dracoHere && used < pool.length) {
    n.encCount[loc] = used + 1
    n.mode = 'EVENT'
    jump(n, pool[used])
    return run(n)
  }
  const fpool = r.friends?.[loc] ?? []
  const fused = n.encCount[`f:${loc}`] ?? 0
  if (!dracoHere && fused < fpool.length) {
    n.encCount[`f:${loc}`] = fused + 1
    n.mode = 'EVENT'
    jump(n, fpool[fused])
    return run(n)
  }
  if (r.pendingDone) { finishRoutine(n); return n }
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
