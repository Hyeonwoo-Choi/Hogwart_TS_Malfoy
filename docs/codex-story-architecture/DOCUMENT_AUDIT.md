# DOCUMENT_AUDIT — Markdown 현황 감사

> 기준: 2026-10-22, HEAD `e3e612d`, 미커밋 변경 다수. 최초 보고 기준은 83개였으나 재검증 시 Antigravity 문서 1개가 추가되어 현재 84개다. 소스·기존 문서는 변경하지 않았다. `node_modules`, 빌드 산출물, `hogwarts-remote/`는 제외했다.

## 판정 기준

- ACTIVE: 현재 구현/개발의 직접 기준. REFERENCE: 고유 결정·근거를 보존.
- DUPLICATE: 다른 문서와 실질 중복, 통합 검토. OUTDATED: 코드와 상태가 어긋남.
- OBSOLETE: 고유 정보·참조가 없는 삭제 후보. IN_PROGRESS: 다른 에이전트 변경 중이라 손대지 않음.
- Git 미추적/수정 문서는 보수적으로 IN_PROGRESS 또는 REFERENCE로 분류했다.

## 루트·운영·기술

| 경로 | 상태 | 목적·고유 정보 | 중복/참조·권장 |
|---|---|---|---|
| `README.md` | ACTIVE | 실행·프로젝트 입구 | 유지, 문서 인덱스 링크 추가 후보 |
| `AGENTS.md`, `CLAUDE.md` | ACTIVE | 작업 규칙 | 내용이 같아도 도구별 진입점; 유지 |
| `docs/DEV_PROGRESS.md` | IN_PROGRESS | 최신 구현/검증 요약 | 코드 대조 후만 인용; 유지 |
| `docs/GAME_BIBLE.md` | IN_PROGRESS | 확정 설정 | 최상위 정본; 유지 |
| `docs/BRANCH_MAP.md` | IN_PROGRESS | 기존 ID·플래그 정본 | 224줄이지만 분리 링크 있음; 유지 |
| `docs/BRANCH_MAP_ENDINGS.md` | ACTIVE | Ch12+ 결정/엔딩 | 유지 |
| `docs/BRANCH_MAP_V2.md` | IN_PROGRESS | V2 상태 원천 | 루트 설계군의 단일 플래그 원천; 유지 |
| `docs/DATA_STRUCTURE.md` | IN_PROGRESS | 노드·저장 계약 | 유지 |
| `docs/UI_SPEC.md` | IN_PROGRESS | UI 계약 | 유지 |
| `docs/FREE_ROAM_SYSTEM.md` | ACTIVE | 자유 일과 | 유지 |
| `docs/CLOUD_SETUP.md` | REFERENCE | 클라우드 저장 절차 | 실제 코드 존재 여부와 함께 유지 |
| `docs/BALANCE_REPORT.md` | REFERENCE | 임계값 근거 | 최신 실측 날짜 표시 후 유지 |
| `docs/NARRATIVE_STYLE_GUIDE.md` | ACTIVE | 원고 문체 정본 | Codex Phase2 동명 가이드보다 우선 |
| `docs/ROMANCE_SCENE_GUIDE.md` | IN_PROGRESS | 친밀 장면 규칙 | 유지 |
| `docs/VISUAL_ASSET_PLAN.md` | ACTIVE | 현재 자산 교체 계약 | 본 CG 문서의 기술 상위 기준으로 링크 |
| `docs/MAP_UI_PLAN.md` | REFERENCE | 구현 완료 표기가 있는 초기 지도 메모; NPC 위치 비노출·이미지 폴백 근거 | `FREE_ROAM_SYSTEM.md`가 직접 참조하므로 현시점 보관 |
| `docs/TITLE_SCREEN_PLAN.md` | REFERENCE | 타이틀 회차 기록 | 구현 대조 뒤 archive 후보 |
| `docs/RANDOM_EVENTS.md` | ACTIVE | 랜덤 사건 | 유지 |
| `public/assets/README.md` | ACTIVE | 에셋 교체 방법 | 유지 |
| `qa-phase2/README.md` | ACTIVE | 독립 QA 실행법 | 유지 |
| `docs/antigravity-qa/CH1_PLAYER_EXPERIENCE_REVIEW.md` | IN_PROGRESS | Antigravity의 Ch1 플레이 경험 검증 | 타 소유 문서, 수정·통합·이동 금지 |

## 루트 스토리/V2 설계군

| 문서군 | 상태 | 고유 정보 | 권장 |
|---|---|---|---|
| `STORY_OUTLINE.md` | IN_PROGRESS | 5막·기존 비트·구현 메모 | 정본 링크 유지, 오래된 문단만 추후 갱신 |
| `STORY_MASTER_BRANCHES.md` | IN_PROGRESS | 고정 사건축·복선 | `codex-story-architecture` 동명과 혼합 금지, 통합 결정 필요 |
| `CHAPTER_BRANCH_AXES.md` | REFERENCE | A~E 고정축 | Matrix와 통합 후보, 고정축 정의 보존 |
| `CHAPTER_BRANCH_MATRIX.md` | IN_PROGRESS | 루트 70칸 | Codex 동명과 충돌 비교 후 하나를 정본 지정 |
| `CHARACTER_LONG_ARCS.md` | IN_PROGRESS | 루트 인물 호 | Codex 동명과 고유 대사/목표 합치기 |
| `CH2_DETAILED_STORY.md` | IN_PROGRESS | 루트 Ch2 상세 | Codex Ch2 묶음과 병존; 구현 반영분을 우선 표시 |
| `CH3_DETAILED_STORY.md` | REFERENCE | Ch3 상세 계약 | 현재 연결 코드와 대조해 상태 갱신 |
| `CH3_CONNECTION_PLAN.md` | REFERENCE | 연결 완료 전후의 조건표·테스트 목록 | 완료 표시가 있고 외부 참조는 본 감사 문서뿐; 미검증 T9/T10 보존 |
| `STORY_IMPLEMENTATION_PLAN.md` | REFERENCE | 구현 순서/상태 요구 | 완료 항목 체크 후 backlog로 통합 |
| `STORY_MATRIX_INTEGRATION_PROPOSAL.md` | REFERENCE | 두 매트릭스 충돌 | 정본 결정 전 유지 |
| `V2_ACADEMIC_CALENDAR.md` | ACTIVE | 일정 | 유지 |
| `V2_BRANCHING_STORY.md` | ACTIVE | V2 분기 전달 | 유지 |
| `V2_CH1_CH2_REWRITE.md` | REFERENCE | 개편 범위 | 구현 완료 시 archive 후보 |
| `V2_CH1_REVIEW.md` | REFERENCE | Ch1 품질 근거 | Ch1 재감사 후 archive 후보 |
| `V2_CH1_SCENES.md` | REFERENCE | 장면 구성 | 실제 코드와 차이 표기 후 유지/통합 |
| `V2_CHAPTER_PLAN.md` | REFERENCE | 14장 관계 마일스톤·다자 동의·관계 코다 | 다른 설계 문서 6개가 직접 참조하므로 현시점 보관 |
| `V2_COMPAT.md` | ACTIVE | 구세이브·ID 호환 | 유지 |
| `V2_DESIGN.md` | REFERENCE | 관계 시뮬레이션 원칙 | 관계 문서에 통합 후보 |
| `V2_DRACO_ILLUSION.md` | ACTIVE | 환영 규칙 | 유지 |
| `V2_DYNAMIC_EVENTS.md` | ACTIVE | 돌발/랜덤 구분 | 유지 |
| `V2_HEROINES.md` | REFERENCE | 히로인별 목표 | LONG_ARCS와 통합 후보 |
| `V2_JOURNAL.md` | REFERENCE | 관찰 기록/용어 UX | `V2_NOTEBOOK`과 경계 정리 |
| `V2_MULTI_HEROINE_STORY.md` | REFERENCE | Ch1 다중 구조 | 구현 기록으로 보존 |
| `V2_NOTEBOOK.md` | ACTIVE | 수첩 계약 | 유지 |
| `V2_PERCEPTION.md` | ACTIVE | 목격·전언 모델 | 유지 |
| `V2_RELATIONSHIP_ROUTES.md` | ACTIVE | 관계 단계/질투 | 유지 |
| `V2_ROADMAP_IMPL.md` | IN_PROGRESS | Ch2~14 계획 | 최신 백로그 입구 후보 |
| `V2_ROMANCE_DIRECTION.md` | REFERENCE | 성숙한 연출 | ROMANCE 가이드에 고유 항목 통합 후보 |
| `V2_UI_TRANSITIONS.md` | ACTIVE | 전환/패널 | 유지 |
| `CH1_NARRATIVE_AUDIT.md` | IN_PROGRESS | Ch1 개선 감사 | Claude 작업 중으로 취급, 손대지 않음 |

## 감사·Codex 산출물

| 경로/군 | 상태 | 고유 정보 | 권장 |
|---|---|---|---|
| `docs/architecture-audit/*` 5개 | REFERENCE | 설계 비교·요구·백로그·문체 감사 | 한 세트로 보관; 구현 상태만 별도 갱신 |
| `docs/codex-phase2/STORY_IMPLEMENTATION_BLUEPRINT.md` | REFERENCE | 70경로 통합 계약 | 루트 정본 아님을 유지 |
| `docs/codex-phase2/CHAPTER_SCENE_CONTRACTS.md` | REFERENCE | Ch1~4 계약 인덱스 | JSON/챕터 계약의 입구로 유지 |
| `docs/codex-phase2/contracts/CH01~04.md` | REFERENCE | 60개 상세 계약 | 기계 JSON과 쌍으로 보존 |
| `docs/codex-phase2/LONG_TERM_CAUSALITY.md` | REFERENCE | 생산/소비 인과 | 구현 시 검증 근거 |
| `docs/codex-phase2/CHARACTER_RELATIONSHIP_BLUEPRINT.md` | REFERENCE | 관계·특별 장면 계약 | 루트 ROMANCE와 비교 후 통합 후보 |
| `docs/codex-phase2/NARRATIVE_STYLE_GUIDE.md` | DUPLICATE | Phase2 집필 계약 | 루트 문체 가이드가 우선; 고유 장면 유형만 통합 후보 |
| `docs/codex-phase2/QA_RESULTS.md` | REFERENCE | A/B 스냅샷 결과 | 날짜·해시와 함께 보존 |
| `docs/codex-story-architecture/STORY_MASTER_BRANCHES.md` | REFERENCE | Codex 독립 14장안 | 루트 동명과 자동 혼합 금지 |
| `docs/codex-story-architecture/CHAPTER_BRANCH_MATRIX.md` | REFERENCE | Codex 70경로 | 루트 동명과 통합 결정 필요 |
| `docs/codex-story-architecture/CHARACTER_LONG_ARCS.md` | REFERENCE | 독립 행동·관계 기억 | 루트 동명과 비교 |
| `docs/codex-story-architecture/STORY_FLAG_REQUIREMENTS.md` | REFERENCE | 제안 상태 계약 | 실제 플래그 정본은 BRANCH_MAP_V2 |
| `docs/codex-story-architecture/CH2_DETAILED_STORY.md` + `CH2_PATH_A~E.md` | REFERENCE | Codex Ch2 원고 묶음 | 인덱스+세부 파일 구조 유지 |
| `docs/codex-story-architecture/EVENT_CG_*` 등 이번 7개 | ACTIVE | CG 계획·문서 감사 | Codex 소유, 제안 상태 유지 |

## 삭제 후보 결론

- 즉시 `OBSOLETE`로 확정한 파일은 0개다. 미추적·동시 작업 상태와 교차 참조 때문에 삭제 근거가 충분하지 않다.
- 네 검토 후보 중 즉시 archive 가능한 문서는 없다. `MAP_UI_PLAN.md`는 `FREE_ROAM_SYSTEM.md`가, `V2_CHAPTER_PLAN.md`는 설계 문서 6개가 직접 참조한다. `CH3_CONNECTION_PLAN.md`에는 미검증 T9/T10이, `TITLE_SCREEN_PLAN.md`에는 미구현 2.5D·성능 예산이 남아 있다.
- 동명 문서와 Phase2 자료는 고유 설계 근거가 있어 삭제 후보가 아니다.

