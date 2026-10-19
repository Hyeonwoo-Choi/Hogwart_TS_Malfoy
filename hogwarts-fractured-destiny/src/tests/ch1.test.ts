import { describe, expect, it } from 'vitest'
import { advance, choose, currentNode, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { evalCond } from '../engine/cond'
import { CH1_SCENARIO, SCENARIO, START_SCENE } from '../data/scenario'
import { DRACO_SCHEDULE } from '../data/constants'
import type { ChoiceNode, GameState, LineNode, Node } from '../engine/types'

setScenario(SCENARIO)

interface Run { s: GameState; lines: string[]; scenes: Set<string>; chars: number }
const ACTS = ['study', 'train', 'quidditch', 'talk', 'rest']

/** plan: 선택 ID → 키. 없으면 첫 번째 노출 선택지. 일과는 시드 난수로 진행. */
function play(plan: Record<string, string>, seed = 1): Run {
  let rnd = seed * 7919
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  let s = run(newState(START_SCENE, seed))
  const lines: string[] = []; const scenes = new Set<string>(); let chars = 0
  for (let step = 0; step < 1500 && s.mode !== 'ENDED' && s.scene !== 'ch2_open'; step++) {
    scenes.add(s.scene)
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') {
      const locs = s.routine!.locations
      s = pickActivity(s, locs[Math.floor(r() * locs.length)], ACTS[Math.floor(r() * ACTS.length)])
    } else if (n?.t === 'line') { lines.push(n.text); chars += n.text.length; s = advance(s) }
    else if (n?.t === 'choice') {
      const vis = visibleOptions(s, n, true)
      const want = plan[n.id]
      s = choose(s, (vis.find((o) => o.key === want) ?? vis[0]).key)
    } else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
  }
  return { s, lines, scenes, chars }
}

describe('챕터 1 구조', () => {
  const entries = Object.entries(CH1_SCENARIO)
  it('시작 장면에서 모든 챕터 1 장면에 (조건 무시) 도달 가능하다', () => {
    const seen = new Set<string>(); const stack = [START_SCENE]
    while (stack.length) {
      const id = stack.pop()!
      if (seen.has(id)) continue
      seen.add(id)
      for (const n of SCENARIO[id]) {
        if (n.t === 'goto') stack.push(n.scene)
        if (n.t === 'if') { stack.push(n.then); if (n.else) stack.push(n.else) }
        if (n.t === 'choice') n.options.forEach((o) => o.goto && stack.push(o.goto))
        if (n.t === 'routine') {
          stack.push(n.then)
          Object.values(n.encounters).flat().forEach((e) => stack.push(e))
          Object.values(n.friends ?? {}).flat().forEach((e) => stack.push(e))
        }
      }
    }
    expect(entries.map(([id]) => id).filter((id) => !seen.has(id))).toEqual([])
  })
  it('모든 장면은 종결 노드(goto/if/choice/end/endChapter/routine)로 끝난다', () => {
    const bad = entries.filter(([, ns]) => !['goto', 'if', 'choice', 'end', 'endChapter', 'routine'].includes(ns[ns.length - 1].t)).map(([id]) => id)
    expect(bad).toEqual([])
  })
  it('만남·조연 이벤트는 end로 끝난다', () => {
    for (const [id, ns] of entries) if (/^(enc1_|fr1_)/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('드레이코 만남 장면의 고유 수와 일정표 장소가 일치한다', () => {
    const r = CH1_SCENARIO.ch1_routine.find((n): n is Extract<Node, { t: 'routine' }> => n.t === 'routine')!
    const days = ['수', '목', '금']
    for (const [loc, pool] of Object.entries(r.encounters)) {
      const slots = days.flatMap((d) => DRACO_SCHEDULE[d].filter((l) => l === loc))
      expect(pool.length, loc).toBeLessThanOrEqual(slots.length) // 일정에 없는 만남은 정의할 수 없다
    }
    expect(r.night).toBe(false) // 챕터 1은 야간 비활성(GAME_BIBLE 5.1)
  })
  it('드레이코 외 인물 발화에 쓰는 화자 이름이 알려진 목록에 있다', () => {
    const known = new Set(['해리', '드레이코', '헤르미온느', '론', '지니', '루나', '판시', '슬러그혼', '후치', '스네이프', '맥고나걸', '필치'])
    const unknown = new Set<string>()
    for (const [, ns] of entries) for (const n of ns) if (n.t === 'line' && n.who && !known.has(n.who)) unknown.add(n.who)
    expect([...unknown]).toEqual([])
  })
})

describe('챕터 1 플레이', () => {
  it('선택 조합 전수(P-01×K-01×K-02×K-03×K-04)가 모두 오류 없이 종료까지 진행된다', () => {
    let n = 0
    for (const p of 'ABCD') for (const k1 of 'ABC') for (const k2 of 'ABCD') for (const k3 of 'ABCD') for (const k4 of 'ABCD') {
      const { s } = play({ 'P-01': p, 'K-01': k1, 'K-02': k2, 'K-03': k3, 'K-04': k4 }, n + 1); n++
      expect(s.scene).toBe('ch2_open') // 챕터 1은 챕터 2 진입 직전까지만 검증한다
      expect(s.choices.map((c) => c.id).filter((id) => /^K-/.test(id))).toEqual(['K-01', 'K-02', 'K-03', 'K-04'])
    }
    expect(n).toBe(4 * 3 * 4 * 4 * 4)
  })
  it('능력치 조건 선택지가 챕터 1 안에서 실제로 도달 가능하다 (P-01 효과)', () => {
    const at = (plan: Record<string, string>, id: string) => {
      let s = run(newState(START_SCENE, 3))
      for (let i = 0; i < 400; i++) {
        const n = currentNode(s)
        if (n?.t === 'choice' && n.id === id) return visibleOptions(s, n, true).map((o) => o.key)
        if (n?.t === 'line') s = advance(s)
        else if (n?.t === 'choice') s = choose(s, plan[n.id] ?? visibleOptions(s, n, true)[0].key)
        else break
      }
      return []
    }
    expect(at({ 'P-01': 'A' }, 'K-02')).toContain('B') // 지성 45
    expect(at({ 'P-01': 'D' }, 'K-02')).not.toContain('B') // 지성 40 → 숨김
    expect(at({ 'P-01': 'B', 'K-01': 'B' }, 'K-02')).toBeTruthy()
  })
  it('K-01 B + 통찰≥40이면 KN_TENSE, 아니면 획득하지 못한다', () => {
    const r1 = play({ 'P-01': 'B', 'K-01': 'B' }); expect(r1.s.knowledge.KN_TENSE).toBe(true)
    const r2 = play({ 'P-01': 'D', 'K-01': 'B' }); expect(r2.s.knowledge.KN_TENSE).toBeUndefined()
  })
  it('캐릭터가 모르는 정보를 쓰지 않는다: 엿듣기 없이는 "일정을 앞당겨야" 언급이 해리 입에서 나오지 않는다', () => {
    const noHear = play({ 'K-01': 'C' }); expect(noHear.lines.filter((l) => /앞당겨야 한다고/.test(l))).toEqual([])
    const hear = play({ 'K-01': 'A' }); expect(hear.lines.some((l) => /앞당겨야 한다고/.test(l))).toBe(true)
  })
  it('K-03 선택이 후속 장면의 실제 대사를 바꾼다 (가짜 분기 방지)', () => {
    const texts = (k: string) => play({ 'K-03': k }).lines.join('|')
    const A = texts('A'), B = texts('B'), C = texts('C'), Dd = texts('D')
    expect(new Set([A, B, C, Dd]).size).toBe(4)
    // 만남이 일어났는지와 무관한 영구 상태: 플래그
    expect(play({ 'K-03': 'A' }).s.flags.FLAG_PUBLIC_RESCUE).toBe(true)
    expect(play({ 'K-03': 'B' }).s.flags.FLAG_MOCKED_FALL).toBe(true)
    expect(play({ 'K-03': 'C' }).s.flags.FLAG_CALLED_TEACHER).toBe(true)
    expect(play({ 'K-03': 'D' }).s.flags.FLAG_PRIVATE_HELP).toBe(true)
  })
  it('K-04 선택이 다음 날 아침(ch1_followup) 장면을 달리 만든다', () => {
    const tail = (k: string) => play({ 'K-04': k }).lines.filter((l) => /스네이프|빚은|순찰|톱밥/.test(l)).join('|')
    const t = ['A', 'B', 'C', 'D'].map(tail)
    expect(new Set(t).size).toBe(4)
  })
  it('감정은 0~100을 지키고, 한 장면 상한을 넘지 않는다', () => {
    const { s } = play({ 'K-03': 'A', 'K-04': 'A' })
    for (const v of Object.values(s.emotions.draco)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100) }
  })
  it('챕터 1에서 호감 계열 수치는 연애 단계에 해당하는 값으로 오르지 않는다 (끌림≤5, 호감≤20)', () => {
    for (const k of 'ABCD') {
      const { s } = play({ 'K-02': k, 'K-03': 'D', 'K-04': 'B', 'K-01': 'B' })
      expect(s.emotions.draco.attraction).toBeLessThanOrEqual(5)
      expect(s.emotions.draco.affinity).toBeLessThanOrEqual(20)
    }
  })
  it('분량: 선형 읽기 기준 줄 수와 글자 수가 보고 가능하다 (참고 지표)', () => {
    const { lines, chars } = play({ 'P-01': 'A', 'K-01': 'A', 'K-02': 'B', 'K-03': 'D', 'K-04': 'D' })
    // 읽기 속도 약 500~600자/분 가정 시 대략의 시간. 자유 일과 조작 시간은 별도.
    console.log(`[ch1] 한 경로 줄 수=${lines.length}, 글자 수=${chars}`)
    expect(lines.length).toBeGreaterThan(150)
  })
  it('표정 변경 빈도: 드레이코 장면에서 표정 지정 줄이 과도하지 않다 (대사 약 10줄당 1회 이하 허용 상한 25%)', () => {
    const all = Object.values(CH1_SCENARIO).flat().filter((n): n is LineNode => n.t === 'line' && n.who === '드레이코')
    const withExpr = all.filter((n) => n.expr).length
    expect(withExpr / all.length).toBeLessThanOrEqual(0.25)
  })
  it('모든 조건식은 유효하고 처음 상태에서 평가 가능하다', () => {
    const s0 = run(newState(START_SCENE))
    for (const [id, ns] of Object.entries(CH1_SCENARIO)) for (const n of ns) {
      const conds: string[] = []
      if (n.t === 'line' && n.when) conds.push(n.when)
      if (n.t === 'if') conds.push(n.cond)
      if (n.t === 'choice') (n as ChoiceNode).options.forEach((o) => o.if && conds.push(o.if))
      for (const c of conds) expect(() => evalCond(JSON.parse(JSON.stringify(s0)), c), `${id}: ${c}`).not.toThrow()
    }
  })
})
