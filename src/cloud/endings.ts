import { rawGet, rawPut } from '../engine/save'
import { isEndingId, type EndingId } from './versions'

/** 엔딩 해금 기록: 저장 슬롯과 별개로 영구 보존, 삭제 API 없음(서버도 INSERT·SELECT만 허용). */
export interface EndingRecord { ids: EndingId[]; at: Record<string, string> }

export function loadEndings(): EndingRecord {
  try {
    const r = JSON.parse(rawGet('endings') ?? '{}') as Partial<EndingRecord>
    const ids = (Array.isArray(r.ids) ? r.ids : []).filter((x): x is EndingId => typeof x === 'string' && isEndingId(x))
    return { ids: [...new Set(ids)], at: r.at ?? {} }
  } catch { return { ids: [], at: {} } }
}
/** 허용되지 않은 ID는 기록하지 않는다(서버 CHECK 제약과 동일). 새로 기록되면 true. */
export function recordEnding(id: string): boolean {
  if (!isEndingId(id)) return false
  const r = loadEndings()
  if (r.ids.includes(id)) return false
  r.ids.push(id); r.at[id] = new Date().toISOString()
  rawPut('endings', JSON.stringify(r))
  return true
}
/** 서버에서 받은 ID를 로컬에 합친다(허용 목록 밖 ID는 무시). 추가된 개수를 반환. */
export function mergeEndings(ids: string[]): number {
  let n = 0
  for (const id of ids) if (isEndingId(id) && recordEnding(id)) n++
  return n
}
