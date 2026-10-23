import { describe, expect, it } from 'vitest'
import { evalCond } from '../engine/cond'
import { advance, choose, currentNode, newState, run } from '../engine/core'
import { CH2_SCENARIO, SCENARIO, START_SCENE } from '../data/scenario'
import { SPECIAL_SCENES } from '../data/romance'
import type { GameState, LineNode } from '../engine/types'
import { atChoice, play, reachable, visibleKeys, type Policy } from './helpers'

describe('챕터 2 구조', () => {
  it('챕터 2 모든 장면이 도달 가능하고 "챕터 2 · 균열"로 끝난다', () => {
    const seen = reachable()
    expect(Object.keys(CH2_SCENARIO).filter((id) => !seen.has(id))).toEqual([])
    const r = play({}, 1); expect(r.s.mode).toBe('ENDED'); expect(r.s.endTitle).toContain('챕터 2 · 균열')
  })
  it('챕터 2 종료 카드는 챕터 3으로 이어진다', () => {
    expect(SCENARIO.ch3_open).toBeDefined()
    expect(reachable().has('ch3_open')).toBe(true)
  })
  it('만남·조연 이벤트는 end로 끝나고 조건식은 유효하다', () => {
    const s0 = run(newState(START_SCENE))
    for (const [id, ns] of Object.entries(CH2_SCENARIO)) {
      if (/^(enc2|fr2)/.test(id)) expect(ns[ns.length - 1].t, id).toBe('end')
      for (const n of ns) {
        const c: string[] = []
        if (n.t === 'line' && n.when) c.push(n.when); if (n.t === 'if') c.push(n.cond)
        for (const x of c) expect(() => evalCond(JSON.parse(JSON.stringify(s0)), x), `${id}: ${x}`).not.toThrow()
      }
    }
  })
  it('서술은 1인칭이다', () => {
    const narr = Object.values(CH2_SCENARIO).flat().filter((n): n is LineNode => n.t === 'line' && !n.who)
    expect(narr.filter((n) => /해리(는|의|가) /.test(n.text)).map((n) => n.text)).toEqual([])
  })
})

describe('변화 사건과 외형 표시 규칙', () => {
  it('사고 이전 드레이코는 항상 기본 외형이고, 변화 지식은 없다', () => {
    const r = play({}, 2, { stopAt: (s) => s.scene === 'ch2_after' })
    expect(r.views.filter((v) => v.char === 'draco').every((v) => v.form === 'base')).toBe(true)
    expect(r.s.flags.FLAG_DRACO_CHANGED).toBeUndefined(); expect(r.s.knowledge.KN_TRANSFORMATION).toBeUndefined()
  })
  it('진짜 모습(true)은 사고 직후·새벽 등 명시 장면에서만, 공개 장소(아침 식탁)에서는 환영으로 표시된다', () => {
    // 사고 직후 같은 복도의 사적 장면(반응·환영 시전 전)과 새벽만 허용
    const allowed = new Set(['ch2_after', 'ch2_s01_A', 'ch2_s01_B', 'ch2_s01_C', 'ch2_s01_D', 'ch2_illusion', 'ch2_dawn'])
    for (const s01 of 'ABCD') {
      const r = play({ 'S-01': s01, 'K-03': 'D' }, 3)
      const trueScenes = new Set(r.views.filter((v) => v.char === 'draco' && v.form === 'true').map((v) => v.scene))
      for (const sc of trueScenes) expect(allowed.has(sc), sc).toBe(true)
      expect(r.views.filter((v) => v.scene === 'ch2_morning' && v.char === 'draco').every((v) => v.form === 'illusion')).toBe(true)
      expect(r.s.flags.FLAG_DRACO_CHANGED).toBe(true); expect(r.s.knowledge.KN_TRANSFORMATION).toBe(true); expect(r.s.knowledge.KN_ILLUSION).toBe(true)
      expect(r.s.emotions.draco.acceptance).toBeLessThanOrEqual(10)
    }
  })
  it('사고 장면 첫 반응은 존경/경계 상태에 따라 달라진다(감정 → 실제 대사)', () => {
    const first = (tweak: (s: GameState) => void) => {
      let s = play({}, 4, { stopAt: (st) => st.scene === 'ch2_night' }).s
      tweak(s)
      const out: string[] = []
      for (let i = 0; i < 40 && s.scene === 'ch2_night'; i++) { const n = currentNode(s); if (n?.t !== 'line') break; out.push(n.text); s = advance(s) }
      return out.join('|')
    }
    expect(first((s) => { s.emotions.draco.respect = 30 })).toContain('물러서!')
    expect(first((s) => { s.emotions.draco.respect = 20; s.emotions.draco.wariness = 75 })).toContain('거기 서!')
    expect(first((s) => { s.emotions.draco.respect = 20; s.emotions.draco.wariness = 60 })).toContain('저리 가!')
  })
})

describe('S-01·S-02: 비밀 공유와 그 대가', () => {
  it('S-01 네 대응은 서로 다른 플래그·자율성 변화·후속 대사를 남긴다', () => {
    const r = (k: string) => play({ 'S-01': k }, 5)
    const A = r('A'), B = r('B'), C = r('C'), D = r('D')
    expect(A.s.flags.FLAG_PUSHED_INFIRMARY).toBe(true); expect(B.s.flags.FLAG_SECRET_PROMISED).toBe(true); expect(B.s.promises).toContain('SECRET_KEPT')
    expect(C.s.flags.FLAG_DEMANDED_TRUTH).toBe(true); expect(D.s.flags.FLAG_HARRY_APOLOGIZED).toBe(true)
    expect(A.s.emotions.draco.autonomy).toBeLessThan(B.s.emotions.draco.autonomy)
    expect(A.lines.join('|')).toContain('다음은 바닥이 아니야'); expect(C.lines.join('|')).toContain('넌 내 적이야')
    expect(new Set([A, B, C, D].map((x) => x.lines.slice(-6).join('|'))).size).toBe(4) // 마지막 대사까지 다르다
  })
  it('S-01 A(의무실 고집)는 환영 장면·새벽 장면 없이 혼자 남는다', () => {
    const A = play({ 'S-01': 'A', 'K-03': 'D' }, 6)
    expect(A.scenes).toContain('ch2_flee'); expect(A.scenes).not.toContain('ch2_dawn'); expect(A.scenes).not.toContain('ch2_illusion')
  })
  it('S-02: A는 시선을 돌려 노출을 막지만 자율성이 줄고, B는 판시가 눈치채며 노출도가 오른다', () => {
    const a = play({ 'S-02': 'A' }, 7).s, b = play({ 'S-02': 'B' }, 7).s
    expect(a.flags.FLAG_COVERED_ILLUSION).toBe(true); expect(b.flags.FLAG_PANSY_NOTICED).toBe(true)
    expect(b.emotions.draco.exposure).toBeGreaterThan(a.emotions.draco.exposure)
    expect(a.emotions.draco.autonomy).toBeLessThan(b.emotions.draco.autonomy)
  })
  it('사고 직후·아침 장면에서 관계가 급진전하지 않는다(끌림≤8, 신뢰≤20)', () => {
    for (const s01 of 'ABCD') for (const k3 of 'AD') {
      const { s } = play({ 'S-01': s01, 'K-03': k3, 'K-05': 'C', 'K-06': 'A' }, 8)
      expect(s.emotions.draco.attraction).toBeLessThanOrEqual(8); expect(s.emotions.draco.trust).toBeLessThanOrEqual(20)
    }
  })
})

describe('특별 장면·서비스씬: 조건 충족/비충족 경로', () => {
  it('레지스트리의 조건식은 시나리오의 실제 분기 조건과 일치한다', () => {
    const conds = new Set(Object.values(SCENARIO).flat().filter((n) => n.t === 'if').map((n) => (n as { cond: string }).cond))
    for (const sc of SPECIAL_SCENES) if (!/선택/.test(sc.triggerCondition)) expect(conds.has(sc.triggerCondition), sc.sceneId).toBe(true)
  })
  it('SS-04 새벽: 약속(B)+신뢰 충분이면 발생, 신고(K-04A)로 신뢰가 낮으면 대체 장면', () => {
    const ok = play({ 'S-01': 'B', 'K-04': 'B' }, 9)
    expect(ok.scenes).toContain('ch2_dawn'); expect(ok.cgs).toContain('cg_dawn_cloak')
    expect(ok.s.flags.FLAG_DAWN_VIGIL).toBe(true); expect(ok.s.flags.FLAG_CLOAK_LENT).toBe(true)
    const low = play({ 'S-01': 'B', 'K-04': 'A', 'K-03': 'A' }, 9)
    expect(low.scenes).toContain('ch2_alone'); expect(low.scenes).not.toContain('ch2_dawn')
    expect(low.cgs).not.toContain('cg_dawn_cloak')
  })
  it('SS-04: 사과(D)는 신뢰가 쌓였을 때(K-03D)만 새벽으로, 추궁(C)은 항상 대체 장면', () => {
    expect(play({ 'S-01': 'D', 'K-03': 'D', 'K-04': 'B' }, 10).scenes).toContain('ch2_dawn')
    expect(play({ 'S-01': 'D', 'K-03': 'A', 'K-04': 'B' }, 10).scenes).toContain('ch2_alone')
    expect(play({ 'S-01': 'C', 'K-03': 'D', 'K-04': 'B' }, 10).scenes).toContain('ch2_alone')
  })
  it('SS-04 장면 안에서도 거리·거절이 유지된다(동의와 자율성)', () => {
    const t = play({ 'S-01': 'B', 'K-04': 'B' }, 9).lines.join('|')
    expect(t).toContain('거기까지.'); expect(t).toContain('고마워하지도 않을 거야')
  })
  it('SS-02 공연이 끝난 뒤: 직접 말을 건넸다면 발생, 아니면 차가운 대체 장면', () => {
    expect(play({ 'K-05': 'C' }, 11).scenes).toContain('ch2_mask')
    expect(play({ 'K-05': 'A', 'K-02': 'C', 'K-01': 'C' }, 11).scenes).toContain('ch2_mask_cold')
  })
  it('SS-03 라이벌의 인정: K-06 A에서만, 반칙·봐주기는 경멸 반응', () => {
    expect(play({ 'K-06': 'A' }, 12).scenes).toContain('ch2_rival_nod_scene')
    for (const k of 'BC') expect(play({ 'K-06': k }, 12).scenes).not.toContain('ch2_rival_nod_scene')
  })
})

describe('능력치 성장 경로와 도달성', () => {
  const runP = (p: Policy, prologue = 'A') => play({ 'P-01': prologue, 'K-03': 'A' }, 13, { policy: p })
  it('모든 특화형/균형형 경로가 챕터 2 끝까지 진행된다(낮은 능력치로 진행 불가 없음)', () => {
    for (const p of ['study', 'train', 'quidditch', 'talk', 'rest', 'balanced'] as Policy[]) expect(runP(p).s.mode, p).toBe('ENDED')
  })
  it('판정 조건마다 통과하는 경로와 통과하지 못하는 경로가 모두 있다(정답 성장 유형 없음)', () => {
    const at = (p: Policy, pro: string, id: string) => play({ 'P-01': pro, 'K-03': 'A' }, 13, { policy: p, stopAt: (s) => s.scene === id }).s.stats
    // K-06 A 승부(체력≥20): 퀴디치형 통과 / 학구형 미통과
    expect(at('quidditch', 'C', 'ch2_match').str).toBeGreaterThanOrEqual(20)
    expect(at('study', 'A', 'ch2_match').str).toBeLessThan(20)
    // 사고 직후 의식(마법≥22): 훈련형 통과 / 사교형 미통과
    expect(at('train', 'C', 'ch2_night').magic).toBeGreaterThanOrEqual(22)
    expect(at('talk', 'D', 'ch2_night').magic).toBeLessThan(22)
    // K-05 A 소문 해명(사교≥14 확정 통과): 대화형 통과 / 휴식형 미통과
    expect(at('talk', 'D', 'ch2_dinner').social).toBeGreaterThanOrEqual(14)
    expect(at('rest', 'B', 'ch2_dinner').social).toBeLessThan(14)
  })
  it('선택 조합(K-03×K-04×K-05×K-06×S-01×S-02, 192가지 표본)이 모두 끝까지 진행된다', () => {
    let n = 0
    for (const k3 of 'AD') for (const k4 of 'ABCD') for (const k5 of 'AC') for (const k6 of 'ABC') for (const s1 of 'ABCD') {
      n++; const s2 = n % 2 ? 'A' : 'B'
      const r = play({ 'K-03': k3, 'K-04': k4, 'K-05': k5, 'K-06': k6, 'S-01': s1, 'S-02': s2 }, n)
      expect(r.s.mode).toBe('ENDED')
    }
    expect(n).toBe(192)
  })
  it('K-05 소문 분기: 소문 조건이면 해명 선택지, 아니면 자리 배정', () => {
    const at = (plan: Record<string, string>) => play(plan, 14, { stopAt: atChoice('K-05') }).s
    expect((currentNode(at({ 'K-03': 'A' })) as { options: { text: string }[] }).options[0].text).toContain('사실과 다릅니다')
    expect((currentNode(at({ 'K-03': 'C', 'K-04': 'B' })) as { options: { text: string }[] }).options[0].text).toContain('맞은편')
    expect(visibleKeys(at({ 'K-03': 'A' }))).toEqual(['A', 'B', 'C'])
  })
  it('론의 일상(신뢰)이 경기의 첫 세이브 장면을 바꾼다', () => {
    const r = play({}, 15, { stopAt: atChoice('K-06') })
    expect(r.lines.some((l) => l.includes('손끝을 스치며'))).toBe(r.s.emotions.ron.trust >= 62)
  })
  it('choose 이후 감정 변화가 같은 장면의 판정보다 먼저 적용되는 분기가 없다(S-01 B의 신뢰는 반응 대사 뒤)', () => {
    let s = play({ 'K-04': 'B' }, 16, { stopAt: atChoice('S-01') }).s
    const t0 = s.emotions.draco.trust
    s = choose(s, 'B')
    expect(s.emotions.draco.trust).toBe(t0) // 반응 대사 중에는 아직 반영 전
  })
})
