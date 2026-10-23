import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Character } from '../ui/Visual'
import { SCENARIO, START_SCENE } from '../data/scenario'
import { advance, choose, currentNode, newState, run } from '../engine/core'
import { validateSave } from '../engine/save'
import type { GameState, Node, Pose } from '../engine/types'
import './helpers'

/** 거리감·시선·자세 연출(근접/클로즈업/후퇴)과 선택 ID 안전성. 연출은 엔진이 지원하는 pose·gaze·cue·light만 쓴다(이미지 추가 없음). */
afterEach(() => cleanup())
const POSES: Pose[] = ['stand', 'arms', 'turned', 'slumped', 'guard', 'lean', 'near', 'close', 'back', 'tilt']
const NEW_SCENES = Object.keys(SCENARIO).filter((id) => /^(ch2_p_|ch2_eve_|ev2_)/.test(id))
const posesOf = (nodes: Node[]) => nodes.flatMap((n) => (n.t === 'line' || n.t === 'show') && n.pose ? [n.pose] : [])

describe('거리감 연출', () => {
  it('새 장면이 쓰는 자세·시선 값은 모두 엔진이 지원하는 값이다', () => {
    expect(NEW_SCENES.length).toBeGreaterThan(40)
    for (const id of NEW_SCENES) for (const n of SCENARIO[id]) if (n.t === 'line' || n.t === 'show') {
      if (n.pose) expect(POSES, `${id} ${n.pose}`).toContain(n.pose)
      if (n.gaze) expect(['front', 'away', 'down', 'side']).toContain(n.gaze)
    }
  })

  it('친밀 장면은 접근(near/close)과 후퇴(back)가 모두 들어 있고, 히로인마다 연출 구성이 다르다(동일 반복 금지)', () => {
    const sig: Record<string, string> = {}
    for (const h of ['hermione', 'ginny', 'luna', 'pansy', 'draco']) {
      const all = [...SCENARIO[`ch2_eve_i_${h}`], ...Object.entries(SCENARIO).filter(([k]) => k.startsWith(`ch2_eve_i_${h}_`)).flatMap(([, v]) => v)]
      const ps = posesOf(all)
      expect(ps.some((p) => p === 'near' || p === 'close'), `${h} 접근`).toBe(true)
      expect(ps.includes('back'), `${h} 후퇴`).toBe(true)
      sig[h] = [...new Set(ps)].sort().join(',')
    }
    expect(new Set(Object.values(sig)).size).toBeGreaterThanOrEqual(4)
    // 판시: 클로즈업 + 줌 큐(시험하는 접근), 지니: 한 뼘 앞 + 후퇴(장난스럽게 거리를 좁혔다 물러남), 루나: 기울임(예상 밖의 거리감)
    expect(posesOf(SCENARIO.ch2_eve_i_pansy_body)).toContain('close'); expect(SCENARIO.ch2_eve_i_pansy_body.some((n) => n.t === 'cue' && n.effect === 'zoom')).toBe(true)
    expect(posesOf([...SCENARIO.ch2_eve_i_luna, ...SCENARIO.ch2_eve_i_luna_A])).toContain('tilt')
    expect(posesOf(SCENARIO.ch2_eve_i_ginny_A)).toContain('back')
    // 판시의 "시험" 직후에는 정적(pause) 큐가 있다
    expect(SCENARIO.ch2_eve_i_pansy_body.some((n) => n.t === 'cue' && n.effect === 'pause')).toBe(true)
  })

  it('새 자세는 스프라이트에 변환(CSS transform)으로 반영된다: near·close는 확대, back은 축소', () => {
    const tf = (pose: Pose) => { const { container, unmount } = render(<Character char="pansy" expr="calm" pose={pose} />); const v = (container.querySelector('[data-testid="sprite"]') as HTMLElement).style.transform; unmount(); return v }
    expect(tf('near')).toContain('scale(1.1)'); expect(tf('close')).toContain('scale(1.2)'); expect(tf('back')).toContain('scale(.9)'); expect(tf('tilt')).toContain('rotate(4deg)')
    expect(tf('stand')).toBe('none')
  })

  it('움직임 감소 설정에서는 이동 애니메이션이 꺼진다(전환 없음, 최종 위치만 적용)', async () => {
    const fsm = (await import(/* @vite-ignore */ ('node:' + 'fs'))) as { readFileSync: (p: string, e: string) => string }
    const css = fsm.readFileSync('src/styles.css', 'utf8')
    expect(css).toMatch(/\.sprite \{ transition: none; \}/); expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*?\.fx-zoom \.sprite-area[\s\S]*?animation: none/)
  })

  it('연출 도중(자세가 바뀐 직후) 저장→불러오기해도 자세·시선이 복원되고 이어서 진행된다', () => {
    let s = newState(START_SCENE, 2); s.scene = 'ch2_eve_i_pansy'; s.idx = 0; s.chapter = 2; s.mode = 'STORY'; s = run(s)
    for (let i = 0; i < 30 && currentNode(s)?.t === 'line' && s.view.pose !== 'close'; i++) s = advance(s)
    expect(s.view.pose).toBe('close')
    const f = { schemaVersion: 2, savedAt: 'x', label: 'x', story: 'v2', read: [], state: s }
    const back = validateSave(JSON.parse(JSON.stringify(f))).state as GameState
    expect(back.view.pose).toBe('close'); expect(back.view.char).toBe('pansy'); expect(back.scene).toBe('ch2_eve_i_pansy_body')
    let t = back; for (let i = 0; i < 40 && currentNode(t)?.t === 'line'; i++) t = advance(t)
    expect(currentNode(t)?.t).toBe('choice')
  })

  it('선택지는 정적 큐 직후 곧바로 나타나며 큐가 진행을 막지 않는다', () => {
    let s = newState(START_SCENE, 2); s.scene = 'ch2_eve_i_ginny'; s.idx = 0; s.chapter = 2; s.mode = 'STORY'; s = run(s)
    for (let i = 0; i < 30 && currentNode(s)?.t === 'line'; i++) s = advance(s)
    expect(currentNode(s)?.t).toBe('choice')
    s = choose(s, 'C'); expect(s.scene).toBe('ch2_eve_i_ginny_C')
  })
})

describe('선택 ID 안전', () => {
  it('새 장면의 선택 ID는 서로, 그리고 기존 랜덤 이벤트·메인 선택 ID와 충돌하지 않는다', () => {
    const idsOf = (pred: (scene: string) => boolean) => Object.entries(SCENARIO).filter(([k]) => pred(k)).flatMap(([k, v]) => v.filter((n) => n.t === 'choice').map((n) => [(n as { id: string }).id, k] as const))
    const fresh = idsOf((k) => /^(ch2_p_|ch2_eve_|ev2_)/.test(k))
    const old = new Set(idsOf((k) => !/^(ch2_p_|ch2_eve_|ev2_)/.test(k)).map(([id]) => id))
    const seen = new Set<string>()
    for (const [id, scene] of fresh) { expect(old.has(id), `${id}@${scene}`).toBe(false); if (id !== 'L-11' && id !== 'L-15') expect(seen.has(id), `중복 ${id}`).toBe(false); seen.add(id) } // L-15(말포이 E·P 변형 두 장면)도 같다. L-11은 같은 인물의 원인별 세 장면이 같은 ID를 쓴다(K-05처럼)
    expect(fresh.length).toBeGreaterThanOrEqual(16)
  })
})
