# Data Contracts
Status: DRAFT / NOT APPROVED
신규 엔진 API·이벤트·저장 계약은 미확정.
현재 src/shared/presentation.ts는 UI 분리 검증용 표현 인터페이스다.
공유 타입 변경은 영향 분석과 사용자 승인 후 수행한다.
구형 schemaVersion 2와 저장 키는 그대로 보존하며 신규 저장 구조에 재사용하지 않는다.

## Phase 3 검토 대상
[의미적 비주얼 요청](../art/CHARACTER-VISUAL-SYSTEM.md)과 [자산 매니페스트](../art/ASSET-MANIFEST-SPEC.md)는 개념 필드 제안이다.
현재 src/shared/presentation.ts를 교체하지 않는다. expression/appearance/outfit/gaze/target의 이름·필수 여부·호환성은 별도 승인 후 확정.
