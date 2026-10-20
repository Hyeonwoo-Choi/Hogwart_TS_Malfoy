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

export function resolveVar(s: GameState, id: string): number {
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
