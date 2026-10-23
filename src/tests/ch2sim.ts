import { advance, choose, continueChapter, currentNode, listActions, newState, pickActivity, run, visibleOptions } from '../engine/core'
import { START_SCENE } from '../data/scenario'
import { chooseAction } from './helpers'
import type { GameState } from '../engine/types'

/** 챕터 1~2 플레이 스타일 시뮬레이션 공용 로직(고정 시드). 테스트 파일들이 같이 쓴다. */
export interface Style { h08: string | null; best?: number; worst?: boolean; attend: number; rotate?: boolean; deep?: boolean; bold?: boolean; ch4?: 'G' | 'L' | 'W' | 'H' | 'P'; /** 챕터 5 일요일 오후2 사건: H 인계 기록 · G 팀의 결정 · R 소문의 출처 · W 모두 건너뜀 */ ch5?: 'H' | 'G' | 'R' | 'W'; /** 일과에서 능력치를 키우는 방향(자유 활동 정책). 설정하면 행사가 아닌 칸은 그 능력치 성장이 큰 활동을 고른다 */ statPolicy?: 'study' | 'train' | 'quidditch' | 'talk' | 'rest'; /** 선택 ID별로 선호하는 키(노출된 경우에만 고른다) */ pick4?: Record<string, string> }
export const STYLES2: Record<string, Style> = {
  draco: { h08: 'E', best: 0.7, attend: 0.9 },
  hermione: { h08: 'A', best: 0.7, attend: 0.9 },
  ginny: { h08: 'B', best: 0.7, attend: 0.9 },
  luna: { h08: 'C', best: 0.7, attend: 0.9 },
  pansy: { h08: 'D', best: 0.7, attend: 0.9 },
  none: { h08: 'F', attend: 0.1 },
  conflict: { h08: null, worst: true, attend: 0.7, rotate: true },
  multi: { h08: null, best: 0.8, attend: 1, rotate: true },
  /** 한 사람에게 깊이 들어가는 플레이: 모든 약속·행사에 참가하고 동의를 묻는 선택(친밀 장면의 허락·밤)을 고른다 */
  deep: { h08: 'D', best: 1, attend: 1, deep: true },
  /** 과감한 플레이: 약속을 어기거나 말포이와 정면으로 부딪힌다 */
  bold: { h08: 'D', best: 0.5, attend: 0.8, bold: true },
}
/** 챕터 4 관심 사건 스타일: G 지니의 주전 재심 · L 루나의 서쪽 계단 · W 기존 7층 벽(두 사건을 모두 건너뛴다). 챕터 1~3은 같은 기본 플레이 */
export const STYLES4: Record<string, Style> = {
  G: { h08: 'B', best: 0.7, attend: 0.9, ch4: 'G' },
  L: { h08: 'C', best: 0.7, attend: 0.9, ch4: 'L' },
  W: { h08: 'E', best: 0.7, attend: 0.9, ch4: 'W' },
  H: { h08: 'A', best: 0.7, attend: 0.5, ch4: 'H', statPolicy: 'study', pick4: { 'C4-08': 'A', 'C4-09': 'B' } },
  P: { h08: 'D', best: 0.7, attend: 0.5, ch4: 'P', statPolicy: 'talk', pick4: { 'C4-10': 'A' } },
  /** 능력별 해금 선택(능력치는 챕터 1부터 일과로 키운다): 통찰·의지·마법·사교와 능력이 부족한 일반 우회 */
  HI: { h08: 'A', best: 0.7, attend: 0.5, ch4: 'H', statPolicy: 'study', pick4: { 'C4-08': 'B' } },
  HC: { h08: 'A', best: 0.7, attend: 0.5, ch4: 'H', statPolicy: 'talk', pick4: { 'C4-08': 'C' } },
  HD: { h08: 'A', best: 0.7, attend: 0.5, ch4: 'H', pick4: { 'C4-08': 'D' } },
  PI: { h08: 'D', best: 0.7, attend: 0.5, ch4: 'P', statPolicy: 'talk', pick4: { 'C4-10': 'B' } },
  PW: { h08: 'D', best: 0.7, attend: 0.5, ch4: 'P', statPolicy: 'rest', pick4: { 'C4-10': 'C' } },
  PD: { h08: 'D', best: 0.7, attend: 0.5, ch4: 'P', pick4: { 'C4-10': 'D' } },
  GM: { h08: 'B', best: 0.7, attend: 0.5, ch4: 'G', statPolicy: 'train', pick4: { 'C4-01': 'D' } },
  LI: { h08: 'C', best: 0.7, attend: 0.5, ch4: 'L', statPolicy: 'talk', pick4: { 'C4-03': 'D' } },
  /** 챕터 5: 챕터 4 행동을 이어 받는 스타일(능력치는 챕터 1부터 일과로 키운다). K-10은 드레이코와 직접 만나지 않는 B로 고정하고 C5-01은 B(병동 앞에 가지 않음) */
  H5A: { h08: 'A', best: 0.7, attend: 0.5, ch4: 'H', ch5: 'H', statPolicy: 'study', pick4: { 'C4-08': 'A', 'C5-02': 'A', 'C5-03': 'A', 'C5-01': 'B', 'K-10': 'B' } },
  H5B: { h08: 'A', best: 0.7, attend: 0.5, ch4: 'H', ch5: 'H', statPolicy: 'study', pick4: { 'C4-08': 'B', 'C5-02': 'B', 'C5-03': 'B', 'C5-01': 'B', 'K-10': 'B' } },
  H5C: { h08: 'A', best: 0.7, attend: 0.5, ch4: 'H', ch5: 'H', statPolicy: 'talk', pick4: { 'C4-08': 'C', 'C5-02': 'C', 'C5-03': 'A', 'C5-01': 'B', 'K-10': 'B' } },
  H5D: { h08: 'A', best: 0.7, attend: 0.5, ch4: 'H', ch5: 'H', pick4: { 'C4-08': 'D', 'C5-02': 'D', 'C5-03': 'C', 'C5-01': 'B', 'K-10': 'D' } },
  G5A: { h08: 'B', best: 0.7, attend: 0.5, ch4: 'G', ch5: 'G', statPolicy: 'train', pick4: { 'C4-01': 'D', 'C5-04': 'A', 'C5-01': 'B', 'K-10': 'B' } },
  G5B: { h08: 'B', best: 0.7, attend: 0.5, ch4: 'G', ch5: 'G', statPolicy: 'quidditch', pick4: { 'C5-04': 'B', 'C5-01': 'B', 'K-10': 'B' } },
  G5C: { h08: 'B', best: 0.7, attend: 0.5, ch4: 'G', ch5: 'G', statPolicy: 'talk', pick4: { 'C5-04': 'C', 'C5-01': 'B', 'K-10': 'D' } },
  G5D: { h08: 'B', best: 0.7, attend: 0.5, ch4: 'G', ch5: 'G', pick4: { 'C5-04': 'D', 'C5-01': 'B', 'K-10': 'B' } },
  R5A: { h08: 'D', best: 0.7, attend: 0.5, ch4: 'P', ch5: 'R', statPolicy: 'study', pick4: { 'C4-10': 'B', 'C5-05': 'A', 'C5-01': 'B', 'K-10': 'B' } },
  R5B: { h08: 'D', best: 0.7, attend: 0.5, ch4: 'P', ch5: 'R', statPolicy: 'talk', pick4: { 'C4-10': 'A', 'C5-05': 'B', 'C5-01': 'B', 'K-10': 'B' } },
  R5C: { h08: 'D', best: 0.7, attend: 0.5, ch4: 'P', ch5: 'R', statPolicy: 'study', pick4: { 'C4-10': 'B', 'C5-05': 'C', 'C5-01': 'B', 'K-10': 'D' } },
  R5D: { h08: 'D', best: 0.7, attend: 0.5, ch4: 'P', ch5: 'R', pick4: { 'C5-05': 'D', 'C5-01': 'B', 'K-10': 'B' } },
  W5: { h08: 'E', best: 0.7, attend: 0.5, ch4: 'G', ch5: 'W', pick4: { 'C5-01': 'A', 'K-10': 'C' } },
}
const DEEP: Record<string, string> = { 'L-01': 'A', 'L-02': 'A', 'L-03': 'A', 'L-04': 'B', 'L-21': 'A' }
/** 관계 갈등이 많은 플레이: 경로 시작 사건에서 관계를 해치는 선택을 고르고, 갈등 장면에서는 거리를 두는 선택을 한다 */
const CONFLICT: Record<string, string> = { 'Q-01': 'B', 'Q-02': 'B', 'Q-03': 'C', 'Q-04': 'C' }
export const BEST_C1: Record<string, string> = { 'E-08': 'A', 'E-09': 'A', 'E-10': 'A', 'E-11': 'A', 'E-12': 'A' }

export interface Out { s: GameState; scenes: Set<string>; snaps: Record<string, GameState>; ended: boolean; dates: string[] }

/** through: 이 챕터까지 이어서 플레이한다(기본 2). 챕터 종료 카드는 자연 엔진 호출(continueChapter)로 넘긴다. dates는 장면 진행 중 달력 날짜의 변화 기록 */
export function simulate2(style: string, seed: number, stopAt = 'ch2_end', through = 2): Out {
  const def = STYLES2[style] ?? STYLES4[style]
  let rnd = seed * 104729 + style.length * 31 + 7
  const r = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff }
  let s = run(newState(START_SCENE, seed)); const scenes = new Set<string>(); const snaps: Record<string, GameState> = {}
  let ended = false; const dates: string[] = []
  for (let step = 0; step < 20000; step++) {
    if (dates[dates.length - 1] !== s.calendar.date) dates.push(s.calendar.date)
    if (s.mode === 'ENDED') { if (s.chapter < through) { s = continueChapter(s); continue } ended = true; break }
    if (!scenes.has(s.scene)) { scenes.add(s.scene); snaps[s.scene] = JSON.parse(JSON.stringify(s)) }
    if (s.scene === stopAt && stopAt !== 'ch2_end') break
    const n = currentNode(s)
    if (s.mode === 'ROUTINE') {
      const all: [string, string][] = []; const longAct = new Set<string>()
      for (const loc of s.routine!.locations) for (const a of listActions(s, loc)) if (a.ok) { all.push([loc, a.actId]); if (a.dur > 1) longAct.add(`${loc}|${a.actId}`) }
      const evs = all.filter(([, a]) => a.startsWith('ev:'))
      const focus4 = ({ G: 'ev:ap4_g_trial', L: 'ev:ap4_l_stair', H: 'ev:ap4_h_ledger', P: 'ev:ap4_p_deal' } as Record<string, string>)[def.ch4 ?? ''] ?? ''
      const focus5 = ({ H: 'ev:ap5_h_chain', G: 'ev:ap5_g_team', R: 'ev:ap5_r_rumor' } as Record<string, string>)[def.ch5 ?? ''] ?? ''
      const focus = s.chapter >= 5 && def.ch5 ? focus5 : focus4
      const avoidLong = (!!def.ch4 && s.chapter === 4 && s.calendar.date >= '11-05') || (!!def.ch5 && s.chapter === 5 && s.calendar.date === '11-17')
      const mine = evs.filter(([, a]) => /^ev:(ap|pl)/.test(a) && (!def.ch4 || !/ap4_/.test(a)) && (!def.ch5 || !/ap5_/.test(a)))
      const pub = evs.filter(([, a]) => /^ev:ev_/.test(a))
      let pick: [string, string]
      const want = focus ? all.find(([, a]) => a === focus) : undefined
      if (want) pick = want
      else if (mine.length && r() < def.attend) pick = mine[Math.floor(r() * mine.length)]
      else if (pub.length && r() < 0.5) pick = pub[Math.floor(r() * pub.length)]
      else if (def.statPolicy && !chooseAction(s, def.statPolicy, r, step)[1].startsWith('ev:') && !(avoidLong && (() => { const c = chooseAction(s, def.statPolicy!, r, step); return longAct.has(`${c[0]}|${c[1]}`) })())) pick = chooseAction(s, def.statPolicy, r, step)
      else { const normal = all.filter(([l, a]) => !a.startsWith('ev:') && !(avoidLong && longAct.has(`${l}|${a}`))); pick = normal[Math.floor(r() * normal.length)] }
      s = pickActivity(s, pick[0], pick[1])
    } else if (n?.t === 'line') s = advance(s)
    else if (n?.t === 'choice') {
      const v = visibleOptions(s, n, true)
      let key: string | undefined
      if (n.id === 'H-01' && style !== 'multi' && style !== 'conflict') key = 'C' // 이력 기반 후속(H-08 B)을 피해 스타일 경로를 고정
      else if (n.id === 'H-08') key = def.rotate ? 'ABCDE'[seed % 5] : def.h08 ?? v[Math.floor(r() * v.length)].key
      else if (def.deep && DEEP[n.id]) key = DEEP[n.id]
      else if (def.bold && n.id === 'Q-04') key = seed % 2 ? 'B' : 'C'
      else if (def.bold && (n.id === 'L-14' || n.id === 'L-15')) key = 'D'
      else if (def.worst && CONFLICT[n.id]) key = CONFLICT[n.id]
      else if (def.worst && /^L-/.test(n.id)) key = v[v.length - 1].key
      else if (BEST_C1[n.id] && r() < (def.best ?? 0.5)) key = BEST_C1[n.id]
      else if (/^(Q|L)-/.test(n.id) && r() < (def.best ?? 0.5)) key = v[0].key
      if (def.pick4?.[n.id] && v.some((x) => x.key === def.pick4![n.id])) key = def.pick4[n.id]
      s = choose(s, (v.find((x) => x.key === key) ?? v[Math.floor(r() * v.length)]).key)
    } else if (n?.t === 'endChapter') { if (s.chapter < through) { s = continueChapter(s); continue } ended = true; break }
    else throw new Error(`예상치 못한 노드 ${s.scene}:${n?.t}`)
  }
  return { s, scenes, snaps, ended, dates }
}
