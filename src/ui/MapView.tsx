import { useEffect, useRef, useState } from 'react'
import { openEventsAt } from '../data/calendar'
import { emitUiEffect } from './effects'
import { Board } from './Board'
import { TimeSkip } from './TimeSkip'
import { Modal } from './Overlays'
import { LOCATIONS, STAT_KO } from '../data/constants'
import { MAP_VIEW, MARKERS, SHAPES, ZONES } from '../data/mapLayout'
import { ENV_LABEL, PLACE_RULES, durLabel, type Zone } from '../data/places'
import { appointmentConflicts, listActions, placeInfo, remainingSlots, routineTotal } from '../engine/core'
import { store } from '../engine/store'
import { SLOTS, type GameState } from '../engine/types'

let lastNotice = ''
/** 자유 일과 지도: 장소(지도 마커) → 활동 패널. 장소와 활동은 같은 목록에 섞지 않는다. */
export function MapView({ state }: { state: GameState }) {
  const r = state.routine!
  const places = r.locations.filter((id) => MARKERS[id] && PLACE_RULES[id])
  const [zone, setZone] = useState<Zone>(() => (r.at && MARKERS[r.at] ? MARKERS[r.at].zone : 'castle'))
  const [sel, setSel] = useState<string | null>(null)
  const [skipOpen, setSkipOpen] = useState(false)
  /* 활동 결과는 장면이 전한다. 이벤트로 시간이 더 흐른 경우의 안내만 지도를 밀지 않는 작은 알림(토스트)으로 한 번 보여 준다 */
  useEffect(() => { if (r.notice && r.notice !== lastNotice) store.say(r.notice); lastNotice = r.notice ?? lastNotice }, [r.notice])
  /* 능력치는 지도를 가리지 않는 보조 패널. 좁은 화면에서는 접힌 채 시작한다 */
  const [statsOpen, setStatsOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia || !window.matchMedia('(max-width: 767px)').matches)
  const panelRef = useRef<HTMLElement>(null)
  /* 사용자가 직접 펼친 능력치는 장소를 골라도 닫지 않는다. 직접 펼친 적이 없으면 활동 목록이 열릴 때 자동으로 접는다 */
  const userOpened = useRef(false)
  const toggleStats = () => { setStatsOpen((o) => { userOpened.current = !o; return !o }) }
  const choosePlace = (id: string) => { setSel(id); if (!userOpened.current) setStatsOpen(false); /* 한 열로 쌓이는 좁은 화면에서만 활동 패널로 스크롤한다(두 열 배치에서는 지도 위치를 흔들지 않는다) */ if (window.matchMedia?.('(max-width: 1023px)').matches) window.setTimeout(() => panelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 0) }
  const left = remainingSlots(state), total = routineTotal(r)
  const selInfo = sel ? placeInfo(state, sel) : null
  const acts = sel ? listActions(state, sel) : []
  /* 약속 시각과 겹치는 활동은 한 번 확인한다. 확인 전에는 상태를 바꾸지 않고(취소하면 그대로), 진행을 고른 때에만 한 번 적용한다 */
  const [risk, setRisk] = useState<{ loc: string; act: string; titles: string[] } | null>(null)
  const run = (l: string, act: string) => { setSel(null); setRisk(null); if (act.startsWith('ev:')) emitUiEffect({ type: 'event-join', id: act.slice(3) }); store.pick(l, act) }
  const pick = (act: string) => { const l = sel!; const c = appointmentConflicts(state, l, act); if (c.length) setRisk({ loc: l, act, titles: c.map((x) => x.title) }); else run(l, act) }
  const [boardOpen, setBoardOpen] = useState(false)
  const zonePlaces = places.filter((id) => MARKERS[id].zone === zone)
  return (
    <main className="mapview" data-testid="map">
      <header className="map-head">
        <div>
          <h1>{state.calendar.date.replace('-', '월 ')}일 {state.calendar.weekday}요일 · {state.calendar.slot}</h1>
          <div className="day-strip" aria-label="남은 자유 시간">
            {r.days.map((d, di) => (
              <div key={d.date} className="day-cell">
                <small>{d.date.replace('-', '/')} {d.weekday}</small>
                <div className="slots-pips">
                  {SLOTS.map((s, si) => { const t = di * SLOTS.length + si; const cur = r.dayIdx * SLOTS.length + r.slotIdx; return <span key={s} className={t < cur ? 'used' : t === cur ? 'now' : ''}>{s}</span> })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="map-clock">
          <p className="muted" data-testid="time-left">남은 자유 시간 {left} / {total} 시간대</p>
          <button className="btn" onClick={() => setBoardOpen(true)} data-testid="board-open">게시판</button>
          <button className="btn ghost" onClick={() => setSkipOpen(true)} data-testid="skip-time">시간 건너뛰기</button>
        </div>
      </header>
      {skipOpen && <TimeSkip state={state} onClose={() => setSkipOpen(false)} />}
      {risk && (
        <Modal title="약속과 겹치는 시간" onClose={() => setRisk(null)}>
          <div data-testid="appt-confirm">
            <p className="ts-warn" role="alert" data-testid="appt-warn">이 일을 하는 동안 약속한 시각이 지나간다: {risk.titles.join(', ')}. 그 약속 자리에는 갈 수 없게 된다.</p>
            <p className="muted">그래도 이 활동을 할까요? 취소하면 시간도 장소도 그대로다.</p>
            <div className="ts-actions">
              <button type="button" className="btn primary" onClick={() => run(risk.loc, risk.act)} data-testid="appt-go">그래도 한다</button>
              <button type="button" className="btn ghost" onClick={() => setRisk(null)} data-testid="appt-cancel">취소</button>
            </div>
          </div>
        </Modal>
      )}
      {boardOpen && <Board state={state} onClose={() => setBoardOpen(false)} />}
      <div className="map-layout">
        <section className="map-area" aria-label="지도">
          <div className="zone-tabs" role="tablist" aria-label="지도 구역">
            {ZONES.map((z) => (
              <button key={z.id} role="tab" aria-selected={zone === z.id} className={`btn ghost${zone === z.id ? ' on' : ''}`} onClick={() => { setZone(z.id); setSel(null) }} data-testid={`zone-${z.id}`}>{z.label}</button>
            ))}
          </div>
          <p className="muted zone-hint">{ZONES.find((z) => z.id === zone)!.hint}</p>
          <div className="map-canvas" data-zone={zone}>
            <svg viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`} aria-hidden="true" focusable="false">
              {SHAPES[zone].map((sh, i) => {
                if (sh.k === 'rect') return <rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.rx} className={sh.cls} />
                if (sh.k === 'ellipse') return <ellipse key={i} cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry} className={sh.cls} />
                if (sh.k === 'line') return <line key={i} x1={sh.x1} y1={sh.y1} x2={sh.x2} y2={sh.y2} className={sh.cls} />
                return <text key={i} x={sh.x} y={sh.y} className={sh.cls}>{sh.t}</text>
              })}
            </svg>
            {zonePlaces.map((id) => {
              const m = MARKERS[id]; const pi = placeInfo(state, id); const hasEv = pi.ok && openEventsAt(state, id).length > 0
              return (
                <button key={id} className={`marker${sel === id ? ' sel' : ''}${r.at === id ? ' here' : ''}${pi.ok ? '' : ' locked'}${hasEv ? ' has-event' : ''}`}
                  style={{ left: `${m.x}%`, top: `${(m.y / MAP_VIEW.h) * 100}%` }} onClick={() => choosePlace(id)} data-testid={`loc-${id}`}
                  aria-label={`${LOCATIONS[id].name}${r.at === id ? ' (현재 위치)' : ''}${hasEv ? ' — 지금 열린 행사가 있음' : ''}${pi.ok ? '' : ' — 지금은 이용할 수 없음'}`} aria-pressed={sel === id}>
                  <i aria-hidden="true" />
                  <span>{LOCATIONS[id].name}{hasEv ? ' ★' : ''}</span>
                </button>
              )
            })}
          </div>
        </section>
        <div className="map-side">
        <section className="map-panel" ref={panelRef} aria-live="polite" data-testid="place-panel">
          {!sel || !selInfo ? <p className="muted">지도에서 갈 곳을 고르세요.</p> : (
            <div className="panel-body" key={sel}>
              <header>
                <h2>{LOCATIONS[sel].name}</h2>
                <span className="badge">{ENV_LABEL[PLACE_RULES[sel].env]}</span>
              </header>
              <p className="muted">{LOCATIONS[sel].desc}</p>
              {!selInfo.ok && <p className="reason" data-testid="loc-reason">{selInfo.reason}</p>}
              <div className="menu-list">
                {acts.map((a) => (
                  <button key={a.actId} className="btn" disabled={!a.ok} onClick={() => pick(a.actId)} data-testid={`act-${a.actId}`}>
                    {a.name}<small>{a.desc}</small>
                    <small className="eta" data-testid={`eta-${a.actId}`}>{a.ok ? `소요: ${durLabel(a.dur)} · 끝나는 때: ${a.endsAt}` : a.reason === selInfo.reason ? '지금은 할 수 없다.' : a.reason}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
        <aside className="stats" aria-label="능력치">
          <button type="button" className="stats-toggle" aria-expanded={statsOpen} aria-controls="stats-body" onClick={toggleStats} data-testid="stats-toggle">
            <h2>능력치</h2><span>{statsOpen ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>
          <div className={`stats-collapse${statsOpen ? ' open' : ''}`} id="stats-body" aria-hidden={!statsOpen}>
            <div className="stats-inner">
              {Object.entries(state.stats).map(([k, v]) => (
                <div key={k} className="stat" data-testid={`stat-${k}`}><span>{STAT_KO[k]}</span><div><i style={{ width: `${v}%` }} /></div><b>{v}</b></div>
              ))}
            </div>
          </div>
        </aside>
        </div>
      </div>
    </main>
  )
}
