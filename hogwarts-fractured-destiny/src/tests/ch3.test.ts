import { describe, expect, it } from 'vitest'
import { advance, choose, currentNode, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { evalCond } from '../engine/cond'
import { CH3_SCENARIO, SCENARIO, START_SCENE } from '../data/scenario'
import type { ChoiceNode, GameState } from '../engine/types'

setScenario(SCENARIO)
const ACTS = ['study', 'train', 'quidditch', 'talk', 'rest']

function play(plan: Record<string, string>, seed = 1, stopAt?: (s: GameState) => boolean, tweak?: (s: GameState) => void) {
  let rnd = seed * 7919
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  let s = run(newState(START_SCENE, seed)); const lines: string[] = []; let tweaked = false
  for (let step = 0; step < 4000 && s.mode !== 'ENDED' && s.scene !== 'ch4_open'; step++) {
    if (tweak && !tweaked && s.scene === 'ch3_letter') { tweak(s); tweaked = true }
    if (stopAt?.(s)) break
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') { const l = s.routine!.locations; s = pickActivity(s, l[Math.floor(r() * l.length)], ACTS[Math.floor(r() * ACTS.length)]) }
    else if (n?.t === 'line') { lines.push(n.text); s = advance(s) }
    else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, (v.find((o) => o.key === plan[n.id]) ?? v[0]).key) }
    else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
  }
  return { s, lines }
}
const letterTail = (k: string, plan: Record<string, string>) => { const l = play({ ...plan, 'K-07': k }, 5).lines; return l.slice(l.findIndex((x) => x.startsWith('토요일 저녁. 징계가 시작된 지 이레째')), l.findIndex((x) => x.startsWith('일요일 오후. 해리는 도서관'))).join('|') }
const trustAtLetter = (plan: Record<string, string>) => play(plan, 5, (s) => s.scene === 'ch3_letter').s.emotions.draco.trust

describe('챕터 3 구조·연결', () => {
  it('챕터 3 모든 장면이 도달 가능하고 만남·조연 이벤트는 end로 끝난다', () => {
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
    expect(Object.keys(CH3_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    for (const [id, ns] of Object.entries(CH3_SCENARIO)) if (/^(enc|fr)3/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('챕터 2 종료 직후 챕터 3으로 이어지고 챕터 4 진입으로 끝난다', () => {
    expect(play({}).s.scene).toBe('ch4_open')
    expect(play({}, 1, (s) => s.scene === 'ch3_open').s.scene).toBe('ch3_open')
  })
  it('조건식이 유효하다', () => {
    const s0 = run(newState(START_SCENE))
    for (const [id, ns] of Object.entries(CH3_SCENARIO)) for (const n of ns) {
      const c: string[] = []
      if (n.t === 'line' && n.when) c.push(n.when); if (n.t === 'if') c.push(n.cond)
      for (const x of c) expect(() => evalCond(JSON.parse(JSON.stringify(s0)), x), `${id}: ${x}`).not.toThrow()
    }
  })
})

describe('챕터 3 이월 반영 (DE-03/06/12)', () => {
  const open = (plan: Record<string, string>) => play(plan, 3, (s) => s.scene === 'ch3_routine').lines.join('|')
  it('DE-06: 반칙 여부에 따라 징계 사유 대사가 다르다', () => {
    expect(open({ 'K-06': 'B' })).toContain('반칙 때문이라더군')
    expect(open({ 'K-06': 'A' })).toContain('시작은 말포이 양이든')
  })
  it('DE-12: 엿듣다 들킨 경우 "엿듣는 덴 소질" 인용', () => {
    const s = play({ 'K-01': 'A' }, 3, (st) => st.scene === 'ch3_open'); s.s.flags.FLAG_CAUGHT_EAVESDROP = true
    let c = s.s, out = ''; for (let i = 0; i < 40 && currentNode(c)?.t === 'line'; i++) { out += (currentNode(c) as any).text; c = advance(c) }
    expect(out).toContain('엿듣는 덴 소질')
  })
  it('DE-03: 상호 비밀(K-04B)이면 "빚은 갚았다" 인용', () => {
    expect(open({ 'K-04': 'B' })).toContain('빚은 갚았다고 했잖아')
    expect(open({ 'K-04': 'C' })).not.toContain('빚은 갚았다고 했잖아')
  })
})

describe('K-07·EH-01·복선', () => {
  it('EH-01(실제 선택 경로): 사적 도움(K-03D)+비신고면 신뢰 9(≥7), 그 외는 5 또는 1(<7)', () => {
    expect(trustAtLetter({ 'K-03': 'D', 'K-04': 'B' })).toBe(9)
    expect(trustAtLetter({ 'K-03': 'D', 'K-04': 'C' })).toBe(9)
    expect(trustAtLetter({ 'K-03': 'D', 'K-04': 'A' })).toBe(5) // 신고하면 임계값 아래
    expect(trustAtLetter({ 'K-03': 'A', 'K-04': 'B' })).toBe(5)
    expect(trustAtLetter({ 'K-03': 'A', 'K-04': 'A' })).toBe(1)
  })
  it('EH-01: 임계값 바로 아래(5)는 감추며 공격, 이상(9)은 "…보지 마."로 침묵을 허용한다', () => {
    const below = { 'K-03': 'A', 'K-04': 'B' }, above = { 'K-03': 'D', 'K-04': 'B' }
    for (const k of ['A', 'C']) {
      const lo = letterTail(k, below), hi = letterTail(k, above)
      expect(lo).not.toContain('…보지 마.'); expect(hi).toContain('…보지 마.')
      expect(hi).not.toContain('영웅 놀이'); expect(hi).not.toContain('두 번째 경고는 없어')
    }
    expect(letterTail('A', below)).toContain('영웅 놀이'); expect(letterTail('C', below)).toContain('두 번째 경고는 없어')
    expect(letterTail('B', below)).toContain('누가 도와 달랬어'); expect(letterTail('B', above)).toContain('계산에 넣겠다는 뜻은 아니야')
  })
  it('EH-01 높은 신뢰 분기도 성격을 유지한다: 감사·호감 표현 없이 선 긋기', () => {
    const hi = letterTail('B', { 'K-03': 'D', 'K-04': 'B' })
    expect(hi).not.toMatch(/고마워|고맙/); expect(hi).not.toMatch(/해리[야,]/) // EH-06: 신뢰 40 이전에는 호칭이 '포터'
  })
  it('K-07 B는 FLAG_DETENTION_KINDNESS와 신뢰·의존성 증가, C는 신뢰 감소', () => {
    const upto = () => play({ 'K-07': 'A' }, 6, (s) => { const n = currentNode(s); return n?.t === 'choice' && n.id === 'K-07' }).s
    const at = (k: string) => { let s = choose(upto(), k); while (s.scene.startsWith('ch3_letter') && currentNode(s)?.t === 'line') s = advance(s); return s }
    const b = at('B'); expect(b.flags.FLAG_DETENTION_KINDNESS).toBe(true)
    const base = play({}, 6, (s) => { const n = currentNode(s); return n?.t === 'choice' && n.id === 'K-07' }).s.emotions.draco
    expect(b.emotions.draco.trust).toBeGreaterThan(base.trust); expect(b.emotions.draco.dependence).toBeGreaterThan(base.dependence)
    expect(at('C').emotions.draco.trust).toBeLessThan(base.trust)
    expect(at('A').flags.FLAG_DETENTION_KINDNESS).toBeUndefined()
  })
  it('F-07·F-08: 금서 대출 흔적과 평범한 안부 편지가 실제 텍스트로 존재한다', () => {
    const all = JSON.stringify(CH3_SCENARIO)
    expect(all).toContain('금서 구역 열람 허가'); expect(all).toContain('국화가 피었단다')
  })
  it('K-07 선택지는 챕터 3 안에서 세 개 모두 노출된다', () => {
    const r = play({}, 6, (s) => { const n = currentNode(s); return n?.t === 'choice' && n.id === 'K-07' })
    expect(visibleOptions(r.s, currentNode(r.s) as ChoiceNode, true).map((o) => o.key)).toEqual(['A', 'B', 'C'])
  })
  it('드레이코 만남은 일정표와 어긋나지 않고 야간 비활성이다 (분류: 4층 교실=수 오후1)', () => {
    const r = CH3_SCENARIO.ch3_routine.find((n) => n.t === 'routine') as any
    expect(r.night).toBe(false); expect(r.locations).toContain('classroom4')
  })
  it('챕터 3 선택 조합 전수: K-03×K-04×K-06×K-07 (144)', () => {
    let n = 0
    for (const a of 'ABCD') for (const b of 'ABCD') for (const c of 'ABC') for (const d of 'ABC') {
      n++; expect(play({ 'K-03': a, 'K-04': b, 'K-06': c, 'K-07': d }, n).s.scene).toBe('ch4_open')
    }
    expect(n).toBe(144)
  })
})
describe('일과 안내 문구', () => {
  it('활동 완료 메시지는 받침에 맞는 조사와 한글 능력치 이름을 쓴다', () => {
    const s0 = play({}, 7, (s) => s.mode === 'ROUTINE').s
    const msg = (act: string) => pickActivity(s0, 'library', act).routine!.message!
    expect(msg('study')).toContain('공부를 마쳤다'); expect(msg('study')).toContain('지성+')
    expect(msg('train')).toContain('마법 훈련을 마쳤다'); expect(msg('rest')).toContain('휴식을 마쳤다')
    expect(msg('study')).not.toMatch(/int\+|을\(를\)/)
  })
})