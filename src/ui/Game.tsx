import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { currentNode, lineId, listOptions } from '../engine/core'
import { QA_MODE } from '../engine/env'
import { store, useGame } from '../engine/store'
import type { ChoiceNode, LineNode, TransNode, TypingSpeed } from '../engine/types'
import { Background, CgFrame, Character } from './Visual'
import { Backlog, Modal, SaveLoad, SettingsPanel } from './Overlays'
import { MapView } from './MapView'
import { AccountPanel } from './Account'
import { cloud } from '../cloud/cloudStore'
import { DebugPanel } from './Debug'
import { TermModal, TermText } from './Terms'
import { Notebook } from './Notebook'
import { emitUiEffect, useGameEffectSignals } from './effects'
import { useScreenFade } from './useScreenFade'

type Overlay = null | 'menu' | 'save' | 'load' | 'settings' | 'backlog' | 'account' | 'notebook' | 'term'
const CPS: Record<TypingSpeed, number> = { slow: 18, normal: 40, fast: 90, instant: Infinity }
const AUTO_MUL = { slow: 1.6, normal: 1, fast: 0.55 }
const FX_MS: Record<string, number> = { fade: 700, blackout: 900, flash: 450, shake: 450, zoom: 900, blur: 700, focus: 900, magic: 900, pause: 0 }
/** 장면 전환(페이드): 어두워지는 시간 · 문구를 읽는 시간 · 밝아지는 시간(ms) */
const FADE_IN_MS = 450, HOLD_MS = 1500, FADE_OUT_MS = 520
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
      // 클릭으로 이미 전체가 표시된 뒤 남은 타이머 틱이 글자 수를 되돌리지 않도록 단조 증가로만 갱신한다
      setN((p) => Math.max(p, c))
      if (c >= text.length) window.clearInterval(id)
    }, 24)
    return () => window.clearInterval(id)
  }, [key, text, cps])
  return { shown: text.slice(0, n), done: n >= text.length, complete: useCallback(() => setN(text.length), [text]) }
}

/** 연출 큐: 새 큐(n 증가)에만 반응. 저장 복원 직후에는 재생하지 않는다. 효과가 진행을 막지 않는다. */
function useCueFx(cue: { effect: string; n: number } | null | undefined) {
  const last = useRef(cue?.n ?? 0)
  const [fx, setFx] = useState<string | null>(null)
  useEffect(() => {
    if (!cue || cue.n === last.current) return
    last.current = cue.n
    const ms = FX_MS[cue.effect] ?? 0
    if (!ms) return
    setFx(cue.effect)
    const id = window.setTimeout(() => setFx(null), ms)
    return () => window.clearTimeout(id)
  }, [cue])
  return fx
}

export function Game({ debug }: { debug: boolean }) {
  const { state: live, settings, toast, epoch } = useGame()
  /* 화면에 보이는 상태(state)는 지도↔장면 경계에서만 잠깐 이전 화면에 머문다(페이드아웃이 보이도록). 게임 진행은 항상 live 기준 */
  const { view: state, phase: fadePhase, busy: fadeBusy } = useScreenFade(live, epoch, (from, to) => emitUiEffect({ type: 'transition', id: `${from}>${to}` }))
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [auto, setAuto] = useState(false)
  const [skip, setSkip] = useState(false)
  const [ctrl, setCtrl] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [barOpen, setBarOpen] = useState(false)
  const [termId, setTermId] = useState<string | null>(null)
  const [veil, setVeil] = useState<null | { title: string; place?: string; phase: 'in' | 'hold' | 'out' }>(null)
  const stateRef = useRef(live); stateRef.current = live

  const node = state ? currentNode(state) : undefined
  const line = node?.t === 'line' ? (node as LineNode) : null
  const choice = node?.t === 'choice' ? (node as ChoiceNode) : null
  const trans = node?.t === 'trans' ? (node as TransNode) : null
  const lid = state ? lineId(state) : ''
  const { shown, done, complete } = useTypewriter(line?.text ?? '', settings.typing, lid)
  const fx = useCueFx(state?.view.cue)

  useGameEffectSignals(live)

  const doAdvance = useCallback(() => {
    const s = stateRef.current; if (!s) return
    store.markRead(lineId(s)); store.advance()
  }, [])

  /* 용어 설명을 열 때 자동·스킵을 멈춘다(설명을 닫아도 대사가 저절로 넘어가지 않는다) */
  const openTerm = (id: string) => { emitUiEffect({ type: 'term-open', id, first: !(stateRef.current?.termsRead ?? []).includes(id) }); setAuto(false); setSkip(false); setTermId(id); setOverlay('term'); store.markTermRead(id) }

  const onStageClick = () => {
    if (overlay || veil || fadeBusy) return
    if (hidden) { setHidden(false); return }
    if (!line) return
    if (!done) complete(); else doAdvance()
  }

  /* 선택지 등장/장면 종류 변경 시 자동·스킵 중단 */
  useEffect(() => {
    if (!line && !trans) { setAuto(false); setSkip(false) }
  }, [line, trans])

  /* 장면 전환: 현재 장면 페이드아웃 → 어두운 화면에 시간·장소 → 다음 장면 페이드인. 전환 중에는 대사·선택지 입력이 막힌다. 저장된 위치가 전환 노드여도 한 번만 재생된다 */
  const skippingNow = skip || ctrl
  useEffect(() => {
    if (!trans) return
    if (skippingNow) { store.advance(); return }
    const rm = reduced()
    emitUiEffect({ type: 'transition', id: trans.title })
    setVeil({ title: trans.title, place: trans.place, phase: rm ? 'hold' : 'in' })
    const t1 = window.setTimeout(() => setVeil((v) => (v ? { ...v, phase: 'hold' } : v)), rm ? 0 : FADE_IN_MS)
    const t2 = window.setTimeout(() => { store.advance(); setVeil((v) => (v ? { ...v, phase: 'out' } : v)) }, (rm ? 0 : FADE_IN_MS) + HOLD_MS)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lid, !!trans])
  useEffect(() => {
    if (veil?.phase !== 'out') return
    const id = window.setTimeout(() => setVeil(null), reduced() ? 0 : FADE_OUT_MS)
    return () => window.clearTimeout(id)
  }, [veil?.phase])

  /* 자동 진행 */
  useEffect(() => {
    if (!auto || !line || !done || overlay || hidden || fadeBusy) return
    const wait = (1200 + 40 * line.text.length) * AUTO_MUL[settings.autoSpeed]
    const id = window.setTimeout(doAdvance, wait)
    return () => window.clearTimeout(id)
  }, [auto, line, done, overlay, hidden, settings.autoSpeed, doAdvance, lid])

  /* 읽은 대사 스킵 (Ctrl 누름 또는 토글) */
  const skipping = skip || ctrl
  useEffect(() => {
    if (!skipping || !line || overlay || hidden || fadeBusy) return
    if (!store.isRead(lid)) { setSkip(false); return }
    const id = window.setTimeout(() => { complete(); doAdvance() }, 45)
    return () => window.clearTimeout(id)
  }, [skipping, line, lid, overlay, hidden, complete, doAdvance])

  /* 시간제한 선택지 */
  const timerOn = settings.timer !== 'off'
  const totalMs = choice?.timed ? choice.timed.seconds * 1000 * (settings.timer === 'relaxed' ? 2 : 1) : 0
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

  /** 노출 목록(잠긴 선택지 포함). 번호 단축키·표시는 이 목록 기준이고, 실행 가능 여부는 locked로만 갈린다 */
  const listed = useMemo(() => (state && choice ? listOptions(state, choice, timerOn) : []), [state, choice, timerOn])
  /** 잠긴 선택지의 사유 안내(선택을 실행하지 않는다) */
  const [lockNote, setLockNote] = useState<{ id: string; text: string } | null>(null)
  const showLock = (key: string, text: string) => { setLockNote({ id: lid + key, text }); emitUiEffect({ type: 'choice-locked', id: key }) }

  /* 키보드 */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Control') setCtrl(true)
      if (e.key === 'Escape') { setOverlay((o) => (o ? null : 'menu')); return }
      if (overlay || veil || fadeBusy) return
      const tag = (e.target as HTMLElement)?.tagName
      if (/^[1-9]$/.test(e.key) && choice) {
        const x = listed[Number(e.key) - 1]; if (x) { e.preventDefault(); if (x.locked) showLock(x.opt.key, x.opt.lock ?? '아직 조건이 맞지 않는다.'); else store.choose(x.opt.key) }
        return
      }
      if (tag === 'BUTTON' || tag === 'SELECT' || tag === 'INPUT' || (e.target as HTMLElement)?.getAttribute?.('role') === 'button') return
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
  /** 지금 화면에 보이는 글(용어집에서 방금 본 용어도 열리게 한다) */
  const visibleTexts = line ? [line.text] : choice ? [choice.prompt ?? '', ...listed.map((x) => x.opt.text)] : []
  const v = state.view

  const topbar = (
    <div className={`topbar${barOpen ? ' open' : ''}`} onClick={(e) => { stop(e); (e.target as HTMLElement).closest('button')?.blur() }} data-testid="topbar">
      <button className="btn ghost bar-toggle" aria-label="메뉴 펼치기" onClick={() => setBarOpen((o) => !o)}>⋯</button>
      <div className="bar-items">
        {state.mode !== 'ROUTINE' && state.mode !== 'ENDED' && <>
          <button className={`btn ghost${auto ? ' on' : ''}`} onClick={() => line && setAuto((a) => !a)} aria-pressed={auto} data-testid="btn-auto">자동</button>
          <button className={`btn ghost${skip ? ' on' : ''}`} onClick={() => line && setSkip((a) => !a)} aria-pressed={skip} data-testid="btn-skip">스킵</button>
        </>}
        <button className="btn ghost" onClick={() => { setAuto(false); setSkip(false); setOverlay('notebook') }} data-testid="btn-notebook">수첩</button>
        {state.mode !== 'ROUTINE' && state.mode !== 'ENDED' && <>
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
            {cloud.enabled && <button className="btn" onClick={() => setOverlay('account')} data-testid="menu-account">계정 · 클라우드 저장</button>}
            <button className="btn" onClick={() => setOverlay('settings')}>설정</button>
            <button className="btn" onClick={() => setOverlay('notebook')} data-testid="menu-notebook">마법 수첩</button>
            <button className="btn" onClick={() => { setOverlay(null); store.toTitle() }} data-testid="menu-title">타이틀로</button>
          </div>
        </Modal>
      )}
      {overlay === 'account' && <AccountPanel onClose={() => setOverlay(null)} />}
      {overlay === 'notebook' && <Notebook state={state} visibleTexts={visibleTexts} onClose={() => setOverlay(null)} />}
      {overlay === 'term' && termId && <TermModal id={termId} onClose={() => { setOverlay(null); setTermId(null) }} />}
      {overlay === 'save' && <SaveLoad mode="save" canSave onClose={() => setOverlay(null)} />}
      {overlay === 'load' && <SaveLoad mode="load" canSave onClose={() => setOverlay(null)} />}
      {overlay === 'settings' && <SettingsPanel settings={settings} onClose={() => setOverlay(null)} />}
      {overlay === 'backlog' && <Backlog entries={state.backlog} onClose={() => setOverlay(null)} />}
      {fadePhase && <div className={`screen-veil sv-${fadePhase}`} data-testid="screen-veil" aria-hidden />}
      {toast && <div className="toast" role="status" data-testid="toast">{toast}</div>}
      {QA_MODE && <div className="qa-badge" aria-hidden>QA</div>}
      {debug && <DebugPanel state={state} />}
    </>
  )

  if (state.mode === 'ROUTINE') {
    return <div className={`app-root ${sizeClass}`} data-mode="ROUTINE">{topbar}<MapView state={state} />{overlays}</div>
  }

  if (state.mode === 'ENDED') {
    const endNode = currentNode(state)
    const hasNext = endNode?.t === 'endChapter' && !!endNode.next
    return (
      <div className={`app-root ${sizeClass}`} data-mode="ENDED">
        {topbar}
        <div className="end-card" data-testid="end-card">
          <h1>{state.endTitle}</h1>
          <p>{hasNext ? '이야기는 이어집니다. 지금까지의 선택은 다음 챕터에 반영됩니다.' : '다음 이야기는 아직 쓰이는 중입니다. 지금까지의 선택은 저장해 두면 이어서 반영됩니다.'}</p>
          <div className="row">
            {hasNext && <button className="btn primary" onClick={() => store.continueChapter()} data-testid="next-chapter">다음 챕터</button>}
            <button className="btn" onClick={() => setOverlay('notebook')}>마법 수첩</button>
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
      <div className={`stage light-${v.light}${fx ? ` fx-${fx}` : ''}${choice && !hidden ? ' is-choice' : ''}`} onClick={onStageClick} onWheel={(e) => { if (e.deltaY < 0 && !overlay) setOverlay('backlog') }} data-testid="stage">
        <Background id={v.bg} />
        <div className="sprite-area"><Character char={v.char} expr={v.expr} form={v.form} pose={v.pose} gaze={v.gaze} /></div>
        {v.cg && <CgFrame id={v.cg} />}
        <div className="fx-layer" aria-hidden />
        {topbar}
        {!hidden && (
          <div className="dialogue-wrap">
            {line?.who && <div className="nameplate" data-testid="speaker">{line.who}</div>}
            <div className="dialogue" data-testid="dialogue" data-state={line ? (done ? 'done' : 'typing') : 'choice'}>
              {line && <p className={`text${line.who ? '' : ' narr'}`} data-testid="text"><TermText text={shown} onTerm={openTerm} read={state.termsRead ?? []} /></p>}
              {choice && <p className="text narr" data-testid="text"><TermText text={choice.prompt ?? ''} onTerm={openTerm} read={state.termsRead ?? []} /></p>}
              {choice && (
                <div className="choices" onClick={stop} data-testid="choices" role="group" aria-label="선택지">
                  {choice.timed && timerOn && (
                    <div className="timerbar" data-testid="timerbar" aria-label="남은 시간"><i style={{ width: `${totalMs ? (remain / totalMs) * 100 : 0}%` }} /></div>
                  )}
                  {listed.map(({ opt: o, locked }, i) => (
                    /* 선택지 안의 용어도 눌러 설명을 열 수 있어야 하므로 버튼 요소 대신 role=button 컨테이너를 쓴다(버튼 안에 버튼을 넣을 수 없다). 용어 클릭은 전파되지 않아 선택이 실행되지 않는다. 잠긴 선택지는 aria-disabled이며 눌러도 사유만 보인다. */
                    <div key={o.key} role="button" tabIndex={0} className={`choice${locked ? ' locked' : ''}`} data-testid={`choice-${o.key}`} aria-disabled={locked || undefined} aria-describedby={locked && lockNote?.id === lid + o.key ? 'lock-note' : undefined}
                      onClick={() => (locked ? showLock(o.key, o.lock ?? '아직 조건이 맞지 않는다.') : store.choose(o.key))}
                      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); if (locked) showLock(o.key, o.lock ?? '아직 조건이 맞지 않는다.'); else store.choose(o.key) } }}>
                      <b>{i + 1}</b><span><TermText text={o.text} onTerm={openTerm} read={state.termsRead ?? []} />{locked && <small className="lock-tag"> · 잠김</small>}</span>
                    </div>
                  ))}
                  {lockNote && lockNote.id.startsWith(lid) && <p id="lock-note" className="lock-note" role="status" data-testid="lock-note">{lockNote.text}</p>}
                </div>
              )}
            </div>
            {line && done && <span className="more" aria-hidden>▼</span>}
          </div>
        )}
      </div>
      {veil && (
        <div className={`veil veil-${veil.phase}`} role="status" aria-live="polite" data-testid="veil" onClick={stop}>
          <div className="veil-text">
            <p className="veil-title">{veil.title}</p>
            {veil.place && <p className="veil-place">{veil.place}</p>}
          </div>
        </div>
      )}
      {overlays}
    </div>
  )
}
