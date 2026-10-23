import { useEffect, useMemo, useRef, useState } from 'react'
import { buildCases } from '../data/cases'
import type { GameState } from '../engine/types'
import { emitUiEffect } from './effects'
import { JournalPanel } from './Journal'
import { Modal } from './Overlays'
import { GlossaryPanel } from './Terms'

/**
 * 마법 수첩: 인물 기록 · 사건 수첩 · 마법 용어집을 한 권으로 묶는다. 읽기 전용이라 열람이 시간·상태를 바꾸지 않는다.
 * 데스크톱은 왼쪽 목차 + 오른쪽 본문(책의 양쪽 페이지), 좁은 화면은 위쪽 탭 + 아래 본문.
 * 효과 연결 지점: 열림/닫힘/페이지 전환을 `emitUiEffect`로만 알린다(그래픽이 없어도 동작).
 */
export type NotebookSection = 'characters' | 'cases' | 'glossary'
const SECTIONS: { id: NotebookSection; name: string }[] = [
  { id: 'characters', name: '인물 기록' },
  { id: 'cases', name: '사건 수첩' },
  { id: 'glossary', name: '마법 용어집' },
]

export function CasesPanel({ state }: { state: GameState }) {
  const cases = useMemo(() => buildCases(state), [state])
  return (
    <div className="cases" data-testid="cases">
      <p className="muted small">내가 직접 본 것, 남에게 들은 것, 내 추측을 나눠 적는다. 추측은 틀릴 수 있다.</p>
      {cases.length === 0 && <p className="muted">아직 사건이라고 부를 만한 일이 없다.</p>}
      {cases.map((c) => (
        <article key={c.id} className="case" data-testid={`case-${c.id}`} data-status={c.status}>
          <header><h3>{c.title}</h3><span className="badge">{c.status}</span></header>
          {c.obs.length > 0 && <section><h4>직접 본 것</h4><ul>{c.obs.map((t, i) => <li key={i}>{t}</li>)}</ul></section>}
          {c.testimony.length > 0 && (
            <section><h4>들은 이야기</h4>
              <ul>{c.testimony.map((t, i) => <li key={i}>{t.from && <b className="who">{t.from}</b>}{t.text}</li>)}</ul>
            </section>
          )}
          {c.inferences.length > 0 && <section><h4>{c.resolution.length ? '당시의 추측' : '내 추측'}</h4><ul>{c.inferences.map((t, i) => <li key={i}>{t}</li>)}</ul></section>}
          {c.questions.length > 0 && !c.resolution.length && <section><h4>풀리지 않은 의문</h4><ul>{c.questions.map((t, i) => <li key={i}>{t}</li>)}</ul></section>}
          {c.resolution.length > 0 && <section><h4>확인된 결론</h4><ul>{c.resolution.map((t, i) => <li key={i}>{t}</li>)}</ul></section>}
        </article>
      ))}
    </div>
  )
}

export function Notebook({ state, visibleTexts, onClose, initial = 'characters' }: { state: GameState; visibleTexts: string[]; onClose: () => void; initial?: NotebookSection }) {
  const [sec, setSec] = useState<NotebookSection>(initial)
  const first = useRef(true)
  const pageRef = useRef<HTMLDivElement>(null)
  useEffect(() => { pageRef.current?.scrollTo?.(0, 0) }, [sec])
  useEffect(() => { emitUiEffect({ type: 'notebook-open' }); return () => emitUiEffect({ type: 'notebook-close' }) }, [])
  useEffect(() => { if (first.current) { first.current = false; return } emitUiEffect({ type: 'notebook-page', id: sec }) }, [sec])
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const i = SECTIONS.findIndex((x) => x.id === sec)
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    setSec(SECTIONS[(i + d + SECTIONS.length) % SECTIONS.length].id)
  }
  return (
    <Modal title="마법 수첩" onClose={onClose} wide book>
      <div className="notebook" data-testid="notebook">
        <nav className="nb-tabs" role="tablist" aria-label="수첩 목차" aria-orientation="vertical" onKeyDown={onKey}>
          {SECTIONS.map((x) => (
            <button key={x.id} role="tab" id={`nb-tab-${x.id}`} aria-selected={sec === x.id} aria-controls="nb-page" tabIndex={sec === x.id ? 0 : -1}
              className={`btn ghost${sec === x.id ? ' on' : ''}`} onClick={() => setSec(x.id)} data-testid={`nb-tab-${x.id}`}>{x.name}</button>
          ))}
        </nav>
        <div className="nb-page" id="nb-page" ref={pageRef} tabIndex={0} role="tabpanel" aria-labelledby={`nb-tab-${sec}`} data-testid="nb-page" data-section={sec}>
          {sec === 'characters' && <JournalPanel state={state} />}
          {sec === 'cases' && <CasesPanel state={state} />}
          {sec === 'glossary' && <GlossaryPanel state={state} visibleTexts={visibleTexts} />}
        </div>
      </div>
    </Modal>
  )
}
