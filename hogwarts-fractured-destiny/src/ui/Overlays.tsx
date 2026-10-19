import { useRef, useState, type ReactNode } from 'react'
import { listSlots, SLOT_COUNT, slotKey } from '../engine/save'
import { store } from '../engine/store'
import type { BacklogEntry, Settings } from '../engine/types'

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
          <p key={i} className={e.kind === 'choice' ? 'bl-choice' : ''}>
            {e.kind === 'choice' ? <span className="bl-mark">선택</span> : e.who ? <strong>{e.who}</strong> : null}
            {e.text}
          </p>
        ))}
      </div>
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
          return (
            <li key={s.key} className={s.empty ? 'empty' : ''}>
              <div><strong>{n}</strong><span>{s.empty ? '비어 있음' : `${s.label} · ${new Date(s.savedAt!).toLocaleString('ko-KR')}`}</span></div>
              {mode === 'save' && !isAuto && <button className="btn" disabled={!canSave} onClick={() => { store.save(s.key); setTick((t) => t + 1) }} data-testid={`save-${s.key}`}>저장</button>}
              {mode === 'load' && <button className="btn" disabled={s.empty} onClick={() => { if (store.load(s.key)) onClose() }} data-testid={`load-${s.key}`}>불러오기</button>}
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
      <p className="muted small">슬롯 {SLOT_COUNT}칸 + 자동 저장. 브라우저 저장소를 쓸 수 없으면 파일로 내보내 보관하세요. ({slotKey(1)} …)</p>
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
      <p className="muted small">시간제한을 해제하면 "망설임" 결과가 선택지로 직접 표시됩니다.</p>
    </Modal>
  )
}
