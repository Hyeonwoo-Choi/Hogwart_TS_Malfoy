import { describe, expect, it } from 'vitest'
import { advance, choose, currentNode, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { evalCond } from '../engine/cond'
import { CH1_SCENARIO, CH2_SCENARIO, SCENARIO, START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'

setScenario(SCENARIO)
const ACTS = ['study', 'train', 'quidditch', 'talk', 'rest']

/** 챕터 1+2 연속 플레이. plan: 선택 ID → 키(없으면 첫 노출 선택지), 도중 상태 조작은 hook으로. */
function play(plan: Record<string, string>, seed = 1, stopAt?: (s: GameState) => boolean) {
  let rnd = seed * 7919
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  let s = run(newState(START_SCENE, seed)); const lines: string[] = []
  for (let step = 0; step < 3000 && s.mode !== 'ENDED' && s.scene !== 'ch3_open'; step++) {
    if (stopAt?.(s)) break
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') { const l = s.routine!.locations; s = pickActivity(s, l[Math.floor(r() * l.length)], ACTS[Math.floor(r() * ACTS.length)]) }
    else if (n?.t === 'line') { lines.push(n.text); s = advance(s) }
    else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, (v.find((o) => o.key === plan[n.id]) ?? v[0]).key) }
    else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
  }
  return { s, lines }
}

describe('챕터 2 구조', () => {
  it('챕터 2 모든 장면에 시작에서 도달 가능하다(조건 무시)', () => {
    const seen = new Set<string>(); const stack = [START_SCENE]
    while (stack.length) {
      const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id)
      for (const n of SCENARIO[id]) {
        if (n.t === 'goto') stack.push(n.scene)
        if (n.t === 'if') { stack.push(n.then); if (n.else) stack.push(n.else) }
        if (n.t === 'choice') n.options.forEach((o) => o.goto && stack.push(o.goto))
        if (n.t === 'routine') { stack.push(n.then); Object.values(n.encounters).flat().forEach((e) => stack.push(e)); Object.values(n.friends ?? {}).flat().forEach((e) => stack.push(e)) }
      }
    }
    expect(Object.keys(CH2_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    expect(Object.keys(CH1_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
  })
  it('만남·조연 이벤트는 end로 끝난다', () => {
    for (const [id, ns] of Object.entries(CH2_SCENARIO)) if (/^(enc|fr)2/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('챕터 1~2가 연속 진행되어 챕터 3 진입에 도달한다', () => {
    const { s } = play({}); expect(s.scene).toBe('ch3_open')
  })
})

describe('챕터 2 반영·분기', () => {
  const upTo = (plan: Record<string, string>, id: string) => play(plan, 2, (s) => { const n = currentNode(s); return n?.t === 'choice' && n.id === id })
  it('챕터 1의 선택이 챕터 2 도입 대사를 바꾼다 (DE-01/02/03/04/05)', () => {
    const open = (k3: string, k4: string) => play({ 'K-03': k3, 'K-04': k4 }, 2, (s) => s.scene === 'ch2_routine1').lines.join('|')
    expect(open('A', 'C')).toContain('부축했을 뿐')
    expect(open('A', 'C')).toContain('순찰')
    expect(open('D', 'A')).toContain('스네이프 교수님이')
    expect(open('D', 'B')).toContain('빚은 갚았다고')
    expect(open('D', 'D')).toContain('필치가 7층에서')
    expect(new Set(['A', 'B', 'C', 'D'].map((k) => open('D', k))).size).toBe(4)
  })
  it('스네이프의 징계는 야간 신고(K-04A)에서만 나온다', () => {
    expect(play({ 'K-04': 'A' }, 2, (s) => s.scene === 'ch2_routine1').lines.some((l) => l.includes('징계 과제'))).toBe(true)
    expect(play({ 'K-04': 'B' }, 2, (s) => s.scene === 'ch2_routine1').lines.some((l) => l.includes('징계 과제'))).toBe(false)
  })
  it('K-05: 소문 조건이면 소문 대응, 아니면 자리 배정 선택지', () => {
    const rumor = upTo({ 'K-03': 'A' }, 'K-05'); expect((currentNode(rumor.s) as any).options[0].text).toContain('사실과 다릅니다')
    const seat = upTo({ 'K-03': 'C', 'K-04': 'B' }, 'K-05'); expect((currentNode(seat.s) as any).options[0].text).toContain('맞은편')
  })
  it('K-05 소문 대응: B는 항상 소문 확산, A는 사교성 판정, C는 확산 없음', () => {
    const f = (k: string, setup?: (s: GameState) => void) => {
      let s = upTo({ 'K-03': 'A' }, 'K-05').s; setup?.(s); s = choose(s, k)
      while (s.mode === 'STORY' && s.scene !== 'ch2_dinner_end') { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else if (n?.t === 'choice') break; else break }
      return s
    }
    expect(f('B').flags.FLAG_RUMOR_ACTIVE).toBe(true)
    expect(f('C').flags.FLAG_RUMOR_ACTIVE).toBeUndefined()
    expect(f('A', (s) => { s.stats.social = 80 }).flags.FLAG_RUMOR_ACTIVE).toBeUndefined()
    const lows = [1, 2, 3, 4, 5, 6, 7, 8].map((rng) => f('A', (s) => { s.stats.social = 1; s.rng = rng }).flags.FLAG_RUMOR_ACTIVE === true)
    expect(lows.some(Boolean)).toBe(true) // 사교성이 낮으면 판정 실패로 소문이 퍼질 수 있다
  })
  it('K-06: B는 반칙 플래그와 존경 하락, A는 능력치에 따라 승패가 갈린다', () => {
    const at = () => upTo({}, 'K-06').s
    const b = choose(at(), 'B'); expect(b.flags.FLAG_FOUL_PLAY).toBe(true)
    const r0 = at().emotions.draco.respect; expect(b.emotions.draco.respect).toBeLessThan(r0)
    const win = at(); win.stats.str = 60; const w = choose(win, 'A')
    const txt = (s: GameState) => { let c = s, out = ''; for (let i = 0; i < 6 && currentNode(c)?.t === 'line'; i++) { out += (currentNode(c) as any).text; c = advance(c) } return out }
    expect(txt(w)).toContain('먼저 날개 끝을 쥐었다')
    const low = at(); low.stats.str = 10 // 낮은 체력이면 roll(40)에 의존: 두 결과 중 하나로만 끝난다
    expect(['먼저 날개 끝을 쥐었다', '드레이코의 손이 먼저 날개를 쥐었다'].some((k) => txt(choose(low, 'A')).includes(k))).toBe(true)
  })
  it('K-06 B(반칙) 여부가 징계 통보 대사를 바꾼다', () => {
    const t = (k: string) => play({ 'K-06': k }, 3).lines.join('|')
    expect(t('B')).toContain('반칙 건은 경기 위원회')
    expect(t('A')).not.toContain('반칙 건은 경기 위원회')
  })
  it('챕터 2에서 호감·끌림은 연애 단계로 오르지 않는다 (끌림≤6, 호감≤22)', () => {
    for (const k of 'ABC') { const { s } = play({ 'K-06': k, 'K-02': 'A', 'K-03': 'D' }, 4); expect(s.emotions.draco.attraction).toBeLessThanOrEqual(6); expect(s.emotions.draco.affinity).toBeLessThanOrEqual(22) }
  })
  it('론 신뢰도가 높으면 경기에서 첫 세이브에 성공한다 (조연 일상의 결과가 본편에 반영)', () => {
    const base = upTo({}, 'K-06'); expect(base.lines.some((l) => l.includes('손끝을 스치며'))).toBe(base.s.emotions.ron.trust >= 62)
  })
  it('조건식 유효성(챕터 2 전체)', () => {
    const s0 = run(newState(START_SCENE))
    for (const [id, ns] of Object.entries(CH2_SCENARIO)) for (const n of ns) {
      const c: string[] = []
      if (n.t === 'line' && n.when) c.push(n.when); if (n.t === 'if') c.push(n.cond)
      if (n.t === 'choice') n.options.forEach((o) => o.if && c.push(o.if))
      for (const x of c) expect(() => evalCond(JSON.parse(JSON.stringify(s0)), x), `${id}: ${x}`).not.toThrow()
    }
  })
  it('선택 조합(챕터 1 핵심 선택 × 챕터 2 선택) 전수가 종료까지 진행된다', () => {
    let n = 0
    for (const k3 of 'ABCD') for (const k4 of 'ABCD') for (const k5 of 'ABC') for (const k6 of 'ABC') {
      n++; const { s } = play({ 'K-03': k3, 'K-04': k4, 'K-05': k5, 'K-06': k6 }, n); expect(s.scene).toBe('ch3_open')
    }
    expect(n).toBe(144)
  })
})