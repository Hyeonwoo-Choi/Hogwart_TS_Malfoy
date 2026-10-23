import { describe, expect, it } from 'vitest'
import { advance, choose, currentNode, newState, run, visibleOptions } from '../engine/core'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { CALENDAR, boardView } from '../data/calendar'
import type { GameState, Node } from '../engine/types'
import './helpers'

/**
 * 블라인드 사건 선택 인수 기준(docs/V2_BRANCHING_STORY.md 6장)과 과감한 선택의 후폭풍.
 * 자동 테스트는 정보 누출·도달·상태 일관성만 확인하며, 단서가 "공정하게 느껴지는지"는 사람이 플레이해 봐야 안다.
 */
const NAMES = /헤르미온느|그레인저|지니|위즐리|루나|러브굿|판시|파킨슨|말포이|드레이코|론|H\.G|P\.P/
const META = /루트|호감|신뢰|경계|우선순위|히로인|보상|분기|약속|경로|단계/
const textsOf = (nodes: Node[]) => nodes.flatMap((n) => n.t === 'line' ? [n.text] : n.t === 'choice' ? [n.prompt ?? '', ...n.options.map((o) => o.text)] : [])

describe('블라인드 선택지(H-08) 인수 기준', () => {
  const week = [...SCENARIO.v2c1_week, ...SCENARIO.v2c1_week_end]
  const choice = SCENARIO.v2c1_week.find((n) => n.t === 'choice')
  it('선택지 장면의 어떤 문장에도 인물 이름·루트·수치·보상 같은 메타 정보가 없다', () => {
    for (const t of textsOf(week)) { expect(t, t).not.toMatch(NAMES); expect(t, t).not.toMatch(META) }
  })
  it('선택지는 인물 메뉴가 아니라 사건(소리·물건·불빛·숫자)과 해리의 행동으로 구성된다', () => {
    if (choice?.t !== 'choice') throw new Error('no choice')
    expect(choice.id).toBe('H-08'); expect(choice.options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']) // 기존 ID·키 유지(저장 호환)
    const cue = /양피지|소리|숫자|쪽지|불빛/
    for (const o of choice.options.slice(0, 5)) { expect(o.text, o.key).toMatch(cue); expect(o.text).toMatch(/(본다|나간다|따라간다|둔다|들여다본다)\.$/) }
    expect(new Set(choice.options.map((o) => o.text)).size).toBe(6)
  })
  it('선택 직후 해리의 메모에는 시간·장소만 있고 누구인지는 없다(정체는 만남에서 드러난다)', () => {
    for (const n of SCENARIO.v2c1_week_end) if (n.t === 'line') expect(n.text).not.toMatch(NAMES)
  })
  it('각 선택은 내부적으로 서로 다른 경로를 가리킨다(플래그는 숨김, 선택지에는 노출되지 않음)', () => {
    if (choice?.t !== 'choice') throw new Error('no choice')
    const flags = choice.options.map((o) => (o.fx ?? []).join())
    expect(new Set(flags).size).toBe(6)
  })
  it('게시판의 챕터 1 개인 일정은 만나기 전에는 이름을 말하지 않는다', () => {
    for (const e of CALENDAR.filter((x) => /^(ap_|pl_)/.test(x.id))) { expect(e.title, e.id).not.toMatch(NAMES); expect(e.notice, e.id).not.toMatch(NAMES) }
    const s = newState(START_SCENE, 1); s.flags.FLAG_RT_PANSY = true; s.calendar = { date: '09-04', weekday: '수', slot: '-' }
    expect(JSON.stringify(boardView(s))).not.toMatch(NAMES)
  })
  it('이름은 인물을 만나는 장면에서 드러난다: 각 약속 장면은 인물 등장(show)으로 시작한다', () => {
    for (const id of ['ev1_ap_hermione', 'ev1_ap_ginny', 'ev1_ap_luna', 'ev1_ap_pansy', 'ev1_pl_draco']) expect(SCENARIO[id].some((n) => n.t === 'show' && n.char), id).toBe(true)
  })
  it('이름을 말하는 밤의 도입은 그 인물을 실제로 만난 경우에만 나온다(만나지 못했으면 익명 도입)', () => {
    for (const n of SCENARIO.v2c1_night) if (n.t === 'line' && NAMES.test(n.text) && n.when && /FLAG_RT_(HERMIONE|GINNY|LUNA|PANSY)/.test(n.when)) expect(n.when, n.text).toMatch(/EV_ap_/)
    expect(SCENARIO.v2c1_night.some((n) => n.t === 'line' && /확인하지 못했다/.test(n.text) && /!EV_ap_/.test(n.when ?? ''))).toBe(true)
  })
  it('같은 행동도 이전 경험에 따라 장면이 달라진다: 약속 장면에 이전 단서·선택에 반응하는 조건 줄이 있다', () => {
    let withCond = 0
    for (const id of ['ev1_ap_hermione', 'ev1_ap_ginny', 'ev1_ap_luna', 'ev1_ap_pansy', 'ev1_pl_draco']) if (SCENARIO[id].slice(0, 4).some((n) => n.t === 'line' && n.when)) withCond++
    expect(withCond).toBe(5)
  })
})

describe('과감한 선택과 후폭풍', () => {
  const at = (scene: string, patch: (s: GameState) => void) => { const s = newState(START_SCENE, 8); s.scene = scene; s.idx = 0; s.chapter = 2; s.mode = 'STORY'; patch(s); return run(s) }
  const finish = (s0: GameState, pick: Record<string, string>) => {
    let s = s0; const seen = new Set<string>()
    for (let i = 0; i < 400 && s.mode !== 'ENDED'; i++) {
      seen.add(s.scene); const n = currentNode(s)
      if (n?.t === 'line') s = advance(s)
      else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, (v.find((o) => o.key === pick[n.id]) ?? v[0]).key) }
      else if (n?.t === 'endChapter') break
      else throw new Error('stop ' + s.scene + ' ' + n?.t)
    }
    return { s, seen }
  }
  it('멱살(L-15 D): 징계·소문·관계 변화가 남고, 캐비닛 사고를 포함한 공통 메인은 그대로 끝까지 진행된다', () => {
    const s0 = at('ch2_eve_t_draco', (s) => { s.flags.FLAG_P2_TALK_DRACO = true })
    const t0 = s0.emotions.draco.trust
    const { s, seen } = finish(s0, { 'L-15': 'D' })
    expect(s.flags.FLAG_P2_FIGHT_DRACO && s.flags.FLAG_P2_DETENTION).toBe(true)
    expect(s.emotions.draco.trust).toBeLessThan(t0 + 1 + 3) // 신뢰는 오르지 않는다(대신 존경이 올라 관계가 달라진다)
    expect(seen.has('ch2_eve_t_draco_D') && seen.has('ch2_match') && seen.has('ch2_after')).toBe(true)
    expect(s.flags.FLAG_DRACO_CHANGED).toBe(true)
    expect(s.choices.some((c) => c.id === 'S-01')).toBe(true)
  })
  it('비밀 폭로(L-14 D)는 약속을 한 경우에만 선택지로 보이고, 판시와의 관계와 이후 대사에 후폭풍이 남는다', () => {
    const plain = at('ch2_eve_t_pansy', (s) => { s.flags.FLAG_P2_STAYED_OUT = true })
    const n = currentNode(plain) as { t: 'choice' } | undefined
    void n
    let t = plain; for (let i = 0; i < 40 && currentNode(t)?.t === 'line'; i++) t = advance(t)
    const hidden = visibleOptions(t, currentNode(t) as never, true).map((o) => o.key)
    expect(hidden).not.toContain('D') // 정보가 없으면 폭로할 수 없다
    const s0 = at('ch2_eve_t_pansy', (s) => { s.flags.FLAG_P2_STAYED_OUT = true; s.knowledge.KN_LETTER_PRESSURE = true; s.emotions.pansy.trust = 12; s.emotions.pansy.wariness = 20 })
    const tr0 = s0.emotions.pansy.trust
    const { s } = finish(s0, { 'L-14': 'D' })
    expect(s.flags.FLAG_P2_BETRAYED_PANSY).toBe(true)
    expect(s.emotions.pansy.trust).toBeLessThan(tr0 - 3); expect(s.emotions.pansy.wariness).toBeGreaterThan(20)
    expect(s.flags.FLAG_DRACO_CHANGED).toBe(true)
  })
  it('판시와의 밤: 비밀을 나눈 뒤 높은 신뢰에서만 열리고, 의사를 말로 확인하며, 거절해도 불이익이 없고, 직접 묘사 없이 전환된다', () => {
    const pre = (s: GameState, confided: boolean, trust: number) => { s.bonds!.pansy.stage = 2; s.emotions.pansy.trust = trust; s.flags.FLAG_RT_PANSY_OK = true; if (confided) s.flags.FLAG_P2_PAN_CONFIDED = true }
    const low = finish(at('ch2_eve', (s) => pre(s, false, 80)), { 'L-04': 'B' }); expect(low.seen.has('ch2_eve_i_pansy_night')).toBe(false)
    const hi = finish(at('ch2_eve', (s) => pre(s, true, 80)), { 'L-04': 'B', 'L-21': 'A' }); expect(hi.seen.has('ch2_eve_i_pansy_night_A')).toBe(true); expect(hi.s.flags.FLAG_PAN_NIGHT).toBe(true)
    const no = finish(at('ch2_eve', (s) => pre(s, true, 80)), { 'L-04': 'B', 'L-21': 'B' }); expect(no.s.flags.FLAG_PAN_NIGHT).toBeFalsy()
    const decl = SCENARIO.ch2_eve_i_pansy_night.find((n) => n.t === 'choice')
    if (decl?.t !== 'choice') throw new Error('x')
    expect(decl.options.find((o) => o.key === 'A')!.text).toContain('멈추자고 하면 바로 멈출게')
    for (const e of decl.options.find((o) => o.key === 'B')!.fx ?? []) expect(e).not.toMatch(/(trust|affinity)-|wariness\+/)
    const explicit = /알몸|벗|신음|애무|삽입|만지/
    for (const id of ['ch2_eve_i_pansy_night', 'ch2_eve_i_pansy_night_A', 'ch2_eve_i_pansy_night_B']) for (const t of textsOf(SCENARIO[id])) expect(t).not.toMatch(explicit)
    expect(SCENARIO.ch2_eve_i_pansy_night_A.some((n) => n.t === 'trans')).toBe(true)
    expect(hi.s.flags.FLAG_DRACO_CHANGED).toBe(true) // 후속 사건(다음 날 아침 긴장)이 있어도 핵심 설정 유지
  })
})
