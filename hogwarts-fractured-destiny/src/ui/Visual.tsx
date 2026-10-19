import { useEffect, useState } from 'react'
import { BG_KO, charAssetId, getAsset, onManifest } from '../data/assets'
import { CHAR_KO, EXPR_KO } from '../data/constants'

function useManifestTick() {
  const [, set] = useState(0)
  useEffect(() => onManifest(() => set((n) => n + 1)), [])
}

const BG_TINT: Record<string, [string, string]> = {
  black: ['#07090b', '#07090b'], train: ['#1d2a30', '#0c1317'], hall: ['#2b2418', '#0e0d0a'], potions: ['#16302b', '#08130f'],
  pitch: ['#27402f', '#0c1710'], library: ['#2a2118', '#0f0b08'], courtyard: ['#26302f', '#0b1110'], lake: ['#1a2c36', '#0a1218'],
  corridor7_night: ['#17151f', '#06060a'], common: ['#33241b', '#110b08'], trophy: ['#2e2a1c', '#0e0c07'],
}

export function Background({ id }: { id: string }) {
  useManifestTick()
  const a = getAsset(`bg.${id}`)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [id, a?.path])
  const real = a?.status === 'final' && a.path && !failed
  const [c1, c2] = BG_TINT[id] ?? ['#1b2327', '#0a0e10']
  return (
    <div className="bg" data-testid="bg" data-bg={id} data-asset={real ? 'final' : 'placeholder'}
      style={real ? undefined : { background: `radial-gradient(120% 90% at 50% 20%, ${c1}, ${c2})` }}>
      {real && <img src={a!.path} alt="" onError={() => { console.warn(`[asset] 배경 이미지를 찾을 수 없어 플레이스홀더로 대체: ${a!.path}`); setFailed(true) }} />}
      {!real && id !== 'black' && <span className="ph-label">PLACEHOLDER · {BG_KO[id] ?? id}</span>}
    </div>
  )
}

const HAIR: Record<string, string> = { draco: '#dcd9c6', hermione: '#6b4a32', ron: '#b5532a', ginny: '#a8431f', luna: '#d9c58a', slughorn: '#cfcfcf', pansy: '#2a2024' }
const ROBE: Record<string, string> = { draco: '#1f4a3c', hermione: '#7a1f2b', ron: '#7a1f2b', ginny: '#7a1f2b', luna: '#2a3550', slughorn: '#4a2f55', pansy: '#1f4a3c' }
const MOUTH: Record<string, string> = {
  calm: 'M128 178 q22 6 44 0', blank: 'M130 180 h40', smirk: 'M128 180 q26 4 44 -8', interest: 'M130 178 q20 10 40 0',
  flustered: 'M135 182 q15 -8 30 0', angry: 'M128 184 q22 -12 44 0', anxious: 'M130 182 q10 -6 20 0 q10 6 20 0',
  sad: 'M130 186 q20 -14 40 0', resolve: 'M128 180 h44', smile: 'M126 176 q24 18 48 0',
}

function PlaceholderChar({ char, expr }: { char: string; expr: string }) {
  const label = `${CHAR_KO[char] ?? char}${char === 'draco' ? ` · ${EXPR_KO[expr] ?? expr}` : ''}`
  return (
    <svg className="char-svg" viewBox="0 0 300 520" role="img" aria-label={`플레이스홀더: ${label}`}>
      <path d="M40 520 q10 -190 110 -200 q100 10 110 200z" fill={ROBE[char] ?? '#26303a'} opacity=".92" />
      <rect x="132" y="262" width="36" height="46" rx="10" fill="#cdbba7" />
      <ellipse cx="150" cy="170" rx="52" ry="64" fill="#e2d2bf" />
      <path d="M96 168 q-6 -92 54 -96 q60 4 54 96 q-14 -50 -54 -52 q-40 2 -54 52z" fill={HAIR[char] ?? '#555'} />
      <circle cx="130" cy="164" r="4" fill="#223" /><circle cx="170" cy="164" r="4" fill="#223" />
      <path d={MOUTH[expr] ?? MOUTH.calm} stroke="#6a3b3b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="20" y="468" width="260" height="34" rx="6" fill="rgba(0,0,0,.55)" />
      <text x="150" y="490" textAnchor="middle" fontSize="16" fill="#e9dfc8">PLACEHOLDER · {label}</text>
    </svg>
  )
}

export function Character({ char, expr }: { char: string | null; expr: string | null }) {
  useManifestTick()
  const id = char ? charAssetId(char, expr) : ''
  const a = char ? getAsset(id) : undefined
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [id, a?.path])
  if (!char) return <div className="sprite" data-testid="sprite" data-char="" />
  const real = a?.status === 'final' && a.path && !failed
  const shownExpr = id.endsWith('.calm') && expr && !id.endsWith(`.${expr}`) ? 'calm' : expr ?? 'calm'
  return (
    <div className="sprite" data-testid="sprite" data-char={char} data-expr={expr ?? ''} data-asset={real ? 'final' : 'placeholder'}>
      {real
        ? <img src={a!.path} alt={CHAR_KO[char] ?? char} onError={() => { console.warn(`[asset] 캐릭터 이미지를 찾을 수 없어 플레이스홀더로 대체: ${a!.path}`); setFailed(true) }} />
        : <PlaceholderChar char={char} expr={char === 'draco' ? (expr ?? 'calm') : shownExpr} />}
    </div>
  )
}
