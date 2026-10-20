import { useEffect } from 'react'
import { useGame, store } from './engine/store'
import { loadManifest } from './data/assets'
import { DEBUG_MODE, QA_MODE } from './engine/env'
import { Game } from './ui/Game'
import { Title } from './ui/Title'

export default function App() {
  const { state } = useGame()
  useEffect(() => { void loadManifest() }, [])
  // QA 자동화용 핸들: ?qa 격리 모드와 ?debug=1에서만 노출(QA 모드 저장은 hfd-qa: 키로 분리됨)
  useEffect(() => { if (DEBUG_MODE || QA_MODE) (window as unknown as { __hfd: unknown }).__hfd = { store } }, [])
  return state ? <Game debug={DEBUG_MODE} /> : <Title />
}
