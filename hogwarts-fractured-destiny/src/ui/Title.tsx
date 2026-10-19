import { useState } from 'react'
import { store, useGame } from '../engine/store'
import { loadFromSlot, AUTO_KEY } from '../engine/save'
import { SaveLoad, SettingsPanel } from './Overlays'
import { assetCounts } from '../data/assets'

export function Title() {
  const { settings, toast } = useGame()
  const [ov, setOv] = useState<null | 'load' | 'settings'>(null)
  const hasAuto = !!loadFromSlot(AUTO_KEY)
  const c = assetCounts()
  return (
    <main className="title" data-testid="title">
      <div className="title-inner">
        <p className="kicker">비공식 팬 프로젝트</p>
        <h1>HOGWARTS<br />FRACTURED DESTINY</h1>
        <p className="sub">균열 난 운명 — 호그와트 6학년, 대체 세계</p>
        <nav className="title-menu">
          <button className="btn primary" onClick={() => store.newGame()} data-testid="new-game">새 게임</button>
          <button className="btn" disabled={!hasAuto} onClick={() => store.load(AUTO_KEY)} data-testid="continue">이어하기</button>
          <button className="btn" onClick={() => setOv('load')} data-testid="open-load">불러오기</button>
          <button className="btn" onClick={() => setOv('settings')}>설정</button>
        </nav>
        <p className="legal">이 작품은 비공식 팬 창작물이며 원작 저작권자와 무관합니다.</p>
        <p className="legal">PHASE 3 · 챕터 1 플레이 가능 · 에셋: 완성 {c.final} / 플레이스홀더 {c.placeholder}</p>
      </div>
      {ov === 'load' && <SaveLoad mode="load" canSave={false} onClose={() => setOv(null)} />}
      {ov === 'settings' && <SettingsPanel settings={settings} onClose={() => setOv(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}
