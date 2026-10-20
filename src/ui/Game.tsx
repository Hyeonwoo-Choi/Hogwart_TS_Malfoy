import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { currentNode, lineId, visibleOptions } from '../engine/core'
import { store, useGame } from '../engine/store'
import type { ChoiceNode, LineNode, TypingSpeed } from '../engine/types'
import { Background, Character } from './Visual'
import { Backlog, Modal, SaveLoad, SettingsPanel } from './Overlays'
import { MapView } from './MapView'
import { DebugPanel } from './Debug'

type Overlay = null | 'menu' | 'save' | 'load' | 'settings' | 'backlog'
const CPS: Record<TypingSpeed, number> = { slow: 18, normal: 40, fast: 90, instant: Infinity }
const AUTO_MUL = { slow: 1.6, normal: 1, fast: 0.55 }
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useTypewriter(text: string, speed: TypingSpeed, key: string) {
  const cps = reduced() ? Infinity : CPS[speed]
  const [n, setN] = useState(cps === Infinity ? text.length : 0)
  useEffect(() => {
    if (cps === Infinity) { setN(text.length); return }
    setN(0)
    const t0 = performance.now()
    const id = window.setInterval(() => {
      const c = Math.min(text.length, Math.floor(((performance.now() - t0) / 1000) * cps) + 1)
      setN(c)
      if (c >= text.length) window.clearInterval(id)
    }, 24)
    return () => window.clearInterval(id)
  }, [key, text, cps])
  return { shown: text.slice(0, n), done: n >= text.length, complete: useCallback(() => setN(text.length), [text]) }
}

export function Game({ debug }: { debug: boolean }) {
  const { state, settings, toast } = useGame()
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [auto, setAuto] = useState(false)
  const [skip, setSkip] = useState(false)
  const [ctrl, setCtrl] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [barOpen, setBarOpen] = useState(false)
  const stateRef = useRef(state); stateRef.current = state

  const node = state ? currentNode(state) : undefined
  const line = node?.t === 'line' ? (node as LineNode) : null
  const choice = node?.t === 'choice' ? (node as ChoiceNode) : null
  const lid = state ? lineId(state) : ''
  const { shown, done, complete } = useTypewriter(line?.text ?? '', settings.typing, lid)

  const doAdvance = useCallback(() => {
    const s = stateRef.current; if (!s) return
    store.markRead(lineId(s)); store.advance()
  }, [])

  const onStageClick = () => {
    if (overlay) return
    if (hidden) { setHidden(false); return }
    if (!line) return
    if (!done) complete(); else doAdvance()
  }

  /* 선택지 등장/장면 종류 변경 시 자동·스킵 중단 */
  useEffect(() => {
    if (!line) { setAuto(false); setSkip(false) }
  }, [line])

  /* 자동 진행 */
  useEffect(() => {
    if (!auto || !line || !done || overlay || hidden) return
    const wait = (1200 + 40 * line.text.length) * AUTO_MUL[settings.autoSpeed]
    const id = window.setTimeout(doAdvance, wait)
    return () => window.clearTimeout(id)
  }, [auto, line, done, overlay, hidden, settings.autoSpeed, doAdvance, lid])

  /* 읽은 대사 스킵 (Ctrl 누름 또는 토글) */
  const skipping = skip || ctrl
  useEffect(() => {
    if (!skipping || !line || overlay || hidden) return
    if (!store.isRead(lid)) { setSkip(false); return }
    const id = window.setTimeout(() => { complete(); doAdvance() }, 45)
    return () => window.clearTimeout(id)
  }, [skipping, line, lid, overlay, hidden, complete, doAdvance])

  /* 시간제한 선택지 */
  const timerOn = settings.timer !== 'off'
  const totalMs = choice?.timed ? choice.timed.seconds * 1000 * (settings.timer === 'relaxed' ? 2 : 1) : 0
  // 타이머는 선택지 노드(lid)별로 초기화된다. 초기값은 항상 전체 시간이며, 0으로 시작해 즉시 만료되는 일이 없다.
  const [timer, setTimer] = useState({ id: '', ms: 0 })
  const remain = timer.id === lid ? timer.ms : totalMs
  useEffect(() => {
    if (!choice?.timed || !timerOn || overlay) return
    const id = window.setInterval(() => setTimer((t) => ({ id: lid, ms: Math.max(0, (t.id === lid ? t.ms : totalMs) - 100) })), 100)
    return () => window.clearInterval(id)
  }, [choice, timerOn, overlay, lid, totalMs])
  useEffect(() => {
    if (choice?.timed && timerOn && totalMs > 0 && timer.id === lid && timer.ms <= 0) store.choose(choice.timed.timeoutKey)
  }, [timer, lid, choice, timerOn, totalMs])

  const options = useMemo(() => (state && choice ? visibleOptions(state, choice, timerOn) : []), [state, choice, timerOn])

  /* 키보드 */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Control') setCtrl(true)
      if (e.key === 'Escape') { setOverlay((o) => (o ? null : 'menu')); return }
      if (overlay) return
      const tag = (e.target as HTMLElement)?.tagName
      if (/^[1-9]$/.test(e.key) && choice) {
        const o = options[Number(e.key) - 1]; if (o) { e.preventDefault(); store.choose(o.key) }
        return
      }
      if (tag === 'BUTTON' || tag === 'SELECT' || tag === 'INPUT') return
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStageClick() }
      else if (e.key === 'h' || e.key === 'H') setHidden((h) => !h)
      else if (e.key === 'a' || e.key === 'A') line && setAuto((a) => !a)
    }
    const up = (e: KeyboardEvent) => { if (e.key === 'Control') setCtrl(false) }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  })

  if (!state) return null
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  const sizeClass = `fs${settings.textSize}`

  const topbar = (
    <div className={`topbar${barOpen ? ' open' : ''}`} onClick={(e) => { stop(e); (e.target as HTMLElement).closest('button')?.blur() /* 버튼에 포커스가 남아 Enter가 가로채이지 않게 */ }} data-testid="topbar">
      <button className="btn ghost bar-toggle" aria-label="메뉴 펼치기" onClick={() => setBarOpen((o) => !o)}>⋯</button>
      <div className="bar-items">
        {state.mode !== 'ROUTINE' && <>
          <button className={`btn ghost${auto ? ' on' : ''}`} onClick={() => line && setAuto((a) => !a)} aria-pressed={auto} data-testid="btn-auto">자동</button>
          <button className={`btn ghost${skip ? ' on' : ''}`} onClick={() => line && setSkip((a) => !a)} aria-pressed={skip} data-testid="btn-skip">스킵</button>
          <button className="btn ghost" onClick={() => setOverlay('backlog')} data-testid="btn-backlog">기록</button>
          <button className="btn ghost" onClick={() => setHidden(true)} data-testid="btn-hide">숨기기</button>
        </>}
        <button className="btn ghost" onClick={() => setOverlay('menu')} data-testid="btn-menu">메뉴</button>
      </div>
    </div>
  )

  const overlays = (
    <>
      {overlay === 'menu' && (
        <Modal title="메뉴" onClose={() => setOverlay(null)}>
          <div className="menu-list">
            <button className="btn" onClick={() => setOverlay(null)}>계속하기</button>
            <button className="btn" onClick={() => setOverlay('save')} data-testid="menu-save">저장하기</button>
            <button className="btn" onClick={() => setOverlay('load')} data-testid="menu-load">불러오기</button>
            <button className="btn" onClick={() => setOverlay('backlog')}>대화 기록</button>
            <button className="btn" onClick={() => setOverlay('settings')}>설정</button>
            <button className="btn" onClick={() => { setOverlay(null); store.toTitle() }} data-testid="menu-title">타이틀로</button>
          </div>
        </Modal>
      )}
      {overlay === 'save' && <SaveLoad mode="save" canSave onClose={() => setOverlay(null)} />}
      {overlay === 'load' && <SaveLoad mode="load" canSave onClose={() => setOverlay(null)} />}
      {overlay === 'settings' && <SettingsPanel settings={settings} onClose={() => setOverlay(null)} />}
      {overlay === 'backlog' && <Backlog entries={state.backlog} onClose={() => setOverlay(null)} />}
      {toast && <div className="toast" role="status" data-testid="toast">{toast}</div>}
      {debug && <DebugPanel state={state} />}
    </>
  )

  if (state.mode === 'ROUTINE') {
    return <div className={`app-root ${sizeClass}`} data-mode="ROUTINE">{topbar}<MapView state={state} />{overlays}</div>
  }

  if (state.mode === 'ENDED') {
    return (
      <div className={`app-root ${sizeClass}`} data-mode="ENDED">
        <div className="end-card" data-testid="end-card">
          <h1>{state.endTitle}</h1>
          <p>다음 챕터는 제작 중입니다. 지금까지의 선택은 저장해 두면 이어서 반영됩니다.</p>
          <div className="row">
            <button className="btn" onClick={() => setOverlay('save')}>저장하기</button>
            <button className="btn" onClick={() => store.toTitle()}>타이틀로</button>
          </div>
        </div>
        {overlays}
      </div>
    )
  }

  return (
    <div className={`app-root ${sizeClass}`} data-mode={state.mode}>
      <div className="stage" onClick={onStageClick} onWheel={(e) => { if (e.deltaY < 0 && !overlay) setOverlay('backlog') }} data-testid="stage">
        <Background id={state.view.bg} />
        <div className="sprite-area"><Character char={state.view.char} expr={state.view.expr} /></div>
        {topbar}
        {!hidden && (
          <div className="dialogue" data-testid="dialogue" data-state={line ? (done ? 'done' : 'typing') : 'choice'}>
            {line?.who && <div className="nameplate" data-testid="speaker">{line.who}</div>}
            {line && <p className={`text${line.who ? '' : ' narr'}`} data-testid="text">{shown}</p>}
            {choice && <p className="text narr" data-testid="text">{choice.prompt}</p>}
            {line && done && <span className="more" aria-hidden>▼</span>}
          </div>
        )}
        {choice && !hidden && (
          <div className="choices" onClick={stop} data-testid="choices" role="group" aria-label="선택지">
            {choice.timed && timerOn && (
              <div className="timerbar" data-testid="timerbar" aria-label="남은 시간"><i style={{ width: `${totalMs ? (remain / totalMs) * 100 : 0}%` }} /></div>
            )}
            {options.map((o, i) => (
              <button key={o.key} className="choice" onClick={() => store.choose(o.key)} data-testid={`choice-${o.key}`}>
                <b>{i + 1}</b><span>{o.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {overlays}
    </div>
  )
}
