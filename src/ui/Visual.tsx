import { useEffect, useState } from 'react'
import { charAssetId, getAsset, onManifest } from '../data/assets'
import { CG_BY_ID } from '../data/cg'
import { CHAR_KO } from '../data/constants'
import { devAttrs } from '../engine/env'
import type { Form, Gaze, Pose } from '../engine/types'

/**
 * 비주얼 레이어.
 * - 일반 플레이어 화면에는 인물 이름만 보인다. 표정 코드·외형 상태·에셋 ID·"플레이스홀더" 같은 문구는
 *   화면과 DOM에 노출하지 않는다(devAttrs()가 참인 QA/디버그/테스트에서만 data-* 속성으로 노출).
 * - 실제 이미지는 매니페스트(status:"final")로 교체되며, 없거나 로드 실패 시 실루엣으로 대체한다.
 */
function useManifestTick() {
  const [, set] = useState(0)
  useEffect(() => onManifest(() => set((n) => n + 1)), [])
}
function dev(attrs: Record<string, string>): Record<string, string> { return devAttrs() ? attrs : {} }

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
    <div className="bg" data-testid="bg" {...dev({ 'data-bg': id, 'data-asset': real ? 'final' : 'placeholder' })}
      style={real ? undefined : { background: `radial-gradient(120% 90% at 50% 20%, ${c1}, ${c2})` }}>
      {real && <img src={a!.path} alt="" onError={() => setFailed(true)} />}
    </div>
  )
}

const HAIR: Record<string, string> = { draco: '#dcd9c6', hermione: '#6b4a32', ron: '#b5532a', ginny: '#a8431f', luna: '#d9c58a', slughorn: '#cfcfcf', pansy: '#2a2024', hooch: '#9aa3a6', snape: '#1b1b1f', mcgonagall: '#4a4a4f', filch: '#6d6a5e' }
const ROBE: Record<string, string> = { draco: '#1f4a3c', hermione: '#7a1f2b', ron: '#7a1f2b', ginny: '#7a1f2b', luna: '#2a3550', slughorn: '#4a2f55', pansy: '#1f4a3c', snape: '#151518', mcgonagall: '#26402f' }
/** 실루엣의 입 모양은 화면에서 관찰 가능한 표정만 나타낸다(코드는 출력하지 않음) */
const MOUTH: Record<string, string> = {
  calm: 'M128 178 q22 6 44 0', blank: 'M130 180 h40', smirk: 'M128 180 q26 4 44 -8', interest: 'M130 178 q20 10 40 0',
  flustered: 'M135 182 q15 -8 30 0', angry: 'M128 184 q22 -12 44 0', anxious: 'M130 182 q10 -6 20 0 q10 6 20 0',
  sad: 'M130 186 q20 -14 40 0', resolve: 'M128 180 h44', smile: 'M126 176 q24 18 48 0',
}
const SHORT_HAIR = 'M96 168 q-6 -92 54 -96 q60 4 54 96 q-14 -50 -54 -52 q-40 2 -54 52z'
const LONG_HAIR = 'M92 176 q-10 -98 58 -104 q68 6 58 104 l8 120 q-14 -10 -20 -40 q-8 -76 -46 -84 q-38 8 -46 84 q-6 30 -20 40z'
const GAZE_DX: Record<Gaze, number> = { front: 0, side: 6, away: 10, down: 0 }
const GAZE_DY: Record<Gaze, number> = { front: 0, side: 0, away: -1, down: 5 }
const POSE_STYLE: Record<Pose, string> = {
  stand: 'none', arms: 'none', lean: 'rotate(-3deg) translateX(-2%)', turned: 'scaleX(-1) rotate(-2deg)',
  slumped: 'translateY(6%) scale(.96)', guard: 'translateX(-3%) rotate(2deg)',
}

function Silhouette({ char, expr, form, gaze }: { char: string; expr: string; form: Form; gaze: Gaze }) {
  const name = CHAR_KO[char] ?? ''
  const dx = GAZE_DX[gaze], dy = GAZE_DY[gaze]
  return (
    <svg className="char-svg" viewBox="0 0 300 520" role="img" aria-label={name}>
      <path d="M40 520 q10 -190 110 -200 q100 10 110 200z" fill={ROBE[char] ?? '#26303a'} opacity=".92" />
      <rect x="132" y="262" width="36" height="46" rx="10" fill="#cdbba7" />
      <ellipse cx="150" cy="170" rx={form === 'true' ? 48 : 52} ry={form === 'true' ? 60 : 64} fill="#e2d2bf" />
      <path d={form === 'true' ? LONG_HAIR : SHORT_HAIR} fill={HAIR[char] ?? '#555'} />
      <circle cx={130 + dx} cy={164 + dy} r="4" fill="#223" /><circle cx={170 + dx} cy={164 + dy} r="4" fill="#223" />
      <path d={MOUTH[expr] ?? MOUTH.calm} stroke="#6a3b3b" strokeWidth="3" fill="none" strokeLinecap="round" />
      {name && <>
        <rect x="90" y="476" width="120" height="30" rx="6" fill="rgba(0,0,0,.5)" />
        <text x="150" y="497" textAnchor="middle" fontSize="16" fill="#e9dfc8">{name}</text>
      </>}
    </svg>
  )
}

export function Character({ char, expr, form = 'base', pose = 'stand', gaze = 'front' }: { char: string | null; expr: string | null; form?: Form; pose?: Pose; gaze?: Gaze }) {
  useManifestTick()
  const id = char ? charAssetId(char, expr, form) : ''
  const a = char ? getAsset(id) : undefined
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [id, a?.path])
  if (!char) return <div className="sprite" data-testid="sprite" {...dev({ 'data-char': '' })} />
  const real = a?.status === 'final' && a.path && !failed
  return (
    <div className="sprite" data-testid="sprite" style={{ transform: POSE_STYLE[pose] }}
      {...dev({ 'data-char': char, 'data-expr': expr ?? '', 'data-form': form, 'data-pose': pose, 'data-gaze': gaze, 'data-asset': real ? 'final' : 'placeholder' })}>
      {real
        ? <img src={a!.path} alt={CHAR_KO[char] ?? ''} onError={() => setFailed(true)} />
        : <Silhouette char={char} expr={expr ?? 'calm'} form={form} gaze={gaze} />}
    </div>
  )
}

/** 장면 CG. 이미지가 없으면 제목만 있는 프레임으로 대체(진행을 막지 않음). */
export function CgFrame({ id }: { id: string }) {
  useManifestTick()
  const e = CG_BY_ID[id]
  const a = getAsset(`cg.${id}`)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [id, a?.path])
  const real = a?.status === 'final' && a.path && !failed
  return (
    <div className="cg-frame" data-testid="cg" {...dev({ 'data-cg': id })}>
      {real ? <img src={a!.path} alt={e?.title ?? ''} onError={() => setFailed(true)} />
        : <div className="cg-fallback"><span>{e?.title ?? ''}</span></div>}
    </div>
  )
}
