import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { advance, clone, currentNode, listActions, newState, pickActivity, routineCursor, run, setActivityScenes, setRandomEvents, startScene } from '../engine/core'
import { ACTIVITY_SCENES, activitySceneFor } from '../data/activityScenes'
import { ACTIVITY_DEFS, PLACE_RULES } from '../data/places'
import { LOCATIONS } from '../data/constants'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'
import './helpers'

beforeEach(() => { setActivityScenes(true); setRandomEvents([]) })
afterEach(() => { setActivityScenes(false) })

/** 챕터 1 자유 일과의 첫 지도 상태(9/4 수 오후1) */
function routineState(noEvents = true): GameState {
  let s = startScene(newState(START_SCENE), 'v2c1_routine')
  for (let i = 0; i < 10 && s.mode !== 'ROUTINE'; i++) s = advance(s)
  expect(s.mode).toBe('ROUTINE')
  if (noEvents) { const r = s.routine!; r.encounters = {}; r.meets = {}; r.friends = {} }
  return s
}
const cursor = (s: GameState) => routineCursor(s.routine!)
/** 장면을 끝까지 읽는다(대사만). 장면이 끝나 모드가 바뀌면 멈춘다 */
function playOut(s: GameState, guard = 200): { s: GameState; scenes: string[]; lines: string[] } {
  const scenes: string[] = []; const lines: string[] = []
  for (let i = 0; i < guard && s.mode === 'EVENT'; i++) {
    if (scenes[scenes.length - 1] !== s.scene) scenes.push(s.scene)
    const n = currentNode(s)
    if (n?.t === 'line') { lines.push(n.text); s = advance(s) } else throw new Error(`예상치 못한 노드 ${s.scene}:${n?.t}`)
  }
  return { s, scenes, lines }
}
const sumStats = (s: GameState) => Object.values(s.stats).reduce((a, b) => a + b, 0)

describe('자유 일과 활동 장면: 구성', () => {
  it('모든 활동에 a·b·s 장면이 있고 대사만으로 끝난다(이름 있는 인물·선택지 없음)', () => {
    for (const id of Object.keys(ACTIVITY_DEFS)) for (const v of ['a', 'b', 's']) {
      const sc = ACTIVITY_SCENES[`act_${id}_${v}`]
      expect(sc, `${id}_${v}`).toBeTruthy()
      expect(sc.at(-1)!.t).toBe('end')
      for (const n of sc) expect(['show', 'line', 'end']).toContain(n.t)
    }
    const text = JSON.stringify(ACTIVITY_SCENES)
    expect(text).not.toMatch(/헤르미온느:|지니:|루나:|판시:|말포이:/)
    for (const name of ['말포이', '판시', '지니', '루나']) expect(text, name).not.toContain(`"who":"${name}"`)
  })
  it('같은 활동을 반복해도 같은 장면이 이어지지 않는다(a → b → s → b → s…), 이벤트가 이어질 때는 항상 짧은 장면', () => {
    const seq = [0, 1, 2, 3, 4].map((c) => activitySceneFor('study', c, false))
    expect(seq).toEqual(['act_study_a', 'act_study_b', 'act_study_s', 'act_study_b', 'act_study_s'])
    expect(activitySceneFor('study', 0, true)).toBe('act_study_s')
    expect(activitySceneFor('nonexistent', 0, false)).toBe('act_generic_s')
  })
  it('장소 변형 조건(AT_*)이 실제 장소만 가리킨다', () => {
    const places = Object.keys(LOCATIONS)
    for (const m of JSON.stringify(ACTIVITY_SCENES).matchAll(/AT_([a-z0-9]+)/g)) expect(places, m[0]).toContain(m[1])
  })
})

describe('자유 일과 활동 장면: 실행', () => {
  it('지도에서 고를 수 있는 모든 (장소, 활동)이 장면을 재생하고, 시간·능력치는 한 번만 적용된 채 지도로 돌아온다', () => {
    let tested = 0
    for (const [loc, rule] of Object.entries(PLACE_RULES)) for (const a of rule.acts) {
      // 해당 활동이 가능한 시간대(수 오후1~저녁)를 찾는다
      let base: GameState | null = null
      for (let slot = 0; slot < 3 && !base; slot++) {
        let s = routineState(); s.routine!.slotIdx = slot
        const info = listActions(s, loc).find((x) => x.actId === a.id)
        if (info?.ok) base = s
      }
      if (!base) continue
      const def = ACTIVITY_DEFS[a.id]
      const t0 = cursor(base), stat0 = sumStats(base)
      const after = pickActivity(base, loc, a.id)
      expect(after.mode, `${loc}/${a.id}`).toBe('EVENT'); expect(after.scene).toMatch(/^act_/)
      expect(after.view.bg).toBe(loc === 'classroom4' ? 'common' : loc); expect(after.view.char).toBeNull()
      // 활동 장면에 들어간 시점에 시간·능력치가 이미 확정(한 번)
      expect(cursor(after) - t0).toBe(Math.min(def.dur, 9 - t0)); expect(sumStats(after)).toBeGreaterThan(stat0)
      const snapshot = JSON.stringify(after.stats)
      const out = playOut(after)
      expect(out.s.mode === 'ROUTINE' || out.s.mode === 'STORY', `${loc}/${a.id} 종료`).toBe(true)
      expect(JSON.stringify(out.s.stats)).toBe(snapshot) // 장면을 읽는 동안 능력치가 다시 오르지 않는다
      if (out.s.mode === 'ROUTINE') expect(cursor(out.s)).toBe(cursor(after))
      expect(out.lines.length).toBeGreaterThan(0)
      tested++
    }
    expect(tested).toBeGreaterThanOrEqual(Object.values(PLACE_RULES).reduce((n, r) => n + r.acts.length, 0) - 6) // 시간대 제한으로 건너뛴 조합은 소수
  })

  it('이미 장면 중인 상태에서 같은 활동을 다시 눌러도(빠른 클릭) 아무것도 바뀌지 않는다', () => {
    const s = routineState()
    const a = pickActivity(s, 'hall', 'meal')
    expect(a.mode).toBe('EVENT')
    const again = pickActivity(a, 'hall', 'meal')
    expect(again).toBe(a)
  })

  it('같은 활동을 반복하면 장면이 달라지고 횟수는 상태(encCount)에만 남는다', () => {
    let s = routineState()
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      s = pickActivity(s, 'common', 'chess'); ids.push(s.scene); s = playOut(s).s
      if (s.mode !== 'ROUTINE') break
    }
    expect(ids[0]).toBe('act_chess_a'); if (ids[1]) expect(ids[1]).toBe('act_chess_b')
    expect(s.encCount['a:chess:common'] ?? 0).toBeGreaterThanOrEqual(1)
  })

  it('활동 장면은 같은 장소 한정 문장(AT_*)만 보여 준다(도서관 공부 vs 휴게실 숙제)', () => {
    const lib = playOut(pickActivity(routineState(), 'library', 'study')).lines.join('\n')
    expect(lib).toContain('도서관 안쪽 책상'); expect(lib).not.toContain('휴게실 탁자')
    const com = playOut(pickActivity(routineState(), 'common', 'study')).lines.join('\n')
    expect(com).toContain('휴게실 탁자'); expect(com).not.toContain('도서관 안쪽 책상')
  })

  it('캐릭터 이벤트가 있으면 짧은 활동 장면 뒤에 이어 재생되고, 시간은 한 번만 소모된다', () => {
    const s = routineState(false) // 수 오후1: 드레이코는 4층 빈 교실 → 만남 이벤트
    const t0 = cursor(s)
    const a = pickActivity(s, 'classroom4', 'train')
    expect(a.scene).toBe('act_train_s'); expect(a.routine!.after).toBe('enc1_classroom4')
    const out = playOut(a)
    expect(out.scenes[0]).toBe('act_train_s'); expect(out.scenes[1]).toBe('enc1_classroom4')
    expect(out.s.routine?.after).toBeUndefined()
    expect(out.s.mode).toBe('ROUTINE'); expect(cursor(out.s) - t0).toBe(1)
  })

  it('저장 중간(활동 장면 도중)에 복원해도 같은 결과이고 효과가 중복되지 않는다', () => {
    const a = pickActivity(routineState(), 'library', 'research')
    const mid = advance(a)
    const restored = JSON.parse(JSON.stringify(mid)) as GameState
    const o1 = playOut(mid).s, o2 = playOut(restored).s
    expect(JSON.stringify(o2.stats)).toBe(JSON.stringify(o1.stats)); expect(cursor(o2)).toBe(cursor(o1)); expect(JSON.stringify(o1.stats)).toBe(JSON.stringify(a.stats))
  })

  it('마지막 자유 시간 활동은 장면이 끝난 뒤 정해진 다음 스토리로 이어진다', () => {
    let s = routineState(); const then = s.routine!.then
    s.routine!.dayIdx = s.routine!.days.length - 1; s.routine!.slotIdx = 2
    s = pickActivity(s, 'common', 'chess')
    expect(s.mode).toBe('EVENT'); expect(s.routine!.pendingDone).toBe(true)
    const out = playOut(s)
    expect(out.s.mode).toBe('STORY'); expect(out.s.routine).toBeNull()
    expect(SCENARIO[then]).toBeTruthy(); expect(out.s.scene === then || out.s.scene.startsWith('v2c1_')).toBe(true)
  })

  it('활동 장면을 끄면 이전처럼 지도에서 바로 끝난다(구버전 동작 보존)', () => {
    setActivityScenes(false)
    const a = pickActivity(routineState(), 'library', 'study')
    expect(a.mode).toBe('ROUTINE'); expect(a.routine!.message).toBeTruthy()
    run(clone(a))
  })
})

describe('활동 장면 + 랜덤 이벤트·캐릭터 이벤트 통합', () => {
  it('일상 랜덤 이벤트를 켠 채 임의 플레이 40회가 활동 장면과 함께 챕터 1을 끝까지 통과한다(이벤트 순서·시간 소모 중복 없음)', async () => {
    const { RANDOM_EVENTS } = await import('../data/randomEvents')
    const { chooseAction } = await import('./helpers')
    const { choose, visibleOptions } = await import('../engine/core')
    setRandomEvents(RANDOM_EVENTS)
    let withAfter = 0, actScenes = 0
    for (let seed = 1; seed <= 40; seed++) {
      let rnd = seed * 104729; const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
      let s: GameState = run(newState(START_SCENE, seed)); let k = 0
      for (let step = 0; step < 6000 && s.scene !== 'ch2_open'; step++) {
        const n = currentNode(s)
        if (s.mode === 'ROUTINE') {
          const [loc, act] = chooseAction(s, 'random', r, k++)
          const before = routineCursor(s.routine!)
          s = pickActivity(s, loc, act)
          if (s.scene.startsWith('act_')) actScenes++
          if (s.routine?.after) withAfter++
          // 활동 직후 시간은 (활동 길이 + 이후 이벤트가 쓴 시간) 이상이 아니면 안 된다: 최소 1시간대 전진
          if (s.routine) expect(routineCursor(s.routine) > before || s.routine.pendingDone).toBe(true)
        } else if (n?.t === 'line') s = advance(s)
        else if (n?.t === 'choice') { const v = visibleOptions(s, n, true); s = choose(s, v[Math.floor(r() * v.length)].key) }
        else throw new Error(`예상치 못한 노드 ${s.scene}:${s.idx}`)
      }
      expect(s.scene, `seed ${seed}`).toBe('ch2_open')
    }
    expect(actScenes).toBeGreaterThan(100); expect(withAfter).toBeGreaterThan(10)
    setRandomEvents([])
  })
})
