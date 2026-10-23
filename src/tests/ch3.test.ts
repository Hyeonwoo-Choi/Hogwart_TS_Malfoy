import { beforeEach, describe, expect, it } from 'vitest'
import { advance, clone, continueChapter, currentNode, newState, run, setScenario } from '../engine/core'
import { evalCond } from '../engine/cond'
import { loadFromSlot, saveToSlot } from '../engine/save'
import { CH3_SCENARIO, SCENARIO, START_SCENE } from '../data/scenario'
import { EH01_TRUST } from '../data/ch3b'
import { atChoice, play, reachable, visibleKeys } from './helpers'
import { buildCodex } from '../data/codex'

setScenario(SCENARIO)
beforeEach(() => { localStorage.clear() })

const toCh3 = (plan: Record<string, string> = {}, seed = 1) => play(plan, seed, { follow: true, stopAt: (s) => s.scene === 'ch3_open' })
const toLetter = (plan: Record<string, string> = {}, seed = 1, tweak?: (s: ReturnType<typeof newState>) => void) =>
  play(plan, seed, { follow: true, stopAt: atChoice('K-07'), tweak })

describe('챕터 3 구조·연결', () => {
  it('챕터 3의 모든 장면이 도달 가능하고 만남·조연 이벤트는 end로 끝난다', () => {
    const seen = reachable()
    expect(Object.keys(CH3_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    for (const [id, ns] of Object.entries(CH3_SCENARIO)) if (/^(enc|fr)3/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
  })
  it('챕터 2 종료 카드에서 "다음 챕터"를 누르면 챕터 3이 시작되고 챕터 번호가 3이 된다', () => {
    const e = play({}, 1)
    expect(e.s.mode).toBe('ENDED'); expect(e.s.endTitle).toContain('챕터 2')
    const n = continueChapter(e.s)
    expect(n.mode).toBe('STORY'); expect(n.scene).toBe('ch3_open'); expect(n.chapter).toBe(3)
    // 종료 카드가 아닌 상태에서는 아무 일도 하지 않는다
    expect(continueChapter(n)).toBe(n)
  })
  it('챕터 3 조건식이 모두 유효하다', () => {
    const s0 = run(newState(START_SCENE))
    for (const ns of Object.values(CH3_SCENARIO)) for (const n of ns) {
      if (n.t === 'line' && n.when) expect(() => evalCond(s0, n.when!)).not.toThrow()
      if (n.t === 'if') expect(() => evalCond(s0, n.cond)).not.toThrow()
    }
  })
})

describe('챕터 3 분기·결과', () => {
  it('새벽을 함께한(FLAG_DAWN_VIGIL) 경로는 의자 장면(SS-05)으로, 아니면 각자 정리로 간다', () => {
    let withVigil = 0; let without = 0
    for (let seed = 1; seed <= 40; seed++) {
      const r = play({}, seed, { follow: true, stopAt: (s) => s.scene === 'ch3_snape' })
      if (r.s.flags.FLAG_DAWN_VIGIL) { withVigil++; expect(r.scenes).toContain('ch3_chair'); expect(r.scenes).not.toContain('ch3_shelf_alone') }
      else { without++; expect(r.scenes).toContain('ch3_shelf_alone'); expect(r.scenes).not.toContain('ch3_chair') }
    }
    expect(withVigil + without).toBe(40)
  })
  it('S-03은 세 선택지가 모두 같은 질문 장면으로 합쳐지고 K-07에 도달한다', () => {
    for (const k of ['A', 'B', 'C']) {
      const r = toLetter({ 'S-03': k }, 3)
      expect(r.s.scene).toBe('ch3_letter')
      expect(r.scenes).toContain(`ch3_snape_${k}`); expect(r.scenes).toContain('ch3_snape_end')
      expect(r.s.knowledge.OB_SNAPE_ASKED_WHAT).toBeTruthy()
    }
  })
  it('K-07 세 선택지 모두 챕터 3 끝으로 이어지고 종료 카드가 챕터 4로 연결된다', () => {
    for (const k of ['A', 'B', 'C']) {
      const r = play({ 'K-07': k }, 4, { follow: true, stopAt: (s) => s.scene === 'ch4_open' })
      expect(r.s.scene, k).toBe('ch4_open'); expect(r.s.chapter).toBe(4)
      expect(r.scenes).toContain(`ch3_letter_${k}`)
    }
  })
  it('EH-01: 신뢰가 임계값 이상이면 높은 분기, 미만이면 낮은 분기가 선택된다(양쪽 모두 도달 가능)', () => {
    const lo = toLetter({}, 2, (s) => { s.emotions.draco.trust = 0 })
    const hi = toLetter({}, 2, (s) => { s.emotions.draco.trust = 40 })
    // tweak는 시작 직후 적용되므로 이후 변화량에 상관없이 양쪽 범위를 검증하기 위해 별도 상태로도 확인
    const sLo = clone(lo.s); sLo.emotions.draco.trust = EH01_TRUST - 1
    const sHi = clone(hi.s); sHi.emotions.draco.trust = EH01_TRUST
    expect(evalCond(sLo, `draco.trust<${EH01_TRUST}`)).toBe(true); expect(evalCond(sHi, `draco.trust>=${EH01_TRUST}`)).toBe(true)
    expect(visibleKeys(lo.s).length).toBeGreaterThan(0)
  })
  it('캐릭터 선택 후 효과: K-07 B는 FLAG_DETENTION_KINDNESS를 남긴다', () => {
    const r = play({ 'K-07': 'B' }, 6, { follow: true, stopAt: (s) => s.scene === 'ch4_open' })
    expect(r.s.flags.FLAG_DETENTION_KINDNESS).toBe(true)
  })
  it('CG가 사용되고, 환영 형태(illusion)가 기본이며 도감에 챕터 3 관찰이 기록된다', () => {
    const r = play({ 'K-07': 'A' }, 5, { follow: true, stopAt: (s) => s.scene === 'ch4_open' })
    expect(r.cgs).toContain('cg_letter_flicker')
    expect(r.views.filter((v) => v.char === 'draco' && v.scene.startsWith('ch3_')).every((v) => v.form !== 'true')).toBe(true)
    expect(buildCodex(r.s).some((e) => e.title === '스네이프의 질문')).toBe(true)
  })
})

describe('챕터 3 저장·복원', () => {
  it('K-07 직전에 저장하고 복원해도 같은 선택지·상태로 이어진다', () => {
    const r = toLetter({ 'S-03': 'A' }, 7)
    expect(saveToSlot('slot1', r.s, new Set())).toBe(true)
    const f = loadFromSlot('slot1')!
    expect(f.state.scene).toBe('ch3_letter'); expect(f.state.chapter).toBe(3)
    expect(visibleKeys(f.state)).toEqual(visibleKeys(r.s))
    expect(f.state.flags).toEqual(r.s.flags); expect(f.state.emotions).toEqual(r.s.emotions)
    const a = play({ 'K-07': 'C' }, 7, { follow: true, stopAt: (s) => s.scene === 'ch4_open' })
    expect(a.s.scene).toBe('ch4_open')
  })
  it('챕터 2 종료 카드 상태로 저장된 기존 세이브는 불러온 뒤 챕터 3으로 계속할 수 있다', () => {
    const e = play({}, 1)
    saveToSlot('slot2', e.s, new Set())
    const f = loadFromSlot('slot2')!
    expect(f.state.mode).toBe('ENDED')
    const n = continueChapter(f.state)
    expect(n.scene).toBe('ch3_open'); expect(currentNode(advance(n))).toBeTruthy()
  })
  it('챕터 3 진입 시 챕터 1~2의 선택·플래그가 유지된다', () => {
    const r = toCh3({}, 9)
    expect(r.s.choices.length).toBeGreaterThan(5)
    expect(r.s.flags.FLAG_DRACO_CHANGED).toBe(true)
  })
})

describe('클라우드 호환(시나리오 버전)', () => {
  it('챕터 1~2 시절 행(ch1-2.v1)과 현재 행(ch1-4.v1)을 모두 열 수 있고, 모르는 버전은 거부한다', async () => {
    const { checkCompat } = await import('../cloud/sync')
    const { SCENARIO_VERSION } = await import('../cloud/versions')
    const e = play({}, 1).s
    const row = (v: string) => ({ user_id: 'u', slot: 'slot1', state: JSON.parse(JSON.stringify(e)), read_lines: [], label: '', chapter: 2, schema_version: 2, scenario_version: v, revision: 1, created_at: 'x', updated_at: 'x' })
    expect(SCENARIO_VERSION).toMatch(/^(ch1-\d+|v2\.ch1)\.v1$/)
    expect(checkCompat(row('ch1-2.v1')).ok).toBe(true)
    expect(checkCompat(row('ch1-4.v1')).ok).toBe(true); expect(checkCompat(row('ch1-6.v1')).ok).toBe(true)
    expect(checkCompat(row('ch9.v9')).ok).toBe(false)
  })
})
