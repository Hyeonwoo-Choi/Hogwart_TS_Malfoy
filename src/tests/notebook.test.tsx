import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { CasesPanel } from '../ui/Notebook'
import { onUiEffect, type UiEffect } from '../ui/effects'
import { store } from '../engine/store'
import { applyEffects, newState } from '../engine/core'
import { evalCond } from '../engine/cond'
import { validateSave } from '../engine/save'
import { CASES, buildCases } from '../data/cases'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { GameState } from '../engine/types'

const fresh = () => newState(START_SCENE)
const withChoice = (s: GameState, id: string, option: string) => { s.choices.push({ id, option, scene: 't', date: '09-01' }); return s }
const start = () => { render(<App />); act(() => { fireEvent.click(screen.getByTestId('new-game')) }) }

beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.clear(); store.read.clear(); store.toTitle()
  store.updateSettings({ typing: 'instant', autoSpeed: 'fast', timer: 'normal', textSize: 2 })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('마법 수첩: 메뉴와 탐색', () => {
  it('메뉴에는 마법 수첩이 설정 옆에 있고, 기존 세 기록 항목은 없으며 나머지 항목은 유지된다', () => {
    start(); act(() => { fireEvent.click(screen.getByTestId('btn-menu')) })
    const labels = Array.from(document.querySelectorAll('.menu-list button')).map((b) => b.textContent)
    expect(labels).not.toContain('마법사의 기록'); expect(labels).not.toContain('인물 관찰 기록'); expect(labels).not.toContain('세계관 용어집')
    for (const l of ['계속하기', '저장하기', '불러오기', '대화 기록', '설정', '타이틀로']) expect(labels).toContain(l)
    expect(labels.indexOf('마법 수첩')).toBe(labels.indexOf('설정') + 1)
  })

  it('수첩은 인물 기록 → 사건 수첩 → 마법 용어집으로 이동하며(탭·방향키), 열람과 닫기가 게임 상태를 바꾸지 않는다', () => {
    start(); act(() => { store.jump('v2c1_train') })
    const before = JSON.stringify(store.state)
    act(() => { fireEvent.click(screen.getByTestId('btn-menu')) }); act(() => { fireEvent.click(screen.getByTestId('menu-notebook')) })
    expect(screen.getByTestId('nb-page').getAttribute('data-section')).toBe('characters')
    act(() => { fireEvent.click(screen.getByTestId('nb-tab-cases')) }); expect(screen.getByTestId('nb-page').getAttribute('data-section')).toBe('cases')
    act(() => { fireEvent.keyDown(screen.getByTestId('nb-tab-cases'), { key: 'ArrowRight' }) }); expect(screen.getByTestId('nb-page').getAttribute('data-section')).toBe('glossary')
    act(() => { fireEvent.keyDown(screen.getByTestId('nb-tab-glossary'), { key: 'ArrowLeft' }) }); expect(screen.getByTestId('nb-page').getAttribute('data-section')).toBe('cases')
    expect(screen.getByTestId('nb-tab-cases').getAttribute('aria-selected')).toBe('true')
    act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    expect(screen.queryByTestId('notebook')).toBeNull()
    expect(JSON.stringify(store.state)).toBe(before)
  })

  it('열림·페이지 전환·닫힘이 효과 신호로만 알려진다(구독이 없어도 동작)', () => {
    const got: UiEffect[] = []; const off = onUiEffect((e) => got.push(e))
    start(); act(() => { fireEvent.click(screen.getByTestId('btn-menu')) }); act(() => { fireEvent.click(screen.getByTestId('menu-notebook')) })
    act(() => { fireEvent.click(screen.getByTestId('nb-tab-glossary')) }); act(() => { fireEvent.click(screen.getByLabelText('닫기')) })
    expect(got.map((e) => e.type + (e.id ? `:${e.id}` : '')).filter((t) => t.startsWith('notebook'))).toEqual(['notebook-open', 'notebook-page:glossary', 'notebook-close'])
    off()
  })
})

describe('사건 수첩', () => {
  it('단서가 없는 상태에는 사건이 없고, 첫 단서를 얻은 사건만 나타난다(다른 사건의 제목도 알리지 않는다)', () => {
    const s = fresh()
    expect(buildCases(s)).toEqual([])
    render(<CasesPanel state={s} />)
    expect(screen.getByTestId('cases').textContent).toContain('아직 사건이라고 부를 만한 일이 없다')
    expect(screen.getByTestId('cases').textContent).not.toMatch(/말포이|성 위쪽|7층/)
    cleanup()
    applyEffects(s, ['kn:OB_SLEEVE'])
    const c = buildCases(s); expect(c.map((x) => x.id)).toEqual(['draco-behavior'])
    expect(c[0].status).toBe('단서 부족'); expect(c[0].obs).toHaveLength(1)
    expect(JSON.stringify(c)).not.toMatch(/7층|톱밥|불빛/)
  })

  it('직접 본 것·들은 이야기·추측·의문·결론이 분리되고, 들은 이야기에는 말한 사람이 붙는다', () => {
    const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE', 'kn:OB_TREMOR', 'kn:KN_OVERHEARD'])
    withChoice(s, 'K-02', 'A'); withChoice(s, 'K-03', 'A'); withChoice(s, 'H-01', 'A'); applyEffects(s, ['flag:FLAG_PUBLIC_RESCUE'])
    const c = buildCases(s)[0]
    expect(c.obs.length).toBeGreaterThanOrEqual(4)
    expect(c.testimony.map((t) => t.from).sort()).toEqual(['지니', '판시', '헤르미온느'])
    expect(c.testimony.every((t) => !c.obs.includes(t.text))).toBe(true)
    expect(c.inferences.length).toBeGreaterThan(0); expect(c.inferences.length).toBeLessThanOrEqual(2)
    expect(c.inferences.join(' ')).toMatch(/추측|것 같다|모른다|걸지도/)
    expect(c.questions.length).toBeGreaterThan(0)
    expect(c.resolution).toEqual([]) // 확인 전에는 결론이 없다
    expect(c.status).toBe('조사 중')
  })

  it('같은 사건도 겪은 방식(선택)에 따라 기록이 달라진다(K-04 A/B/C/D)', () => {
    const outs = ['A', 'B', 'C', 'D'].map((k) => {
      const s = fresh(); applyEffects(s, ['kn:OB_WINDOW', `flag:${{ A: 'FLAG_REPORTED_NIGHT', B: 'FLAG_MUTUAL_SECRET', C: 'FLAG_CONFRONTED_NIGHT', D: 'FLAG_FOLLOWED_NIGHT' }[k]}`])
      const u = buildCases(s).find((c) => c.id === 'upper-floors')!
      return JSON.stringify([u.obs, u.testimony, u.questions])
    })
    expect(new Set(outs).size).toBe(3) // A·C는 같은 사실, B는 말포이의 말, D는 기둥 뒤 관찰
    expect(outs[1]).not.toBe(outs[3]); expect(outs[0]).toBe(outs[2])
  })

  it('루나가 말한 불빛은 들은 이야기, 말포이가 올려다본 창은 직접 본 것으로 구분되고 추측은 둘이 모였을 때만 나온다', () => {
    const s = fresh(); applyEffects(s, ['kn:OB_WINDOW'])
    let u = buildCases(s).find((c) => c.id === 'upper-floors')!
    expect(u.obs.join(' ')).toContain('올려다봤다'); expect(u.testimony).toEqual([]); expect(u.inferences).toEqual([])
    applyEffects(s, ['flag:FLAG_HR1_LUN_LAKE'])
    u = buildCases(s).find((c) => c.id === 'upper-floors')!
    expect(u.testimony.map((t) => t.from)).toEqual(['루나']); expect(u.testimony[0].text).not.toMatch(/7층/) // 루나는 층을 특정하지 않았다
    expect(u.inferences.join(' ')).toContain('같은 곳을 가리키는 것 같다')
  })

  it('해결 조건이 참이 되면 결론이 나타나고 당시의 추측과 나란히 보이며 의문은 접힌다(결론 전에는 항목 자체가 없다)', () => {
    const def = CASES[0]; const extra = { kind: 'resolution' as const, when: 'FLAG_TEST_RESOLVED', text: '확인된 결론(테스트)', prio: 0 }
    def.items.push(extra)
    try {
      const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE', 'kn:OB_TREMOR'])
      expect(buildCases(s)[0].resolution).toEqual([])
      render(<CasesPanel state={s} />); expect(screen.getByTestId('cases').textContent).not.toContain('확인된 결론'); cleanup()
      applyEffects(s, ['flag:FLAG_TEST_RESOLVED'])
      const c = buildCases(s)[0]; expect(c.status).toBe('해결'); expect(c.resolution).toEqual(['확인된 결론(테스트)']); expect(c.inferences.length).toBeGreaterThan(0)
      render(<CasesPanel state={s} />)
      const t = screen.getByTestId('cases').textContent!
      expect(t).toContain('확인된 결론'); expect(t).toContain('당시의 추측'); expect(t).not.toContain('풀리지 않은 의문')
    } finally { def.items.pop() }
  })

  it('수치·연애·관계 상태·지식 단계가 바뀌어도 사건 수첩은 달라지지 않고, 저장·복원 후에도 같다', () => {
    const s = fresh(); applyEffects(s, ['kn:OB_SLEEVE', 'kn:OB_TREMOR', 'meet:ginny'])
    const before = JSON.stringify(buildCases(s))
    applyEffects(s, ['romance:ginny=together', 'stage:ginny+2', 'ginny.affinity+10', 'draco.affinity+12', 'draco.attraction+12', 'know:pansy=4'])
    expect(JSON.stringify(buildCases(s))).toBe(before)
    const f = { schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: s }
    expect(JSON.stringify(buildCases(validateSave(JSON.parse(JSON.stringify(f))).state))).toBe(before)
  })

  it('금지어·내부 용어가 없고, 조건식이 해석되며 참조하는 플래그·관찰·선택지가 시나리오에 있다', () => {
    const banned = /변신|환영|여성|여자|캐비닛|사라지는|표식|호감|신뢰도|연애|연인|사랑|좋아한다|질투|FLAG_|KN_|OB_|stage|romance|know\.|affinity/
    const scenario = JSON.stringify(SCENARIO); const s = fresh()
    for (const c of CASES) {
      expect(c.title).not.toMatch(banned)
      for (const cond of [c.unlock, ...c.items.map((i) => i.when)]) {
        expect(() => evalCond(s, cond), cond).not.toThrow()
        for (const m of cond.matchAll(/\b(FLAG|KN|OB)_[A-Z0-9_]+/g)) {
          if (m[0] === 'FLAG_TEST_RESOLVED') continue
          expect(scenario.includes(`flag:${m[0]}`) || scenario.includes(`kn:${m[0]}`), `${m[0]} 설정 없음`).toBe(true)
        }
        for (const m of cond.matchAll(/\bCH_([A-Z])(\d+)_([A-Z])\b/g)) {
          const id = `${m[1]}-${m[2].padStart(2, '0')}`
          expect(scenario.includes(`"id":"${id}"`) && scenario.includes(`"key":"${m[3]}"`), `${m[0]} 선택지 없음`).toBe(true)
        }
      }
      for (const i of c.items) expect(i.text + (i.from ?? ''), i.text).not.toMatch(banned)
    }
  })
})
