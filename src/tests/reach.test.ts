import { describe, expect, it } from 'vitest'
import { advance, choose, clone, currentNode, dracoLocation, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { evalCond } from '../engine/cond'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'

setScenario(SCENARIO)
const ACTS = ['study', 'train', 'quidditch', 'talk', 'rest']
const MAIN = Object.keys(SCENARIO).filter((id) => /^(ch[12]_|enc[12]|fr[12])/.test(id))

interface Obs { t: boolean; f: boolean }

/** 무작위 선택·일과 플레이로, 장면 진입 시점 상태에서 모든 조건식의 참/거짓 도달을 관측한다(챕터 1~2). */
function survey(runs: number) {
  const obs = new Map<string, Obs>()
  const trustAtS01: number[] = []
  for (let seed = 1; seed <= runs; seed++) {
    let rnd = seed * 104729
    const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
    // 성장 경로도 무작위로 기울인다(특화형 플레이어 포함)
    const bias = ACTS[seed % ACTS.length]
    let s: GameState = run(newState(START_SCENE, seed)); let last = ''
    for (let step = 0; step < 5000 && s.mode !== 'ENDED'; step++) {
      if (s.scene !== last) {
        last = s.scene
        const probe = clone(s)
        if (MAIN.includes(s.scene)) SCENARIO[s.scene].forEach((n, i) => {
          const conds: [string, string][] = []
          if (n.t === 'line' && n.when) conds.push([`${s.scene}:${i} when`, n.when])
          if (n.t === 'if') conds.push([`${s.scene}:${i} if`, n.cond])
          if (n.t === 'choice') n.options.forEach((o) => o.if && conds.push([`${s.scene}:${i} opt${o.key}`, o.if]))
          for (const [k, c] of conds) {
            const v = evalCond(probe, c); const o = obs.get(`${k} :: ${c}`) ?? { t: false, f: false }
            if (v) o.t = true; else o.f = true; obs.set(`${k} :: ${c}`, o)
          }
        })
        if (s.scene === 'ch2_after') trustAtS01.push(s.emotions.draco.trust)
      }
      const n = currentNode(s)
      if (s.mode === 'ROUTINE') {
        const l = s.routine!.locations; const d = dracoLocation(s.calendar.weekday, s.routine!.slotIdx)
        const loc = d && l.includes(d) && r() < 0.6 ? d : l[Math.floor(r() * l.length)]
        s = pickActivity(s, loc, r() < 0.7 ? bias : ACTS[Math.floor(r() * ACTS.length)])
      } else if (n?.t === 'line') s = advance(s)
      else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, v[Math.floor(r() * v.length)].key) }
      else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
    }
  }
  return { obs, trustAtS01 }
}

describe('도달성 감사 (챕터 1~2)', () => {
  const { obs, trustAtS01 } = survey(300)
  it('사고 직후(S-01) 신뢰 분포 — 새벽 장면 조건(≥6)의 양쪽이 모두 정상 플레이에서 나온다', () => {
    const hist: Record<number, number> = {}; trustAtS01.forEach((t) => { hist[t] = (hist[t] ?? 0) + 1 })
    console.log('[trust@S-01]', JSON.stringify(hist))
    expect(Math.min(...trustAtS01)).toBeLessThan(6); expect(Math.max(...trustAtS01)).toBeGreaterThanOrEqual(2)
  })
  it('참이 한 번도 관측되지 않은 조건이 없다(도달 불가 분기 0)', () => {
    const neverTrue = [...obs].filter(([, o]) => !o.t).map(([k]) => k)
    expect(neverTrue).toEqual([])
  })
})
