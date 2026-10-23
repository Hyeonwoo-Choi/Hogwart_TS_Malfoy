import { advance, choose, clone, continueChapter, currentNode, listActions, newState, pickActivity, run,
  setActivityScenes, setIncidents, setRandomEvents, setScenario, setTransitions, visibleOptions } from '../src/engine/core'
import { SCENARIO, START_SCENE } from '../src/data/scenario'
import { CALENDAR, calendarEvent } from '../src/data/calendar'
import { INCIDENTS } from '../src/data/incidents'
import { RANDOM_EVENTS } from '../src/data/randomEvents'
import type { GameState, Scenario } from '../src/engine/types'
import { blindHints, inspectCondition, storyContracts, type Finding } from './checks'
import { auditExposure, auditTimeline, notebookSnapshot, type Exposure } from './contracts'
import { preference, PROFILES, randomFor, stateSummary, type Action, type Profile } from './profiles'

export interface Options {
  profile: Profile; seed: number; chapter?: number; maxSteps?: number; timer?: boolean
  scenario?: Scenario; start?: string; events?: boolean
  /** Explicit diagnostic probes only. Results never count as natural reachability. */
  initialState?: GameState; replay?: Action[]; overrides?: Record<string, string>
}
export interface Decision {
  action: Action; before: ReturnType<typeof stateSummary>; after: ReturnType<typeof stateSummary>
  visible?: string[]; conditions?: ReturnType<typeof inspectCondition>[]; declaredEffects?: string[]
}
export interface RunResult {
  profile: Profile; seed: number; provenance: 'natural' | 'forced'; completed: boolean; steps: number
  scenes: string[]; nodes: string[]; choices: string[]; events: string[]; findings: Finding[]
  notebookUpdates: {scene:string;idx:number;date:string;knowledge:string[];content:string}[]; exposures: Exposure[]; policy: Record<string, string>; decisions: Decision[]; checkpoints: Record<string, GameState>; final: GameState; failureKind?: 'policy'|'engine'; failure?: string
}

/** Single-threaded: the production engine registers scenario/event tables in module globals. */
export function simulate(options: Options): RunResult {
  const { profile, seed } = options
  const scenario = options.scenario ?? SCENARIO
  const seen = new Set<string>(), nodes = new Set<string>()
  const accesses: { scene: string; idx: number }[] = []
  // Record engine reads, including automatic if/goto/fx-only scenes that run() crosses in one call.
  const observed: Scenario = Object.fromEntries(Object.entries(scenario).map(([id, list]) => [id, new Proxy(list, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && /^\d+$/.test(prop) && Number(prop) < target.length) {
        seen.add(id); nodes.add(`${id}:${prop}`)
        accesses.push({ scene: id, idx: Number(prop) })
      }
      return Reflect.get(target, prop, receiver)
    },
  })]))
  setScenario(observed); setTransitions(true)
  setActivityScenes(options.events !== false); setRandomEvents(options.events === false ? [] : RANDOM_EVENTS)
  setIncidents(options.events === false ? [] : INCIDENTS)
  let s = options.initialState ? clone(options.initialState) : newState(options.start ?? START_SCENE, seed)
  const result: RunResult = { profile, seed, provenance: options.initialState ? 'forced' : 'natural', completed: false, steps: 0,
    scenes: [], nodes: [], choices: [], events: [], findings: [], notebookUpdates: [], exposures: [], policy: options.overrides ?? {}, decisions: [], checkpoints: {}, final: s }
  const random = randomFor(seed ^ (Object.keys(PROFILES).indexOf(profile) + 1) * 7919)
  const context: string[] = []
  let previousNotebook = ''
  let previousCalendar = { ...s.calendar }; const firstVisits: Record<string, string> = {}
  let replayIdx = 0
  const finding = (code: string, detail: string, level: Finding['level'] = 'error') => result.findings.push({ code, detail, level, scene: s.scene })
  const execute = (action: Action, operation: () => GameState, extra: Partial<Decision> = {}) => {
    if (options.replay) {
      const expected = options.replay[replayIdx++]
      if (JSON.stringify(expected) !== JSON.stringify(action)) throw new Error(`재현 경로 불일치 #${replayIdx}: ${JSON.stringify(expected)} / ${JSON.stringify(action)}`)
    }
    const before = clone(stateSummary(s)), previous = s, untouched = JSON.stringify(s), traceStart = accesses.length
    s = operation()
    if (JSON.stringify(previous) !== untouched) finding('INPUT_MUTATED', '엔진 호출이 이전 상태를 직접 변경함')
    result.decisions.push({ action, before, after: clone(stateSummary(s)), ...extra })
    result.findings.push(...storyContracts(s))
    // Candidate only: final checkpoints can include later effects. Record enough evidence for review.
    if (action.kind === 'choice') for (const at of accesses.slice(traceStart)) {
      const n = scenario[at.scene]?.[at.idx]
      if (n?.t !== 'if') continue
      const changed = (extra.declaredEffects ?? []).map(e => e.match(/^(\w+\.\w+)[+-]/)?.[1]).filter((x): x is string => !!x)
      if (!changed.some(v => n.cond.includes(v))) continue
      const pre = inspectCondition(previous, n.cond), post = inspectCondition(s, n.cond)
      if (pre.result === false && post.result === true) finding('CHOICE_EFFECT_THRESHOLD',
        `${at.scene}:${at.idx} ${n.cond}; 선택 전=${JSON.stringify(pre.values)}, 이후=${JSON.stringify(post.values)}. 보상 선반영 여부 검토(후속 fx 가능).`, 'suspect')
    }
  }
  try {
    if (!options.initialState || s.mode !== 'ROUTINE') s = run(s)
    previousCalendar = { ...s.calendar } // injected entry is a diagnostic boundary, not an in-game time transition
    for (let step = 0; step < (options.maxSteps ?? 16000); step++) {
      result.steps = step + 1
      if (!result.checkpoints[s.scene]) result.checkpoints[s.scene] = clone(s)
      const node = currentNode(s)
      result.findings.push(...auditTimeline(previousCalendar, s.calendar, s.scene))
      previousCalendar = { ...s.calendar }
      if (!firstVisits[s.scene]) firstVisits[s.scene] = s.calendar.date
      if (node?.t === 'line' || node?.t === 'choice') {
        const ex: Exposure = { scene: s.scene, idx: s.idx, date: s.calendar.date, text: node.t === 'line' ? node.text : [node.prompt, ...visibleOptions(s, node, options.timer ?? true).map(o=>o.text)].join(' '), knowledge: {...s.knowledge}, flags: {...s.flags} }
        const book=notebookSnapshot(s);if(book!==previousNotebook){result.notebookUpdates.push({scene:s.scene,idx:s.idx,date:s.calendar.date,knowledge:Object.keys(s.knowledge).filter(k=>s.knowledge[k]),content:book});previousNotebook=book}
        result.exposures.push(ex); result.findings.push(...auditExposure(s, ex, firstVisits))
      }
      if (s.mode === 'ENDED') {
        if (s.chapter >= (options.chapter ?? 2)) { result.completed = true; break }
        if (node?.t !== 'endChapter' || !node.next) throw new Error('목표 챕터 전에 다음 연결 없는 종료')
        const prev = s
        execute({ kind: 'continue', scene: s.scene, idx: s.idx }, () => continueChapter(prev)); continue
      }
      if (s.mode === 'ROUTINE') {
        const def = PROFILES[profile]
        const all = s.routine!.locations.flatMap(loc => listActions(s, loc).filter(a => a.ok).map(a => ({ loc, act: a.actId })))
        if (!all.length) throw new Error('사용 가능한 활동 없음')
        const availableEvents = all.filter(a => a.act.startsWith('ev:'))
        const ordinary = all.filter(a => !a.act.startsWith('ev:'))
        let pool = availableEvents.length && random() < def.attend ? availableEvents : ordinary.length ? ordinary : all
        // Seeded exploration prevents a preference from permanently excluding other locations.
        if (random() < 0.65) {
          const preferred = pool.filter(a => (def.places as readonly string[]).includes(a.loc) || (def.activities as readonly string[]).includes(a.act))
          if (preferred.length) pool = preferred
        }
        const nextReplay = options.replay?.[replayIdx]
        const selected = nextReplay ? all.find(a => a.loc === nextReplay.loc && a.act === nextReplay.act) : pool[Math.floor(random() * pool.length)]
        if (!selected) throw new Error('재현 활동을 현재 엔진에서 선택할 수 없음')
        const { loc, act } = selected
        const previous = s, beforeDone = { ...(s.board?.done ?? {}) }, beforeRev = { ...(s.rev?.seen ?? {}) }
        const start = { ...s.calendar }
        if (act.startsWith('ev:')) {
          const e = calendarEvent(act.slice(3))
          if (!e || e.date !== start.date || !e.slots.includes(s.routine!.slotIdx) || e.place !== loc) finding('EVENT_SCHEDULE', `일정 불일치: ${act} ${JSON.stringify(start)}`)
          if (beforeDone[act.slice(3)]) finding('DUPLICATE_EVENT', act)
        }
        execute({ kind: 'activity', scene: s.scene, idx: s.idx, loc, act }, () => pickActivity(previous, loc, act))
        for (const inc of INCIDENTS) if ((s.rev?.seen[inc.id] ?? 0) > (beforeRev[inc.id] ?? 0)) {
          if (!inc.dates.includes(start.date)) finding('INCIDENT_TIME_BASIS', `${inc.id}: 활동 시작 ${start.date}/${start.slot}, 판정 후 ${s.calendar.date}/${s.calendar.slot}`, 'suspect')
        }
        for (const [id, count] of Object.entries(s.rev?.seen ?? {})) {
          const once = INCIDENTS.some(e => e.id === id) || RANDOM_EVENTS.some(e => e.id === id && e.once)
          if (once && count > 1) finding('DUPLICATE_ONCE_EVENT', `${id}: ${count}`)
        }
      } else if (node?.t === 'line') {
        context.push([node.who, node.text].filter(Boolean).join(': ')); if (context.length > 12) context.shift()
        s = advance(s)
      } else if (node?.t === 'trans') s = advance(s)
      else if (node?.t === 'choice') {
        const visible = visibleOptions(s, node, options.timer ?? true)
        if (!visible.length) throw new Error(`노출 선택지 없음: ${node.id}`)
        const proposed = preference(profile, seed, node.id, visible.map(o => o.key), random)
        const key = options.replay?.[replayIdx]?.key ?? options.overrides?.[node.id] ?? proposed
        const selected = visible.find(o => o.key === key)
        if (!selected) { const cond=node.options.find(o=>o.key===key)?.if; throw new Error(`${options.overrides?.[node.id]&&!options.replay?'정책':'재현'} 선택지가 숨겨짐: ${node.id}/${key} ${cond?JSON.stringify(inspectCondition(s,cond)):''}`) }
        const prev = s, count = s.choices.length
        result.findings.push(...blindHints(node.prompt ?? '', visible.map(o => o.text), context, s.scene))
        execute({ kind: 'choice', scene: s.scene, idx: s.idx, key }, () => choose(prev, key), {
          visible: visible.map(o => o.key), declaredEffects: selected.fx ?? [],
          conditions: node.options.filter(o => o.if).map(o => inspectCondition(prev, o.if!)),
        })
        if (s.choices.length !== count + 1 || s.choices.at(-1)?.id !== node.id || s.choices.at(-1)?.option !== key) finding('CHOICE_RECORD', node.id)
        result.choices.push(`${prev.scene}:${node.id}:${key}`)
      } else throw new Error(`지원하지 않는 정지 상태 ${s.scene}:${s.idx}/${node?.t}`)
      if (step === (options.maxSteps ?? 16000) - 1) throw new Error('최대 진행 횟수 초과')
    }
    if (options.replay && replayIdx !== options.replay.length) throw new Error('재현 경로에 소비하지 않은 동작이 있음')
  } catch (e) { result.failure = String(e); result.failureKind=result.failure.includes('정책 선택지가 숨겨짐')?'policy':'engine'; finding(result.failureKind==='policy'?'POLICY_OPTION_UNAVAILABLE':'PLAY_FAILURE', result.failure, result.failureKind==='policy'?'suspect':'error') }
  finally {
    result.scenes = [...seen]; result.nodes = [...nodes]; result.final = s
    result.events = [...new Set([...Object.keys(s.board?.done ?? {}), ...Object.keys(s.rev?.seen ?? {})])]
    setScenario(SCENARIO); setTransitions(false); setActivityScenes(false); setRandomEvents([]); setIncidents([])
  }
  return result
}

export const eventSceneIds = () => new Set([...CALENDAR.map(e => e.scene), ...INCIDENTS.map(e => e.id), ...RANDOM_EVENTS.map(e => e.id)])
