# Character Visual System
Status: DRAFT / NOT APPROVED
문서 제안이며 타입·JSON 스키마·Resolver·자동화 구현 승인이 아니다.

## 분리할 축
| 축 | 역할 | 배제할 의미 |
|---|---|---|
| Character Identity | 인물의 안정적 식별 | 호감도·역할 순위 |
| Appearance | 지속적 외형 버전 | 표정·일시 포즈 |
| Outfit | 승인된 의상 버전 | 자동 관계 보상 |
| Emotion/Expression | 화면에 보이는 표정 | NPC의 실제 내적 감정 |
| Pose | 신체 자세·행동의 정지 표현 | 카메라 줌 |
| Gaze | 눈 방향·시선 대상 | 내면의 관심 수치 |
| Presentation | 위치·크기·반전·불투명도·등퇴장 | 자산 고유 정체성 |

## 제안 흐름
Story Outline → Narrative Scenario → Presentation Script → Visual Resolver → Registry → Renderer.
각 연결은 승인 대기. Narrative Scenario의 실행 스키마와 World State를 여기서 정의하지 않는다.
스토리 작성자는 파일 경로/숫자 자산 ID 대신 의미 요청을 쓴다.
관찰된 angry 표정과 NPC의 hidden anger는 별개다. 속으로 화나도 happy 표정을 연기할 수 있다.

## 해석 규칙 초안
1. 공개 가능한 외형을 표현 요청 경계에서 검증한다. Renderer가 관계 수치로 결정하지 않는다.
2. character/appearance/outfit와 승인 상태를 먼저 한정한다.
3. 정확한 pose/expression/gaze 후보를 찾는다. 품질·버전 타이브레이크 규칙은 승인 후 결정.
4. 대상 gaze는 장면 배치로 투영한다. at_target의 target은 인물 ID/명시적 관찰 지점이며 해리 기본값 없음.
5. 후보가 없으면 같은 공개 외형·의상 안에서 허용된 중립 변형만 대체한다.
6. 안전 대체가 없으면 중립 placeholder. 비밀 외형/다른 의상으로의 임의 대체 금지.
7. 결과에는 선택 자산과 fallback 사유를 QA 기록에 남긴다. 일반 화면엔 사유·내면값 없음.

현재 src/shared/presentation.ts는 src 경로를 받는 Mock UI 계약이다.
제안 계약과 다르며 승인 전 수정하지 않는다. 현재 UI가 gaze/resolver/의상 매칭을 지원한다고 간주하지 않는다.
