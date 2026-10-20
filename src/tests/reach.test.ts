import { describe, expect, it } from 'vitest'
import { advance, choose, clone, currentNode, dracoLocation, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { evalCond } from '../engine/cond'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'

setScenario(SCENARIO)
const ACTS = ['study', 'train', 'quidditch', 'talk', 'rest']
const MAIN = Object.keys(SCENARIO).filter((id) => /^(ch[1234]_|enc[1234]|fr[1234])/.test(id))

interface Obs { t: boolean; f: boolean }

/** 무작위 선택·일과로 많은 플레이를 돌려, 장면 진입 시점의 상태에서 모든 조건식의 참/거짓 도달 여부를 관측한다. */
function survey(runs: number) {
  const obs = new Map<string, Obs>()
  const trustAtK07: number[] = []
  for (let seed = 1; seed <= runs; seed++) {
    let rnd = seed * 104729
    const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
    let s: GameState = run(newState(START_SCENE, seed)); let last = ''
    for (let step = 0; step < 4000 && s.mode !== 'ENDED'; step++) {
      if (s.scene !== last) {
        last = s.scene
        const probe = clone(s) // 장면 진입 상태 1회 복제(조건식 평가는 롤 외에는 순수)
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
        if (s.scene === 'ch3_letter') trustAtK07.push(s.emotions.draco.trust)
      }
      const n = currentNode(s)
      if (s.mode === 'ROUTINE') {
        const l = s.routine!.locations; const d = dracoLocation(s.calendar.weekday, s.routine!.slotIdx)
        const loc = d && l.includes(d) && r() < 0.6 ? d : l[Math.floor(r() * l.length)] // 드레이코 일정 장소를 자주 방문하는 플레이어도 포함
        s = pickActivity(s, loc, ACTS[Math.floor(r() * ACTS.length)])
      }
      else if (n?.t === 'line') s = advance(s)
      else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, v[Math.floor(r() * v.length)].key) }
      else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
    }
  }
  return { obs, trustAtK07 }
}

describe('도달성 감사 (챕터 1~4)', () => {
  const { obs, trustAtK07 } = survey(250)
  it('EH-01 직전 신뢰 분포 (정보 출력)', () => {
    const hist: Record<number, number> = {}; trustAtK07.forEach((t) => { hist[t] = (hist[t] ?? 0) + 1 })
    console.log('[trust@K-07]', JSON.stringify(hist), 'min', Math.min(...trustAtK07), 'max', Math.max(...trustAtK07))
    expect(Math.min(...trustAtK07)).toBeLessThan(7); expect(Math.max(...trustAtK07)).toBeGreaterThanOrEqual(7) // 두 분기 모두 정상 플레이에서 도달
  })
  it('참이 한 번도 관측되지 않은 조건과 거짓이 한 번도 없는 조건을 점검한다', () => {
    const neverTrue = [...obs].filter(([, o]) => !o.t).map(([k]) => k)
    const neverFalse = [...obs].filter(([, o]) => !o.f).map(([k]) => k)
    void neverFalse // 항상 참인 조건(예: 보완 분기의 한쪽)은 허용하고, 참이 되지 못하는 조건만 오류로 본다
    expect(neverTrue).toEqual([])
  })
})
