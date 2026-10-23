import { useEffect, useRef, useState } from 'react'
import { nextBoundary, routineCursor, routineTotal, skipPlan } from '../engine/core'
import { store } from '../engine/store'
import { SLOTS, type GameState } from '../engine/types'
import { Modal } from './Overlays'

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const ANIM_MS = 900
const WEEKDAY = (d: { date: string; weekday: string }) => `${d.date.replace('-', '월 ')}일 ${d.weekday}요일`
/** 확인 한 번으로 이만큼(칸) 이상 넘어가면 "정말 넘길까요"를 한 번 더 묻는다(하루 3칸 = 한 날) */
const BIG_SKIP = 3

/**
 * 시간 건너뛰기: 쉬기 활동을 대신한다. 플레이어가 현재 일과 구간 안의 **미래 시각**(날짜·시간대)을 직접 고르고, 확인한 뒤 이동한다.
 * 규칙(엔진 skipPlan/skipTo): 과거·현재·구간 밖 불가, 필수 행사에서 멈춤, 선택 행사는 놓칠 수 있다고 사전 안내, 건너뛴 시간에는 능력치·이벤트 소비 없음.
 * 기본 선택은 바로 다음 시간대(1칸)다. 큰 이동(하루 이상, 구간 끝 포함)은 확인을 한 번 더 요구한다. 구간 끝까지 넘기는 것은 "자유 시간이 끝날 때까지" 버튼으로 직접 고를 때만이다. 이동은 상태를 바로 바꾸고, 시간 경과 연출은 그 위에서만 보인다(움직임 감소 시 생략).
 */
export function TimeSkip({ state, onClose }: { state: GameState; onClose: () => void }) {
  const r = state.routine!
  const cur = routineCursor(r), total = routineTotal(r)
  const [target, setTarget] = useState(Math.min(cur + 1, total))
  const [armed, setArmed] = useState(false) // 큰 이동의 2차 확인 대기
  const [anim, setAnim] = useState<null | { from: string; to: string }>(null)
  const busy = useRef(false)
  const plan = skipPlan(state, target)
  const label = (t: number) => (t >= total ? '자유 시간이 끝날 때까지(다음 이야기로 이어진다)' : `${WEEKDAY(r.days[Math.floor(t / SLOTS.length)])} ${SLOTS[t % SLOTS.length]}`)
  const lastLabel = `${WEEKDAY(r.days[r.days.length - 1])} ${SLOTS[SLOTS.length - 1]}`
  const bd = nextBoundary(state)
  // 장면 제목에 이미 요일이 들어 있으면("토요일 밤") 날짜만 앞에 붙인다("09월 07일 토요일 밤")
  const bdLabel = bd ? `${bd.date ? (bd.weekday && bd.title?.startsWith(`${bd.weekday}요일`) ? `${bd.date.replace('-', '월 ')}일` : WEEKDAY({ date: bd.date, weekday: bd.weekday ?? '' }).replace('요일 ', '요일')) + ' ' : ''}${bd.title ?? '다음 이야기'}`.trim() : '다음 이야기'
  const elapsed = (n: number) => `${n}칸${n >= SLOTS.length ? ` (약 ${Math.floor(n / SLOTS.length)}일${n % SLOTS.length ? ` ${n % SLOTS.length}칸` : ''})` : ''}`
  const nowLabel = `${WEEKDAY(r.days[r.dayIdx])} ${SLOTS[r.slotIdx]}`
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const confirm = () => {
    if (busy.current || !plan.ok) return
    if (plan.slots >= BIG_SKIP && !armed) { setArmed(true); return } // 큰 이동: 소모량을 다시 보여 주고 한 번 더 확인한다(상태는 아직 바뀌지 않았다)
    busy.current = true // 연타해도 한 번만 실행(중간 사건·자동 저장 중복 방지)
    const to = plan.stopAt ?? target
    const result = store.skipTo(target)
    if (!result?.ok) { busy.current = false; return }
    if (to >= total || reduced()) { onClose(); return } // 일과가 끝나면 화면 전환 연출이 이어진다 / 움직임 감소
    setAnim({ from: nowLabel, to: label(to) })
    timer.current = window.setTimeout(onClose, ANIM_MS)
  }

  return (
    <Modal title="시간 건너뛰기" onClose={() => { if (!busy.current) onClose() }}>
      {anim ? (
        <div className="ts-anim" data-testid="ts-anim" role="status">
          <p className="ts-from">{anim.from}</p><div className="ts-sweep" aria-hidden="true" /><p className="ts-to">{anim.to}</p>
        </div>
      ) : (
        <div data-testid="ts-modal">
          <p className="muted">지금은 <b data-testid="ts-now">{nowLabel}</b>이다. 가고 싶은 시각을 고르세요. 지나간 시각은 고를 수 없다. 건너뛴 시간에는 아무것도 하지 않은 것으로 흘러가며, 얻는 것이 없다.</p>
          <p className="muted" data-testid="ts-max">이 구간에서 갈 수 있는 가장 먼 시점은 <b>{lastLabel}</b>이다. 그 뒤에는 거쳐야 하는 장면(<span data-testid="ts-boundary">{bdLabel}</span>)이 시작되므로, 시간 건너뛰기는 그 앞에서 멈춘다.</p>
          <div className="ts-days">
            {r.days.map((d, di) => (
              <div key={d.date} className="ts-day"><small>{WEEKDAY(d)}</small>
                <div className="ts-slots">
                  {SLOTS.map((sl, si) => {
                    const t = di * SLOTS.length + si; const disabled = t <= cur
                    return <button key={sl} type="button" className={`btn ts-slot${t === target ? ' on' : ''}`} disabled={disabled} aria-pressed={t === target} data-testid={`ts-t-${t}`} onClick={() => { setTarget(t); setArmed(false) }}>{sl}{t === cur ? ' (지금)' : ''}</button>
                  })}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className={`btn ts-end${target === total ? ' on' : ''}`} aria-pressed={target === total} data-testid="ts-t-end" onClick={() => { setTarget(total); setArmed(false) }}>{label(total)}</button>
          <div className="ts-plan" data-testid="ts-plan" aria-live="polite">
            {!plan.ok ? <p className="reason" data-testid="ts-reason">{plan.reason}</p> : (
              <>
                <p><b>{label(plan.stopAt ?? target)}</b>{plan.stopAt !== undefined ? '에서 멈춘다' : '까지'} · <span data-testid="ts-elapsed">경과 {elapsed(plan.slots)}</span></p>
                {plan.stopAt !== undefined && <p className="reason" data-testid="ts-stop">필수 일정 때문에 그 시각에서 멈춘다: {plan.stopTitle}</p>}
                {plan.missable.length > 0 && <p className="ts-warn" data-testid="ts-warn">이동하면 놓칠 수 있는 일정: {plan.missable.map((m) => m.title).join(', ')}</p>}
              </>
            )}
          </div>
          {armed && plan.ok && <p className="ts-warn" role="alert" data-testid="ts-armed">정말 {elapsed(plan.slots)}을 한꺼번에 넘길까요? 건너뛴 시간에는 아무 활동도 하지 않은 것으로 흘러가고, 위에 적힌 일정은 놓칠 수 있습니다.</p>}
          <div className="ts-actions">
            <button type="button" className="btn primary" disabled={!plan.ok} onClick={confirm} data-testid="skip-confirm">{armed ? `예, ${elapsed(plan.slots)} 넘긴다` : '이동한다'}</button>
            <button type="button" className="btn ghost" onClick={onClose} data-testid="ts-cancel">취소</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
