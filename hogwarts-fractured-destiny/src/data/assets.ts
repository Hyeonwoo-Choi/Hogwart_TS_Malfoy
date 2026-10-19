import { CHAR_KO, EXPR_KO } from './constants'

/**
 * 에셋 매니페스트. 실제 일러스트로 교체하는 방법:
 *  1) 이미지를 public/assets/char/ 또는 public/assets/bg/ 에 넣는다.
 *  2) public/assets/manifest.json 에 항목을 추가/수정한다 (status:"final", path:"/assets/char/draco_smirk.png").
 *  재빌드 없이 새로고침만으로 반영되며, 파일이 없으면 자동으로 플레이스홀더로 되돌아간다.
 */
export interface AssetEntry { id: string; kind: 'bg' | 'char'; status: 'placeholder' | 'final'; path?: string; label?: string; note?: string }

export const BG_IDS = ['black', 'train', 'hall', 'potions', 'pitch', 'library', 'courtyard', 'lake', 'corridor7_night', 'common', 'trophy'] as const
export const BG_KO: Record<string, string> = {
  black: '암전', train: '호그와트 급행열차', hall: '대연회장', potions: '마법약 교실', pitch: '퀴디치 경기장', library: '도서관',
  courtyard: '안뜰', lake: '검은 호수', corridor7_night: '7층 복도(야간)', common: '기숙사 휴게실', trophy: '트로피 진열실',
}
export const EXPR_IDS = Object.keys(EXPR_KO)
export const CHAR_IDS = Object.keys(CHAR_KO)

export const DEFAULT_MANIFEST: AssetEntry[] = [
  ...BG_IDS.map((id): AssetEntry => ({ id: `bg.${id}`, kind: 'bg', status: 'placeholder', label: BG_KO[id] })),
  ...EXPR_IDS.map((e): AssetEntry => ({ id: `char.draco.${e}`, kind: 'char', status: 'placeholder', label: `드레이코 · ${EXPR_KO[e]}` })),
  ...['hermione', 'ron', 'ginny', 'luna', 'slughorn', 'pansy', 'hooch', 'snape', 'mcgonagall', 'filch'].map((c): AssetEntry => ({ id: `char.${c}.calm`, kind: 'char', status: 'placeholder', label: `${CHAR_KO[c]}` })),
]

let manifest = new Map<string, AssetEntry>(DEFAULT_MANIFEST.map((e) => [e.id, e]))
const listeners = new Set<() => void>()
export const onManifest = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }

export async function loadManifest(url = '/assets/manifest.json'): Promise<void> {
  try {
    const r = await fetch(url, { cache: 'no-cache' })
    if (!r.ok) return
    const j = (await r.json()) as { assets?: AssetEntry[] }
    for (const e of j.assets ?? []) manifest.set(e.id, { ...manifest.get(e.id), ...e })
    listeners.forEach((f) => f())
  } catch { /* 기본 매니페스트 유지 */ }
}
export function getAsset(id: string): AssetEntry | undefined { return manifest.get(id) }
export function resetManifest() { manifest = new Map(DEFAULT_MANIFEST.map((e) => [e.id, e])) }
export function assetCounts() {
  const all = [...manifest.values()]
  return { final: all.filter((a) => a.status === 'final').length, placeholder: all.filter((a) => a.status === 'placeholder').length }
}

/** 캐릭터 에셋 ID 결정: 표정 에셋이 없으면 calm → 플레이스홀더 순으로 대체 */
export function charAssetId(char: string, expr: string | null): string {
  const want = `char.${char}.${expr ?? 'calm'}`
  if (manifest.has(want)) return want
  return `char.${char}.calm`
}
