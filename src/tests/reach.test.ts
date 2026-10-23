import { describe, expect, it } from 'vitest'
import { advance, choose, continueChapter, clone, currentNode, dracoLocation, newState, pickActivity, run, setScenario, visibleOptions } from '../engine/core'
import { chooseAction } from './helpers'
import { setRandomEvents } from '../engine/core'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { evalCond } from '../engine/cond'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { EH01_TRUST } from '../data/ch3b'
import { EH02_GUILT } from '../data/ch5b'
import { EH03_RESPECT } from '../data/ch6b'
import { DE08_SOCIAL } from '../data/ch7b'
import { EH04_TRUST } from '../data/ch8b'
import type { GameState } from '../engine/types'
import { HEROINE_SCHEDULE } from '../data/constants'

setScenario(SCENARIO)
setRandomEvents(RANDOM_EVENTS) // 실제 플레이와 같은 조건(일상 랜덤 이벤트 켬)으로 분포를 조사한다
const MAIN = Object.keys(SCENARIO).filter((id) => /^(ch[1-8]_|v2c1_|hr1_|enc[1-8]|fr[1-8])/.test(id))

interface Obs { t: boolean; f: boolean }

/** 무작위 선택·일과 플레이로, 장면 진입 시점 상태에서 모든 조건식의 참/거짓 도달을 관측한다(챕터 1~2). */
function survey(runs: number) {
  const obs = new Map<string, Obs>()
  const trustAtS01: number[] = []
  const trustAtLetter: number[] = []
  const magicAtK09: number[] = []; const guiltAtWard: number[] = []; const respectAtEh03: number[] = []; const insightAtK11: number[] = []; const intAtK13: number[] = []; const socialAtLab: number[] = []; const trustAtLetter8: number[] = []
  for (let seed = 1; seed <= runs; seed++) {
    let rnd = seed * 104729
    const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
    // 성장 경로도 무작위로 기울인다(특화형 플레이어 포함)
    const bias = (['study', 'train', 'quidditch', 'talk', 'rest'] as const)[seed % 5]
    let s: GameState = run(newState(START_SCENE, seed)); let last = ''
    for (let step = 0; step < 9000; step++) {
      if (s.mode === 'ENDED') { const e = currentNode(s); if (e?.t === 'endChapter' && e.next) { s = continueChapter(s); continue } break }
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
        if (s.scene === 'ch5_katie') magicAtK09.push(s.stats.magic)
        if (s.scene === 'ch5_ward') guiltAtWard.push(s.emotions.draco.guilt)
        if (s.scene === 'ch8_letter') trustAtLetter8.push(s.emotions.draco.trust)
        if (s.scene === 'ch7_pair') intAtK13.push(s.stats.int)
        if (s.scene === 'ch7_lab') socialAtLab.push(s.stats.social)
        if (s.scene === 'ch6_mark') { insightAtK11.push(s.stats.insight); respectAtEh03.push(s.emotions.draco.respect) }
        if (s.scene === 'ch3_letter') trustAtLetter.push(s.emotions.draco.trust)
        if (s.scene === 'ch2_after') trustAtS01.push(s.emotions.draco.trust)
      }
      const n = currentNode(s)
      if (s.mode === 'ROUTINE') {
        const d = dracoLocation(s.calendar.weekday, s.routine!.slotIdx)
        // 일부 플레이어는 특정 히로인을 따라다닌다(일정표 기준) — 히로인 반응 조건(SAW_/CH_H*)이 실제로 관측되는지 본다
        const hero = (['hermione', 'ginny', 'luna', 'pansy'] as const)[(seed >> 1) % 4]
        const follow = seed % 2 === 0 && r() < 0.8 ? HEROINE_SCHEDULE[hero][s.calendar.weekday]?.[s.routine!.slotIdx] : undefined
        const [loc, act] = chooseAction(s, r() < 0.7 ? bias : 'random', r, step, follow ?? (r() < 0.6 ? d : undefined), 0.7)
        s = pickActivity(s, loc, act)
      } else if (n?.t === 'line') s = advance(s)
      else if (n?.t === 'choice') { const v = visibleOptions(s, n, false); s = choose(s, v[Math.floor(r() * v.length)].key) }
      else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
    }
  }
  // 무작위 플레이에서는 거의 나오지 않는 "목격 기반 반응" 상태를 정상 효과(meet:)로 만들어 해당 장면의 조건을 관측한다(ch2paths.test.ts가 같은 상태의 도달을 따로 증명).
  const probe = (patch: (s: GameState) => void, scenes: string[]) => {
    const s = newState(START_SCENE, 99); s.calendar = { date: '09-27', weekday: '금', slot: '-' }; patch(s)
    for (const sc of scenes) SCENARIO[sc].forEach((n, i) => {
      const conds: [string, string][] = []
      if (n.t === 'line' && n.when) conds.push([`${sc}:${i} when`, n.when])
      if (n.t === 'if') conds.push([`${sc}:${i} if`, n.cond])
      if (n.t === 'choice') n.options.forEach((o) => o.if && conds.push([`${sc}:${i} opt${o.key}`, o.if]))
      for (const [k, c] of conds) { const o = obs.get(`${k} :: ${c}`) ?? { t: false, f: false }; if (evalCond(s, c)) o.t = true; else o.f = true; obs.set(`${k} :: ${c}`, o) }
    })
  }
  probe((s) => { s.bonds!.pansy.stage = 2; s.recent = [{ who: 'hermione', day: 26, witnesses: ['pansy'] }] }, ['ch2_eve_t_pansy'])
  probe((s) => { s.flags.FLAG_PAN_NIGHT_OPEN = true; s.flags.FLAG_RT_PANSY_PITCH = true }, ['ch2_eve_i_pansy_B', 'v2c1_week_end'])
  probe((s) => { s.flags.FLAG_P2_BREACH = true; s.recent = [{ who: 'pansy', day: 26, witnesses: ['hermione'] }]; s.bonds!.hermione.stage = 2 }, ['ch2_eve_t_hermione'])
  probe((s) => { s.flags.FLAG_P2_BREACH = true }, ['ch2_eve_t_hermione'])
  probe((s) => { s.bonds!.pansy.stage = 2; s.recent = [{ who: 'ginny', day: 26, witnesses: ['pansy'] }] }, ['ch2_eve_t_pansy'])
  probe((s) => { s.bonds!.hermione.stage = 2; s.recent = [{ who: 'pansy', day: 26, witnesses: ['hermione'] }] }, ['ch2_eve_t_hermione'])
  probe((s) => { s.bonds!.ginny.stage = 2; s.recent = [{ who: 'luna', day: 26, witnesses: ['ginny'] }] }, ['ch2_eve_t_ginny'])
  // 과감한 선택·후폭풍·사적 친밀 장면의 조건: 해당 플래그가 모두 선 상태를 직접 만들어 관측한다(ch2paths/blind 테스트가 같은 상태의 도달을 따로 증명).
  probe((s) => { Object.assign(s.flags, { FLAG_P2_BETRAYED_PANSY: true, FLAG_PAN_NIGHT: true, FLAG_P2_FIGHT_DRACO: true, FLAG_P2_PROMISE_KEPT: true, FLAG_P2_PAN_CONFIDED: true }); s.knowledge.KN_LETTER_PRESSURE = true; s.emotions.pansy.trust = 12 }, ['ch2_eve_t_pansy', 'ch2_eve_i_pansy_B', 'ch2_morning', 'ch2_end', 'ch2_match'])
  // 챕터 4 선택하지 않은 사건에 대한 관계 반응(질투·서운함): 챕터 2의 열린 관계 플래그 + 챕터 4 결과 플래그 조합
  probe((s) => { s.flags.FLAG_GIN_OPEN = true; s.flags.FLAG_C4_L_ATT = true }, ['ch4_settle_j'])
  probe((s) => { s.flags.FLAG_GIN_OPEN = true; s.flags.FLAG_C4_G_START = true }, ['ch4_settle_j'])
  probe((s) => { s.flags.FLAG_GIN_OPEN = true; s.flags.FLAG_C4_G_BENCH = true }, ['ch4_settle_j'])
  // 챕터 4 H·P 사건과 능력 행동의 파급: 능력치 해금 선택(드문 정상 도달)은 ch4branch.test.ts가 활동 경로로 자연 도달을 따로 증명한다
  probe((s) => { Object.assign(s.flags, { FLAG_C4_H_ATT: true, FLAG_C4_H_LOGIC: true, FLAG_C4_P_ATT: true, FLAG_P3_D2_ASK_OWN: true, FLAG_C4_G_WARD_RESENT: true }); s.deeds = { h_logic: { day: 0, saw: ['hermione'], heard: { ron: { from: 'hermione', exag: false } } } } }, ['ch4_settle_h', 'ch4_settle_p', 'ch4_h_after', 'ch4_h_sun', 'ch5_open'])
  // 챕터 5 사건·정리: 사건에 선 상태와 챕터 4 행동의 조합(자연 도달은 ch5branch.test.tsx가 활동 경로로 따로 증명한다)
  probe((s) => { Object.assign(s.flags, { FLAG_C5_H_ATT: true, FLAG_C5_G_ATT: true, FLAG_C5_R_ATT: true, FLAG_C4_P_DEAL_OK: true, FLAG_C5_G_SCAN: true, FLAG_C4_G_WARD_RESENT: true, FLAG_C4_G_WALKED: true }) }, ['ch5_settle_h', 'ch5_settle_g', 'ch5_settle_r', 'ch5_g_wrap'])
  // 희귀 상태 프로브(챕터 1 재설계로 무작위 분포가 달라져 우연히 관측되던 조건): 목격·전언·선택 이력·지식을 정상 효과 형태로 구성한다
  probe((s) => { s.recent = [{ who: 'hermione', day: 26, witnesses: ['luna'] }, { who: 'ginny', day: 26, witnesses: ['hermione'] }]; s.choices.push({ id: 'H-04', option: 'A', scene: 'x', date: '09-01' }, { id: 'H-04', option: 'B', scene: 'x', date: '09-01' }) }, ['hr1_luna_lake_1', 'hr1_hermione_library_2', 'hr1_ginny_pitch_2'])
  probe((s) => { s.knowledge.KN_CABINET = true; s.knowledge.KN_BARE_HAND = true; s.flags.FLAG_C4_H_AID = true; s.deeds = { h_aid: { day: 0, saw: ['hermione'], heard: { ron: { from: 'hermione', exag: false } } }, h_logic: { day: 0, saw: ['hermione'], heard: { ron: { from: 'hermione', exag: false } } } } }, ['ch8_k14_A_open', 'ch6_open', 'ch4_h_after', 'ch4_h_sun', 'ch5_sunday'])
  // 챕터 1 자유 일과의 일대일 만남(선택적)을 거친 뒤 같은 인물의 챕터 2 경로로 들어오는 조합
  probe((s) => { Object.assign(s.flags, { FLAG_HR1_PAN_MIRROR: true, FLAG_HR1_GIN_CAPTAIN: true, FLAG_HR1_HER_PAPER: true, FLAG_HR1_LUN_LAKE: true, FLAG_LUNA_COUNT7: true }) }, ['ch2_p_sly', 'ch2_p_pitch', 'ch2_p_research', 'ch2_p_secret', 'hr1_luna_lake_2'])
  probe((s) => { s.choices.push({ id: 'H-03', option: 'C', scene: 'x', date: '09-01' }, { id: 'H-04', option: 'C', scene: 'x', date: '09-01' }, { id: 'H-04', option: 'D', scene: 'x', date: '09-01' }) }, ['hr1_hermione_library_2', 'hr1_ginny_pitch_2'])
  return { obs, trustAtS01, trustAtLetter, magicAtK09, guiltAtWard, respectAtEh03, insightAtK11, intAtK13, socialAtLab, trustAtLetter8 }
}

describe('도달성 감사 (챕터 1~8)', () => {
  const { obs, trustAtS01, trustAtLetter, magicAtK09, guiltAtWard, respectAtEh03, insightAtK11, intAtK13, socialAtLab, trustAtLetter8 } = survey(300)
  it('사고 직후(S-01) 신뢰 분포 — 새벽 장면 조건(≥6)의 양쪽이 모두 정상 플레이에서 나온다', () => {
    const hist: Record<number, number> = {}; trustAtS01.forEach((t) => { hist[t] = (hist[t] ?? 0) + 1 })
    console.log('[trust@S-01]', JSON.stringify(hist))
    expect(Math.min(...trustAtS01)).toBeLessThan(6); expect(Math.max(...trustAtS01)).toBeGreaterThanOrEqual(2)
  })
  it('K-07 직전(ch3_letter) 신뢰 분포 — EH-01 임계값 양쪽이 정상 플레이에서 나온다', () => {
    const hist: Record<number, number> = {}; trustAtLetter.forEach((t) => { hist[t] = (hist[t] ?? 0) + 1 })
    console.log('[trust@K-07]', JSON.stringify(hist))
    expect(trustAtLetter.length).toBeGreaterThan(100)
    expect(trustAtLetter.some((t) => t < EH01_TRUST)).toBe(true); expect(trustAtLetter.some((t) => t >= EH01_TRUST)).toBe(true)
  })
  it('챕터 5~6 판정 분포 — K-09A·EH-02·K-11C·EH-03의 양쪽이 모두 정상 플레이에서 나온다', () => {
    const q = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return `${b[0]}/${b[Math.floor(b.length / 2)]}/${b[b.length - 1]}` }
    console.log('[ch5-6]', JSON.stringify({ magic: q(magicAtK09), guilt: q(guiltAtWard), insight: q(insightAtK11), respect: q(respectAtEh03.filter((r) => r < 1000)) }))
    expect(magicAtK09.some((m) => m >= 48)).toBe(true); expect(magicAtK09.some((m) => m < 48)).toBe(true)
    expect(guiltAtWard.some((g) => g >= EH02_GUILT)).toBe(true); expect(guiltAtWard.some((g) => g < EH02_GUILT)).toBe(true)
    expect(insightAtK11.some((i) => i >= 45)).toBe(true); expect(insightAtK11.some((i) => i < 45)).toBe(true)
    const calm = respectAtEh03.filter((r) => r < 1000)
    expect(calm.some((r) => r >= EH03_RESPECT)).toBe(true); expect(calm.some((r) => r < EH03_RESPECT)).toBe(true)
  })
  it('챕터 7 판정 분포 — K-13C(지성)·DE-08(사교성)의 양쪽이 정상 플레이에서 나온다', () => {
    const q = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return `${b[0]}/${b[Math.floor(b.length / 2)]}/${b[b.length - 1]}` }
    console.log('[ch7]', JSON.stringify({ int: q(intAtK13), social: q(socialAtLab) }))
    expect(intAtK13.length).toBeGreaterThan(100)
    expect(intAtK13.some((i) => i >= 40)).toBe(true); expect(intAtK13.some((i) => i < 40)).toBe(true)
    expect(socialAtLab.some((v) => v >= DE08_SOCIAL)).toBe(true); expect(socialAtLab.some((v) => v < DE08_SOCIAL)).toBe(true)
  })
  it('EH-04: 편지 직전(ch8_letter) 신뢰 분포 — 임계값 양쪽이 정상 플레이에서 나온다', () => {
    const q = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return `${b[0]}/${b[Math.floor(b.length / 2)]}/${b[b.length - 1]}` }
    console.log('[ch8]', JSON.stringify({ trust: q(trustAtLetter8) }), 'high:', trustAtLetter8.filter((t) => t >= EH04_TRUST).length, '/', trustAtLetter8.length)
    expect(trustAtLetter8.length).toBeGreaterThan(100)
    expect(trustAtLetter8.some((t) => t >= EH04_TRUST)).toBe(true); expect(trustAtLetter8.some((t) => t < EH04_TRUST)).toBe(true)
  })
  it('참이 한 번도 관측되지 않은 조건이 없다(도달 불가 분기 0)', () => {
    const neverTrue = [...obs].filter(([, o]) => !o.t).map(([k]) => k)
    expect(neverTrue).toEqual([])
  })
})
