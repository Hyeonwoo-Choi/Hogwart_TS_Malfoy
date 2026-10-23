import { SCHEMA_VERSION } from '../engine/types'

/**
 * 저장 호환 정책 (docs/CLOUD_SETUP.md):
 * - schema_version: GameState 구조 버전(현재 2). 다르면 불러오지 않는다(원본은 삭제하지 않음).
 * - scenario_version: 시나리오(이야기) 세트 버전. 챕터가 늘어도 이전 저장이 이어질 수 있으면 목록에 유지한다.
 *   예) 챕터 3~4 재작업 후 'ch1-4.v1'을 추가하고 'ch1-2.v1'은 호환 목록에 남긴다.
 *
 * V2(다중 히로인 개편): 현재 'v2.ch1.v1'. 이전 이야기 계열(ch1-*)의 행도 목록에 둔다 — 챕터 2 이상은 관계 기본값으로 변환해 이어하고,
 * 챕터 1 행은 장면 구조가 달라 불러오기에서 "열 수 없음"으로 판정된다(서버 데이터는 건드리지 않는다). 상세: docs/V2_COMPAT.md
 */
export const SCENARIO_VERSION = 'v2.ch1.v1'
export const COMPATIBLE_SCENARIO_VERSIONS: readonly string[] = ['ch1-2.v1', 'ch1-4.v1', 'ch1-6.v1', 'ch1-7.v1', 'ch1-8.v1', 'v2.ch1.v1']
export const CLOUD_SCHEMA_VERSION = SCHEMA_VERSION

/** 엔딩 ID: DB의 ending_unlocks CHECK 제약과 BRANCH_MAP 7장과 동일해야 한다(테스트가 비교). */
export const ALLOWED_ENDINGS = ['E-A1', 'E-A2', 'E-A3', 'E-B1', 'E-B2', 'E-C1', 'E-C2', 'E-D1', 'E-D2', 'E-E1', 'E-E2', 'E-F1', 'E-F2'] as const
export type EndingId = (typeof ALLOWED_ENDINGS)[number]
export const isEndingId = (x: string): x is EndingId => (ALLOWED_ENDINGS as readonly string[]).includes(x)
