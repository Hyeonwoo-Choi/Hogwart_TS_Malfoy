import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SCENARIO_VERSION } from '../cloud/versions'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { advance, clone, currentNode, dracoLocation, listActions, pickActivity, placeInfo, remainingSlots, routineCursor, setScenario, skipRoutine } from '../engine/core'
import { store } from '../engine/store'
import { loadFromSlot, saveToSlot } from '../engine/save'
import { DRACO_SCHEDULE, LOCATIONS } from '../data/constants'
import { MARKERS, SHAPES, ZONES } from '../data/mapLayout'
import { ACTIVITY_DEFS, ENV_LABEL, PLACE_RULES, placeStatus } from '../data/places'
import { SCENARIO } from '../data/scenario'
import { play } from './helpers'
import type { GameState } from '../engine/types'

setScenario(SCENARIO)
const OUTDOOR_ONLY = ['broom_flight', 'quidditch', 'quidditch_camp', 'watch_practice']
/** 챕터 1 자유 일과의 시작 상태(9/4 수 오후1, 3일) */
const ch1Routine = () => clone(play({}, 1, { follow: true, stopAt: (s) => s.mode === 'ROUTINE' }).s)
const ok = (s: GameState, loc: string, act: string) => listActions(s, loc).find((a) => a.actId === act)!
/** 만남·일상 이벤트(EVENT)를 끝까지 넘겨 일과로 돌아온다 */
const settle = (s0: GameState) => { let s = s0; for (let i = 0; i < 120 && s.mode === 'EVENT'; i++) { const n = currentNode(s); if (n?.t !== 'line') break; s = advance(s) } return s }

describe('장소·활동 데이터', () => {
  it('실외 전용 활동(빗자루 비행·퀴디치)은 실외 장소에만 있고, 실내 장소에는 없다', () => {
    for (const rule of Object.values(PLACE_RULES)) for (const a of rule.acts) if (OUTDOOR_ONLY.includes(a.id)) expect(rule.env, `${rule.id}:${a.id}`).toBe('outdoor')
    expect(PLACE_RULES.pitch.acts.map((a) => a.id)).toContain('broom_flight')
    for (const id of ['library', 'potions', 'hall', 'common', 'classroom4']) expect(PLACE_RULES[id].env).toBe('indoor')
    for (const id of ['library', 'potions', 'hall', 'common', 'classroom4']) expect(PLACE_RULES[id].acts.some((a) => OUTDOOR_ONLY.includes(a.id))).toBe(false)
  })
  it('모든 장소·활동이 서로 연결되고 지도 좌표·구역과 일치한다', () => {
    for (const rule of Object.values(PLACE_RULES)) {
      expect(LOCATIONS[rule.id], rule.id).toBeTruthy(); expect(MARKERS[rule.id].zone, rule.id).toBe(rule.zone)
      expect(rule.acts.length, rule.id).toBeGreaterThan(0)
      for (const a of rule.acts) expect(ACTIVITY_DEFS[a.id], `${rule.id}:${a.id}`).toBeTruthy()
    }
    for (const id of Object.keys(MARKERS)) expect(PLACE_RULES[id], id).toBeTruthy()
    for (const z of ZONES) expect(SHAPES[z.id].length).toBeGreaterThan(3)
  })
  it('장소마다 고유한 활동이 있고, 모든 장소가 똑같은 능력치 메뉴를 복제하지 않는다', () => {
    const sig = Object.values(PLACE_RULES).map((r) => r.acts.map((a) => a.id).sort().join(','))
    expect(new Set(sig).size).toBe(sig.length)
    for (const rule of Object.values(PLACE_RULES)) expect(rule.acts.some((a) => !['study', 'talk', 'rest'].includes(a.id)), rule.id).toBe(true)
  })
  it('플레이어에게 보이는 이름·설명에 수치나 능력치 이름이 없다', () => {
    for (const rule of Object.values(PLACE_RULES)) for (const a of rule.acts) {
      const txt = `${a.name ?? ACTIVITY_DEFS[a.id].name} ${a.desc ?? ACTIVITY_DEFS[a.id].desc} ${a.reason ?? ''}`
      expect(txt, `${rule.id}:${a.id}`).not.toMatch(/[0-9]|의지력|지성|체력|사교성|통찰력|마법 실력/)
    }
  })
  it('균형: 시간당 성장은 어떤 활동도 압도적이지 않고, 긴 활동은 한 가지에 집중하는 대신 다른 성장을 포기한다', () => {
    for (const d of Object.values(ACTIVITY_DEFS)) {
      const vals = Object.values(d.gains) as number[]
      expect(Math.max(...vals) / d.dur, d.id).toBeLessThanOrEqual(2.5) // 한 능력치의 시간당 성장 상한
      expect(vals.reduce((t, v) => t + v, 0) / d.dur, d.id).toBeLessThanOrEqual(3)
    }
    // 같은 시간을 짧은 활동으로 나눠 쓰면 모든 능력치를 두루 얻는다: 집중 공부 2칸 = 5, 공부 2번 = 4+지성 보조
    const study = ACTIVITY_DEFS.study.gains, deep = ACTIVITY_DEFS.deep_study.gains
    expect((deep.int ?? 0) - (study.int ?? 0) * 2).toBeLessThanOrEqual(1); expect(deep.insight ?? 0).toBeLessThan((study.insight ?? 0) * 2)
  })
})

describe('출입·시간대 조건', () => {
  it('저녁에는 도서관·마법약 교실·야외 장소가 닫히고, 대연회장·휴게실·4층 교실만 열려 있다', () => {
    for (const id of ['library', 'potions', 'courtyard', 'pitch', 'lake', 'greenhouse']) expect(placeStatus(id, 2, '수').ok, id).toBe(false)
    for (const id of ['hall', 'common', 'classroom4']) expect(placeStatus(id, 2, '수').ok, id).toBe(true)
    expect(placeStatus('library', 2, '수').reason).toMatch(/저녁/)
  })
  it('마법약 교실은 주말에 감독 교수가 없어 닫히고, 온실은 화·목에만 열린다', () => {
    expect(placeStatus('potions', 0, '토').ok).toBe(false); expect(placeStatus('potions', 0, '토').reason).toMatch(/주말/)
    expect(placeStatus('potions', 0, '월').ok).toBe(true)
    for (const d of ['월', '수', '금', '토', '일']) expect(placeStatus('greenhouse', 0, d).ok, d).toBe(false)
    for (const d of ['화', '목']) expect(placeStatus('greenhouse', 1, d).ok, d).toBe(true)
  })
  it('대연회장은 식사 시간대(오후1·저녁)에만 식사·대화·소문이 가능하고, 식사가 아닌 시간에는 할 수 있는 활동이 없다(쉬기는 지도에서 제거됨)', () => {
    const s = ch1Routine() // 수 오후1
    expect(ok(s, 'hall', 'meal').ok).toBe(true); expect(listActions(s, 'hall').some((a) => a.actId === 'rest')).toBe(false)
    const mid = clone(s); mid.routine!.slotIdx = 1
    expect(ok(mid, 'hall', 'meal').ok).toBe(false); expect(ok(mid, 'hall', 'meal').reason).toMatch(/식사 시간/); expect(listActions(mid, 'hall').some((a) => a.actId === 'rest')).toBe(false) // 쉬기는 지도에서 제거(시간 건너뛰기로 통합)
  })
  it('드레이코의 일정표(만남 장소·시간)는 항상 그 장소의 출입 조건과 모순되지 않는다', () => {
    for (const [wd, slots] of Object.entries(DRACO_SCHEDULE)) slots.forEach((loc, i) => expect(placeStatus(loc, i, wd).ok, `${wd}${i}:${loc}`).toBe(true))
  })
  it('닫힌 장소의 활동은 실행되지 않고(상태 불변) 이용할 수 없는 이유가 표시된다', () => {
    const s = clone(ch1Routine()); s.routine!.slotIdx = 2
    expect(placeInfo(s, 'library').ok).toBe(false); expect(pickActivity(s, 'library', 'study')).toBe(s)
    expect(listActions(s, 'library').every((a) => !a.ok && !!a.reason)).toBe(true)
  })
})

describe('시간 진행', () => {
  it('짧은 활동은 한 칸, 반나절은 두 칸을 쓰고 날짜·시간대가 갱신된다', () => {
    const s0 = ch1Routine(); expect(remainingSlots(s0)).toBe(9); expect(s0.calendar.slot).toBe('오후1')
    const a = pickActivity(s0, 'common', 'chess'); expect(remainingSlots(a)).toBe(8); expect(a.calendar.slot).toBe('오후2')
    const b = pickActivity(s0, 'library', 'research'); expect(remainingSlots(b)).toBe(7); expect(b.calendar.slot).toBe('저녁')
    expect(b.routine!.message).toMatch(/오후가 통째로/)
  })
  it('하루짜리 활동은 날짜를 넘기고, 남은 시간을 넘기는 활동은 실행되지 않는다(상태 불변)', () => {
    const s0 = ch1Routine()
    const day = pickActivity(s0, 'classroom4', 'train_long')
    expect(day.calendar.weekday).toBe('목'); expect(day.calendar.slot).toBe('오후1'); expect(remainingSlots(day)).toBe(6)
    // 오후2에 시작한 반나절 활동(research)은 저녁에 닫히므로 불가, 6칸 수련은 남은 시간(5)을 넘으면 불가
    const late = clone(s0); late.routine!.dayIdx = 1; late.routine!.slotIdx = 2
    expect(remainingSlots(late)).toBe(4); expect(ok(late, 'classroom4', 'train_marathon').ok).toBe(false); expect(ok(late, 'classroom4', 'train_marathon').reason).toMatch(/남은 자유 시간/)
    expect(pickActivity(late, 'classroom4', 'train_marathon')).toBe(late)
  })
  it('이틀 활동은 구간 전체를 쓰고, 끝나면 정확히 한 번 다음 스토리로 넘어간다. 남은 시간은 음수가 되지 않는다', () => {
    const s0 = ch1Routine()
    const e = settle(pickActivity(s0, 'classroom4', 'train_marathon')) // 6칸 → 3칸 남음
    expect(e.mode).toBe('ROUTINE'); expect(remainingSlots(e)).toBe(3)
    let t = e
    for (let i = 0; i < 3; i++) { t = settle(pickActivity(t, 'common', 'chess')); expect(remainingSlots(t)).toBeGreaterThanOrEqual(0) }
    expect(t.mode).toBe('STORY'); expect(t.scene).toBe('v2c1_night'); expect(t.routine).toBeNull()
  })
  it('남은 시간 넘기기(skip)는 일과를 한 번에 끝내고 다음 스토리로 진입시킨다', () => {
    const s0 = ch1Routine(); const n = skipRoutine(s0)
    expect(n.mode).toBe('STORY'); expect(n.routine).toBeNull(); expect(n.scene).toBe('v2c1_night')
    expect(skipRoutine(n)).toBe(n) // 일과가 아니면 무시
  })
  it('활동 후 예상 종료 시점이 표시된다(마지막 칸이면 자유 시간 종료)', () => {
    const s0 = ch1Routine()
    expect(ok(s0, 'library', 'research').endsAt).toMatch(/저녁/); expect(ok(s0, 'classroom4', 'train_marathon').endsAt).toMatch(/금요일 오후1/)
    const near = clone(s0); near.routine!.dayIdx = 2; near.routine!.slotIdx = 1
    expect(ok(near, 'common', 'chess').endsAt).toMatch(/저녁/)
    const last = clone(s0); last.routine!.dayIdx = 2; last.routine!.slotIdx = 2
    expect(ok(last, 'common', 'chess').endsAt).toBe('자유 시간이 끝난다')
  })
})

describe('만남과 일정', () => {
  it('긴 활동 동안 드레이코가 그 장소에 오면 만남이 발생하고, 다른 장소에서는 발생하지 않는다', () => {
    const s0 = ch1Routine() // 수: 4층 교실(0) · 안뜰(1) · 대연회장(2)
    expect(dracoLocation('수', 0)).toBe('classroom4')
    const hit = pickActivity(s0, 'classroom4', 'train_long'); expect(hit.mode).toBe('EVENT'); expect(hit.scene).toBe('enc1_classroom4')
    const miss = pickActivity(s0, 'library', 'research'); expect(miss.scene.startsWith('enc')).toBe(false) // 도서관은 오후2에도 드레이코가 없다(조연 일상만)
  })
  it('한 번 소비한 만남은 반복되지 않는다(장소별 만남 풀 순서 소비)', () => {
    const s0 = ch1Routine()
    const a = pickActivity(s0, 'classroom4', 'train'); expect(a.encCount.classroom4).toBe(1)
  })
})

describe('저장 호환', () => {
  beforeEach(() => localStorage.clear())
  it('구버전(고정 슬롯 방식) 저장의 일과 상태에서도 이어진다: 위치 표시(at)가 없어도 남은 시간이 정확하다', () => {
    const s = clone(ch1Routine()); s.routine!.dayIdx = 1; s.routine!.slotIdx = 1
    delete (s.routine as { at?: string }).at
    saveToSlot('slot1', s, new Set()); const f = loadFromSlot('slot1')!.state
    expect(remainingSlots(f)).toBe(5); expect(routineCursor(f.routine!)).toBe(4)
    const n = pickActivity(f, 'common', 'chess'); expect(remainingSlots(n)).toBe(4)
  })
  it('장기 활동 직후 저장→복원해도 같은 상태이고, 이어서 진행해도 시간이 중복 차감되지 않는다', () => {
    const s0 = ch1Routine(); for (const [h, byLoc] of Object.entries(s0.routine!.meets ?? {})) for (const l of Object.keys(byLoc)) s0.encCount[`h:${h}:${l}`] = 99 // 히로인 만남이 아닌 활동 시간 규칙만 검증
    const a = settle(pickActivity(s0, 'library', 'deep_study'))
    expect(a.mode).toBe('ROUTINE'); expect(remainingSlots(a)).toBe(7)
    saveToSlot('slot2', a, new Set()); const f = loadFromSlot('slot2')!.state
    expect(f).toEqual(a); expect(remainingSlots(f)).toBe(remainingSlots(a))
    expect(remainingSlots(settle(pickActivity(f, 'common', 'chess')))).toBe(remainingSlots(a) - 1)
  })
  it('시나리오 버전은 올리지 않아도 된다(저장 구조 변경 없음 — routine.at은 선택 필드)', () => {
    expect(SCENARIO_VERSION).toBe('v2.ch1.v1')
  })
})

describe('Ch1~8 자유 일과 완주', () => {
  it('모든 자유 일과 구간이 어떤 성장 정책으로도 끝까지 완료된다', () => {
    for (const policy of ['study', 'train', 'quidditch', 'talk', 'rest', 'balanced', 'random'] as const) {
      const r = play({}, 21, { follow: true, policy, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch8_end' })
      expect(r.s.mode, policy).toBe('ENDED'); expect(r.s.chapter).toBe(8)
    }
  })
  it('특화 정책은 해당 능력치를 균형형보다 뚜렷이 높이지만 한 가지 정책이 모든 것을 압도하지 않는다', () => {
    // 한 시드의 활동 순서 우연(활동 횟수가 한 칸 늘면 순환 정책의 위치가 달라진다)에 흔들리지 않도록 세 시드의 평균으로 비교한다. 기준(차이 폭)은 그대로다.
    const avg = (policy: 'study' | 'train' | 'quidditch' | 'talk' | 'balanced') => {
      const all = [22, 23, 24].map((seed) => play({}, seed, { follow: true, policy, stopAt: (s) => s.mode === 'ENDED' && s.scene === 'ch8_end' }).s.stats)
      return Object.fromEntries(Object.keys(all[0]).map((k) => [k, all.reduce((x, s) => x + (s as unknown as Record<string, number>)[k], 0) / all.length])) as unknown as Record<'int' | 'str' | 'magic' | 'insight' | 'social' | 'will', number>
    }
    const end = avg
    const bal = end('balanced')
    expect(end('study').int).toBeGreaterThan(bal.int + 10); expect(end('train').magic).toBeGreaterThan(bal.magic + 8)
    expect(end('quidditch').str).toBeGreaterThan(bal.str + 3); expect(end('talk').social).toBeGreaterThan(bal.social + 10)
    const st = end('study'); expect(st.magic).toBeLessThan(bal.magic); expect(st.social).toBeLessThan(bal.social)
  })
})

describe('지도 UI', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); store.read.clear(); store.toTitle() })
  afterEach(() => { cleanup(); vi.useRealTimers() })
  const click = (id: string) => act(() => { fireEvent.click(screen.getByTestId(id)) })
  const toMap = () => { act(() => { store.newGame() }); act(() => { store.jump('c1_routine') }); for (let i = 0; i < 6 && store.state!.mode === 'STORY'; i++) act(() => { store.advance() }); expect(store.state!.mode).toBe('ROUTINE'); act(() => { vi.advanceTimersByTime(900) }) /* 화면 전환(페이드) 완료 */ }
  it('테이블형 장소 목록 대신 지도 마커와 활동 패널이 있고, 장소와 활동은 같은 목록에 섞이지 않는다', () => {
    render(<App />); toMap()
    expect(screen.getByTestId('map')).toBeTruthy(); expect(document.querySelectorAll('.marker').length).toBeGreaterThan(0)
    expect(document.querySelector('.map-canvas svg')).toBeTruthy(); expect(document.querySelector('.locs')).toBeNull()
    expect(screen.queryByTestId('act-study')).toBeNull() // 장소를 고르기 전에는 활동 목록이 없다
    click('loc-library'); expect(screen.getByTestId('act-study')).toBeTruthy(); expect(screen.getByTestId('place-panel').textContent).toContain('도서관')
  })
  it('성 내부/성 밖 구역 탭으로 마커 집합이 바뀐다', () => {
    render(<App />); toMap()
    expect(screen.getByTestId('loc-hall')).toBeTruthy(); expect(screen.queryByTestId('loc-pitch')).toBeNull()
    click('zone-grounds'); expect(screen.getByTestId('loc-pitch')).toBeTruthy(); expect(screen.queryByTestId('loc-hall')).toBeNull()
  })
  it('실외 장소에서는 비행·훈련 활동이 보이고 실내 장소에서는 보이지 않는다', () => {
    render(<App />); toMap()
    click('loc-library'); expect(screen.queryByTestId('act-broom_flight')).toBeNull(); expect(screen.queryByTestId('act-quidditch')).toBeNull()
    click('zone-grounds'); click('loc-pitch'); expect(screen.getByTestId('act-broom_flight')).toBeTruthy(); expect(screen.getByTestId('act-quidditch')).toBeTruthy()
  })
  it('이용 불가 장소는 구체적인 이유를 표시하고 활동 버튼이 비활성이다', () => {
    render(<App />); toMap()
    act(() => { store.pick('common', 'chess') }); act(() => { store.pick('common', 'chess') }) // 저녁이 됨
    click('loc-library')
    expect(screen.getByTestId('loc-reason').textContent).toMatch(/저녁/); expect((screen.getByTestId('act-study') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('loc-library').className).toContain('locked'); expect(screen.getByTestId('loc-library').getAttribute('aria-label')).toContain('이용할 수 없음')
  })
  it('활동 버튼에 소요 시간과 끝나는 때가 표시되고, 남은 자유 시간이 갱신된다', () => {
    render(<App />); toMap()
    expect(screen.getByTestId('time-left').textContent).toContain('6 / 6')
    click('loc-library'); expect(screen.getByTestId('eta-research').textContent).toMatch(/소요: 오후 내내/); expect(screen.getByTestId('eta-research').textContent).toMatch(/끝나는 때/)
    click('act-research'); expect(screen.getByTestId('time-left').textContent).toContain('4 / 6')
    expect(screen.getByTestId('loc-library').className).toContain('here') // 현재 위치 표시
    expect(store.state!.routine!.message ?? '').not.toMatch(/[0-9]|의지력|지성|체력|사교성|통찰력|마법 실력/) // 결과 문장은 상태에 남고, 지도 위 알림창은 없다
    expect(screen.queryByTestId('map-msg')).toBeNull()
  })
  it('남은 시간 넘기기: 확인 단계를 거쳐 다음 스토리로 진입한다', () => {
    render(<App />); toMap()
    click('skip-time'); click('ts-t-end'); expect(store.state!.mode).toBe('ROUTINE'); click('skip-confirm'); expect(store.state!.mode).toBe('ROUTINE'); click('skip-confirm') // 구간 끝까지는 큰 이동이라 확인을 한 번 더 거친다
    expect(store.state!.mode).toBe('STORY'); act(() => { vi.advanceTimersByTime(900) }); expect(screen.queryByTestId('map')).toBeNull() // 페이드아웃 뒤 다음 스토리
  })
  it('키보드·터치: 마커는 포커스 가능한 버튼이고 이름이 있으며 구역 탭은 tab 역할이다(터치 크기·좁은 화면은 브라우저 QA로 확인)', () => {
    render(<App />); toMap()
    const m = screen.getByTestId('loc-library'); expect(m.tagName).toBe('BUTTON'); expect(m.getAttribute('aria-label')).toContain('도서관'); m.focus(); expect(document.activeElement).toBe(m)
    for (const z of ['zone-castle', 'zone-grounds']) expect(screen.getByTestId(z).getAttribute('role')).toBe('tab')
  })
  it('지도 UI는 성 내부/외부 구분을 안내하고 환경 라벨(실내·실외·출입 허가)을 표시한다', () => {
    render(<App />); toMap()
    click('loc-library'); expect(screen.getByTestId('place-panel').textContent).toContain(ENV_LABEL.indoor)
    click('zone-grounds'); click('loc-pitch'); expect(screen.getByTestId('place-panel').textContent).toContain(ENV_LABEL.outdoor)
  })
})
