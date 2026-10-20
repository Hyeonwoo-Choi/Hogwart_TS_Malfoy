import { useRef, useState, type ReactNode } from 'react'
import { CG_LIST } from '../data/cg'
import { buildCodex, type CodexCategory } from '../data/codex'
import { listSlots, SLOT_COUNT } from '../engine/save'
import { store } from '../engine/store'
import type { BacklogEntry, GameState, Settings } from '../engine/types'
import { CgFrame } from './Visual'
import { cloud, useCloud, type CloudController } from '../cloud/cloudStore'
import type { SlotStatus, SlotView } from '../cloud/sync'
import { AccountPanel } from './Account'

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

const STATUS_TEXT: Record<SlotStatus, string> = {
  empty: '', same: '클라우드와 같음', local_only: '이 기기에만 있음', cloud_only: '클라우드에만 있음',
  local_newer: '이 기기 쪽이 새로움', cloud_newer: '클라우드 쪽이 새로움', conflict: '이 기기와 클라우드가 서로 다름',
  incompatible: '클라우드 저장을 열 수 없음', local_legacy: '',
}

/** 로그인 상태의 슬롯 행 아래에 붙는 클라우드 영역. 덮어쓰는 동작은 모두 2단계 확인 후에만 실행된다. */
function CloudRow({ v, c }: { v: SlotView; c: CloudController }) {
  const [arm, setArm] = useState<string | null>(null)
  const act = (id: string, fn: () => Promise<unknown>) => () => { if (arm !== id) { setArm(id); return } setArm(null); void fn() }
  const t = (id: string, label: string, confirm: string) => (arm === id ? confirm : label)
  if (v.status === 'empty' || v.status === 'local_legacy') return null
  return (
    <div className="cloud-row" data-testid={`cloud-${v.slot}`} data-status={v.status}>
      <span className="cloud-status">{STATUS_TEXT[v.status]}{v.pending ? ' · 올리기 대기 중' : ''}</span>
      {v.status === 'incompatible' && v.compat && !v.compat.ok && <span className="muted small"> {v.compat.reason} (서버의 원본은 삭제되지 않습니다)</span>}
      <div className="row">
        {(v.status === 'local_only' || v.status === 'local_newer') && <button className="btn" onClick={() => void c.pushSlot(v.slot, 'normal')} data-testid={`push-${v.slot}`}>클라우드에 올리기</button>}
        {(v.status === 'cloud_only' || v.status === 'cloud_newer') && <button className="btn" onClick={() => void c.pullSlot(v.slot)} data-testid={`pull-${v.slot}`}>이 기기로 받기</button>}
        {v.status === 'conflict' && <>
          <button className="btn" onClick={act(`kl-${v.slot}`, () => c.pushSlot(v.slot, 'keep_local'))} data-testid={`keeplocal-${v.slot}`}>
            {t(`kl-${v.slot}`, '이 기기 것을 유지', '정말? 클라우드 저장이 이 기기 것으로 바뀝니다')}
          </button>
          <button className="btn" onClick={act(`kc-${v.slot}`, () => c.pullSlot(v.slot))} data-testid={`keepcloud-${v.slot}`}>
            {t(`kc-${v.slot}`, '클라우드 것을 유지', '정말? 이 기기 저장이 클라우드 것으로 바뀝니다(기존 것은 보관)')}
          </button>
        </>}
        {v.cloud && <button className="btn ghost" onClick={act(`del-${v.slot}`, () => c.deleteCloudSlot(v.slot))} data-testid={`del-${v.slot}`}>
          {t(`del-${v.slot}`, '클라우드에서 삭제', '정말 삭제할까요? 되돌릴 수 없습니다')}
        </button>}
      </div>
    </div>
  )
}

export function SaveLoad({ mode, canSave, onClose, controller = cloud }: { mode: 'save' | 'load'; canSave: boolean; onClose: () => void; controller?: CloudController }) {
  const cs = useCloud(controller)
  const [acct, setAcct] = useState(false)
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
      {cs.enabled && (
        <p className="cloud-head" data-testid="cloud-head">
          {cs.status === 'signed_in' ? <>클라우드: <strong>{cs.user?.email}</strong>{cs.offline ? ' · 오프라인' : ''}</> : '로그인하면 저장을 클라우드에도 보관할 수 있습니다.'}
          {' '}<button className="btn ghost" onClick={() => setAcct(true)} data-testid="open-account">{cs.status === 'signed_in' ? '계정' : '로그인'}</button>
        </p>
      )}
      {cs.error && cs.status === 'signed_in' && <p className="error small" role="alert" data-testid="cloud-error">{cs.error}</p>}
      <ul className="slots" data-testid="slots">
        {slots.map((s) => {
          const isAuto = s.key === 'auto'
          const n = isAuto ? '자동 저장' : `슬롯 ${s.key.replace('slot', '')}`
          const desc = s.empty ? '비어 있음' : s.legacy ? '이전 버전의 이야기 (불러올 수 없음 · 보존됨)' : `${s.label} · ${new Date(s.savedAt!).toLocaleString('ko-KR')}`
          return (
            <li key={s.key} className={s.empty ? 'empty' : s.legacy ? 'legacy' : ''}>
              <div><strong>{n}</strong><span>{desc}</span>
                {cs.status === 'signed_in' && (() => { const v = cs.views.find((x) => x.slot === s.key); return v ? <CloudRow v={v} c={controller} /> : null })()}
              </div>
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
      {acct && <AccountPanel onClose={() => setAcct(false)} controller={controller} />}
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
