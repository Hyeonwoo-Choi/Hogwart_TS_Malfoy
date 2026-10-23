# 12_DOCS_INVENTORY_2026-10-23 — 문서 인벤토리·충돌 목록

> 조사 전용. 기존 문서는 수정·이동·삭제하지 않았다. 상태 표기: 현재 유효 / 수정 필요 / 과거 설계 / 미확정 / 검증 필요.
> 입구: [11_2026-10-23_HANDOVER.md](11_2026-10-23_HANDOVER.md). 정리 절차는 Codex 제안 [DOCUMENT_CLEANUP_PLAN](codex-story-architecture/DOCUMENT_CLEANUP_PLAN.md)·[DOCUMENT_STRUCTURE_PROPOSAL](codex-story-architecture/DOCUMENT_STRUCTURE_PROPOSAL.md)을 따른다.

## 0. 요청서가 지정한 번호 문서
`docs/00_START_HERE` ~ `10_CH1_REBUILD_HANDOVER`, `docs/matrix/`는 **저장소에 없다**(확인됨). 과거에 존재했다는 증거도 이 PC에는 없어 유실이 아니라 **미작성**으로 분류한다. 이번에 만든 것은 `11`·`12` 두 파일뿐이며, 00~10을 새로 만들지 않았다(내용을 지어낼 위험, 사용자 확인 대기).

## 1. 조사 범위
- Markdown 86개(`node_modules`·`.git`·`hogwarts-remote`·`dist` 제외, 이번 신규 2개 제외): 루트 3(`CLAUDE.md`·`AGENTS.md`·`README.md`), `docs/` 최상위 46, 하위 폴더 `antigravity-qa` 3 · `architecture-audit` 5 · `codex-phase2` 8(+계약 JSON) · `codex-story-architecture` 17, `qa-phase2/README.md` 등.
- 상대 링크 252개 점검: 깨진 것 2개 — 하나는 이 인수인계가 `12`를 가리키는 링크(이 파일로 해소), 다른 하나는 아래 4장.

## 2. 역할별 인벤토리(주요 문서)
| 역할 | 문서 | 수정일 | 상태 | 비고 |
|---|---|---|---|---|
| 에이전트 규칙 | `AGENTS.md`(미추적) · `CLAUDE.md` | 10/21~22 | 현재 유효 / 수정 필요 | 거의 같은 내용의 이중 관리. AGENTS의 QA 서버 경로가 `.Codex/launch.json`, CLAUDE는 `.claude/launch.json` |
| 세계관 정본 | `GAME_BIBLE.md`(수정됨) | 10/21 | 현재 유효 | 오늘 방향(B·C·E) 미반영 |
| 구현 상태 | `DEV_PROGRESS.md`(수정됨) | 10/22 | 수정 필요 | 맨 위 "2026-10-20, 1차 회차" 서술이 오래됨. 아래쪽에 최신 항목이 이어 붙음. 10/22 P1·UI 작업 미기록 |
| 서사 | `STORY_OUTLINE.md`, `STORY_MASTER_BRANCHES.md`, `CHAPTER_BRANCH_AXES/MATRIX.md`, `CHARACTER_LONG_ARCS.md`, `CH2/CH3_DETAILED_STORY.md`, `STORY_IMPLEMENTATION_PLAN.md`, `STORY_MATRIX_INTEGRATION_PROPOSAL.md` | 10/21~22 | 미확정 | 14장 매트릭스 정본 미결정(아래 3장) |
| 문체·관계 | `NARRATIVE_STYLE_GUIDE.md`, `ROMANCE_SCENE_GUIDE.md`, `V2_ROMANCE_DIRECTION.md`, `V2_RELATIONSHIP_ROUTES.md`, `V2_HEROINES.md` | 10/21~22 | 현재 유효 | 관계 4문서 통합 후보(Codex 제안) |
| 분기·플래그 | `BRANCH_MAP.md`(수정됨), `BRANCH_MAP_V2.md`, `BRANCH_MAP_ENDINGS.md`, `V2_COMPAT.md` | 10/21~22 | 현재 유효 | 플래그 단일 정의 위치는 BRANCH_MAP |
| V2 설계 | `V2_*.md` 약 17개 | 10/21~22 | 현재 유효 / 일부 과거 설계 | 챕터 1·2 재설계 기록 다수. 오늘의 Ch1 재구축과 충돌 가능 → 검증 필요 |
| 시각 | `VISUAL_ASSET_PLAN.md`, `codex-story-architecture/`의 CG 4문서 | 10/21~22 | 현재 유효 + 제안 | 실제 이미지 0개(매니페스트 빈 배열) |
| UI·시스템 | `UI_SPEC.md`(수정됨), `V2_UI_TRANSITIONS.md`, `MAP_UI_PLAN.md`, `TITLE_SCREEN_PLAN.md`, `FREE_ROAM_SYSTEM.md`, `RANDOM_EVENTS.md` | 10/20~22 | 현재 유효 / 일부 과거 설계 | `MAP_UI_PLAN`·`TITLE_SCREEN_PLAN`은 초기 계획 |
| 저장·클라우드 | `DATA_STRUCTURE.md`(수정됨), `CLOUD_SETUP.md` | 10/21~22 | 현재 유효 | 클라우드 실서버 가입·저장 왕복 미검증 |
| QA | `antigravity-qa/*`, `codex-phase2/QA_RESULTS.md`, `qa-phase2/README.md`, `architecture-audit/*` | 10/22 | 과거 스냅샷(참고) | 각각 다른 HEAD·시점 기준 |
| 밸런스 | `BALANCE_REPORT.md` | 10/21 | 검증 필요 | 이후 변경 반영 여부 미확인 |

## 3. 중복·충돌
| # | 항목 | 내용 | 조치(제안, 미실행) |
|---|---|---|---|
| 1 | 동명 문서 | `STORY_MASTER_BRANCHES`(루트 80줄 / Codex 145줄), `CHARACTER_LONG_ARCS`(81 / 110줄), `CH2_DETAILED_STORY`(178 / 80줄)는 **내용이 다르다**. `CHAPTER_BRANCH_MATRIX`는 두 사본이 **바이트 동일**. `NARRATIVE_STYLE_GUIDE`는 루트 60줄 / `codex-phase2` 54줄로 다르다 | 정본 결정 전 병존. 사용자가 정본 선택 후 고유 표·대사를 병합 |
| 2 | 시각 방향 | 오늘 방향 E(관능적 일러스트 강화)와 `CHARACTER_VISUAL_DIRECTION`의 "변화한 몸의 관음적 강조·신체 일부만 소비하는 크롭 금지, 희화화 금지" 및 `EVENT_CG_MASTER_PLAN`의 L1~L3 강도·"노골적 성행위 미묘사"가 정렬되지 않았다 | 사용자가 허용 강도를 정해야 함. 성인 AU·동의·주체성·노골적 묘사 배제는 기존 확정 사항과 양립 |
| 3 | TS 이후 연출 | 오늘 방향 C의 조롱·고립·공개 갈등과 `AGENTS.md`의 "희화화 금지·자기수용≠애정·치료가 핵심 서사 아님" | 조롱을 사회적 갈등으로 다루고 드레이코를 희화화하지 않는 선을 명시하면 양립 가능. 문구 확정 필요 |
| 4 | 이미지 제작 규정 | `AGENTS.md`/`CLAUDE.md`: "승인 없는 이미지 생성 금지". 오늘 방향 F는 Antigravity가 시안을 제작 | 제작 주체·승인 범위를 명시적으로 기록할 것(Claude Code는 이미지 생성 불가) |
| 5 | 진행 상태 서술 | `AGENTS.md` "다음: 챕터 9" vs 오늘 "Ch1 전면 재구축 우선" | Ch1 재구축 승인 후 갱신 |
| 6 | 학년·성인 | "6학년 구조 유지"와 "전원 만 18세 이상" 공존 | 학사 일정 충돌 검토는 미실시(오늘 방향 B) |
| 7 | 깨진 링크 | 루트 `CHAPTER_BRANCH_MATRIX.md` → `STORY_FLAG_REQUIREMENTS.md`(실제 위치는 `codex-story-architecture/`). Codex 사본과 동일 파일이라 Codex 소유로 보고 수정하지 않음 | 정본 선택·이동 시 함께 수정 |
| 8 | `.env.example` | `DEV_PROGRESS.md`가 "사용자가 비밀 키로 수정, 커밋 금지"라고 기록. 값은 열람하지 않음 | 사용자가 내용 확인·정리 |

## 4. 오늘 작업 중 확인된 완료 항목(문서 관점)
- 10/23에 수정된 프로젝트 파일은 이 두 문서뿐이다. 코드·시나리오·에셋은 이번 작업에서 수정하지 않았다.
- 수정한 기존 문서: **없음**. 이유: 대부분 Codex/Antigravity 소유이거나 미커밋 변경 중이고, 정본 충돌이 미해결이라 임의 편집을 피했다.

## 5. 다음 문서 정리 제안(승인 후)
1. `docs/README.md` 입구 생성(Codex 1회차 제안). 파일 이동 없음.
2. 위 3장 충돌 결정 → 정본에 `superseded by` 링크만 추가(원문 보존).
3. `DEV_PROGRESS.md`에 10/22 작업과 이 복구 상태 한 줄 추가.
4. `AGENTS.md`/`CLAUDE.md` 단일화(예: 한쪽을 링크로).
5. 삭제는 마지막 단계, 별도 승인.
