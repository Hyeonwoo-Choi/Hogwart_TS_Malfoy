# BRANCH_MAP_V2 — 다중 히로인·일정·돌발 사건 분기 지도

> [BRANCH_MAP.md](BRANCH_MAP.md)의 V2 확장. 플래그 원천은 이 문서 한 곳이다(같은 의미의 플래그를 다른 문서에 새로 정의하지 않는다). 설계는 [V2_MULTI_HEROINE_STORY.md](V2_MULTI_HEROINE_STORY.md), [V2_ACADEMIC_CALENDAR.md](V2_ACADEMIC_CALENDAR.md), [V2_DYNAMIC_EVENTS.md](V2_DYNAMIC_EVENTS.md).

## 1. 선택 ID
| ID | 장면 | 내용 |
|---|---|---|
| H-08 | v2c1_week | 이번 주 우선순위: A 헤르미온느 / B 지니 / C 루나 / D 판시 / E 말포이 / F 없음 |
| E-01~E-03 | ev1_greenhouse | 온실 실습 동행(헤르미온느·루나·혼자) 및 풀이 |
| E-04~E-07 | ev1_pitch | 경기장 공개 연습(지니·말포이·판시) |
| E-08 | ev1_ap_hermione | 같은 매듭을 어디서 찾을까 |
| E-09 | ev1_ap_ginny | 정직한 평가 / 빈 칭찬 |
| E-10 | ev1_ap_luna | 같이 세기 / 지도 / 딴짓 |
| E-11 | ev1_ap_pansy | 약속 / 캐묻기 / 거절 |
| E-12 | ev1_pl_draco | 같이 닦기 / 추궁 / 둘러보기 |
| X-01, X-02 | inc_crack_corridor / inc_crack_followup | 벽의 금, 후속 |
| K-04 | v2c1 공통 | 7층 복도(변경 없음) |

## 2. 플래그
| 플래그 | 설정 | 사용 |
|---|---|---|
| `FLAG_RT_HERMIONE/GINNY/LUNA/PANSY/DRACO` | H-08 선택 | 약속 게시·밤 도입 문장·마무리 후속 |
| `FLAG_RT_*_OK` | 해당 약속 성공 | 밤 도입·후속·저널 |
| `FLAG_EV_GH_HERMIONE_OK`, `FLAG_EV_GH_LUNA_OK`, `FLAG_EV_PITCH_GINNY_OK`, `FLAG_EV_PITCH_PANSY_OK` | 공개 행사 선택 | 저널 관찰 기록 |
| `OB_RUNE_WALL` | 헤르미온느 경로 | 사건 수첩 `upper-floors`, 활동 장면(도서관) |
| `OB_PITCH_FLASH` | 지니 경로(공개 행사 포함) | 수첩 |
| `FLAG_LUNA_COUNT7` | 루나 경로 | 수첩, 호숫가 휴식 장면 |
| `KN_PANSY_NIGHTS` | 판시 경로 | 수첩 |
| `FLAG_CRACK_SEEN/LOOKED/REPORTED/HELPED/AVOIDED/FOLLOWED`, `FLAG_CRACK_WITH_HERMIONE/PANSY` | 돌발 사건 | 후속 사건 조건, 수첩 `castle-crack` |
| `OB_CRACK`, `OB_CRACK_SKETCH`, `KN_CRACK_FILCH` | 돌발 사건 | 수첩 |
- 약속: `PANSY_NIGHTS`(판시 경로 성공 시). 신뢰·단계는 `stat/romance/trust` 효과를 장면에서 직접 지정.

## 3. 엔진 요소
- 효과 `ev:<id>=<결과>`(행사 참가 기록, `board.done`). 조건 `HERE_<히로인>`, `EV_<행사id>`, `chapter`, `AT_<장소>`, `seen.<id>`.
- 우선순위: 드레이코 만남 → 히로인 이벤트 → 돌발 사건 → 조연 → 랜덤.

## 4. 충돌 점검
- 동일 의미 플래그 중복 없음(위 표가 단일 원천). 기존 `FLAG_K0*`, `CH_K04_A`는 불변. K-04는 모든 경로 공통.
- 기존 세이브: `board`, `rev.salt`는 선택 필드로 보정.

## 5. 챕터 2 다중 경로 (V2_BRANCHING_STORY.md)
| 구분 | 항목 |
|---|---|
| 선택 ID | Q-01~Q-04 경로 시작 · Q-05~Q-08 경로 행사 · L-01~L-05 친밀 · L-11~L-15 갈등·반응 (기존 랜덤 이벤트 R-01~R-06과 구분) |
| 경로 플래그 | `FLAG_P2_RESEARCH/PITCH/SECRET/SLY` (이야기 경로, 연애와 분리) |
| 경로 선택 결과 | `FLAG_P2_PERMIT_PENDING/PERMIT_OK/BREACH/REPORTED_MCG/REPORTED_FINDING/RESEARCH_OK`, `FLAG_P2_HOOCH_CHECK/LEFT_TO_GINNY/PITCH_OK`, `FLAG_P2_STAIR_MARKED/STAIR_SEALED/NIGHT_PLAN/SECRET_OK`, `FLAG_P2_PROMISE_KEPT/TALK_DRACO/STAYED_OUT/SLY_OK` |
| 단서(지식) | `KN_KNOT_BLOCK`, `KN_KNOT_COLLIDE`, `KN_WEST_WING_SEALED`, `OB_WINDOW_WEST7`, `KN_FIELD_DISTURB`, `KN_FLASH_TIMING`, `OB_HIDDEN_STAIR`, `OB_STAIR_HUM`, `KN_LETTER_PRESSURE`, `KN_LETTER_DEADLINE` |
| 비밀 공유(고유 정보) | `KN_PAIR_HYPOTHESIS`(`FLAG_P2_HER_CONFIDED`), `KN_GINNY_SAW_SHADOW`(`FLAG_P2_GIN_CONFIDED`), `KN_DOOR_DIRECTION`(`FLAG_P2_LUN_CONFIDED`), `KN_PANSY_FOLLOWED`(`FLAG_P2_PAN_CONFIDED`) |
| 관계 장면 결과 | `FLAG_{HER,GIN,LUN,PAN,DRA}_{OPEN,SLOW,DECLINED_GENTLY,REPAIRED,DISTANT,SOFT}`, `FLAG_EVE_DONE` |
| 행사 | `ap2_research`(09-27 오후2 도서관) · `ap2_pitch`(09-26 오후2 경기장) · `ap2_secret`(09-27 오후2 호숫가) · `ap2_sly`(09-27 오후2 도서관), 결과 `ev:ap2_*=ok/plain/…` |
| 새 장면 접두 | `ch2_p_*`(경로) · `ch2_eve_*`(관계) · `ev2_*`(행사) |
| 사건 수첩 | `seventh-door`(`data/ch2Records.ts`) · 인물 기록 항목(`JOURNAL_CH2`) |
- 같은 의미의 플래그를 다른 문서에 새로 정의하지 않는다(이 문서가 원천). 연애 `open`은 명시적 합의 선택(L-01 A, L-02 A, L-03 A, L-04 B)에서만 설정되고 `together`·`poly`는 챕터 2에서 설정되지 않는다(테스트).
- 과감한 선택·후폭풍 플래그: `FLAG_P2_FIGHT_DRACO`, `FLAG_P2_DETENTION`(L-15 D), `FLAG_P2_BETRAYED_PANSY`(L-14 D), `FLAG_PAN_NIGHT`·`FLAG_PAN_NIGHT_DECLINED`(L-21, 조건 `FLAG_P2_PAN_CONFIDED && pansy.trust>=10`). 선택 ID `L-21`.
- H-08(챕터 1)은 **블라인드 사건 선택**으로 개정되었다(키 A~F·`FLAG_RT_*` 유지, 문구만 변경). [V2_BRANCHING_STORY.md](V2_BRANCHING_STORY.md) 6장 인수 기준.
- QA 수정 후 추가/변경: `FLAG_RT_PANSY_PITCH`(H-08 B 이력 후속), 행사 `ap_pansy_pitch`(09-05 오후2 경기장), `ap_pansy` 조건에 `!FLAG_RT_PANSY_PITCH`; `OB_STAIR_INSIDE`·`KN_STAIR_WARM_LUNA`(Q-03 A에서만; `OB_HIDDEN_STAIR`는 입구 발견), `FLAG_PAN_NIGHT_OPEN`(밤 진입 조건을 선택 전 신뢰로 고정); 장면 `ch2_eve_t_hermione_{seen,breach}`, `ch2_eve_i_pansy_{gate,body}`, `v2c1_week_B(_stands)`, `ev1_ap_pansy_pitch`.

## 챕터 2 E 경로·챕터 3 연결 추가분 (이번 구현)
- 챕터 2 E: `FLAG_P2_UNSTABLE`(진입: H-08 E 또는 4층 그을음 `OB_SCORCH` 단서만 있을 때), 장면 `src/data/v2c2x.ts`, 선택 Q-15~Q-18, 말포이 L-15(E·P 변형 두 장면이 같은 ID). 구세이브의 D 경로(`FLAG_P2_SLY`)는 E로 재해석하지 않는다.
- 챕터 3: 월요일 진입 `v2c3_wA~wE/wG`(선택 W-01~W-10), 월요일 선택 플래그 `FLAG_P3_*`는 화~목 행사(`ap3_*`, `ev3_*`)와 일요일 결산(`v2c3_sunA~E`)·`ch3_detention`에서 소비. 종단은 기존 `ch3_end → ch3_end_table → endChapter next ch4_open`.
- B02(판시 밤 회상 날짜)는 "이틀 전 금요일 밤"으로 수정. B01/B03은 월요일 진입 장면에서 미래 결과를 서술하지 않고 임시 `time+n`을 제거하는 것으로 처리.

## 챕터 3 2차 사건 · 챕터 4 관심 사건 분기 (이번 구현)
- 챕터 3 2차 사건 `ev3_a_appeal`·`ev3_b_shoulder`·`ev3_c_chalk`·`ev3_d_reply`·`ev3_e_ron`(10/3 오후1, 캘린더 `ap3_*`): 선택 W-11~W-15, 결과 플래그 `FLAG_P3_{A,B,C,D,E}2_*`는 일요일 결산에서 소비. 소스 `src/data/v2c3x.ts`.
- 챕터 4: 루틴 종료 후 `ch4_gate`가 분기한다. G `ap4_g_trial`(11/6 수 오후2 경기장, 공개 행사, C4-01·C4-02) · L `ap4_l_stair`(같은 시간 대연회장, 초대 조건 `FLAG_C4_LUNA_INVITE||FLAG_P3_C||KN_TWELVE_THIRTEEN`, C4-03·C4-04) · 둘 다 안 가면 기존 W(`ch4_wall` → K-08 → S-04). 같은 시간대·다른 장소라 하나만 갈 수 있다.
- G·L 공통: `ch4_pansy_report`(C4-06, 판시가 7층의 일을 대신 처리) → 지니 `ch4_g_sun`(C4-05)/루나 `ch4_l_sun`(C4-07) 관계 장면(조건 신뢰≥44·`!DISTANT`·`!DECLINED_GENTLY`, 수락·천천히·거절 모두 진행) → `ch4_settle*`(가지 않은 사건의 자동 결과·질투/서운함) → `ch4_end`.
- 새 플래그: `FLAG_C4_G_{ATT,ROLE_*,KNOWS_LIMIT,DISALLOWED,FAVORED,ASKED_HOOCH,START,PASS,SHOT,BENCH,ALLY_DEMELZA,OFFSTAGE,CLOSE,SLOW,DECLINED,WALKED}`, `FLAG_C4_L_{ATT,TOGETHER,WATCH,EARS,RETURNED,SHARED_HER,TOOK_NOTE,NOTE_HELD,ALONE,HANDS,BESIDE,ALONE_ASK}`, `FLAG_C4_W_PANSY_SEEN`, `FLAG_C4_PANSY_{TOLD,LIED,REDIRECT}`, `FLAG_C4_LUNA_INVITE`, 지식 `KN_ROOM_RULE`·`OB_NOTE_TIN`. 챕터 5 `ch5_open`에서 회수.
- 상태 필드 `seen`(인물별 마지막으로 본 표정·외형, 수첩 초상화용): 구세이브에는 없다 → `{}`로 보정.
- 정본 미확정: 서쪽 계단 열세 번째 단 아래의 쪽지 상자(이 슬라이스의 제안 설정), Ch13 탑의 밤 수렴 방식, Ch3 징계 종료일.

## 능력치 잠금 선택지 · 행동의 파급 · Ch4 H·P 사건 (이번 구현)
- 선택지 필드 `req`(잠금 조건식: 능력치·지식·플래그·관계 조합)와 `lock`(자연어 사유, 숫자 금지). `if`는 노출, `req`는 잠금. 잠긴 선택지는 UI에 보이되(aria-disabled) `choose()`가 상태를 바꾸지 않는다. 판정은 실행 시점의 저장 상태. 능력치 부족 시 `req` 없는 우회 선택이 반드시 있다(테스트로 강제).
- 행동 기록 `deeds`: 효과 `deed:<id>@직접 본 사람,..`, `hear:<id>:<누가>:<출처>[:ex]`. 조건 `DEED_/WIT_/HEARD_/KNOWS_/EXAG_<id>[_<who>]`. 구세이브는 `{}`로 보정. 초상화 `seen[인물].note`는 `show(..., {note})`로만 갱신.
- Ch4 사건 4종(11/6 수 오후2, 같은 시간·다른 장소): G·L(기존) + H `ap4_h_ledger`(C4-08·C4-09) · P `ap4_p_deal`(C4-10). 능력 선택: H 지능/통찰/사교, P 사교/통찰/의지, G 마법 숙련(보호 마법), L 통찰(소리 짚기). 임계값은 일과 활동으로 도달 가능한 수준(`ability.test.tsx`가 활동 정책별 실제 능력치를 출력).
- 새 플래그: `FLAG_C4_H_*`, `FLAG_C4_P_*`, `FLAG_C4_G_{WARDED,WARD_OK,WARD_RESENT,HOOCH_WARNED}`, `FLAG_C4_L_LISTEN`, 초대 `FLAG_C4_HER_INVITE`·`FLAG_C4_PANSY_INVITE`. 챕터 5 첫 장면에서 회수.

## 챕터 5 확장 (이번 구현)
- 흐름: 케이티 사건(K-09) → `ch5_news` → `ch5_dawn`(C5-01: 병동 앞에 갈지, 가지 않으면 드레이코 비접촉) → `ch5_sunday`(론의 전언 반응) → 일요일 일과 1일(오후2에 같은 시간·다른 장소 3사건) → `ch5_gate` → 경로별 저녁 정리(`ch5_h/g/r_wrap`, 인물의 주도적 후속 행동) → K-10(기존) → `ch5_settle`(서지 않은 사건의 독립 진행) → `ch5_end`.
- 사건: H `ap5_h_chain`(도서관, C5-02·C5-03) · G `ap5_g_team`(경기장, C5-04) · R `ap5_r_rumor`(안뜰, C5-05). 소스 `src/data/v2c5x.ts`. 능력 선택: H 지능/통찰/사교(Ch4 H 이력 조합으로 문턱↓), G 마법/체력/사교, R 통찰/사교/지식(OB_WRAPPER). 일반 선택 D는 항상 열려 있다.
- 새 플래그: `FLAG_C5_{H,G,R}_*`, 후속 `FLAG_C5_{H,G,R}_NEXT`, 지식 `KN_PACKAGE_DROPPED`·`KN_BARE_HAND`(루나가 직접 말해 준 경우만), 행동 deed `c5_*`. 챕터 6 첫 장면(`ch6_open`)에서 회수.
- 정본 미확정(제안 설정): 소문의 4학년 '휴고', 접수 시각과 전달 시각이 어긋나는 '기록에 없는 전달 경로', '장갑 없는 손'.

## 챕터 1 재설계 (이번 구현, 상세는 CH1_NARRATIVE_AUDIT.md)
- 신규 장면 `v2c1_tue*`(src/data/v2c1x.ts): K-03 경기장 뒤 화요일 저녁, H-08 앞. 루나(C1-01)·판시(C1-02) 일대일. 새 플래그 `FLAG_C1_LUNA_{LISTENED,ASKED,LATER}`·`FLAG_C1_PAN_{SHARED,ASKED_FIRST,DECLINED}`, 지식 `OB_SEVEN_RIPPLE`·`KN_SEVEN_WEST`·`KN_LETTER_DRAWER`(엿들은 경우에만 교환 선택지가 열림).
- 소비: H-08 안내문(익명 유지), `hr1_luna_lake_1`·`hr1_pansy_courtyard_1`, 챕터 2 `ch2_p_secret`·`ch2_p_sly`, 이전에 소비처가 없던 `FLAG_HR1_{HER_PAPER,GIN_CAPTAIN,LUN_LAKE,PAN_MIRROR}`(챕터 2 경로 진입)·H-07(챕터 2 `ch2_open`), 수첩(`ch1Records.ts`).

- [P1 수정] H-08 B는 과거 선택과 무관하게 항상 FLAG_RT_GINNY(치환 장면 v2c1_week_B_stands 제거). FLAG_RT_PANSY_PITCH·ap_pansy_pitch는 신규 진행에서 설정되지 않으며 이전 저장을 읽기 위해서만 남아 있다. 자유 일과: 같은 칸에서 드레이코를 그 히로인보다 더 자주 만난 뒤에는 히로인이 먼저 나오고, 조우 풀이 소진되면 드레이코가 있어도 히로인이 막히지 않는다(판시 도서관·경기장 자연 도달). 약속 시각과 겹치는 활동은 지도에서 확인창이 뜬다.
