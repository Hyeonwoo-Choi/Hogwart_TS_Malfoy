import { beforeEach, describe, expect, it } from 'vitest'
import { evalCond } from '../engine/cond'
import {
  advance, applyDelta, applyEffects, canOpenMap, choose, clone, currentNode, newState, pickActivity, run, setScenario, startScene, visibleOptions, SCENE_DELTA_CAP,
} from '../engine/core'
import { exportSave, loadFromSlot, parseImport, saveToSlot, validateSave } from '../engine/save'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { SYS_START } from '../data/scenario_sys'
import { DEFAULT_MANIFEST } from '../data/assets'
import { DRACO_SCHEDULE } from '../data/constants'
import type { ChoiceNode, GameState, Node } from '../engine/types'

setScenario(SCENARIO)
const fresh = () => run(newState(SYS_START))
const linesFrom = (s: GameState, until: (s: GameState) => boolean, max = 60): string[] => {
  const out: string[] = []
  let cur = s
  for (let i = 0; i < max && !until(cur); i++) {
    const n = currentNode(cur)
    if (n?.t !== 'line') break
    out.push(n.text)
    cur = advance(cur)
  }
  return out
}

describe('조건식', () => {
  it('비교·논리·플래그·지식을 평가한다', () => {
    const s = fresh()
    s.flags.FLAG_X = true; s.knowledge.KN_Y = true
    expect(evalCond(s, 'draco.trust>=5 && stat.int==10')).toBe(true)
    expect(evalCond(s, 'FLAG_X && KN_Y')).toBe(true)
    expect(evalCond(s, '!FLAG_X || draco.trust>50')).toBe(false)
    expect(evalCond(s, '(draco.trust<10 || FLAG_Z) && !FLAG_Z')).toBe(true)
  })
  it('오타는 예외로 드러난다', () => {
    expect(() => evalCond(fresh(), 'draco.trustt>=5')).toThrow()
    expect(() => evalCond(fresh(), 'stat.luck>1')).toThrow()
  })
  it('roll()은 시드 기반이라 같은 상태에서 같은 결과', () => {
    const a = fresh(); const b = fresh()
    const ra = Array.from({ length: 20 }, () => evalCond(a, 'roll(50)'))
    const rb = Array.from({ length: 20 }, () => evalCond(b, 'roll(50)'))
    expect(ra).toEqual(rb)
    expect(ra.some(Boolean) && ra.some((x) => !x)).toBe(true)
  })
})

describe('감정·능력치 규칙', () => {
  it('한 장면에서 같은 감정 변수의 변화는 ±12로 제한된다', () => {
    const s = fresh()
    for (let i = 0; i < 10; i++) applyDelta(s, 'draco', 'trust', 5)
    expect(s.emotions.draco.trust).toBe(5 + SCENE_DELTA_CAP)
    for (let i = 0; i < 10; i++) applyDelta(s, 'draco', 'respect', -5)
    expect(s.emotions.draco.respect).toBe(20 - SCENE_DELTA_CAP)
  })
  it('0~100으로 클램프되고, 70 이상 능력치는 성장이 둔화된다', () => {
    const s = fresh()
    s.stats.int = 70; applyDelta(s, 'stat', 'int', 3); expect(s.stats.int).toBe(71)
    s.stats.int = 99; applyDelta(s, 'stat', 'int', 3); expect(s.stats.int).toBe(100)
  })
  it('장면이 바뀌면 장면 상한이 초기화된다', () => {
    let s = fresh()
    for (let i = 0; i < 4; i++) applyDelta(s, 'draco', 'trust', 5)
    s = startScene(s, 'c1_hall')
    applyDelta(s, 'draco', 'trust', 5)
    expect(s.emotions.draco.trust).toBe(5 + 12 + 5)
  })
})

describe('시나리오 데이터 무결성', () => {
  const nodes: [string, number, Node][] = Object.entries(SCENARIO).flatMap(([id, ns]) => ns.map((n, i): [string, number, Node] => [id, i, n]))
  it('모든 goto/then/else/option.goto 대상이 존재한다', () => {
    const missing: string[] = []
    const chk = (from: string, to?: string) => { if (to && !SCENARIO[to]) missing.push(`${from} → ${to}`) }
    for (const [id, , n] of nodes) {
      if (n.t === 'goto') chk(id, n.scene)
      if (n.t === 'if') { chk(id, n.then); chk(id, n.else) }
      if (n.t === 'choice') n.options.forEach((o) => chk(id, o.goto))
      if (n.t === 'routine') { chk(id, n.then); Object.values(n.encounters).flat().forEach((e) => chk(id, e)) }
    }
    expect(missing).toEqual([])
  })
  it('모든 조건식과 효과 문자열이 유효하다', () => {
    const s = fresh()
    for (const [id, i, n] of nodes) {
      const conds: string[] = []
      if (n.t === 'line' && n.when) conds.push(n.when)
      if (n.t === 'if') conds.push(n.cond)
      if (n.t === 'choice') n.options.forEach((o) => o.if && conds.push(o.if))
      conds.forEach((c) => expect(() => evalCond(clone(s), c), `${id}:${i} ${c}`).not.toThrow())
      const fxs = n.t === 'fx' ? n.fx : n.t === 'choice' ? n.options.flatMap((o) => o.fx ?? []) : []
      fxs.forEach((f) => expect(() => applyEffects(clone(s), [f]), `${id}:${i} ${f}`).not.toThrow())
    }
  })
  it('사용된 배경·캐릭터 에셋이 모두 매니페스트에 등록되어 있다', () => {
    const ids = new Set(DEFAULT_MANIFEST.map((e) => e.id))
    const bad: string[] = []
    let curChar: string | null = null
    for (const [id, , n] of nodes) {
      if (n.t === 'bg' && !ids.has(`bg.${n.id}`)) bad.push(`${id}: bg.${n.id}`)
      if (n.t === 'show') { curChar = n.char; if (n.char && !ids.has(`char.${n.char}.${n.expr ?? 'calm'}`) && !ids.has(`char.${n.char}.calm`)) bad.push(`${id}: ${n.char}`) }
    }
    void curChar
    expect(bad).toEqual([])
  })
  it('조우 장면은 모두 end 노드로 끝난다', () => {
    for (const [id, ns] of Object.entries(SCENARIO)) if (id.startsWith('enc_')) expect(ns[ns.length - 1].t).toBe('end')
  })
})

describe('선택과 분기', () => {
  it('새 게임은 K-01 선택지에서 멈춘다', () => {
    const s = fresh()
    let cur = s
    while (currentNode(cur)?.t === 'line') cur = advance(cur)
    expect((currentNode(cur) as ChoiceNode).id).toBe('K-01')
  })
  it('K-01 A는 지식 플래그를 설정하고 기록을 남긴다', () => {
    let s = fresh(); while (currentNode(s)?.t === 'line') s = advance(s)
    s = choose(s, 'A')
    expect(s.knowledge.KN_OVERHEARD && s.knowledge.KN_TENSE).toBe(true)
    expect(s.choices[0]).toMatchObject({ id: 'K-01', option: 'A' })
    expect(s.backlog.at(-1)?.kind).toBe('choice')
  })
  it('능력치 조건 선택지는 조건 미충족 시 노출되지 않는다 (K-02 B)', () => {
    let s = run(newState('c1_potions')); while (currentNode(s)?.t === 'line') s = advance(s)
    const node = currentNode(s) as ChoiceNode
    expect(visibleOptions(s, node, true).map((o) => o.key)).toEqual(['A', 'C', 'D'])
    s.stats.int = 50
    expect(visibleOptions(s, node, true).map((o) => o.key)).toContain('B')
  })
  it('시간제한: 타이머가 켜져 있으면 "망설임"은 숨고, 해제하면 명시 선택지로 노출된다', () => {
    let s = run(newState('sys_timed')); while (currentNode(s)?.t === 'line') s = advance(s)
    const node = currentNode(s) as ChoiceNode
    expect(visibleOptions(s, node, true).map((o) => o.key)).toEqual(['A', 'B'])
    expect(visibleOptions(s, node, false).map((o) => o.key)).toEqual(['A', 'B', 'H'])
  })
  it('과거 선택(K-04)이 후속 장면 대사를 실제로 바꾼다', () => {
    const run4 = (flag: string) => { const s = run(newState('c1_followup')); s.flags[flag] = true; return linesFrom(s, (c) => c.scene !== 'c1_followup').join('|') }
    const a = run4('FLAG_REPORTED_NIGHT'); const b = run4('FLAG_MUTUAL_SECRET'); const none = linesFrom(run(newState('c1_followup')), (c) => c.scene !== 'c1_followup').join('|')
    expect(a).not.toEqual(b); expect(a).toContain('스네이프'); expect(b).toContain('빚은 한 번 갚았다')
    expect(none).toContain('아무 일도 없었다는 듯')
  })
  it('감정 훅(EH-01 샘플): 신뢰가 높을 때와 낮을 때 대사가 다르다', () => {
    const play = (trust: number) => { const s = run(newState('sys_eh_demo')); s.emotions.draco.trust = trust; return linesFrom(s, (c) => c.scene === 'sys_timed').join('|') }
    expect(play(40)).toContain('…보지 마.'); expect(play(5)).toContain('훔쳐보는'); expect(play(40)).not.toEqual(play(5))
  })
  it('표정은 선택 확정 이후에만 바뀐다 (K-02 A)', () => {
    let s = run(newState('c1_potions')); while (currentNode(s)?.t === 'line') s = advance(s)
    const before = s.view.expr
    expect(visibleOptions(s, currentNode(s) as ChoiceNode, true).length).toBeGreaterThan(0)
    expect(s.view.expr).toBe(before) // 선택지 표시만으로는 변화 없음
    expect(choose(s, 'A').view.expr).toBe('interest')
  })
})

describe('일과·지도 잠금', () => {
  const toRoutine = () => { let s = run(newState('c1_routine')); while (s.mode === 'STORY' && currentNode(s)?.t === 'line') s = advance(s); expect(s.mode).toBe('ROUTINE'); return s }
  it('STORY/EVENT 중에는 지도가 열리지 않고 활동 선택이 무시된다', () => {
    const s = fresh()
    expect(s.mode).toBe('STORY'); expect(canOpenMap(s)).toBe(false)
    expect(pickActivity(s, 'library', 'study')).toBe(s)
  })
  it('드레이코 일정과 일치하는 장소에서만 만남(EVENT)이 발생하고 끝나면 일과로 복귀한다', () => {
    let s = toRoutine()
    expect(canOpenMap(s)).toBe(true); expect(s.calendar.weekday).toBe('수')
    s = pickActivity(s, 'library', 'study') // 수요일 오후1: 드레이코는 4층 교실 → 만남 없음
    expect(s.mode).toBe('ROUTINE'); expect(s.routine!.slotIdx).toBe(1); expect(s.stats.int).toBe(12)
    expect(DRACO_SCHEDULE['수'][1]).toBe('courtyard')
    s = pickActivity(s, 'courtyard', 'talk') // 수요일 오후2: 안뜰 → 만남
    expect(s.mode).toBe('EVENT'); expect(canOpenMap(s)).toBe(false)
    while (s.mode === 'EVENT') { const n = currentNode(s); s = n?.t === 'line' ? advance(s) : s }
    expect(s.mode).toBe('ROUTINE'); expect(s.routine!.slotIdx).toBe(2)
  })
  it('같은 장소의 만남은 순서대로 한 번씩만 소비되고, 일과가 끝나면 다음 메인 스토리로 넘어간다', () => {
    let s = toRoutine()
    const play = () => { while (s.mode === 'EVENT') { const n = currentNode(s); s = n?.t === 'line' ? advance(s) : s } }
    s = pickActivity(s, 'common', 'rest'); s = pickActivity(s, 'common', 'rest'); s = pickActivity(s, 'hall', 'talk'); play() // 수 저녁: 대연회장
    expect(s.encCount.hall).toBe(1)
    s = pickActivity(s, 'library', 'study'); play() // 목 오후1: 도서관
    s = pickActivity(s, 'pitch', 'quidditch'); play() // 목 오후2: 경기장
    expect(s.mode).toBe('ROUTINE')
    s = pickActivity(s, 'hall', 'talk'); play() // 목 저녁 → 두 번째 연회장 만남 후 종료
    expect(s.encCount.hall).toBe(2)
    expect(s.mode).toBe('STORY'); expect(s.scene).toBe('c1_night'); expect(s.routine).toBeNull()
  })
})

describe('저장·불러오기', () => {
  beforeEach(() => window.localStorage.clear())
  it('저장 후 불러와도 장면·선택·감정·모드·일과 상태가 완전히 같다', () => {
    let s = fresh(); while (currentNode(s)?.t === 'line') s = advance(s)
    s = choose(s, 'B')
    saveToSlot('slot1', s, new Set(['c1_train:0']))
    const f = loadFromSlot('slot1')!
    expect(f.state).toEqual(s); expect(f.read).toEqual(['c1_train:0'])
    let r = run(newState('c1_routine')); r = pickActivity(r, 'library', 'study')
    saveToSlot('slot2', r, new Set()); expect(loadFromSlot('slot2')!.state).toEqual(r)
  })
  it('복원 후 이어서 진행해도 같은 결과(시드 난수 포함)가 나온다', () => {
    const base = run(newState('c1_train_A'))
    saveToSlot('slot3', base, new Set())
    const loaded = loadFromSlot('slot3')!.state
    const end = (st: GameState) => { let c = st; for (let i = 0; i < 20 && currentNode(c)?.t === 'line'; i++) c = advance(c); return c }
    expect(end(loaded)).toEqual(end(base))
  })
  it('내보내기→가져오기 왕복, 잘못된 파일은 명확한 오류', () => {
    const s = fresh()
    expect(parseImport(exportSave(s, new Set(['a']))).state).toEqual(s)
    expect(() => parseImport('not json')).toThrow(/JSON/)
    expect(() => validateSave({ schemaVersion: 9, state: s })).toThrow(/버전/)
    expect(() => validateSave({ schemaVersion: 2, state: { mode: 'STORY' } })).toThrow(/항목/)
    expect(() => validateSave({ schemaVersion: 1, state: {} })).toThrow(/이전 버전/)
  })
})

describe('무작위 전체 플레이 (스모크)', () => {
  it('200회 무작위 플레이가 오류 없이 챕터 종료(ENDED)에 도달하고, 항상 모드 규칙을 지킨다', () => {
    for (let seed = 1; seed <= 200; seed++) {
      let rnd = seed * 7919
      const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
      let s = run(newState(seed % 2 ? START_SCENE : SYS_START, seed))
      for (let step = 0; step < 600 && s.mode !== 'ENDED'; step++) {
        expect(['STORY', 'EVENT', 'ROUTINE']).toContain(s.mode)
        expect(canOpenMap(s)).toBe(s.mode === 'ROUTINE')
        const n = currentNode(s)
        if (s.mode === 'ROUTINE') {
          const locs = s.routine!.locations; const acts = ['study', 'train', 'quidditch', 'talk', 'rest']
          s = pickActivity(s, locs[Math.floor(r() * locs.length)], acts[Math.floor(r() * acts.length)])
        } else if (n?.t === 'line') s = advance(s)
        else if (n?.t === 'choice') { const o = visibleOptions(s, n, r() < 0.5); s = choose(s, o[Math.floor(r() * o.length)].key) }
        else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
      }
      expect(s.mode, `seed ${seed}`).toBe('ENDED')
    }
  })
})
