import { advance, choose, currentNode, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { ChoiceNode, GameState, Scenario } from '../engine/types'

setScenario(SCENARIO)
export const ACTS = ['study', 'train', 'quidditch', 'talk', 'rest'] as const
export type Policy = 'random' | (typeof ACTS)[number] | 'balanced'

export interface PlayResult { s: GameState; lines: string[]; scenes: string[]; views: { scene: string; char: string | null; form: string }[]; cgs: string[] }

/**
 * 결정적 자동 플레이. plan: 선택 ID(또는 "장면:ID") → 키. 없으면 첫 노출 선택지.
 * policy: 자유 일과에서 고르는 활동(특화형/균형형 성장 경로 검증용).
 */
export function play(plan: Record<string, string> = {}, seed = 1, opts: { policy?: Policy; stopAt?: (s: GameState) => boolean; tweak?: (s: GameState) => void } = {}): PlayResult {
  let rnd = seed * 7919
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  let s = run(newState(START_SCENE, seed))
  opts.tweak?.(s)
  const lines: string[] = []; const scenes: string[] = []; const views: PlayResult['views'] = []; const cgs: string[] = []
  let k = 0
  for (let step = 0; step < 5000 && s.mode !== 'ENDED'; step++) {
    if (opts.stopAt?.(s)) break
    if (scenes[scenes.length - 1] !== s.scene) scenes.push(s.scene)
    if (s.view.cg && cgs[cgs.length - 1] !== s.view.cg) cgs.push(s.view.cg)
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') {
      const l = s.routine!.locations
      const pol = opts.policy ?? 'random'
      const act = pol === 'random' ? ACTS[Math.floor(r() * ACTS.length)] : pol === 'balanced' ? ACTS[k++ % ACTS.length] : pol
      s = pickActivity(s, l[Math.floor(r() * l.length)], act)
    } else if (n?.t === 'line') {
      lines.push(n.text); views.push({ scene: s.scene, char: s.view.char, form: s.view.form }); s = advance(s)
    } else if (n?.t === 'choice') {
      const v = visibleOptions(s, n, true)
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
      if (n.t === 'if') { st.push(n.then); if (n.else) st.push(n.else) }
      if (n.t === 'choice') n.options.forEach((o) => o.goto && st.push(o.goto))
      if (n.t === 'routine') { st.push(n.then); Object.values(n.encounters).flat().forEach((e) => st.push(e)); Object.values(n.friends ?? {}).flat().forEach((e) => st.push(e)) }
    }
  }
  return seen
}
