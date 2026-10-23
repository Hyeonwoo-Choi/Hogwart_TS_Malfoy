import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { advance, choose, currentNode, listActions, newState, pickActivity, run, setActivityScenes, setIncidents, setRandomEvents, visibleOptions } from '../engine/core'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { INCIDENTS } from '../data/incidents'
import { START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'
import './helpers'

/**
 * 플레이 스타일 시뮬레이션: 고정 시드 다회 플레이(일상 랜덤 이벤트·돌발 사건·활동 장면 켬)로 챕터 1 완주 가능성, 행사 참여, 단서 획득,
 * 돌발 사건 발생 빈도를 측정한다. "도달 가능"과 "실제 플레이에서의 발생 비율"을 구분해 로그로 남긴다.
 */
beforeEach(() => { setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS) })
afterEach(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })

const STYLES: Record<string, { h08: string; apt?: string; choice?: string; clue?: string; ok?: string }> = {
  draco: { h08: 'E', apt: 'pl_draco', choice: 'E-12', clue: 'FLAG_RT_DRACO_OK', ok: 'FLAG_RT_DRACO_OK' },
  hermione: { h08: 'A', apt: 'ap_hermione', choice: 'E-08', clue: 'OB_RUNE_WALL', ok: 'FLAG_RT_HERMIONE_OK' },
  ginny: { h08: 'B', apt: 'ap_ginny', choice: 'E-09', clue: 'OB_PITCH_FLASH', ok: 'FLAG_RT_GINNY_OK' },
  luna: { h08: 'C', apt: 'ap_luna', choice: 'E-10', clue: 'FLAG_LUNA_COUNT7', ok: 'FLAG_RT_LUNA_OK' },
  pansy: { h08: 'D', apt: 'ap_pansy', choice: 'E-11', clue: 'KN_PANSY_NIGHTS', ok: 'FLAG_RT_PANSY_OK' },
  none: { h08: 'F' },
}
const BEST: Record<string, string> = { 'E-08': 'A', 'E-09': 'A', 'E-10': 'A', 'E-11': 'A', 'E-12': 'A' }

interface Out { s: GameState; scenes: Set<string>; joined: string[]; crack: boolean }
function simulate(style: string, seed: number): Out {
  const def = STYLES[style]
  let rnd = seed * 104729 + style.length * 31
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  let s = run(newState(START_SCENE, seed)); const scenes = new Set<string>(); const joined: string[] = []; let crack = false
  for (let step = 0; step < 8000 && s.scene !== 'ch2_open'; step++) {
    scenes.add(s.scene); if (s.scene.startsWith('inc_crack')) crack = true
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') {
      const all: [string, string][] = []
      for (const loc of s.routine!.locations) for (const a of listActions(s, loc)) if (a.ok) all.push([loc, a.actId])
      const evs = all.filter(([, a]) => a.startsWith('ev:'))
      const mine = evs.find(([, a]) => def.apt && a === `ev:${def.apt}`)
      const pub = evs.filter(([, a]) => /^ev:ev_/.test(a))
      let pick: [string, string]
      if (mine && r() < 0.9) pick = mine
      else if (pub.length && r() < 0.5) pick = pub[Math.floor(r() * pub.length)]
      else {
        const normal = all.filter(([, a]) => !a.startsWith('ev:'))
        const lib = normal.filter(([l, a]) => l === 'library' && /^(study|research|deep_study)$/.test(a)) // 공부하는 학생(도서관 습관)
        pick = lib.length && r() < 0.3 ? lib[Math.floor(r() * lib.length)] : normal[Math.floor(r() * normal.length)]
      }
      if (pick[1].startsWith('ev:')) joined.push(pick[1].slice(3))
      s = pickActivity(s, pick[0], pick[1])
    } else if (n?.t === 'line') s = advance(s)
    else if (n?.t === 'choice') {
      const v = visibleOptions(s, n, true)
      let key: string | undefined
      if (n.id === 'H-08') key = def.h08
      else if (n.id === 'H-01') key = 'C' // 이력 기반 후속을 피해 스타일별 경로를 고정한다(후속은 multi.test에서 따로 검증)
      else if (BEST[n.id] && r() < 0.7) key = BEST[n.id]
      s = choose(s, (v.find((x) => x.key === key) ?? v[Math.floor(r() * v.length)]).key)
    } else throw new Error(`예상치 못한 노드 ${s.scene}:${n?.t}`)
  }
  return { s, scenes, joined, crack }
}

describe('플레이 스타일 시뮬레이션(고정 시드 40회 × 6 스타일)', () => {
  const N = 40
  const table: Record<string, { reach: number; own: number; clue: number; pub: number; crack: number; n: number }> = {}
  const all: Record<string, Out[]> = {}
  beforeAll(() => {
  setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS) // 수집 단계에는 beforeEach가 아직 적용되지 않는다
  for (const st of Object.keys(STYLES)) {
    all[st] = Array.from({ length: N }, (_, i) => simulate(st, i + 1))
    const outs = all[st]; const d = STYLES[st]
    table[st] = {
      n: N,
      reach: outs.filter((o) => o.s.scene === 'ch2_open').length,
      own: d.ok ? outs.filter((o) => o.s.flags[d.ok!]).length : 0,
      clue: d.clue ? outs.filter((o) => o.s.flags[d.clue!] || o.s.knowledge[d.clue!]).length : 0,
      pub: outs.filter((o) => o.joined.some((j) => /^ev_/.test(j))).length,
      crack: outs.filter((o) => o.crack).length,
    }
  }
  console.log('[플레이 스타일 시뮬레이션]', JSON.stringify(table))
  })
  afterAll(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })

  it('모든 스타일이 챕터 1을 완주하며(공통 메인 K-04 포함), 약속 참가·성공 비율과 단서 획득이 측정된다', () => {
    for (const [st, t] of Object.entries(table)) {
      expect(t.reach, st).toBe(N)
      for (const o of all[st]) expect(o.s.choices.some((c) => c.id === 'K-04'), st).toBe(true)
    }
    for (const st of ['hermione', 'ginny', 'luna', 'pansy', 'draco']) {
      expect(table[st].own, `${st} 약속 성공`).toBeGreaterThan(N * 0.15) // 약속에 신경 쓰는 플레이어가 성공하는 비율(측정: 루나 22% ~ 판시 70%, 시간대가 긴 활동에 밀리면 놓친다)
      expect(table[st].clue, `${st} 단서`).toBeGreaterThan(0)
    }
  })

  it('다른 히로인 경로는 자기 단서를 말포이 경로와 무관하게 얻는다: 단서는 해당 경로에서만 나온다', () => {
    const own = (st: string, flag: string) => all[st].filter((o) => o.s.flags[flag] || o.s.knowledge[flag]).length
    expect(own('draco', 'OB_RUNE_WALL')).toBe(0); expect(own('draco', 'KN_PANSY_NIGHTS')).toBe(0); expect(own('none', 'OB_PITCH_FLASH')).toBe(0)
    expect(own('hermione', 'FLAG_LUNA_COUNT7')).toBe(0); expect(own('luna', 'OB_RUNE_WALL')).toBe(0); expect(own('pansy', 'OB_PITCH_FLASH')).toBe(0)
  })

  it('공개 행사 참여율과 돌발 사건(성 벽의 금) 발생률이 측정되고 필수 진행 조건이 아니다', () => {
    const crackAll = Object.values(all).flat().filter((o) => o.crack).length / (Object.keys(all).length * N)
    console.log('[돌발 사건 발생률]', crackAll.toFixed(2))
    expect(crackAll).toBeGreaterThan(0.05) // 실제 플레이에서 자주 보이는 편은 아니어도 도달 가능
    expect(crackAll).toBeLessThan(0.9)
    const pub = Object.values(all).flat().filter((o) => o.joined.some((j) => /^ev_/.test(j))).length / (Object.keys(all).length * N)
    console.log('[공개 행사 참여율]', pub.toFixed(2))
    expect(pub).toBeGreaterThan(0.3)
  })
})
