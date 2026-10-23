import { useSyncExternalStore } from 'react'
import { AUTO_KEY, SLOT_COUNT, loadFromSlot, slotKey } from '../engine/save'
import { CLOUD_CONFIG } from './config'
import { loadEndings, mergeEndings } from './endings'
import { buildViews, checkCompat, clearCloudCache, contentHash, loadMeta, rowBase, saveMeta, toPayload, validateSlot, writeLocalFromCloud, type SlotView } from './sync'
import { CloudError, type CloudApi, type CloudUser } from './types'

export const ALL_SLOTS = [AUTO_KEY, ...Array.from({ length: SLOT_COUNT }, (_, i) => slotKey(i + 1))]

export type CloudStatus = 'disabled' | 'init' | 'signed_out' | 'signed_in'
export interface CloudSnapshot {
  enabled: boolean; status: CloudStatus; user: CloudUser | null; views: SlotView[]; busy: boolean
  /** 마지막 오류(사용자에게 보여 줄 문장). 토큰·키는 포함하지 않는다. */
  error: string | null; offline: boolean; endingsSynced: number
}
type Notify = (msg: string) => void

/**
 * 클라우드 저장 컨트롤러.
 * 불변식:
 *  1) 로컬 저장은 항상 먼저·독립적으로 성공한다. 클라우드 실패(네트워크 등)는 로컬 데이터를 건드리지 않는다.
 *  2) 서버 쓰기는 항상 revision 조건부. 충돌이면 아무것도 덮어쓰지 않고 사용자 선택을 기다린다.
 *  3) 사용자 선택(keep_local / keep_cloud) 없이 어느 쪽도 덮어쓰지 않는다.
 *  4) 로그아웃 시 동기화 메타·메모리 캐시를 지운다.
 */
export class CloudController {
  private snap: CloudSnapshot
  private subs = new Set<() => void>()
  private api: CloudApi | null = null
  private unsub: (() => void) | null = null
  private autoTimer: ReturnType<typeof setTimeout> | null = null
  private notify: Notify = () => {}
  private retrying = false
  constructor(readonly enabled: boolean, private factory: (() => Promise<CloudApi>) | null, readonly autoDebounceMs = 4000) {
    this.snap = { enabled, status: enabled ? 'init' : 'disabled', user: null, views: [], busy: false, error: null, offline: false, endingsSynced: 0 }
  }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f) } }
  getSnapshot = () => this.snap
  setNotifier(n: Notify) { this.notify = n }
  private set(p: Partial<CloudSnapshot>) { this.snap = { ...this.snap, ...p }; this.subs.forEach((f) => f()) }
  private uid() { return this.snap.user?.id ?? null }
  private fail(e: unknown, fallback = '클라우드 요청에 실패했습니다.'): CloudError {
    const err = e instanceof CloudError ? e : new CloudError('unknown', fallback)
    this.set({ error: err.message, offline: err.kind === 'network' ? true : this.snap.offline, busy: false })
    return err
  }

  /** 앱 시작: 세션 복원. 설정이 없으면 아무것도 하지 않는다. */
  async init(): Promise<void> {
    if (!this.enabled || !this.factory || this.api) return
    try {
      this.api = await this.factory()
      this.unsub = this.api.onAuthChange((u) => { if (!u && this.snap.user) this.localSignOut(); else if (u && !this.snap.user) { this.set({ user: u, status: 'signed_in' }); void this.refresh() } })
      const u = await this.api.getSession()
      if (u) { this.set({ user: u, status: 'signed_in', error: null, offline: false }); await this.refresh() } else this.set({ status: 'signed_out' })
    } catch (e) { this.set({ status: 'signed_out' }); this.fail(e) }
  }

  async signUp(email: string, password: string): Promise<{ ok: boolean; needsConfirm: boolean }> {
    if (!this.api) return { ok: false, needsConfirm: false }
    this.set({ busy: true, error: null })
    try {
      const r = await this.api.signUp(email.trim(), password)
      if (r.user) { this.set({ user: r.user, status: 'signed_in', busy: false }); await this.refresh() } else this.set({ busy: false })
      return { ok: true, needsConfirm: r.needsConfirm }
    } catch (e) { this.fail(e); return { ok: false, needsConfirm: false } }
  }
  async signIn(email: string, password: string): Promise<boolean> {
    if (!this.api) return false
    this.set({ busy: true, error: null })
    try {
      const u = await this.api.signIn(email.trim(), password)
      this.set({ user: u, status: 'signed_in', busy: false, offline: false })
      await this.refresh(); return true
    } catch (e) { this.fail(e); return false }
  }
  async signOut(): Promise<void> {
    try { await this.api?.signOut() } catch { /* 네트워크가 없어도 로컬 세션·캐시는 지운다 */ }
    this.localSignOut()
  }
  private localSignOut() {
    if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null }
    clearCloudCache(this.uid())
    this.set({ user: null, status: 'signed_out', views: [], error: null, offline: false, busy: false, endingsSynced: 0 })
  }

  /** 서버 상태를 읽어 슬롯별 비교(읽기 전용) + 엔딩 동기화. 어떤 저장도 덮어쓰지 않는다. */
  async refresh(): Promise<void> {
    const uid = this.uid(); if (!uid || !this.api) return
    this.set({ busy: true, error: null })
    try {
      const rows = await this.api.listSaves(uid)
      const meta = loadMeta(uid)
      // 서버와 내용이 같은데 기준(base)이 없거나 오래된 슬롯은 기준만 갱신(데이터 변경 없음)
      for (const v of buildViews(uid, rows, meta, ALL_SLOTS)) if (v.status === 'same' && v.cloud) meta.base[v.slot] = rowBase(v.cloud)
      saveMeta(uid, meta)
      this.set({ views: buildViews(uid, rows, meta, ALL_SLOTS), busy: false, offline: false })
      await this.syncEndings()
      await this.retryPending()
    } catch (e) { this.fail(e) }
  }

  /** 오프라인 등으로 올리지 못한 슬롯을 다시 시도한다. 항상 기준 리비전 조건부라서 서버가 바뀌었다면 충돌로 남고 덮어쓰지 않는다. */
  async retryPending(): Promise<void> {
    const uid = this.uid(); if (!uid || !this.api || this.retrying) return
    const slots = Object.keys(loadMeta(uid).pending); if (!slots.length) return
    this.retrying = true
    try { for (const slot of slots) { const r = await this.pushSlot(slot, 'normal'); if (r === 'offline') break } } finally { this.retrying = false }
  }

  async syncEndings(): Promise<void> {
    const uid = this.uid(); if (!uid || !this.api) return
    try {
      const cloud = await this.api.listEndings(uid)
      const local = loadEndings().ids
      const toUp = local.filter((id) => !cloud.includes(id))
      if (toUp.length) await this.api.insertEndings(uid, toUp)
      const added = mergeEndings(cloud)
      this.set({ endingsSynced: toUp.length + added })
    } catch (e) { this.fail(e) }
  }

  /** 게임이 로컬 저장을 마친 뒤 호출. auto는 디바운스. 실패해도 예외를 던지지 않는다. */
  onLocalSaved(slot: string): void {
    if (!this.uid() || !this.api) return
    if (slot === AUTO_KEY) {
      if (this.autoTimer) clearTimeout(this.autoTimer)
      this.autoTimer = setTimeout(() => { this.autoTimer = null; void this.pushSlot(slot, 'normal') }, this.autoDebounceMs)
    } else void this.pushSlot(slot, 'normal')
  }
  /** 대기 중인 자동 저장 푸시를 즉시 실행(탭 닫기 직전 등) */
  async flush(): Promise<void> { if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; await this.pushSlot(AUTO_KEY, 'normal') } }

  /**
   * normal: 기준(base) 리비전으로 조건부 쓰기. 기준이 없으면 INSERT(서버에 이미 있으면 충돌).
   * keep_local: 사용자가 "로컬 유지"를 확인한 경우 — 방금 본 서버 리비전을 기대값으로 조건부 덮어쓰기(그 사이 또 바뀌면 다시 충돌).
   */
  async pushSlot(slot: string, mode: 'normal' | 'keep_local'): Promise<'ok' | 'conflict' | 'offline' | 'skipped' | 'error'> {
    const uid = this.uid(); const api = this.api
    if (!uid || !api) return 'skipped'
    try {
      validateSlot(slot)
      const local = loadFromSlot(slot); if (!local) return 'skipped'
      const meta = loadMeta(uid)
      let expected: number | null = meta.base[slot]?.rev ?? null
      if (mode === 'keep_local') { const cur = this.snap.views.find((v) => v.slot === slot)?.cloud; expected = cur ? cur.revision : null }
      const res = await api.pushSave(uid, toPayload(slot, local), expected)
      if (!res.ok) {
        delete meta.pending[slot]; saveMeta(uid, meta)
        await this.refresh()
        this.notify('클라우드 저장과 이 기기의 저장이 서로 달라졌습니다. 저장 메뉴에서 어느 쪽을 유지할지 선택해 주세요.')
        return 'conflict'
      }
      meta.base[slot] = { rev: res.row.revision, hash: contentHash(local.state, local.read) }; delete meta.pending[slot]; saveMeta(uid, meta)
      this.set({ views: this.snap.views.map((v) => (v.slot === slot ? { ...v, cloud: res.row, status: 'same', pending: false } : v)), offline: false })
      return 'ok'
    } catch (e) {
      const err = this.fail(e)
      if (err.kind === 'network') {
        const meta = loadMeta(uid); meta.pending[slot] = true; saveMeta(uid, meta)
        this.notify('오프라인입니다. 이 기기에는 저장되었고, 연결되면 클라우드에 올릴 수 있습니다.')
        return 'offline'
      }
      return 'error'
    }
  }

  /** 클라우드 → 이 기기. 기존 로컬은 bak 키로 보존된다. 현재 진행 중인 게임 상태는 바꾸지 않는다. */
  async pullSlot(slot: string): Promise<'ok' | 'incompatible' | 'missing' | 'error'> {
    const uid = this.uid(); if (!uid) return 'error'
    const v = this.snap.views.find((x) => x.slot === slot)
    if (!v?.cloud) return 'missing'
    const compat = checkCompat(v.cloud)
    if (!compat.ok) { this.set({ error: compat.reason }); return 'incompatible' }
    writeLocalFromCloud(v.cloud, compat)
    const meta = loadMeta(uid); meta.base[slot] = rowBase(v.cloud); delete meta.pending[slot]; saveMeta(uid, meta)
    await this.refresh()
    return 'ok'
  }

  /** 클라우드 슬롯 삭제(리비전 조건부). 로컬 슬롯은 그대로. */
  async deleteCloudSlot(slot: string): Promise<'ok' | 'conflict' | 'missing' | 'error'> {
    const uid = this.uid(); const api = this.api
    const v = this.snap.views.find((x) => x.slot === slot)
    if (!uid || !api || !v?.cloud) return 'missing'
    try {
      const r = await api.deleteSave(uid, slot, v.cloud.revision)
      const meta = loadMeta(uid); delete meta.base[slot]; delete meta.pending[slot]; saveMeta(uid, meta)
      await this.refresh()
      return r.ok ? 'ok' : 'conflict'
    } catch (e) { this.fail(e); return 'error' }
  }

  dispose() { this.unsub?.(); if (this.autoTimer) clearTimeout(this.autoTimer) }
}

/** 설정이 유효할 때만 실제 Supabase 구현을 로드한다. */
export const cloud = new CloudController(
  CLOUD_CONFIG.enabled,
  CLOUD_CONFIG.enabled ? async () => (await import('./supabaseApi')).createSupabaseCloud(CLOUD_CONFIG.url, CLOUD_CONFIG.anonKey) : null,
)

export function useCloud(c: CloudController = cloud): CloudSnapshot { return useSyncExternalStore(c.subscribe, c.getSnapshot) }
