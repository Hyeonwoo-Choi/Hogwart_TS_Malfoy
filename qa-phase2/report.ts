import { SCENARIO, START_SCENE } from '../src/data/scenario'
import { CALENDAR } from '../src/data/calendar'
import { INCIDENTS } from '../src/data/incidents'
import { RANDOM_EVENTS } from '../src/data/randomEvents'
import { inspectCondition } from './checks'
import { PROFILE_IDS, stateSummary } from './profiles'
import type { RunResult } from './simulate'
import type { GameState, Scenario } from '../src/engine/types'

/** Structural candidates only: ignoring a condition never proves natural reachability. */
export function inventory(scenario: Scenario, start: string, chapter: number) {
  const seen = new Set<string>(), pending = [start]
  while (pending.length) {
    const id = pending.pop()!
    const ch = id.match(/^(?:ch|v2c)(\d+)_/)
    if (seen.has(id) || !scenario[id] || (ch && Number(ch[1]) > chapter)) continue
    seen.add(id)
    for (const n of scenario[id]) {
      if (n.t === 'goto') pending.push(n.scene)
      if (n.t === 'if') { pending.push(n.then); if (n.else) pending.push(n.else) }
      if (n.t === 'choice') for (const o of n.options) if (o.goto) pending.push(o.goto)
      if (n.t === 'endChapter' && n.next) pending.push(n.next)
      if (n.t === 'routine') {
        pending.push(n.then, ...Object.values(n.encounters).flat(), ...Object.values(n.friends ?? {}).flat())
        for (const group of Object.values(n.meets ?? {})) pending.push(...Object.values(group).flat())
        // Global event registries are potential dispatches, not evidence of matching a routine.
        if (scenario === SCENARIO) pending.push(...CALENDAR.map(e => e.scene), ...INCIDENTS.map(e => e.id), ...RANDOM_EVENTS.map(e => e.id))
      }
    }
  }
  return seen
}
export function summarize(runs: RunResult[], options: { scenario?: Scenario; start?: string; chapter?: number } = {}) {
  const scenario = options.scenario ?? SCENARIO, chapter = options.chapter ?? 2
  const natural = runs.filter(r => r.provenance === 'natural'), forced = runs.filter(r => r.provenance === 'forced')
  const candidates = inventory(scenario, options.start ?? START_SCENE, chapter)
  const counts = (ids: string[], list = natural) => Object.fromEntries(ids.map(id => [id, list.filter(r => r.scenes.includes(id)).length]))
  const visited = new Set(natural.flatMap(r => r.scenes))
  const checkpoints = natural.flatMap(r => Object.entries(r.checkpoints).map(([scene, state]) => ({ profile: r.profile, seed: r.seed, scene, state })))
  const conditions = [...candidates].filter(id => !visited.has(id)).map(target => {
    const incoming: { source: string; condition?: string; kind: string; samples: unknown[] }[] = []
    const add = (source: string, kind: string, condition?: string) => {
      // At the source: exact exposed checkpoints when available. Otherwise same-chapter samples are diagnostic only.
      const exact = checkpoints.filter(c => c.scene === source)
      const sourceChapter = Number(source.match(/^(?:ch|v2c)(\d+)_/)?.[1] ?? 0)
      const approximate = checkpoints.filter(c => c.state.chapter === sourceChapter)
      const pool = exact.length ? exact : approximate
      const samples = condition ? pool.map(c => ({ profile: c.profile, seed: c.seed, checkpoint: c.scene,
        timing: 'interactive checkpoint; automatic effects before the actual predicate may differ', ...inspectCondition(c.state, condition) })) : []
      // Keep representatives of both true and false, not only the first failed seed.
      const unique = new Map<string, unknown>()
      for (const sample of samples) { const key = JSON.stringify([sample.result, sample.values]); if (!unique.has(key)) unique.set(key, sample) }
      incoming.push({ source, kind, condition, samples: [...unique.values()].slice(0, 8) })
    }
    for (const source of candidates) for (const n of scenario[source]) {
      if (n.t === 'if') { if (n.then === target) add(source, 'if', n.cond); if (n.else === target) add(source, 'else', `!(${n.cond})`) }
      if (n.t === 'goto' && n.scene === target) add(source, 'goto')
      if (n.t === 'endChapter' && n.next === target) add(source, 'chapter')
      if (n.t === 'choice') for (const o of n.options) if (o.goto === target) add(source, `choice ${n.id}/${o.key}`, o.if)
      if (n.t === 'routine') {
        if (n.then === target) add(source, 'routine completion')
        if (JSON.stringify([n.encounters, n.friends, n.meets]).includes(`"${target}"`)) add(source, 'scheduled encounter: location/time/pool priority required')
      }
    }
    if (scenario === SCENARIO) {
      for (const e of CALENDAR.filter(e => e.scene === target)) incoming.push({ source: 'calendar', kind: `${e.id} ${e.date} slots=${e.slots} place=${e.place}`, condition: e.cond, samples: [] })
      for (const e of [...INCIDENTS, ...RANDOM_EVENTS].filter(e => e.id === target)) incoming.push({ source: 'event registry', kind: JSON.stringify(e), condition: e.cond, samples: [] })
    }
    return { target, verdict: '미관측 — 논리적 불가능 판정 아님', incoming }
  })
  const choiceInventory = [...candidates].flatMap(scene => scenario[scene].flatMap(n => n.t === 'choice' ? n.options.map(o => `${scene}:${n.id}:${o.key}`) : []))
  const choiceCounts = Object.fromEntries(choiceInventory.map(id => [id, natural.filter(r => r.choices.includes(id)).length]))
  const eventDefs = scenario === SCENARIO ? [...CALENDAR.map(e => ({ id: e.id, scene: e.scene })), ...INCIDENTS.map(e => ({ id: e.id, scene: e.id })), ...RANDOM_EVENTS.map(e => ({ id: e.id, scene: e.id }))] : []
  const relationshipScenes = [...candidates].filter(id => /(?:eve_[it]_|romance|_confide)/.test(id))
  const findings = new Map<string, { finding: RunResult['findings'][number]; witnesses: { profile: string; seed: number; provenance: string }[] }>()
  for (const r of runs) for (const f of r.findings) {
    const key = JSON.stringify(f); const entry = findings.get(key) ?? { finding: f, witnesses: [] }
    if (!entry.witnesses.some(w => w.profile === r.profile && w.seed === r.seed && w.provenance === r.provenance)) entry.witnesses.push({ profile: r.profile, seed: r.seed, provenance: r.provenance })
    findings.set(key, entry)
  }
  const endpoints = natural.map(r => ({ profile: r.profile, seed: r.seed, completed: r.completed, finalScene: r.final.scene,
    state: stateSummary(r.final), scenes: r.scenes, decisions: r.decisions, failure: r.failure }))
  const distinctOutcomes = new Set(natural.map(r => JSON.stringify({
    flags: Object.keys(r.final.flags).filter(k => /P2_|_OPEN|_SLOW|_DISTANT|_REPAIRED/.test(k)).sort(),
    knowledge: Object.keys(r.final.knowledge).sort(), bonds: r.final.bonds,
  }))).size
  return {
    scope: { chapter, start: options.start ?? START_SCENE, note: '표본 도달성, 정적 후보 범위는 조건을 무시함. 추측은 suspect로만 보고. 강제 상태는 자연 도달률에서 제외.' },
    plays: natural.length, completed: natural.filter(r => r.completed).length,
    completionRate: natural.length ? natural.filter(r => r.completed).length / natural.length : 0,
    forcedProbes: forced.length, forcedScenes: counts([...new Set(forced.flatMap(r => r.scenes))], forced),
    byProfile: Object.fromEntries(PROFILE_IDS.map(p => { const list = natural.filter(r => r.profile === p); return [p, {
      plays: list.length, completed: list.filter(r => r.completed).length,
      routes: Object.fromEntries(['research', 'pitch', 'secret', 'sly'].map(route => [route, list.filter(r => r.scenes.includes(`ch2_p_${route}`)).length])),
    }] })),
    sceneVisits: counts([...candidates]), choiceVisits: choiceCounts,
    unvisitedChoices: Object.keys(choiceCounts).filter(k => !choiceCounts[k]),
    unvisitedEvents: eventDefs.filter(e => !visited.has(e.scene)),
    relationshipVisits: Object.fromEntries(relationshipScenes.map(id => [id, { count: natural.filter(r => r.scenes.includes(id)).length,
      rate: natural.length ? natural.filter(r => r.scenes.includes(id)).length / natural.length : 0 }])),
    unvisited: conditions, findings: [...findings.values()],
    failures: natural.filter(r => !r.completed).map(r => ({ profile: r.profile, seed: r.seed, scene: r.final.scene, error: r.failure, actions: r.decisions.map(d => d.action) })),
    distinctCh2OutcomeSignatures: distinctOutcomes, endpoints,
    limits: ['선택지 누출은 최근 12줄 기반 후보 탐지이며 사람 검토 필요', '임의 조건식의 불가능성은 증명하지 않음',
      '관계 장면 분류는 이름 규칙 기반이며 새 장면 명명 규칙 변경 시 확장 필요', '지식·수첩 검사는 명시적 QA 계약 범위만; 전체 문장 의미 검증 아님',
      '중복 보상 검사는 once 행사/사건의 재실행과 선택 기록 횟수 중심; 모든 수치 효과의 의미적 정확성은 미증명'],
  }
}

export function markdown(report: ReturnType<typeof summarize>) {
  const routeLines = Object.entries(report.byProfile).map(([p, v]) => `| ${p} | ${v.plays} | ${v.completed} | ${JSON.stringify(v.routes)} |`)
  return [`# Story QA (developer only)`, '', `Natural plays: ${report.plays}; completed: ${report.completed} (${(report.completionRate * 100).toFixed(1)}%). Forced probes: ${report.forcedProbes}.`, '',
    '| Profile | Runs | Completed | Ch2 routes |', '|---|---:|---:|---|', ...routeLines, '',
    `Unvisited scenes: ${report.unvisited.length}; choices: ${report.unvisitedChoices.length}; events: ${report.unvisitedEvents.length}.`,
    'Unvisited does not mean impossible. See JSON for predicates, values, exact seeds, action transcripts and before/after states.', '',
    ...report.findings.map(f => `- [${f.finding.level}] ${f.finding.code} @ ${f.finding.scene}: ${f.finding.detail} (${f.witnesses.map(w => `${w.profile}/${w.seed}/${w.provenance}`).join(', ')})`), '',
    ...report.limits.map(l => `- Limitation: ${l}`), ''].join('\n')
}

export function probeState(state: GameState) { return { initialState: state } }
