# DOCUMENT_CLEANUP_PLAN — 정보 손실 없는 정리 절차

> 이번 턴에는 삭제·이동·이름 변경을 실행하지 않는다.

## 안전 원칙

1. `GAME_BIBLE`, `BRANCH_MAP`, `BRANCH_MAP_V2`, `NARRATIVE_STYLE_GUIDE`, `DATA_STRUCTURE`, `DEV_PROGRESS`를 기준 문서로 유지한다.
2. 미커밋 문서와 Claude/Antigravity 작업 문서는 IN_PROGRESS로 보고 수정하지 않는다.
3. 동명 문서는 파일명만으로 중복 판정하지 않는다. 고유 표·대사·미해결 결정을 먼저 추출한다.
4. 삭제 전 `rg`로 경로 참조, Git 이력, 코드 주석 링크를 다시 확인한다.
5. 정리는 `통합 문서 작성 → 링크 교체 → 검토 → archive 이동 → 별도 승인 후 삭제` 순서다.

## 통합 묶음

| 묶음 | 통합 목표 | 보존할 고유 정보 | 현재 조치 |
|---|---|---|---|
| 14장 구조 | 루트 `STORY_MASTER_BRANCHES` + 두 `CHAPTER_BRANCH_MATRIX` | 고정축/가변축 충돌, 70경로, 복선 회수, 미확정 Ch13 | 정본 결정 전 병존 |
| 인물 호 | 루트/Codex `CHARACTER_LONG_ARCS`, `V2_HEROINES` | 독립 행동, 비개입 결과, 고유 대사, 관계 경계 | 비교표 작성 후 병합 |
| Ch2 원고 | 루트/Codex `CH2_DETAILED_STORY`, PATH A~E | 실제 ID와 제안 대사 구분 | 구현된 장면에 상태 라벨 추가 |
| 관계 | `ROMANCE_SCENE_GUIDE`, `V2_RELATIONSHIP_ROUTES`, `V2_ROMANCE_DIRECTION`, Phase2 blueprint | 동의, 질투 출처, R1~R4, 대체 경로 | 루트 가이드 중심 통합 |
| UI | `UI_SPEC`, `V2_UI_TRANSITIONS`, `MAP_UI_PLAN`, `TITLE_SCREEN_PLAN` | 모바일 수치, 초기 결정 이유 | 완료 메모를 archive로 이동 |
| QA | `architecture-audit`, `codex-phase2/QA_RESULTS`, `qa-phase2/README` | 버전별 결과·재현 명령 | 날짜/HEAD 인덱스만 추가 |

## 조건부 보관/삭제 후보

| 후보 | 근거 | 선행 통합 | 참조 영향 | 복구 방법 |
|---|---|---|---|---|
| `docs/MAP_UI_PLAN.md` | 초기 설계지만 NPC 비노출·이미지 폴백 근거 보유 | 고유 좌표/의도 → `FREE_ROAM_SYSTEM` 또는 `UI_SPEC` | `FREE_ROAM_SYSTEM.md` 1개가 직접 참조; 현시점 보관 | Git 이력 또는 `docs/archive/ui/` |
| `docs/CH3_CONNECTION_PLAN.md` | 연결 완료분과 과거 수치가 섞임 | 미검증 T9/T10 → `DEV_PROGRESS`/backlog | 외부 참조 0개(본 감사 문서 제외); 미검증 항목 때문에 보관 | archive 사본 |
| `docs/TITLE_SCREEN_PLAN.md` | 회차성 구현 기록과 미구현 2.5D 목표 공존 | 성능 예산·폴백 → `UI_SPEC` | 외부 참조 0개(본 감사 문서 제외); 목표가 남아 보관 | archive 사본 |
| `docs/V2_CHAPTER_PLAN.md` | 최신 14장 구조와 일부 중복하나 관계 마일스톤·다자 동의 고유 | 고유 마일스톤 → 통합 MASTER | 설계 문서 6개가 직접 참조; archive 부적합 | archive 사본 |

어떤 후보도 현재 삭제 승인을 받지 않았고, `OBSOLETE` 확정도 아니다. 참조와 고유 정보가 남아 있어 네 파일 모두 현재는 유지가 안전하다.

## 실행 회차 제안

### 1회차: 인덱스만 추가

- `docs/README.md`를 새로 만들고 현재 정본·제안·참고를 구분한다.
- 파일 이동 없이 링크만 제공한다.
- Claude가 작업 중인 문서의 상태는 `IN_PROGRESS`로 표시한다.

### 2회차: 사용자 결정 반영

- 사건축 고정 여부, Ch13 탑 참여, 동명 매트릭스의 정본을 사용자가 결정한다.
- 선택된 정본에 다른 문서의 고유 표와 미해결 쟁점을 병합한다.
- 기존 파일 첫머리에 `superseded by` 링크를 추가하되 원문은 보존한다.

### 3회차: archive 이동

- 참조를 모두 교체하고 테스트/문서 링크 검사를 통과한 파일만 `docs/archive/`로 이동한다.
- 이동 목록과 이전 경로 매핑을 남긴다.
- 한 회차 뒤 참조 문제가 없는지 확인한 뒤 삭제 여부를 다시 승인받는다.

## 승인 체크리스트

- [ ] 어떤 14장 매트릭스를 정본으로 삼을지 결정
- [ ] Ch13 탑 사건의 직접 참여 범위 결정
- [ ] 위 4개 조건부 후보의 archive 이동 승인
- [ ] `docs/README.md` 신규 인덱스 생성 승인 또는 다른 에이전트 소유 여부 확인
- [ ] archive 보존 기간과 삭제 정책 결정

