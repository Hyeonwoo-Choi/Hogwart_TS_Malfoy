import type { Scenario } from '../engine/types'
import { CH1A } from './ch1a'
import { CH1B } from './ch1b'
import { CH1C } from './ch1c'
import { CH1D } from './ch1d'
import { CH2A } from './ch2a'
import { CH2B } from './ch2b'
import { CH2C } from './ch2c'
import { CH3A } from './ch3a'
import { CH3B } from './ch3b'
import { CH4A } from './ch4a'
import { CH4B } from './ch4b'
import { SYS_SCENARIO } from './scenario_sys'

/**
 * 본편 시나리오. 장면 ID: `chN_*`(메인), `encN_*`(드레이코 만남), `frN_*`(조연 일상).
 * - 현재 플레이 범위: 챕터 1~2 (새 설정: 챕터 2 말미 변화 사건). 챕터 2는 endChapter로 끝난다.
 * - CH3/CH4는 구 설정(선천적 여성) 기반이라 본편에 연결하지 않는다. 다음 회차에서 재작업 후 다시 병합한다.
 * - SYS_SCENARIO(c1_*, sys_*, enc_*)는 엔진 회귀 테스트용 픽스처이며 본편에서는 도달하지 않는다.
 */
export const START_SCENE = 'ch1_prologue'
export const CH1_SCENARIO: Scenario = { ...CH1A, ...CH1B, ...CH1C, ...CH1D }
export const CH2_SCENARIO: Scenario = { ...CH2A, ...CH2B, ...CH2C }
/** 구 설정 원고(미연결). 재작업 대상 — docs/DEV_PROGRESS.md "챕터 3~4 충돌 목록" 참고 */
export const LEGACY_CH3_SCENARIO: Scenario = { ...CH3A, ...CH3B }
export const LEGACY_CH4_SCENARIO: Scenario = { ...CH4A, ...CH4B }
export const SCENARIO: Scenario = { ...SYS_SCENARIO, ...CH1_SCENARIO, ...CH2_SCENARIO }
