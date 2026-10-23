import type { Scenario } from '../engine/types'
import { CH1FREE } from './ch1free'
import { ACTIVITY_SCENES } from './activityScenes'
import { V2C1A } from './v2c1a'
import { V2C1B } from './v2c1b'
import { V2C1C } from './v2c1c'
import { V2C1D } from './v2c1d'
import { V2C1E } from './v2c1e'
import { V2C2P } from './v2c2p'
import { V2C2E } from './v2c2e'
import { V2C2R } from './v2c2r'
import { V2C2X } from './v2c2x'
import { V2C3P } from './v2c3p'
import { V2C3X } from './v2c3x'
import { V2C4X } from './v2c4x'
import { V2C4H } from './v2c4h'
import { V2C1X } from './v2c1x'
import { V2C5X } from './v2c5x'
import { V2C1R } from './v2c1r'
import { CH2A } from './ch2a'
import { CH2B } from './ch2b'
import { CH2C } from './ch2c'
import { CH3A } from './ch3a'
import { CH3B } from './ch3b'
import { CH4A } from './ch4a'
import { CH4B } from './ch4b'
import { CH5A } from './ch5a'
import { CH5B } from './ch5b'
import { CH6A } from './ch6a'
import { CH6B } from './ch6b'
import { CH7A } from './ch7a'
import { CH7B } from './ch7b'
import { CH8A } from './ch8a'
import { CH8B } from './ch8b'
import { EVENT_SCENARIO } from './randomEvents'
import { SYS_SCENARIO } from './scenario_sys'

/**
 * 본편 시나리오. 장면 ID: `chN_*`(메인), `encN_*`(드레이코 만남), `frN_*`(조연 일상).
 * - 현재 플레이 범위: 챕터 1~8 (챕터 N은 endChapter.next 로 다음 챕터에 이어진다. 챕터 8은 종료 카드).
 * - SYS_SCENARIO(c1_*, sys_*, enc_*)는 엔진 회귀 테스트용 픽스처이며 본편에서는 도달하지 않는다.
 */
export const START_SCENE = 'v2c1_prologue'
export const CH1_SCENARIO: Scenario = { ...V2C1A, ...V2C1B, ...V2C1C, ...V2C1D, ...V2C1R, ...V2C1X, ...CH1FREE }
const EV_KEYS = (o: Scenario, yes: boolean) => Object.fromEntries(Object.entries(o).filter(([k]) => /^ev[2345]_/.test(k) === yes))
/** 경로 행사 장면(ev2_*·ev3_*)은 게시판·지도에서만 진입하므로 SCENARIO에만 등록한다(챕터 도달성 감사의 "미도달 장면" 대상 아님) */
export const CH2_SCENARIO: Scenario = { ...CH2A, ...CH2B, ...CH2C, ...V2C2P, ...V2C2R, ...EV_KEYS(V2C2X, false) }
export const CH3_SCENARIO: Scenario = { ...CH3A, ...CH3B, ...EV_KEYS(V2C3P, false) }
export const CH4_SCENARIO: Scenario = { ...CH4A, ...CH4B, ...EV_KEYS(V2C4X, false), ...EV_KEYS(V2C4H, false) }
export const CH5_SCENARIO: Scenario = { ...CH5A, ...CH5B, ...EV_KEYS(V2C5X, false) }
export const CH6_SCENARIO: Scenario = { ...CH6A, ...CH6B }
export const CH7_SCENARIO: Scenario = { ...CH7A, ...CH7B }
export const CH8_SCENARIO: Scenario = { ...CH8A, ...CH8B }
export const SCENARIO: Scenario = { ...SYS_SCENARIO, ...CH1_SCENARIO, ...CH2_SCENARIO, ...CH3_SCENARIO, ...CH4_SCENARIO, ...CH5_SCENARIO, ...CH6_SCENARIO, ...CH7_SCENARIO, ...CH8_SCENARIO, ...EVENT_SCENARIO, ...ACTIVITY_SCENES, ...V2C1E, ...V2C2E, ...EV_KEYS(V2C2X, true), ...EV_KEYS(V2C3P, true), ...EV_KEYS(V2C3X, true), ...EV_KEYS(V2C4X, true), ...EV_KEYS(V2C4H, true), ...EV_KEYS(V2C5X, true) }
