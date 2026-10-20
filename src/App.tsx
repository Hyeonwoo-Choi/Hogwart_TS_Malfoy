import { useEffect } from 'react'
import { useGame, store } from './engine/store'
import { loadManifest } from './data/assets'
import { Game } from './ui/Game'
import { Title } from './ui/Title'

const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

export default function App() {
  const { state } = useGame()
  useEffect(() => { void loadManifest() }, [])
  useEffect(() => { if (debug) (window as unknown as { __hfd: unknown }).__hfd = { store } }, [])
  return state ? <Game debug={debug} /> : <Title />
}
