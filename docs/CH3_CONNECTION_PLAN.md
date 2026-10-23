# CH3_CONNECTION_PLAN — 챕터 3 프로토타입 연결 준비

> **갱신: 챕터 3은 실제 엔진에 연결되었다(v2c3p.ts·v2c3x.ts, 아래 계획의 1~3번 절차 완료, 테스트 v2c3proto·ch4branch).** 이하는 연결 전에 쓴 계획이며 4장(시간·장소)의 time+1은 제거됐다.
> 대상(연결 전): `src/data/v2c3p.ts`(미연결, `v2c3proto.test.ts` 9개). 상위: [CH3_DETAILED_STORY.md](CH3_DETAILED_STORY.md), [STORY_IMPLEMENTATION_PLAN.md](STORY_IMPLEMENTATION_PLAN.md) 2장. (연결 전 작성 당시: 연결하지 않음.) 아래는 연결 계획과 필요한 테스트다.

## 1. 현재 상태 (검증됨)
- 프로토타입 장면은 `SCENARIO`에만 있고 `CH3_SCENARIO`·기존 장면에서 참조하지 않는다(테스트로 확인). 챕터 2 종료 카드의 `next: 'ch3_open'`은 기존 `ch3_open`으로 간다.
- 챕터 2 종료 상태 10×10스타일에서 `v2c3_route`를 직접 실행하면 모두 `v2c3_join`에 도달한다. 진입 분포(합계 100): 연구 14·퀴디치 13·성 14·슬리데린 46·말포이 직접(E) 3·일반 10. **E가 드문 이유**는 챕터 2 E 축이 아직 구현되지 않아 `FLAG_P2_FIGHT_DRACO`(멱살)로만 들어오기 때문이다. 슬리데린이 많은 이유는 H-08 E(말포이 방향)가 D로 합쳐져 있기 때문이다.

## 2. 진입 조건: 챕터 2 종료 후
| 순서 | 조건 | 주 사건 | 근거 |
|---|---|---|---|
| 1 | `FLAG_P2_FIGHT_DRACO ∥ FLAG_P2_UNSTABLE` | E | 가장 큰 후폭풍(감점·소문·주시) |
| 2 | `FLAG_P2_BETRAYED_PANSY` | D | 약속 위반의 즉시 후속 |
| 3~6 | `FLAG_P2_RESEARCH` → `PITCH` → `SECRET` → `SLY` | A→B→C→D | 경로 순 |
| 7 | 해당 없음 | G(일반) | 아무것도 따라가지 않아도 챕터 진행 |
- 규칙: 주 사건 1개, 나머지 이력은 화~목 보조 사건·변형 줄로만(AXES 3장). 연애 상태는 진입 조건에 쓰지 않는다.

## 3. 챕터 2 플래그 → 챕터 3 사건 매핑
| 챕터 2 상태 | 챕터 3 반영 위치 | 내용 |
|---|---|---|
| `FLAG_P2_BREACH` | wA 도입 | 카드 뒷면의 출처가 핀스의 경고문으로 바뀜 |
| `FLAG_P2_FIGHT_DRACO` | wB 도입·wE | 감점 소문, 후치의 첫마디, 스네이프 주시 |
| `FLAG_P2_STAIR_SEALED`·`OB_STAIR_INSIDE`·`FLAG_P2_STAIR_MARKED` | wC 도입 | 분필 13 / 다시 묶인 실 |
| `FLAG_P2_BETRAYED_PANSY` | wD 도입 | 봉투 어투가 정중해짐 |
| `FLAG_P2_PROMISE_KEPT`·`KN_COURIER_SEAL`·`KN_LETTER_PRESSURE` | wD 도입 | 종이 질·낯익은 어투 |
| `FLAG_P2_LIED_TO_HER`(설계)·`FLAG_P2_HER_KNOWS_SOMETHING`(설계) | wA_A | 헤르미온느의 대사 변형 |
| `ron.trust` | wE | 론의 첫 반응(≥10 / <10) |
| `FLAG_GIN_DISTANT`·`FLAG_GIN_REPAIRED` | wB_B | 지니의 어조 |
| `FLAG_*_OPEN/SLOW/DECLINED_GENTLY/REPAIRED/DISTANT`, `FLAG_PAN_NIGHT` | 경로 행사·일요일(설계) | 말투 거리 변형 |
- 관계·지식 전달: 프로토타입은 `bonds`(단계·연애 상태)를 바꾸지 않는다(테스트로 확인). 감정 수치 변화는 선택 결과에 한정(예: `hermione.trust+1`).

## 4. 시간·장소
| 장면 | 날짜·시간 | 배경 | 비고 |
|---|---|---|---|
| 진입 사건 wA~wG | 9/30(월) 아침~점심 | common/library/hall/pitch | 기존 `ch3_open`의 저녁 징계 앞에 삽입 |
| 선택 결과(wA_A 등) | 9/30 점심 | library/pitch | 선택에 따라 시간 소모 없음(wC_A만 `time+1`이지만 일과 밖이라 효과 없음) → **구현 시 `time+1` 제거 필요** |
| 합류 | 9/30 저녁 | common | `go('ch3_detention')`으로 교체 |
- 일과 구간(10/1~10/3)·S-03(10/4)·K-07(10/5)·`ch3_end`(10/6)는 기존 그대로.

## 5. 필요한 엔진·UI 기능
| 기능 | 필요 여부 |
|---|---|
| 새 `ch3_open` 분리(제목+도입 / 징계 본문) | 필요(코드 변경, 소) |
| 경로 행사(`ap3_*`) 캘린더 항목 | 필요(조건 `FLAG_P3_*`·`FLAG_P2_*`) |
| 소리 큐(스니코스코프·분필) | 선택(없어도 텍스트로 동작) |
| `ARC/STANCE/OUT`·`rep` 상태 | 선택(3.x는 플래그로 대체 가능) |
| UI | 변경 없음(게시판은 익명 제목 규칙만 유지) |

## 6. 연결 절차 (승인 후)
1. `ch3a.ts`: `ch3_open`을 둘로 나눈다 — `ch3_open`: 제목·월요일 도입 3줄 + `go('v2c3_route')`, `ch3_detention`: 기존 트로피 진열실 본문(필치 등장~`iff FLAG_DAWN_VIGIL`). 원본 문장·`when` 조건은 바꾸지 않는다.
2. `v2c3p.ts`: `v2c3_join`의 `END`를 `go('ch3_detention')`으로 교체, `time+1` 제거.
3. `scenario.ts`: `V2C3P`를 `CH3_SCENARIO`에도 포함(이미 SCENARIO에는 있음).
4. 필요 플래그를 [BRANCH_MAP_V2.md](BRANCH_MAP_V2.md)에 정의(`FLAG_P3_*`, `KN_BORROW_PATTERN`, `KN_WAND_ECHO`, `KN_STAIR_TOUCHED`, `KN_LETTER_SHARED_HER`, `FLAG_P3_STAFF_TRUST`).
5. 사건 수첩·인물 기록에 챕터 3 항목 추가(경험한 사실·추측만).

## 7. 연결 시 필요한 테스트 항목
| # | 항목 | 방법 |
|---|---|---|
| T1 | 챕터 2 종료 → 챕터 3 모든 스타일 완주(K-07·ch3_end 포함) | `ch2sim.ts`를 `ch3_end`까지 확장 |
| T2 | 각 진입 사건(A~E·G)의 정상 플레이 도달 | 분포 하한(◎ ≥25%), 현재 E는 챕터 2 E 구현 뒤 재측정 |
| T3 | 기존 도달성 감사(`reach.test.ts`)에서 새 `when` 조건이 모두 참이 되는 상태가 관측되는지(필요 시 프로브 추가) | 프로브는 정상 효과로만 상태 구성 |
| T4 | EH-01(K-07 직전 신뢰<7/≥7) 분포가 유지되는지 | `reach.test`의 `trustAtLetter` |
| T5 | 저장·불러오기: 진입 사건 중간 저장, 합류 직전 저장 | `qa7`식 검증 |
| T6 | 구세이브: 챕터 2 종료 저장을 불러와 챕터 3으로 계속(경로 플래그가 없는 구세이브는 G로) | 플래그 없는 상태 → `v2c3_wG` |
| T7 | 블라인드 기준: 진입 장면에 이름·메타 없음 | `v2c3proto.test.ts`에 이미 있음 |
| T8 | 관계 상태 불변(진입 사건이 연애 상태를 바꾸지 않음) | 이미 있음 |
| T9 | 모바일(375px)에서 선택지·진입 장면 | 브라우저 QA |
| T10 | 필수 일정·시간 건너뛰기와의 상호작용(챕터 3 일과 구간에서 `required` 행사 정지) | `timeskip.test.tsx` 확장 |
- **미검증**: 연결 후의 서사 연속성(월요일 아침 장면과 저녁 징계의 감정선), 챕터 3 이후 장면이 새 플래그를 읽는지.
