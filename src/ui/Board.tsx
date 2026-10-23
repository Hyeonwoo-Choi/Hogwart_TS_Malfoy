import { useEffect, useMemo } from 'react'
import { boardView, type BoardItem, type BoardStatus } from '../data/calendar'
import { LOCATIONS } from '../data/constants'
import { store } from '../engine/store'
import { SLOTS, type GameState } from '../engine/types'
import { emitUiEffect } from './effects'
import { Modal } from './Overlays'

const STATUS_KO: Record<BoardStatus, string> = { today: '지금 참여 가능', upcoming: '예정', done: '참가함', missed: '놓침' }
const WEEKDAY_OF = (state: GameState, date: string) => state.routine?.days.find((d) => d.date === date)?.weekday ?? ''
const slotLabel = (slots: number[]) => (slots.length === 1 ? SLOTS[slots[0]] : `${SLOTS[slots[0]]}~${SLOTS[slots[slots.length - 1]]}`)

/**
 * 학사 게시판: 이번 달 행사·일정. 학생이 알 수 있는 공지만 보이며(보이지 않는 일정은 존재도 알리지 않는다),
 * 열람은 읽음 표시(state.board.read) 외에 시간·상태를 바꾸지 않는다. 지난 일정은 놓친 것도 기록으로 남는다.
 */
export function Board({ state, onClose }: { state: GameState; onClose: () => void }) {
  const { month, items } = useMemo(() => boardView(state), [state])
  useEffect(() => { emitUiEffect({ type: 'board-open' }) }, [])
  const upcoming = items.filter((i) => i.status === 'today' || i.status === 'upcoming')
  const past = items.filter((i) => i.status === 'done' || i.status === 'missed')
  const card = (i: BoardItem) => (
    <li key={i.id} className={`bd-item bd-${i.status}${i.read ? ' read' : ''}`} data-testid={`bd-${i.id}`} data-status={i.status}>
      <button type="button" className="bd-head" onClick={() => store.markNoticeRead(i.id)}>
        <span className="bd-date">{i.date.replace('-', '월 ')}일{WEEKDAY_OF(state, i.date) ? ` ${WEEKDAY_OF(state, i.date)}요일` : ''} · {slotLabel(i.slots)}</span>
        <strong className="bd-title">{i.title}</strong>
        <span className={`badge bd-badge-${i.status}`}>{STATUS_KO[i.status]}</span>
        {!i.read && i.status !== 'done' && <span className="bd-dot" aria-label="새 공지">●</span>}
      </button>
      <p className="bd-place">{LOCATIONS[i.place]?.name ?? i.place}{i.kind === 'appointment' ? ' · 약속' : i.kind === 'plan' ? ' · 내 계획' : ''}</p>
      <p>{i.notice}</p>
      {i.terms && <p className="muted small">참가 조건: {i.terms}</p>}
      {i.lore && <p className="muted small">{i.lore}</p>}
      {i.conflictWith.length > 0 && i.status !== 'done' && i.status !== 'missed' && <p className="bd-conflict small">같은 시간대에 <b>{i.conflictWith.join(', ')}</b>도 있다. 둘 중 하나만 갈 수 있다.</p>}
      {i.status === 'missed' && <p className="muted small">지난 일정이다. 놓친 행사는 다시 열리지 않는다.</p>}
    </li>
  )
  return (
    <Modal title="학사 게시판" onClose={onClose} wide>
      <div className="board" data-testid="board">
        <h3 className="bd-month">{month}월 일정</h3>
        {items.length === 0 && <p className="muted">이번 달에 붙은 공지가 없다.</p>}
        {upcoming.length > 0 && <section><h4>앞으로의 일정</h4><ul>{upcoming.map(card)}</ul></section>}
        {past.length > 0 && <section><h4>지난 일정</h4><ul>{past.map(card)}</ul></section>}
      </div>
    </Modal>
  )
}
