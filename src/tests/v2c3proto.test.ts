import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { advance, choose, clone, continueChapter, currentNode, newState, run, setActivityScenes, setIncidents, setRandomEvents, visibleOptions } from '../engine/core'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { INCIDENTS } from '../data/incidents'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { V2C3P } from '../data/v2c3p'
import { evalCond, dayIndex } from '../engine/cond'
import { validateSave } from '../engine/save'
import { STYLES2, simulate2, type Out } from './ch2sim'
import type { GameState, Node } from '../engine/types'
import './helpers'

/**
 * 챕터 3 연결 검증(v2c3p.ts): 구조 · 블라인드 진입 · 챕터 2에서 챕터 3으로의 자연 연결(정상 엔진 호출) · 날짜·인과 · 경로 행사/결산의 소비 · 저장·불러오기 · 종단.
 * 자동 테스트는 상태·도달·시간순 같은 구조만 증명하며 장면의 서사 품질은 증명하지 않는다.
 */
// 숨겨야 하는 것은 경로의 주인공이 될 학생들의 이름이다(교직원·론처럼 일상적으로 곁에 있는 사람은 제외)
const NAMES = /헤르미온느|그레인저|지니|위즐리|루나|러브굿|판시|파킨슨|말포이|드레이코/
const ids = Object.keys(V2C3P)
const targets = (n: Node): string[] => n.t === 'goto' ? [n.scene] : n.t === 'if' ? [n.then, ...(n.else ? [n.else] : [])] : n.t === 'choice' ? n.options.flatMap((o) => (o.goto ? [o.goto] : [])) : []

describe('챕터 3 연결: 구조', () => {
  it('모든 이동 대상이 존재하고(미구현 장면 ID 없음), 모든 장면이 이동·선택·종료로 끝나며, 조건식이 해석된다', () => {
    const s = newState(START_SCENE, 1)
    for (const id of ids) {
      const nodes = V2C3P[id]; const last = nodes[nodes.length - 1]
      expect(['goto', 'choice', 'end'], `${id} 끝`).toContain(last.t)
      if (last.t === 'end') expect(id.startsWith('ev3_'), `${id}: END는 행사 장면만`).toBe(true)
      for (const n of nodes) {
        for (const t of targets(n)) expect(SCENARIO[t], `${id} → ${t}`).toBeTruthy()
        if (n.t === 'line' && n.when) expect(() => evalCond(s, n.when!), `${id} ${n.when}`).not.toThrow()
        if (n.t === 'if') expect(() => evalCond(s, n.cond)).not.toThrow()
        if (n.t === 'choice') for (const o of n.options) { if (o.if) expect(() => evalCond(s, o.if!)).not.toThrow() }
      }
    }
  })
  it('선택 ID W-01~W-10은 기존 ID와 겹치지 않고 서로 중복되지 않는다', () => {
    const fresh: string[] = []; const old = new Set<string>()
    for (const [id, nodes] of Object.entries(SCENARIO)) for (const n of nodes) if (n.t === 'choice') { if (ids.includes(id)) fresh.push(n.id); else old.add(n.id) }
    expect(new Set(fresh).size).toBe(fresh.length); expect(fresh.length).toBe(10)
    for (const f of fresh) expect(old.has(f), f).toBe(false)
  })
  it('연결: ch3_open → 경로 진입 → 합류 → ch3_detention(첫 징계) → … → ch3_end → 정리표 → 챕터 종료(ch4_open)', () => {
    expect(SCENARIO.ch3_open.some((n) => n.t === 'goto' && n.scene === 'v2c3_route')).toBe(true)
    expect(SCENARIO.v2c3_join.some((n) => n.t === 'goto' && n.scene === 'ch3_detention')).toBe(true)
    expect(SCENARIO.ch3_end.some((n) => n.t === 'goto' && n.scene === 'ch3_end_table')).toBe(true)
    const last = SCENARIO.ch3_end_table[SCENARIO.ch3_end_table.length - 1]
    expect(last.t === 'endChapter' && last.next).toBe('ch4_open'); expect(SCENARIO.ch4_open).toBeTruthy()
    for (const sun of ['v2c3_sunA', 'v2c3_sunB', 'v2c3_sunC', 'v2c3_sunD', 'v2c3_sunE']) expect(SCENARIO[sun].some((n) => n.t === 'goto' && n.scene === 'ch3_end_table')).toBe(true)
  })
})

describe('챕터 3 연결: 시간순과 인과(B01·B02·B03)', () => {
  const textsOf = (id: string) => V2C3P[id].filter((n) => n.t === 'line').map((n) => (n as { text: string }).text).join('\n')
  it('월요일 아침의 진입 장면에는 임시 시간 소모(time+)가 없고, 아직 오지 않은 요일의 일을 과거형으로 서술하지 않는다', () => {
    for (const id of ids) for (const n of V2C3P[id]) {
      if (n.t === 'fx') for (const e of n.fx) expect(e, id).not.toMatch(/^time[+-]/)
      if (n.t === 'choice') for (const o of n.options) for (const e of o.fx ?? []) if (/^v2c3_w/.test(id)) expect(e, `${id}${o.key}`).not.toMatch(/^time[+-]/)
    }
    for (const id of ids.filter((x) => /^v2c3_w[A-EG]/.test(x))) expect(textsOf(id), id).not.toMatch(/(화|수|목|금)요일[^.]*(비어 있었|지나갔|다녀왔)/)
  })
  it('미래 결과는 월요일 장면이 서술하지 않고 행사·일요일 결산이 소비한다: 월요일의 모든 선택 플래그가 어딘가에서 읽힌다', () => {
    const readBy = (flag: string) => ids.some((id) => V2C3P[id].some((n) => (n.t === 'line' && n.when?.includes(flag)) || (n.t === 'if' && n.cond.includes(flag)))) || JSON.stringify([SCENARIO.ch3_detention, SCENARIO.ch3_snape, SCENARIO.ch3_letter]).includes(flag)
    const monday = ids.filter((x) => /^v2c3_w[A-E]$/.test(x))
    for (const id of monday) for (const n of V2C3P[id]) if (n.t === 'choice') for (const o of n.options) for (const e of o.fx ?? []) {
      const m = e.match(/^flag:(FLAG_P3_[A-E]_\w+)$/); if (m) expect(readBy(m[1]), `${id}${o.key} ${m[1]}`).toBe(true)
    }
  })
  it('B02: 일요일 아침의 판시 밤 회상은 이틀 전(금요일 밤)으로 서술된다', () => {
    const line = SCENARIO.ch2_morning.find((n) => n.t === 'line' && n.when === 'FLAG_PAN_NIGHT') as { text: string }
    expect(line.text).toContain('이틀 전 금요일 밤'); expect(line.text).not.toContain('어젯밤')
  })
})

describe('챕터 3 연결: 블라인드 진입', () => {
  const hook = ['v2c3_wA', 'v2c3_wB', 'v2c3_wC', 'v2c3_wD', 'v2c3_wE']
  it('진입 장면의 선택지에는 인물 이름·루트·보상이 없다(소리·물건·흔적과 행동만)', () => {
    for (const id of hook) for (const n of V2C3P[id]) if (n.t === 'choice') {
      expect(n.prompt ?? '', id).not.toMatch(NAMES)
      for (const o of n.options) { expect(o.text, `${id}${o.key}`).not.toMatch(NAMES); expect(o.text).not.toMatch(/루트|호감|신뢰|보상|경로|약속/) }
      expect(n.options.length).toBe(3)
    }
  })
  it('진입 서술의 첫 줄들에는 이름이 없고 흔적만 보여 준다', () => {
    for (const id of hook) { const first = V2C3P[id].filter((n) => n.t === 'line').slice(0, 2).map((n) => (n as { text: string }).text).join(' '); expect(first, id).not.toMatch(NAMES) }
  })
  it('게시판의 챕터 3 행사 공지는 이름 없이 사건만 말한다', async () => {
    const { CALENDAR } = await import('../data/calendar')
    for (const e of CALENDAR.filter((x) => x.id.startsWith('ap3_'))) { expect(e.title, e.id).not.toMatch(NAMES); expect(e.notice, e.id).not.toMatch(NAMES) }
  })
})

describe('챕터 2 → 챕터 3 자연 연결(정상 엔진 호출, 강제 상태 주입 없음)', () => {
  const STYLES = [...Object.keys(STYLES2)]
  const outs: Record<string, Out[]> = {}
  beforeAll(() => {
    setActivityScenes(true); setRandomEvents(RANDOM_EVENTS); setIncidents(INCIDENTS)
    for (const st of STYLES) outs[st] = Array.from({ length: 8 }, (_, i) => simulate2(st, i + 1, "ch2_end", 3))
    const entry: Record<string, Record<string, number>> = {}
    for (const [st, list] of Object.entries(outs)) for (const o of list) { const h = [...o.scenes].find((x) => /^v2c3_w[A-EG]$/.test(x)); entry[st] = entry[st] ?? {}; entry[st][h ?? 'none'] = (entry[st][h ?? 'none'] ?? 0) + 1 }
    console.log('[챕터 3 자연 진입 분포]', JSON.stringify(entry))
  })
  afterAll(() => { setActivityScenes(false); setRandomEvents([]); setIncidents([]) })

  it('모든 스타일이 새 게임 → 챕터 2 → 챕터 3을 끝까지 통과해 챕터 3 종료 카드(ch4_open으로 이어짐)에 닿는다', () => {
    for (const [st, list] of Object.entries(outs)) for (const o of list) {
      expect(o.ended, st).toBe(true); expect(o.s.chapter, st).toBe(3); expect(o.s.scene, st).toBe('ch3_end_table')
      const n = currentNode(o.s); expect(n?.t === 'endChapter' && n.next, st).toBe('ch4_open')
      expect(o.scenes.has('ch3_detention') && o.scenes.has('ch3_snape') && o.scenes.has('ch3_letter'), st).toBe(true) // 공통 뼈대(징계·S-03·K-07)는 모든 경로가 지난다
      expect(o.s.choices.some((c) => c.id === 'S-03') && o.s.choices.some((c) => c.id === 'K-07'), st).toBe(true)
    }
  })
  it('시간순: 챕터 3 구간의 달력 날짜는 9/30에서 10/6까지 한 번도 거꾸로 가지 않는다(B01)', () => {
    for (const [st, list] of Object.entries(outs)) for (const o of list) {
      const i = o.dates.indexOf('09-30', o.dates.lastIndexOf('09-29')); const seq = o.dates.slice(i).map(dayIndex)
      for (let k = 1; k < seq.length; k++) expect(seq[k], `${st} ${o.dates.slice(i).join('>')}`).toBeGreaterThanOrEqual(seq[k - 1])
      expect(o.dates[o.dates.length - 1], st).toBe('10-06')
    }
  })
  it('Ch2에서 쌓은 상태가 챕터 3으로 유지된다: 경로 플래그·관계 단계·약속·지식이 그대로 이월', () => {
    for (const o of outs.hermione) { expect(o.s.flags.FLAG_P2_RESEARCH).toBe(true); expect(o.scenes.has('v2c3_wA')).toBe(true) }
    for (const o of outs.ginny) expect(o.scenes.has('v2c3_wB') || o.scenes.has('v2c3_wE') || o.scenes.has('v2c3_wD')).toBe(true)
    for (const o of outs.luna) expect(o.scenes.has('v2c3_wC') || o.scenes.has('v2c3_wE') || o.scenes.has('v2c3_wD')).toBe(true)
    for (const o of outs.draco) expect(o.scenes.has('v2c3_wE')).toBe(true) // E 경로(독립)는 챕터 3에서 E 사건으로 이어진다
    for (const o of outs.none) if (!o.s.flags.FLAG_P2_UNSTABLE && !o.s.flags.FLAG_P2_RESEARCH && !o.s.flags.FLAG_P2_PITCH && !o.s.flags.FLAG_P2_SECRET && !o.s.flags.FLAG_P2_SLY) expect(o.scenes.has('v2c3_wG')).toBe(true) // 아무것도 따라가지 않은 플레이: 일반 진입
  })
  it('다섯 사건 진입(A·B·C·D·E)과 각 경로의 행사·결산이 정상 플레이로 모두 도달한다', () => {
    const seen = (re: RegExp) => Object.values(outs).flat().filter((o) => [...o.scenes].some((x) => re.test(x))).length
    for (const k of ['A', 'B', 'C', 'D', 'E']) { expect(seen(new RegExp(`^v2c3_w${k}$`)), `진입 ${k}`).toBeGreaterThan(0); expect(seen(new RegExp(`^v2c3_sun${k}$`)), `결산 ${k}`).toBeGreaterThan(0) }
    const ev: Record<string, number> = {}; for (const e of ['ev3_a_ledger', 'ev3_b_checkup', 'ev3_c_count', 'ev3_d_courtyard', 'ev3_e_recheck']) { ev[e] = seen(new RegExp(`^${e}$`)); expect(ev[e], e).toBeGreaterThan(0) }
    console.log('[챕터 3 행사 도달(80회 중)]', JSON.stringify(ev))
  })
  it('E 경로가 챕터 2에서 정상 플레이로 독립적으로 도달한다(말포이 선택 H-08 E 또는 4층 그을음)', () => {
    const ch2E = Object.values(outs).flat().filter((o) => o.scenes.has('ch2_p_unstable'))
    expect(ch2E.length).toBeGreaterThan(0); expect(outs.draco.every((o) => o.scenes.has('ch2_p_unstable'))).toBe(true)
    for (const o of ch2E) { expect(o.scenes.has('ch2_e_blast_after')).toBe(true); expect([...o.scenes].some((x) => /^ch2_p_(research|pitch|secret|sly)$/.test(x))).toBe(false) }
  })
  it('저장→불러오기: 챕터 3 진행 중(아침 선택 앞·행사 뒤) 저장해도 같은 상태로 정상 진행되어 같은 종단에 닿는다', () => {
    const base = simulate2('hermione', 1, 'ch2_end', 2)
    const toCh3 = () => { let s = clone(base.s); s = continueChapter(s); return s }
    const advanceUntil = (s: GameState, pred: (x: GameState) => boolean) => { for (let i = 0; i < 400 && !pred(s); i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else if (n?.t === 'choice') s = choose(s, visibleOptions(s, n, true)[0].key); else break } return s }
    // 챕터 2 종료 상태에서 ch3_open을 연속 진행하고 W-01 선택 앞에서 저장
    const a = advanceUntil(toCh3(), (x) => currentNode(x)?.t === 'choice')
    expect(a.scene).toBe('v2c3_wA')
    const file = { schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: a }
    const back = validateSave(JSON.parse(JSON.stringify(file))).state as GameState
    const finish = (s: GameState) => advanceUntil(s, (x) => x.mode === 'ROUTINE' || x.mode === 'ENDED')
    const x = finish(clone(a)), y = finish(clone(back))
    expect(y.scene).toBe(x.scene); expect(y.idx).toBe(x.idx); expect(JSON.stringify(y.flags)).toBe(JSON.stringify(x.flags)); expect(x.mode).toBe('ROUTINE') // 아침 장면 → 합류 → 첫 징계 → 일과 구간
  })
  it('경로 선택의 결과가 후속 장면의 대사를 실제로 바꾼다: 같은 일요일 결산도 월요일·행사 선택에 따라 다르다', () => {
    const lines = (id: string, flags: string[]) => { const s = newState(START_SCENE, 1); for (const f of flags) s.flags[f] = true; s.scene = id; s.idx = 0; s.mode = 'STORY'; s.chapter = 3; let t = run(s); const out: string[] = []; for (let i = 0; i < 60 && t.scene === id; i++) { const n = currentNode(t); if (n?.t === 'line') { out.push(n.text); t = advance(t) } else break } return out.join('|') }
    expect(lines('v2c3_sunB', ['FLAG_P3_B_TOLD_HOOCH'])).not.toBe(lines('v2c3_sunB', ['FLAG_P3_B_ASKED_GINNY']))
    expect(lines('v2c3_sunD', ['FLAG_P3_D_ACCOMPLICE'])).not.toBe(lines('v2c3_sunD', ['FLAG_P3_D_AVOIDED']))
    expect(lines('v2c3_sunC', ['FLAG_P3_C_COUNTED'])).not.toBe(lines('v2c3_sunC', ['FLAG_P3_C_ERASED']))
    expect(lines('v2c3_sunA', ['FLAG_P3_A_COPIED'])).not.toBe(lines('v2c3_sunA', ['FLAG_P3_A_DESTROYED']))
    expect(lines('v2c3_sunE', ['FLAG_P3_E_TOLD_RON'])).not.toBe(lines('v2c3_sunE', ['FLAG_P3_E_HID']))
  })
  it('관계 상태가 초기화되지 않는다: 월요일 진입 장면 동안 단계·연애 상태·약속이 바뀌지 않는다', () => {
    const o2 = simulate2('pansy', 1, 'ch2_end', 2); const o = o2; const before = JSON.stringify(Object.fromEntries(Object.entries(o.s.bonds!).map(([k, b]) => [k, [b.stage, b.romance, b.poly]])))
    let s = continueChapter(clone(o2.s)); for (let i = 0; i < 80 && s.scene !== 'ch3_detention'; i++) { const n = currentNode(s); if (n?.t === 'line') s = advance(s); else if (n?.t === 'choice') s = choose(s, visibleOptions(s, n, true)[0].key); else break }
    expect(s.scene).toBe('ch3_detention')
    expect(JSON.stringify(Object.fromEntries(Object.entries(s.bonds!).map(([k, b]) => [k, [b.stage, b.romance, b.poly]])))).toBe(before)
    expect(s.promises).toEqual(o.s.promises)
  })
})
