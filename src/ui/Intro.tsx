import { useCallback, useEffect, useRef, useState } from 'react'
import { store } from '../engine/store'

/**
 * 새 게임의 타이포그래피 도입부. 어두운 배경에서 문장을 한 줄씩 타이핑하고, 문장 사이에 짧은 정적을 둔다.
 * 클릭: 타이핑 중이면 현재 문장을 즉시 완성, 완성된 뒤면 다음 문장. 건너뛰기·Esc·S: 전체 스킵. 마지막 문장 뒤 자연스럽게 열차 장면으로 넘어간다.
 * 움직임 감소 설정에서는 타이핑·페이드 없이 문장을 한 번에 보여 주고, 읽을 시간만 길게 둔다. 세계관의 미공개 비밀은 쓰지 않는다.
 */
export const INTRO_LINES = [
  '1996년 9월 1일.',
  '지난여름, 신문의 부고란은 눈에 띄게 길어졌다.',
  '사람들은 어떤 이름을 낮게 부르기 시작했고, 올빼미는 평소보다 늦게 도착했다.',
  '마법 세계는 다시 불안해져 있었다. 다들 그걸 모르는 척했다.',
  '나는 호그와트의 여섯 번째 해로 돌아간다.',
  '해리 포터라는 이름에는 기대와 의심이 함께 붙어 있었고, 올여름 그 무게는 한 뼘 더 늘었다.',
  '킹스크로스역 9와 4분의 3 승강장. 붉은 증기가 아무것도 숨기지 않은 얼굴로 피어오르고 있었다.',
  '올해는 평소와 다를 것 같았다. 이유는 아직 몰랐다.',
  '기적 소리가 울렸다.',
]
const MS_PER_CHAR = 55, HOLD_MS = 1400, GAP_MS = 500, LEAD_MS = 900
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
/** 자동 진행 기준 총 길이(문서·테스트용) */
export const INTRO_TOTAL_MS = LEAD_MS + INTRO_LINES.reduce((a, l) => a + l.length * MS_PER_CHAR + HOLD_MS + GAP_MS, 0)

export function Intro() {
  const rm = reduced()
  const [i, setI] = useState(0)
  const [n, setN] = useState(0) // 보이는 글자 수
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)
  const line = INTRO_LINES[i]
  const complete = n >= line.length

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true; setLeaving(true)
    window.setTimeout(() => store.endIntro(), reduced() ? 0 : 450)
  }, [])
  const next = useCallback(() => {
    if (done.current) return
    if (i >= INTRO_LINES.length - 1) { finish(); return }
    setI(i + 1); setN(reduced() ? INTRO_LINES[i + 1].length : 0)
  }, [i, finish])

  // 타이핑
  useEffect(() => {
    if (done.current) return
    if (rm) { setN(line.length); return }
    if (n >= line.length) return
    const id = window.setTimeout(() => setN((x) => x + 1), n === 0 && i === 0 ? LEAD_MS : MS_PER_CHAR)
    return () => window.clearTimeout(id)
  }, [n, i, line, rm])
  // 완성 뒤 자동으로 다음 문장(정적)
  useEffect(() => {
    if (!complete || done.current) return
    const id = window.setTimeout(next, (rm ? HOLD_MS * 2 : HOLD_MS) + GAP_MS)
    return () => window.clearTimeout(id)
  }, [complete, next, rm, i])

  const click = () => { if (done.current) return; if (!complete) setN(line.length); else next() }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 's' || e.key === 'S') { e.preventDefault(); finish() }
      else if (e.key === 'Enter' || e.key === ' ') { if ((e.target as HTMLElement)?.tagName === 'BUTTON') return; e.preventDefault(); click() }
    }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  })

  return (
    <main className={`intro${leaving ? ' leaving' : ''}`} data-testid="intro" onClick={click} aria-label="도입부">
      <p className="intro-line" data-testid="intro-line" aria-live="polite" key={i}>{line.slice(0, n)}<span className="intro-caret" aria-hidden>{complete ? '' : '▌'}</span></p>
      <button type="button" className="btn ghost intro-skip" data-testid="intro-skip" onClick={(e) => { e.stopPropagation(); finish() }}>건너뛰기</button>
    </main>
  )
}
