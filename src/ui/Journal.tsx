import { useEffect, useMemo, useRef, useState } from 'react'
import { buildJournal } from '../data/journal'
import { EXPR_KO, STAGE_KO } from '../data/constants'
import type { GameState } from '../engine/types'
import { Character } from './Visual'

const ROMANCE_KO: Record<string, string> = { open: '마음을 열어 두고 있다', together: '연인', declined: '정중히 거절한 사이', ended: '끝난 사이' }
/** 마지막으로 본 표정에 대한 해리의 관찰 문장(속마음 단정 없이 겉모습만) */
const LOOK_KO: Record<string, string> = {
  calm: '마지막으로 본 얼굴은 평온했다.', blank: '마지막으로 본 얼굴은 아무것도 드러내지 않았다.', smirk: '마지막으로 본 얼굴에는 비웃음이 걸려 있었다.',
  interest: '마지막으로 본 얼굴은 나를 궁금해하는 쪽이었다.', flustered: '마지막으로 본 얼굴은 당황한 기색이었다.', angry: '마지막으로 본 얼굴은 화가 나 있었다.',
  anxious: '마지막으로 본 얼굴은 불안해 보였다.', sad: '마지막으로 본 얼굴은 슬퍼 보였다.', resolve: '마지막으로 본 얼굴은 결심한 듯 단단했다.', smile: '마지막으로 본 얼굴은 웃고 있었다.',
}

/** 인물 초상화: 해리가 마지막으로 본 표정·외형만 쓴다(수치로 속마음을 짐작해 바꾸지 않는다). 에셋이 없으면 Character가 기본 초상화로 대체한다 */
export function Portrait({ state, id, name }: { state: GameState; id: string; name?: string }) {
  const seen = state.seen?.[id]; const b = state.bonds?.[id]
  const expr = seen?.expr ?? 'calm'
  /* 프로필 카드: 위에 이름, 왼쪽 큰 이미지(원본 비율 유지) · 오른쪽 관찰된 표정·관계 상태·마지막으로 본 것. 이미지가 없으면 중립 실루엣으로 같은 크기를 유지한다 */
  return (
    <figure className="j-portrait" data-testid="j-portrait" data-expr={expr}>
      {name && <header className="j-card-head"><h3>{name}</h3></header>}
      <div className="j-card-body">
        <div className="j-face" data-testid="j-face"><Character char={id} expr={expr} form={(seen?.form as 'base' | 'illusion' | 'true') ?? 'base'} tight /></div>
        <figcaption className="j-info">
          <b data-testid="j-expr">{seen ? (EXPR_KO[expr] ?? '평온') : '아직 표정을 눈여겨본 적 없다'}</b>
          <span>{seen ? (LOOK_KO[expr] ?? LOOK_KO.calm) : '아직은 얼굴을 또렷이 기억하지 못한다.'}</span>
          {b && <span data-testid="j-rel">관계: {STAGE_KO[b.stage] ?? STAGE_KO[0]}{ROMANCE_KO[b.romance] ? ` · ${ROMANCE_KO[b.romance]}` : ''}</span>}
          {seen?.note && <span data-testid="j-note">마지막으로 본 것: {seen.note}</span>}
        </figcaption>
      </div>
    </figure>
  )
}

/**
 * 인물 관찰 기록. 해리가 직접 본 것과 그에 대한 주관적 해석만 보여 준다(정답지가 아니다).
 * 열람만으로 게임 시간·상태가 바뀌지 않는다(읽기 전용, 상태에서 파생). 아직 만나지 않은 인물은 탭 자체가 없다.
 */
export function JournalPanel({ state }: { state: GameState }) {
  const pages = useMemo(() => buildJournal(state), [state])
  const [sel, setSel] = useState(pages[0]?.id ?? '')
  const page = pages.find((p) => p.id === sel) ?? pages[0]
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => { root.current?.closest('.nb-page')?.scrollTo?.(0, 0) }, [sel])
  return (
    <div className="journal" data-testid="journal" ref={root}>
        <p className="muted small">내가 본 것과, 그걸 보고 내가 짐작한 것. 틀렸을 수도 있다.</p>
        {pages.length === 0 && <p className="muted">아직 적어 둘 만큼 관찰한 사람이 없다.</p>}
        {page && (
          <>
            <div className="j-tabs" role="tablist" aria-label="인물">
              {pages.map((p) => (
                <button key={p.id} role="tab" aria-selected={p.id === page.id} className={`btn ghost${p.id === page.id ? ' on' : ''}`}
                  onClick={() => setSel(p.id)} data-testid={`j-tab-${p.id}`}>{p.name.split(' ')[0]}</button>
              ))}
            </div>
            <div className="j-page" role="tabpanel" aria-label={page.name} data-testid="j-page" data-who={page.id}>
              <Portrait state={state} id={page.id} name={page.name} />
              {page.identity.length > 0 && (
                <section><h4>아는 것</h4>{page.identity.map((t, i) => <p key={i}>{t}</p>)}</section>
              )}
              {page.impression && <section><h4>요즘 받은 인상</h4><p>{page.impression}</p></section>}
              {page.observed.length > 0 && (
                <section><h4>직접 본 것</h4><ul>{page.observed.map((t, i) => <li key={i}>{t}</li>)}</ul></section>
              )}
              {page.interp && <section><h4>내 생각</h4><p>{page.interp}</p></section>}
              {page.recent.length > 0 && (
                <section><h4>달라진 점</h4><ul>{page.recent.map((t, i) => <li key={i}>{t}</li>)}</ul></section>
              )}
            </div>
          </>
        )}
    </div>
  )
}
