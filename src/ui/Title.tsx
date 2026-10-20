import { useState } from 'react'
import { store, useGame } from '../engine/store'
import { loadFromSlot, AUTO_KEY } from '../engine/save'
import { devAttrs, QA_MODE } from '../engine/env'
import { Gallery, SaveLoad, SettingsPanel } from './Overlays'
import { assetCounts } from '../data/assets'

/** 타이틀. 확장 설계는 docs/TITLE_SCREEN_PLAN.md. 스토리의 비밀(변화·환영)을 암시하는 요소를 두지 않는다. */
export function Title() {
  const { settings, toast, cgSeen } = useGame()
  const [ov, setOv] = useState<null | 'load' | 'settings' | 'gallery'>(null)
  const hasAuto = !!loadFromSlot(AUTO_KEY)
  const c = assetCounts()
  return (
    <main className="title" data-testid="title">
      <div className="title-inner">
        <p className="kicker">비공식 팬 프로젝트</p>
        <h1>HOGWARTS<br />FRACTURED DESTINY</h1>
        <p className="sub">갈라진 운명 — 호그와트 6학년, 또 하나의 해</p>
        <nav className="title-menu">
          <button className="btn primary" onClick={() => store.newGame()} data-testid="new-game">새 게임</button>
          <button className="btn" disabled={!hasAuto} onClick={() => store.load(AUTO_KEY)} data-testid="continue">이어하기</button>
          <button className="btn" onClick={() => setOv('load')} data-testid="open-load">불러오기</button>
          <button className="btn" onClick={() => setOv('gallery')} data-testid="open-gallery">장면 갤러리</button>
          <button className="btn" onClick={() => setOv('settings')}>설정</button>
        </nav>
        <p className="legal">이 작품은 비공식 팬 창작물이며 원작 저작권자와 무관합니다. 등장인물은 모두 성인입니다.</p>
        {devAttrs() && <p className="legal" data-testid="dev-info">개발 정보 · 이미지 {c.final}/{c.final + c.placeholder}</p>}
      </div>
      {ov === 'load' && <SaveLoad mode="load" canSave={false} onClose={() => setOv(null)} />}
      {ov === 'settings' && <SettingsPanel settings={settings} onClose={() => setOv(null)} />}
      {ov === 'gallery' && <Gallery seen={cgSeen} onClose={() => setOv(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
      {QA_MODE && <div className="qa-badge" aria-hidden>QA</div>}
    </main>
  )
}
