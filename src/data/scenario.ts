import type { Scenario } from '../engine/types'
import { CH1A } from './ch1a'
import { CH1B } from './ch1b'
import { CH1C } from './ch1c'
import { CH1D } from './ch1d'
import { CH2A } from './ch2a'
import { CH2B } from './ch2b'
import { CH3A } from './ch3a'
import { CH3B } from './ch3b'
import { CH4A } from './ch4a'
import { CH4B } from './ch4b'
import { SYS_SCENARIO } from './scenario_sys'

/**
 * PHASE 3 챕터 1 본편. 장면 ID는 `ch1_*`(메인), `enc1_*`(드레이코 만남), `fr1_*`(조연 일상).
 * SYS_SCENARIO(c1_*, sys_*, enc_*)는 엔진 회귀 테스트용 픽스처이며 본편에서는 도달하지 않는다.
 */
export const START_SCENE = 'ch1_prologue'
export const CH1_SCENARIO: Scenario = { ...CH1A, ...CH1B, ...CH1C, ...CH1D }
export const CH2_SCENARIO: Scenario = { ...CH2A, ...CH2B }
export const CH3_SCENARIO: Scenario = { ...CH3A, ...CH3B }
export const CH4_SCENARIO: Scenario = { ...CH4A, ...CH4B }
export const SCENARIO: Scenario = { ...SYS_SCENARIO, ...CH1_SCENARIO, ...CH2_SCENARIO, ...CH3_SCENARIO, ...CH4_SCENARIO }
