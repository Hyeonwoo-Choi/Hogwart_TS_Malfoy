import type { GameState } from '../src/engine/types'

/** Preferences select among engine-visible options; they never grant flags or stats. */
export const PROFILES = {
  research: { label: '연구·추리', priority: 'A', places: ['library', 'greenhouse'], activities: ['study', 'research'], attend: 0.9 },
  action: { label: '퀴디치·행동', priority: 'B', places: ['pitch'], activities: ['quidditch', 'broom_flight'], attend: 0.9 },
  mystery: { label: '탐험·미스터리', priority: 'C', places: ['lake', 'classroom4'], activities: ['observe', 'walk'], attend: 0.9 },
  politics: { label: '슬리데린 정치', priority: 'D', places: ['courtyard', 'library'], activities: ['talk', 'rumor'], attend: 0.9 },
  draco: { label: '드레이코', priority: 'E', places: ['potions', 'library', 'pitch'], activities: ['brew', 'study'], attend: 0.9 },
  multi: { label: '다중 관계', priority: '', places: [], activities: ['talk', 'walk'], attend: 1 },
  neutral: { label: '약속 회피·중립', priority: 'F', places: ['common', 'classroom4'], activities: ['rest', 'train'], attend: 0 },
  impulsive: { label: '충동·갈등', priority: '', places: [], activities: ['train', 'quidditch'], attend: 0.6 },
} as const
export type Profile = keyof typeof PROFILES
export const PROFILE_IDS = Object.keys(PROFILES) as Profile[]
export function randomFor(seed: number) {
  let x = seed >>> 0
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296 }
}
export interface Action { kind: 'choice' | 'activity' | 'continue'; scene: string; idx: number; key?: string; loc?: string; act?: string }
export const conflictChoices: Record<string, string> = { 'Q-01': 'B', 'Q-02': 'B', 'Q-03': 'C', 'Q-04': 'C' }
export function preference(profile: Profile, seed: number, id: string, visible: string[], rnd: () => number) {
  const def = PROFILES[profile]
  const want = id === 'H-08' ? def.priority || 'ABCDE'[seed % 5]
    : profile === 'impulsive' ? conflictChoices[id] ?? (/^L-/.test(id) ? visible.at(-1) : undefined)
    : profile === 'neutral' ? visible.at(-1)
    : /^(Q|L|E)-/.test(id) && rnd() < 0.7 ? visible[0] : undefined
  return visible.includes(want ?? '') ? want! : visible[Math.floor(rnd() * visible.length)]
}
export const stateSummary = (s: GameState) => ({ chapter: s.chapter, calendar: s.calendar, stats: s.stats, emotions: s.emotions,
  bonds: s.bonds, flags: s.flags, knowledge: s.knowledge, choices: s.choices, board: s.board, rng: s.rng })
