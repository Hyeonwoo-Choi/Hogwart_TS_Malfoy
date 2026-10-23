import { useEffect, useState } from 'react'
import { store } from '../engine/store'
import { GLOSSARY, glossaryEntry, segmentText, termsIn, type GlossaryCategory } from '../data/glossary'
import type { GameState } from '../engine/types'
import { Modal } from './Overlays'

/** 대사 본문: 설명이 있는 용어는 눌러서(터치·클릭·Enter) 설명을 연다. 클릭은 대사창으로 전파되지 않아 대사가 넘어가지 않는다. */
export function TermText({ text, onTerm, read = [] }: { text: string; onTerm: (id: string) => void; read?: string[] }) {
  return (
    <>
      {segmentText(text).map((seg, i) => seg.term
        ? (
          <button key={i} type="button" className={`term ${read.includes(seg.term) ? 'term-read' : 'term-new'}`} aria-haspopup="dialog" aria-label={`${seg.text} 설명 ${read.includes(seg.term) ? '다시 보기' : '보기'}`}
            data-term={seg.term} onClick={(e) => { e.stopPropagation(); onTerm(seg.term!) }}>{seg.text}</button>
        )
        : <span key={i}>{seg.text}</span>)}
    </>
  )
}

export function TermModal({ id, onClose }: { id: string; onClose: () => void }) {
  const g = glossaryEntry(id)
  useEffect(() => { document.querySelector<HTMLElement>('.overlay [aria-label="닫기"]')?.focus() }, [])
  if (!g) return null
  return (
    <Modal title={g.term} onClose={onClose}>
      <div className="term-pop" data-testid="term-pop">
        <p className="term-sum">{g.summary}</p>
        <p>{g.text}</p>
      </div>
    </Modal>
  )
}

/** 지금까지 해리가 마주친 용어 id(기록된 것 + 지금 화면에 보이는 글에 나온 것) */
export function seenTermIds(state: GameState, visibleTexts: string[] = []): string[] {
  const set = new Set(state.terms ?? [])
  for (const t of visibleTexts) for (const id of termsIn(t)) set.add(id)
  return GLOSSARY.filter((g) => set.has(g.id)).map((g) => g.id)
}

const CAT_ORDER: GlossaryCategory[] = ['시험과 제도', '학교생활', '퀴디치', '물건과 문화', '장소', '사회']
/** 세계관 용어집: 이야기에서 이미 마주친 용어만 보여 준다. 아직 나오지 않은 용어는 이름도 개수도 알리지 않는다. */
/** 용어집: 목록에서 항목을 펼치면 읽음으로 기록된다(대사 속 용어 설명창과 같은 읽음 상태). 읽지 않은 항목만 금색으로 표시한다. */
export function GlossaryPanel({ state, visibleTexts }: { state: GameState; visibleTexts: string[] }) {
  const seen = new Set(seenTermIds(state, visibleTexts))
  const read = new Set(state.termsRead ?? [])
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n })
    store.markTermRead(id)
  }
  return (
    <div className="codex glossary" data-testid="glossary">
        {seen.size === 0 && <p className="muted">아직 설명이 필요한 말을 만나지 않았다.</p>}
        {CAT_ORDER.map((cat) => {
          const list = GLOSSARY.filter((g) => g.category === cat && seen.has(g.id))
          if (!list.length) return null
          return (
            <section key={cat}>
              <h3>{cat}</h3>
              {list.map((g) => (
                <article key={g.id} className={read.has(g.id) ? 'g-read' : 'g-new'}>
                  <h4>
                    <button type="button" className="g-head" aria-expanded={open.has(g.id)} onClick={() => toggle(g.id)} data-testid={`g-${g.id}`}>
                      <span className="g-term">{g.term}</span> <span className="muted small">— {g.summary}</span>
                    </button>
                  </h4>
                  {open.has(g.id) && <p>{g.text}</p>}
                </article>
              ))}
            </section>
          )
        })}
    </div>
  )
}
