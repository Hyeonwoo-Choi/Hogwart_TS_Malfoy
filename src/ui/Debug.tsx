import { useState } from 'react'
import { store } from '../engine/store'
import type { GameState } from '../engine/types'

/** ?debug=1 일 때만 표시되는 개발용 오버레이. 감정 수치는 일반 UI에 표시하지 않는다. */
export function DebugPanel({ state }: { state: GameState }) {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('draco.trust')
  const [val, setVal] = useState('30')
  const [flag, setFlag] = useState('')
  return (
    <aside className="debug" data-testid="debug" onClick={(e) => e.stopPropagation()}>
      <button className="btn ghost" onClick={() => setOpen(!open)}>DEBUG {open ? '▾' : '▸'}</button>
      {open && (
        <div>
          <p>mode={state.mode} · {state.scene}:{state.idx}</p>
          <p>{Object.entries(state.emotions.draco).map(([k, v]) => `${k}=${v}`).join(' ')}</p>
          <p>stat: {Object.entries(state.stats).map(([k, v]) => `${k}=${v}`).join(' ')}</p>
          <p>flags: {Object.keys({ ...state.flags, ...state.knowledge }).join(', ') || '-'}</p>
          <div className="row">
            <input value={path} onChange={(e) => setPath(e.target.value)} aria-label="변수" />
            <input value={val} onChange={(e) => setVal(e.target.value)} aria-label="값" size={4} />
            <button className="btn" onClick={() => store.debug(path, Number(val))} data-testid="dbg-set">설정</button>
          </div>
          <div className="row">
            <input value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="FLAG_…" aria-label="플래그" />
            <button className="btn" onClick={() => store.debug(flag, true)}>켜기</button>
            <button className="btn" onClick={() => store.debug(flag, false)}>끄기</button>
          </div>
        </div>
      )}
    </aside>
  )
}
