/**
 * 실행 모드.
 *  - ?qa       : QA 격리 모드. 모든 브라우저 저장 키가 'hfd-qa:'로 분리되어 실제 사용자 저장(hfd:)을 건드리지 않는다.
 *  - ?debug=1  : 감정·플래그 디버그 오버레이.
 * 내부 연출 속성(data-expr 등)은 QA/디버그/테스트에서만 DOM에 노출한다.
 */
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
export const QA_MODE = params.has('qa')
export const DEBUG_MODE = params.get('debug') === '1'
export const STORAGE_PREFIX = QA_MODE ? 'hfd-qa:' : 'hfd:'

export const IS_TEST = (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test'
let devAttrsOverride: boolean | null = null
/** 내부 상태를 DOM 속성으로 노출해도 되는가(일반 플레이어 화면에서는 false) */
export function devAttrs(): boolean { return devAttrsOverride ?? (QA_MODE || DEBUG_MODE || IS_TEST) }
/** 테스트에서 일반 플레이어 화면을 재현할 때 사용 */
export function setDevAttrs(v: boolean | null) { devAttrsOverride = v }
