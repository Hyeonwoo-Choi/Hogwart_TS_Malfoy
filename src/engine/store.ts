import { useSyncExternalStore } from 'react'
import { advance, choose, newState, pickActivity, run, setScenario, clone, debugSet, startScene } from './core'
import {
  AUTO_KEY, exportSave, loadFromSlot, loadRead, loadSettings, parseImport, persistRead, persistSettings, saveToSlot,
} from './save'
import { SCENARIO, START_SCENE } from '../data/scenario'
import type { GameState, Settings } from './types'

setScenario(SCENARIO)

export interface Snapshot { state: GameState | null; settings: Settings; readVersion: number; toast: string | null }

class GameStore {
  state: GameState | null = null
  settings: Settings = loadSettings()
  read: Set<string> = loadRead()
  readVersion = 0
  toast: string | null = null
  private snap: Snapshot = this.make()
  private subs = new Set<() => void>()

  private make(): Snapshot { return { state: this.state, settings: this.settings, readVersion: this.readVersion, toast: this.toast } }
  private emit() { this.snap = this.make(); this.subs.forEach((f) => f()) }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f) } }
  getSnapshot = () => this.snap

  private set(s: GameState | null) { this.state = s; this.emit() }
  say(msg: string) { this.toast = msg; this.emit(); window.setTimeout(() => { if (this.toast === msg) { this.toast = null; this.emit() } }, 2600) }

  newGame() { const s = run(newState(START_SCENE)); this.set(s); this.autosave() }
  toTitle() { this.set(null) }

  markRead(id: string) {
    if (!this.read.has(id)) { this.read.add(id); this.readVersion++; persistRead(this.read) }
  }
  isRead = (id: string) => this.read.has(id)

  advance() { if (this.state) this.set(advance(this.state)) }
  choose(key: string) { if (this.state) { this.set(choose(this.state, key)); this.autosave() } }
  pick(loc: string, act: string) {
    if (!this.state) return
    const before = this.state.mode
    const next = pickActivity(this.state, loc, act)
    this.set(next)
    if (before === 'ROUTINE' && next.mode !== 'ROUTINE') this.autosave()
    if (before === 'ROUTINE' && next.mode === 'STORY') this.autosave()
  }
  autosave() { if (this.state) saveToSlot(AUTO_KEY, this.state, this.read) }
  save(key: string) {
    if (!this.state) return false
    const ok = saveToSlot(key, this.state, this.read)
    this.say(ok ? '저장했습니다.' : '브라우저 저장소를 쓸 수 없어 임시로 저장했습니다. 파일로 내보내 주세요.')
    return ok
  }
  load(key: string) {
    const f = loadFromSlot(key)
    if (!f) { this.say('불러올 저장 데이터가 없습니다.'); return false }
    f.read.forEach((id) => this.read.add(id)); persistRead(this.read)
    this.set(clone(f.state)); this.say('불러왔습니다.'); return true
  }
  export() { return this.state ? exportSave(this.state, this.read) : null }
  import(text: string) {
    const f = parseImport(text)
    f.read.forEach((id) => this.read.add(id)); persistRead(this.read)
    this.set(clone(f.state)); this.say('저장 파일을 불러왔습니다.')
  }
  updateSettings(p: Partial<Settings>) { this.settings = { ...this.settings, ...p }; persistSettings(this.settings); this.emit() }
  /** QA/개발용: 현재 상태를 유지한 채 특정 장면으로 이동 */
  jump(scene: string) { if (this.state) this.set(startScene(this.state, scene)) }
  debug(path: string, v: number | boolean) { if (this.state) this.set(debugSet(this.state, path, v)) }
}

export const store = new GameStore()
export function useGame(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
