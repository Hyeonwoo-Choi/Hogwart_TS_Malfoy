# DOCUMENT_STRUCTURE_PROPOSAL — 탐색 구조 제안

> 경로 이동은 하지 않았다. 아래는 승인 후 단계적으로 적용할 정보 구조다.

## 권장 구조

```text
docs/
  README.md                    # 상태가 표시된 단일 입구
  canon/                       # 확정 설정·문체·데이터 계약
  story/                       # 현재 14장 구조·챕터 원고
  characters/                  # 독립 목표·관계·환영 규칙
  branching/                   # 플래그·선택·엔딩·호환
  visual/                      # CG·자산·UI 연출
  technical/                   # 저장·클라우드·자유 일과
  qa/                          # 최신 QA와 재현 명령
  proposals/                   # 미확정 설계
  archive/                     # 대체된 기록, 삭제 전 보관
```

## 이동 전 가상 인덱스

| 찾는 것 | 현재 정본/입구 | 상태 |
|---|---|---|
| 확정 세계관 | `GAME_BIBLE.md` | ACTIVE/IN_PROGRESS |
| 실제 구현 상태 | `DEV_PROGRESS.md` | IN_PROGRESS, 코드 대조 필요 |
| 문체 | `NARRATIVE_STYLE_GUIDE.md` | ACTIVE |
| 선택·플래그 | `BRANCH_MAP.md`, `BRANCH_MAP_V2.md` | ACTIVE/IN_PROGRESS |
| 엔딩 | `BRANCH_MAP_ENDINGS.md` | 구현 전 포함 |
| 장기 스토리 | `STORY_OUTLINE.md`, `STORY_MASTER_BRANCHES.md` | 정본 충돌 검토 필요 |
| 캐릭터 | `CHARACTER_LONG_ARCS.md`, `V2_HEROINES.md` | 통합 후보 |
| 관계 | `ROMANCE_SCENE_GUIDE.md`, `V2_RELATIONSHIP_ROUTES.md` | ACTIVE |
| 시각 자산 | `VISUAL_ASSET_PLAN.md`, 본 폴더의 CG 4문서 | 기술 정본 + 제안 |
| UI | `UI_SPEC.md`, `V2_UI_TRANSITIONS.md` | ACTIVE/IN_PROGRESS |
| 자유 일과 | `FREE_ROAM_SYSTEM.md` | ACTIVE |
| QA | `qa-phase2/README.md`, `codex-phase2/QA_RESULTS.md` | 스냅샷별 REFERENCE |
| 설계 비교 | `architecture-audit/` | REFERENCE |

## `docs/README.md`에 필요한 상태 표기

- `[CANON]`: 사용자/AGENTS가 확정한 사실.
- `[IMPLEMENTED]`: 코드와 테스트로 확인한 기능. 확인 날짜·HEAD를 함께 적는다.
- `[PROPOSAL]`: 구현 전 설계. 플래그·장면 ID를 확정한 것처럼 쓰지 않는다.
- `[REFERENCE]`: 과거 판단 근거. 최신 상태는 별도 링크로 안내한다.
- `[IN PROGRESS]`: 현재 다른 에이전트가 수정 중. 담당·범위만 표시한다.

## 경로 이전 매핑 제안

| 현재 | 향후 위치 | 비고 |
|---|---|---|
| `GAME_BIBLE`, `NARRATIVE_STYLE_GUIDE` | `canon/` | 링크 호환 계획 필수 |
| `STORY_OUTLINE`, 통합 MASTER/MATRIX | `story/` | 정본 결정 뒤 한 세트만 |
| `BRANCH_MAP*`, `V2_COMPAT` | `branching/` | 단일 정의 규칙 유지 |
| `CHARACTER_LONG_ARCS`, 관계 문서 | `characters/` | 관계와 사건 목표 분리 |
| `VISUAL_ASSET_PLAN`, CG 문서 | `visual/` | 실제/제안 라벨 유지 |
| `DATA_STRUCTURE`, `CLOUD_SETUP`, `FREE_ROAM_SYSTEM` | `technical/` | 소스 주석 링크 확인 |
| `architecture-audit`, `codex-phase2`, QA 결과 | `qa/` 또는 `archive/` | 버전/HEAD별 보존 |

## 정본 미확정 쟁점

1. A~E를 장기 고정 사건축으로 볼지 챕터별 가변 축으로 볼지.
2. Ch13에서 해리의 탑 직접 참여를 필수로 할지 병행 임무 중 하나로 둘지.
3. 루트와 Codex의 동명 MASTER/MATRIX/LONG_ARCS 중 무엇을 정본으로 승격할지.
4. Ch6/8 핵심 비밀을 어떤 경로에 선택적으로 공개할지.

위 결정 전에는 물리적 이동이나 `superseded` 선언을 하지 않는다.

