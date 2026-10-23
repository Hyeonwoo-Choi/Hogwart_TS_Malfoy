import { advance, choose, continueChapter, currentNode, listActions, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { ACTIVITY_DEFS } from '../data/places'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { ChoiceNode, GameState, Scenario } from '../engine/types'

setScenario(SCENARIO)
export const ACTS = ['study', 'train', 'quidditch', 'talk', 'rest'] as const
export type Policy = 'random' | (typeof ACTS)[number] | 'balanced'
/** 정책별로 노리는 능력치(시간당 성장 합산 점수) */
const FOCUS: Record<(typeof ACTS)[number], Partial<Record<string, number>>> = {
  study: { int: 2, insight: 1 }, train: { magic: 2, will: 1 }, quidditch: { str: 2, magic: 1 }, talk: { social: 2, insight: 1 }, rest: { will: 2 },
}
/**
 * 자유 일과에서 가능한 (장소, 활동) 쌍을 고른다(테스트용 결정적 선택기).
 * random: 가능한 쌍 중 무작위 / 특화 정책: 해당 능력치의 시간당 성장 점수가 가장 높은 쌍(동점은 무작위) / balanced: 정책을 순환.
 */
/** attend: 지금 열려 있는 행사·약속(ev:*)이 있으면 그걸 고를 확률(행사에 신경 쓰는 플레이어) */
export function chooseAction(s: GameState, policy: Policy, r: () => number, k: number, preferLoc?: string, attend = 0): [string, string] {
  const pairs: { loc: string; act: string; score: number }[] = []
  const pol: Policy = policy === 'balanced' ? ACTS[k % ACTS.length] : policy
  for (const loc of s.routine!.locations) for (const a of listActions(s, loc)) {
    if (!a.ok) continue
    const def = ACTIVITY_DEFS[a.actId]
    const w = pol === 'random' ? {} : FOCUS[pol]
    // 행사(ev:*)는 능력치 성장 정의가 없다
    const score = def ? Object.entries(def.gains).reduce((t, [stat, v]) => t + (w[stat] ?? 0) * (v as number), 0) / def.dur : 0
    pairs.push({ loc, act: a.actId, score })
  }
  if (!pairs.length) throw new Error('가능한 활동이 없다')
  const evs = pairs.filter((p) => p.act.startsWith('ev:'))
  if (attend > 0 && evs.length && r() < attend) { const p = evs[Math.floor(r() * evs.length)]; return [p.loc, p.act] }
  if (preferLoc && pairs.some((p) => p.loc === preferLoc)) { const own = pairs.filter((p) => p.loc === preferLoc); const p = own[Math.floor(r() * own.length)]; return [p.loc, p.act] }
  if (pol === 'random') { const p = pairs[Math.floor(r() * pairs.length)]; return [p.loc, p.act] }
  const best = Math.max(...pairs.map((p) => p.score))
  const top = pairs.filter((p) => p.score >= best - 1e-9)
  const p = top[Math.floor(r() * top.length)]
  return [p.loc, p.act]
}

export interface PlayResult { s: GameState; lines: string[]; scenes: string[]; views: { scene: string; char: string | null; form: string }[]; cgs: string[] }

/**
 * 결정적 자동 플레이. plan: 선택 ID(또는 "장면:ID") → 키. 없으면 첫 노출 선택지.
 * policy: 자유 일과에서 고르는 활동(특화형/균형형 성장 경로 검증용).
 */
export function play(plan: Record<string, string> = {}, seed = 1, opts: { policy?: Policy; stopAt?: (s: GameState) => boolean; tweak?: (s: GameState) => void; follow?: boolean; from?: GameState; timer?: boolean } = {}): PlayResult {
  let rnd = seed * 7919
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  let s = opts.from ? structuredClone(opts.from) : run(newState(START_SCENE, seed))
  opts.tweak?.(s)
  const lines: string[] = []; const scenes: string[] = []; const views: PlayResult['views'] = []; const cgs: string[] = []
  let k = 0
  for (let step = 0; step < 9000; step++) {
    if (s.mode === 'ENDED') {
      if (opts.stopAt?.(s)) break
      const e = currentNode(s)
      if (opts.follow && e?.t === 'endChapter' && e.next) { s = continueChapter(s); continue }
      break
    }
    if (opts.stopAt?.(s)) break
    if (scenes[scenes.length - 1] !== s.scene) scenes.push(s.scene)
    if (s.view.cg && cgs[cgs.length - 1] !== s.view.cg) cgs.push(s.view.cg)
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') {
      const [loc, act] = chooseAction(s, opts.policy ?? 'random', r, k++)
      s = pickActivity(s, loc, act)
    } else if (n?.t === 'line') {
      lines.push(n.text); views.push({ scene: s.scene, char: s.view.char, form: s.view.form }); s = advance(s)
    } else if (n?.t === 'choice') {
      const v = visibleOptions(s, n, opts.timer ?? true)
      const want = plan[`${s.scene}:${n.id}`] ?? plan[n.id]
      s = choose(s, (v.find((o) => o.key === want) ?? v[0]).key)
    } else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
  }
  return { s, lines, scenes, views, cgs }
}

export const atChoice = (id: string) => (s: GameState) => { const n = currentNode(s); return n?.t === 'choice' && n.id === id }
export const visibleKeys = (s: GameState) => visibleOptions(s, currentNode(s) as ChoiceNode, true).map((o) => o.key)

/** 시작 장면에서 (조건 무시) 도달 가능한 장면 집합 */
export function reachable(sc: Scenario = SCENARIO, start = START_SCENE): Set<string> {
  const seen = new Set<string>(); const st = [start]
  while (st.length) {
    const id = st.pop()!; if (seen.has(id) || !sc[id]) continue; seen.add(id)
    for (const n of sc[id]) {
      if (n.t === 'goto') st.push(n.scene)
      if (n.t === 'endChapter' && n.next) st.push(n.next)
      if (n.t === 'if') { st.push(n.then); if (n.else) st.push(n.else) }
      if (n.t === 'choice') n.options.forEach((o) => o.goto && st.push(o.goto))
      if (n.t === 'routine') { st.push(n.then); Object.values(n.encounters).flat().forEach((e) => st.push(e)); Object.values(n.friends ?? {}).flat().forEach((e) => st.push(e)); Object.values(n.meets ?? {}).forEach((byLoc) => Object.values(byLoc).flat().forEach((e) => st.push(e))) }
    }
  }
  return seen
}
