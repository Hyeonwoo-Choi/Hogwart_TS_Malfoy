import { useSyncExternalStore } from 'react'
import { advance, choose, continueChapter, newState, readTerm, pickActivity, run, setRandomEvents, setTransitions, setActivityScenes, setIncidents, setScenario, clone, debugSet, skipRoutine, skipTo, startScene } from './core'
import {
  AUTO_KEY, LEGACY_MESSAGE, exportSave, isLegacySlot, loadCgRecord, loadFromSlot, loadRead, loadSettings, parseImport,
  persistRead, persistSettings, recordCg, saveToSlot,
} from './save'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { RANDOM_EVENTS } from '../data/randomEvents'
import { INCIDENTS } from '../data/incidents'
import { IS_TEST } from './env'
import type { GameState, Settings } from './types'

setScenario(SCENARIO)
if (!IS_TEST) setTransitions(true)
if (!IS_TEST) setActivityScenes(true)
if (!IS_TEST) setIncidents(INCIDENTS)
if (!IS_TEST) setRandomEvents(RANDOM_EVENTS) // 일상 랜덤 이벤트는 앱에서만 켠다(테스트는 기본적으로 꺼져 있고, 이벤트 테스트가 직접 켠다)

/** epoch: 새 게임·타이틀·불러오기·가져오기마다 늘어난다(화면 전환 연출이 "상태가 통째로 바뀐 것"을 연출로 착각하지 않게 하는 표식) */
export interface Snapshot { state: GameState | null; settings: Settings; readVersion: number; toast: string | null; cgSeen: string[]; epoch: number; intro: boolean }
/** 새 게임 도입부(타이포그래피 프롤로그). 테스트는 기본 꺼짐(개별 테스트가 켠다) */
export const introConfig = { enabled: !IS_TEST }

class GameStore {
  state: GameState | null = null
  settings: Settings = loadSettings()
  read: Set<string> = loadRead()
  readVersion = 0
  toast: string | null = null
  cgSeen: string[] = loadCgRecord().ids
  /** 로컬 저장 직후 호출되는 훅(클라우드 푸시용). 실패해도 로컬 저장에는 영향이 없다. */
  afterSave: ((slot: string) => void) | null = null
  /** 도입부 재생 중(새 게임에서만 true, 저장되지 않는다 → 불러오기·이어하기에서는 반복되지 않는다) */
  intro = false
  private snap: Snapshot = this.make()
  private subs = new Set<() => void>()

  epoch = 0
  private make(): Snapshot { return { state: this.state, settings: this.settings, readVersion: this.readVersion, toast: this.toast, cgSeen: this.cgSeen, epoch: this.epoch, intro: this.intro } }
  private emit() { this.snap = this.make(); this.subs.forEach((f) => f()) }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f) } }
  getSnapshot = () => this.snap

  private set(s: GameState | null) {
    this.state = s
    // CG 경험 기록: 장면에서 CG가 표시되는 순간 영구 기록(이미지 유무와 무관, 저장 슬롯과 별개)
    if (s?.view.cg && !this.cgSeen.includes(s.view.cg)) { recordCg(s.view.cg); this.cgSeen = loadCgRecord().ids }
    this.emit()
  }
  say(msg: string) { this.toast = msg; this.emit(); window.setTimeout(() => { if (this.toast === msg) { this.toast = null; this.emit() } }, 3200) }

  newGame() { const s = run(newState(START_SCENE)); this.epoch++; this.intro = introConfig.enabled; this.set(s); this.autosave() }
  /** 도입부 종료(끝까지 재생 또는 건너뛰기). 게임 상태는 바뀌지 않는다 */
  endIntro() { if (!this.intro) return; this.intro = false; this.epoch++; this.emit() }
  toTitle() { this.epoch++; this.intro = false; this.set(null) }

  markRead(id: string) {
    if (!this.read.has(id)) { this.read.add(id); this.readVersion++; persistRead(this.read) }
  }
  isRead = (id: string) => this.read.has(id)

  advance() { if (this.state) this.set(advance(this.state)) }
  /** 게시판 공지를 읽음으로 기록(시간·상태에 영향 없음) */
  markNoticeRead(id: string) {
    if (!this.state || this.state.board?.read.includes(id)) return
    const n = clone(this.state); n.board = n.board ?? { done: {}, read: [] }; n.board.read.push(id); this.set(n)
  }
  /** 용어 설명을 읽음으로 기록(대사 진행과 무관) */
  markTermRead(id: string) { if (!this.state) return; const n = readTerm(this.state, id); if (n !== this.state) this.set(n) }
  /** 챕터 종료 카드 → 다음 챕터. 이어서 자동 저장한다. */
  continueChapter() { if (this.state) { this.set(continueChapter(this.state)); this.autosave() } }
  choose(key: string) { if (this.state) { this.set(choose(this.state, key)); this.autosave() } }
  pick(loc: string, act: string) {
    if (!this.state) return
    const before = this.state.mode
    const next = pickActivity(this.state, loc, act)
    this.set(next)
    if (before === 'ROUTINE' && next.mode !== 'ROUTINE') this.autosave()
  }
  /** 남은 자유 시간을 넘기고 다음 스토리로 진행한다. */
  /** 목표 칸(일과 칸 번호)까지 시간 건너뛰기. 필수 행사에서는 그 시각에서 멈춘다. 끝난 뒤 자동 저장 */
  skipTo(target: number) {
    if (this.state?.mode !== 'ROUTINE') return null
    const { state, plan } = skipTo(this.state, target)
    if (!plan.ok) { this.say(plan.reason ?? '건너뛸 수 없다.'); return plan }
    this.set(state); this.autosave()
    if (plan.stopAt !== undefined) this.say(state.routine?.message ?? '중요한 일정 시각에서 멈췄다.')
    return plan
  }
  skip() { if (this.state?.mode === 'ROUTINE') { this.set(skipRoutine(this.state)); this.autosave() } }
  private autoWarned = false
  autosave() { if (this.state) { const ok = saveToSlot(AUTO_KEY, this.state, this.read); if (!ok && !this.autoWarned) { this.autoWarned = true; this.say('자동 저장을 브라우저에 기록하지 못했습니다. 이 탭이 열려 있는 동안만 유지되니, 저장하기로 파일로 내보내 주세요.') } if (ok) this.autoWarned = false; try { this.afterSave?.(AUTO_KEY) } catch { /* 클라우드 오류는 게임을 멈추지 않는다 */ } } }
  save(key: string) {
    if (!this.state) return false
    const ok = saveToSlot(key, this.state, this.read)
    try { this.afterSave?.(key) } catch { /* noop */ }
    this.say(ok ? '저장했습니다.' : '영구 저장에 실패해 임시로만 저장했습니다. 이 탭을 닫거나 새로고침하면 사라집니다. 파일로 내보내 주세요.')
    return ok
  }
  load(key: string) {
    if (isLegacySlot(key)) { this.say(LEGACY_MESSAGE); return false }
    const f = loadFromSlot(key)
    if (!f) { this.say('불러올 저장 데이터가 없습니다.'); return false }
    f.read.forEach((id) => this.read.add(id)); persistRead(this.read)
    this.epoch++; this.intro = false; this.set(clone(f.state)); this.say('불러왔습니다.'); return true
  }
  export() { return this.state ? exportSave(this.state, this.read) : null }
  import(text: string) {
    const f = parseImport(text)
    f.read.forEach((id) => this.read.add(id)); persistRead(this.read)
    this.epoch++; this.intro = false; this.set(clone(f.state)); this.say('저장 파일을 불러왔습니다.')
  }
  /** CG 경험 기록을 저장소에서 다시 읽는다(다른 탭·테스트에서 기록이 바뀐 경우) */
  refreshCg() { this.cgSeen = loadCgRecord().ids; this.emit() }
  updateSettings(p: Partial<Settings>) { this.settings = { ...this.settings, ...p }; persistSettings(this.settings); this.emit() }
  /** QA/개발용: 현재 상태를 유지한 채 특정 장면으로 이동 */
  jump(scene: string) { if (this.state) this.set(startScene(this.state, scene)) }
  debug(path: string, v: number | boolean) { if (this.state) this.set(debugSet(this.state, path, v)) }
}

export const store = new GameStore()
export function useGame(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
