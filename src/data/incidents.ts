/**
 * 돌발 사건(세계 사건) 정의. 장면은 incidentScenes.ts. 선언형: 어디서·무슨 활동 뒤에·며칠에·얼마나 자주(chance)·어떤 조건에서.
 * - 한 번만 일어나며(rev.seen), 필수 진행 조건이 되지 않는다(놓쳐도 챕터는 끝까지 진행된다).
 * - 확률은 저장 상태에서 결정적으로 정해진다(core.incidentFor): 같은 날짜·시간대·장소는 다시 불러와도 같은 결과.
 */
export interface Incident { id: string; places: string[]; acts?: string[]; dates: string[]; slots?: number[]; chance: number; cond?: string }

export const INCIDENTS: Incident[] = [
  { id: 'inc_crack_corridor', places: ['library'], acts: ['study', 'research', 'deep_study'], dates: ['09-04', '09-05', '09-06'], slots: [0, 1], chance: 0.5 },
  { id: 'inc_crack_followup', places: ['library', 'classroom4', 'common'], dates: ['09-05', '09-06'], chance: 0.7, cond: '(FLAG_CRACK_LOOKED || FLAG_CRACK_HELPED) && !FLAG_CRACK_REPORTED' },
]
