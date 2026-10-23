import { useEffect } from 'react'
import { useGame, store } from './engine/store'
import { loadManifest } from './data/assets'
import { DEBUG_MODE, QA_MODE } from './engine/env'
import { cloud } from './cloud/cloudStore'
import { Game } from './ui/Game'
import { Title } from './ui/Title'
import { Intro } from './ui/Intro'

export default function App() {
  const { state, intro } = useGame()
  useEffect(() => { void loadManifest() }, [])
  // QA 자동화용 핸들: ?qa 격리 모드와 ?debug=1에서만 노출(QA 모드 저장은 hfd-qa: 키로 분리됨)
  useEffect(() => { if (DEBUG_MODE || QA_MODE) (window as unknown as { __hfd: unknown }).__hfd = { store, cloud } }, [])
  // 클라우드(설정된 경우에만): 로컬 저장 직후 푸시 훅 + 세션 복원. 미설정이면 아무 일도 하지 않는다.
  useEffect(() => {
    if (!cloud.enabled) return
    store.afterSave = (slot) => cloud.onLocalSaved(slot)
    cloud.setNotifier((m) => store.say(m))
    void cloud.init()
    const onHide = () => { if (document.visibilityState === 'hidden') void cloud.flush() }
    const onOnline = () => { void cloud.refresh() } // 연결이 돌아오면 상태 갱신 + 대기 중이던 슬롯 재시도
    document.addEventListener('visibilitychange', onHide); window.addEventListener('online', onOnline)
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('online', onOnline); store.afterSave = null }
  }, [])
  if (state && intro) return <Intro />
  return state ? <Game debug={DEBUG_MODE} /> : <Title />
}
