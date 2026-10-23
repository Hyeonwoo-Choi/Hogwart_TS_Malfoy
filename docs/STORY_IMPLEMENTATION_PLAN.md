# STORY_IMPLEMENTATION_PLAN — 신규 플래그·데이터·UI 요구사항과 구현 순서

> 상위: [STORY_MASTER_BRANCHES.md](STORY_MASTER_BRANCHES.md). 대상: [CH2_DETAILED_STORY.md](CH2_DETAILED_STORY.md)의 [초안]·E 축, [CH3_DETAILED_STORY.md](CH3_DETAILED_STORY.md)의 [설계] 장면, 챕터 4 이후 확장. 표기: 🔴 기존 파일 변경(승인 필요) / 🟢 신규 파일·데이터 추가만.

## 1. 챕터 2 보강 (기존 구현 위에)
| # | 작업 | 파일 | 위험 |
|---|---|---|---|
| 1.1 | A·B·C·D 초안 장면 추가: `ch2_a_morning`(Q-11), `ch2_b_match_flash`(Q-12), `ch2_c_arrival`(Q-13 일부), `ch2_d_courier`(Q-14) | `v2c2p/v2c2e/v2c2r.ts`에 신규 장면 ID, `ch2c`·`ch2b`에서 `iff` 진입 한 줄 🔴 | 낮음 |
| 1.2 | E 축 신설: `ch2_e_open`, `ch2_e_snape_cover`, Q-15~Q-17 | 신규 `v2c2x.ts` 🟢 + `ch2_route`(말포이 선택 분기를 E로)·`v2c1_week_end`(E 문장) 🔴 | **중간**: 현재 H-08 E가 D로 합쳐져 있어 판시 경로 도달 분포가 바뀐다 → 시뮬 재측정 필수 |
| 1.3 | 플래그: `FLAG_P2_UNSTABLE`(E 경로), `FLAG_P2_LIED_TO_HER`, `FLAG_P2_HER_KNOWS_SOMETHING`, `FLAG_P2_OWES_SLUG`, `FLAG_P2_FILCH_NOTED`, `FLAG_P2_HAND_BURN`, `FLAG_P2_SNAPE_WATCHING`, `FLAG_P2_COURIER_RUMOR`, `KN_RESIDUE_SAMPLE`, `KN_COURIER_SEAL`, `KN_TWELVE_THIRTEEN` | [BRANCH_MAP_V2.md](BRANCH_MAP_V2.md)에 정의 후 사용 | 낮음 |
| 1.4 | 사건 수첩: `seventh-door`에 새 단서 항목(관찰/증언/추측/의문) | `ch2Records.ts` 🟢 | 낮음 |
- 선택 ID: 예약된 Q-11~Q-17을 쓴다. 기존 ID 변경 없음.

## 2. 챕터 3 연결과 확장
| # | 작업 | 파일 | 위험 |
|---|---|---|---|
| 2.1 | **[프로토] 연결**: `ch3_open` 후반을 `ch3_detention`으로 분리, 앞에 `go('v2c3_route')`, `v2c3_join`의 `END`를 `go('ch3_detention')`으로 | `ch3a.ts`·`v2c3p.ts` 🔴 | 중간: `ch3_*` 도달성 감사·EH-01 신뢰 분포 재측정 |
| 2.2 | 화~목 경로 행사 `ap3_a_ledger`/`ap3_b_tryout`/`ap3_c_count`/`ap3_d_courtyard`/`ap3_e_recheck` | `calendar.ts`(항목) + 신규 `v2c3e.ts`(장면) 🟢/🔴 | 낮음 |
| 2.3 | 금·토·일 변형 줄(S-03·K-07·`ch3_end`): 경로 플래그 `when` 줄 추가 | `ch3b.ts` 🔴 | 낮음(조건 줄만) |
| 2.4 | 플래그: `FLAG_P3_*`(프로토에서 이미 사용: `A_TRACED/A_SHARED/A_DESTROYED/B_EXPLAINED/B_SOLO/B_DELEGATED/C_WATCHED/C_NOTED/C_ERASED/D_MEETING/D_SHARED/D_IGNORED/E_HID/E_TOLD_RON/E_REPORTED` 등), `KN_BORROW_PATTERN`, `KN_WAND_ECHO`, `KN_STAIR_TOUCHED` | BRANCH_MAP_V2.md 정의 필요 | 낮음 |
| 2.5 | 챕터 3 결과 슬롯 `ARC/STANCE/OUT` 기록(3장) | 엔진 상태 | 중간 |

## 3. 새 상태(저장 호환) — 선택 필드
- `GameState.arcs?: Record<'A'|'B'|'C'|'D'|'E', { arc: number; stance: string; out: string }>`: 챕터 종료 장면에서 `fx 'arc:A=2/hidden/open'` 형태 효과로만 설정. 없으면 0·''·'' 로 해석(구세이브 호환, `normalize`에서 보정).
- 평판 `rep?: { staff: number; gryffindor: number; slytherin: number }`(±범위 제한 −5~5) — 효과 `rep:staff+1`. **조건 `REP_staff` 등은 resolveVar에 추가**. 챕터 3 프로토에서는 아직 쓰지 않고 `FLAG_P3_STAFF_TRUST` 플래그로 대신한다.
- 검증: `validateSave`는 두 필드를 선택 객체로 허용. `checkShape`에 타입 검사 추가.

## 4. UI·연출 요구사항
| 항목 | 상태 | 비고 |
|---|---|---|
| 게시판: 챕터 3 경로 행사 | 데이터만 추가 | 익명 제목·공지 유지(블라인드 기준 B4) |
| 사건 수첩: 챕터 3 사건 | 데이터만 추가 | 직접 본 것·들은 것·추측·의문, 다른 경로 정보 비공개 |
| 소리 큐(`cue.sound`) 재생 | **신규기능** | 스니코스코프·열세 번째 소리. 무음 환경 대체(텍스트 의성어) 필요 |
| 대사 전 지연·정적의 길이 | **신규기능** | `cue('pause')`는 표시만. 움직임 감소 설정에서는 정적 표시 유지 |
| 한 장면 두 인물 | **신규기능** | 판시+연락책, 지니+후치 |
| 이미지 | 생성하지 않음 | [V2_ROMANCE_DIRECTION.md](V2_ROMANCE_DIRECTION.md) 3.1 제작 명세 |

## 5. 구현 순서 (제안)
1. **1.3 + 1.4**(플래그·수첩 정의) → 2. **1.1**(A~D 초안 장면, 위험 낮음) → 3. 시뮬레이션 확장(`ch2sim.ts` → 챕터 N 범용) → 4. **1.2**(E 축, 도달 분포 재측정) → 5. **2.1·2.3**(챕터 3 연결·변형 줄) → 6. **2.2**(경로 행사) → 7. 챕터 4 설계 구체화.
- 각 단계마다: tsc·vitest·build, 정상 플레이 도달성(매트릭스 6장 기준), 구세이브 호환, 375/1366/1920 UI.

## 6. QA 검토 사항 — sim.test 성공률 문턱 0.20 → 0.15
- 사실: 문턱 완화는 **표본 분포 변화에 대한 임시 조치**였다. 같은 시드 집합에서 H-01을 'C'로 고정하자(이력 기반 H-08 B 후속을 피하려고) 난수열이 바뀌어 루나 약속 성공이 7/40(17.5%)으로 내려갔다. 설계 변경이 아니다.
- 반증 자료: 더 약속에 충실한 정책(`ch2sim.ts`, 최선 70%·약속 참가 0.9)으로 시드 501~600 각 100회 측정: 헤르미온느 46%, 지니 64%, 루나 56%, 판시 77%, 말포이 60%. 즉 **문턱이 낮아도 실제 성공률은 충분하다**. `sim.test`의 정책(약속을 90% 선택하지만 그 외 활동·선택이 무작위)이 약속 장면 도달·선택 성공을 낮춘다.
- 권장: ① 문턱 완화는 유지하되 **표본 합산**(여러 시드 집합의 평균)으로 바꾸고, ② `sim.test`의 정책을 `ch2sim.ts`로 통일하며, ③ 문턱을 정책별 기대값(예: 25%)으로 정의한다. 이 변경은 별도 승인·별도 커밋으로 처리한다(이번 작업에서는 수정하지 않음).

## 7. Codex 작업과의 조정
- Codex 작업물은 수정하지 않았다. **충돌 발생**: `docs/CHAPTER_BRANCH_MATRIX.md`가 이 작업 중에 다른 작성자의 "사건 진입·선택·결과표"(A~E 의미가 챕터마다 바뀜)로 덮어쓰여 있었다. Claude의 매트릭스는 `CHAPTER_BRANCH_AXES.md`로 분리 저장하고 Codex 문서는 그대로 두었다.
- 해석 차이(통합 필요): ① Codex는 A~E를 **챕터마다 새로 정의**(예: Ch1 A = 각주의 빈칸, Ch3 A = 진술의 빈 줄), Claude는 **축 고정**(A 금지된 기록 … E 불안정한 마법)이고 Ch별 장면만 바뀐다. 사용자 지시("Ch2 기존 A~E를 확장")는 축 고정에 가깝다. ② Codex 표의 선택 문구는 실제 구현 선택(Q/L)에 재할당하지 않는다고 명시했고 Claude 초안은 Q-11~Q-17 예약 ID를 쓴다 — 충돌 없음. ③ Codex 표는 챕터당 "주경로 하나 + 보조 하나"를 긴 장면으로 재생한다고 했고, Claude는 "주 사건 하나 + 나머지는 `when` 변형"으로 같은 방향이다.
- Codex 요구사항 감사(`STORY_FLAG_REQUIREMENTS.md`, 참조되었으나 아직 없음)가 나오면 이 문서의 플래그 표(1.3·2.4·3장)를 대조해 누락을 반영한다.
