import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { applyEffects, newState } from '../engine/core'
import { buildJournal } from '../data/journal'
import { JournalPanel } from '../ui/Journal'
import { SCENARIO, START_SCENE } from '../data/scenario'

/**
 * H-08(이번 주에 먼저 파고들 일) 선택지 맥락 보강과 마법 노트 프로필 카드 검증.
 * 자동 테스트는 텍스트·구조·상태 규칙을 증명하며, 실제 읽는 맛과 카드의 시각적 균형은 브라우저 확인 항목이다.
 */
afterEach(cleanup)
const txt = (id: string) => JSON.stringify(SCENARIO[id])
const nodes = (id: string) => SCENARIO[id] as any[]
describe('H-08: 선택지에 쓰인 단서는 직전 장면에서 먼저 경험된다', () => {
  const week = nodes('v2c1_week'), choice = week.find((n) => n.t === 'choice')
  it('선택지 수·ID·분기 대상은 그대로다(A~F 여섯 개, 아무것도 안 따라가는 길 유지)', () => {
    expect(choice.id).toBe('H-08'); expect(choice.options.map((o: any) => o.key)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(choice.options.find((o: any) => o.key === 'F').fx ?? []).toEqual([])
    expect(choice.options.find((o: any) => o.key === 'B').goto).toBe('v2c1_week_B')
  })
  it('양피지·경기장 소리·벤치 쪽지·지하 불빛은 선택 직전 서술에 나오고, 내용은 아직 모른다', () => {
    const intro = week.filter((n) => n.t === 'line').map((n) => n.text).join('|')
    for (const w of ['접힌 양피지', '둔탁한', '벤치', '지하 교실']) expect(intro).toContain(w)
    expect(intro).toMatch(/펼쳐 보지 않았다/); expect(intro).toMatch(/줍지 않고 지나쳤다/)
  })
  it('선택지 문구는 아직 모르는 단서의 내용을 앞질러 말하지 않는다(이름·내용 단정 없음)', () => {
    const t = choice.options.map((o: any) => o.text).join('|')
    expect(t).not.toMatch(/헤르미온느|지니|루나|판시|말포이|드레이코|론|불안|비밀|협박|쪽지에 적/)
  })
  it('마법약 수업 끝에서 양피지를 받고, 안뜰 벤치 종이가 먼저 눈에 띈다', () => {
    expect(txt('v2c1_potions_end')).toContain('접은 양피지'); expect(txt('v2c1_potions_end')).toContain('지하 교실')
    expect(txt('v2c1_tue_pansy_end')).toContain('벤치')
  })
  it('선택한 단서가 아닌 일은 기록(수첩)에 쓰이지 않는다: 시작 상태·H-08 직후 기록은 선택한 인물 외 내용이 없다', () => {
    const s = newState(START_SCENE, 1); applyEffects(s, ['flag:FLAG_RT_LUNA'])
    expect(buildJournal(s)).toEqual([])
  })
})

describe('마법 노트 프로필 카드', () => {
  const withDraco = () => { const s = newState(START_SCENE, 1); applyEffects(s, ['kn:OB_SLEEVE']); return s }
  it('이름 헤더 + 이미지 영역 + 정보 영역으로 구성되고 기존 테스트 ID를 유지한다', () => {
    const s = withDraco(); s.seen = { draco: { expr: 'angry', form: 'base', note: '소매를 당겨 내렸다' } as any }
    const { container } = render(<JournalPanel state={s} />)
    const card = container.querySelector('[data-testid="j-portrait"]')!
    expect(card.querySelector('.j-card-head h3')?.textContent).toBeTruthy()
    expect(card.querySelector('[data-testid="j-face"]')).toBeTruthy()
    expect(screen.getByTestId('j-expr').textContent).toBeTruthy(); expect(screen.getByTestId('j-note').textContent).toContain('소매')
  })
  it('이미지가 없는 인물도 카드가 깨지지 않고 중립 문구로 채워진다(내부 상태 이름 미노출)', () => {
    const s = withDraco(); s.seen = {}
    const { container } = render(<JournalPanel state={s} />)
    const card = container.querySelector('[data-testid="j-portrait"]')!
    expect(card.querySelector('[data-testid="j-face"]')).toBeTruthy()
    expect(screen.getByTestId('j-expr').textContent).toContain('아직 표정을')
    expect(card.textContent).not.toMatch(/FLAG_|KN_|OB_|illusion|true form|undefined|null/)
  })
  it('수첩의 자리표시 인물은 위쪽 빈 여백을 줄인 뷰박스로 크게 그려지고 비율은 유지된다(수첩에서만)', () => {
    const s = withDraco(); const { container } = render(<JournalPanel state={s} />)
    const svg = container.querySelector('.j-face .char-svg')!
    expect(svg.getAttribute('viewBox')).toBe('20 84 260 436'); expect(svg.getAttribute('preserveAspectRatio')).toBeNull()
  })
  it('카드 아래의 기존 상세 기록은 그대로 보인다', () => {
    const s = withDraco(); const { container } = render(<JournalPanel state={s} />)
    expect(container.textContent).toContain('소매')
  })
})
