import { presentAt } from './presence'
import { REACTION_CODE, reactionOf } from './reactions'
import type { GameState } from './types'

/** 시드 기반 난수(저장/복원 시에도 결정적). state.rng를 갱신한다. */
export function nextRandom(s: GameState): number {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0
  let t = s.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

type Tok = { k: 'num' | 'id' | 'op' | 'lp' | 'rp'; v: string }
const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_.]*)|(>=|<=|==|!=|&&|\|\||[<>!])|(\()|(\)))/y

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  let pos = 0
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break
    TOKEN.lastIndex = pos
    m = TOKEN.exec(src)
    if (!m) throw new Error(`조건식 해석 오류: "${src}" @${pos}`)
    pos = TOKEN.lastIndex
    if (m[1] !== undefined) out.push({ k: 'num', v: m[1] })
    else if (m[2] !== undefined) out.push({ k: 'id', v: m[2] })
    else if (m[3] !== undefined) out.push({ k: 'op', v: m[3] })
    else if (m[4] !== undefined) out.push({ k: 'lp', v: '(' })
    else out.push({ k: 'rp', v: ')' })
  }
  return out
}

/** 'MM-DD' → 학년 내 일 번호(대략 31일/월, 9월 시작). 최근 만남 기간 비교에만 쓴다 */
export function dayIndex(date: string): number {
  const [m, d] = date.split('-').map(Number)
  return (m >= 9 ? m - 9 : m + 3) * 31 + d
}
const ROMANCE_CODE: Record<string, number> = { none: 0, open: 1, together: 2, declined: 3, ended: 4 }
const POLY_CODE: Record<string, number> = { unasked: 0, asked: 1, accepted: 2, declined: 3 }

export function resolveVar(s: GameState, id: string): number {
  // 관계 모델(V2): stage.<id> · romance.<id>(0 none 1 open 2 together 3 declined 4 ended) · poly.<id>(0 unasked 1 asked 2 accepted 3 declined) · partners(연인 수)
  let rm: RegExpMatchArray | null
  if ((rm = id.match(/^(stage|romance|poly)\.([a-z]+)$/))) {
    const b = s.bonds?.[rm[2]]
    if (!b) return 0
    return rm[1] === 'stage' ? b.stage : rm[1] === 'romance' ? ROMANCE_CODE[b.romance] ?? 0 : POLY_CODE[b.poly] ?? 0
  }
  // 지식 단계: know.<id> = 0~4 (변신·환영에 대한 인지, 이전 저장에는 필드가 없으므로 0)
  if ((rm = id.match(/^know\.([a-z]+)$/))) return s.bonds?.[rm[1]]?.know ?? 0
  // 히로인 반응: REACT_<observer>_<subject> = 최근 3일 안에 observer가 해리와 subject의 만남을 목격했을 때의 반응 종류(reactions.ts)
  if ((rm = id.match(/^REACT_([a-z]+)_([a-z]+)$/))) return REACTION_CODE[reactionOf(s, rm[1], rm[2])]
  // 만난 횟수: seen.<id> (장면 효과 meet:로 기록된 횟수)
  if ((rm = id.match(/^seen\.([a-z]+)$/))) return s.bonds?.[rm[1]]?.seen ?? 0
  // 자유 일과 활동 장면의 장소 변형: AT_<장소> = 방금 활동한 장소
  if ((rm = id.match(/^AT_([a-z0-9]+)$/))) return s.routine?.at === rm[1] ? 1 : 0
  // 방금 활동한 자리에 일정표상 그 히로인이 있었는가: HERE_<id> / 행사 참가 여부: EV_<행사id>
  if ((rm = id.match(/^HERE_([a-z]+)$/))) { const r = s.routine; return r?.at && r.span && presentAt(r, r.at, r.span[0], r.span[1]).includes(rm[1]) ? 1 : 0 }
  if ((rm = id.match(/^EV_([a-z0-9_]+)$/))) return s.board?.done[rm[1]] ? 1 : 0
  if (id === 'chapter') return s.chapter
  if (id === 'partners') return Object.values(s.bonds ?? {}).filter((b) => b.romance === 'together').length
  // 해리의 행동을 누가 어떻게 알았는가: DEED_<id>(있었다) · WIT_<id>_<who>(직접 봤다) · HEARD_<id>_<who>(전해 들었다) · KNOWS_<id>_<who>(어느 쪽이든) · EXAG_<id>_<who>(과장된 전언)
  if ((rm = id.match(/^DEED_([a-z0-9_]+)$/))) return s.deeds?.[rm[1]] ? 1 : 0
  if ((rm = id.match(/^(WIT|HEARD|KNOWS|EXAG)_([a-z0-9_]+)_(hermione|ginny|luna|pansy|draco|ron|hooch|pince|mcgonagall|snape)$/))) {
    const d = s.deeds?.[rm[2]]; if (!d) return 0
    const saw = d.saw.includes(rm[3]); const h = d.heard[rm[3]]
    return rm[1] === 'WIT' ? (saw ? 1 : 0) : rm[1] === 'HEARD' ? (h ? 1 : 0) : rm[1] === 'EXAG' ? (h?.exag ? 1 : 0) : (saw || h ? 1 : 0)
  }
  // 최근 만남: MET_<who>_<N> = 최근 N일 안에 who를 만났다 / SAW_<observer>_<who>_<N> = 그때 observer가 같은 자리에 있었다
  if ((rm = id.match(/^MET_([a-z]+)_(\d+)$/))) { const today = dayIndex(s.calendar.date); return (s.recent ?? []).some((m) => m.who === rm![1] && today - m.day <= Number(rm![2])) ? 1 : 0 }
  if ((rm = id.match(/^SAW_([a-z]+)_([a-z]+)_(\d+)$/))) { const today = dayIndex(s.calendar.date); return (s.recent ?? []).some((m) => m.who === rm![2] && m.witnesses.includes(rm![1]) && today - m.day <= Number(rm![3])) ? 1 : 0 }
  /** 선택 이력: CH_K12_B = 'K-12'에서 B를 골랐다(저장된 choices 기록으로 판별하므로 과거 저장에도 적용된다) */
  const ch = id.match(/^CH_([A-Z])(\d+)_([A-Z])$/)
  if (ch) return s.choices.some((c) => c.id === `${ch[1]}-${ch[2].padStart(2, '0')}` && c.option === ch[3]) ? 1 : 0
  if (/^(FLAG|KN|OB)_/.test(id)) return s.flags[id] || s.knowledge[id] ? 1 : 0
  const [head, key] = id.split('.')
  if (head === 'stat') {
    const v = (s.stats as unknown as Record<string, number>)[key]
    if (v === undefined) throw new Error(`알 수 없는 능력치: ${id}`)
    return v
  }
  const emo = (s.emotions as unknown as Record<string, Record<string, number>>)[head]
  if (emo && emo[key] !== undefined) return emo[key]
  throw new Error(`알 수 없는 변수: ${id}`)
}

/** 조건식 평가. 지원: 비교, &&, ||, !, 괄호, roll(N)=N% 확률(시드 기반). 오타는 예외로 드러낸다. */
export function evalCond(s: GameState, src: string): boolean {
  const toks = tokenize(src)
  let i = 0
  const peek = () => toks[i]
  const isOp = (v: string) => peek()?.k === 'op' && peek().v === v

  function atom(): number {
    const t = toks[i++]
    if (!t) throw new Error(`조건식이 끝났습니다: "${src}"`)
    if (t.k === 'num') return Number(t.v)
    if (t.k === 'lp') { const v = or(); i++; return v }
    if (t.k === 'id') {
      if (t.v === 'roll' && peek()?.k === 'lp') {
        i++; const n = toks[i++]; i++
        return nextRandom(s) * 100 < Number(n.v) ? 1 : 0
      }
      return resolveVar(s, t.v)
    }
    throw new Error(`조건식 해석 오류: "${src}"`)
  }
  function not(): number { if (isOp('!')) { i++; return not() ? 0 : 1 } return cmp() }
  function cmp(): number {
    const a = atom()
    const t = peek()
    if (t?.k === 'op' && ['>=', '<=', '==', '!=', '<', '>'].includes(t.v)) {
      i++; const b = atom()
      switch (t.v) {
        case '>=': return a >= b ? 1 : 0
        case '<=': return a <= b ? 1 : 0
        case '==': return a === b ? 1 : 0
        case '!=': return a !== b ? 1 : 0
        case '<': return a < b ? 1 : 0
        default: return a > b ? 1 : 0
      }
    }
    return a
  }
  function and(): number { let v = not(); while (isOp('&&')) { i++; const r = not(); v = v && r ? 1 : 0 } return v }
  function or(): number { let v = and(); while (isOp('||')) { i++; const r = and(); v = v || r ? 1 : 0 } return v }
  const r = or()
  if (i < toks.length) throw new Error(`조건식 해석 오류(남은 토큰): "${src}"`)
  return !!r
}
