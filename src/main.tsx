import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MockSceneScreen } from './screens/MockSceneScreen'
import './styles/renderer.css'
createRoot(document.getElementById('root')!).render(<StrictMode><MockSceneScreen /></StrictMode>)
