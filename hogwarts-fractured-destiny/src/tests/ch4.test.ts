import { describe, expect, it } from 'vitest'
import { advance, choose, currentNode, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { CH4_SCENARIO, SCENARIO, START_SCENE } from '../data/scenario'
import type { ChoiceNode, GameState } from '../engine/types'

setScenario(SCENARIO)
const ACTS = ['study', 'train', 'quidditch', 'talk', 'rest']

function play(plan: Record<string, string>, seed = 1, stopAt?: (s: GameState) => boolean) {
  let rnd = seed * 7919
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  let s = run(newState(START_SCENE, seed)); const lines: string[] = []
  for (let step = 0; step < 5000 && s.mode !== 'ENDED'; step++) {
    if (stopAt?.(s)) break
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') { const l = s.routine!.locations; s = pickActivity(s, l[Math.floor(r() * l.length)], ACTS[Math.floor(r() * ACTS.length)]) }
    else if (n?.t === 'line') { lines.push(n.text); s = advance(s) }
    else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, (v.find((o) => o.key === plan[n.id]) ?? v[0]).key) }
    else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
  }
  return { s, lines }
}
const atK08 = (plan: Record<string, string>, seed = 1) => play(plan, seed, (s) => { const n = currentNode(s); return n?.t === 'choice' && n.id === 'K-08' }).s
const after = (plan: Record<string, string>, k: string, seed = 1) => { let s = choose(atK08(plan, seed), k); for (let i = 0; i < 80 && s.scene !== 'ch4_end'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else break } return s }

describe('챕터 4 구조·연결', () => {
  it('챕터 3에서 챕터 4로 이어지고 챕터 4 종료로 끝난다', () => {
    expect(play({}, 1, (s) => s.scene === 'ch4_open').s.scene).toBe('ch4_open')
    const e = play({}); expect(e.s.mode).toBe('ENDED'); expect(e.s.endTitle).toContain('챕터 4')
  })
  it('챕터 4 모든 장면이 도달 가능하고 만남·조연 이벤트는 end로 끝난다', () => {
    const seen = new Set<string>(); const st = [START_SCENE]
    while (st.length) {
      const id = st.pop()!; if (seen.has(id)) continue; seen.add(id)
      for (const n of SCENARIO[id]) {
        if (n.t === 'goto') st.push(n.scene)
        if (n.t === 'if') { st.push(n.then); if (n.else) st.push(n.else) }
        if (n.t === 'choice') n.options.forEach((o) => o.goto && st.push(o.goto))
        if (n.t === 'routine') { st.push(n.then); Object.values(n.encounters).flat().forEach((e) => st.push(e)); Object.values(n.friends ?? {}).flat().forEach((e) => st.push(e)) }
      }
    }
    expect(Object.keys(CH4_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    for (const [id, ns] of Object.entries(CH4_SCENARIO)) if (/^(enc|fr)4/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
})

describe('K-08 분기·지식 상태', () => {
  it('선택지는 항상 4개이고 아직 알지 못하는 사실(필요의 방·캐비닛)을 문구에 쓰지 않는다', () => {
    const s = atK08({}); const n = currentNode(s) as ChoiceNode
    expect(visibleOptions(s, n, true).map((o) => o.key)).toEqual(['A', 'B', 'C', 'D'])
    expect(n.options.map((o) => o.text).join('|')).not.toMatch(/필요의 방|캐비닛|사라지는/)
  })
  it('B: 헤르미온느에게 털어놓음 → KN_ROOM·FLAG_CONFIDED_HERMIONE·FLAG_HERMIONE_DEMAND, 캐비닛은 모름', () => {
    const s = after({}, 'B'); expect(s.knowledge.KN_ROOM).toBe(true); expect(s.flags.FLAG_CONFIDED_HERMIONE).toBe(true); expect(s.flags.FLAG_HERMIONE_DEMAND).toBe(true)
    expect(s.knowledge.KN_CABINET).toBeUndefined(); expect(s.knowledge.KN_FAMILY_REASON).toBeUndefined()
  })
  it('C: 루나 → KN_ROOM·KN_FAMILY_REASON·FLAG_CONFIDED_LUNA, 헤르미온느 압박 없음', () => {
    const s = after({}, 'C'); expect(s.knowledge.KN_ROOM).toBe(true); expect(s.knowledge.KN_FAMILY_REASON).toBe(true); expect(s.flags.FLAG_CONFIDED_LUNA).toBe(true)
    expect(s.flags.FLAG_HERMIONE_DEMAND).toBeUndefined(); expect(s.knowledge.KN_CABINET).toBeUndefined()
  })
  it('D: 아무 지식·플래그도 얻지 못한다(챕터 6에서 확인 가능)', () => {
    const s = after({}, 'D'); expect(s.knowledge.KN_ROOM).toBeUndefined(); expect(s.knowledge.KN_CABINET).toBeUndefined(); expect(s.flags.FLAG_CONFIDED_HERMIONE).toBeUndefined()
  })
  it('A: 판정 성공은 KN_ROOM+KN_CABINET, 실패는 KN_ROOM만(+경계·신뢰 변화). 두 결과 모두 정상 플레이에서 도달한다', () => {
    const outcomes = new Set<string>(); const gain: Record<string, number> = {}
    for (let seed = 1; seed <= 60 && outcomes.size < 2; seed++) {
      const base = atK08({ 'K-04': 'B' }, seed) // 야간 미행 이력 없음 → 통찰·주사위 판정
      const s = after({ 'K-04': 'B' }, 'A', seed)
      const key = s.knowledge.KN_CABINET ? 'ok' : 'fail'; outcomes.add(key)
      expect(s.knowledge.KN_ROOM).toBe(true)
      if (key === 'fail') gain.w = s.emotions.draco.wariness - base.emotions.draco.wariness
    }
    expect([...outcomes].sort()).toEqual(['fail', 'ok'])
    expect(gain.w).toBeGreaterThan(0)
  })
  it('DE-05: 야간 미행(K-04D)을 한 경우 잠복 판정이 완화되어 항상 성공한다', () => {
    for (let seed = 1; seed <= 40; seed++) expect(after({ 'K-04': 'D' }, 'A', seed).knowledge.KN_CABINET).toBe(true)
  })
  it('감정 변화가 분기 판정보다 먼저 적용되지 않는다: 실패 시 경계 증가는 판정 이후 대사에만 영향', () => {
    const base = atK08({ 'K-04': 'B' }, 3); const s = after({ 'K-04': 'B' }, 'A', 3)
    expect(s.emotions.draco.wariness).toBeGreaterThanOrEqual(base.emotions.draco.wariness)
  })
})

describe('챕터 4 이월 반영', () => {
  const tail = (plan: Record<string, string>, k: string) => { let s = choose(atK08(plan), k); const out: string[] = []; for (let i = 0; i < 400 && s.mode !== 'ENDED'; i++) { const n = currentNode(s); if (n?.t === 'line') { out.push(n.text); s = advance(s) } else if (n?.t === 'choice') break; else if (s.mode === 'ROUTINE') break; else break } return out.join('|') }
  it('후속 대사가 선택 방식별로 다르다 (헤르미온느 한 달 기한 / 루나 침묵 / 쥐 대사)', () => {
    expect(tail({}, 'B')).toContain('한 달이야'); expect(tail({}, 'B')).not.toContain('아무한테도 안 했어')
    expect(tail({}, 'C')).toContain('아무한테도 안 했어'); expect(tail({}, 'D')).toContain('토요일 밤의 벽은 오늘도 맨벽')
    const fail = ((): string => { for (let seed = 1; seed <= 60; seed++) { let s = atK08({ 'K-04': 'B' }, seed); s = choose(s, 'A'); const out: string[] = []; for (let i = 0; i < 300 && s.mode !== 'ENDED'; i++) { const n = currentNode(s); if (n?.t === 'line') { out.push(n.text); s = advance(s) } else break } const j = out.join('|'); if (j.includes('쥐가 많더군')) return j } return '' })()
    expect(fail).toContain('쥐가 많더군')
  })
  it('FLAG_DETENTION_KINDNESS·FLAG_REPORTED_NIGHT가 챕터 4 대사에 반영된다', () => {
    const all = JSON.stringify(CH4_SCENARIO)
    expect(all).toContain('FLAG_DETENTION_KINDNESS'); expect(all).toContain('FLAG_REPORTED_NIGHT'); expect(all).toContain('FLAG_FOLLOWED_NIGHT')
  })
  it('사과 복선(F-09): 도서관·안뜰의 사과와 A 성공 장면의 반쯤 돌아온 사과가 텍스트로 존재한다', () => {
    const all = JSON.stringify(CH4_SCENARIO); expect(all).toContain('사과'); expect(all).toContain('반쯤. 한쪽 단면')
  })
  it('챕터 4 선택 조합 전수: K-04×K-08 (16)', () => {
    let n = 0
    for (const a of 'ABCD') for (const b of 'ABCD') { n++; const r = play({ 'K-04': a, 'K-08': b }, n); expect(r.s.mode).toBe('ENDED'); expect(r.s.choices.at(-1)?.id).toBe('K-08') }
    expect(n).toBe(16)
  })
})