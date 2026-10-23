import { useEffect, useRef, useState } from 'react'
import type { SceneView } from '../shared/presentation'
import { ImageLayers, Picture } from './ImageLayers'
import { useTypewriter } from './useTypewriter'
export interface SceneRendererProps { scene: SceneView; instant?: boolean; onAdvance: () => void; onChoose: (id: string) => void }
/** Controlled view. No engine, store, conditions, storage, account, or network imports. */
export function SceneRenderer({ scene, instant = false, onAdvance, onChoose }: SceneRendererProps) {
  const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const typing = useTypewriter(scene.text, instant || reduced)
  const [transition, setTransition] = useState(false)
  const previous = useRef(scene.id)
  useEffect(() => {
    if (previous.current === scene.id) return
    previous.current = scene.id
    if (reduced) return
    setTransition(true)
    const timer = window.setTimeout(() => setTransition(false), 700)
    return () => window.clearTimeout(timer)
  }, [scene.id, reduced])
  const next = () => { if (!transition) { if (!typing.done) typing.complete(); else if (!scene.choices?.length) onAdvance() } }
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.repeat || /INPUT|SELECT|TEXTAREA|BUTTON/.test(target.tagName) || transition) return
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); next() }
      const index = Number(event.key) - 1, option = scene.choices?.[index]
      if (option && !option.disabled && typing.done) onChoose(option.id)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  })
  return <main className={'stage presentation-stage' + (scene.choices?.length ? ' is-choice' : '') + ' effect-' + (scene.effect ?? 'none')} aria-label="장면">
    <div className="bg"><Picture key={scene.background ?? ''} src={scene.background} alt="배경" className="presentation-background" /></div>
    {scene.cg ? <div className="presentation-cg"><Picture key={scene.cg.src ?? ''} src={scene.cg.src} alt={scene.cg.title} className="presentation-image" /></div> : <ImageLayers layers={scene.characters} />}
    <section className="dialogue-wrap">
      {scene.speaker && <div className="nameplate">{scene.speaker}</div>}
      <div className="dialogue">
        <p className="text" aria-live="polite">{typing.text}</p>
        {typing.done && !!scene.choices?.length && <div className="choices">{scene.choices.map((choice, i) => <button className="choice" key={choice.id} disabled={choice.disabled || transition} onClick={() => onChoose(choice.id)}>{i + 1}. {choice.text}</button>)}</div>}
        {!scene.choices?.length && <button className="btn presentation-next" disabled={transition} onClick={next}>{typing.done ? '다음' : '문장 펼치기'}</button>}
        {!!scene.choices?.length && !typing.done && <button className="btn" onClick={typing.complete}>문장 펼치기</button>}
      </div>
    </section>
    {transition && <div className="presentation-transition" aria-label="화면 전환 중" />}
  </main>
}
