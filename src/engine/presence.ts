import { HEROINE_ORDER, HEROINE_SCHEDULE } from '../data/constants'

const PER_DAY = 3
/** 활동 구간(t0부터 dur칸) 중 한 번이라도 loc에 일정이 있는 히로인 목록(일정표가 유일한 원천) */
export function presentAt(r: { days: { weekday: string }[] }, loc: string, t0: number, dur: number): string[] {
  const out = new Set<string>()
  for (let t = t0; t < t0 + dur; t++) {
    const wd = r.days[Math.floor(t / PER_DAY)]?.weekday
    for (const h of HEROINE_ORDER) if (HEROINE_SCHEDULE[h]?.[wd]?.[t % PER_DAY] === loc) out.add(h)
  }
  return [...out]
}
