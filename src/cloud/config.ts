import { QA_MODE } from '../engine/env'

/**
 * 클라우드 설정. 환경변수가 없거나 안전하지 않으면 클라우드 기능은 꺼지고 게임은 로컬 저장만으로 정상 동작한다.
 * - 브라우저에는 공개 키(anon / sb_publishable_)만 허용한다. service_role·sb_secret_ 키가 감지되면 사용하지 않는다.
 * - ?qa 격리 모드에서는 실제 계정·클라우드를 건드리지 않도록 항상 꺼진다.
 */
export interface CloudConfig { enabled: boolean; url: string; anonKey: string; reason: string | null }

function jwtRole(key: string): string | null {
  const parts = key.split('.')
  if (parts.length !== 3) return null
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '='))
    return (JSON.parse(json) as { role?: string }).role ?? null
  } catch { return null }
}

/** 순수 함수: 테스트에서 값을 주입해 검증한다. */
export function evaluateConfig(url: string | undefined, key: string | undefined, qa: boolean): CloudConfig {
  const off = (reason: string): CloudConfig => ({ enabled: false, url: '', anonKey: '', reason })
  if (qa) return off('qa-mode')
  if (!url || !key) return off('not-configured')
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url.trim()) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url.trim())) return off('invalid-url')
  const k = key.trim()
  if (/^sb_secret_/i.test(k)) return off('secret-key-rejected')
  const role = jwtRole(k)
  if (role && role !== 'anon') return off('secret-key-rejected') // service_role 등
  if (!/^sb_publishable_/i.test(k) && role !== 'anon') return off('unrecognized-key')
  return { enabled: true, url: url.trim().replace(/\/$/, ''), anonKey: k, reason: null }
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
export const CLOUD_CONFIG: CloudConfig = evaluateConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, QA_MODE)
if (!CLOUD_CONFIG.enabled && CLOUD_CONFIG.reason && CLOUD_CONFIG.reason !== 'not-configured' && CLOUD_CONFIG.reason !== 'qa-mode') {
  // 키 값은 출력하지 않는다.
  console.warn(`[cloud] 클라우드 저장이 꺼져 있습니다: ${CLOUD_CONFIG.reason}`)
}
