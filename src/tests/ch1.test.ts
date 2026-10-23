import { describe, expect, it } from 'vitest'
import { evalCond } from '../engine/cond'
import { newState, run } from '../engine/core'
import { CH1_SCENARIO, START_SCENE } from '../data/scenario'
import { DRACO_SCHEDULE } from '../data/constants'
import type { LineNode, Node } from '../engine/types'
import { atChoice, play, reachable, visibleKeys } from './helpers'

const toCh2 = (s: { scene: string }) => s.scene === 'ch2_open'

describe('챕터 1 구조', () => {
  it('모든 챕터 1 장면이 시작에서 도달 가능하다', () => {
    const seen = reachable()
    expect(Object.keys(CH1_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
  })
  it('만남·조연 이벤트는 end로, 나머지 장면은 종결 노드로 끝난다', () => {
    for (const [id, ns] of Object.entries(CH1_SCENARIO)) {
      const last = ns[ns.length - 1].t
      if (/^(enc1_|fr1_)/.test(id)) expect(last, id).toBe('end')
      else if (/^hr1_/.test(id)) { // 히로인 이벤트: end로 끝나거나, 마지막 선택지의 모든 갈래가 end로 끝난다
        const ln = ns[ns.length - 1]
        if (ln.t === 'choice') for (const o of ln.options) expect(CH1_SCENARIO[o.goto!].at(-1)!.t, `${id}:${o.key}`).toBe('end')
        else expect(last, id).toBe('end')
      }
      else expect(['goto', 'if', 'choice', 'endChapter', 'routine'], id).toContain(last)
    }
  })
  it('드레이코 만남 풀 크기가 일정표 슬롯 수를 넘지 않고, 챕터 1 야간 일과는 비활성이다', () => {
    const r = CH1_SCENARIO.v2c1_routine.find((n): n is Extract<Node, { t: 'routine' }> => n.t === 'routine')!
    for (const [loc, pool] of Object.entries(r.encounters)) {
      const slots = ['수', '목', '금'].flatMap((d) => DRACO_SCHEDULE[d].filter((l) => l === loc))
      expect(pool.length, loc).toBeLessThanOrEqual(slots.length)
    }
    expect(r.night).toBe(false)
  })
  it('서술은 해리 1인칭이다(서술 줄에 "해리는/해리의"가 없다)', () => {
    const narr = Object.values(CH1_SCENARIO).flat().filter((n): n is LineNode => n.t === 'line' && !n.who)
    expect(narr.filter((n) => /해리(는|의|가) /.test(n.text)).map((n) => n.text)).toEqual([])
  })
  it('챕터 1의 드레이코는 남성이며 변화·환영을 누설하지 않는다', () => {
    const r = play({}, 3, { stopAt: toCh2 })
    expect(r.views.filter((v) => v.char === 'draco').every((v) => v.form === 'base')).toBe(true)
    const text = Object.values(CH1_SCENARIO).flat().filter((n): n is LineNode => n.t === 'line').map((n) => n.text).join('|')
    expect(text).not.toMatch(/변신|환영 마법|그녀의 소매|말포이 양/)
  })
  it('모든 조건식이 유효하다', () => {
    const s0 = run(newState(START_SCENE))
    for (const [id, ns] of Object.entries(CH1_SCENARIO)) for (const n of ns) {
      const c: string[] = []
      if (n.t === 'line' && n.when) c.push(n.when); if (n.t === 'if') c.push(n.cond)
      if (n.t === 'choice') n.options.forEach((o) => o.if && c.push(o.if))
      for (const x of c) expect(() => evalCond(JSON.parse(JSON.stringify(s0)), x), `${id}: ${x}`).not.toThrow()
    }
  })
  it('표정 지정은 드레이코 대사의 25% 이하(남용 방지)', () => {
    const all = Object.values(CH1_SCENARIO).flat().filter((n): n is LineNode => n.t === 'line' && n.who === '드레이코')
    expect(all.filter((n) => n.expr).length / all.length).toBeLessThanOrEqual(0.25)
  })
})

describe('챕터 1 플레이', () => {
  it('선택 조합 전수(P-01×K-01×K-02×K-03×K-04 = 768)가 챕터 2 진입까지 진행된다', () => {
    let n = 0
    for (const p of 'ABCD') for (const k1 of 'ABC') for (const k2 of 'ABCD') for (const k3 of 'ABCD') for (const k4 of 'ABCD') {
      const { s } = play({ 'P-01': p, 'K-01': k1, 'K-02': k2, 'K-03': k3, 'K-04': k4 }, ++n, { stopAt: toCh2 })
      expect(s.scene).toBe('ch2_open')
      expect(s.choices.map((c) => c.id).filter((id) => !/^(H|E|X|C1)-/.test(id))).toEqual(['P-01', 'K-01', 'K-02', 'K-03', 'K-04'])
    }
    expect(n).toBe(768)
  })
  it('능력치 조건 선택지가 챕터 1 안에서 실제 선택으로 열린다(새 초기값 기준)', () => {
    const k02 = (p: string) => visibleKeys(play({ 'P-01': p }, 2, { stopAt: atChoice('K-02') }).s)
    expect(k02('A')).toContain('B') // 지성 10+4=14 ≥ 13
    for (const p of 'BCD') expect(k02(p)).not.toContain('B')
    expect(play({ 'P-01': 'B', 'K-01': 'B' }, 2, { stopAt: toCh2 }).s.knowledge.KN_TENSE).toBe(true) // 통찰 13 ≥ 12
    expect(play({ 'P-01': 'D', 'K-01': 'B' }, 2, { stopAt: toCh2 }).s.knowledge.KN_TENSE).toBeUndefined()
  })
  it('엿듣지 않았다면 "일정을 앞당겨야"를 해리가 말하지 않는다(지식 규칙)', () => {
    expect(play({ 'K-01': 'C' }, 1, { stopAt: toCh2 }).lines.some((l) => /앞당겨야 한다고/.test(l))).toBe(false)
    expect(play({ 'K-01': 'A' }, 1, { stopAt: toCh2 }).lines.some((l) => /앞당겨야 한다고/.test(l))).toBe(true)
  })
  it('K-03의 네 선택은 서로 다른 후속 대사와 영구 플래그를 남긴다', () => {
    const r = (k: string) => play({ 'K-03': k }, 4, { stopAt: toCh2 })
    const t = ['A', 'B', 'C', 'D'].map((k) => r(k).lines.join('|'))
    expect(new Set(t).size).toBe(4)
    expect(r('A').s.flags.FLAG_PUBLIC_RESCUE).toBe(true); expect(r('B').s.flags.FLAG_MOCKED_FALL).toBe(true)
    expect(r('C').s.flags.FLAG_CALLED_TEACHER).toBe(true); expect(r('D').s.flags.FLAG_PRIVATE_HELP).toBe(true)
  })
  it('특별 장면 SS-01(물병)은 K-03 D에서만 발생하고 CG가 기록된다', () => {
    expect(play({ 'K-03': 'D' }, 4, { stopAt: toCh2 }).cgs).toContain('cg_bench_water')
    for (const k of 'ABC') expect(play({ 'K-03': k }, 4, { stopAt: toCh2 }).cgs).not.toContain('cg_bench_water')
  })
  it('공통 이벤트 CG(열차·추락·7층)는 모든 경로에서 경험된다', () => {
    const r = play({}, 5, { stopAt: toCh2 })
    for (const id of ['cg_train_sleeve', 'cg_pitch_fall', 'cg_corridor_faceoff']) expect(r.cgs).toContain(id)
  })
  it('K-04 선택이 다음 날 아침 장면을 다르게 만든다', () => {
    const tail = (k: string) => play({ 'K-04': k }, 6, { stopAt: toCh2 }).lines.filter((l) => /스네이프|빚은|순찰|톱밥은/.test(l)).join('|')
    expect(new Set(['A', 'B', 'C', 'D'].map(tail)).size).toBe(4)
  })
  it('챕터 1에서 관계는 시작 단계에 머문다(끌림≤5, 호감≤20)', () => {
    for (const k of 'ABCD') {
      const { s } = play({ 'K-02': k, 'K-03': 'D', 'K-04': 'B', 'K-01': 'B' }, 7, { stopAt: toCh2 })
      expect(s.emotions.draco.attraction).toBeLessThanOrEqual(5); expect(s.emotions.draco.affinity).toBeLessThanOrEqual(20)
    }
  })
})
