import { describe, expect, it } from 'vitest'
import { applyEffects, clone, newState } from '../engine/core'
import { evalCond } from '../engine/cond'
import { REACTION_CODE, reactionOf } from '../engine/reactions'
import { validateSave } from '../engine/save'
import { buildCodex } from '../data/codex'
import { START_SCENE } from '../data/scenario'
import './helpers'

const fresh = () => newState(START_SCENE)

describe('지식 단계(know)', () => {
  it('기본값은 0이고, 효과로 0~4 범위에서만 바뀐다', () => {
    const s = fresh()
    expect(evalCond(s, 'know.pansy == 0')).toBe(true)
    applyEffects(s, ['know:pansy=1'])
    expect(evalCond(s, 'know.pansy == 1')).toBe(true)
    applyEffects(s, ['know:pansy+2'])
    expect(s.bonds!.pansy.know).toBe(3)
    applyEffects(s, ['know:pansy+4', 'know:ron+1'])
    expect(s.bonds!.pansy.know).toBe(4)
    expect(evalCond(s, 'know.ron >= 1')).toBe(true)
    applyEffects(s, ['know:pansy-4', 'know:pansy-1'])
    expect(s.bonds!.pansy.know).toBe(0)
    expect(() => applyEffects(s, ['know:pansy=5'])).toThrow()
    expect(() => applyEffects(s, ['know:nobody=1'])).toThrow()
  })

  it('know 필드가 없는 이전 상태는 0으로 읽는다', () => {
    const s = fresh()
    delete s.bonds!.luna.know
    expect(evalCond(s, 'know.luna == 0')).toBe(true)
    expect(evalCond(s, 'know.unknown == 0')).toBe(true)
  })

  it('비공략 인물(론)에는 연애·다자 효과를 적용할 수 없다', () => {
    const s = fresh()
    expect(() => applyEffects(s, ['romance:ron=open'])).toThrow()
    expect(() => applyEffects(s, ['poly:ron=asked'])).toThrow()
    applyEffects(s, ['stage:ron+1'])
    expect(evalCond(s, 'partners == 0')).toBe(true)
  })
})

describe('저장 호환(know 보정)', () => {
  const asFile = (s: ReturnType<typeof fresh>) => ({ schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: s })
  const legacy = (mod?: (s: ReturnType<typeof fresh>) => void) => {
    const s = clone(fresh())
    s.scene = 'ch2_open'; s.chapter = 2
    for (const b of Object.values(s.bonds!)) delete b.know
    mod?.(s)
    return validateSave(JSON.parse(JSON.stringify(asFile(s)))).state
  }

  it('이전 저장은 전원 know 0으로 이어진다', () => {
    const s = legacy()
    for (const b of Object.values(s.bonds!)) expect(b.know).toBe(0)
  })

  it('챕터 2 S-02 B(판시가 환영의 흔들림을 봄) 이력이 있으면 판시만 1로 보정한다', () => {
    const s = legacy((x) => { x.choices.push({ id: 'S-02', option: 'B', scene: 'ch2_x', date: '09-29' }) })
    expect(s.bonds!.pansy.know).toBe(1)
    expect(s.bonds!.hermione.know).toBe(0)
    const t = legacy((x) => { x.choices.push({ id: 'S-02', option: 'A', scene: 'ch2_x', date: '09-29' }) })
    expect(t.bonds!.pansy.know).toBe(0)
  })

  it('이미 know가 있는 저장은 덮어쓰지 않는다', () => {
    const s = clone(fresh()); s.scene = 'ch2_open'; s.chapter = 2
    s.bonds!.luna.know = 2
    const out = validateSave(JSON.parse(JSON.stringify(asFile(s)))).state
    expect(out.bonds!.luna.know).toBe(2)
  })
})

describe('히로인 반응 훅', () => {
  const witnessed = (observer: string, subject: string, stage: number, romance = 'none') => {
    const s = fresh()
    s.calendar.date = '09-05'
    s.bonds![observer].stage = stage
    s.bonds![observer].romance = romance as never
    applyEffects(s, [`meet:${subject}@${observer}`])
    return s
  }

  it('목격하지 않은 사건에는 반응하지 않는다', () => {
    const s = fresh(); s.calendar.date = '09-05'
    applyEffects(s, ['meet:ginny'])
    expect(reactionOf(s, 'hermione', 'ginny')).toBe('none')
    expect(evalCond(s, 'REACT_hermione_ginny == 0')).toBe(true)
  })

  it('목격 기간(3일)이 지나면 반응이 사라진다', () => {
    const s = witnessed('hermione', 'ginny', 2)
    expect(reactionOf(s, 'hermione', 'ginny')).toBe('hurt')
    s.calendar.date = '09-09'
    expect(reactionOf(s, 'hermione', 'ginny')).toBe('none')
  })

  it('같은 사건이어도 단계·연애 상태에 따라 반응이 다르다', () => {
    expect(reactionOf(witnessed('hermione', 'ginny', 1), 'hermione', 'ginny')).toBe('curiosity')
    expect(reactionOf(witnessed('hermione', 'ginny', 3), 'hermione', 'ginny')).toBe('curiosity')
    expect(reactionOf(witnessed('hermione', 'ginny', 3, 'open'), 'hermione', 'ginny')).toBe('jealousy')
    expect(reactionOf(witnessed('ginny', 'luna', 2), 'ginny', 'luna')).toBe('rivalry')
    expect(reactionOf(witnessed('luna', 'pansy', 2), 'luna', 'pansy')).toBe('curiosity')
  })

  it('비로맨스 경로에서는 질투가 아닌 대체 반응만 나온다', () => {
    for (const who of ['hermione', 'ginny', 'luna', 'pansy']) for (const st of [0, 1, 2, 3]) {
      const other = who === 'ginny' ? 'luna' : 'ginny'
      for (const rom of ['none', 'declined', 'ended']) expect(reactionOf(witnessed(who, other, st, rom), who, other)).not.toBe('jealousy')
    }
  })

  it('단계 0은 무관심, 드레이코·자기 자신은 이 표의 대상이 아니다', () => {
    expect(reactionOf(witnessed('pansy', 'ginny', 0), 'pansy', 'ginny')).toBe('indifference')
    expect(reactionOf(witnessed('draco', 'ginny', 3), 'draco', 'ginny')).toBe('none')
    expect(reactionOf(witnessed('ginny', 'ginny', 3), 'ginny', 'ginny')).toBe('none')
  })

  it('조건식 REACT_*가 코드 값으로 평가된다', () => {
    const s = witnessed('hermione', 'ginny', 3, 'open')
    expect(evalCond(s, `REACT_hermione_ginny == ${REACTION_CODE.jealousy}`)).toBe(true)
  })
})

describe('도감 관계 항목', () => {
  it('합의된 상태만 문장으로 기록하고 지식 단계·내부 ID는 노출하지 않는다', () => {
    const s = fresh()
    applyEffects(s, ['meet:luna', 'meet:hermione', 'meet:pansy', 'romance:luna=open', 'poly:luna=accepted', 'poly:hermione=declined', 'know:pansy=3', 'meet:ron'.replace('ron', 'ginny')])
    const rel = buildCodex(s).filter((e) => e.category === '관계')
    const text = (name: string) => rel.find((e) => e.title === name)!.text
    expect(text('루나')).toContain('마음을 열어')
    expect(text('루나')).toContain('받아들이기로')
    expect(text('헤르미온느')).toContain('원하지 않는다')
    const all = JSON.stringify(rel)
    expect(all).not.toMatch(/know|pansy|hermione|stage|romance/)
    expect(text('판시')).not.toMatch(/환영|변신|비밀/)
  })
})

describe('챕터 1 보강(론 공지·판시 위계)', () => {
  it('H-01 세 갈래 모두 론의 키퍼 공지 장면을 거쳐 마법약 수업으로 이어진다', async () => {
    const { SCENARIO } = await import('../data/scenario')
    for (const k of ['A', 'B', 'C']) expect(JSON.stringify(SCENARIO[`v2c1_hall_pansy_${k}`])).toContain('v2c1_hall_ron')
    for (const k of ['A', 'B', 'C']) expect(JSON.stringify(SCENARIO[`v2c1_hall_ron_${k}`])).toContain('v2c1_potions')
    const opts = (SCENARIO.v2c1_hall_ron.find((n) => n.t === 'choice') as { options: { key: string; fx?: string[] }[] }).options
    expect(opts.map((o) => o.key)).toEqual(['A', 'B', 'C'])
    expect(opts.every((o) => (o.fx ?? []).every((f) => f.startsWith('ron.')))).toBe(true)
  })
})
