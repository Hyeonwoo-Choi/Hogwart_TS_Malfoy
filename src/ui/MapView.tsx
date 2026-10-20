import { useState } from 'react'
import { ACTIVITIES, LOCATIONS, STAT_KO } from '../data/constants'
import { store } from '../engine/store'
import { SLOTS, type GameState } from '../engine/types'

export function MapView({ state }: { state: GameState }) {
  const r = state.routine!
  const [loc, setLoc] = useState<string | null>(null)
  const pick = (act: string) => { const l = loc!; setLoc(null); store.pick(l, act) }
  return (
    <main className="mapview" data-testid="map">
      <header className="map-head">
        <div>
          <h1>{state.calendar.date.replace('-', '월 ')}일 {state.calendar.weekday}요일</h1>
          <div className="slots-pips" aria-label="오늘의 시간대">
            {SLOTS.map((s, i) => <span key={s} className={i < r.slotIdx ? 'used' : i === r.slotIdx ? 'now' : ''}>{s}</span>)}
          </div>
        </div>
        <p className="muted">{r.days.length - r.dayIdx}일 남음</p>
      </header>
      {r.message && <p className="map-msg" data-testid="map-msg">{r.message}</p>}
      <div className="map-grid">
        <section className="locs" aria-label="장소">
          {r.locations.map((id) => (
            <button key={id} className="loc" onClick={() => setLoc(id)} data-testid={`loc-${id}`}>
              <strong>{LOCATIONS[id].name}</strong><span>{LOCATIONS[id].desc}</span>
            </button>
          ))}
        </section>
        <aside className="stats" aria-label="능력치">
          <h2>능력치</h2>
          {Object.entries(state.stats).map(([k, v]) => (
            <div key={k} className="stat" data-testid={`stat-${k}`}><span>{STAT_KO[k]}</span><div><i style={{ width: `${v}%` }} /></div><b>{v}</b></div>
          ))}
        </aside>
      </div>
      {loc && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setLoc(null) }} role="dialog" aria-label="활동 선택">
          <div className="modal">
            <header><h2>{LOCATIONS[loc].name}에서</h2><button className="btn ghost" onClick={() => setLoc(null)}>취소</button></header>
            <div className="modal-body menu-list">
              {ACTIVITIES.map((a) => (
                <button key={a.id} className="btn" onClick={() => pick(a.id)} data-testid={`act-${a.id}`}>{a.name}<small>{a.desc}</small></button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
