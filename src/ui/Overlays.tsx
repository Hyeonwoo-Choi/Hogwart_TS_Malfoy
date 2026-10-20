import { useRef, useState, type ReactNode } from 'react'
import { CG_LIST } from '../data/cg'
import { buildCodex, type CodexCategory } from '../data/codex'
import { listSlots, SLOT_COUNT } from '../engine/save'
import { store } from '../engine/store'
import type { BacklogEntry, GameState, Settings } from '../engine/types'
import { CgFrame } from './Visual'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal${wide ? ' wide' : ''}`} data-testid={`modal-${title}`}>
        <header><h2>{title}</h2><button className="btn ghost" onClick={onClose} aria-label="닫기">닫기</button></header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Backlog({ entries, onClose }: { entries: BacklogEntry[]; onClose: () => void }) {
  return (
    <Modal title="대화 기록" onClose={onClose} wide>
      <div className="backlog" data-testid="backlog">
        {entries.length === 0 && <p className="muted">아직 기록이 없습니다.</p>}
        {entries.map((e, i) => (
          <p key={i} className={e.kind === 'choice' ? 'bl-choice' : e.who ? '' : 'bl-narr'}>
            {e.kind === 'choice' ? <span className="bl-mark">선택</span> : e.who ? <strong>{e.who}</strong> : null}
            {e.text}
          </p>
        ))}
      </div>
    </Modal>
  )
}

/** 마법사의 기록: 해리가 실제로 알게 된 것만. 내부 ID·조건·감정 수치는 출력하지 않는다. */
const CODEX_ORDER: CodexCategory[] = ['관찰', '알게 된 것', '약속', '선택', '장소']
export function Codex({ state, onClose }: { state: GameState; onClose: () => void }) {
  const entries = buildCodex(state)
  return (
    <Modal title="마법사의 기록" onClose={onClose} wide>
      <div className="codex" data-testid="codex">
        {entries.length === 0 && <p className="muted">아직 적어 둔 것이 없다.</p>}
        {CODEX_ORDER.map((cat) => {
          const list = entries.filter((e) => e.category === cat)
          if (!list.length) return null
          return (
            <section key={cat}>
              <h3>{cat}</h3>
              {list.map((e, i) => (
                <article key={i}>
                  <h4>{e.title}</h4>
                  <p>{e.text}</p>
                  {e.note && <p className="codex-note">{e.note}</p>}
                </article>
              ))}
            </section>
          )
        })}
      </div>
    </Modal>
  )
}

/** CG 갤러리: 경험한 장면만 열람. 미경험 항목은 제목·설명·썸네일을 보여 주지 않는다. */
export function Gallery({ seen, onClose }: { seen: string[]; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <Modal title="장면 갤러리" onClose={onClose} wide>
      <p className="muted small">경험한 장면 {CG_LIST.filter((c) => seen.includes(c.id)).length} / {CG_LIST.length}</p>
      <ul className="gallery" data-testid="gallery">
        {CG_LIST.map((c) => {
          const ok = seen.includes(c.id)
          return (
            <li key={c.id}>
              {ok
                ? <button className="g-item" onClick={() => setOpen(c.id)} data-testid="g-open"><strong>{c.title}</strong><span>{c.caption}</span></button>
                : <div className="g-item locked" aria-label="아직 보지 못한 장면"><strong>???</strong><span>아직 보지 못한 장면</span></div>}
            </li>
          )
        })}
      </ul>
      {open && <div className="g-view" onClick={() => setOpen(null)} role="button" aria-label="닫기"><CgFrame id={open} /></div>}
    </Modal>
  )
}

export function SaveLoad({ mode, canSave, onClose }: { mode: 'save' | 'load'; canSave: boolean; onClose: () => void }) {
  const [tick, setTick] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const slots = listSlots()
  void tick
  const doExport = () => {
    const text = store.export(); if (!text) return
    const blob = new Blob([text], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hfd-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(a.href)
  }
  const doImport = async (f: File | undefined) => {
    if (!f) return
    try { store.import(await f.text()); setErr(null); onClose() } catch (e) { setErr((e as Error).message) }
  }
  return (
    <Modal title={mode === 'save' ? '저장하기' : '불러오기'} onClose={onClose}>
      <ul className="slots" data-testid="slots">
        {slots.map((s) => {
          const isAuto = s.key === 'auto'
          const n = isAuto ? '자동 저장' : `슬롯 ${s.key.replace('slot', '')}`
          const desc = s.empty ? '비어 있음' : s.legacy ? '이전 버전의 이야기 (불러올 수 없음 · 보존됨)' : `${s.label} · ${new Date(s.savedAt!).toLocaleString('ko-KR')}`
          return (
            <li key={s.key} className={s.empty ? 'empty' : s.legacy ? 'legacy' : ''}>
              <div><strong>{n}</strong><span>{desc}</span></div>
              {/* 구버전 슬롯은 조용히 덮어쓰지 않는다: 저장 버튼 비활성 */}
              {mode === 'save' && !isAuto && <button className="btn" disabled={!canSave || !!s.legacy} onClick={() => { store.save(s.key); setTick((t) => t + 1) }} data-testid={`save-${s.key}`}>저장</button>}
              {mode === 'load' && <button className="btn" disabled={s.empty || !!s.legacy} onClick={() => { if (store.load(s.key)) onClose() }} data-testid={`load-${s.key}`}>불러오기</button>}
            </li>
          )
        })}
      </ul>
      <div className="row">
        {canSave && <button className="btn" onClick={doExport} data-testid="export">파일로 내보내기</button>}
        <button className="btn" onClick={() => file.current?.click()} data-testid="import">파일에서 가져오기</button>
        <input ref={file} type="file" accept="application/json,.json" hidden data-testid="import-file" onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <p className="muted small">슬롯 {SLOT_COUNT}칸과 자동 저장. 브라우저 저장소를 쓸 수 없으면 파일로 내보내 보관하세요.</p>
    </Modal>
  )
}

export function SettingsPanel({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const sel = <K extends keyof Settings>(k: K, label: string, opts: [Settings[K], string][]) => (
    <label className="field"><span>{label}</span>
      <select value={String(settings[k])} onChange={(e) => {
        const raw = e.target.value
        store.updateSettings({ [k]: typeof settings[k] === 'number' ? Number(raw) : raw } as Partial<Settings>)
      }} data-testid={`set-${k}`}>
        {opts.map(([v, t]) => <option key={String(v)} value={String(v)}>{t}</option>)}
      </select>
    </label>
  )
  return (
    <Modal title="설정" onClose={onClose}>
      {sel('typing', '타이핑 속도', [['slow', '느림'], ['normal', '보통'], ['fast', '빠름'], ['instant', '즉시']])}
      {sel('autoSpeed', '자동 진행 속도', [['slow', '느림'], ['normal', '보통'], ['fast', '빠름']])}
      {sel('textSize', '글자 크기', [[1, '작게'], [2, '보통'], [3, '크게']])}
      {sel('timer', '시간제한 선택지', [['normal', '보통'], ['relaxed', '완화(2배)'], ['off', '해제']])}
      <p className="muted small">시간제한을 해제하면 "망설임" 결과가 선택지로 직접 표시됩니다. 움직임 줄이기는 기기의 접근성 설정을 따릅니다.</p>
    </Modal>
  )
}
